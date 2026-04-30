from django.db.models import Count
from openpyxl import load_workbook
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.permissions import IsAdminUser, IsAdminOrWorkerUser
from .models import Category, MTGCard, Product
from .permissions import IsAdminOrReadOnly
from .serializers import CategorySerializer, MTGCardSerializer, ProductSerializer
from .services import ScryfallServiceError, create_or_update_single_product, import_card, search_cards


class CardViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MTGCard.objects.all()
    serializer_class = MTGCardSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "set_name", "set_code", "collector_number", "rarity"]


class MTGScryfallViewSet(viewsets.ViewSet):
    def get_permissions(self):
        if self.action == "search":
            return [AllowAny()]
        if self.action == "import_card_action":
            return [IsAdminOrWorkerUser()]
        return [IsAdminUser()]

    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"detail": "q es obligatorio"}, status=400)
        try:
            return Response({"results": search_cards(query)})
        except ScryfallServiceError as exc:
            return Response({"detail": str(exc)}, status=502)

    @action(detail=False, methods=["post"], url_path="import")
    def import_card_action(self, request):
        scryfall_id = request.data.get("scryfall_id")
        if not scryfall_id:
            return Response({"detail": "scryfall_id es obligatorio"}, status=400)
        try:
            card = import_card(scryfall_id)
        except ScryfallServiceError as exc:
            return Response({"detail": str(exc)}, status=502)
        return Response(MTGCardSerializer(card).data, status=201)


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

    @action(detail=False, methods=["post"], url_path="create-single-from-scryfall", permission_classes=[IsAdminUser])
    def create_single_from_scryfall(self, request):
        required_fields = ["scryfall_id", "category_id", "price_clp", "stock"]
        missing = [field for field in required_fields if field not in request.data]
        if missing:
            return Response({"detail": f"Faltan campos: {', '.join(missing)}"}, status=400)

        category = Category.objects.filter(pk=request.data.get("category_id")).first()
        if not category:
            return Response({"detail": "category_id inválido"}, status=400)

        try:
            card = import_card(request.data["scryfall_id"])
            product, created = create_or_update_single_product(card, {
                "category": category,
                "price_clp": int(request.data.get("price_clp", 0)),
                "stock": int(request.data.get("stock", 0)),
                "condition": request.data.get("condition", Product.CardCondition.NM),
                "language": request.data.get("language", "EN"),
                "is_foil": bool(request.data.get("is_foil", False)),
                "edition": request.data.get("edition", ""),
                "notes": request.data.get("notes", ""),
                "is_active": bool(request.data.get("is_active", True)),
            })
        except (ValueError, TypeError):
            return Response({"detail": "price_clp y stock deben ser numéricos"}, status=400)
        except ScryfallServiceError as exc:
            return Response({"detail": str(exc)}, status=502)

        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response({"created": created, "product": ProductSerializer(product).data}, status=code)

    @action(detail=False, methods=["post"], url_path="import-excel")
    def import_excel(self, request):
        excel_file = request.FILES.get("file")
        if not excel_file:
            return Response({"detail": "Debes adjuntar un archivo .xlsx"}, status=status.HTTP_400_BAD_REQUEST)
        workbook = load_workbook(excel_file, data_only=True)
        sheet = workbook.active
        headers = [str(c.value or "").strip().lower() for c in next(sheet.iter_rows(min_row=1, max_row=1))]
        required = {"category", "product_type", "name", "price_clp", "stock", "is_active"}
        if not required.issubset(set(headers)):
            return Response({"detail": "Columnas inválidas", "required": sorted(required)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Importación Excel no modificada en esta tarea"})


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "slug"]

    def get_queryset(self):
        return Category.objects.annotate(products_count=Count("products")).order_by("name")
