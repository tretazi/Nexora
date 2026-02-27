from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Budget, Category, Transaction, UserPreference, Wallet


class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ['id', 'name', 'color', 'is_default', 'created_at']
        read_only_fields = ['created_at']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'type', 'icon', 'color']


class TransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    category_icon = serializers.ReadOnlyField(source='category.icon')
    category_color = serializers.ReadOnlyField(source='category.color')
    wallet_name = serializers.ReadOnlyField(source='wallet.name')
    wallet_color = serializers.ReadOnlyField(source='wallet.color')

    class Meta:
        model = Transaction
        fields = [
            'id',
            'amount',
            'description',
            'date',
            'category',
            'category_name',
            'category_icon',
            'category_color',
            'wallet',
            'wallet_name',
            'wallet_color',
            'user',
        ]
        read_only_fields = ['user']


class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    wallet_name = serializers.ReadOnlyField(source='wallet.name')

    class Meta:
        model = Budget
        fields = ['id', 'category', 'category_name', 'wallet', 'wallet_name', 'month', 'limit_amount']


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = ['avatar_url', 'currency', 'timezone', 'date_format']


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'email')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            is_active=False,
        )
        UserPreference.objects.get_or_create(user=user)
        Wallet.objects.get_or_create(user=user, name='Principal', defaults={'is_default': True})
        return user


class ProfileSerializer(serializers.ModelSerializer):
    preferences = UserPreferenceSerializer(required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'date_joined', 'last_login', 'preferences')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        pref, _ = UserPreference.objects.get_or_create(user=instance)
        data['preferences'] = UserPreferenceSerializer(pref).data
        return data
