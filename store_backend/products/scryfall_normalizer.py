import re

REMOVE_TOKENS = [
    'Foil','Variants','Commander Decks','Eternal-Legal','Showcase','Extended Art','Borderless','Retro Frame','Alternate Art'
]

def normalize_card_description(raw_description: str) -> str:
    text = (raw_description or '').strip()
    candidate = text.split(':')[-1].strip() if ':' in text else text
    candidate = re.sub(r'\([^)]*\)', '', candidate)
    for token in REMOVE_TOKENS:
        candidate = re.sub(rf'\b{re.escape(token)}\b', '', candidate, flags=re.IGNORECASE)
    candidate = candidate.replace('...', ' ')
    candidate = re.sub(r'\s+', ' ', candidate).strip(' -:')
    return candidate
