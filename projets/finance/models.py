from django.contrib.auth.models import User
from django.db import models


class Wallet(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wallets')
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#60A5FA')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'name')

    def __str__(self):
        return f'{self.name} ({self.user.username})'


class Category(models.Model):
    TRANSACTION_TYPES = [('INC', 'Revenu'), ('EXP', 'Depense')]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='categories', null=True, blank=True)
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=3, choices=TRANSACTION_TYPES)
    icon = models.CharField(max_length=8, default='🏷️')
    color = models.CharField(max_length=7, default='#60A5FA')

    class Meta:
        unique_together = ('user', 'name', 'type')

    def __str__(self):
        return f'{self.name} ({self.get_type_display()})'


class Transaction(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    wallet = models.ForeignKey(Wallet, on_delete=models.SET_NULL, related_name='transactions', null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)
    date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f'{self.amount} - {self.description[:20]}'


class Budget(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='budgets')
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='budgets', null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='budgets')
    month = models.DateField(help_text='Use first day of month (YYYY-MM-01)')
    limit_amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('user', 'wallet', 'category', 'month')

    def __str__(self):
        return f'{self.user.username} - {self.category.name} - {self.month}'


class UserPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    avatar_url = models.URLField(blank=True)
    currency = models.CharField(max_length=10, default='FCFA')
    timezone = models.CharField(max_length=64, default='UTC')
    date_format = models.CharField(max_length=32, default='DD/MM/YYYY')

    def __str__(self):
        return f'Preferences({self.user.username})'
