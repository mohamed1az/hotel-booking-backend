import { describe, it, expect, beforeEach ,afterAll} from 'vitest';
import  request  from 'supertest';
import app from '../../app.js';
import {prisma} from '../../config/db.js'
import { redis } from '../../config/redis.js';


describe('Auth Routes ',()=>{
    beforeEach(async()=>{
        await prisma.user.deleteMany();
        await redis.flushall();
    })
    afterAll(async () => {
       if (redis.status === 'ready') {
            await redis.quit();
        }
    });

    describe('POST /api/auth/register',()=>{
        it(' should register a  new user and return 201 with user object',async()=>{
            const response= await request(app)
            .post('/api/auth/register')
            .send({
                "name":"fathy",
                "email":"fathy@gmail.com",
                "password":"12345678"
            });
            expect(response.status).toBe(201);
            expect(response.body.status).toEqual("success");
        })

        it('should return 400 when email already register ',async()=>{
            await request(app).post('/api/auth/register')
            .send({    
                "name":"test",
                "email":"test@gmail.com",
                "password": "1234567",
            });
            const response=await request(app).post('/api/auth/register')
            .send({    
                "name":"tests",
                "email":"test@gmail.com",
                "password": "1234567",
            });
            expect(response.status).toBe(400);

        })
        
    })

    describe('POST /api/auth/login',()=>{

        beforeEach(async()=>{
            await request(app)
            .post('/api/auth/register')
            .send({
                "name":"mohamed",
                "email":"fathy@gmail.com",
                "password":"12345678"
            })
        })

        it('should return 200 with valid email and password',async()=>{
            const response=await request(app)
            .post('/api/auth/login')
            .send({
                "email":"fathy@gmail.com",
                "password":"12345678"
            })

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data')
        })

        it('should retrun 401 if invalid password',async()=>{
            const response=await request(app)
            .post('/api/auth/login')
            .send({
                "email":"fathy@gmail.com",
                "password":"1233232333"
            });
            expect(response.status).toBe(401);
        })
    })

})



