import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// تحميل متغيرات البيئة الخاصة بالتست قبل تشغيل أي اختبار
dotenv.config({ path: '.env.test' });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    testTimeout: 10000,
  }
});