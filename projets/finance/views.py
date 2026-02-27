import csv
import io
from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.core import signing
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q, Sum
from django.http import HttpResponse
from django.shortcuts import redirect
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Budget, Category, Transaction, UserPreference, Wallet
from .serializers import (
    BudgetSerializer,
    CategorySerializer,
    ProfileSerializer,
    TransactionSerializer,
    UserPreferenceSerializer,
    UserSerializer,
    WalletSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = UserSerializer

    def perform_create(self, serializer):
        with transaction.atomic():
            user = serializer.save()
            if user.email:
                token = signing.dumps({'user_id': user.id}, salt='email-verify')
                verify_url = f"{settings.BACKEND_URL}/api/verify-email/?token={token}"
                send_mail(
                    subject='Activez votre compte Nexora',
                    message=(
                        "Bienvenue sur Nexora.\n\n"
                        f"Cliquez sur ce lien pour activer votre compte:\n{verify_url}\n\n"
                        "Si vous n'etes pas a l'origine de cette inscription, ignorez ce message."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )


class WalletViewSet(viewsets.ModelViewSet):
    serializer_class = WalletSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wallet.objects.filter(user=self.request.user).order_by('-is_default', 'name')

    def perform_create(self, serializer):
        has_wallet = Wallet.objects.filter(user=self.request.user).exists()
        serializer.save(user=self.request.user, is_default=not has_wallet)

    @action(detail=True, methods=['post'])
    def make_default(self, request, pk=None):
        wallet = self.get_object()
        Wallet.objects.filter(user=request.user).update(is_default=False)
        wallet.is_default = True
        wallet.save(update_fields=['is_default'])
        return Response({'status': 'ok'})


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # User categories + optional shared categories (user is null)
        return Category.objects.filter(Q(user=self.request.user) | Q(user__isnull=True)).order_by('name')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_value_regex = r'\d+'

    def get_queryset(self):
        qs = Transaction.objects.filter(user=self.request.user).select_related('category', 'wallet')

        q = self.request.query_params.get('q')
        category = self.request.query_params.get('category')
        wallet = self.request.query_params.get('wallet')
        tx_type = self.request.query_params.get('type')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        min_amount = self.request.query_params.get('min_amount')
        max_amount = self.request.query_params.get('max_amount')

        if q:
            qs = qs.filter(Q(description__icontains=q) | Q(category__name__icontains=q))
        if category:
            qs = qs.filter(category_id=category)
        if wallet:
            qs = qs.filter(wallet_id=wallet)
        if tx_type == 'INC':
            qs = qs.filter(amount__gt=0)
        elif tx_type == 'EXP':
            qs = qs.filter(amount__lt=0)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if min_amount:
            qs = qs.filter(amount__gte=min_amount)
        if max_amount:
            qs = qs.filter(amount__lte=max_amount)

        return qs.order_by('-date', '-id')

    def perform_create(self, serializer):
        wallet = serializer.validated_data.get('wallet')
        if wallet and wallet.user_id != self.request.user.id:
            raise permissions.PermissionDenied('Invalid wallet')

        if not wallet:
            wallet = Wallet.objects.filter(user=self.request.user, is_default=True).first()
        serializer.save(user=self.request.user, wallet=wallet)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = self.get_queryset()
        income = qs.filter(amount__gt=0).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        expenses = qs.filter(amount__lt=0).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        expenses_abs = abs(expenses)
        return Response(
            {
                'income': str(income),
                'expenses': str(expenses_abs),
                'balance': str(income - expenses_abs),
                'count': qs.count(),
            }
        )

    @action(detail=False, methods=['post'])
    def import_csv(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'CSV file is required'}, status=status.HTTP_400_BAD_REQUEST)

        decoded = file_obj.read().decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        created = 0
        default_wallet = Wallet.objects.filter(user=request.user, is_default=True).first()

        for row in reader:
            try:
                category_name = (row.get('category') or '').strip()
                category = Category.objects.filter(
                    Q(user=request.user) | Q(user__isnull=True), name=category_name
                ).first()
                amount = Decimal(str(row.get('amount', '0')))
                description = row.get('description', '')
                date_text = row.get('date')
                parsed_date = (
                    datetime.strptime(date_text, '%Y-%m-%d').date()
                    if date_text
                    else datetime.utcnow().date()
                )
                Transaction.objects.create(
                    user=request.user,
                    wallet=default_wallet,
                    category=category,
                    amount=amount,
                    description=description,
                    date=parsed_date,
                )
                created += 1
            except Exception:
                continue

        return Response({'created': created})

    @action(detail=False, methods=['get'])
    def export(self, request):
        fmt = request.query_params.get('format', 'csv')
        qs = self.get_queryset()

        if fmt in ('csv', 'excel'):
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="transactions.csv"'
            writer = csv.writer(response)
            writer.writerow(['date', 'description', 'category', 'wallet', 'amount'])
            for t in qs:
                writer.writerow([t.date, t.description, t.category.name if t.category else '', t.wallet.name if t.wallet else '', t.amount])
            if fmt == 'excel':
                response['Content-Type'] = 'application/vnd.ms-excel'
            return response

        if fmt == 'pdf':
            try:
                from reportlab.graphics import renderPDF
                from reportlab.graphics.charts.piecharts import Pie
                from reportlab.graphics.shapes import Drawing
                from reportlab.lib.pagesizes import A4
                from reportlab.pdfgen import canvas
            except Exception:
                return Response(
                    {'detail': 'Export PDF indisponible: package reportlab manquant (pip install reportlab).'},
                    status=status.HTTP_501_NOT_IMPLEMENTED,
                )

            response = HttpResponse(content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="transactions_summary.pdf"'
            p = canvas.Canvas(response, pagesize=A4)
            width, height = A4

            income = qs.filter(amount__gt=0).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            expenses_raw = qs.filter(amount__lt=0).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            expenses = abs(expenses_raw)
            balance = income - expenses
            tx_count = qs.count()

            expenses_by_category = (
                qs.filter(amount__lt=0)
                .values('category__name')
                .annotate(total=Sum('amount'))
                .order_by('total')
            )

            labels = []
            values = []
            for row in expenses_by_category:
                name = row['category__name'] or 'Sans categorie'
                value = abs(row['total'] or Decimal('0'))
                if value > 0:
                    labels.append(name)
                    values.append(float(value))

            p.setTitle('Resume des transactions')
            p.setFont('Helvetica-Bold', 16)
            p.drawString(40, height - 50, 'Resume des transactions')

            p.setFont('Helvetica', 10)
            p.drawString(40, height - 68, f'Genere le: {datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")}')
            p.drawString(40, height - 82, f'Nombre de transactions: {tx_count}')

            p.setFont('Helvetica-Bold', 12)
            p.drawString(40, height - 110, 'Indicateurs')
            p.setFont('Helvetica', 11)
            p.drawString(40, height - 128, f'Revenus: {income:.2f}')
            p.drawString(40, height - 144, f'Depenses: {expenses:.2f}')
            p.drawString(40, height - 160, f'Solde: {balance:.2f}')

            p.setFont('Helvetica-Bold', 12)
            p.drawString(40, height - 190, 'Repartition des depenses par categorie')

            if values:
                drawing = Drawing(240, 180)
                pie = Pie()
                pie.x = 20
                pie.y = 10
                pie.width = 180
                pie.height = 150
                pie.data = values[:8]
                pie.labels = labels[:8]
                pie.slices.strokeWidth = 0.5
                drawing.add(pie)
                renderPDF.draw(drawing, p, 40, height - 390)

                p.setFont('Helvetica-Bold', 11)
                p.drawString(320, height - 210, 'Top categories')
                p.setFont('Helvetica', 10)
                y = height - 230
                for idx, (name, val) in enumerate(zip(labels[:8], values[:8]), start=1):
                    p.drawString(320, y, f'{idx}. {name}: {val:.2f}')
                    y -= 16
            else:
                p.setFont('Helvetica', 10)
                p.drawString(40, height - 220, 'Aucune depense disponible pour generer le graphique.')

            p.save()
            return response

        return Response({'detail': 'Unsupported format'}, status=status.HTTP_400_BAD_REQUEST)


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Budget.objects.filter(user=self.request.user).select_related('category', 'wallet')
        month = self.request.query_params.get('month')
        wallet = self.request.query_params.get('wallet')
        if month:
            parsed = datetime.strptime(month, '%Y-%m-%d').date()
            qs = qs.filter(month__year=parsed.year, month__month=parsed.month)
        if wallet:
            qs = qs.filter(wallet_id=wallet)
        return qs.order_by('-month', 'category__name')

    def perform_create(self, serializer):
        month_value = serializer.validated_data['month']
        normalized_month = month_value.replace(day=1)
        serializer.save(user=self.request.user, month=normalized_month)

    def perform_update(self, serializer):
        month_value = serializer.validated_data.get('month')
        if month_value:
            serializer.save(month=month_value.replace(day=1))
        else:
            serializer.save()

    @action(detail=False, methods=['get'])
    def status(self, request):
        month = request.query_params.get('month')
        if not month:
            month = datetime.utcnow().date().replace(day=1).isoformat()
        parsed = datetime.strptime(month, '%Y-%m-%d').date()
        budgets = Budget.objects.filter(
            user=request.user,
            month__year=parsed.year,
            month__month=parsed.month,
        ).select_related('category', 'wallet')
        payload = []
        for b in budgets:
            tx_qs = Transaction.objects.filter(
                user=request.user,
                category=b.category,
                date__year=b.month.year,
                date__month=b.month.month,
            )
            if b.wallet_id:
                tx_qs = tx_qs.filter(wallet=b.wallet)
            spent = abs(tx_qs.filter(amount__lt=0).aggregate(total=Sum('amount'))['total'] or Decimal('0'))
            limit_amount = b.limit_amount
            ratio = float((spent / limit_amount) * 100) if limit_amount else 0
            payload.append(
                {
                    'id': b.id,
                    'category_name': b.category.name,
                    'wallet_name': b.wallet.name if b.wallet else 'Tous',
                    'limit_amount': str(limit_amount),
                    'spent_amount': str(spent),
                    'ratio': round(ratio, 2),
                    'status': 'danger' if ratio >= 100 else ('warning' if ratio >= 80 else 'ok'),
                }
            )
        return Response(payload)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user = self.request.user
        UserPreference.objects.get_or_create(user=user)
        return user

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        pref_data = request.data.get('preferences')
        if pref_data:
            pref, _ = UserPreference.objects.get_or_create(user=user)
            pref_serializer = UserPreferenceSerializer(pref, data=pref_data, partial=True)
            pref_serializer.is_valid(raise_exception=True)
            pref_serializer.save()

        user_serializer = self.get_serializer(user, data=request.data, partial=True)
        user_serializer.is_valid(raise_exception=True)
        user_serializer.save()
        return Response(self.get_serializer(user).data)


class ResetDataView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.data.get('confirm') != 'RESET':
            return Response(
                {'detail': 'Confirmation invalide. Envoyez confirm=RESET.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        with transaction.atomic():
            Transaction.objects.filter(user=user).delete()
            Budget.objects.filter(user=user).delete()
            Wallet.objects.filter(user=user).delete()
            Category.objects.filter(user=user).delete()

            pref, _ = UserPreference.objects.get_or_create(user=user)
            pref.avatar_url = ''
            pref.currency = 'FCFA'
            pref.timezone = 'UTC'
            pref.date_format = 'DD/MM/YYYY'
            pref.save(update_fields=['avatar_url', 'currency', 'timezone', 'date_format'])

            Wallet.objects.create(
                user=user,
                name='Principal',
                color='#24C289',
                is_default=True,
            )

        return Response({'detail': 'Toutes vos donnees ont ete reinitialisees.'}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh = request.data.get('refresh')
        if not refresh:
            return Response({'detail': 'Refresh token requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh)
            token.blacklist()
        except Exception:
            return Response({'detail': 'Refresh token invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'detail': 'Deconnexion reussie.'}, status=status.HTTP_200_OK)


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token = request.query_params.get('token')
        if not token:
            return redirect(f"{settings.FRONTEND_URL}/login?verified=missing")
        try:
            payload = signing.loads(token, salt='email-verify', max_age=60 * 60 * 24)
            user = User.objects.get(id=payload.get('user_id'))
            user.is_active = True
            user.save(update_fields=['is_active'])
            return redirect(f"{settings.FRONTEND_URL}/login?verified=success")
        except (signing.BadSignature, signing.SignatureExpired, User.DoesNotExist):
            return redirect(f"{settings.FRONTEND_URL}/login?verified=invalid")
