# Bitácora Campbell

Aplicación de soportes de TI de la Fundación Campbell: API en NestJS, interfaz en React y datos en MySQL (`127.0.0.1:3307`).

## Puesta en marcha

1. En MySQL Workbench, con la conexión **local7** (root, puerto 3307), ejecuta `database/local/instalar.sql`.
   Ese archivo se genera en esta PC y no se sube a GitHub: el repositorio es público y el volcado incluye nombres de solicitantes.
2. El archivo `.env` de la raíz ya tiene la cadena `DATABASE_URL` del usuario `bitacora_admin`.
3. Instala y arranca:

```bash
npm install
npm test
npm run dev
```

4. Abre http://localhost:5173 e inicia sesión con el correo y la contraseña `APP_ADMIN_*` del `.env`.
5. En la misma conexión de Workbench, ejecuta `database/002-mantenimientos.sql` para crear equipos y los mantenimientos preventivos y correctivos. El script es idempotente.

## Cómo encender el servidor (esta PC y quien pruebe)

El navegador muestra `ERR_CONNECTION_REFUSED` si no está corriendo `npm run dev`. Hay tres formas de levantarlo; con una basta.

### A. Doble clic (la más simple)

1. Confirma que MySQL está encendido (puerto **3307**, conexión **local7**).
2. En la carpeta del proyecto, doble clic en `iniciar.bat`.
3. Deja esa ventana abierta. Cuando diga `Local: http://localhost:5173/`, el navegador debería abrirse solo.
4. Entra con el correo y la contraseña `APP_ADMIN_*` del `.env` (pídeselos a quien administra el proyecto; no van en GitHub).
5. Para apagar el servidor, cierra la ventana negra.

Si el servidor ya estaba arriba, el script no duplica procesos: abre el navegador y sale.

### B. Cada vez que abres Cursor

Al abrir esta carpeta en Cursor se dispara la tarea **Iniciar Bitacora Campbell**.

1. La primera vez, Cursor pregunta si permites tareas automáticas: elige **Allow**.
2. Revisa la terminal **Iniciar Bitacora Campbell**. Cuando veas `Local: http://localhost:5173/`, abre esa URL.
3. Si no arrancó, Terminal → Run Task… → **Iniciar Bitacora Campbell**.

### C. Cada vez que enciendes Windows

En una terminal, desde la raíz del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\instalar-inicio-windows.ps1
```

Al iniciar sesión en Windows se abrirá una ventana y el servidor. Para quitarlo:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\quitar-inicio-windows.ps1
```

## Guía de pruebas (para quien se delegue)

1. Enciende MySQL (puerto 3307).
2. Arranca con `iniciar.bat` o abriendo el proyecto en Cursor.
3. Abre http://localhost:5173. Si sale `ERR_CONNECTION_REFUSED`, el servidor no está arriba: vuelve al paso 2.
4. Inicia sesión.
5. Recorre al menos esto:
   - **Registros**: filtrar, crear un soporte con **Nuevo soporte**, editar, imprimir PDF de un registro y del filtro.
   - **Preventivo**: listar, crear, editar.
   - **Correctivo**: listar, crear, editar.
   - **Tablero**: revisar las tarjetas KPI y pulsar **Actualizar**.
6. Deja abierta la ventana del servidor mientras pruebas. Si la cierras, la web se cae.

Si clonas el repo en otra máquina, copia `.env.example` a `.env`, cambia los secretos y vuelve a generar el SQL:

```bash
python scripts/generar-sql.py
```

El Excel de origen debe estar junto al script, con el nombre `BitacoraSoportes_Data.xlsx`.

## API

Prefijo `/api/v1`.

| Método | Ruta | Auth |
| --- | --- | --- |
| POST | `/auth/login` | pública |
| GET | `/auth/me` | sesión |
| GET | `/health/live` | pública |
| GET | `/health` | pública, comprueba MySQL |
| GET | `/soportes` | sesión, paginado |
| POST | `/soportes` | sesión, acepta `Idempotency-Key` |
| PUT | `/soportes/:id` | sesión, exige `If-Match` |
| DELETE | `/soportes/:id` | solo `admin`, exige `If-Match` |
| GET | `/soportes/pdf` | sesión, PDF del filtro activo |
| GET | `/soportes/:id/pdf` | sesión, PDF de un soporte |
| GET | `/estadisticas` | sesión, tablero |
| GET | `/areas` y `/tecnicos` | sesión |
| GET | `/equipos` | sesión, búsqueda |
| POST | `/equipos` | sesión, crea un equipo |
| GET | `/mantenimientos/resumen` | sesión, cifras del tablero |
| GET | `/mantenimientos/preventivos` | sesión, paginado |
| POST | `/mantenimientos/preventivos` | sesión, acepta `Idempotency-Key` |
| PUT | `/mantenimientos/preventivos/:id` | sesión, exige `If-Match` |
| DELETE | `/mantenimientos/preventivos/:id` | solo `admin`, exige `If-Match` |
| GET | `/mantenimientos/correctivos` | sesión, paginado |
| POST | `/mantenimientos/correctivos` | sesión, acepta `Idempotency-Key` |
| PUT | `/mantenimientos/correctivos/:id` | sesión, exige `If-Match` |
| DELETE | `/mantenimientos/correctivos/:id` | solo `admin`, exige `If-Match` |

El usuario `bitacora_admin` tiene todos los privilegios sobre la base `bitacora_campbell`. No es administrador de todo el servidor MySQL.
