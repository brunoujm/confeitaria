import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { aiRateLimiter, checkRateLimit } from '@/lib/ratelimit';

// Sanitization helper to prevent prompt injection and XSS
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets (prevents HTML/script injection)
    .replace(/ignore previous instructions/gi, '') // Remove prompt injection patterns
    .replace(/system:/gi, '') // Remove system prompt attempts
    .replace(/user:/gi, '') // Remove user prompt attempts
    .replace(/assistant:/gi, '') // Remove assistant prompt attempts
    .trim()
    .slice(0, 2000); // Limit max length
}

function sanitizePromptInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/ignore previous instructions/gi, '')
    .replace(/system:/gi, '')
    .replace(/user:/gi, '')
    .replace(/assistant:/gi, '')
    .trim()
    .slice(0, 5000);
}

const captionSchema = z.object({
  type: z.literal('caption'),
  topic: z.string().min(1),
  tone: z.enum(['professional', 'casual', 'inspirational', 'educational', 'promotional', 'storytelling']),
  length: z.enum(['short', 'medium', 'long']),
  postType: z.string(),
  includeEmojis: z.boolean(),
  includeCTA: z.boolean(),
});

const hashtagsSchema = z.object({
  type: z.literal('hashtags'),
  topic: z.string().min(1),
  count: z.number().int().min(1).max(30),
  style: z.enum(['popular', 'niche', 'mixed', 'branded']),
  postType: z.string(),
});

const imageSchema = z.object({
  type: z.literal('image'),
  prompt: z.string().min(1),
  style: z.enum(['photorealistic', 'illustration', 'minimalist', 'vibrant', 'warm', 'elegant']),
  aspectRatio: z.enum(['1:1', '9:16', '4:5', '16:9']),
});

const aiRequestSchema = z.union([captionSchema, hashtagsSchema, imageSchema]);

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

  const prompt = `Crie uma legenda para redes sociais sobre: "${data.topic}"

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

  return prompt;
}

function buildHashtagsPrompt(data: z.infer<typeof hashtagsSchema>) {
  const styleGuide = {
    popular: 'hashtags populares e de alto volume',
    niche: 'hashtags de nicho e específicas',
    mixed: 'mistura de populares e de nicho',
    branded: 'hashtags com nome da marca e campanhas',
  };

  const prompt = `Gere ${data.count} hashtags para: "${data.topic}"

**Contexto:**
- Tipo de post: ${data.postType}
- Estilo: ${styleGuide[data.style]}

**Requisitos:**
- Todas as hashtags devem começar com #
- Sem espaços nas hashtags
- Relevantes para confeitaria, doces, padaria
- Retorne apenas a lista de hashtags, uma por linha`;

  return prompt;
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

  const prompt = `Crie uma imagem para confeitaria: "${data.prompt}"

**Estilo visual:** ${styleGuide[data.style]}
**Proporção:** ${aspectGuide[data.aspectRatio]}
**Qualidade:** Alta resolução, profissional, adequada para redes sociais

**Elementos sugeridos:** Doces, bolos, sobremesas, ingredientes, processo de confeitaria, decoração, embalagens`;

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Rate limiting: 20 requests per minute per user
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

    // Check rate limits (simplified)
    // In production, use Upstash Redis for proper rate limiting

    if (data.type === 'caption') {
      const sanitizedTopic = sanitizeInput(data.topic);
      const prompt = buildCaptionPrompt({ ...data, topic: sanitizedTopic });

      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        temperature: 0.7,
        maxTokens: data.length === 'short' ? 200 : data.length === 'medium' ? 400 : 800,
      });

      const response = NextResponse.json({ content: text.trim() });
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
      return response;
    }

    if (data.type === 'hashtags') {
      const sanitizedTopic = sanitizeInput(data.topic);
      const prompt = buildHashtagsPrompt({ ...data, topic: sanitizedTopic });

      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        temperature: 0.5,
        maxTokens: 500,
      });

      const hashtags = text
        .split('\n')
        .map((h) => h.trim())
        .filter((h) => h.startsWith('#') && h.length > 1)
        .slice(0, data.count);

      const response = NextResponse.json({ content: hashtags });
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
      return response;
    }

    if (data.type === 'image') {
      // For image generation, we'd use DALL-E or similar
      // This is a placeholder - in production, integrate with OpenAI DALL-E or similar
      const sanitizedPrompt = sanitizePromptInput(data.prompt);
      const prompt = buildImagePrompt({ ...data, prompt: sanitizedPrompt });

      // Simulate image generation - replace with actual AI image generation
      // const { image } = await generateImage({ model: openai.image('dall-e-3'), prompt, ... });

      // For now, return a placeholder
      const response = NextResponse.json({
        imageUrl: `https://via.placeholder.com/1024x1024?text=Imagem+Gerada+por+IA`,
        prompt: prompt,
      });
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
      return response;
    }

    const response = NextResponse.json({ error: 'Tipo não suportado' }, { status: 400 });
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
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