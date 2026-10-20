import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { prisma } from "../../config/db.js";
import { redis } from "../../config/redis.js";
import { stripe } from "../../config/stripe.js";
import { getAuthToken } from "../../tests/helpers.js";



const isoDay = (daysFromNow: number) => {
    const d = new Date();
    d.setUTCHours(14, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + daysFromNow);
    return d.toISOString();
};

async function createRoom(managerId: string) {
    const hotel = await prisma.hotel.create({
        data: { name: "test", address: "assuit", managerId },
    });
    const roomType = await prisma.roomType.create({
        data: { title: "doublex", pricePerNight: 100, hotelId: hotel.id, capacity: 2 },
    });
    return prisma.room.create({
        data: { roomNumber: "A10", isAvailable: true, roomTypeId: roomType.id },
    });
}


async function createBooking(
    userId: string,
    status: "PENDING" | "CONFIRMED" | "CANCELLED" = "PENDING",
) {
    const room = await createRoom(userId);
    return prisma.booking.create({
        data: {
            roomId: room.id,
            userId,
            checkIn: new Date(isoDay(10)),
            checkOut: new Date(isoDay(15)),
            totalPrice: 500,
            status,
        },
    });
}


function signedWebhook(event: object) {
    const payload = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: process.env.STRIPE_WEBHOOK_SECRET as string,
    });
    return { payload, signature };
}


const completedEvent = (bookingId: string) => ({
    id: "evt_test_1",
    object: "event",
    type: "checkout.session.completed",
    data: {
        object: {
            id: "cs_test_1",
            object: "checkout.session",
            client_reference_id: bookingId,
            payment_status: "paid",
        },
    },
});


const sendWebhook = (payload: string, signature: string) =>
    request(app)
        .post("/api/payments/webhook")
        .set("stripe-signature", signature)
        .set("Content-Type", "application/json")
        .send(payload);



