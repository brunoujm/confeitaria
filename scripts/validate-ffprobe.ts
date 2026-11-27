#!/usr/bin/env tsx
/**
 * Script de validação de ffprobe para CI/CD
 * Executa em CI para garantir que ffprobe está disponível antes do deploy
 *
 * Uso: npm run validate:ffprobe
 * Saída: código 0 = sucesso, código 1 = falha
 */

import { spawn } from 'child_process';
import { isProduction } from '../src/lib/env';

function checkFfprobe(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', ['-version']);
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

async function main() {
  console.log('🔍 Validando disponibilidade do ffprobe...');
  console.log(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎯 Produção: ${isProduction() ? 'SIM' : 'NÃO'}`);
  console.log('');

  const available = await checkFfprobe();

  if (available) {
    console.log('✅ ffprobe está disponível');
    console.log('✅ Validação server-side de vídeos funcionará corretamente');
    process.exit(0);
  } else {
    console.error('❌ ffprobe NÃO está disponível');
    console.error('');
    console.error('📋 Para corrigir:');
    console.error('   - Local: instale ffmpeg (ex: winget install ffmpeg, brew install ffmpeg, apt install ffmpeg)');
    console.error('   - Vercel: adicione buildpack https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest');
    console.error('   - Docker: adicione "RUN apk add --no-cache ffmpeg" no Dockerfile');
    console.error('');

    if (isProduction()) {
      console.error('🚨 FALHA CRÍTICA: Em produção, ffprobe é OBRIGATÓRIO');
      process.exit(1);
    } else {
      console.warn('⚠️ Em desenvolvimento, apenas warning (fallback para client-side)');
      process.exit(0);
    }
  }
}

main().catch((error) => {
  console.error('❌ Erro inesperado na validação:', error);
  process.exit(1);
});