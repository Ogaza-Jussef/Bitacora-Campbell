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

El usuario `bitacora_admin` tiene todos los privilegios sobre la base `bitacora_campbell`. No es administrador de todo el servidor MySQL.
