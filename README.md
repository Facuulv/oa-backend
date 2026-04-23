# OA! — Backend API

API REST del sistema **OA!**, orientada a un local de bebidas. Forma parte de una plataforma que contempla (o contemplará) e-commerce y carrito online, cupones, promociones, puntos, usuarios y autenticación, panel administrativo, y a futuro seguimiento de delivery en tiempo real y otras funcionalidades del negocio.

Este repositorio concentra el **servidor backend** (Node.js + Express + MySQL), autenticación **JWT** (sesión en **cookies httpOnly** y, donde aplica, cabecera `Authorization: Bearer`), validación con Zod, límites de peticiones, persistencia de **URLs de imagen** (`imagen_url` en catálogo), y rutas públicas y administrativas.

---

## Descripción general

El backend expone endpoints en inglés (`/auth`, `/public`, `/admin`, etc.) y persiste datos en MySQL siguiendo convenciones en `snake_case` en base de datos. No utiliza ORM en la versión actual: las consultas se orquestan desde controladores y repositorios sobre un **pool** `mysql2/promise`.

**Importante:** el archivo `.env` con secretos y credenciales **no debe subirse al repositorio**. En `.gitignore` ya está excluido `.env`. Usá siempre `.env.example` como plantilla y copiá los valores sensibles de forma local o desde un gestor de secretos.

---

## Funcionalidades principales

- **Autenticación:** registro, **login unificado** (admin o cliente con el mismo endpoint), logout, perfil (`/auth`); sesión en cookies httpOnly separadas para panel (`usuarios`) y tienda (`clientes`).
- **Usuarios (admin):** CRUD bajo rol administrador (`/users`).
- **Catálogo (admin):** categorías y productos; imágenes como URL en `imagen_url` (`/categories`, `/products`, `/admin/categorias`).
- **Promociones y cupones (admin):** gestión de promociones y cupones; validación pública de cupón (`/promotions`, `/coupons`).
- **Pedidos:** creación pública de pedidos, validación de cupón en flujo público; historial del cliente autenticado; listado y cambio de estado para admin (`/orders`, `/public/orders`).
- **Checkout / pagos:** endpoints reservados; la preferencia de pago devuelve **501** (no implementado); webhook de stub que responde **200** (`/public/checkout/*`).
- **Administración:** dashboard y configuración del sistema (`/admin`).
- **Salud:** comprobación de API y conectividad a base de datos (`/health`).

No hay en este código **WebSockets**, **workers** dedicados, **cron** ni colas de tareas: las notificaciones y pagos están preparados como stubs/servicios para evolución futura.

---

## Stack tecnológico

| Área | Tecnología |
|------|------------|
| Runtime | Node.js **≥ 18** |
| Framework | Express **4.x** |
| Base de datos | **MySQL 8+** (`mysql2` promise pool) |
| Autenticación | **JWT** (`jsonwebtoken`), contraseñas con **bcryptjs** |
| Validación | **Zod** |
| Seguridad / HTTP | **helmet**, **cors**, **compression**, **cookie-parser** |
| Imágenes | URLs en BD (`imagen_url`); sin subida en servidor |
| Tests (herramienta) | **Jest** + **supertest** (configurados en `package.json`) |
| Desarrollo | **nodemon** |

---

## Requisitos previos

- **Node.js** 18 o superior.
- **MySQL** 8 (o compatible) accesible desde la máquina donde corre la API.
- Cuenta en un almacén de imágenes (p. ej. **Cloudinary**) solo en el **cliente** si subís archivos desde el frontend; el backend no sube archivos.
- Cliente HTTP o frontend (por ejemplo en `http://localhost:3000`) alineado con la configuración **CORS** del servidor.

---

## Instalación

1. **Clonar** el repositorio:

   ```bash
   git clone <url-del-repositorio>
   cd oa_backend
   ```

2. **Instalar dependencias:**

   ```bash
   npm install
   ```

