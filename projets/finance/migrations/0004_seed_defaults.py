from django.db import migrations


def seed_defaults(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    Wallet = apps.get_model('finance', 'Wallet')
    UserPreference = apps.get_model('finance', 'UserPreference')

    for user in User.objects.all():
        UserPreference.objects.get_or_create(user=user)
        has_wallet = Wallet.objects.filter(user=user).exists()
        if not has_wallet:
            Wallet.objects.create(user=user, name='Principal', is_default=True)
        else:
            if not Wallet.objects.filter(user=user, is_default=True).exists():
                first_wallet = Wallet.objects.filter(user=user).first()
                first_wallet.is_default = True
                first_wallet.save(update_fields=['is_default'])


class Migration(migrations.Migration):
    dependencies = [
        ('finance', '0003_wallet_budget_preferences_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_defaults, migrations.RunPython.noop),
    ]
