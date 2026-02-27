from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # Espace d'administration
    path('admin/', admin.site.urls),
    
    # Routes de ton application finance (transactions, catégories)
    path('api/', include('finance.urls')), 
    
    # Routes pour l'authentification JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]