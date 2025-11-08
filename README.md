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
- Layout: calculadora a la izquierda y historial a la derecha (responsive).
- Display: muestra la expresión grande y debajo `= resultado`.
- Teclado/botones:
  - Números `0-9`, `.` y paréntesis `(` `)` construyen la expresión.
  - Operadores `+ - * /` se agregan a la expresión (con manejo de reemplazo de operador consecutivo).
  - `=` o Enter: evalúa la expresión (POST `/evaluate`).
  - `C`: limpiar (POST `/clear`).
  - `⌫`: borra el último carácter del buffer.
  - `↶`: deshacer (POST `/undo`). Rehacer está junto al historial.
- Historial (lado derecho):
  - Lista de estados con marca en el actual y scroll.
  - Clic en un ítem salta a ese punto ejecutando internamente `undo/redo`.
  - Tras saltar, el buffer se precarga con la operación (expresión) de ese estado para editarla y re-evaluar.
- Rehacer/Deshacer: al usarlos, el buffer también se precarga con la expresión del estado actual.
- Tema claro/oscuro: botón arriba a la derecha, persistido en `localStorage`.

## Endpoints esperados (resumen)
- POST `/api/calculator/evaluate` con `{ expression: string }`
- POST `/api/calculator/clear`
- POST `/api/calculator/undo`
- POST `/api/calculator/redo`
- GET `/api/calculator/state`
- GET `/api/calculator/history`

## Atajos de teclado
- Números `0-9`, `.` `(` `)`: construir expresión.
- `+`, `-`, `*`, `/`: agregar operador.
- `Backspace`: borrar último carácter.
- `Esc`: limpiar (clear).
- `Enter` o `=`: evaluar expresión.

## Ejemplos
- `10+10` → `20`
- `10-20+5` → `-5`
- `12*0.5+20*0.5` → `16`
- `(2+3)*4-5/2` → `17.5`

## Solución de problemas
- "Unknown at rule @tailwind/@apply" en el editor: es aviso del analizador del editor; al compilar con Vite+PostCSS funciona correctamente.
- CORS en desarrollo: debe evitarse con el proxy de Vite. Si ves errores, confirma que el backend corre en `http://localhost:3000`.
- Producción: si el backend vive en otro dominio, ajusta el `BASE_URL` o configura un reverse proxy para servir `/api` en el mismo host.

## Scripts
- `dev`: arranca Vite
- `build`: construye producción
- `preview`: sirve la carpeta `dist`
