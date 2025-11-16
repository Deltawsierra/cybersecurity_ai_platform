from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    class Roles(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        ANALYST = 'analyst', 'Analyst'
        VIEWER = 'viewer', 'Viewer'

    role = models.CharField(
        max_length=20,
        choices=Roles.choices,
        default=Roles.VIEWER,
    )

    def is_admin(self):
        return self.role == self.Roles.ADMIN

    def is_analyst(self):
        return self.role == self.Roles.ANALYST

    def is_viewer(self):
        return self.role == self.Roles.VIEWER

