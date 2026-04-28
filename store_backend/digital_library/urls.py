from django.urls import path

from .views import MyDigitalLibraryView

urlpatterns = [
    path('', MyDigitalLibraryView.as_view(), name='digital-library'),
]
