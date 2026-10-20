import { prisma } from "../../config/db.js";
import { beforeEach, afterAll, it, expect, describe } from "vitest";
import request from "supertest";
import { getAuthToken } from "../../tests/helpers.js";
import app from "../../app.js";
import { redis } from "../../config/redis.js";

const isoDay = (daysFromNow: number) => {
    const d = new Date();
    d.setUTCHours(14, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + daysFromNow);
    return d.toISOString();
};

async function createRoom(managerId: string, isAvailable: boolean) {
    const hotel = await prisma.hotel.create({
        data: {
            name: "test",
            address: "assuit",
            managerId
        }
    });
    const roomType = await prisma.roomType.create({
        data: {
            title: "doublex",
            pricePerNight: 100,
            hotelId: hotel.id,
            capacity: 2
        }
    });
    const room = await prisma.room.create({
        data: {
            roomNumber: "A10",
            isAvailable,
            roomTypeId: roomType.id
        }
    });
    return room;
}

describe("BOOKING Route", () => {
    beforeEach(async () => {
        await prisma.booking.deleteMany();
        await prisma.room.deleteMany();
        await prisma.roomType.deleteMany();
        await prisma.hotel.deleteMany();
        await prisma.user.deleteMany();
        await redis.flushall();
    });

    afterAll(async () => {
        if (redis.status === 'ready') {
            await redis.quit();
        }
    });

    describe("POST /api/bookings", () => {
        it('should create Booking and return 201 when user authenticated', async () => {
            const { token, managerId } = await getAuthToken('USER');
            const room = await createRoom(managerId, true);
            const response = await request(app).post(`/api/bookings`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                roomId: room.id,
                checkIn: isoDay(10),
                checkOut: isoDay(15),
            });
            expect(response.status).toBe(201);
        });

        it("should return 400 if room is already booked for these dates (Overlap)", async () => {
            const { token, managerId } = await getAuthToken('USER');
            const room = await createRoom(managerId, true);
            await prisma.booking.create({
                data: {
                    roomId: room.id,
                    checkIn: new Date(isoDay(10)),
                    checkOut: new Date(isoDay(15)),
                    totalPrice: 500,
                    userId: managerId
                }
            })
            
            const response = await request(app).post(`/api/bookings`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                roomId: room.id,
                checkIn: isoDay(13),
                checkOut: isoDay(18),
            })

            expect(response.status).toBe(400);
        });

        it("should handle race condition correctly and allow only ONE booking out of 5 parallel requests", async () => {
            const { managerId } = await getAuthToken('HOTEL_MANAGER');
            const room = await createRoom(managerId, true);
            const users = [];
            for (let i = 0; i < 5; i++) {
                const u = await getAuthToken('USER');
                users.push(u);
            }
            const bookingPayload = {
                roomId: room.id,
                checkIn: isoDay(10),
                checkOut: isoDay(14)
            };
            const responses = await Promise.all(
                users.map(u => 
                    request(app)
                        .post('/api/bookings')
                        .set('Authorization', `Bearer ${u.token}`)
                        .send(bookingPayload)
                )
            );
            const successfulBookings = responses.filter(res => res.status === 201);
            const failedBookings = responses.filter(res => res.status === 400 || res.status === 429);
            expect(successfulBookings.length).toBe(1);
            expect(failedBookings.length).toBe(4);
            const dbBookingsCount = await prisma.booking.count({
                where: { roomId: room.id }
            });
            expect(dbBookingsCount).toBe(1);
        });

        it('should return 400 if Room is not available (Maintenance)', async () => {
            const { token, managerId } = await getAuthToken('USER');
            const room = await createRoom(managerId, false);

            const response = await request(app).post(`/api/bookings`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                roomId: room.id,
                checkIn: isoDay(10),
                checkOut: isoDay(15),
            });
            expect(response.status).toBe(400);
        });

        it('should return 404 if Room not found', async () => {
            const { token } = await getAuthToken('USER');
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response = await request(app).post(`/api/bookings`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                roomId: fakeUUID,
                checkIn: isoDay(10),
                checkOut: isoDay(15),
            });
            expect(response.status).toBe(404);
        });

        it('should return 401 if no token is provided', async () => {
            const { managerId } = await getAuthToken('USER');
            const room = await createRoom(managerId, true);
            const response = await request(app).post(`/api/bookings`)
            .send({
                roomId: room.id,
                checkIn: isoDay(10),
                checkOut: isoDay(15),
            });
            expect(response.status).toBe(401);
        });

        it('should return 400 and create nothing if checkOut is before checkIn', async () => {
            const { token, managerId } = await getAuthToken('USER');
            const room = await createRoom(managerId, true);
            const response = await request(app).post(`/api/bookings`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                roomId: room.id,
                checkIn: isoDay(15),
                checkOut: isoDay(10),
            });
            expect(response.status).toBe(400);
            expect(await prisma.booking.count()).toBe(0);
        });

        it('should not be blocked by a CANCELLED booking on the same dates', async () => {
            const { token, managerId } = await getAuthToken('USER');
            const room = await createRoom(managerId, true);
            await prisma.booking.create({
                data: {
                    roomId: room.id,
                    checkIn: new Date(isoDay(10)),
                    checkOut: new Date(isoDay(15)),
                    totalPrice: 500,
                    userId: managerId,
                    status: 'CANCELLED'
                }
            })

            const response = await request(app).post(`/api/bookings`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                roomId: room.id,
                checkIn: isoDay(10),
                checkOut: isoDay(15),
            });
            expect(response.status).toBe(201);
        });
    });

    describe("GET /api/bookings/:bookingId", () => {
        it('should return booking if is authenticated user and own this booking', async () => {
            const { token, managerId } = await getAuthToken('USER');
            const room = await createRoom(managerId, true)
            const booking = await prisma.booking.create({
                data: {
                    roomId: room.id,
                    checkIn: new Date(isoDay(10)),
                    checkOut: new Date(isoDay(15)),
                    totalPrice: 500,
                    userId: managerId,
                }
            })
            
            const response = await request(app).get(`/api/bookings/${booking.id}`)
            .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
        });

        it('should return 403 if not own this booking', async () => {
            const { managerId } = await getAuthToken('USER');
            const room = await createRoom(managerId, true)
            const booking = await prisma.booking.create({
                data: {
                    roomId: room.id,
                    checkIn: new Date(isoDay(10)),
                    checkOut: new Date(isoDay(15)), 
                    totalPrice: 500,
                    userId: managerId,
                }
            })
            const { token: otherToken } = await getAuthToken('USER')
            const response = await request(app)
            .get(`/api/bookings/${booking.id}`)
            .set('Authorization', `Bearer ${otherToken}`);
            expect(response.status).toBe(403);
        });

         it("should return 200 ok if user role is Hotel_Manager of this hotel",async()=>{
            const {token,managerId} = await getAuthToken('HOTEL_MANAGER');
            const room = await createRoom(managerId,true);
            const guest = await getAuthToken('USER');
            const booking = await prisma.booking.create({
                data:{
                    roomId:room.id,
                    checkIn:new Date(isoDay(10)),
                    checkOut:new Date(isoDay(15)), 
                    totalPrice:500,
                    userId:guest.managerId,
                }
            });
            const response=await request(app).get(`/api/bookings/${booking.id}`)
            .set('Authorization',`Bearer ${token}`);
            expect(response.status).toBe(200);
        })

        it("should return 403 if user is Hotel_Manager of a different hotel",async()=>{
            const {managerId} = await getAuthToken('HOTEL_MANAGER');
            const room = await createRoom(managerId,true);
            const guest = await getAuthToken('USER');
            const booking = await prisma.booking.create({
                data:{
                    roomId:room.id,
                    checkIn:new Date(isoDay(10)),
                    checkOut:new Date(isoDay(15)), 
                    totalPrice:500,
                    userId:guest.managerId,
                }
            });
            const {token:otherManagerToken} = await getAuthToken('HOTEL_MANAGER');
            const response=await request(app).get(`/api/bookings/${booking.id}`)
            .set('Authorization',`Bearer ${otherManagerToken}`);
            expect(response.status).toBe(403);
        })
 

        it('should return 404 if booking does not exist', async () => {
            const { token } = await getAuthToken('USER')
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response = await request(app).get(`/api/bookings/${fakeUUID}`)
            .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(404);
        });
    });

    describe("GET /api/bookings/my-bookings", () => {
        it("should return all bookings if own this bookings", async () => {
            const { token, managerId } = await getAuthToken('HOTEL_MANAGER');
            const room = await createRoom(managerId, true)
            await prisma.booking.createMany({
                data: [{
                    roomId: room.id,
                    checkIn: new Date(isoDay(10)),
                    checkOut: new Date(isoDay(15)), 
                    totalPrice: 500,
                    userId: managerId,
                }, {
                    roomId: room.id,
                    checkIn: new Date(isoDay(20)),
                    checkOut: new Date(isoDay(25)), 
                    totalPrice: 500,
                    userId: managerId,
                }]
            })
            
            const response = await request(app).get(`/api/bookings/my-bookings`)
            .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
        });
    });

    describe("PATCH /api/bookings/:bookingId", () => {
        it('should return 200 ok with authentication user that own this booking', async () => {
            const { token, managerId } = await getAuthToken('HOTEL_MANAGER');
            const room = await createRoom(managerId, true);
            const booking = await prisma.booking.create({
                data: {
                    roomId: room.id,
                    checkIn: new Date(isoDay(20)),
                    checkOut: new Date(isoDay(25)), 
                    totalPrice: 500,
                    userId: managerId,
                }
            })
            
            const response = await request(app)
            .patch(`/api/bookings/${booking.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                status: "CANCELLED"
            })
            expect(response.status).toBe(200);
        });

        it('should return 404 if Booking not found', async () => {
            const { token } = await getAuthToken('HOTEL_MANAGER');
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
            .patch(`/api/bookings/${fakeUUID}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: "CANCELLED" });
            
            expect(response.status).toBe(404);
        });

        it('should return 400 Cannot cancel booking within 48 hours of check-in',async()=>{
            const {token,managerId}=await getAuthToken('USER');
            const room = await createRoom(managerId,true)
            const booking= await prisma.booking.create({
                data:{
                    roomId:room.id,
                    checkIn:new Date(isoDay(1)),
                    checkOut:new Date(isoDay(3)), 
                    totalPrice:200,
                    userId:managerId,
                }
            })
            const response = await request(app)
            .patch(`/api/bookings/${booking.id}`)
            .set('Authorization',`Bearer ${token}`)
            .send({status:"CANCELLED"});
 
            expect(response.status).toBe(400);
            const inDb = await prisma.booking.findUnique({where:{id:booking.id}});
            expect(inDb?.status).toBe('PENDING');
        })
    });
});