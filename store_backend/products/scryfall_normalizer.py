import re

REMOVE_TOKENS = [
    "Foil", "Variants", "Variant", "Commander Decks", "Commander Deck", "Eternal-Legal",
    "Showcase", "Extended Art", "Borderless", "Retro Frame", "Alternate Art",
]


def _clean_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip(" -:")


def normalize_card_description(raw_description: str) -> dict:
    raw = (raw_description or "").strip()
    warnings = []
    is_foil = "foil" in raw.lower()
    set_name = ""
    card_name = raw

    if ":" in raw:
        set_name = _clean_spaces(raw.rsplit(":", 1)[0])
        card_name = raw.rsplit(":", 1)[1]

    card_name = re.sub(r"\([^)]*\)", "", card_name)
    card_name = card_name.replace("...", " ")
    for token in REMOVE_TOKENS:
        card_name = re.sub(rf"\b{re.escape(token)}\b", "", card_name, flags=re.IGNORECASE)
    card_name = _clean_spaces(card_name)

    if not card_name:
        warnings.append("No se pudo normalizar el nombre de carta")

    return {
        "normalized_card_name": card_name,
        "set_name_detected": set_name,
        "is_foil_detected": is_foil,
        "treatment_detected": "Foil" if is_foil else "",
        "warnings": warnings,
    }
