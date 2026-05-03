import difflib
import requests

BASE = "https://api.scryfall.com"


def _build_card_payload(data):
    image_uris = data.get("image_uris") or {}
    return {
        "scryfall_id": data.get("id", ""),
        "name": data.get("name", ""),
        "set_name": data.get("set_name", ""),
        "set_code": data.get("set", ""),
        "collector_number": data.get("collector_number", ""),
        "rarity": data.get("rarity", ""),
        "image_large": image_uris.get("large", ""),
        "image_normal": image_uris.get("normal", ""),
        "image_small": image_uris.get("small", ""),
        "usd_price": (data.get("prices") or {}).get("usd"),
        "usd_foil_price": (data.get("prices") or {}).get("usd_foil"),
        "type_line": data.get("type_line", ""),
        "oracle_text": data.get("oracle_text", ""),
        "raw_data": data,
    }


def _get(path, params):
    try:
        r = requests.get(f"{BASE}{path}", params=params, timeout=12)
    except requests.RequestException as exc:
        return {"ok": False, "status": None, "error": f"Error de red: {exc}"}
    if r.status_code == 404:
        return {"ok": False, "status": 404, "error": "No encontrado"}
    if r.status_code == 429 or r.status_code >= 500:
        return {"ok": False, "status": r.status_code, "error": "Scryfall temporalmente no disponible"}
    if r.status_code >= 400:
        return {"ok": False, "status": r.status_code, "error": r.text[:200]}
    return {"ok": True, "data": r.json()}


def _score(card, name, set_hint):
    name_score = difflib.SequenceMatcher(None, (card.get("name") or "").lower(), name.lower()).ratio()
    if not set_hint:
        return name_score
    set_score = difflib.SequenceMatcher(None, (card.get("set_name") or "").lower(), set_hint.lower()).ratio()
    return (name_score * 0.7) + (set_score * 0.3)


def search_scryfall_card(card_name, set_hint=None, is_foil=False):
    if not card_name:
        return {"found": False, "status": "error", "message": "card_name es requerido", "suggestions": []}

    for mode, params in (("exact", {"exact": card_name}), ("fuzzy", {"fuzzy": card_name})):
        res = _get("/cards/named", params)
        if res.get("ok"):
            payload = _build_card_payload(res["data"])
            payload.update({"found": True, "status": "matched", "match_mode": mode, "suggestions": []})
            return payload
        if res.get("status") not in (404, None):
            return {"found": False, "status": "error", "message": res.get("error"), "suggestions": []}

    res = _get("/cards/search", {"q": f'!"{card_name}"'})
    if not res.get("ok"):
        if res.get("status") == 404:
            return {"found": False, "status": "not_found", "message": "Carta no encontrada", "suggestions": []}
        return {"found": False, "status": "error", "message": res.get("error"), "suggestions": []}

    data = res["data"].get("data", [])
    if not data:
        return {"found": False, "status": "not_found", "message": "Carta no encontrada", "suggestions": []}
    ranked = sorted(data, key=lambda c: _score(c, card_name, set_hint), reverse=True)
    top = ranked[0]
    suggestions = [{"name": c.get("name"), "set_name": c.get("set_name"), "scryfall_id": c.get("id")} for c in ranked[1:4]]
    payload = _build_card_payload(top)
    payload.update({"found": True, "status": "matched", "match_mode": "search", "suggestions": suggestions, "is_foil_requested": is_foil})
    return payload
