from io import BytesIO
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase
from openpyxl import Workbook
from rest_framework.test import APIClient

from .models import KardexMovement, Product, PurchaseOrder, PurchaseOrderItem, SealedProduct, SingleCard, Supplier


def make_xlsx(headers, rows):
    wb = Workbook(); ws = wb.active; ws.append(headers)
    for r in rows: ws.append(r)
    f = BytesIO(); wb.save(f); f.seek(0); return f

class ImportTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        u = get_user_model().objects.create_user(username='admin', password='x', role='admin', is_staff=True)
        self.client.force_authenticate(u)

    @patch('products.services.get_card_by_id')
    def test_import_single_with_scryfall_id(self, mock_card):
        mock_card.return_value = {"id":"abc","name":"Lightning Bolt","set":"lea","set_name":"Alpha","collector_number":"1","prices":{"usd":"2.5"}}
        f = make_xlsx(["type","name","price_clp","scryfall_id"], [["single","Lightning Bolt",1000,"abc"]])
        res = self.client.post('/api/products/import-catalog-xlsx/', {'file': f}, format='multipart')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(SingleCard.objects.count(), 1)

    def test_import_sealed_manual(self):
        f = make_xlsx(["type","name","price_clp","sealed_kind"], [["sealed","Commander Deck",20000,"precon"]])
        res = self.client.post('/api/products/import-catalog-xlsx/', {'file': f}, format='multipart')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(SealedProduct.objects.count(), 1)

    def test_import_catalog_xlsx_without_file(self):
        res = self.client.post('/api/products/import-catalog-xlsx/', {}, format='multipart')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['detail'], 'Debes adjuntar un archivo .xlsx')

    def test_import_catalog_xlsx_invalid_columns_returns_safe_validation_error(self):
        f = make_xlsx(["name", "price_clp"], [["Producto", 1000]])
        res = self.client.post('/api/products/import-catalog-xlsx/', {'file': f}, format='multipart')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["detail"], "Error procesando archivo")
        self.assertIn("error", res.data)
        self.assertEqual(res.data["error"]["detail"], "Formato XLSX no reconocido")

    def test_import_catalog_xlsx_with_column_aliases(self):
        f = make_xlsx([" Tipo ", "Nombre", "Precio"], [["sealed", "Deck", 12000]])
        res = self.client.post('/api/products/import-catalog-xlsx/', {'file': f}, format='multipart')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(Product.objects.filter(name='Deck', product_type='sealed').exists())

    @patch('products.services.search_cards')
    def test_reject_ambiguous_single_without_scryfall(self, mock_search):
        mock_search.return_value = [{"id":"1"},{"id":"2"}]
        f = make_xlsx(["type","name","price_clp"], [["single","Bolt",1000]])
        res = self.client.post('/api/products/import-catalog-xlsx/', {'file': f}, format='multipart')
        self.assertIn('errors', res.data)

    @patch('products.services.get_card_by_id')
    def test_catalog_does_not_modify_stock(self, mock_card):
        mock_card.return_value = {"id":"abc","name":"Card","set":"lea","set_name":"Alpha","collector_number":"1","prices":{"usd":"1"}}
        p = Product.objects.create(name='Card', product_type='single', price_clp=1000, stock=7)
        f = make_xlsx(["type","name","price_clp","scryfall_id"], [["single","Card",1000,"abc"]])
        self.client.post('/api/products/import-catalog-xlsx/', {'file': f}, format='multipart')
        p.refresh_from_db(); self.assertEqual(p.stock, 7)

    def test_import_po_increases_stock_and_kardex(self):
        p = Product.objects.create(name='Deck Box', product_type='sealed', price_clp=1000, stock=0)
        f = make_xlsx(["product_id","name","quantity","unit_cost_usd","unit_cost_clp","supplier","order_number","exchange_rate"], [[p.id,'',3,2,1500,'ABC','PO-1',900]])
        res = self.client.post('/api/purchase-orders/import-xlsx/', {'file': f}, format='multipart')
        self.assertEqual(res.status_code, 201)
        p.refresh_from_db(); self.assertEqual(p.stock, 0)
        self.assertFalse(KardexMovement.objects.filter(product=p, movement_type='PURCHASE_IN').exists())
        self.assertTrue(PurchaseOrderItem.objects.exists())


    @patch('products.services.search_cards')
    def test_import_single_purchase_headers_creates_single_without_price_clp(self, mock_search):
        mock_search.return_value = [{"id":"abc","name":"Lightning Bolt","set":"lea","set_name":"Alpha","collector_number":"1","prices":{"usd":"2.5"}}]
        f = make_xlsx(["name", "condition", "qty", "price_usd", "total_usd", "foil"], [["Lightning Bolt", "NM", 4, 2.5, 10, True]])
        res = self.client.post('/api/products/import-catalog-xlsx/', {'file': f}, format='multipart')
        self.assertEqual(res.status_code, 200)
        p = Product.objects.get(name='Lightning Bolt', product_type='single')
        self.assertEqual(p.price_clp, 0)
        self.assertEqual(p.stock, 0)
        self.assertEqual(SingleCard.objects.filter(product=p, condition='NM').count(), 1)

    @patch('products.services.search_cards')
    def test_import_po_with_single_purchase_headers_creates_po_items_without_stock_change(self, mock_search):
        mock_search.return_value = [{"id":"abc","name":"Counterspell","set":"2ed","set_name":"Unlimited","collector_number":"55","prices":{"usd":"1.2"}}]
        f = make_xlsx(["name", "condition", "qty", "price_usd", "total_usd", "foil"], [["Counterspell", "LP", 3, 1.2, 3.6, False]])
        res = self.client.post('/api/purchase-orders/import-xlsx/', {'file': f}, format='multipart')
        self.assertEqual(res.status_code, 201)
        p = Product.objects.get(name='Counterspell', product_type='single')
        p.refresh_from_db()
        self.assertEqual(p.stock, 0)
        item = PurchaseOrderItem.objects.get(product=p)
        self.assertEqual(item.quantity_ordered, 3)

    def test_import_catalog_endpoint_accepts_post_not_405(self):
        f = make_xlsx(["type", "name", "price_clp", "sealed_kind"], [["sealed", "Bundle Box", 12000, "bundle"]])
        res = self.client.post('/api/products/import-catalog-xlsx/', {'file': f}, format='multipart')
        self.assertNotEqual(res.status_code, 405)

    def test_create_purchase_order_without_order_number_autogenerates_and_calculates_totals(self):
        supplier = Supplier.objects.create(name="Proveedor Test")
        product = Product.objects.create(name="Producto Test", product_type="sealed", price_clp=1000, stock=0)
        payload = {
            "supplier": supplier.id,
            "status": "DRAFT",
            "shipping_clp": 1000,
            "import_fees_clp": 500,
            "taxes_clp": 200,
            "order_number": "",
            "items": [
                {"product": product.id, "quantity_ordered": 2, "unit_cost_clp": 1500, "quantity_received": 0},
            ],
        }
        res = self.client.post("/api/purchase-orders/", payload, format="json")
        self.assertEqual(res.status_code, 201)
        po = PurchaseOrder.objects.get(id=res.data["id"])
        self.assertRegex(po.order_number, r"^PO-\d{8}-\d{4}$")
        self.assertEqual(po.subtotal_clp, 3000)
        self.assertEqual(po.total_clp, 4700)
        item = po.items.get(product=product)
        self.assertEqual(item.subtotal_clp, 3000)

class PurchaseOrderReceiveTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(username='worker', password='x', role='admin', is_staff=True)
        self.client.force_authenticate(self.user)

    def test_receive_purchase_order_uses_clp_when_usd_not_present(self):
        product = Product.objects.create(name='Producto CLP', product_type='sealed', price_clp=1000, stock=0)
        po = PurchaseOrder.objects.create(status=PurchaseOrder.Status.DRAFT, created_by=self.user, order_number='PO-CLP-1')
        item = PurchaseOrderItem.objects.create(
            purchase_order=po,
            product=product,
            quantity_ordered=3,
            quantity_received=0,
            unit_cost_usd=0,
            unit_cost_clp=1500,
            subtotal_clp=4500,
        )

        res = self.client.post(f'/api/purchase-orders/{po.id}/receive/')
        self.assertEqual(res.status_code, 200)

        item.refresh_from_db()
        product.refresh_from_db()
        po.refresh_from_db()
        self.assertEqual(item.unit_cost_clp, 1500)
        self.assertEqual(item.quantity_received, 3)
        self.assertEqual(product.stock, 3)
        self.assertEqual(po.status, PurchaseOrder.Status.RECEIVED)

    def test_receive_purchase_order_requires_positive_cost_in_clp_or_usd(self):
        product = Product.objects.create(name='Producto Inválido', product_type='sealed', price_clp=1000, stock=0)
        po = PurchaseOrder.objects.create(status=PurchaseOrder.Status.DRAFT, created_by=self.user, order_number='PO-INVALID-1')
        PurchaseOrderItem.objects.create(
            purchase_order=po,
            product=product,
            quantity_ordered=2,
            quantity_received=0,
            unit_cost_usd=0,
            unit_cost_clp=0,
            subtotal_clp=0,
        )

        res = self.client.post(f'/api/purchase-orders/{po.id}/receive/')
        self.assertEqual(res.status_code, 400)
        self.assertIn('Costo unitario inválido', str(res.data))
