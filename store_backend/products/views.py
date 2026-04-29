from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils.text import slugify
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .models import Category, MTGCard, Product
from .permissions import IsAdminOrReadOnly
from .serializers import CategorySerializer, MTGCardSerializer, ProductSerializer
from .services import create_product_from_card, import_card, import_set, search_cards, sync_bulk_data


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "slug"]


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description", "mtg_card__name"]
    ordering_fields = ["price", "price_clp", "created_at", "name", "stock"]

    def get_queryset(self):
        q = Product.objects.select_related("category", "mtg_card").all()
        p = self.request.query_params
        if p.get("product_type"):
            q = q.filter(product_type=p["product_type"])
        if p.get("rarity"):
            q = q.filter(mtg_card__rarity__iexact=p["rarity"])
        if p.get("set"):
            q = q.filter(mtg_card__set_code__iexact=p["set"])
        if p.get("condition"):
            q = q.filter(condition=p["condition"])
        if p.get("foil") in {"true", "false"}:
            q = q.filter(is_foil=p["foil"] == "true")
        if p.get("color"):
            q = q.filter(mtg_card__colors__contains=[p["color"].upper()])
        if p.get("min_price"):
            q = q.filter(price_clp__gte=p["min_price"])
        if p.get("max_price"):
            q = q.filter(price_clp__lte=p["max_price"])
        if p.get("active") in {"true", "false"}:
            q = q.filter(is_active=p["active"] == "true")
        return q

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        product = self.get_object()
        product.is_active = False
        product.save(update_fields=["is_active"])
        return Response({"detail": "Producto desactivado"})

    @action(detail=False, methods=["get"], url_path="scryfall-search")
    def scryfall_search(self, request):
        name = request.query_params.get("q", "").strip()
        if not name:
            return Response({"detail": "q es obligatorio"}, status=400)
        try:
            return Response(search_cards(name))
        except Exception as exc:
            return Response({"detail": f"Error Scryfall: {exc}"}, status=502)

    @action(detail=False, methods=["post"], url_path="import-card")
    def import_card_action(self, request):
        scryfall_id = request.data.get("scryfall_id")
        if not scryfall_id:
            return Response({"detail": "scryfall_id es obligatorio"}, status=400)
        card = import_card(scryfall_id)
        product = create_product_from_card(card, defaults=request.data)
        return Response({"card": MTGCardSerializer(card).data, "product": ProductSerializer(product).data}, status=201)

    @action(detail=False, methods=["post"], url_path="import-set")
    def import_set_action(self, request):
        set_code = (request.data.get("set_code") or "").strip().lower()
        if not set_code:
            return Response({"detail": "set_code es obligatorio"}, status=400)
        count = import_set(set_code, limit=int(request.data.get("limit", 250)))
        return Response({"detail": "Importación completada", "imported": count})

    @action(detail=False, methods=["post"], url_path="sync-bulk")
    def sync_bulk(self, request):
        max_cards = int(request.data.get("max_cards", 5000))
        result = sync_bulk_data(max_cards=max_cards)
        return Response(result)

    @action(detail=False, methods=["post"], url_path="import-excel", parser_classes=[MultiPartParser])
    def import_excel(self, request):
        excel_file = request.FILES.get("file")
        if not excel_file:
            return Response({"detail": "Debes adjuntar un archivo .xlsx en el campo file."}, status=400)
        from openpyxl import load_workbook
        wb = load_workbook(excel_file, data_only=True)
        rows = list(wb.active.iter_rows(values_only=True))
        expected = ["nombre_carta", "set_code", "collector_number", "condicion", "idioma", "foil", "precio_clp", "stock", "observaciones"]
        headers = [str(h).strip().lower() if h else "" for h in rows[0]]
        idx = {h: i for i, h in enumerate(headers)}
        missing = [h for h in expected if h not in idx]
        if missing:
            return Response({"detail": "Faltan columnas", "columnas_faltantes": missing}, status=400)
        summary = {"creados": 0, "actualizados": 0, "errores": []}
        for rnum, row in enumerate(rows[1:], start=2):
            try:
                name = str(row[idx["nombre_carta"]] or "").strip()
                set_code = str(row[idx["set_code"]] or "").strip().lower()
                collector = str(row[idx["collector_number"]] or "").strip()
                if not (name and set_code):
                    raise ValueError("nombre_carta y set_code obligatorios")
                card = MTGCard.objects.filter(name__iexact=name, set_code__iexact=set_code, collector_number=collector).first()
                if not card:
                    result = search_cards(f'!"{name}" set:{set_code} cn:{collector}')
                    data = result.get("data", [])
                    if not data:
                        raise ValueError("Carta no encontrada en Scryfall")
                    from .services import upsert_card
                    card = upsert_card(data[0])
                defaults = {
                    "condition": str(row[idx["condicion"]] or "NM").upper(),
                    "language": str(row[idx["idioma"]] or "EN").upper(),
                    "is_foil": str(row[idx["foil"]] or "").lower() in {"1", "true", "si", "sí", "foil"},
                    "price_clp": int(row[idx["precio_clp"]] or 0),
                    "stock": int(row[idx["stock"]] or 0),
                    "notes": str(row[idx["observaciones"]] or ""),
                }
                product = create_product_from_card(card, defaults=defaults)
                summary["actualizados" if product.created_at else "creados"] += 1
            except Exception as exc:
                summary["errores"].append({"fila": rnum, "error": str(exc)})
        return Response(summary)