3. **Base de datos:** creá la base y tablas. El proyecto incluye un esquema de referencia alineado con la BD `sistema_oa`:

   ```bash
   mysql -u root -p < scripts/schema.sql
   ```

   Ajustá usuario, host y nombre de base según tu entorno (deben coincidir con las variables `DB_*` del `.env`).

4. **Migración legacy (opcional):** si venís de un esquema antiguo con tabla `users`, existe un script SQL orientativo en `scripts/migrations/001_legacy_users_to_oa_auth.sql`. Está pensado para ejecutarse **sobre copia de respaldo**; leé los comentarios del archivo antes de aplicarlo.

5. **Variables de entorno:** copiá la plantilla y editá valores:

   ```bash
   cp .env.example .env
   ```

   Completá al menos **MySQL** y **JWT_SECRET** (mínimo 32 caracteres; el arranque valida esto en `config/jwt.js`).

---

## Configuración del entorno

- El servidor carga variables con **`dotenv`** desde la raíz del proyecto (`require('dotenv').config()` en `server.js`).
- Escucha en **`0.0.0.0`** y en el puerto definido por **`PORT`** (por defecto **4000**).
- **CORS:** siempre incluye `http://localhost:3000`; en desarrollo (`NODE_ENV=development`) también permite orígenes que coincidan con `http://localhost:<cualquier_puerto>` y `http://127.0.0.1:<cualquier_puerto>`. Podés añadir más orígenes con `FRONTEND_URL` y `ALLOWED_ORIGINS` (coma-separados).
- **Límite de cuerpo JSON / urlencoded:** 10 MB.

---

## Variables de entorno

| Variable | Obligatoria | Descripción breve |
|----------|-------------|-------------------|
| `PORT` | No | Puerto HTTP de la API (default: `4000`). |
| `NODE_ENV` | No | `development`, `production` o `test`. Afecta CORS, caducidad de JWT de acceso, formato de logs Morgan, límites de rate limit y mensajes de error. |
| `DB_HOST` | Sí (para BD) | Host de MySQL. |
| `DB_USER` | Sí | Usuario de MySQL. |
| `DB_PASSWORD` | Sí* | Contraseña de MySQL (*puede vacío en local). |
| `DB_DATABASE` | Sí | Nombre de la base (ej. `sistema_oa`). |
| `DB_PORT` | No | Puerto MySQL (default: `3306`). |
| `JWT_SECRET` | Sí | Secreto para firmar y verificar JWT; **mínimo 32 caracteres** o el proceso termina al iniciar. |
| `FRONTEND_URL` | No | Origen adicional permitido por CORS (ej. URL del frontend en prod). |
| `ALLOWED_ORIGINS` | No | Lista separada por comas de orígenes extra para CORS. |
| `RATE_LIMIT_LOGIN_WINDOW_MS` | No | Ventana (ms) del rate limit de login. |
| `RATE_LIMIT_LOGIN_MAX` | No | Máximo de intentos en esa ventana (login). |
| `RATE_LIMIT_API_WINDOW_MS` | No | Ventana (ms) del rate limit general de API. |
| `RATE_LIMIT_API_MAX` | No | Máximo de peticiones por ventana (API); en producción el default lógico es más bajo que en desarrollo. |
| `RATE_LIMIT_STRICT_WINDOW_MS` | No | Ventana para rutas con límite estricto (pedidos públicos, checkout). |
| `RATE_LIMIT_STRICT_MAX` | No | Máximo bajo límite estricto. |
| `RATE_LIMIT_DEV_LOCALHOST_MAX` | No | Suelo alto de peticiones para IP localhost en desarrollo (mezcla con otros límites). |
| `ADMIN_SESSION_COOKIE_*` | No | Nombre, `path`, `domain`, `sameSite` de la cookie de sesión admin (JWT httpOnly). Ver `.env.example`. |
| `CLIENT_SESSION_COOKIE_*` | No | Igual para la cookie de sesión de cliente tienda. |
| `COOKIE_SECURE` | No | Si es `true`, fuerza cookie `Secure` aunque no sea `production` (útil detrás de HTTPS en staging). |

---

## Ejemplo de `.env.example`

El repositorio ya incluye `.env.example`. Referencia equivalente para documentación:

