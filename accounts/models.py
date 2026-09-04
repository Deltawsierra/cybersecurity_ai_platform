from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    class Roles(models.TextChoices):
        ADMIN = "admin", "Admin"
        ANALYST = "analyst", "Analyst"
        VIEWER = "viewer", "Viewer"

    role = models.CharField(
        max_length=20,
        choices=Roles.choices,
        default=Roles.VIEWER,
    )

    @property
    def is_admin(self):
        # A Django superuser had no rights in this API at all, because role
        # defaults to viewer and nothing consulted is_superuser. That left two
        # disjoint privilege systems: createsuperuser produced an account that
        # could not read the user list, while a role=admin account with
        # is_staff False controlled the user API but could not reach /admin/.
        return self.role == self.Roles.ADMIN or self.is_superuser

    @property
    def is_analyst(self):
        return self.role == self.Roles.ANALYST

    @property
    def is_viewer(self):
        return self.role == self.Roles.VIEWER

    def __str__(self):
        return f"{self.username} ({self.role})"


