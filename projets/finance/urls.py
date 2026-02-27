from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BudgetViewSet,
    CategoryViewSet,
    LogoutView,
    ProfileView,
    ResetDataView,
    RegisterView,
    TransactionViewSet,
    VerifyEmailView,
    WalletViewSet,
)

router = DefaultRouter()
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'wallets', WalletViewSet, basename='wallet')
router.register(r'budgets', BudgetViewSet, basename='budget')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('verify-email/', VerifyEmailView.as_view(), name='auth_verify_email'),
    path('profile/', ProfileView.as_view(), name='auth_profile'),
    path('reset-data/', ResetDataView.as_view(), name='reset_data'),
]
