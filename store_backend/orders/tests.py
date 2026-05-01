from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from cart.models import Cart, CartItem
from orders.services import create_order_from_cart
from products.inventory_services import consume_fifo_stock, receive_purchase_order
from products.models import InventoryLot, Product, PurchaseOrder, PurchaseOrderItem, Supplier


class FifoInventoryTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="fifo", password="x", role="customer")
        self.staff = get_user_model().objects.create_user(username="staff", password="x", role="admin", is_staff=True)
        self.supplier = Supplier.objects.create(name="Proveedor FIFO")
        self.product = Product.objects.create(name="Lightning Bolt", product_type="single", price_clp=3000, stock=0, is_active=True)

    def _receive_po(self, order_number, qty, cost):
        po = PurchaseOrder.objects.create(supplier=self.supplier, created_by=self.staff, order_number=order_number)
        PurchaseOrderItem.objects.create(purchase_order=po, product=self.product, quantity_ordered=qty, unit_cost_clp=cost)
        receive_purchase_order(po.id, self.staff)

    def test_receive_purchase_creates_lots_with_different_costs(self):
        self._receive_po("PO-FIFO-1", 2, 1000)
        self._receive_po("PO-FIFO-2", 3, 2000)
        lots = list(InventoryLot.objects.filter(product=self.product).order_by("received_at", "id"))
        self.assertEqual(len(lots), 2)
        self.assertEqual(lots[0].unit_cost_clp, 1000)
        self.assertEqual(lots[1].unit_cost_clp, 2000)

    def test_fifo_partial_sale_cost_and_profit(self):
        self._receive_po("PO-FIFO-1", 2, 1000)
        self._receive_po("PO-FIFO-2", 3, 2000)
        cart, _ = Cart.objects.get_or_create(user=self.user)
        CartItem.objects.create(cart=cart, product=self.product, quantity=3)

        order = create_order_from_cart(self.user)
        item = order.items.get()
        self.assertEqual(item.total_cost_clp, 4000)
        self.assertEqual(item.unit_cost_clp, 1333)
        self.assertEqual(item.gross_profit_clp, item.subtotal_clp - 4000)

    def test_fifo_complete_sale_consumes_all_stock(self):
        self._receive_po("PO-FIFO-1", 2, 1000)
        self._receive_po("PO-FIFO-2", 3, 2000)
        cost = consume_fifo_stock(self.product, 5)
        self.assertEqual(cost["total_cost_clp"], 8000)
        self.assertEqual(sum(InventoryLot.objects.filter(product=self.product).values_list("quantity_remaining", flat=True)), 0)

    def test_fifo_ordering_is_correct(self):
        self._receive_po("PO-FIFO-1", 1, 500)
        self._receive_po("PO-FIFO-2", 1, 1500)
        cost = consume_fifo_stock(self.product, 1)
        self.assertEqual(cost["total_cost_clp"], 500)

    def test_error_when_insufficient_stock(self):
        self._receive_po("PO-FIFO-1", 1, 1000)
        with self.assertRaises(ValidationError):
            consume_fifo_stock(self.product, 2)
