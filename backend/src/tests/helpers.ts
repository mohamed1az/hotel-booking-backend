// src/tests/helpers.ts
import bcrypt from 'bcrypt';
import request from 'supertest';
import app from '../app.js';
import { prisma } from '../config/db.js';
import type { Role } from '@prisma/client';

export async function getAuthToken(role: Role = 'HOTEL_MANAGER') {
  const email = `test-${Date.now()}@gmail.com`; 
  const password = '12345678';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: 'mohamed',
      email,
      password: hashedPassword,
      role,
    },
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  if (loginRes.status !== 200) {
    throw new Error(`Failed to log in: ${JSON.stringify(loginRes.body)}`);
  }

  return {
    token: loginRes.body.data.token,
    managerId: user.id,
  };
}