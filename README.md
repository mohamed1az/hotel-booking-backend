#  Hotel Booking API

A production-style REST API for a hotel booking platform, built with **Node.js, TypeScript, Express 5, Prisma & PostgreSQL**.
It covers the full flow: authentication → hotels → room types → rooms → bookings → Stripe payments, with Redis caching, distributed locking and rate limiting on top.

---

##  Features

- **JWT Authentication** — register / login with hashed passwords (bcrypt)
- **Role-Based Access Control** — `ADMIN`, `HOTEL_MANAGER` and regular users via a `restrictTo` middleware
- **Hotels & Rooms Management** — full CRUD for hotels, room types and individual rooms
- **Image Uploads** — multipart uploads handled by Multer, served from `/uploads`
- **Booking Engine** — create bookings, list your own bookings, view one, cancel
- **Race-Condition Safe** — Redlock distributed locks prevent double-booking the same room
- **Stripe Payments** — Checkout Session creation + webhook handling to confirm payments
- **Redis Caching** — a small `Cache` helper with `get / set / delPattern / remember` (cache-aside pattern)
- **Rate Limiting** — global limiter + a stricter limiter on auth routes, backed by Redis
- **Validation** — every request body validated with Zod schemas through a `validate` middleware
- **Centralized Error Handling** — custom `AppError` class + global error middleware + `asyncHandler` wrapper
- **Fully Dockerized** — one command brings up the API, PostgreSQL and Redis

---

##  Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Language | TypeScript |
| Framework | Express 5 |
| ORM | Prisma |
| Database | PostgreSQL 15 |
| Cache / Locks | Redis 7 (ioredis, redlock, rate-limit-redis) |
| Payments | Stripe |
| Validation | Zod |
| Auth | JWT + bcrypt |
| Uploads | Multer |
| Container | Docker & Docker Compose |

---

##  Project Structure

```
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/                 # db / redis / stripe configuration
│   ├── middlewares/
│   │   ├── asyncHandler.ts     # async wrapper, no try/catch everywhere
│   │   ├── errorHandler.ts     # global error handler
│   │   ├── protect.ts          # JWT auth guard
│   │   ├── rateLimiter.ts      # global + auth limiters
│   │   ├── restrictTo.ts       # role guard
│   │   ├── upload.ts           # multer config
│   │   └── validator.ts        # zod validation middleware
│   ├── modules/
│   │   ├── auth/               # controller · routes · service · validator
│   │   ├── hotel/
│   │   ├── RoomType/
│   │   ├── room/
│   │   ├── booking/
│   │   └── stripe/
│   ├── postman/
│   │   └── collection.postman_collection.json
│   ├── types/
│   ├── utils/
│   │   ├── AppError.ts
│   │   └── cache.ts
│   ├── app.ts                  # express app + middleware + routes
│   └── server.ts               # entry point
├── uploads/
├── Dockerfile
├── docker-compose.yml
└── package.json
```

Each module follows the same layering:

```
routes  →  validator  →  controller  →  service  →  prisma
```

---

##  Getting Started

### Prerequisites

- Docker & Docker Compose (recommended)
- or Node.js 20+, PostgreSQL 15+ and Redis 7+ installed locally

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>/backend
```

### 2. Create a `.env` file

```env
PORT=5400
DATABASE_URL="postgresql://postgres:password123@localhost:5432/hotel_db?schema=public"
REDIS_URL="redis://localhost:6379"

JWT_SECRET="your_jwt_secret"
JWT_EXPIRES_IN="7d"

STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"

FRONTEND_URL="http://localhost:3000"
```

>  Never commit your real `.env` — it is already listed in `.gitignore`.

### 3. Run with Docker (recommended)

```bash
docker compose up --build
```

This starts three containers:

| Service | Container | Port |
|---|---|---|
| API | `hotel_app` | `5500` → `5400` |
| PostgreSQL | `postgres_db` | `5432` |
| Redis | `redis_cache` | `6379` |

Then apply the database schema:

```bash
docker compose exec app npx prisma migrate deploy
```

API is now available at **http://localhost:5500**

### 4. Or run locally without Docker

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

API runs at **http://localhost:5400**

---

##  Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start in watch mode with `tsx` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run prisma:migrate` | Create & apply a migration |
| `npm run prisma:studio` | Open Prisma Studio |

---

##  API Endpoints

Base URL: `http://localhost:5500`

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Create a new account |
| `POST` | `/login` | Public | Log in and receive a JWT |

### Hotels — `/api/hotel`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/` | Admin | Add a new hotel (with images) |
| `GET` | `/` | Public | List all hotels |
| `GET` | `/:hotelId` | Protected | Get a single hotel |
| `PUT` | `/:hotelId` | Admin / Manager | Update a hotel |
| `DELETE` | `/:hotelId` | Admin | Delete a hotel |

### Room Types — `/api/room-types`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/hotel/:hotelId` | Admin / Manager | Create a room type (up to 5 images) |
| `GET` | `/hotel/:hotelId` | Public | List room types of a hotel |
| `GET` | `/:roomTypeId` | Public | Get a single room type |
| `PUT` | `/:roomTypeId` | Admin / Manager | Update a room type |
| `DELETE` | `/:roomTypeId` | Admin / Manager | Delete a room type |

### Rooms — `/api/rooms`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/:roomTypeId` | Admin / Manager | Add a room to a room type |
| `GET` | `/room-type/:roomTypeId` | Public | List rooms of a room type |
| `GET` | `/:roomId` | Public | Get a single room |
| `PUT` | `/:roomId` | Admin / Manager | Update a room |
| `DELETE` | `/:roomId` | Admin / Manager | Delete a room |

### Bookings — `/api/bookings`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/` | Protected | Create a booking |
| `GET` | `/my-bookings` | Protected | List the current user's bookings |
| `GET` | `/:bookingId` | Protected | Get a single booking |
| `PATCH` | `/:bookingId` | Protected | Cancel a booking |

### Payments — `/api/payments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/create-checkout-session/:bookingId` | Protected | Create a Stripe Checkout Session |
| `POST` | `/webhook` | Stripe | Stripe webhook (raw body) |

> A ready-to-import **Postman collection** lives at `src/postman/collection.postman_collection.json`.

---

##  Authentication

Protected routes expect a Bearer token:

```http
Authorization: Bearer <your_jwt_token>
```

---

##  Testing Stripe Webhooks Locally

```bash
stripe login
stripe listen --forward-to localhost:5500/api/payments/webhook
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.

The webhook route is mounted **before** `express.json()` so Stripe receives the raw body required for signature verification.

---

##  Implementation Notes

- **Caching** — read-heavy endpoints use `Cache.remember(key, ttl, fetchFn)`; writes invalidate related keys with `Cache.delPattern`.
- **Locking** — booking creation acquires a Redlock lock on the room/date range so two concurrent requests can't book the same room.
- **Errors** — throw `new AppError(message, statusCode)` anywhere; `asyncHandler` forwards it to the global `errorHandler`, which returns a consistent JSON shape.
- **Layering** — controllers stay thin: they parse the request and delegate all business logic to services.

---

##  Roadmap

- [ ] Unit & integration tests (Jest + Supertest)
- [ ] Swagger / OpenAPI documentation
- [ ] Email notifications on booking confirmation
- [ ] Reviews & ratings module
- [ ] CI/CD pipeline with GitHub Actions
- [ ] Frontend client


