import json
import logging
import urllib.error
import urllib.request

import requests
from django.conf import settings
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


def _env():
    return getattr(settings, 'CHILEXPRESS_ENV', 'test')


def _coverage_base():
    return (
        'https://testservices.wschilexpress.com/georeference/api/v1.0'
        if _env() == 'test'
        else 'https://services.wschilexpress.com/georeference/api/v1.0'
    )


def _rating_base():
    return (
        'https://testservices.wschilexpress.com/rating/api/v1.0'
        if _env() == 'test'
        else 'https://services.wschilexpress.com/rating/api/v1.0'
    )


def _chilexpress_get(url, api_key):
    req = urllib.request.Request(
        url,
        headers={
            'Cache-Control': 'no-cache',
            'Ocp-Apim-Subscription-Key': api_key,
        },
        method='GET',
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode('utf-8', errors='ignore') if hasattr(exc, 'read') else ''
        raise ValidationError(
            f'Chilexpress Coverage devolvió {exc.code}: {body[:200]}'
        ) from exc
    except urllib.error.URLError as exc:
        raise ValidationError(
            f'No fue posible conectar con Chilexpress: {exc.reason}'
        ) from exc


def _chilexpress_post(url, api_key, payload):
    body = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Ocp-Apim-Subscription-Key': api_key,
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as exc:
        body_txt = exc.read().decode('utf-8', errors='ignore') if hasattr(exc, 'read') else ''
        raise ValidationError(
            f'Chilexpress Rating devolvió {exc.code}: {body_txt[:200]}'
        ) from exc
    except urllib.error.URLError as exc:
        raise ValidationError(
            f'No fue posible conectar con Chilexpress: {exc.reason}'
        ) from exc


def get_coverage_code(commune_name):
    api_key = getattr(settings, 'CHILEXPRESS_COVERAGE_KEY', '')
    if not api_key:
        logger.warning('CHILEXPRESS_COVERAGE_KEY no configurada')
        return None

    url = f'{_coverage_base()}/coverage-areas/communes?regionCode=99'
    try:
        data = _chilexpress_get(url, api_key)
    except ValidationError as exc:
        logger.warning('Coverage lookup error: %s', exc)
        return None

    areas = data.get('data', {}).get('coverageAreas', [])
    commune_lower = commune_name.strip().lower()
    for area in areas:
        if area.get('countyName', '').strip().lower() == commune_lower:
            return area.get('coverageCode')

    logger.info('Sin cobertura para: %s', commune_name)
    return None


def quote_shipment(commune_name, weight_kg=0.5, length_cm=20, width_cm=15, height_cm=10):
    cotizador_key = getattr(settings, 'CHILEXPRESS_COTIZADOR_KEY', '')
    origin = getattr(settings, 'CHILEXPRESS_ORIGEN_COVERAGE', 'STGO')

    if not cotizador_key:
        logger.warning('CHILEXPRESS_COTIZADOR_KEY no configurada')
        return None

    dest_code = get_coverage_code(commune_name)
    if not dest_code:
        return None

    payload = {
        'originCoverageCode': origin,
        'destinationCoverageCode': dest_code,
        'package': {
            'weight': f'{float(weight_kg):.2f}',
            'height': f'{float(height_cm):.2f}',
            'width': f'{float(width_cm):.2f}',
            'length': f'{float(length_cm):.2f}',
            'serviceDeliveryCode': '3',
            'multiplePackageIndicator': 'N',
        },
    }

    try:
        data = _chilexpress_post(
            f'{_rating_base()}/rates/courier',
            cotizador_key,
            payload,
        )
    except ValidationError as exc:
        logger.warning('Rating error para %s: %s', commune_name, exc)
        return None

    rates = data.get('data', {}).get('courierServiceRates', [])
    if not rates:
        return None

    best = min(rates, key=lambda r: float(r.get('serviceValue', 9_999_999)))
    return {
        'amount': int(float(best.get('serviceValue', 0))),
        'service_name': best.get('serviceName', 'Chilexpress'),
        'delivery_days': best.get('deliveryTime', ''),
    }


# ── Función existente — NO MODIFICAR ──────────────────────────────────────

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
            "name": getattr(order, "recipient_name", "") or order.user.get_full_name() or order.user.username,
            "email": order.user.email,
            "phone": getattr(order, "recipient_phone", ""),
        },
        "delivery": {
            "street_name": getattr(order, "shipping_street", ""),
            "street_number": getattr(order, "shipping_number", ""),
            "commune_name": getattr(order, "shipping_commune", ""),
            "region_id": getattr(order, "shipping_region", ""),
            "notes": getattr(order, "shipping_notes", ""),
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