```env
# OA! backend - copiar a .env y ajustar (NO subir .env al repo)

# Servidor
PORT=4000
NODE_ENV=development

# Base de datos (MySQL)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_DATABASE=sistema_oa
DB_PORT=3306

# JWT (mínimo 32 caracteres; obligatorio para arrancar)
JWT_SECRET=change_me_min_32_chars_long_secret_key_here!!

# CORS (origen principal del frontend + extras separados por coma)
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=

# Cookies de sesión JWT (httpOnly). Opcional: ADMIN_SESSION_COOKIE_NAME, ADMIN_SESSION_COOKIE_SAMESITE (lax|strict|none), path, domain; CLIENT_SESSION_COOKIE_*; COOKIE_SECURE=true

# Rate limiting (opcional; descomentar para override)
# RATE_LIMIT_LOGIN_WINDOW_MS=900000
# RATE_LIMIT_LOGIN_MAX=5
# RATE_LIMIT_API_WINDOW_MS=60000
# RATE_LIMIT_API_MAX=100
# RATE_LIMIT_STRICT_WINDOW_MS=60000
# RATE_LIMIT_STRICT_MAX=10
# RATE_LIMIT_DEV_LOCALHOST_MAX=10000
```

---

## Scripts disponibles

Definidos en `package.json`:

| Script | Comando | Uso |
|--------|---------|-----|
| `start` | `node server.js` | Arranque en modo producción (sin recarga automática). |
| `dev` | `nodemon server.js` | Desarrollo con reinicio al cambiar archivos. |
| `test` | `jest --verbose` | Ejecutar tests con Jest. |
| `test:watch` | `jest --watch` | Jest en modo observación. |

**Nota:** en el árbol actual del proyecto **no hay archivos de test** (`*.test.js` / `describe`); los scripts Jest están listos para cuando se agreguen pruebas.

---

## Estructura del proyecto

```
oa_backend/
├── config/           # Pool MySQL, JWT (assert), constantes
├── controllers/      # Orquestación HTTP y lógica de negocio
├── middlewares/      # Sesión JWT (cookies + Bearer), roles, rate limit, Zod, errores
├── routes/           # Definición de rutas Express
├── services/         # Pagos, notificaciones, pricing (algunos stubs)
├── repositories/     # Acceso a datos donde aplica
├── validators/       # Esquemas Zod
├── utils/            # Helpers
├── scripts/
│   ├── schema.sql    # Esquema de referencia MySQL + seed mínimo de admin
│   └── migrations/   # SQL opcional (legacy)
├── docs/
│   └── ARCHITECTURE.md
├── server.js         # Entrada de la aplicación
├── package.json
└── .env.example
```

Para más detalle de capas y convenciones, ver `docs/ARCHITECTURE.md`.

---

## Autenticación (`/auth`)

El sistema distingue **dos tablas** de identidad (decisión de dominio): **`usuarios`** (equipo / panel, rol `ADMIN`) y **`clientes`** (cuenta de tienda). El **login es único** desde la perspectiva del usuario: un solo `POST /auth/login` con `email` y `password`; el backend resuelve primero si el email corresponde a un **administrador activo** (`usuarios` + `rol === ADMIN`) y, si no aplica, valida contra **`clientes`**.

| Método y ruta | Descripción |
|---------------|-------------|
| `POST /auth/login` | Credenciales unificadas. Respuesta JSON `{ ok, expiresIn, usuario }` **sin token en el cuerpo**. Se fija la cookie de sesión que corresponde: admin (`oa_admin_token` por defecto) o cliente (`oa_client_token` por defecto). Antes se limpian ambas cookies para evitar sesiones cruzadas. |
| `POST /auth/logout` | Borra **ambas** cookies de sesión (admin y cliente). |
| `GET /auth/me` | Sesión actual: acepta `Authorization: Bearer`, luego cookie admin, luego cookie cliente. Respuesta `{ ok, usuario }` con campos acotados; `usuario.origen` es `ADMIN` (sesión desde `usuarios`) o `CLIENTE` (desde `clientes`); `usuario.rol` refleja el rol en BD o `CLIENTE` para la tabla clientes. |
| `POST /auth/register` | Alta en **`clientes`**. Body tipo registro + `useCookie` opcional (default `false`): con `true`, JWT solo en cookie cliente; con `false`, incluye `token` en JSON. |
| `POST /clientes/register` | **Compatibilidad** con clientes que ya integraron esta ruta; mismo flujo que registro en `clientes`, con `useCookie` por defecto `true`. **Login, logout y “me”** deben usar **`/auth/*`**. |

