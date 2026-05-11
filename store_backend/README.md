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


## Configuración de producción

Variables requeridas en entorno (`.env` o variables del sistema):
- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `MYSQL_NAME`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `WEBPAY_COMMERCE_CODE`
- `WEBPAY_API_KEY_SECRET`
- `WEBPAY_ENVIRONMENT`
- `WEBPAY_RETURN_URL`
- `STOCK_RESERVATION_MINUTES`

Debes programar la ejecución periódica del comando:
`python manage.py release_expired_stock_reservations` cada 5 minutos (cron o scheduler equivalente).


## Deploy en PythonAnywhere

### 1. Crear la base de datos MySQL
En el panel de PythonAnywhere → Databases → Create a new database
Nombre: manamarket (quedará como tu_usuario$manamarket)

### 2. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 3. Configurar variables de entorno
Editar `store_backend/.env` con los datos reales de MySQL:
```env
MYSQL_NAME=tu_usuario$manamarket
MYSQL_USER=tu_usuario
MYSQL_PASSWORD=contraseña_del_panel
MYSQL_HOST=tu_usuario.mysql.pythonanywhere-services.com
MYSQL_PORT=3306
```

### 4. Correr migraciones
```bash
cd store_backend
python manage.py migrate
```

### 5. Crear superusuario
```bash
python manage.py createsuperuser
```

### 6. Configurar WSGI en PythonAnywhere
En el panel Web → WSGI configuration file:
```python
import os, sys
sys.path.insert(0, '/home/tu_usuario/e-commerce/store_backend')
os.environ['DJANGO_SETTINGS_MODULE'] = 'store_backend.settings'
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

### 7. Variables de entorno adicionales en .env para producción
```env
DEBUG=False
SECRET_KEY=<clave-generada-con-python-c-"from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())">
ALLOWED_HOSTS=tu_usuario.pythonanywhere.com
CORS_ALLOWED_ORIGINS=https://tu-frontend.vercel.app
```

Para producción se recomienda migrar de SQLite a MySQL 8 (PythonAnywhere).

## Sincronización de precios desde Scryfall

Ejecutar manualmente o como cron en PythonAnywhere:

```bash
python manage.py sync_external_prices
python manage.py sync_external_prices --product-id 42
```

En PythonAnywhere: panel Tasks → agregar tarea diaria:

```bash
cd /home/tu_usuario/e-commerce/store_backend && python manage.py sync_external_prices
```
