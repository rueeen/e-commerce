import json
import logging
import urllib.error
import urllib.request

import requests
from django.conf import settings
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

# Mapeo de nombre de región (del JSON local) a código de región de Chilexpress
_REGION_CODES = {
    'arica y parinacota': '01',
    'tarapacá': '02',
    'antofagasta': '03',
    'atacama': '04',
    'coquimbo': '05',
    'valparaíso': '06',
    "libertador general bernardo o'higgins": '07',
    'maule': '08',
    'biobío': '09',
    'la araucanía': '10',
    'los ríos': '11',
    'los lagos': '12',
    'aysén del general carlos ibáñez del campo': '13',
    'magallanes y de la antártica chilena': '14',
    'metropolitana de santiago': '15',
    'ñuble': '16',
}


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


def debug_coverage_api():
    """
    Función de diagnóstico temporal.
    Llamar desde Django shell: from shipping.chilexpress_service import debug_coverage_api; debug_coverage_api()
    """
    import logging
    logging.basicConfig(level=logging.DEBUG)

    api_key = getattr(settings, 'CHILEXPRESS_COVERAGE_KEY', '')
    base = _coverage_base()

    for region_code in ['99', '01', '02', '15']:
        url = f'{base}/coverage-areas/communes?regionCode={region_code}'
        print(f'\n--- regionCode={region_code} ---')
        req = urllib.request.Request(url, headers={
            'Cache-Control': 'no-cache',
            'Ocp-Apim-Subscription-Key': api_key,
        }, method='GET')
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read().decode('utf-8'))
                areas = data.get('data', {}).get('coverageAreas', [])
                print(f'Total items: {len(areas)}')
                if areas:
                    print(f'Keys: {list(areas[0].keys())}')
                    for area in areas[:3]:
                        print(f'  {area}')
        except urllib.error.HTTPError as e:
            body = e.read().decode() if hasattr(e, 'read') else ''
            print(f'HTTP {e.code}: {body[:200]}')
        except Exception as e:
            print(f'ERROR: {e}')


def _get_communes_for_region(api_key, region_code):
    """Obtiene comunas de una región específica de Chilexpress."""
    url = f'{_coverage_base()}/coverage-areas/communes?regionCode={region_code}'
    try:
        data = _chilexpress_get(url, api_key)
        areas = data.get('data', {}).get('coverageAreas', [])
        if areas:
            logger.debug(
                'Región %s: %d comunas. Primeras 3: %s',
                region_code,
                len(areas),
                [a.get('countyName') for a in areas[:3]],
            )
        else:
            logger.debug('Región %s: 0 comunas devueltas', region_code)
        return areas
    except ValidationError as exc:
        logger.warning('Coverage error región %s: %s', region_code, exc)
        return []


def _normalize(text):
    """Normaliza texto para comparación: minúsculas y sin tildes."""
    import unicodedata
    text = text.strip().lower()
    return ''.join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )


def get_coverage_code(commune_name, region_name=None):
    api_key = getattr(settings, 'CHILEXPRESS_COVERAGE_KEY', '')
    if not api_key:
        logger.warning('CHILEXPRESS_COVERAGE_KEY no configurada')
        return None

    commune_norm = _normalize(commune_name)

    region_codes_to_try = []
    if region_name:
        code = _REGION_CODES.get(_normalize(region_name))
        if code:
            region_codes_to_try = [code]

    if not region_codes_to_try:
        region_codes_to_try = list(_REGION_CODES.values())

    for region_code in region_codes_to_try:
        areas = _get_communes_for_region(api_key, region_code)
        for area in areas:
            county = area.get('countyName') or area.get('communeName') or area.get('name') or ''
            if _normalize(county) == commune_norm:
                code = area.get('coverageCode') or area.get('coverage_code')
                logger.info(
                    'Cobertura encontrada: %s → %s (región %s)',
                    commune_name, code, region_code
                )
                return code

    logger.warning('Sin cobertura Chilexpress para: %s', commune_name)
    return None


def quote_shipment(commune_name, region_name=None, weight_kg=0.5, length_cm=20, width_cm=15, height_cm=10):
    cotizador_key = getattr(settings, 'CHILEXPRESS_COTIZADOR_KEY', '')
    origin = getattr(settings, 'CHILEXPRESS_ORIGEN_COVERAGE', 'STGO')

    if not cotizador_key:
        logger.warning('CHILEXPRESS_COTIZADOR_KEY no configurada')
        return None

    dest_code = get_coverage_code(commune_name, region_name=region_name)
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
