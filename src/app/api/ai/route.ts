import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import OpenAI from 'openai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { aiRateLimiter, checkRateLimit } from '@/lib/ratelimit';

// ============================================
// DEFENSE IN DEPTH: Prompt Injection Prevention
// ============================================
// 1. Input validation with strict Zod schemas (allowlist approach)
// 2. Variable sanitization: length limits, character allowlist, delimiter escaping
// 3. Template interpolation with safe replacement (no user-controlled templates)
// 4. System/User message separation (Vercel AI SDK supports messages array)
// 5. No HTML entity encoding - that's for XSS, not prompt injection
// 6. Rate limiting fail-closed in production

// Note: Template variable sanitization (sanitizeVariableValue, sanitizeTemplateVariables)
// and related constants (VARIABLE_ALLOWED_CHARS, VARIABLE_MAX_LENGTHS, ALLOWED_TEMPLATE_VARIABLES)
// are defined in /api/ai/test/route.ts where they are used for preset-based generation
// with {{variable}} placeholders.
// The main /api/ai route handles direct user input (topic, tone, etc.) and does not use template interpolation.

// ============================================
// Zod Schemas with Strict Validation
// ============================================

const captionSchema = z.object({
  type: z.literal('caption'),
  topic: z.string().min(1).max(500), // Topic is user input, strict limit
  tone: z.enum(['professional', 'casual', 'inspirational', 'educational', 'promotional', 'storytelling']),
  length: z.enum(['short', 'medium', 'long']),
  postType: z.enum(['FEED', 'STORIES', 'REELS', 'WHATSAPP_STATUS', 'WHATSAPP_CATALOG']),
  includeEmojis: z.boolean(),
  includeCTA: z.boolean(),
  // Optional template variables for preset-based generation
  variables: z.record(z.string().max(200)).optional(),
});

const hashtagsSchema = z.object({
  type: z.literal('hashtags'),
  topic: z.string().min(1).max(500),
  count: z.number().int().min(1).max(30),
  style: z.enum(['popular', 'niche', 'mixed', 'branded']),
  postType: z.enum(['FEED', 'STORIES', 'REELS', 'WHATSAPP_STATUS', 'WHATSAPP_CATALOG']),
  variables: z.record(z.string().max(200)).optional(),
});

const imageSchema = z.object({
  type: z.literal('image'),
  prompt: z.string().min(1).max(1000), // DALL-E prompt limit
  style: z.enum(['photorealistic', 'illustration', 'minimalist', 'vibrant', 'warm', 'elegant']),
  aspectRatio: z.enum(['1:1', '9:16', '4:5', '16:9']),
  variables: z.record(z.string().max(200)).optional(),
});

const aiRequestSchema = z.union([captionSchema, hashtagsSchema, imageSchema]);

// ============================================
// Prompt Builders (System prompts are static/hardcoded)
// ============================================

function buildCaptionPrompt(data: z.infer<typeof captionSchema>) {
  const lengthGuide = {
    short: 'máximo 150 caracteres',
    medium: '150-300 caracteres',
    long: '300+ caracteres',
  };

  const toneGuide = {
    professional: 'profissional, formal e confiável',
    casual: 'casual, descontraído e amigável',
    inspirational: 'inspirador, motivacional e emotivo',
    educational: 'educativo, informativo e didático',
    promotional: 'promocional, persuasivo e orientado a vendas',
    storytelling: 'narrativo, envolvente e pessoal',
  };

  const postTypeGuide: Record<string, string> = {
    FEED: 'Instagram Feed (quadrado ou retrato)',
    STORIES: 'Instagram Stories (vertical 9:16, efêmero)',
    REELS: 'Instagram Reels (vertical 9:16, vídeo curto)',
    WHATSAPP_STATUS: 'WhatsApp Status (vertical 9:16, 24h)',
    WHATSAPP_CATALOG: 'WhatsApp Catálogo (produtos/serviços)',
  };

  // Build user message with interpolated variables
  const userMessage = `Crie uma legenda para redes sociais sobre: "${data.topic}"

**Contexto:**
- Plataforma/Tipo: ${postTypeGuide[data.postType] || data.postType}
- Tom de voz: ${toneGuide[data.tone]}
- Tamanho: ${lengthGuide[data.length]}
${data.includeEmojis ? '- Inclua emojis relevantes' : '- Não use emojis'}
${data.includeCTA ? '- Inclua um call-to-action claro (ex: "Comente abaixo", "Clique no link da bio", "Peça já")' : '- Não inclua call-to-action'}

**Diretrizes:**
- Use linguagem natural e autêntica
- Adapte o conteúdo para o formato ${data.postType}
- Seja engajador e relevante para o público de confeitaria/doces
- Inclua 3-5 hashtags relevantes no final`;

  return { userMessage };
}

function buildHashtagsPrompt(data: z.infer<typeof hashtagsSchema>) {
  const styleGuide = {
    popular: 'hashtags populares e de alto volume',
    niche: 'hashtags de nicho e específicas',
    mixed: 'mistura de populares e de nicho',
    branded: 'hashtags com nome da marca e campanhas',
  };

  const userMessage = `Gere ${data.count} hashtags para: "${data.topic}"

**Contexto:**
- Tipo de post: ${data.postType}
- Estilo: ${styleGuide[data.style]}

**Requisitos:**
- Todas as hashtags devem começar com #
- Sem espaços nas hashtags
- Relevantes para confeitaria, doces, padaria
- Retorne apenas a lista de hashtags, uma por linha`;

  return { userMessage };
}

