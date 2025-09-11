import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['__tests__/e2e/**/*.test.ts'],
        setupFiles: ['__tests__/e2e/setup.ts'],
        // No AWS SDK mocking for E2E tests - we want real calls to LocalStack
        testTimeout: 60000, // 60 seconds for E2E tests
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@/modules': path.resolve(__dirname, './src/modules'),
            '@/shared': path.resolve(__dirname, './src/shared'),
            '@/appointments': path.resolve(__dirname, './src/modules/appointments'),
            '@tests': path.resolve(__dirname, './__tests__')
        }
    }
});