**Errores habituales (JSON):** credenciales inválidas `401` / `INVALID_CREDENTIALS`; cuenta inactiva admin `403` / `USER_INACTIVE`; cliente inactivo `403` / `CLIENT_INACTIVE`; sin sesión `401` / `NO_SESSION`.

**Frontend:** las peticiones autenticadas por cookie deben ir con **`credentials: 'include'`** (fetch) o equivalente en Axios. CORS del servidor ya usa `credentials: true`.

**Variables de entorno** opcionales para cookies: nombres, `path`, `domain`, `sameSite`, y `COOKIE_SECURE=true` para forzar `Secure` fuera de producción. Ver comentarios en `.env.example`.

**Request autenticado:** los middlewares adjuntan **`req.auth`** (`origen`, `id`, `email`, `rol`, …) y, según el caso, `req.usuario` / `req.cliente` y `req.user` (alias legado interno).

---

## Módulos o endpoints principales

Prefijo base: raíz del servidor (ej. `http://localhost:4000`). Rutas montadas en `server.js`:

| Prefijo | Audiencia | Resumen |
|---------|-----------|---------|
| `/auth` | Pública / sesión | `POST /register`, `POST /login`, `POST /logout`, `GET /me` (ver sección anterior). |
| `/clientes` | Pública | Solo `POST /register` (legado; preferir `/auth/register`). |
| `/users` | Admin (sesión + rol) | CRUD de usuarios. |
| `/categories` | Admin | CRUD de categorías. |
| `/products` | Admin | CRUD de productos; campo opcional `imagen_url` (URL). |
| `/promotions` | Admin | CRUD de promociones. |
| `/coupons` | Admin | CRUD de cupones. |
| `/orders` | Cliente + admin | `GET /me` (historial del cliente autenticado por cookie/Bearer cliente); listado y detalle admin; `PATCH /:id/status` (admin). |
| `/public` | Pública | Catálogo: categorías, productos, promociones activas; `POST /coupons/validate`; `POST /orders` (si hay cookies de sesión válidas, puede asociar `usuario_id` / `cliente_id` al pedido); `POST /checkout/preference` (501); `POST /checkout/webhook` (stub 200). |
| `/admin` | Admin | `GET /dashboard`, `GET/PUT /settings`; `GET/POST/PUT/PATCH/DELETE /categorias` (ABM categorías, `imagen_url`). |
| `/health` | Pública | `GET /` — estado, uptime, memoria, ping a BD. |

**Roles en código:** `ADMIN` y `CLIENTE` (`config/constants.js`). El middleware `requireAdmin` exige rol `ADMIN` en base de datos.

---

## Base de datos

- **Motor:** MySQL **8+** recomendado (`scripts/schema.sql` usa `utf8mb4` / `utf8mb4_unicode_ci`).
- **Conexión:** pool en `config/database.js` con `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`, `DB_PORT`.
- **Inicialización:** ejecutar `scripts/schema.sql` (crea `sistema_oa` si no existe, tablas principales: usuarios, categorías, productos, promociones, cupones, pedidos, detalle, configuración).
- **Seed:** el script inserta un usuario administrador de ejemplo (`admin@oa.com`) con `password_hash` ya hasheado. **En producción** rotá credenciales y no asumas contraseñas por defecto sin verificación interna.
- **No hay migraciones automáticas** tipo Knex/TypeORM: solo SQL manual en `scripts/`.

---

## Ejecución en desarrollo

