# Calculadora Frontend (React + Vite + Tailwind v3)

Interfaz de calculadora que consume la API en `http://localhost:3000/api/calculator`.

## Requisitos
- Node.js 18+ (recomendado 18 o 20)
- Backend corriendo en `http://localhost:3000` (ruta base: `/api/calculator`)

## Instalación
```bash
npm install
```

## Desarrollo
```bash
npm run dev
```
- App en: http://localhost:5173
- Vite proxy: todas las llamadas a `/api/*` se redirigen a `http://localhost:3000`.
- Tailwind: versión 3 con `darkMode: 'class'`.


## Configuración relevante
- `src/api.js`: usa `BASE_URL = '/api/calculator'` (relativo) para que el proxy funcione en dev.
- `vite.config.js`: proxy de `/api` → `http://localhost:3000`.
- `tailwind.config.js`: `darkMode: 'class'`.

## Uso de la interfaz
- Pantalla principal: muestra el número ingresado (buffer) o el valor actual del backend.
- Teclado:
  - Números `0-9` y `.` agregan al buffer.
  - Operadores `+`, `-`, `×`, `÷` envían una operación al backend usando el número del buffer.
  - `C` limpia (POST `/clear`).
  - `⌫` borra el último dígito del buffer.
  - `↶` deshacer (POST `/undo`). El botón Rehacer está en el panel de historial.
- Historial (lado derecho):
  - Lista de estados con marca en el actual.
  - Clic en un ítem para saltar a ese punto (usa múltiples `undo`/`redo` bajo el capó).
- Tema claro/oscuro: botón arriba a la derecha, se guarda en `localStorage`.

## Endpoints esperados (resumen)
- GET `/api/calculator/state`
- POST `/api/calculator/operation` con `{ operation: 'sumar|restar|multiplicar|dividir', value: number }`
- GET `/api/calculator/history`
- POST `/api/calculator/undo`
- POST `/api/calculator/redo`
- POST `/api/calculator/clear`

## Atajos de teclado
- Números `0-9`, `.`: escribir número.
- `+`, `-`, `*`, `/`: enviar operación (usa el número actual del buffer).
- `Backspace`: borrar último carácter.
- `Esc`: limpiar (clear).
- `Enter` o `=`: (sin acción en modo paso a paso por diseño).

## Solución de problemas
- "Unknown at rule @tailwind/@apply" en el editor: es aviso del analizador del editor; al compilar con Vite+PostCSS funciona correctamente.
- CORS en desarrollo: debe evitarse con el proxy de Vite. Si ves errores, confirma que el backend corre en `http://localhost:3000`.
- Producción: si el backend vive en otro dominio, ajusta el `BASE_URL` o configura un reverse proxy para servir `/api` en el mismo host.

## Scripts
- `dev`: arranca Vite
- `build`: construye producción
- `preview`: sirve la carpeta `dist`
