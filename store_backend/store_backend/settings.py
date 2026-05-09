"""
Django settings for store_backend project.
"""

from datetime import timedelta
from pathlib import Path
import os
from decimal import Decimal
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-change-me')
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes', 'on')
ALLOWED_HOSTS = [host.strip() for host in os.environ.get('ALLOWED_HOSTS', '').split(',') if host.strip()]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    "accounts.apps.AccountsConfig",
    'products',
    'cart',
    'orders',
    'payments',
    'shipping',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'store_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'store_backend.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'es-es'
TIME_ZONE = 'America/Santiago'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    'DEFAULT_PARSER_CLASSES': (
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/hour',
        'user': '1000/hour',
        'register': '10/hour',
        'login': '20/hour',
        'scryfall': '100/hour',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

WEBPAY_ENVIRONMENT = os.getenv('WEBPAY_ENVIRONMENT', 'integration')
WEBPAY_COMMERCE_CODE = os.getenv('WEBPAY_COMMERCE_CODE', '')
WEBPAY_API_KEY_SECRET = os.getenv('WEBPAY_API_KEY_SECRET', '')
WEBPAY_RETURN_URL = os.getenv(
    'WEBPAY_RETURN_URL', 'http://localhost:5173/pago/retorno')
WEBPAY_FINAL_URL = os.getenv(
    'WEBPAY_FINAL_URL', 'http://localhost:5173/pago/final')
TAX_RATE = Decimal(os.getenv('TAX_RATE', '0.19'))
STOCK_RESERVATION_MINUTES = int(os.getenv('STOCK_RESERVATION_MINUTES', '15'))

CHILEXPRESS_ENV = os.getenv("CHILEXPRESS_ENV", "test")
CHILEXPRESS_ENVIOS_KEY = os.getenv("CHILEXPRESS_ENVIOS_KEY", "")
CHILEXPRESS_TCC = os.getenv("CHILEXPRESS_TCC", "")
