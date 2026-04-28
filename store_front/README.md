# Store Front (React + Vite)

Frontend de ecommerce para productos físicos y singles digitales, consumiendo una API REST de Django REST Framework.

## Stack
- React + Vite
- React Router DOM
- Axios
- Bootstrap 5 + Bootstrap Icons
- Notyf
- DataTables (datatables.net-bs5)

## Estructura
```
src/
  api/
  components/
  context/
  hooks/
  layouts/
  pages/
  styles/
```

## Configuración
1. Instalar dependencias:
```bash
npm install
```

2. Crear archivo `.env`:
```bash
VITE_API_BASE_URL=http://localhost:8000
```

3. Ejecutar en desarrollo:
```bash
npm run dev
```

4. Build de producción:
```bash
npm run build
npm run preview
```

## Funcionalidades incluidas
- Home con hero y carrusel de destacados.
- Catálogo con filtros (categoría, tipo, búsqueda).
- Detalle de producto.
- Carrito con edición de cantidades, subtotal/total, vaciado y checkout.
- Autenticación (login, registro, logout, perfil) con JWT.
- Pedidos del usuario con DataTables y modal de detalle.
- Biblioteca digital protegida.
- Panel admin para productos y pedidos con rutas protegidas.
- Interceptores Axios para JWT y manejo global de errores con Notyf.
