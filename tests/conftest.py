import os

import django
import pytest

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tests.settings_test")


def pytest_configure():
    django.setup()


@pytest.fixture(autouse=True, scope="session")
def _sqlite_wal(django_db_setup, django_db_blocker):
    """
    WAL on the test database.

    Without it a reader blocks a writer, and the concurrency tests spend their
    time serialising rather than testing anything.
    """
    with django_db_blocker.unblock():
        from django.db import connection

        if connection.vendor == "sqlite":
            with connection.cursor() as cursor:
                cursor.execute("PRAGMA journal_mode=WAL")
