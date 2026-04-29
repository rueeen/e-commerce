from decimal import Decimal, InvalidOperation

from django.db.models import Count
from openpyxl import load_workbook
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .models import Category, MTGCard, Product
from .permissions import IsAdminOrReadOnly
from .serializers import CategorySerializer, MTGCardSerializer, ProductSerializer
from .services import import_card, import_set, search_cards, sync_bulk_data


class CardViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MTGCard.objects.all()
    serializer_class = MTGCardSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "set_name", "set_code", "collector_number", "rarity"]

    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"detail": "q es obligatorio"}, status=400)
        return Response(search_cards(query))


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description", "mtg_card__name"]
    ordering_fields = ["price", "price_clp", "created_at", "name", "stock"]
    parser_classes = [MultiPartParser]

    def get_queryset(self):
        q = Product.objects.select_related("mtg_card", "category").all()
        p = self.request.query_params
        if p.get("product_type"):
            q = q.filter(product_type=p["product_type"])
        if p.get("category"):
            q = q.filter(category_id=p["category"])
        if p.get("active") in {"true", "false"}:
            q = q.filter(is_active=p["active"] == "true")
        if p.get("rarity"):
            q = q.filter(mtg_card__rarity__iexact=p["rarity"])
        return q

    @action(detail=False, methods=["post"], url_path="import-excel")
    def import_excel(self, request):
        excel_file = request.FILES.get("file")
        if not excel_file:
            return Response({"detail": "Debes adjuntar un archivo .xlsx"}, status=status.HTTP_400_BAD_REQUEST)

        workbook = load_workbook(excel_file, data_only=True)
        sheet = workbook.active
        headers = [str(c.value or "").strip().lower() for c in next(sheet.iter_rows(min_row=1, max_row=1))]
        required = {"category", "name", "description", "price", "stock", "image", "product_type", "is_active"}
        if not required.issubset(set(headers)):
            return Response({"detail": "Columnas inválidas", "required": sorted(required)}, status=status.HTTP_400_BAD_REQUEST)

        created, updated, errors = 0, 0, []
        for index, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            data = {headers[i]: row[i] for i in range(len(headers))}
            if not data.get("name"):
                continue
            try:
                category_name = str(data.get("category") or "Sin categoría").strip()
                category, _ = Category.objects.get_or_create(name=category_name, defaults={"slug": category_name.lower().replace(" ", "-")})
                defaults = {
                    "description": str(data.get("description") or ""),
                    "price": Decimal(str(data.get("price") or "0")),
                    "stock": int(data.get("stock") or 0),
                    "image": str(data.get("image") or ""),
                    "product_type": str(data.get("product_type") or Product.ProductType.SINGLE),
                    "is_active": str(data.get("is_active") or "true").lower() in {"true", "1", "yes", "si", "sí"},
                    "category": category,
                }
                _, was_created = Product.objects.update_or_create(name=str(data["name"]).strip(), defaults=defaults)
                created += int(was_created)
                updated += int(not was_created)
            except (InvalidOperation, ValueError) as exc:
                errors.append(f"Fila {index}: {exc}")

        return Response({"created": created, "updated": updated, "errors": errors})


class ScryfallImportViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=False, methods=["post"], url_path="card")
    def import_card_action(self, request):
        scryfall_id = request.data.get("scryfall_id")
        if not scryfall_id:
            return Response({"detail": "scryfall_id es obligatorio"}, status=400)
        card = import_card(scryfall_id)
        return Response(MTGCardSerializer(card).data, status=201)


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "slug"]

    def get_queryset(self):
        return Category.objects.annotate(products_count=Count("products")).order_by("name")
