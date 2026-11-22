import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { presetId, input } = body;

    if (!presetId || !input) {
      return NextResponse.json({ error: 'presetId e input são obrigatórios' }, { status: 400 });
    }

    const preset = await prisma.aIPreset.findUnique({
      where: { id: presetId },
    });

    if (!preset) {
      return NextResponse.json({ error: 'Preset não encontrado' }, { status: 404 });
    }

    if (preset.userId !== session.user.id && !preset.isPublic) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Parse input variables
    const variables: Record<string, string> = {};
    const varRegex = /\{\{(\w+)\}\}/g;
    let match;
    while ((match = varRegex.exec(input)) !== null) {
      const [, key] = match;
      const valueStart = input.indexOf('=', match.index);
      const valueEnd = input.indexOf(',', valueStart);
      const value = input.substring(valueStart + 1, valueEnd !== -1 ? valueEnd : input.length).trim();
      variables[key] = value;
    }

    // If no variables parsed, try to parse as key=value pairs
    if (Object.keys(variables).length === 0) {
      const pairs = input.split(',').map((p: string) => p.trim());
      for (const pair of pairs) {
        const [key, value] = pair.split('=').map((s: string) => s.trim());
        if (key && value) variables[key] = value;
      }
    }

    // Replace variables in prompt
    let finalPrompt = preset.prompt;
    for (const [key, value] of Object.entries(variables)) {
      finalPrompt = finalPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    // Select model
    let model;
    if (preset.model.startsWith('gpt') || preset.model.startsWith('o1') || preset.model.startsWith('o3')) {
      model = openai(preset.model);
    } else if (preset.model.startsWith('claude')) {
      model = anthropic(preset.model);
    } else {
      model = openai('gpt-4o-mini');
    }

    // Generate text
    const { text } = await generateText({
      model,
      prompt: finalPrompt,
      temperature: preset.temperature,
      maxTokens: preset.maxTokens,
    });

    return NextResponse.json({ result: text });
  } catch (error) {
    console.error('AI test error:', error);
    return NextResponse.json({ error: 'Erro ao testar preset' }, { status: 500 });
  }
}