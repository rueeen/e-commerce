import requests

from django.conf import settings
from django.core.exceptions import ValidationError


def create_shipment(order):
    env = getattr(settings, "CHILEXPRESS_ENV", "test")
    if env == "test":
        return {
            "tracking_number": f"TEST-{order.id}",
            "label_url": f"https://test.chilexpress.cl/labels/{order.id}.pdf",
            "status": "created",
        }

    api_key = getattr(settings, "CHILEXPRESS_ENVIOS_KEY", "")
    tcc = getattr(settings, "CHILEXPRESS_TCC", "")

    if not api_key or not tcc:
        raise ValidationError("Faltan credenciales de Chilexpress (CHILEXPRESS_ENVIOS_KEY/CHILEXPRESS_TCC).")

    endpoint = getattr(
        settings,
        "CHILEXPRESS_ENVIOS_URL",
        "https://api.chilexpress.cl/transport-orders/api/v1.0/transport-orders",
    )

    payload = {
        "reference": str(order.id),
        "tcc": tcc,
        "recipient": {
            "name": getattr(order.user, "get_full_name", lambda: "")() or order.user.username,
            "email": getattr(order.user, "email", ""),
        },
    }
    headers = {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": api_key,
    }

    try:
        response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
    except requests.RequestException as exc:
        raise ValidationError(f"Error al conectar con Chilexpress: {exc}") from exc

    if response.status_code >= 400:
        raise ValidationError(f"Chilexpress devolvió error {response.status_code}: {response.text}")

    data = response.json()
    tracking_number = (
        data.get("tracking_number")
        or data.get("trackingNumber")
        or data.get("numero_tracking")
        or ""
    )
    label_url = data.get("label_url") or data.get("labelUrl") or data.get("etiqueta") or ""

    if not tracking_number:
        raise ValidationError("Chilexpress no devolvió tracking_number.")

    return {
        "tracking_number": tracking_number,
        "label_url": label_url,
        "raw_response": data,
    }
