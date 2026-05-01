from io import BytesIO
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase
from openpyxl import Workbook
from rest_framework.test import APIClient

from .models import KardexMovement, Product, PurchaseOrderItem, SealedProduct, SingleCard


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

    def test_import_catalog_xlsx_invalid_columns(self):
        f = make_xlsx(["name", "price_clp"], [["Producto", 1000]])
        res = self.client.post('/api/products/import-catalog-xlsx/', {'file': f}, format='multipart')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["detail"], "Columnas inválidas")
        self.assertEqual(res.data["expected"], ["name", "type", "price_clp"])
        self.assertEqual(res.data["received"], ["name", "price_clp"])

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

    def test_import_catalog_endpoint_accepts_post_not_405(self):
        f = make_xlsx(["type", "name", "price_clp", "sealed_kind"], [["sealed", "Bundle Box", 12000, "bundle"]])
        res = self.client.post('/api/products/import-catalog-xlsx/', {'file': f}, format='multipart')
        self.assertNotEqual(res.status_code, 405)