function buildImagePrompt(data: z.infer<typeof imageSchema>) {
  const styleGuide = {
    photorealistic: 'fotorrealista, alta qualidade, iluminação natural, detalhes nítidos',
    illustration: 'ilustração digital, estilo artístico, cores vibrantes',
    minimalist: 'minimalista, limpo, espaço negativo, elegância simples',
    vibrant: 'vibrante, colorido, energético, saturado',
    warm: 'aconchegante, tons quentes, iluminação dourada, acolhedor',
    elegant: 'elegante, sofisticado, refinado, luxo discreto',
  };

  const aspectGuide = {
    '1:1': 'quadrado (1:1), ideal para Feed do Instagram',
    '9:16': 'vertical (9:16), ideal para Stories/Reels',
    '4:5': 'retrato (4:5), ideal para Feed do Instagram',
    '16:9': 'horizontal (16:9), ideal para capas/YouTube',
  };

  const userMessage = `Crie uma imagem para confeitaria: "${data.prompt}"

**Estilo visual:** ${styleGuide[data.style]}
**Proporção:** ${aspectGuide[data.aspectRatio]}
**Qualidade:** Alta resolução, profissional, adequada para redes sociais

**Elementos sugeridos:** Doces, bolos, sobremesas, ingredientes, processo de confeitaria, decoração, embalagens`;

  return { userMessage };
}

// System prompts are STATIC - never user-controlled
const SYSTEM_PROMPTS = {
  caption: 'Você é um especialista em marketing de conteúdo para confeitarias e docerias brasileiras. Crie legendas autênticas, engajadoras e adaptadas ao formato solicitado. Sempre responda em português do Brasil.',
  hashtags: 'Você é um especialista em hashtags para redes sociais no nicho de confeitaria brasileira. Gere hashtags relevantes, populares e de nicho. Responda apenas com a lista de hashtags.',
  image: 'Você é um prompt engineer especializado em geração de imagens para confeitaria. Crie prompts detalhados e otimizados para DALL-E 3.',
};

// ============================================
// API Route Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Rate limiting: 20 requests per minute per user (fail-closed in production)
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
    const validation = aiRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: validation.error.flatten() }, { status: 400 });
    }

    const data = validation.data;

    // Build rate limit headers helper
    const setRateLimitHeaders = (response: NextResponse) => {
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    };

    if (data.type === 'caption') {
      const { userMessage } = buildCaptionPrompt(data);

      // Use messages array for system/user separation (Vercel AI SDK)
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        system: SYSTEM_PROMPTS.caption,
        prompt: userMessage,
        temperature: 0.7,
        maxTokens: data.length === 'short' ? 200 : data.length === 'medium' ? 400 : 800,
      });

      const response = NextResponse.json({ content: text.trim() });
      setRateLimitHeaders(response);
      return response;
    }

    if (data.type === 'hashtags') {
      const { userMessage } = buildHashtagsPrompt(data);

      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        system: SYSTEM_PROMPTS.hashtags,
        prompt: userMessage,
        temperature: 0.5,
        maxTokens: 500,
      });

      const hashtags = text
        .split('\n')
        .map((h) => h.trim())
        .filter((h) => h.startsWith('#') && h.length > 1)
        .slice(0, data.count);

      const response = NextResponse.json({ content: hashtags });
      setRateLimitHeaders(response);
      return response;
    }

    if (data.type === 'image') {
      // For DALL-E, we still build a single prompt but with system prompt separation conceptually
      // DALL-E doesn't support system prompt, so we prepend it
      const { userMessage } = buildImagePrompt(data);
      const fullPrompt = `${SYSTEM_PROMPTS.image}\n\n${userMessage}`;

      // Additional sanitization for DALL-E prompt (stricter)
      const dallePrompt = fullPrompt
        .replace(/[<>]/g, '')
        .slice(0, 4000); // DALL-E 3 max prompt length

      try {
        const openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const sizeMap: Record<string, '1024x1024' | '1792x1024' | '1024x1792'> = {
          '1:1': '1024x1024',
          '9:16': '1024x1792',
          '4:5': '1024x1024',
          '16:9': '1792x1024',
        };

        const response = await openaiClient.images.generate({
          model: 'dall-e-3',
          prompt: dallePrompt,
          size: sizeMap[data.aspectRatio] || '1024x1024',
          quality: 'hd',
          n: 1,
        });

        const imageData = response.data?.[0];
        const imageUrl = imageData?.url;
        if (!imageUrl) {
          throw new Error('No image URL returned from DALL-E');
        }

        const apiResponse = NextResponse.json({
          imageUrl,
          prompt: dallePrompt,
        });
        setRateLimitHeaders(apiResponse);
        return apiResponse;
      } catch (error) {
        console.error('DALL-E image generation error:', error);
        return NextResponse.json(
          { error: 'Falha na geração de imagem. Verifique a API key da OpenAI.' },
          { status: 503 }
        );
      }
    }

    const response = NextResponse.json({ error: 'Tipo não suportado' }, { status: 400 });
    setRateLimitHeaders(response);
    return response;
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json({ error: 'Erro ao gerar conteúdo com IA' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Return available AI presets/models
    const presets = await prisma.aIPreset.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ presets });
  } catch (error) {
    console.error('AI presets fetch error:', error);
    return NextResponse.json({ error: 'Erro ao buscar presets' }, { status: 500 });
  }
}