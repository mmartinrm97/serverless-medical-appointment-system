import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        // Only include integration tests
        include: [
            '__tests__/integration/**/*.test.ts'
        ],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.serverless/**',
            '__tests__/e2e/**',
            '__tests__/modules/**'
        ],
        testTimeout: 10000,
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
