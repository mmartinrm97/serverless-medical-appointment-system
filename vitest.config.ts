import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
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
        },
        setupFiles: ['./__tests__/setup.ts']
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