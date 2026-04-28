# Ecommerce Backend (Django + DRF)

Backend REST para ecommerce con productos físicos y singles digitales.

## Apps

- `accounts`: registro, login JWT y perfil autenticado.
- `products`: categorías y productos.
- `cart`: carrito y sus ítems.
- `orders`: checkout y pedidos.
- `digital_library`: biblioteca de singles digitales comprados.

## Requisitos

- Python 3.11+
- pip

## Instalación

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Autenticación JWT

- Login: `POST /api/auth/login/`
- Refresh token: `POST /api/auth/token/refresh/`
- Usar header: `Authorization: Bearer <access_token>`

## Endpoints principales

### Auth

- `POST /api/auth/register/` registrar usuario.
- `POST /api/auth/login/` obtener JWT.
- `GET /api/auth/me/` usuario autenticado.

### Productos

- `GET /api/products/` listar productos.
- `GET /api/products/{id}/` detalle de producto.
- `GET /api/products/?category=<id>` filtrar por categoría.
- `GET /api/products/?product_type=physical|digital` filtrar por tipo.
- `GET /api/categories/` listar categorías.

### Carrito

- `GET /api/cart/` ver carrito.
- `POST /api/cart/items/` agregar producto.
- `PATCH /api/cart/items/{item_id}/` actualizar cantidad.
- `DELETE /api/cart/items/{item_id}/remove/` eliminar ítem.
- `DELETE /api/cart/clear/` vaciar carrito.

### Pedidos

- `POST /api/orders/checkout/` confirmar compra desde carrito.
- `GET /api/orders/` listar pedidos del usuario.
- `GET /api/orders/{id}/` detalle de pedido.

### Biblioteca digital

- `GET /api/library/` listar singles digitales comprados por el usuario.

## Reglas de negocio implementadas

- No se pueden comprar productos inactivos.
- No se puede exceder stock en productos físicos.
- Cantidades solo mayores a 0.
- Singles digitales se guardan una sola vez por usuario (restricción única).
- En `OrderItem` se guarda precio unitario y subtotal al momento de compra.
- En checkout:
  - se descuenta stock únicamente de físicos;
  - se registra acceso digital únicamente para digitales;
  - se vacía el carrito al finalizar.

## Ejemplos de payload

### Registro

```json
{
  "username": "cliente1",
  "email": "cliente1@example.com",
  "password": "Password123",
  "first_name": "Cliente",
  "last_name": "Demo"
}
```

### Agregar al carrito

```json
{
  "product_id": 2,
  "quantity": 1
}
```

### Actualizar cantidad de ítem

```json
{
  "quantity": 3
}
```

## Administración

Desde Django Admin (`/admin/`) el staff puede:

- crear/editar categorías y productos;
- actualizar stock;
- activar/desactivar productos;
- revisar pedidos e ítems del pedido;
- revisar biblioteca digital de usuarios.
