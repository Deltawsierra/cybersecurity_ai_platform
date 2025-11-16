import os
from pathlib import Path
from datetime import timedelta

# AI engine settings
AI_ENGINE = {
    "USE_LLM_BY_DEFAULT": False,        # toggle to enable LLM enrichment across plugins
    "DEFAULT_CACHE_TTL": 60 * 60 * 24,  # 1 day cache default (seconds)
}

# Optionally set AI_ENGINE_REDIS_URL env var instead of using default memory cache:
# export AI_ENGINE_REDIS_URL=redis://localhost:6379/1

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key secret in production!
SECRET_KEY = 'your-dev-secret-key'

DEBUG = True

ALLOWED_HOSTS = ['*']

# Installed apps
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'corsheaders',
    # Simple JWT does not strictly require adding to INSTALLED_APPS,
    # but we include it for clarity (no migrations required).
    'rest_framework_simplejwt',

    # Local apps
    'users',
    'alerts',
    'audit',
    'reports',
    'accounts',
    'detection',
    'pentest',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # CORS support
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = []

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = 'static/'

# Media (for PDF reports and uploaded files)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# -------------------------
# REST framework + JWT
# -------------------------
REST_FRAMEWORK = {
    # Primary auth: Bearer tokens (Simple JWT). Keep SessionAuth for browsable API convenience.
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),

    # You may add a global default permission class if you want to enforce authentication
    # across all endpoints by default. Keep commented if you prefer per-view control.
    # 'DEFAULT_PERMISSION_CLASSES': (
    #     'rest_framework.permissions.IsAuthenticated',
    # ),
}

# Simple JWT settings (tweak token lifetimes as you like)
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# -------------------------
# Email settings
# -------------------------
# For development, you might want to use console backend:
# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
#
# For real SMTP (example below). It's strongly recommended to use environment
# variables for secrets in production (do NOT check them into source control).
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'   # Or another SMTP provider
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'flaniganb20@gmail.com')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', 'gunx wcew blmf llwn')  # replace with env var in prod
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# CORS settings (allow frontend access)
CORS_ALLOW_ALL_ORIGINS = True

AUTH_USER_MODEL = 'accounts.CustomUser'

# -------------------------
# Throttling (DRF)
# -------------------------
# Keep the existing REST_FRAMEWORK dict and add throttle settings
REST_FRAMEWORK.setdefault("DEFAULT_THROTTLE_CLASSES", [
    "rest_framework.throttling.UserRateThrottle",
])
REST_FRAMEWORK.setdefault("DEFAULT_THROTTLE_RATES", {
    "user": "1000/day",          # general per-user rate
    "pentest_scan": "5/day",     # per-user scan starts (used by PentestScanThrottle)
})

# -------------------------
# Pentest app defaults
# -------------------------
PENTEST_RETENTION_DAYS = int(os.environ.get("PENTEST_RETENTION_DAYS", 30))


