import logging
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Count
from django.utils import timezone

from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminUser, IsAdminOrWorkerUser

from .inventory_services import create_stock_movement
from .models import (
    Category,
    KardexMovement,
    MTGCard,
    PricingSettings,
    Product,
    PurchaseOrder,
    PurchaseOrderItem,
    SingleCard,
    Supplier,
)
from .permissions import IsAdminOrWorkerOrReadOnly
from .purchase_order_import import parse_purchase_order_excel
from .purchase_order_product_services import (
    create_product_from_purchase_order_item,
    resolve_purchase_order_product_category,
)
from .purchase_order_services import (
    receive_purchase_order,
    recalculate_purchase_order,
)
from .scryfall_normalizer import normalize_card_description
from .scryfall_service import search_scryfall_card
from .serializers import (
    CategorySerializer,
    KardexMovementSerializer,
    MTGCardSerializer,
    PricingSettingsSerializer,
    ProductSerializer,
    PurchaseOrderItemSerializer,
    PurchaseOrderSerializer,
    SupplierSerializer,
)
from .services import (
    ScryfallServiceError,
    calculate_suggested_sale_price,
    extract_usd_price,
    get_active_pricing_settings,
    get_scryfall_card_by_id,
    import_card,
    import_catalog_from_xlsx,
    import_purchase_order_from_xlsx,
    search_cards,
)


logger = logging.getLogger(__name__)


CONDITION_MAP = {
    "NM": Product.CardCondition.NM,
    "MINT": Product.CardCondition.NM,
    "M": Product.CardCondition.NM,
    "EX": Product.CardCondition.LP,
    "EXCELLENT": Product.CardCondition.LP,
    "LP": Product.CardCondition.LP,
    "VG": Product.CardCondition.MP,
    "VERY GOOD": Product.CardCondition.MP,
    "MP": Product.CardCondition.MP,
    "HP": Product.CardCondition.HP,
    "DMG": Product.CardCondition.DMG,
    "DAMAGED": Product.CardCondition.DMG,
}


def _to_bool(value, default=False):
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        return value.strip().lower() in {
            "true",
            "1",
            "yes",
            "on",
            "si",
            "sí",
        }

    return bool(value)


def _normalize_condition(value):
    condition = str(value or "").strip().upper()

    if condition in CONDITION_MAP:
        return CONDITION_MAP[condition]

    raise ValidationError(f"Condición inválida: {value}")


def format_exception(exc):
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return exc.messages

    return str(exc)


def _card_image_from_scryfall(card_data):
    image_uris = card_data.get("image_uris") or {}
    faces = card_data.get("card_faces") or []

    face_images = {}

    if faces and isinstance(faces[0], dict):
        face_images = faces[0].get("image_uris") or {}

    image_large = (
        image_uris.get("large")
        or face_images.get("large")
        or image_uris.get("normal")
        or face_images.get("normal")
        or ""
    )
    image_normal = (
        image_uris.get("normal")
        or face_images.get("normal")
        or image_large
        or ""
    )
    image_small = (
        image_uris.get("small")
        or face_images.get("small")
        or image_normal
        or ""
    )

    return image_large, image_normal, image_small


def _update_or_create_mtg_card(card_data):
    image_large, image_normal, image_small = _card_image_from_scryfall(
        card_data)

    card, _ = MTGCard.objects.update_or_create(
        scryfall_id=card_data["id"],
        defaults={
            "name": card_data.get("name", ""),
            "printed_name": card_data.get("printed_name", ""),
            "set_code": card_data.get("set", ""),
            "set_name": card_data.get("set_name", ""),
            "collector_number": card_data.get("collector_number", ""),
            "rarity": card_data.get("rarity", ""),
            "mana_cost": card_data.get("mana_cost", ""),
            "type_line": card_data.get("type_line", ""),
            "oracle_text": card_data.get("oracle_text", ""),
            "colors": card_data.get("colors") or [],
            "color_identity": card_data.get("color_identity") or [],
            "image_large": image_large,
            "image_normal": image_normal,
            "image_small": image_small,
            "scryfall_uri": card_data.get("scryfall_uri", ""),
            "raw_data": card_data,
        },
    )

    return card


