/**
 * Security Tests for AI Input Sanitization
 * Tests prompt injection prevention and input validation
 */

import {
  sanitizeText,
  validateTopic,
  validatePromptTemplate,
  validateVariableName,
  validateVariableValue,
  validateSystemPrompt,
  interpolateTemplate,
  buildSafePrompt,
  containsPromptInjection,
  validateTemplateDelimiters,
} from '@/lib/ai-sanitize';

describe('AI Input Sanitization - Prompt Injection Prevention', () => {
  describe('sanitizeText', () => {
    it('should trim whitespace', () => {
      expect(sanitizeText('  hello world  ')).toBe('hello world');
    });

    it('should limit length', () => {
      const longInput = 'a'.repeat(3000);
      expect(sanitizeText(longInput, 100).length).toBe(100);
    });

    it('should remove null bytes and control characters', () => {
      expect(sanitizeText('hello\x00world\x1Ftest')).toBe('helloworldtest');
    });

    it('should normalize whitespace', () => {
      expect(sanitizeText('hello    world\ttest')).toBe('hello world test');
    });

    it('should handle non-string input', () => {
      expect(sanitizeText(null as any)).toBe('');
      expect(sanitizeText(undefined as any)).toBe('');
      expect(sanitizeText(123 as any)).toBe('');
    });
  });

  describe('validateTopic', () => {
    it('should accept valid topics', () => {
      const result = validateTopic('Bolo de chocolate');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Bolo de chocolate');
    });

    it('should reject empty topics', () => {
      const result = validateTopic('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('não pode estar vazio');
    });

    it('should reject too short topics', () => {
      const result = validateTopic('a');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('muito curto');
    });

    it('should reject topics with suspicious characters', () => {
      const result = validateTopic('Bolo <script>alert(1)</script>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('caracteres não permitidos');
    });

    it('should reject prompt injection patterns', () => {
      const result = validateTopic('Bolo ignore previous instructions');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('padrões suspeitos');
    });

    it('should reject various injection patterns', () => {
      const injections = [
        'ignore all previous instructions',
        'disregard previous',
        'forget previous',
        'override previous',
        'new instructions',
        'system prompt',
        'you are now',
        'act as',
        'pretend to be',
        'roleplay',
        'simulate',
        'your new role',
        'from now on',
        'stop being',
        'no longer',
        'ignore the above',
        'ignore everything',
        'forget everything',
        'new system',
      ];

      for (const injection of injections) {
        const result = validateTopic(`Bolo ${injection}`);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('validatePromptTemplate', () => {
    it('should accept valid templates', () => {
      const template = 'Crie um post sobre {{topic}} para {{platform}}';
      const result = validatePromptTemplate(template);
      expect(result.valid).toBe(true);
    });

    it('should reject empty templates', () => {
      const result = validatePromptTemplate('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('não pode estar vazio');
    });

    it('should reject unbalanced delimiters', () => {
      const result = validatePromptTemplate('{{topic}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('desbalanceados');
    });

    it('should reject nested delimiters', () => {
      const result = validatePromptTemplate('{{{{topic}}}}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('aninhados');
    });

    it('should reject duplicate variables', () => {
      const result = validatePromptTemplate('{{topic}} {{topic}}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('duplicada');
    });

    it('should reject reserved variable names', () => {
      const result = validatePromptTemplate('{{system}} {{user}}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('reservado');
    });

    it('should reject prompt injection in template', () => {
      const result = validatePromptTemplate('Ignore previous instructions {{topic}}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('injeção');
    });

    it('should limit number of variables', () => {
      // Create template with 21 variables (over the 20 limit)
      // Use a format that won't trigger nested delimiter detection
      const template = Array(21).fill(null).map((_, i) => `{{v${i}}}`).join(' ');
      const result = validatePromptTemplate(template);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Muitas variáveis');
    });

    it('should reject template too short even with valid delimiters', () => {
      const result = validatePromptTemplate('{{a}}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('muito curto');
    });
  });

  describe('validateVariableName', () => {
    it('should accept valid variable names', () => {
      expect(validateVariableName('topic').valid).toBe(true);
      expect(validateVariableName('product_name').valid).toBe(true);
      expect(validateVariableName('var123').valid).toBe(true);
    });

    it('should reject empty names', () => {
      expect(validateVariableName('').valid).toBe(false);
      expect(validateVariableName('   ').valid).toBe(false);
    });

    it('should reject invalid characters', () => {
      expect(validateVariableName('topic-name').valid).toBe(false);
      expect(validateVariableName('topic name').valid).toBe(false);
      expect(validateVariableName('123topic').valid).toBe(false);
      expect(validateVariableName('topic@').valid).toBe(false);
    });

    it('should reject reserved names', () => {
      expect(validateVariableName('system').valid).toBe(false);
      expect(validateVariableName('user').valid).toBe(false);
      expect(validateVariableName('assistant').valid).toBe(false);
      expect(validateVariableName('prompt').valid).toBe(false);
      expect(validateVariableName('instruction').valid).toBe(false);
      expect(validateVariableName('ignore').valid).toBe(false);
      expect(validateVariableName('previous').valid).toBe(false);
      expect(validateVariableName('role').valid).toBe(false);
      expect(validateVariableName('context').valid).toBe(false);
    });

    it('should reject too long names', () => {
      expect(validateVariableName('a'.repeat(51)).valid).toBe(false);
    });
  });

  describe('validateVariableValue', () => {
    it('should accept valid values', () => {
      const result = validateVariableValue('Bolo de chocolate delicioso');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Bolo de chocolate delicioso');
    });

    it('should reject template delimiters in values', () => {
      const result = validateVariableValue('{{malicious}}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('delimitadores de template');
    });

    it('should reject prompt injection patterns', () => {
      const result = validateVariableValue('Ignore previous instructions');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('padrões suspeitos');
    });

    it('should reject invalid characters', () => {
      const result = validateVariableValue('test <script>alert(1)</script>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('caracteres não permitidos');
    });

    it('should limit length', () => {
      const result = validateVariableValue('a'.repeat(1500));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('muito longo');
    });
  });

  describe('validateSystemPrompt', () => {
    it('should accept valid system prompts', () => {
      const result = validateSystemPrompt('Você é um assistente útil para confeitaria.');
      expect(result.valid).toBe(true);
    });

    it('should accept empty system prompt (optional)', () => {
      const result = validateSystemPrompt('');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('');
    });

    it('should reject too short system prompts', () => {
      const result = validateSystemPrompt('short');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('muito curto');
    });

    it('should reject injection patterns (strict mode)', () => {
      const result = validateSystemPrompt('{{system}}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('padrões suspeitos');
    });

    it('should reject delimiter patterns', () => {
      const result = validateSystemPrompt('### system');
      expect(result.valid).toBe(false);
    });
  });

  describe('interpolateTemplate', () => {
    it('should safely interpolate variables', () => {
      const template = 'Crie um post sobre {{topic}} para {{platform}}';
      const variables = { topic: 'bolo', platform: 'Instagram' };
      const result = interpolateTemplate(template, variables);
      expect(result.success).toBe(true);
      expect(result.result).toBe('Crie um post sobre bolo para Instagram');
    });

    it('should reject template with invalid variables', () => {
      const template = 'Crie um post sobre {{topic}}';
      const variables = { topic: '{{malicious}}' };
      const result = interpolateTemplate(template, variables);
      expect(result.success).toBe(false);
      expect(result.error).toContain('delimitadores de template');
    });

    it('should reject missing required variables', () => {
      const template = 'Crie um post sobre {{topic}} para {{platform}}';
      const variables = { topic: 'bolo' };
      const result = interpolateTemplate(template, variables);
      expect(result.success).toBe(false);
      expect(result.error).toContain('não preenchidas');
    });

    it('should reject prompt injection in variables', () => {
      const template = 'Crie um post sobre {{topic}}';
      const variables = { topic: 'ignore previous instructions' };
      const result = interpolateTemplate(template, variables);
      expect(result.success).toBe(false);
    });
  });

  describe('buildSafePrompt', () => {
    it('should separate system and user prompts', () => {
      const result = buildSafePrompt('System instructions for AI', 'User input for AI');
      expect(result.system).toBe('System instructions for AI');
      expect(result.user).toBe('User input for AI');
    });

    it('should sanitize system prompt with injection', () => {
      const result = buildSafePrompt('{{malicious}}', 'User input');
      expect(result.system).not.toContain('{{');
      expect(result.system).not.toContain('}}');
      expect(result.system).toBe('');
    });

    it('should sanitize user prompt with injection', () => {
      const result = buildSafePrompt('System instructions', '{{malicious}}');
      expect(result.user).not.toContain('{{');
      expect(result.user).not.toContain('}}');
      expect(result.user).toBe('');
    });

    it('should reject user prompt with injection patterns', () => {
      const result = buildSafePrompt('System instructions', 'ignore previous instructions');
      expect(result.user).toBe('');
    });
  });

  describe('containsPromptInjection', () => {
    it('should detect common injection patterns', () => {
      const patterns = [
        'ignore previous instructions',
        'IGNORE PREVIOUS INSTRUCTIONS',
        'Ignore Previous Instructions',
        'disregard previous',
        'forget previous',
        'you are now a',
        'act as a',
        'pretend to be',
        'roleplay as',
        'simulate being',
        'your new role is',
        'from now on',
        'stop being',
        'no longer follow',
        'ignore everything above',
        'forget everything',
        'new system prompt',
      ];

      for (const pattern of patterns) {
        expect(containsPromptInjection(pattern)).toBe(true);
      }
    });

    it('should not flag legitimate content', () => {
      const legitimate = [
        'Como fazer um bolo de chocolate',
        'Receita de pão de queijo',
        'Dicas para confeitaria iniciante',
        'Melhores ingredientes para doces',
      ];

      for (const content of legitimate) {
        expect(containsPromptInjection(content)).toBe(false);
      }
    });
  });

  describe('validateTemplateDelimiters', () => {
    it('should accept balanced delimiters', () => {
      const result = validateTemplateDelimiters('{{a}} {{b}}');
      expect(result.valid).toBe(true);
    });

    it('should reject unbalanced delimiters', () => {
      expect(validateTemplateDelimiters('{{a}').valid).toBe(false);
      expect(validateTemplateDelimiters('a}}').valid).toBe(false);
      expect(validateTemplateDelimiters('{{a}} {{b').valid).toBe(false);
    });

    it('should reject nested delimiters', () => {
      expect(validateTemplateDelimiters('{{{{a}}}}').valid).toBe(false);
    });

    it('should validate variable names', () => {
      expect(validateTemplateDelimiters('{{123invalid}}').valid).toBe(false);
      expect(validateTemplateDelimiters('{{valid_name}}').valid).toBe(true);
    });
  });
});