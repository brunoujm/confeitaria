import { validateVideoServerSide, PLATFORM_REQUIREMENTS } from '@/lib/video-validation';

describe('Server-side Video Validation', () => {
  // Mock video metadata for testing
  const createMockVideo = (overrides: Partial<{
    duration: number;
    width: number;
    height: number;
    fileSize: number;
    format: string;
  }> = {}) => ({
    duration: 30,
    width: 1080,
    height: 1920,
    fileSize: 5 * 1024 * 1024, // 5MB
    format: 'video/mp4',
    ...overrides,
  });

  describe('REELS validation', () => {
    const requirements = PLATFORM_REQUIREMENTS.REELS;

    test('passes for valid Reels video', () => {
      const video = createMockVideo({ duration: 60, width: 1080, height: 1920 });
      const result = validateVideoServerSide(video, 'REELS');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('fails when duration exceeds 90 seconds', () => {
      const video = createMockVideo({ duration: 120 });
      const result = validateVideoServerSide(video, 'REELS');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duração') && e.includes('excede'))).toBe(true);
    });

    test('warns when duration is close to limit', () => {
      const video = createMockVideo({ duration: 85 }); // 90 * 0.9 = 81, so 85 is close
      const result = validateVideoServerSide(video, 'REELS');
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('próxima ao limite'))).toBe(true);
    });

    test('fails when file size exceeds 4GB', () => {
      const video = createMockVideo({ fileSize: 5 * 1024 * 1024 * 1024 }); // 5GB
      const result = validateVideoServerSide(video, 'REELS');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Tamanho') && e.includes('excede'))).toBe(true);
    });

    test('warns when aspect ratio is not 9:16', () => {
      const video = createMockVideo({ width: 1920, height: 1080 }); // 16:9
      const result = validateVideoServerSide(video, 'REELS');
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('Proporção') && w.includes('9:16'))).toBe(true);
    });

    test('warns when resolution is too low', () => {
      const video = createMockVideo({ width: 640, height: 360 });
      const result = validateVideoServerSide(video, 'REELS');
      expect(result.warnings.some(w => w.includes('Resolução') && w.includes('baixa'))).toBe(true);
    });
  });

  describe('STORIES validation', () => {
    test('fails when duration exceeds 60 seconds', () => {
      const video = createMockVideo({ duration: 90 });
      const result = validateVideoServerSide(video, 'STORIES');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duração') && e.includes('excede'))).toBe(true);
    });

    test('warns when aspect ratio is not 9:16', () => {
      const video = createMockVideo({ width: 1080, height: 1080 }); // 1:1
      const result = validateVideoServerSide(video, 'STORIES');
      expect(result.warnings.some(w => w.includes('Proporção') && w.includes('9:16'))).toBe(true);
    });
  });

  describe('FEED validation', () => {
    test('passes for 1:1 aspect ratio', () => {
      const video = createMockVideo({ width: 1080, height: 1080 });
      const result = validateVideoServerSide(video, 'FEED');
      expect(result.valid).toBe(true);
    });

    test('passes for 4:5 aspect ratio', () => {
      const video = createMockVideo({ width: 1080, height: 1350 });
      const result = validateVideoServerSide(video, 'FEED');
      expect(result.valid).toBe(true);
    });

    test('passes for 16:9 aspect ratio', () => {
      const video = createMockVideo({ width: 1920, height: 1080 });
      const result = validateVideoServerSide(video, 'FEED');
      expect(result.valid).toBe(true);
    });

    test('warns for non-recommended aspect ratio', () => {
      const video = createMockVideo({ width: 1080, height: 1920 }); // 9:16 not in FEED recommendations
      const result = validateVideoServerSide(video, 'FEED');
      expect(result.warnings.some(w => w.includes('Proporção') && w.includes('Recomendado'))).toBe(true);
    });
  });

  describe('WHATSAPP_STATUS validation', () => {
    test('fails when duration exceeds 30 seconds', () => {
      const video = createMockVideo({ duration: 45 });
      const result = validateVideoServerSide(video, 'WHATSAPP_STATUS');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duração') && e.includes('excede'))).toBe(true);
    });

    test('fails when file size exceeds 16MB', () => {
      const video = createMockVideo({ fileSize: 20 * 1024 * 1024 });
      const result = validateVideoServerSide(video, 'WHATSAPP_STATUS');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Tamanho') && e.includes('excede'))).toBe(true);
    });
  });

  describe('WHATSAPP_CATALOG validation', () => {
    test('passes for 1:1 aspect ratio', () => {
      const video = createMockVideo({ width: 1080, height: 1080 });
      const result = validateVideoServerSide(video, 'WHATSAPP_CATALOG');
      expect(result.valid).toBe(true);
    });

    test('fails when file size exceeds 16MB', () => {
      const video = createMockVideo({ fileSize: 20 * 1024 * 1024 });
      const result = validateVideoServerSide(video, 'WHATSAPP_CATALOG');
      expect(result.valid).toBe(false);
    });
  });

  describe('Error handling', () => {
    test('returns error for corrupted/unreadable video', () => {
      const video = createMockVideo({ duration: 0, width: 0, height: 0 });
      const result = validateVideoServerSide(video, 'REELS');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('returns errors array when multiple validations fail', () => {
      const video = createMockVideo({
        duration: 120, // exceeds REELS limit
        fileSize: 5 * 1024 * 1024 * 1024, // exceeds 4GB
        width: 640,
        height: 360
      });
      const result = validateVideoServerSide(video, 'REELS');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});