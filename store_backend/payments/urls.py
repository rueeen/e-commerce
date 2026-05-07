from django.urls import path

from .views import WebpayCommitView, WebpayCreateView

urlpatterns = [
    path('webpay/create/', WebpayCreateView.as_view()),
    path('webpay/commit/', WebpayCommitView.as_view()),
]
