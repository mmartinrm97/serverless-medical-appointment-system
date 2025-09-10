#!/usr/bin/env node

/**
 * Script de verificación del proyecto
 * Verifica que todas las configuraciones y dependencias estén correctas
 */

console.log('🔍 Verificando configuración del proyecto...\n');

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const checks = [
  {
    name: 'Node.js versión 20+',
    check: () => {
      const version = process.version;
      const major = parseInt(version.slice(1).split('.')[0]);
      return major >= 20;
    }
  },
  {
    name: 'pnpm instalado',
    check: () => {
      try {
        execSync('pnpm --version', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Serverless Framework v4+',
    check: () => {
      try {
        execSync('serverless --version', { stdio: 'ignore' });
        return true; // Si no hay error, está instalado
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Dependencias instaladas',
    check: () => existsSync(join(projectRoot, 'node_modules'))
  },
  {
    name: 'TypeScript compilación exitosa',
    check: () => {
      try {
        execSync('npx tsc --noEmit src/handler.ts', { stdio: 'ignore', cwd: projectRoot });
        return true;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'ESLint sin errores',
    check: () => {
      try {
        execSync('pnpm run lint', { stdio: 'ignore', cwd: projectRoot });
        return true;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Prettier configurado',
    check: () => {
      try {
        execSync('pnpm run format:check', { stdio: 'ignore', cwd: projectRoot });
        return true;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Tests ejecutándose',
    check: () => {
      try {
        execSync('pnpm run test', { stdio: 'ignore', cwd: projectRoot });
        return true;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Serverless config válido',
    check: () => existsSync(join(projectRoot, 'serverless.ts'))
  },
  {
    name: 'Sin vulnerabilidades conocidas',
    check: () => {
      try {
        const output = execSync('pnpm audit', { encoding: 'utf8', cwd: projectRoot });
        return output.includes('No known vulnerabilities found');
      } catch {
        return false;
      }
    }
  }
];

console.log('Ejecutando verificaciones:\n');

let passed = 0;
let total = checks.length;

for (const check of checks) {
  process.stdout.write(`  ${check.name}... `);
  
  try {
    const result = check.check();
    if (result) {
      console.log('✅');
      passed++;
    } else {
      console.log('❌');
    }
  } catch (error) {
    console.log('❌ (Error)');
    console.log(`    ${error.message}`);
  }
}

console.log(`\n📊 Resultado: ${passed}/${total} verificaciones pasaron`);

if (passed === total) {
  console.log('🎉 ¡Proyecto listo para la siguiente fase!');
  process.exit(0);
} else {
  console.log('⚠️  Hay verificaciones que fallan. Revisa los errores antes de continuar.');
  process.exit(1);
}
