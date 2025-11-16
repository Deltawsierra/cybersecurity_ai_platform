from django.urls import path
from .views import SendEmailAlertView

urlpatterns = [
    path('email/', SendEmailAlertView.as_view(), name='send_email'),
]
