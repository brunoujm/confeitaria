import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from '../src/prisma/contract';
import contractJson from '../src/prisma/contract.json';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const prisma = postgres({ contract: contractFromJson<Contract>(contractJson), url: process.env.DATABASE_URL! }) as any;

async function main() {
  console.log('🌱 Starting database seed...');

  const password = await bcrypt.hash('123456', 12);

  // Create users
  const user1 = await prisma.user.upsert({
    where: { email: 'voce@email.com' },
    update: {},
    create: {
      email: 'voce@email.com',
      name: 'Você',
      password,
      role: 'OWNER',
      emailNotifications: true,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'esposa@email.com' },
    update: {},
    create: {
      email: 'esposa@email.com',
      name: 'Esposa',
      password,
      role: 'OWNER',
      emailNotifications: true,
    },
  });

  console.log('✅ Users created:', user1.name, user2.name);

  // Create BrandIdentity singleton
  const brand = await prisma.brandIdentity.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      name: 'Doce Sabor',
      colors: JSON.stringify({
        primary: '#E85D75',
        secondary: '#F5C6A5',
        accent: '#F8B500',
        background: '#FFFFFF',
        surface: '#F9FAFB',
        text: '#1F2937',
        textMuted: '#6B7280',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      }),
      fonts: JSON.stringify({
        heading: 'Inter',
        body: 'Inter',
      }),
      logos: JSON.stringify({
        main: null,
        dark: null,
        watermark: null,
      }),
      defaultHashtags: JSON.stringify(['#confeitaria', '#docescaseiros', '#boloartesanal']),
      isDefault: true,
      userId: user1.id,
    },
  });

  console.log('✅ Brand identity created:', brand.name);

  // Create AIConfig for each user
  for (const user of [user1, user2]) {
    await prisma.aIConfig.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        openaiModel: 'gpt-4o',
        anthropicModel: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        maxTokens: 2000,
        systemPrompt: null,
      },
    });
  }

  console.log('✅ AI config created for both users');

  // Default presets
  const presets = [
    {
      id: 'default-caption',
      name: 'Legenda Padrão',
      type: 'CAPTION' as const,
      prompt: 'Você é um social media de confeitaria artesanal. Tom: acolhedor, apetitoso, brasileiro. Inclua CTA para ação. Produto: {produto}. Ocasião: {ocasiao}.',
      variables: JSON.stringify({ produto: 'Nome do produto (ex: Bolo de Cenoura)', ocasiao: 'Ocasião especial (ex: Natal, Aniversário)' }),
      model: 'gpt-4o',
      isDefault: true,
    },
    {
      id: 'default-hashtags',
      name: 'Hashtags Padrão',
      type: 'HASHTAGS' as const,
      prompt: 'Gere 15 hashtags relevantes para confeitaria no Brasil, misture populares e nicho. Produto: {produto}. Localização: Brasil.',
      variables: JSON.stringify({ produto: 'Nome do produto' }),
      model: 'gpt-4o',
      isDefault: true,
    },
    {
      id: 'default-image',
      name: 'Imagem Padrão',
      type: 'IMAGE' as const,
      prompt: 'Foto profissional de {produto}, iluminação natural, fundo limpo, estilo lifestyle, alta resolução, cores da marca: {primaryColor}, {secondaryColor}.',
      variables: JSON.stringify({ produto: 'Nome do produto', primaryColor: 'Cor primária da marca', secondaryColor: 'Cor secundária da marca' }),
      model: 'dall-e-3',
      isDefault: true,
    },
  ];

  for (const preset of presets) {
    await prisma.aIPreset.upsert({
      where: { id: preset.id },
      update: {},
      create: {
        ...preset,
        userId: user1.id,
      },
    });
  }

  console.log('✅ Default AI presets created');

  // Create sample posts
  const samplePosts = [
    {
      title: 'Bolo de Cenoura com Cobertura de Chocolate',
      caption: 'Nosso clássico bolo de cenoura está de volta! 🥕🍫 Feito com cenouras orgânicas, massa fofinha e uma cobertura de chocolate belga irresistível. Perfeito para o café da tarde! ☕\n\nPeça já o seu pelo WhatsApp! 👇',
      hashtags: JSON.stringify(['#bolodecenoura', '#confeitariaartesanal', '#docescaseiros', '#cafedatarde', '#bolocaseiro']),
      type: 'FEED' as const,
      status: 'PUBLISHED' as const,
      scheduledAt: new Date('2026-11-10T10:00:00'),
      publishedAt: new Date('2026-11-10T10:00:00'),
      authorId: user1.id,
    },
    {
      title: 'Bastidores: Decoração de Bolo de Aniversário',
      caption: 'Vem ver como fazemos a mágica acontecer! ✨ Cada detalhe pensado com carinho para o seu dia especial. 🎂\n\n#bastidores #confeitaria #bolodeaniversario',
      hashtags: JSON.stringify(['#bastidores', '#confeitariaartesanal', '#bolodeaniversario', '#decoracaodebolo', '#feitoamao']),
      type: 'STORIES' as const,
      status: 'APPROVED' as const,
      scheduledAt: new Date('2026-11-12T14:00:00'),
      authorId: user2.id,
    },
    {
      title: 'Reels: Como fazer a cobertura perfeita',
      caption: 'O segredo da cobertura brilhante e lisa! 🍫✨ Temperagem correta do chocolate faz toda a diferença. Salva esse vídeo para não esquecer! 💾\n\n#reels #dica #confeitaria #cobertura',
      hashtags: JSON.stringify(['#reels', '#dicadeconfeitaria', '#coberturadechocolate', '#temperagem', '#confeiteiro']),
      type: 'REELS' as const,
      status: 'DRAFT' as const,
      scheduledAt: new Date('2026-11-15T16:00:00'),
      authorId: user1.id,
    },
  ];

  for (const postData of samplePosts) {
    const post = await prisma.post.create({
      data: {
        ...postData,
        media: {
          create: [
            {
              url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800',
              type: 'IMAGE',
              size: 245000,
              width: 800,
              height: 800,
            },
          ],
        },
      },
    });
    console.log('✅ Post created:', post.title);
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });