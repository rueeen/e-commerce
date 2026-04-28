from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils.text import slugify
from openpyxl import load_workbook
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .models import Category, Product
from .permissions import IsAdminOrReadOnly
from .serializers import CategorySerializer, ProductSerializer


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
    search_fields = ["name", "description"]
    ordering_fields = ["price", "created_at", "name"]

    def get_queryset(self):
        queryset = Product.objects.select_related("category").all()
        category_id = self.request.query_params.get("category")
        product_type = self.request.query_params.get("product_type")
        active = self.request.query_params.get("active")

        if category_id:
            queryset = queryset.filter(category_id=category_id)
        if product_type:
            queryset = queryset.filter(product_type=product_type)
        if active in {"true", "false"}:
            queryset = queryset.filter(is_active=active == "true")
        return queryset

    @action(detail=False, methods=["post"], url_path="import-excel", parser_classes=[MultiPartParser])
    def import_excel(self, request):
        excel_file = request.FILES.get("file")
        if not excel_file:
            return Response({"detail": "Debes adjuntar un archivo .xlsx en el campo file."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wb = load_workbook(excel_file, data_only=True)
        except Exception:
            return Response({"detail": "No se pudo leer el archivo Excel."}, status=status.HTTP_400_BAD_REQUEST)

        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return Response({"detail": "El archivo está vacío."}, status=status.HTTP_400_BAD_REQUEST)

        expected_headers = ["category", "name", "description", "price", "stock", "image", "product_type", "is_active"]
        headers = [str(h).strip().lower() if h is not None else "" for h in rows[0]]
        header_map = {name: idx for idx, name in enumerate(headers)}

        missing = [h for h in expected_headers if h not in header_map]
        if missing:
            return Response(
                {"detail": "Faltan columnas obligatorias.", "columnas_faltantes": missing},
                status=status.HTTP_400_BAD_REQUEST,
            )

        summary = {"creados": 0, "actualizados": 0, "errores": [], "filas_procesadas": 0}

        def get_value(data, key):
            idx = header_map[key]
            return data[idx] if idx < len(data) else None

        for row_num, row in enumerate(rows[1:], start=2):
            if not any(cell not in (None, "") for cell in row):
                continue

            summary["filas_procesadas"] += 1
            try:
                category_name = str(get_value(row, "category") or "").strip()
                name = str(get_value(row, "name") or "").strip()
                description = str(get_value(row, "description") or "").strip()
                image = str(get_value(row, "image") or "").strip()
                product_type = str(get_value(row, "product_type") or "").strip().lower()
                raw_is_active = get_value(row, "is_active")

                if not category_name or not name:
                    raise ValueError("category y name son obligatorios")
                if product_type not in {Product.ProductType.PHYSICAL, Product.ProductType.DIGITAL}:
                    raise ValueError("product_type debe ser physical o digital")

                try:
                    price = Decimal(str(get_value(row, "price")))
                except (InvalidOperation, TypeError, ValueError):
                    raise ValueError("price debe ser numérico")

                try:
                    stock = int(get_value(row, "stock"))
                except (TypeError, ValueError):
                    raise ValueError("stock debe ser entero")

                if stock < 0:
                    raise ValueError("stock no puede ser negativo")

                is_active = True
                if isinstance(raw_is_active, bool):
                    is_active = raw_is_active
                elif raw_is_active is not None:
                    is_active_str = str(raw_is_active).strip().lower()
                    is_active = is_active_str in {"1", "true", "si", "sí", "yes", "y", "activo"}

                slug_base = slugify(category_name) or "categoria"
                slug = slug_base
                i = 1
                while Category.objects.filter(slug=slug).exclude(name=category_name).exists():
                    i += 1
                    slug = f"{slug_base}-{i}"

                category, _ = Category.objects.get_or_create(
                    name=category_name,
                    defaults={"slug": slug, "is_active": True},
                )

                with transaction.atomic():
                    product, created = Product.objects.update_or_create(
                        name=name,
                        category=category,
                        defaults={
                            "description": description,
                            "price": price,
                            "stock": stock,
                            "image": image,
                            "product_type": product_type,
                            "is_active": is_active,
                        },
                    )

                if created:
                    summary["creados"] += 1
                else:
                    summary["actualizados"] += 1

            except Exception as exc:
                summary["errores"].append({"fila": row_num, "error": str(exc)})

        return Response(summary, status=status.HTTP_200_OK)
