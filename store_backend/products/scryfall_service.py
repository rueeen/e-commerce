import requests

BASE='https://api.scryfall.com'

def _get(url, params):
    r=requests.get(url, params=params, timeout=10)
    if r.status_code>=400:
        return None
    return r.json()

def search_scryfall_card(normalized_card_name, set_hint=None):
    data = _get(f'{BASE}/cards/named', {'exact': normalized_card_name})
    if not data:
        data = _get(f'{BASE}/cards/named', {'fuzzy': normalized_card_name})
    if not data:
        q=f'!"{normalized_card_name}"'
        if set_hint:
            q += f' (set:{set_hint})'
        search=_get(f'{BASE}/cards/search', {'q': q})
        data = (search or {}).get('data', [None])[0]
    if not data:
        return None
    return {
        'scryfall_id': data.get('id',''), 'name': data.get('name',''), 'set_name': data.get('set_name',''), 'set_code': data.get('set',''),
        'collector_number': data.get('collector_number',''), 'rarity': data.get('rarity',''), 'image_large': (data.get('image_uris') or {}).get('large',''),
        'prices': data.get('prices', {}), 'oracle_text': data.get('oracle_text',''), 'type_line': data.get('type_line',''), 'colors': data.get('colors', []),
        'card_faces': data.get('card_faces', []), 'raw': data,
    }
