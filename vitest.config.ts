import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        // Unit tests only - exclude E2E and integration tests
        include: [
            '__tests__/modules/**/*.test.ts',
            '__tests__/shared/**/*.test.ts'
        ],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.serverless/**',
            '__tests__/e2e/**',
            '__tests__/integration/**'
        ],
        testTimeout: 10000,
        setupFiles: ['__tests__/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            reportOnFailure: true,
            exclude: [
                'node_modules/',
                'dist/',
                '**/*.d.ts',
                '**/*.config.*',
                'coverage/**',
                '.serverless/**',
                '__tests__/**',
                'src/**/*.test.ts',
                'src/**/*.spec.ts'
            ],
            thresholds: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80
                }
            },
            include: [
                'src/**/*.ts'
            ]
        }
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