import hashlib
import secrets
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import EmailVerificationToken


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def send_verification_email_task(self, user_id, user_email):
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

    EmailVerificationToken.objects.filter(user_id=user_id, used_at__isnull=True).update(used_at=timezone.now())
    EmailVerificationToken.objects.create(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=timezone.now() + timedelta(hours=24),
    )

    verify_url = f"{settings.BACKEND_URL}/api/verify-email/?token={raw_token}"
    send_mail(
        subject='Activate your Nexora account',
        message=(
            "Welcome to Nexora.\n\n"
            f"Use this link to activate your account:\n{verify_url}\n\n"
            "If this was not you, you can ignore this message."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user_email],
        fail_silently=False,
    )
