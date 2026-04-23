# OA! Backend — Architecture

Express 4 + MySQL (`mysql2/promise`). Layers: **routes** → **middlewares** (auth, rate limit, Zod validation) → **controllers** → **config/database** + **services** + **utils**.

## Layout

| Path | Role |
|------|------|
| `server.js` | App bootstrap, CORS, security headers, route mounts, shutdown |
| `config/` | Database pool, shared constants |
| `middlewares/` | JWT auth, roles, rate limiting, Zod wrappers, errors |
| `routes/` | HTTP wiring only |
| `controllers/` | Request/response orchestration and SQL (no ORM in v0) |
| `services/` | Cross-cutting or external integrations (payments, pricing, notifications) |
| `validators/` | Zod schemas per area |
| `utils/` | Pure helpers |
| `scripts/schema.sql` | Reference schema for local setup |

## Conventions

- **API language**: English for routes, JSON fields, and error `code` values.
- **Database**: `snake_case` columns; controllers map to camelCase in JSON where useful.
- **Auth**: Bearer JWT; roles `ADMIN`, `MANAGER`, `CUSTOMER`.
- **Logs**: prefix `[oa-api]` or `[DB]` for quick filtering.

## Public vs protected

- **`/public/*`**: catalog, coupon validation, guest checkout (no JWT).
- **`/auth/*`**, **`/orders` (staff)**, **`/admin/*`**, etc.: JWT + role checks as defined per route file.

## Route notes

- Customer order history: `GET /orders/me` (JWT).
- Imágenes de catálogo: el cliente sube a su proveedor (p. ej. Cloudinary) y envía la URL en `imagen_url` en POST/PUT de productos o categorías.
