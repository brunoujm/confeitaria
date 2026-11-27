import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { z } from 'zod';
import { aiRateLimiter, checkRateLimit } from '@/lib/ratelimit';

// ============================================
// DEFENSE IN DEPTH: Prompt Injection Prevention (shared with /api/ai/route.ts)
// ============================================

const VARIABLE_ALLOWED_CHARS = /^[\p{L}\p{N}\s.,!?()\[\]{}:;@#$%&*+=\-_\/\|\\'"`~<>, ]+$/u;

const VARIABLE_MAX_LENGTHS: Record<string, number> = {
  produto: 100,
  ocasião: 50,
  tom: 30,
  cta: 50,
  marca: 50,
  default: 200,
};

const ALLOWED_TEMPLATE_VARIABLES = ['produto', 'ocasião', 'tom', 'cta', 'marca'] as const;
type AllowedVariable = (typeof ALLOWED_TEMPLATE_VARIABLES)[number];

function sanitizeVariableValue(key: string, value: string): string {
  const maxLen = VARIABLE_MAX_LENGTHS[key] || VARIABLE_MAX_LENGTHS.default;
  let sanitized = value.slice(0, maxLen);

  if (!VARIABLE_ALLOWED_CHARS.test(sanitized)) {
    sanitized = sanitized.replace(/[^\p{L}\p{N}\s.,!?()\[\]{}:;@#$%&*+=\-_\/\|\\'"`~<>, ]/gu, '');
  }

  sanitized = sanitized
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/{{/g, '&#123;&#123;')
    .replace(/}}/g, '&#125;&#125;');

  const injectionPatterns = [
    /ignore\s+previous\s+instructions/gi,
    /ignore\s+all\s+previous/gi,
    /disregard\s+previous/gi,
    /forget\s+previous/gi,
    /system\s*:/gi,
    /user\s*:/gi,
    /assistant\s*:/gi,
    /<\|.*?\|>/g,
    /\[INST\].*?\[\/INST\]/gi,
    /<<SYS>>.*?<\/\SYS>>/gi,
    /###\s*Instruction/gi,
    /###\s*Response/gi,
    /You are now/gi,
    /Act as/gi,
    /Pretend to be/gi,
    /Roleplay/gi,
    /Simulate/gi,
    /Override/gi,
    /Bypass/gi,
    /Jailbreak/gi,
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }

  sanitized = sanitized.trim().slice(0, maxLen);
  return sanitized;
}

function sanitizeTemplateVariables(variables: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(variables)) {
    if (!ALLOWED_TEMPLATE_VARIABLES.includes(key as AllowedVariable)) {
      console.warn(`[AI Test] Blocked unknown template variable: ${key}`);
      continue;
    }

    if (typeof value !== 'string') {
      continue;
    }

    sanitized[key] = sanitizeVariableValue(key, value);
  }

  return sanitized;
}

function interpolateTemplate(template: string, variables: Record<string, string>): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }

  const unreplaced = result.match(/\{\{[\w\s]+\}\}/g);
  if (unreplaced) {
    console.warn('[AI Test] Unreplaced template variables detected:', unreplaced);
    result = result.replace(/\{\{[\w\s]+\}\}/g, '');
  }

  return result;
}

// System prompts (STATIC - never user-controlled)
const SYSTEM_PROMPTS: Record<string, string> = {
  CAPTION: 'Você é um especialista em marketing de conteúdo para confeitarias e docerias brasileiras. Crie legendas autênticas, engajadoras e adaptadas ao formato solicitado. Sempre responda em português do Brasil.',
  HASHTAG: 'Você é um especialista em hashtags para redes sociais no nicho de confeitaria brasileira. Gere hashtags relevantes, populares e de nicho. Responda apenas com a lista de hashtags.',
  IMAGE: 'Você é um prompt engineer especializado em geração de imagens para confeitaria. Crie prompts detalhados e otimizados para DALL-E 3.',
};

// Input validation schema for test endpoint
const testRequestSchema = z.object({
  presetId: z.string().min(1),
  input: z.record(z.string().max(200)).optional(), // variables as key-value pairs
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(aiRateLimiter, `ai:${session.user.id}`);
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em um minuto.' },
        { status: 429 }
      );
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
      return response;
    }

    const body = await request.json();
    const validation = testRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: validation.error.flatten() }, { status: 400 });
    }

    const { presetId, input } = validation.data;

    const preset = await prisma.aIPreset.findUnique({
      where: { id: presetId },
    });

    if (!preset) {
      return NextResponse.json({ error: 'Preset não encontrado' }, { status: 404 });
    }

    if (preset.userId !== session.user.id && !preset.isPublic) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Sanitize input variables (defense in depth)
    const sanitizedVariables = sanitizeTemplateVariables(input || {});

    // Parse preset variables (stored as JSON string)
    const presetVariables: string[] = preset.variables
      ? (typeof preset.variables === 'string' ? JSON.parse(preset.variables) : preset.variables)
      : [];

    // Build final variables: merge preset-defined variables with user input
    // Only allow variables that are defined in the preset
    const finalVariables: Record<string, string> = {};
    for (const varName of presetVariables) {
      if (sanitizedVariables[varName]) {
        finalVariables[varName] = sanitizedVariables[varName];
      }
    }

    // Interpolate variables into preset prompt
    const finalPrompt = interpolateTemplate(preset.prompt, finalVariables);

    // Select model
    let model;
    if (preset.model.startsWith('gpt') || preset.model.startsWith('o1') || preset.model.startsWith('o3')) {
      model = openai(preset.model);
    } else if (preset.model.startsWith('claude')) {
      model = anthropic(preset.model);
    } else {
      model = openai('gpt-4o-mini');
    }

    // Get system prompt based on preset type
    const systemPrompt = SYSTEM_PROMPTS[preset.type] || SYSTEM_PROMPTS.CAPTION;

    // Generate text with system/user separation
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: finalPrompt,
      temperature: preset.temperature,
      maxTokens: preset.maxTokens,
    });

    const response = NextResponse.json({ result: text });
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    return response;
  } catch (error) {
    console.error('AI test error:', error);
    return NextResponse.json({ error: 'Erro ao testar preset' }, { status: 500 });
  }
}