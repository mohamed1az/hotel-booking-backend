import { describe, it, expect, beforeEach ,afterAll} from 'vitest';
import request from 'supertest'
import app from '../../app.js'
import {prisma} from '../../config/db.js'
import {redis} from '../../config/redis.js'
import {getAuthToken} from '../../tests/helpers.js'


describe('Hotel Route',()=>{
    beforeEach(async()=>{
        await prisma.hotel.deleteMany();
        await prisma.user.deleteMany();
        await redis.flushall();
    })
    afterAll(async()=>{
        // await prisma.$disconnect();
        if (redis.status === 'ready') {
            await redis.quit();
        }
    })

    describe('POST /api/hotel',()=>{
        it('should create hotel when authenticated and role is admin or hotel manager',async()=>{
            const {token,managerId}=await getAuthToken('HOTEL_MANAGER');
            const response = await request(app).post('/api/hotel')
            .set('Authorization', `Bearer ${token}`)
            .send({
                "name":"marina",
                "address":"assuit",
                "managerId":managerId
            });

            expect(response.status).toBe(201);
        })

        it("should return 400 if hotel with this name and address already exists",async()=>{
            const {token,managerId}=await getAuthToken('HOTEL_MANAGER');
            await request(app).post('/api/hotel')
            .set('Authorization',`Bearer ${token}`)
            .send({
                "name":"lala",
                "address":"assuit",
                "managerId":managerId
            })

            const response = await request(app).post('/api/hotel')
            .set('Authorization',`Bearer ${token}`)
            .send({
                "name":"lala",
                "address":"assuit",
                "managerId":managerId
            });

            expect(response.status).toBe(400)
            
        })

        it('should return 403 if user role is USER',async()=>{
            const {token,managerId} = await getAuthToken('USER');
            const response=await request(app).post('/api/hotel')
            .set('Authorization',`Bearer ${token}`)
            .send({
                name:"unauthenticated",
                address:"kdldkdkd",
                managerId: managerId
            });
            
            expect(response.status).toBe(403)
        })

    })

    describe('DELETE /api/hotel/hotelId',()=>{
        it('should return 204 for successfully deleted hotel',async()=>{
            const {token,managerId} = await getAuthToken();
            const hotel=await request(app).post('/api/hotel')
            .set('Authorization',`Bearer ${token}`)
            .send({
                "name":"lala",
                "address":"assuit",
                "managerId":managerId
            });

            const hotelId=hotel.body.data.hotel.id;
            const response = await request(app).delete(`/api/hotel/${hotelId}`)
            .set('Authorization',`Bearer ${token}`);
            expect(response.status).toBe(204);

        })

        it('should return 404 if hotel ID does not exist',async()=>{
            const {token}=await getAuthToken('HOTEL_MANAGER');
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response= await request(app).delete(`/api/hotel/${fakeUUID}`)
            .set('Authorization',`Bearer ${token}`);

            expect(response.status).toBe(404);
        })

    })

    describe('GET /api/hotel',()=>{
        it('should return paginated list of hotels with correct structure',async()=>{
            const {token,managerId}=await getAuthToken('HOTEL_MANAGER')
            await prisma.hotel.create({
                data:{
                    name:"hotel one",
                    address:"assuit",
                    managerId
                }
            })
            const response = await request(app).get('/api/hotel?page=1&limit=10');
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('hotels');
            expect(response.body.data).toHaveProperty('pagination');
            expect(Array.isArray(response.body.data.hotels)).toBe(true);
            expect(response.body.data.pagination.currentPage).toBe(1);
        })

        it('should filter hotels by search keyword in name or address',async()=>{
            const {managerId}=await getAuthToken();
            await prisma.hotel.createMany({
                data: [
                    { name: 'Grand Marina', address: 'Assiut', managerId },
                    { name: 'Cairo Nile View', address: 'Cairo', managerId }
                ]
            })
            const response = await request(app).get('/api/hotel?search=Assiut')
            expect(response.status).toBe(200);
            expect(response.body.data.hotels.length).toBe(1);
            expect(response.body.data.hotels[0].name).toEqual('Grand Marina')

        })

        it('should filter out hotels with no available rooms for selected dates',async()=>{
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
                    pricePerNight:100
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
            .get('/api/hotel?checkIn=2026-10-12T14:00:00.000Z&checkOut=2026-10-14T14:00:00.000Z');

            expect(busyRoom.status).toBe(200);
            expect(busyRoom.body.data.hotels.length).toBe(0);

            const freeResponse = await request(app)
            .get('/api/hotel?checkIn=2026-10-20T14:00:00.000Z&checkOut=2026-10-25T14:00:00.000Z');

            expect(freeResponse.status).toBe(200);
            expect(freeResponse.body.data.hotels.length).toBe(1);
        })

        
    })

    describe('PUT /api/hotel/hotelId',()=>{
        it('should return 200 ok with athuntication user',async()=>{
            const {token,managerId}=await getAuthToken('HOTEL_MANAGER')
            const hotel = await prisma.hotel.create({
                data:{
                    name:"test hotel",
                    address:"assuite",
                    managerId
                }
            })
            const updateResponse=await request(app)
            .put(`/api/hotel/${hotel.id}`)
            .set('Authorization',`Bearer ${token}`)
            .send({
                address:"Cairo"
            })
            expect(updateResponse.status).toBe(200);
            expect(updateResponse.body.data.hotel.address).toEqual('Cairo')
        })

        it('should return 404 if hotel not found',async()=>{
            const{token,managerId}=await getAuthToken('HOTEL_MANAGER');
            const fakeUUID='00000000-0000-0000-0000-000000000000';
            const response=await request(app)
            .put(`/api/hotel/${fakeUUID}`)
            .set('Authorization',`Bearer ${token}`)
            .send({name:"asd"});
            
            expect(response.status).toBe(404)
        })

        it('should return 403 if a hotel manager tries to update a hotel they do not own',async()=>{
            const {token,managerId}=await getAuthToken('HOTEL_MANAGER');
            const hotel= await prisma.hotel.create({
                data:{        
                    name:"test hotel",
                    address:"Cairo",
                    managerId
                }
            })
            const {token: otherToken}=await getAuthToken('HOTEL_MANAGER');
            const response = await request(app)
            .put(`/api/hotel/${hotel.id}`)
            .set('Authorization',`Bearer ${otherToken}`)
            .send({name:"test"});
            expect(response.status).toBe(403)
        })

        it('should return 400 if updated name and address already exist for another hotel',async()=>{
            const { token, managerId } = await getAuthToken('HOTEL_MANAGER');
            await prisma.hotel.create({
                data: { name: "Existing Hotel", address: "Cairo", managerId }
            });

            const secondHotel = await prisma.hotel.create({
                data: { name: "Second Hotel", address: "Giza", managerId }
            });
            const response = await request(app)
                .put(`/api/hotel/${secondHotel.id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: "Existing Hotel", address: "Cairo" });

             expect(response.status).toBe(400);
        });
    })
    
    describe("GET /api/hotel/hotelId",()=>{
        it("should return 200 ok if hotel found",async()=>{
            const {token,managerId}=await getAuthToken('HOTEL_MANAGER');
            const hotel = await prisma.hotel.create({
                data:{
                    name:"test",
                    address:"Cairo",
                    managerId
                }
            });
            const foundResopnse=await request(app).get(`/api/hotel/${hotel.id}`)
            .set('Authorization',`Bearer ${token}`);
            expect(foundResopnse.status).toBe(200);
        })
        it("should return 404 if hotel not found",async()=>{
            const {token,managerId}=await getAuthToken('HOTEL_MANAGER');
            const fakeUUID='00000000-0000-0000-0000-000000000000';
            const response=await request(app).get(`/api/hotel/${fakeUUID}`)
            .set('Authorization',`Bearer ${token}`);
            expect(response.status).toBe(404);
        })

    })

})



