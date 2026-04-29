from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
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

    def get_queryset(self):
        q = Product.objects.select_related("mtg_card").all()
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
        return q


class ScryfallImportViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=False, methods=["post"], url_path="card")
    def import_card_action(self, request):
        scryfall_id = request.data.get("scryfall_id")
        if not scryfall_id:
            return Response({"detail": "scryfall_id es obligatorio"}, status=400)
        card = import_card(scryfall_id)
        return Response(MTGCardSerializer(card).data, status=201)

    @action(detail=False, methods=["post"], url_path="set")
    def import_set_action(self, request):
        set_code = (request.data.get("set_code") or "").strip().lower()
        if not set_code:
            return Response({"detail": "set_code es obligatorio"}, status=400)
        return Response({"imported": import_set(set_code)})

    @action(detail=False, methods=["post"], url_path="bulk")
    def import_bulk_action(self, request):
        max_cards = int(request.data.get("max_cards", 5000))
        return Response(sync_bulk_data(max_cards=max_cards))


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]