def _build_product_description_from_card(card):
    parts = []

    if card.type_line:
        parts.append(card.type_line)

    if card.rarity:
        parts.append(f"Rareza: {card.rarity}")

    if card.set_name:
        parts.append(f"Set: {card.set_name} ({card.set_code.upper()})")

    if card.collector_number:
        parts.append(f"Collector #: {card.collector_number}")

    if card.oracle_text:
        parts.append("")
        parts.append(card.oracle_text)

    return "\n".join(parts).strip()


class CardViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MTGCard.objects.all()
    serializer_class = MTGCardSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = [
        "name",
        "set_name",
        "set_code",
        "collector_number",
        "rarity",
    ]


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
            return Response(
                {"detail": "q es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            return Response({"results": search_cards(query)})
        except ScryfallServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @action(detail=False, methods=["post"], url_path="import")
    def import_card_action(self, request):
        scryfall_id = request.data.get("scryfall_id")

        if not scryfall_id:
            return Response(
                {"detail": "scryfall_id es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            card, _card_data = import_card(scryfall_id)
        except ScryfallServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            MTGCardSerializer(card).data,
            status=status.HTTP_201_CREATED,
        )


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrWorkerOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "name",
        "description",
        "single_card__mtg_card__name",
    ]
    ordering_fields = [
        "price_clp",
        "created_at",
        "updated_at",
        "name",
        "stock",
    ]
    parser_classes = [
        JSONParser,
        FormParser,
        MultiPartParser,
    ]

    def get_queryset(self):
        queryset = (
            Product.objects.select_related(
                "category",
                "single_card__mtg_card",
                "sealed_product",
            )
            .prefetch_related(
                "bundle_items__item",
            )
            .all()
        )

        params = self.request.query_params

        if params.get("product_type"):
            queryset = queryset.filter(product_type=params["product_type"])

        if params.get("category"):
            queryset = queryset.filter(category_id=params["category"])

        if params.get("active") in {"true", "false"}:
            queryset = queryset.filter(is_active=params["active"] == "true")

        if params.get("rarity"):
            queryset = queryset.filter(
                single_card__mtg_card__rarity__iexact=params["rarity"]
            )

        return queryset

    @action(
        detail=False,
        methods=["post"],
        url_path="create-single-from-scryfall",
        permission_classes=[IsAdminUser],
    )
    def create_single_from_scryfall(self, request):
        required_fields = [
            "scryfall_id",
            "category_id",
            "price_clp",
            "condition",
            "language",
        ]
        payload = request.data or {}
        errors = {}

        for field in required_fields:
            if payload.get(field) in (None, ""):
                errors[field] = "Este campo es obligatorio."

        if errors:
            return Response(
                {
                    "detail": "Payload inválido.",
                    "errors": errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            category_id = int(payload.get("category_id"))
            price_clp = int(payload.get("price_clp", 0))
            stock = int(payload.get("stock", 0) or 0)
            is_foil = _to_bool(payload.get("is_foil", False))
            is_active = _to_bool(payload.get("is_active", True), default=True)
            condition = _normalize_condition(payload.get("condition"))
            language = str(payload.get("language", "")).strip().upper()
            notes = str(payload.get("notes", "") or "").strip()
            scryfall_id = str(payload.get("scryfall_id", "")).strip()
        except (TypeError, ValueError, ValidationError) as exc:
            return Response(
                {
                    "detail": "Payload inválido.",
                    "error": format_exception(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if price_clp < 0:
            return Response(
                {
                    "detail": "price_clp no puede ser menor a 0.",
                    "errors": {"price_clp": "Debe ser mayor o igual a 0."},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if stock < 0:
            return Response(
                {
                    "detail": "stock no puede ser menor a 0.",
                    "errors": {"stock": "Debe ser mayor o igual a 0."},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        category = Category.objects.filter(pk=category_id).first()

        if not category:
            return Response(
                {
                    "detail": "category_id inválido.",
                    "errors": {
                        "category_id": "No existe la categoría indicada."
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            card_data = get_scryfall_card_by_id(scryfall_id)
            card = _update_or_create_mtg_card(card_data)
            usd_ref = extract_usd_price(card_data, is_foil=is_foil)

            with transaction.atomic():
                product = Product.objects.create(
                    category=category,
                    name=(
                        f"{card.name} - "
                        f"{card.set_code.upper()} "
                        f"#{card.collector_number}"
                    ),
                    description=_build_product_description_from_card(card),
                    price_clp=price_clp,
                    stock=stock,
                    notes=notes,
                    is_active=is_active,
                    product_type=Product.ProductType.SINGLE,
                    image=card.image_large or card.image_normal or card.image_small,
                )

                SingleCard.objects.create(
                    product=product,
                    mtg_card=card,
                    condition=condition,
                    language=language,
                    is_foil=is_foil,
                    edition=card.set_name,
                    price_usd_reference=usd_ref,
                )

        except ValidationError as exc:
            logger.error(
                "Error consultando Scryfall scryfall_id=%s error=%s",
                scryfall_id,
                exc,
                exc_info=True,
            )
            return Response(
                {
                    "detail": "No se pudo obtener la carta desde Scryfall usando el ID recibido.",
                    "scryfall_id": scryfall_id,
                    "scryfall_response": format_exception(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ScryfallServiceError as exc:
            return Response(
                {
                    "detail": "No se pudo obtener la carta desde Scryfall.",
                    "scryfall_id": scryfall_id,
                    "scryfall_response": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "id": product.id,
                "name": product.name,
                "price_clp": product.price_clp,
                "stock": product.stock,
                "mtg_card": product.single_card.mtg_card_id,
                "image": product.image,
                "category": product.category_id,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["get"],
        url_path="suggested-price",
        permission_classes=[IsAdminUser],
    )
    def suggested_price(self, request, pk=None):
        product = self.get_object()
        unit_cost_clp = request.query_params.get("unit_cost_clp", 0)

        try:
            unit_cost_clp = int(float(unit_cost_clp or 0))
        except (TypeError, ValueError):
            return Response(
                {"detail": "unit_cost_clp inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            calculate_suggested_sale_price(
                product,
                unit_cost_clp=unit_cost_clp,
            )
        )

    @action(
        detail=True,
        methods=["get"],
        url_path="kardex",
        permission_classes=[IsAdminOrWorkerUser],
    )
    def kardex(self, request, pk=None):
        product = self.get_object()
        movements = product.kardex_movements.all()[:50]

        return Response(
            KardexMovementSerializer(
                movements,
                many=True,
            ).data
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="import-catalog-xlsx",
        permission_classes=[IsAdminOrWorkerUser],
        parser_classes=[MultiPartParser, FormParser],
    )
    def import_catalog_xlsx(self, request):
        excel_file = request.FILES.get("file")

        if not excel_file:
            return Response(
                {"detail": "Debes adjuntar un archivo .xlsx."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            summary = import_catalog_from_xlsx(excel_file)

            return Response(summary, status=status.HTTP_200_OK)

        except ValidationError as exc:
            return Response(
                {
                    "detail": "Error procesando archivo.",
                    "error": format_exception(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as exc:
            logger.exception("Error inesperado importando catálogo XLSX.")
            return Response(
                {
                    "detail": "Error procesando archivo.",
                    "error": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class KardexViewSet(viewsets.GenericViewSet):
    serializer_class = KardexMovementSerializer
    permission_classes = [IsAdminOrWorkerUser]

    def get_queryset(self):
        queryset = KardexMovement.objects.select_related(
            "product",
            "created_by",
        )

        product_id = self.request.query_params.get("product_id")

        if product_id:
            queryset = queryset.filter(product_id=product_id)

        movement_type = self.request.query_params.get("movement_type")

        if movement_type:
            queryset = queryset.filter(movement_type=movement_type)

        date_from = self.request.query_params.get("date_from")

        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)

        date_to = self.request.query_params.get("date_to")

        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        supplier_id = self.request.query_params.get("supplier_id")

        if supplier_id:
            purchase_order_ids = PurchaseOrder.objects.filter(
                supplier_id=supplier_id,
            ).values_list(
                "id",
                flat=True,
            )

            queryset = queryset.filter(
                reference_type="PURCHASE_ORDER",
                reference_id__in=[
                    str(po_id)
                    for po_id in purchase_order_ids
                ],
            )

        return queryset.order_by("-created_at", "-id")

    def list(self, request):
        queryset = self.get_queryset()[:200]

        return Response(
            self.get_serializer(
                queryset,
                many=True,
            ).data
        )

    @action(detail=False, methods=["post"], url_path="movement")
    def movement(self, request):
        payload = request.data
        product = Product.objects.filter(pk=payload.get("product")).first()

        if not product:
            return Response(
                {"detail": "product inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            quantity = int(payload.get("quantity", 0))

            if quantity <= 0:
                return Response(
                    {"detail": "quantity debe ser mayor a 0."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            movement = create_stock_movement(
                product=product,
                movement_type=payload.get("movement_type"),
                quantity=quantity,
                created_by=request.user,
                unit_cost_clp=int(payload.get("unit_cost_clp", 0) or 0),
                unit_price_clp=int(payload.get("unit_price_clp", 0) or 0),
                reference_label=payload.get("reference_label", ""),
                reference_type=payload.get("reference_type", "manual"),
                reference_id=payload.get("reference_id", ""),
                notes=payload.get("notes", ""),
            )

        except (TypeError, ValueError, ValidationError) as exc:
            return Response(
                {"detail": format_exception(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            self.get_serializer(movement).data,
            status=status.HTTP_201_CREATED,
        )


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrWorkerOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = [
        "name",
        "slug",
    ]

    def get_queryset(self):
        return (
            Category.objects.annotate(
                products_count=Count("products"),
            )
            .order_by("name")
        )


class PricingSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = PricingSettingsSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return PricingSettings.objects.order_by("-updated_at")

    def _ensure_single_active(self, instance):
        if instance.is_active:
            PricingSettings.objects.exclude(pk=instance.pk).update(
                is_active=False,
            )

    def perform_create(self, serializer):
        instance = serializer.save()
        self._ensure_single_active(instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._ensure_single_active(instance)

    @action(
        detail=False,
        methods=["get"],
        url_path="active",
        permission_classes=[AllowAny],
    )
    def active(self, request):
        active_settings = get_active_pricing_settings()

        return Response(
            {
                "usd_to_clp": active_settings.usd_to_clp,
                "import_factor": active_settings.import_factor,
                "risk_factor": active_settings.risk_factor,
                "margin_factor": active_settings.margin_factor,
                "rounding_to": active_settings.rounding_to,
            }
        )


class SupplierViewSet(viewsets.ModelViewSet):
    serializer_class = SupplierSerializer
    permission_classes = [IsAdminOrWorkerUser]

    def get_queryset(self):
        return Supplier.objects.order_by("name")


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAdminOrWorkerUser]
    parser_classes = [
        JSONParser,
        FormParser,
        MultiPartParser,
    ]

    def get_queryset(self):
        return (
            PurchaseOrder.objects.select_related(
                "supplier",
                "created_by",
            )
            .prefetch_related(
                "items__product",
            )
            .order_by("-created_at")
        )

    def _generate_order_number(self):
        date_prefix = timezone.localdate().strftime("%Y%m%d")
        base = f"PO-{date_prefix}-"

        last_po = (
            PurchaseOrder.objects.filter(
                order_number__startswith=base,
            )
            .order_by("-order_number")
            .first()
        )

        sequence = (
            int(last_po.order_number.split("-")[-1]) + 1
            if last_po
            else 1
        )

        return f"{base}{sequence:04d}"

    def _get_exchange_rate_for_currency(self, currency):
        currency = str(currency or "CLP").upper()

        if currency == "CLP":
            return Decimal("1")

        if currency == "USD":
            pricing_settings = (
                PricingSettings.objects
                .filter(is_active=True)
                .order_by("-updated_at", "-id")
                .first()
            )

            if not pricing_settings:
                raise ValidationError(
                    "No existe una configuración de precios activa para obtener el valor USD → CLP."
                )

            usd_to_clp = Decimal(str(pricing_settings.usd_to_clp or 0))

            if usd_to_clp <= 0:
                raise ValidationError(
                    "El valor USD → CLP configurado debe ser mayor a 0."
                )

            return usd_to_clp

        raise ValidationError(
            f"Moneda no soportada para orden de compra: {currency}"
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def _find_existing_single_product(
        self,
        scryfall_id,
        condition,
        language="EN",
        is_foil=False,
    ):
        single = (
            SingleCard.objects.filter(
                mtg_card__scryfall_id=scryfall_id,
                condition=condition,
                language=language,
                is_foil=is_foil,
            )
            .select_related("product")
            .first()
        )

        return single.product if single else None

    def _match_item_with_scryfall(
        self,
        item,
        normalized_name=None,
        set_name=None,
    ):
        normalized_name = (
            normalized_name
            or item.normalized_card_name
            or normalize_card_description(item.raw_description)["normalized_card_name"]
        )
        set_name = (
            set_name
            if set_name is not None
            else item.set_name_detected
        )

        scryfall_data = item.scryfall_data or {}
        is_foil = bool(scryfall_data.get("is_foil_detected", False))
        language = str(scryfall_data.get("language", "EN")).upper()

        result = search_scryfall_card(
            normalized_name,
            set_hint=set_name,
            is_foil=is_foil,
        )

        if not result.get("found"):
            return {
                "status": result.get("status", "not_found"),
                "message": result.get("message", "No encontrado."),
                "result": result,
            }

        condition = _normalize_condition(item.style_condition)

        product = self._find_existing_single_product(
            result.get("scryfall_id", ""),
            condition,
            language,
            is_foil,
        )

        item.normalized_card_name = normalized_name
        item.set_name_detected = set_name or item.set_name_detected
        item.style_condition = condition
        item.scryfall_id = result["scryfall_id"]
        item.scryfall_data = result

        if product:
            item.product = product
            update_fields = [
                "normalized_card_name",
                "set_name_detected",
                "style_condition",
                "scryfall_id",
                "scryfall_data",
                "product",
            ]
        else:
            update_fields = [
                "normalized_card_name",
                "set_name_detected",
                "style_condition",
                "scryfall_id",
                "scryfall_data",
            ]

        item.save(update_fields=update_fields)

        return {
            "status": "matched",
            "message": "ok",
            "result": result,
            "product_id": product.id if product else None,
        }

    @action(detail=False, methods=["post"], url_path="import-preview")
    def import_preview(self, request):
        excel_file = request.FILES.get("file")

        if not excel_file:
            return Response(
                {"detail": "Debes adjuntar un archivo .xlsx."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        parsed = parse_purchase_order_excel(
            excel_file,
            fallback_currency=request.data.get("original_currency", "USD"),
        )

        items = parsed.get("items", [])
        condition_counts = {}
        items_sum = Decimal("0")

        for item in items:
            condition = item.get("style_condition", "NM")
            condition_counts[condition] = condition_counts.get(
                condition, 0) + 1
            items_sum += Decimal(item.get("line_total_original", "0"))

        return Response(
            {
                "source_store": request.data.get("source_store", "Card Kingdom"),
                "supplier_id": request.data.get("supplier_id"),
                "currency": parsed.get("currency"),
                "detected_currency": parsed.get("currency"),
                "totals": parsed.get("totals"),
                "items": items,
                "items_count_by_condition": condition_counts,
                "items_calculated_sum": f"{items_sum.quantize(Decimal('0.01'))}",
                "warnings": parsed.get("warnings", []),
                "errors": parsed.get("errors", []),
            }
        )

    @action(detail=True, methods=["post"], url_path="receive")
    def receive(self, request, pk=None):
        purchase_order = self.get_object()

        try:
            purchase_order = receive_purchase_order(
                purchase_order,
                request.user,
            )
        except ValidationError as exc:
            return Response(
                {"detail": format_exception(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            self.get_serializer(purchase_order).data
        )

    @action(detail=True, methods=["post"], url_path="recalculate")
    def recalculate(self, request, pk=None):
        purchase_order = self.get_object()

        try:
            purchase_order = recalculate_purchase_order(purchase_order)
            purchase_order.refresh_from_db()
        except ValidationError as exc:
            return Response(
                {"detail": format_exception(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "subtotal_clp": purchase_order.subtotal_clp,
                "total_extra_costs_clp": purchase_order.total_extra_costs_clp,
                "grand_total_clp": purchase_order.grand_total_clp,
                "real_total_clp": purchase_order.real_total_clp,
                "items": PurchaseOrderItemSerializer(
                    purchase_order.items.all(),
                    many=True,
                ).data,
            }
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="scryfall-match",
    )
    def scryfall_match(self, request, pk=None):
        purchase_order = self.get_object()
        item_id = request.data.get("item_id")

        try:
            item = purchase_order.items.get(id=item_id)
        except PurchaseOrderItem.DoesNotExist:
            return Response(
                {"detail": "Item no encontrado en la orden."},
                status=status.HTTP_404_NOT_FOUND,
            )

        name = request.data.get("normalized_card_name")
        set_name = request.data.get("set_name_detected")

        try:
            output = self._match_item_with_scryfall(
                item,
                normalized_name=name,
                set_name=set_name,
            )
        except ValidationError as exc:
            return Response(
                {"detail": format_exception(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if output["status"] != "matched":
            return Response(
                {
                    "scryfall_match_status": output["status"],
                    "scryfall_match_message": output["message"],
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        item.refresh_from_db()
        data = PurchaseOrderItemSerializer(item).data
        data["scryfall_match_status"] = "matched"
        data["scryfall_match_message"] = (
            "Carta vinculada"
            if output.get("product_id")
            else "Carta encontrada, sin producto vinculado"
        )

        return Response(data)

    @action(detail=False, methods=["post"], url_path="import-create")
    def import_create(self, request):
        excel_file = request.FILES.get("file")

        if not excel_file:
            return Response(
                {"detail": "Debes adjuntar un archivo .xlsx."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            parsed = parse_purchase_order_excel(
                excel_file,
                fallback_currency=request.data.get("original_currency", "USD"),
            )
        except ValidationError as exc:
            return Response(
                {"detail": format_exception(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        supplier = None
        supplier_id = request.data.get("supplier_id")
        supplier_name = (request.data.get("supplier_name") or "").strip()

        if supplier_id:
            supplier = Supplier.objects.filter(id=supplier_id).first()
        elif supplier_name:
            supplier, _ = Supplier.objects.get_or_create(name=supplier_name)

        if not supplier:
            return Response(
                {"detail": "supplier_id o supplier_name es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        auto_match = _to_bool(
            request.data.get("auto_match_scryfall"),
            True,
        )
        create_missing_products = _to_bool(
            request.data.get("create_missing_products"),
            False,
        )
        activate_products = _to_bool(
            request.data.get("activate_products"),
            False,
        )

        with transaction.atomic():
            currency = str(parsed.get("currency") or "USD").upper()
            exchange_rate = self._get_exchange_rate_for_currency(currency)

            purchase_order = PurchaseOrder.objects.create(
                supplier=supplier,
                order_number=self._generate_order_number(),
                created_by=request.user,
                source_store=request.data.get("source_store", "Card Kingdom"),
                status=PurchaseOrder.Status.DRAFT,
                original_currency=currency,
                exchange_rate_snapshot_clp=exchange_rate,
                subtotal_original=Decimal(
                    parsed["totals"]["subtotal_original"]),
                shipping_original=Decimal(
                    parsed["totals"]["shipping_original"]),
                sales_tax_original=Decimal(
                    parsed["totals"]["sales_tax_original"]),
                total_original=Decimal(parsed["totals"]["total_original"]),
                import_duties_clp=int(
                    request.data.get("import_duties_clp") or 0),
                customs_fee_clp=int(request.data.get("customs_fee_clp") or 0),
                handling_fee_clp=int(
                    request.data.get("handling_fee_clp") or 0),
                paypal_variation_clp=int(
                    request.data.get("paypal_variation_clp") or 0),
                other_costs_clp=int(request.data.get("other_costs_clp") or 0),
                update_prices_on_receive=_to_bool(
                    request.data.get("update_prices_on_receive"),
                    False,
                ),
            )

            for item_data in parsed.get("items", []):
                item = PurchaseOrderItem.objects.create(
                    purchase_order=purchase_order,
                    raw_description=item_data["raw_description"],
                    normalized_card_name=item_data["normalized_card_name"],
                    set_name_detected=item_data["set_name_detected"],
                    style_condition=_normalize_condition(
                        item_data["style_condition"]
                    ),
                    quantity_ordered=item_data["quantity_ordered"],
                    unit_price_original=Decimal(
                        item_data["unit_price_original"]),
                    line_total_original=Decimal(
                        item_data["line_total_original"]),
                    scryfall_data={
                        "is_foil_detected": item_data.get(
                            "is_foil_detected",
                            False,
                        ),
                        "language": item_data.get("language", "EN"),
                    },
                )

                if auto_match:
                    try:
                        self._match_item_with_scryfall(item)
                    except Exception as exc:
                        logger.warning(
                            "No se pudo hacer match Scryfall item_id=%s error=%s",
                            item.id,
                            exc,
                        )

            if create_missing_products:
                category = resolve_purchase_order_product_category(None)

                for item in purchase_order.items.filter(product__isnull=True):
                    try:
                        product, _ = create_product_from_purchase_order_item(
                            item,
                            category=category,
                            created_by=request.user,
                        )

                        if activate_products:
                            product.is_active = True
                            product.save(update_fields=["is_active"])
                    except Exception as exc:
                        logger.warning(
                            "No se pudo crear producto desde item_id=%s error=%s",
                            item.id,
                            exc,
                        )

            recalculate_purchase_order(purchase_order)
            purchase_order.refresh_from_db()

        return Response(
            PurchaseOrderSerializer(purchase_order).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path=r"items/(?P<item_id>[^/.]+)/create-product",
    )
    def create_product_from_item(self, request, pk=None, item_id=None):
        purchase_order = self.get_object()

        try:
            item = purchase_order.items.get(id=item_id)
        except PurchaseOrderItem.DoesNotExist:
            return Response(
                {"detail": "Item no encontrado en la orden."},
                status=status.HTTP_404_NOT_FOUND,
            )

        category = None
        category_id = request.data.get("category_id")

        if category_id:
            category = Category.objects.filter(id=category_id).first()

            if not category:
                return Response(
                    {"detail": "category_id inválido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        category = resolve_purchase_order_product_category(category)
        activate_product = _to_bool(
            request.data.get("activate_product"),
            False,
        )

        try:
            product, created = create_product_from_purchase_order_item(
                item,
                category=category,
                created_by=request.user,
            )
        except ValidationError as exc:
            return Response(
                {"detail": format_exception(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if activate_product and product:
            product.is_active = True
            product.save(update_fields=["is_active"])

        item.refresh_from_db()

        return Response(
            {
                "item": PurchaseOrderItemSerializer(item).data,
                "product_id": product.id,
                "product_name": product.name,
                "created": created,
            }
        )

    @action(
        detail=True,
        methods=["post"],
        url_path=r"items/(?P<item_id>[^/.]+)/link-product",
    )
    def link_product(self, request, pk=None, item_id=None):
        purchase_order = self.get_object()

        try:
            item = purchase_order.items.get(id=item_id)
        except PurchaseOrderItem.DoesNotExist:
            return Response(
                {"detail": "Item no encontrado en la orden."},
                status=status.HTTP_404_NOT_FOUND,
            )

        product_id = request.data.get("product_id")
        product = Product.objects.filter(id=product_id).first()

        if not product:
            return Response(
                {"detail": "product_id inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.product = product
        item.save(update_fields=["product"])

        return Response(
            {
                "item_id": item.id,
                "product_id": product.id,
                "status": "linked",
            }
        )

    @action(detail=True, methods=["post"], url_path="create-missing-products")
    def create_missing_products(self, request, pk=None):
        purchase_order = self.get_object()

        category = None
        category_id = request.data.get("category_id")

        if category_id:
            category = Category.objects.filter(id=category_id).first()

            if not category:
                return Response(
                    {"detail": "category_id inválido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        category = resolve_purchase_order_product_category(category)
        activate_products = _to_bool(
            request.data.get("activate_products"),
            False,
        )

        items = list(
            purchase_order.items.filter(product__isnull=True)
            .order_by("id")
        )

        results = []
        created_count = 0
        linked_existing_count = 0
        failed_count = 0

        for item in items:
            try:
                product, created = create_product_from_purchase_order_item(
                    item,
                    category=category,
                    created_by=request.user,
                )

                if activate_products:
                    product.is_active = True
                    product.save(update_fields=["is_active"])

                status_label = "created" if created else "linked_existing"

                if created:
                    created_count += 1
                else:
                    linked_existing_count += 1

                results.append(
                    {
                        "item_id": item.id,
                        "status": status_label,
                        "product_id": product.id,
                        "product_name": product.name,
                    }
                )

            except Exception as exc:
                failed_count += 1
                results.append(
                    {
                        "item_id": item.id,
                        "status": "error",
                        "message": str(exc),
                    }
                )

        return Response(
            {
                "purchase_order_id": purchase_order.id,
                "created_count": created_count,
                "linked_existing_count": linked_existing_count,
                "failed_count": failed_count,
                "results": results,
            }
        )

    @action(detail=True, methods=["post"], url_path="apply-suggested-prices")
    def apply_suggested_prices(self, request, pk=None):
        purchase_order = self.get_object()

        for item in purchase_order.items.all():
            item.sale_price_to_apply_clp = item.suggested_sale_price_clp
            item.save(update_fields=["sale_price_to_apply_clp"])

        return Response(self.get_serializer(purchase_order).data)

    @action(detail=False, methods=["post"], url_path="import")
    def import_purchase_order(self, request):
        excel_file = request.FILES.get("file")

        if not excel_file:
            return Response(
                {"detail": "Debes adjuntar un archivo .xlsx."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            parsed = parse_purchase_order_excel(excel_file)
        except Exception as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "preview": parsed.get("items", []),
                "errors": parsed.get("errors", []),
                "totals": parsed.get("totals", {}),
                "currency": parsed.get("currency", "CLP"),
            }
        )

    @action(detail=False, methods=["post"], url_path="import-xlsx")
    def import_xlsx(self, request):
        excel_file = request.FILES.get("file")

        if not excel_file:
            return Response(
                {"detail": "Debes adjuntar un archivo .xlsx."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        purchase_order_id = request.data.get("purchase_order_id")

        try:
            purchase_order, summary = import_purchase_order_from_xlsx(
                excel_file=excel_file,
                user=request.user,
                purchase_order_id=purchase_order_id,
            )
        except Exception as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "purchase_order_id": purchase_order.id,
                "summary": summary,
            },
            status=status.HTTP_201_CREATED,
        )


class InventoryDashboardView(APIView):
    permission_classes = [IsAdminOrWorkerUser]

    def get(self, request):
        products = Product.objects.all()

        inventory_value_avg_cost = sum(
            int(product.stock or 0) * int(product.average_cost_clp or 0)
            for product in products
        )

        out_of_stock = Product.objects.filter(stock=0)[:50]

        low_stock = Product.objects.filter(
            stock__lte=models.F("stock_minimum"),
        ).exclude(
            stock_minimum=0,
        )[:50]

        latest_entries = KardexMovement.objects.filter(
            movement_type=KardexMovement.MovementType.PURCHASE_IN,
        )[:10]

        latest_exits = KardexMovement.objects.filter(
            movement_type=KardexMovement.MovementType.SALE_OUT,
        )[:10]

        pending_purchase_orders = PurchaseOrder.objects.filter(
            status__in=[
                PurchaseOrder.Status.DRAFT,
                PurchaseOrder.Status.SENT,
            ],
        ).order_by("-created_at")[:20]

        return Response(
            {
                "inventory_value_avg_cost_clp": inventory_value_avg_cost,
                "products_without_stock": ProductSerializer(
                    out_of_stock,
                    many=True,
                ).data,
                "products_below_minimum_stock": ProductSerializer(
                    low_stock,
                    many=True,
                ).data,
                "latest_entries": KardexMovementSerializer(
                    latest_entries,
                    many=True,
                ).data,
                "latest_exits": KardexMovementSerializer(
                    latest_exits,
                    many=True,
                ).data,
                "purchase_orders_pending_receipt": PurchaseOrderSerializer(
                    pending_purchase_orders,
                    many=True,
                ).data,
            }
        )