describe("Stripe Route", () => {
    beforeEach(async () => {
        await prisma.booking.deleteMany();
        await prisma.room.deleteMany();
        await prisma.roomType.deleteMany();
        await prisma.hotel.deleteMany();
        await prisma.user.deleteMany();
        await redis.flushall();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    afterAll(async () => {
        if (redis.status === "ready") {
            await redis.quit();
        }
    });

  
    describe("POST /api/payments/create-checkout-session/:bookingId", () => {
        it("should return the checkout url and send Stripe the correct amount in cents", async () => {
            const { token, managerId } = await getAuthToken("USER");
            const booking = await createBooking(managerId);
            const createSpy = vi
                .spyOn(stripe.checkout.sessions, "create")
                .mockResolvedValue({
                    id: "cs_test_123",
                    url: "https://checkout.stripe.com/pay/cs_test_123",
                } as any) as any;

            const response = await request(app)
                .post(`/api/payments/create-checkout-session/${booking.id}`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.url).toBe("https://checkout.stripe.com/pay/cs_test_123");

            expect(createSpy).toHaveBeenCalledTimes(1);
            const args = createSpy.mock.calls[0][0] as any;
            expect(args.client_reference_id).toBe(booking.id);
            expect(args.line_items[0].price_data.unit_amount).toBe(50000); // 500 × 100
            expect(args.line_items[0].price_data.currency).toBe("usd");
        });

        it("should return 404 and NOT call Stripe when the booking belongs to another user", async () => {
            const { managerId } = await getAuthToken("USER");
            const booking = await createBooking(managerId);
            const { token: otherToken } = await getAuthToken("USER");
            const createSpy = vi
                .spyOn(stripe.checkout.sessions, "create")
                .mockResolvedValue({} as any);

            const response = await request(app)
                .post(`/api/payments/create-checkout-session/${booking.id}`)
                .set("Authorization", `Bearer ${otherToken}`);

            expect(response.status).toBe(404);
            expect(createSpy).not.toHaveBeenCalled();
        });

        it("should return 404 and NOT call Stripe when the booking is not PENDING", async () => {
            const { token, managerId } = await getAuthToken("USER");
            const booking = await createBooking(managerId, "CONFIRMED");
            const createSpy = vi
                .spyOn(stripe.checkout.sessions, "create")
                .mockResolvedValue({} as any);

            const response = await request(app)
                .post(`/api/payments/create-checkout-session/${booking.id}`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(404);
            expect(createSpy).not.toHaveBeenCalled();
        });

        it("should return 401 when no token is provided", async () => {
            const response = await request(app).post(
                "/api/payments/create-checkout-session/11111111-1111-4111-8111-111111111111",
            );
            expect(response.status).toBe(401);
        });
    });

   
    describe("POST /api/payments/webhook", () => {
        it("should return 400 if the stripe-signature header is missing", async () => {
            const response = await request(app)
                .post("/api/payments/webhook")
                .set("Content-Type", "application/json")
                .send(JSON.stringify(completedEvent("any-id")));

            expect(response.status).toBe(400);
        });

        it("should return 400 and not touch the booking when the signature is invalid", async () => {
            const { managerId } = await getAuthToken("USER");
            const booking = await createBooking(managerId);
            const { payload } = signedWebhook(completedEvent(booking.id));

            const response = await sendWebhook(payload, "t=1234567890,v1=invalid_signature");

            expect(response.status).toBe(400);
            const inDb = await prisma.booking.findUnique({ where: { id: booking.id } });
            expect(inDb?.status).toBe("PENDING");
        });

        it("should confirm the booking when a valid checkout.session.completed event arrives", async () => {
            const { managerId } = await getAuthToken("USER");
            const booking = await createBooking(managerId);
            const { payload, signature } = signedWebhook(completedEvent(booking.id));

            const response = await sendWebhook(payload, signature);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ received: true });
            const inDb = await prisma.booking.findUnique({ where: { id: booking.id } });
            expect(inDb?.status).toBe("CONFIRMED");
        });

        it("should return 200 and change nothing for event types it does not handle", async () => {
            const { managerId } = await getAuthToken("USER");
            const booking = await createBooking(managerId);
            const { payload, signature } = signedWebhook({
                id: "evt_test_2",
                object: "event",
                type: "payment_intent.created",
                data: { object: { client_reference_id: booking.id } },
            });

            const response = await sendWebhook(payload, signature);

            expect(response.status).toBe(200);
            const inDb = await prisma.booking.findUnique({ where: { id: booking.id } });
            expect(inDb?.status).toBe("PENDING");
        });

        it("should handle the same event delivered twice (Stripe retries)", async () => {
            const { managerId } = await getAuthToken("USER");
            const booking = await createBooking(managerId);
            const { payload, signature } = signedWebhook(completedEvent(booking.id));

            const first = await sendWebhook(payload, signature);
            const second = await sendWebhook(payload, signature);

            expect(first.status).toBe(200);
            expect(second.status).toBe(200);
            const inDb = await prisma.booking.findUnique({ where: { id: booking.id } });
            expect(inDb?.status).toBe("CONFIRMED");
        });

        
        it("should refresh the cached my-bookings list after payment (cache invalidation)", async () => {
            const { token, managerId } = await getAuthToken("USER");
            const booking = await createBooking(managerId);

            const before = await request(app)
                .get("/api/bookings/my-bookings")
                .set("Authorization", `Bearer ${token}`);
            expect(before.body.data[0].status).toBe("PENDING");

            const { payload, signature } = signedWebhook(completedEvent(booking.id));
            await sendWebhook(payload, signature);

            const after = await request(app)
                .get("/api/bookings/my-bookings")
                .set("Authorization", `Bearer ${token}`);
            expect(after.body.data[0].status).toBe("CONFIRMED");
        });

        
        it("should NOT confirm a booking that was already CANCELLED", async () => {
            const { managerId } = await getAuthToken("USER");
            const booking = await createBooking(managerId, "CANCELLED");
            const { payload, signature } = signedWebhook(completedEvent(booking.id));

            const response = await sendWebhook(payload, signature);

            expect(response.status).toBe(200); 
            const inDb = await prisma.booking.findUnique({ where: { id: booking.id } });
            expect(inDb?.status).toBe("CANCELLED");
        });
    });
});