1. MySQL levantado y esquema aplicado.
2. `.env` configurado (especialmente `JWT_SECRET` ≥ 32 caracteres y `DB_*`).
3. En la raíz del proyecto:

   ```bash
   npm run dev
   ```

4. Comprobar:

   ```bash
   curl http://localhost:4000/health
   ```

   Deberías ver `status: "healthy"` y datos de la base si la conexión es correcta.

En modo `NODE_ENV=test`, Morgan no se registra (útil si se ejecutan tests con Supertest importando la app).

---

## Consideraciones de seguridad

- **Nunca commitear `.env`**; rotar `JWT_SECRET` y credenciales de BD si se filtran.
- **Helmet** y límites de tamaño de cuerpo reducen superficie de ataque básica.
- **Rate limiting** en login, API general y rutas sensibles (pedidos/checkout públicos).
- **JWT:** sesión principal en **cookies httpOnly** (`config/authCookie.js`); la cabecera **`Authorization: Bearer`** sigue soportada para APIs o herramientas (mismo secreto `JWT_SECRET`). La expiración del access token es mayor en `development` (2h) que en el resto (1h), alineada con `ACCESS_TOKEN_MAX_AGE_MS` en `config/constants.js`.
- **Login unificado** no devuelve el token en el cuerpo de la respuesta: reduce riesgo de filtrado por logs del cliente; el frontend debe confiar en la cookie o, si usás Bearer, obtener el token por otro canal solo en flujos que lo requieran.
- **CORS** restrictivo fuera de desarrollo: configurá `FRONTEND_URL` y `ALLOWED_ORIGINS` en producción; el cliente debe enviar **`credentials: true`** si usa cookies de sesión.
- Imágenes: el API solo valida y guarda **URLs** (`imagen_url`); no acepta multipart de imágenes en el servidor.

---

## Problemas comunes / troubleshooting

| Síntoma | Posible causa |
|---------|----------------|
| El proceso sale al iniciar con error de `JWT_SECRET` | Secreto ausente o con menos de 32 caracteres (`config/jwt.js`). |
| `Not allowed by CORS` | Origen del navegador no está en la lista; en prod configurá `FRONTEND_URL` / `ALLOWED_ORIGINS`. |
| Login OK pero rutas siguen 401 | Olvidaste `credentials: 'include'` en el fetch/axios, o dominio/path de cookie no coincide con el del frontend. |
| Errores de conexión a MySQL | `DB_*` incorrectos, MySQL caído, o base/tabla inexistente. Revisar logs `[DB]`. |
| Validación de `imagen_url` | Debe ser URL válida y ≤ 500 caracteres, u omitirse / `null`. |
| `501` en checkout | Comportamiento esperado: `PaymentService` / preferencia de pago **no implementados**. |
| Tests no hacen nada útil | Aún no hay suites en el repo; conviene agregar tests bajo convención Jest. |

---

## Posibles mejoras futuras

- Integración real de **pagos** (preferencia + webhooks) en `PaymentService` y `checkoutController`.
- **Notificaciones** (email/SMS/push) sustituyendo stubs en `NotificationService`.
- **Puntos / loyalty**, **delivery en tiempo real** (p. ej. WebSockets o SSE), y ampliación del modelo de pedidos.
- **Migraciones** versionadas y/o seeds reproducibles fuera del SQL monolítico.
- Cobertura de **tests** automatizados (API + regresión).
- Despliegue documentado (Docker, variables en el proveedor, healthchecks).

---

## Autor / notas finales

Proyecto **OA!** — backend mantenido como parte del sistema del local. Para decisiones de arquitectura y convenciones adicionales, consultá `docs/ARCHITECTURE.md`.

**Inconsistencia detectada:** en `docs/ARCHITECTURE.md` se mencionan roles `MANAGER` y `CUSTOMER`, mientras que el código y `scripts/schema.sql` usan `ADMIN` y `CLIENTE`. Conviene alinear la documentación interna con el código para evitar confusiones al implementar autorizaciones.

---

*Última revisión del README alineada con el código del repositorio (Express, MySQL, autenticación unificada en `/auth`, cookies de sesión, variables de entorno y rutas actuales).*
