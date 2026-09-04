import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tests.settings_test")


def pytest_configure():
    django.setup()
