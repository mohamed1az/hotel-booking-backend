# Hotel Booking API

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![Tested with Vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

A production-style REST API for a hotel booking platform, built with **Node.js, TypeScript, Express 5, Prisma & PostgreSQL**.
It covers the full flow: authentication → hotels → room types → rooms → bookings → Stripe payments, with Redis caching, distributed locking and rate limiting on top, and an integration test suite of 84 tests.

---

## Features

- **JWT Authentication** — register / login with hashed passwords (bcrypt)
- **Role-Based Access Control** — `ADMIN`, `HOTEL_MANAGER` and regular users via a `restrictTo` middleware, plus ownership checks (a manager can only change their own hotels)
- **Hotels & Rooms Management** — full CRUD for hotels, room types and individual rooms
- **Availability Search** — filter hotels and room types by check-in / check-out dates
- **Image Uploads** — multipart uploads handled by Multer, served from `/uploads`
- **Booking Engine** — create bookings, list your own bookings, view one, cancel (not allowed within 48 hours of check-in)
- **Race-Condition Safe** — Redlock distributed locks prevent double-booking the same room
- **Server-Side Pricing** — the total price and the booking owner are computed on the server, never read from the request body
- **Stripe Payments** — Checkout Session creation + a signature-verified webhook that confirms payments
- **Redis Caching** — a small `Cache` helper with `get / set / delPattern / remember` (cache-aside pattern)
- **Rate Limiting** — global limiter + a stricter limiter on auth routes, backed by Redis
- **Validation** — every request body validated with Zod schemas through a `validate` middleware
- **Centralized Error Handling** — custom `AppError` class + global error middleware + `asyncHandler` wrapper
- **Automated Tests** — 84 integration tests with Vitest and Supertest (see [Running the Tests](#running-the-tests))
- **Fully Dockerized** — one command brings up the API, PostgreSQL and Redis

---

## Tech Stack

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
| Testing | Vitest + Supertest |
| Container | Docker & Docker Compose |

---

## Project Structure

```
backend/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── config/                 # db / redis / redlock / stripe configuration
│   ├── middlewares/
│   │   ├── asyncHandler.ts     # async wrapper, no try/catch everywhere
│   │   ├── errorHandler.ts     # global error handler
│   │   ├── protect.ts          # JWT auth guard
│   │   ├── rateLimiter.ts      # global + auth limiters
│   │   ├── restrictTo.ts       # role guard
│   │   ├── upload.ts           # multer config
│   │   └── validator.ts        # zod validation middleware
│   ├── modules/                # each module has a *.routes.test.ts next to its routes
│   │   ├── auth/               # controller · routes · service · validator
│   │   ├── hotel/
│   │   ├── RoomType/
│   │   ├── room/
│   │   ├── booking/
│   │   └── stripe/
│   ├── postman/
│   │   └── collection.postman_collection.json
│   ├── tests/
│   │   └── helpers.ts          # getAuthToken(): creates a user with a given role and logs in
│   ├── types/
│   ├── utils/
│   │   ├── AppError.ts
│   │   └── cache.ts
│   ├── app.ts                  # express app + middleware + routes
│   └── server.ts               # entry point
├── uploads/
├── .env.example
├── .env.test.example
├── Dockerfile
├── docker-compose.yml
├── tsconfig.json
├── tsconfig.build.json         # production build (excludes tests)
├── vitest.config.ts
└── package.json
```

Each module follows the same layering:

```
routes  →  validator  →  controller  →  service  →  prisma
```

---

## Getting Started

### Prerequisites

- Docker & Docker Compose (recommended)
- or Node.js 20+, PostgreSQL 15+ and Redis 7+ installed locally

### 1. Clone the repository

```bash
git clone https://github.com/mohamed1az/hotel-booking-backend.git
cd hotel-booking-backend/backend
```

### 2. Create a `.env` file

Copy `.env.example` to `.env` and fill in your own values:

```bash
cp .env.example .env
```

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

> Never commit your real `.env` — it is already listed in `.gitignore`.

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

## Running the Tests

The suite is made of **integration tests**: every test sends real HTTP requests to the Express app with Supertest and talks to a real PostgreSQL and a real Redis. The only thing that is faked is Stripe, so no network calls and no real keys are needed (Stripe session creation is mocked, and webhook signatures are generated with Stripe's own test helper).

> The tests delete all rows from the database and run `FLUSHALL` on Redis before each test. Never point `.env.test` at a database or a Redis instance you care about.

### 1. Prepare the test environment

Copy the example file (all values are placeholders) and make sure `DATABASE_URL` points to a separate test database:

```bash
cp .env.test.example .env.test
```

Start PostgreSQL and Redis, then create the test database:

```bash
docker compose up -d postgres_db redis_cache
docker compose exec postgres_db psql -U postgres -c "CREATE DATABASE hotel_test_db;"
```

Apply the migrations to it:

```bash
# bash
DATABASE_URL="postgresql://postgres:password123@localhost:5432/hotel_test_db?schema=public" npx prisma migrate deploy
```

```powershell
# PowerShell
$env:DATABASE_URL="postgresql://postgres:password123@localhost:5432/hotel_test_db?schema=public"; npx prisma migrate deploy
```

### 2. Run

```bash
npm test                                  # whole suite
npx vitest run src/modules/booking        # a single module
```

Test files run one after another (not in parallel) because they share one database and one Redis instance.

### What is covered

| Module | Tests |
|---|---|
| Auth | 4 |
| Hotels | 14 |
| Room types | 18 |
| Rooms | 20 |
| Bookings | 17 |
| Stripe | 11 |
| **Total** | **84** |

- **Auth** — registration and login, duplicate emails, wrong credentials.
- **Access control** — role checks and ownership rules (`403`) on every write endpoint, including managers of other hotels and the admin override.
- **Bookings** — date-overlap rules, maintenance rooms, cancelled bookings freeing the room, the 48-hour cancellation rule, server-side price calculation, and visibility rules for a single booking.
- **Concurrency** — five users book the same room at the same moment and exactly one booking is created.
- **Caching** — cached lists and bookings are refreshed after writes, and permissions are still enforced when a booking is served from cache.
- **Stripe** — checkout amount sent in cents, other users' bookings never reach Stripe, webhook signature verification, repeated deliveries of the same event, and late payments never revive a cancelled booking.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start in watch mode with `tsx` |
| `npm run build` | Compile TypeScript to `dist/` (tests are excluded) |
| `npm start` | Run the compiled build |
| `npm test` | Run the test suite once with Vitest |
| `npm run prisma:migrate` | Create & apply a migration |
| `npm run prisma:studio` | Open Prisma Studio |

---

## API Endpoints

Base URL: `http://localhost:5500`

"Manager" means a `HOTEL_MANAGER` acting on their own hotel; an `ADMIN` can act on any hotel.

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Create a new account |
| `POST` | `/login` | Public | Log in and receive a JWT |

### Hotels — `/api/hotel`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/` | Admin / Manager | Add a new hotel (with images) |
| `GET` | `/` | Public | List hotels (paginated). Query: `page`, `limit`, `search`, and `checkIn` + `checkOut` to keep only hotels with a free room |
| `GET` | `/:hotelId` | Protected | Get a single hotel |
| `PUT` | `/:hotelId` | Admin / Manager | Update a hotel |
| `DELETE` | `/:hotelId` | Admin / Manager | Delete a hotel |

### Room Types — `/api/room-types`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/hotel/:hotelId` | Admin / Manager | Create a room type (up to 5 images) |
| `GET` | `/hotel/:hotelId` | Public | List room types of a hotel with available room counts (optional `checkIn` / `checkOut`) |
| `GET` | `/:roomTypeId` | Public | Get a single room type |
| `PUT` | `/:roomTypeId` | Admin / Manager | Update a room type |
| `DELETE` | `/:roomTypeId` | Admin / Manager | Delete a room type |

### Rooms — `/api/rooms`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/:roomTypeId` | Admin / Manager | Add a room to a room type |
| `GET` | `/room-type/:roomTypeId` | Public | List rooms of a room type (optional `isAvailable=true`) |
| `GET` | `/:roomId` | Public | Get a single room |
| `PUT` | `/:roomId` | Admin / Manager | Update a room |
| `DELETE` | `/:roomId` | Admin / Manager | Delete a room |

### Bookings — `/api/bookings`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/` | Protected | Create a booking (`roomId`, `checkIn`, `checkOut`); the price is calculated on the server |
| `GET` | `/my-bookings` | Protected | List the current user's bookings |
| `GET` | `/:bookingId` | Owner / hotel Manager / Admin | Get a single booking |
| `PATCH` | `/:bookingId` | Owner | Cancel a booking (not allowed within 48 hours of check-in) |

### Payments — `/api/payments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/create-checkout-session/:bookingId` | Owner | Create a Stripe Checkout Session for one of your `PENDING` bookings |
| `POST` | `/webhook` | Stripe | Stripe webhook (raw body, signature-verified); confirms the booking |

> A ready-to-import **Postman collection** lives at `src/postman/collection.postman_collection.json`.

---

## Authentication

Protected routes expect a Bearer token:

```http
Authorization: Bearer <your_jwt_token>
```

---

## Testing Stripe Webhooks Manually

The automated tests don't need this. To try the real flow against Stripe's test mode:

```bash
stripe login
stripe listen --forward-to localhost:5500/api/payments/webhook
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`, create a checkout session, and pay with the test card `4242 4242 4242 4242`.

The webhook route is mounted **before** `express.json()` so Stripe receives the raw body required for signature verification.

---

## Implementation Notes

- **Caching** — read-heavy endpoints use `Cache.remember(key, ttl, fetchFn)`; writes invalidate related keys with `Cache.del` and `Cache.delPattern`.
- **Locking** — booking creation acquires a Redlock lock on the room (`locks:room:<id>`) for the whole availability check and insert, so two concurrent requests can't book the same room. The lock is always released in a `finally` block, even when the booking fails.
- **Payments** — a booking is confirmed only by the signed webhook, never by the success redirect. The webhook moves a booking from `PENDING` to `CONFIRMED` only, so repeated or late events can't revive a cancelled booking.
- **Errors** — throw `new AppError(message, statusCode)` anywhere; `asyncHandler` forwards it to the global `errorHandler`, which returns a consistent JSON shape.
- **Layering** — controllers stay thin: they parse the request and delegate all business logic to services.

---

## Roadmap

- [x] Integration test suite with Vitest + Supertest (84 tests)
- [ ] Unit tests for services and validators
- [ ] CI pipeline with GitHub Actions (run the tests on every push)
- [ ] Expire unpaid `PENDING` bookings so abandoned checkouts release their rooms
- [ ] Swagger / OpenAPI documentation
- [ ] Email notifications on booking confirmation
- [ ] Reviews & ratings module
- [ ] Frontend client
