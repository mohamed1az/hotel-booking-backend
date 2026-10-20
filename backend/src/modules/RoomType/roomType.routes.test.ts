import {prisma} from '../../config/db.js';
import { redis } from '../../config/redis.js';
import app from '../../app.js';
import request from 'supertest'
import { describe, it, expect, beforeEach , afterAll } from 'vitest';
import { getAuthToken } from '../../tests/helpers.js';

describe("RoomType Rout",()=>{
    beforeEach(async()=>{
        await prisma.user.deleteMany();
        await prisma.hotel.deleteMany();
        await prisma.roomType.deleteMany();
        await prisma.booking.deleteMany();
        await redis.flushall();
    })

    afterAll(async()=>{
        if (redis.status === 'ready') {
            await redis.quit();
        }
    })

    describe("POST /api/room-types/hotel/:hotelId",async()=>{
        it('should create RoomType when user authenticated and role is admin or hotel manager',async()=>{
            const {token,managerId}=await getAuthToken('HOTEL_MANAGER');
            const hotel = await prisma.hotel.create({
                data:{
                    name:"test",
                    address:"assuit",
                    managerId
                }
            })
            const response = await request(app).post(`/api/room-types/hotel/${hotel.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                title:"doublex",
                pricePerNight:100,
                hotelId:hotel.id,
                capacity:2
            });
            expect(response.status).toBe(201);
        })

        it("should return 400 if RoomType with this title already exists",async()=>{
            const {token,managerId}=await getAuthToken('HOTEL_MANAGER');
            const hotel = await prisma.hotel.create({
                data:{
                    name:"test",
                    address:"assuit",
                    managerId
                }
            })
            await prisma.roomType.create({
                data:{
                    title:"double",
                    pricePerNight:100,
                    capacity:2,
                    hotelId:hotel.id
                }
            })
            const response = await request(app).post(`/api/room-types/hotel/${hotel.id}`)
            .set('Authorization',`Bearer ${token}`)
            .send({
                title:"double",
                pricePerNight:100,
                capacity:2,
                hotelId:hotel.id
            })

            expect(response.status).toBe(400)
            
        })

        it("should return 403 if you don't own this hotel or Role is not  Admin when create Roomtype in this hotel",async()=>{
            const{token,managerId}=await getAuthToken('HOTEL_MANAGER');
            const hotel = await prisma.hotel.create({
                data:{
                    name:"test",
                    address:"cairo",
                    managerId
                }
            });
            const {token: otherToken}=await getAuthToken('HOTEL_MANAGER');
            const response = await request(app).post(`/api/room-types/hotel/${hotel.id}`)
            .set('Authorization',`Bearer ${otherToken}`)
            .send({
                title:"test",
                pricePerNight:100,
                capacity:2,
                hotelId:hotel.id     
            });
            expect(response.status).toBe(403);
        })

        it('should return 403 if user role is USER',async()=>{
            const {token,managerId}=await getAuthToken('USER');
            const hotel = await prisma.hotel.create({
                data:{
                    name:"test",
                    address:"assuit",
                    managerId
                }
            })
            const response = await request(app).post(`/api/room-types/hotel/${hotel.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                title:"doublex",
                pricePerNight:100,
                capacity:2
            });
            expect(response.status).toBe(403);
        })

        it('should return 404 if hotel ID does not exist',async()=>{
            const {token}=await getAuthToken('HOTEL_MANAGER');
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response= await request(app).post(`/api/room-types/hotel/${fakeUUID}`)
            .set('Authorization',`Bearer ${token}`)
            .send({
                title:"test",
                pricePerNight:100,
                capacity:2,
                hotelId:fakeUUID
            })
            
            expect(response.status).toBe(404);
        })
    })

    describe("GET api/room-types/hotel/:hotelId",()=>{
        it('should return list of RoomType in hotel ',async()=>{
            const {managerId}=await getAuthToken('HOTEL_MANAGER')
            const hotel = await prisma.hotel.create({
                data:{
                    name:"hotel one",
                    address:"assuit",
                    managerId
                }
            });
            const RoomType= await prisma.roomType.createMany({
                data:[
                    {
                        title:"double",
                        pricePerNight:200,
                        capacity:2,
                        hotelId:hotel.id
                    },
                    {
                        title:"single",
                        pricePerNight:100,
                        capacity:1,
                        hotelId:hotel.id
                    },
                ]
            })
            const response = await request(app).get(`/api/room-types/hotel/${hotel.id}`);
            expect(response.status).toBe(200);
            expect(response.body.data.roomsType.length).toBe(2);

        })

        it('should filter out RoomType with no available rooms for selected dates',async()=>{
            const {managerId} = await getAuthToken('HOTEL_MANAGER');
            const hotel= await prisma.hotel.create({
                data:{
                    name:"Booked Hotel",
                    address:"Alexandria",
                    managerId
                }
            })

            const roomType=await prisma.roomType.create({
                data:{
                    hotelId:hotel.id,
                    title:'Deluxe',
                    pricePerNight:200
                }
            })

            const room=await prisma.room.create({
                data:{
                    roomTypeId:roomType.id,
                    roomNumber:"101",
                    isAvailable:true
                }
            })

            const booking= await prisma.booking.create({
                data:{
                    roomId:room.id,
                    checkIn:new Date('2026-10-10T14:00:00.000Z'),
                    checkOut:new Date('2026-10-15T14:00:00.000Z'),
                    userId: managerId,
                    totalPrice:400
                }
            })

            const busyRoom=await request(app)
            .get(`/api/room-types/hotel/${hotel.id}?checkIn=2026-10-12T14:00:00.000Z&checkOut=2026-10-14T14:00:00.000Z`);

            expect(busyRoom.status).toBe(200);
            expect(busyRoom.body.data.roomsType[0].availableRoomsCount).toBe(0);

            const freeResponse = await request(app)
            .get(`/api/room-types/hotel/${hotel.id}?checkIn=2026-10-20T14:00:00.000Z&checkOut=2026-10-25T14:00:00.000Z`);

            expect(freeResponse.status).toBe(200);
            expect(freeResponse.body.data.roomsType[0].availableRoomsCount).toBe(1);
        })

        it('should return 404 if hotel does not exist',async()=>{
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response = await request(app).get(`/api/room-types/hotel/${fakeUUID}`);
            expect(response.status).toBe(404);
        })
    })

    describe("GET /api/room-types/:roomTypeId",()=>{
        it("should return 200 ok if RoomType found",async()=>{
            const {managerId}=await getAuthToken('HOTEL_MANAGER');
            const hotel = await prisma.hotel.create({
                data:{
                    name:"test",
                    address:"Cairo",
                    managerId
                }
            });
            const roomType= await prisma.roomType.create({
                data:{
                    hotelId:hotel.id,
                    title:'Deluxe',
                    pricePerNight:200,
                    capacity:2
                }
            })
            const response=await request(app).get(`/api/room-types/${roomType.id}`)
            expect(response.status).toBe(200);
        })
        it("should return 404 if hotel not found",async()=>{
            const fakeUUID='00000000-0000-0000-0000-000000000000';
            const response=await request(app).get(`/api/room-types/${fakeUUID}`)
            expect(response.status).toBe(404);
        })

    })

    describe("PUT /api/room-types/:roomTypeId",()=>{
        it('should return 200 ok with athuntication user that have Role [hotel-manager,admin]',async()=>{
            const {token,managerId}=await getAuthToken('HOTEL_MANAGER');
            const hotel = await prisma.hotel.create({
                data:{
                    name:"test hotel",
                    address:"assuite",
                    managerId
                }
            })
            const roomType= await prisma.roomType.create({
                data:{
                    hotelId:hotel.id,
                    title:'Deluxe',
                    pricePerNight:200,
                    capacity:2
                }
            })
            const response=await request(app)
            .put(`/api/room-types/${roomType.id}`)
            .set('Authorization',`Bearer ${token}`)
            .send({
                pricePerNight:300
            })
            expect(response.status).toBe(200);
            
        })

        it('should return 404 if RoomType not found',async()=>{
            const{token,managerId}=await getAuthToken('HOTEL_MANAGER');
            const fakeUUID='00000000-0000-0000-0000-000000000000';
            const response=await request(app)
            .put(`/api/room-types/${fakeUUID}`)
            .set('Authorization',`Bearer ${token}`)
            .send({pricePerNight:300});
            
            expect(response.status).toBe(404)
        })

        it('should return 403 if a hotel manager tries to update a RoomType in hotel they do not own',async()=>{
            const {token,managerId}=await getAuthToken('HOTEL_MANAGER');
            const hotel= await prisma.hotel.create({
                data:{        
                    name:"test hotel",
                    address:"Cairo",
                    managerId
                }
            })
            const roomType=await prisma.roomType.create({
                data:{
                    hotelId:hotel.id,
                    title:'Deluxe',
                    pricePerNight:200,
                    capacity:2
                }
            })
            const {token: otherToken}=await getAuthToken('HOTEL_MANAGER');
            const response = await request(app)
            .put(`/api/room-types/${roomType.id}`)
            .set('Authorization',`Bearer ${otherToken}`)
            .send({pricePerNight:300});
            expect(response.status).toBe(403)
        })

        it('should allow ADMIN to update a RoomType even if they do not own the hotel',async()=>{
            const {managerId}=await getAuthToken('HOTEL_MANAGER');
            const hotel= await prisma.hotel.create({
                data:{
                    name:"test hotel",
                    address:"Cairo",
                    managerId
                }
            })
            const roomType=await prisma.roomType.create({
                data:{
                    hotelId:hotel.id,
                    title:'Deluxe',
                    pricePerNight:200,
                    capacity:2
                }
            })
            const {token: adminToken} = await getAuthToken('ADMIN');
            const response = await request(app)
            .put(`/api/room-types/${roomType.id}`)
            .set('Authorization',`Bearer ${adminToken}`)
            .send({pricePerNight:350});

            expect(response.status).toBe(200);
            expect(response.body.data.updatedRoomType.pricePerNight).toBe(350);
        })

        it('should return 400 if updated title already exists for another RoomType in the same hotel',async()=>{
            const {token,managerId}=await getAuthToken('HOTEL_MANAGER');
            const hotel= await prisma.hotel.create({
                data:{
                    name:"test hotel",
                    address:"Cairo",
                    managerId
                }
            })
            await prisma.roomType.create({
                data:{
                    hotelId:hotel.id,
                    title:'Deluxe',
                    pricePerNight:200,
                    capacity:2
                }
            })
            const secondRoomType = await prisma.roomType.create({
                data:{
                    hotelId:hotel.id,
                    title:'Single',
                    pricePerNight:100,
                    capacity:1
                }
            })

            const response = await request(app)
            .put(`/api/room-types/${secondRoomType.id}`)
            .set('Authorization',`Bearer ${token}`)
            .send({title:'Deluxe'});

            expect(response.status).toBe(400);
        })


    })

    describe("DELETE /api/room-types/:roomTypeId ",()=>{
        it('should return 204 for successfully deleted RoomType',async()=>{
            const {token,managerId} = await getAuthToken();
            const hotel = await prisma.hotel.create({
                data:{
                    name:"test hotel",
                    address:"Cairo",
                    managerId
                }
            });
            const roomType = await prisma.roomType.create({
                data:{
                    hotelId:hotel.id,
                    title:'Deluxe',
                    pricePerNight:200,
                    capacity:2
                }
            })
            const response=await request(app).delete(`/api/room-types/${roomType.id}`)
            .set('Authorization',`Bearer ${token}`)
            expect(response.status).toBe(204);

        })

        it('should return 404 if hotel ID does not exist',async()=>{
            const {token}=await getAuthToken('HOTEL_MANAGER');
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response= await request(app).delete(`/api/room-types/${fakeUUID}`)
            .set('Authorization',`Bearer ${token}`);

            expect(response.status).toBe(404);
        })

        it("should return 403 if a hotel manager tries to Delete a RoomType in hotel they do not own ",async()=>{
            const {token,managerId}= await getAuthToken('HOTEL_MANAGER');
            const hotel=await prisma.hotel.create({
                data:{
                    name:"test hotel",
                    address:"Cairo",
                    managerId
                }
            });
            const roomType = await prisma.roomType.create({
                data:{
                    hotelId:hotel.id,
                    title:'Deluxe',
                    pricePerNight:200,
                    capacity:2
                }
            })

            const {token:otherToken}=await getAuthToken('HOTEL_MANAGER');
            const response=await request(app).delete(`/api/room-types/${roomType.id}`)
            .set('Authorization',`Bearer ${otherToken}`);
            expect(response.status).toBe(403);
        })
    })


})