import {prisma} from "../../config/db.js";
import { beforeEach , afterAll , it , expect ,describe } from "vitest";
import request from "supertest";
import { getAuthToken } from "../../tests/helpers.js";
import app from "../../app.js";
import { redis } from "../../config/redis.js";

describe("Room Route",()=>{
    beforeEach(async()=>{
        await prisma.user.deleteMany();
        await prisma.hotel.deleteMany();
        await prisma.roomType.deleteMany();
        await prisma.room.deleteMany();
        await redis.flushall();
    })
    afterAll(async()=>{
        if (redis.status === 'ready') {
            await redis.quit();
        }
    })

    describe("POST /api/rooms/:roomTypeId",async()=>{
        it('should create Room when user authenticated and role is admin or hotel manager',async()=>{
            const {token,managerId}=await getAuthToken('HOTEL_MANAGER');
            const hotel = await prisma.hotel.create({
                data:{
                    name:"test",
                    address:"assuit",
                    managerId
                }
            })
            const roomType = await prisma.roomType.create({
                data:{
                    title:"doublex",
                    pricePerNight:100,
                    hotelId:hotel.id,
                    capacity:2
                }
            })
            const response = await request(app).post(`/api/rooms/${roomType.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                roomNumber:"A10",
                isAvailable:true,
                roomTypeId:roomType.id
            });
            expect(response.status).toBe(201);
        })

        it("should return 400 if Room with this roomNumber and roomTypeId already exists",async()=>{
            const {token,managerId}=await getAuthToken('HOTEL_MANAGER');
            const hotel = await prisma.hotel.create({
                data:{
                    name:"test",
                    address:"assuit",
                    managerId
                }
            })
            const roomType = await prisma.roomType.create({
                data:{
                    title:"double",
                    pricePerNight:100,
                    capacity:2,
                    hotelId:hotel.id
                }
            })
            await prisma.room.create({
                data:{
                    roomNumber:"A10",
                    isAvailable:true,
                    roomTypeId:roomType.id
                }
            })
            const response = await request(app).post(`/api/rooms/${roomType.id}`)
            .set('Authorization',`Bearer ${token}`)
            .send({
                roomNumber:"A10",
                isAvailable:"true",
                roomTypeId:roomType.id
            })

            expect(response.status).toBe(400)
            
        })

        it("should return 403 if you don't own this hotel or Role is not  Admin when create Room in this hotel",async()=>{
            const{managerId}=await getAuthToken('HOTEL_MANAGER');
            const hotel = await prisma.hotel.create({
                data:{
                    name:"test",
                    address:"cairo",
                    managerId
                }
            });
            const roomType = await prisma.roomType.create({
                data:{
                    title:"double",
                    pricePerNight:100,
                    capacity:2,
                    hotelId:hotel.id
                }
            })
            const {token: otherToken}=await getAuthToken('HOTEL_MANAGER');
            const response = await request(app).post(`/api/rooms/${roomType.id}`)
            .set('Authorization',`Bearer ${otherToken}`)
            .send({
                roomNumber:"A10",
                isAvailable:true,
                roomTypeId:roomType.id
            });
            expect(response.status).toBe(403);
        })

        it('should return 403 if user role is USER ',async()=>{
            const {token,managerId}=await getAuthToken('USER');
            const hotel = await prisma.hotel.create({
                data:{
                    name:"test",
                    address:"assuit",
                    managerId
                }
            })
            const roomType=await prisma.roomType.create({
                data:{
                    title:"double",
                    pricePerNight:100,
                    capacity:2,
                    hotelId:hotel.id
                }
            })
            const response = await request(app).post(`/api/rooms/${roomType.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                roomNumber:"A10",
                isAvailable:true,
                roomTypeId:roomType.id
            });
            expect(response.status).toBe(403);
        })

        it('should return 201 if user role is  ADMIN',async()=>{
            const {token,managerId}=await getAuthToken('ADMIN');
            const hotel = await prisma.hotel.create({
                data:{
                    name:"test",
                    address:"assuit",
                    managerId
                }
            })
            const roomType=await prisma.roomType.create({
                data:{
                    title:"double",
                    pricePerNight:100,
                    capacity:2,
                    hotelId:hotel.id
                }
            })
            const response = await request(app).post(`/api/rooms/${roomType.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                roomNumber:"A10",
                isAvailable:true,
                roomTypeId:roomType.id
            });
            expect(response.status).toBe(201);

        })

        it('should return 404 if roomType ID does not exist',async()=>{
            const {token}=await getAuthToken('HOTEL_MANAGER');
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response= await request(app).post(`/api/rooms/${fakeUUID}`)
            .set('Authorization',`Bearer ${token}`)
            .send({
                roomNumber:"A10",
                isAvailable:true,
                roomTypeId:fakeUUID
            })
            
            expect(response.status).toBe(404);
        })
    })

    describe("GET api/room-type/:roomTypeId",()=>{
        it('should return list of Room in RoomType in Hotel ',async()=>{
            const {managerId}=await getAuthToken('HOTEL_MANAGER')
            const hotel = await prisma.hotel.create({
                data:{
                    name:"hotel one",
                    address:"assuit",
                    managerId
                }
            });
            const roomType= await prisma.roomType.create({
                data:
                    {
                        title:"double",
                        pricePerNight:200,
                        capacity:2,
                        hotelId:hotel.id
                    }
            });
            await prisma.room.createMany({
                data:[{
                    roomNumber:"A10",
                    isAvailable:true,
                    roomTypeId:roomType.id
                },{
                    roomNumber:"A11",
                    isAvailable:false,
                    roomTypeId:roomType.id
                }]
            })
            const response = await request(app).get(`/api/rooms/room-type/${roomType.id}`);
            expect(response.status).toBe(200);
            expect(response.body.data.length).toBe(2);

        })

        it('should return all Rooms in room type thats status to be  available ',async()=>{
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

            await prisma.room.createMany({
                data:[{
                    roomNumber:"A10",
                    isAvailable:true,
                    roomTypeId:roomType.id
                },{
                    roomNumber:"A11",
                    isAvailable:false,
                    roomTypeId:roomType.id
                }]
            })
            const freeResponse = await request(app)
            .get(`/api/rooms/room-type/${roomType.id}?isAvailable=true`);

            expect(freeResponse.status).toBe(200);
            expect(freeResponse.body.data.length).toBe(1);
        })

        it('should return 404 if roomType does not exist',async()=>{
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response = await request(app).get(`/api/rooms/room-type/${fakeUUID}`);
            expect(response.status).toBe(404);
        })
    })

    describe("GET /api/rooms/:roomId",()=>{
        it("should return 200 ok if Room found",async()=>{
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
            const room = await prisma.room.create({
                data:{
                    roomNumber:"A11",
                    isAvailable:false,
                    roomTypeId:roomType.id
                }
            })
            const response=await request(app).get(`/api/rooms/${room.id}`)
            expect(response.status).toBe(200);
        })
        it("should return 404 if room not found",async()=>{
            const fakeUUID='00000000-0000-0000-0000-000000000000';
            const response=await request(app).get(`/api/rooms/${fakeUUID}`)
            expect(response.status).toBe(404);
        })

    })

    describe("PUT /api/rooms/:roomId",()=>{
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
            const room=await prisma.room.create({
                data:{
                    roomNumber:"A11",
                    isAvailable:false,
                    roomTypeId:roomType.id
                }
            })
            const response=await request(app)
            .put(`/api/rooms/${room.id}`)
            .set('Authorization',`Bearer ${token}`)
            .send({
                isAvailable:true
            })
            expect(response.status).toBe(200);
            
        })

        it('should return 404 if RoomType not found',async()=>{
            const{token}=await getAuthToken('HOTEL_MANAGER');
            const fakeUUID='00000000-0000-0000-0000-000000000000';
            const response=await request(app)
            .put(`/api/rooms/${fakeUUID}`)
            .set('Authorization',`Bearer ${token}`)
            .send({isAvailable:true});
            
            expect(response.status).toBe(404)
        })

        it('should return 403 if a hotel manager tries to update a Room in hotel they do not own',async()=>{
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
            const room = await prisma.room.create({
                data:{
                    roomNumber:"A11",
                    isAvailable:false,
                    roomTypeId:roomType.id
                }
            })
            const {token: otherToken}=await getAuthToken('HOTEL_MANAGER');
            const response = await request(app)
            .put(`/api/rooms/${room.id}`)
            .set('Authorization',`Bearer ${otherToken}`)
            .send({isAvailable:true});
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
            const room = await prisma.room.create({
                data:{
                    roomNumber:"A11",
                    isAvailable:false,
                    roomTypeId:roomType.id
                }
            })
            const {token: adminToken} = await getAuthToken('ADMIN');
            const response = await request(app)
            .put(`/api/rooms/${room.id}`)
            .set('Authorization',`Bearer ${adminToken}`)
            .send({isAvailable:true});

            expect(response.status).toBe(200);
        })

        it('should return 409 if updated roomTypeId and roomNumber already exists in the same RoomType in  hotel',async()=>{
            const {token,managerId}=await getAuthToken('HOTEL_MANAGER');
            const hotel= await prisma.hotel.create({
                data:{
                    name:"test hotel",
                    address:"Cairo",
                    managerId
                }
            })
            const roomType =await prisma.roomType.create({
                data:{
                    hotelId:hotel.id,
                    title:'Deluxe',
                    pricePerNight:200,
                    capacity:2
                }
            })
            const room1 = await prisma.room.create({
                data:{
                    roomNumber:"A12",
                    isAvailable:false,
                    roomTypeId:roomType.id
                }
            })

            const room2 = await prisma.room.create({
                data:{
                    roomNumber:"A10",
                    isAvailable:true,
                    roomTypeId:roomType.id
                }
            })
            

            const response = await request(app)
            .put(`/api/rooms/${room2.id}`)
            .set('Authorization',`Bearer ${token}`)
            .send({roomNumber:"A12"});

            expect(response.status).toBe(409);
        })
    })

    describe("DELETE /api/rooms/:roomId ",()=>{
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
            const room = await prisma.room.create({
                data:{
                    roomNumber:"A12",
                    isAvailable:false,
                    roomTypeId:roomType.id
                }
            })
            const response=await request(app).delete(`/api/rooms/${room.id}`)
            .set('Authorization',`Bearer ${token}`)
            expect(response.status).toBe(204);
        })

        it('should return 404 if Room ID does not exist',async()=>{
            const {token}=await getAuthToken('HOTEL_MANAGER');
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response= await request(app).delete(`/api/rooms/${fakeUUID}`)
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
            const room = await prisma.room.create({
                data:{
                    roomNumber:"A12",
                    isAvailable:false,
                    roomTypeId:roomType.id
                }
            })

            const {token:otherToken}=await getAuthToken('HOTEL_MANAGER');
            const response=await request(app).delete(`/api/rooms/${room.id}`)
            .set('Authorization',`Bearer ${otherToken}`);
            expect(response.status).toBe(403);
        })
        it("should return 204 if Admin try to Delete Room",async()=>{
            const {managerId}=await getAuthToken('HOTEL_MANAGER');
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
            const room = await prisma.room.create({
                data:{
                    roomNumber:"A12",
                    isAvailable:false,
                    roomTypeId:roomType.id
                }
            })
            const {token:otherToken}=await getAuthToken('ADMIN');
            const response = await request(app).delete(`/api/rooms/${room.id}`)
            .set('Authorization',`Bearer ${otherToken}`);
            expect(response.status).toBe(204);
        })
    })
})









