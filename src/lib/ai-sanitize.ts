/**
 * AI Input Sanitization Utilities
 * Defense-in-depth approach to prevent prompt injection attacks
 */

// Allowed characters for different input types
const ALLOWED_CHARS = {
  // General text: letters, numbers, spaces, basic punctuation, Portuguese accents
  general: /^[\p{L}\p{N}\s.,!?;:()\-\/\\@#$%&*+=\[\]{}|_~'"`<>]*$/u,
  // Topic/topic-like: more restrictive
  topic: /^[\p{L}\p{N}\s.,!?;:()\-_]*$/u,
  // Prompt template: allows template delimiters but validated separately
  template: /^[\p{L}\p{N}\s.,!?;:()\-\/\\@#$%&*+=\[\]{}|_~'"`{}]*$/u,
  // Variable names: alphanumeric + underscore only
  variableName: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  // Variable values: general text but no template delimiters
  variableValue: /^[\p{L}\p{N}\s.,!?;:()\-\/\\@#$%&*+=\[\]{}|_~'"`]*$/u,
};

// Maximum lengths for different input types
const MAX_LENGTHS = {
  topic: 200,
  prompt: 5000,
  promptTemplate: 10000,
  variableName: 50,
  variableValue: 1000,
  systemPrompt: 2000,
};

/**
 * Validates and sanitizes a general text input
 */
export function sanitizeText(input: string, maxLength: number = 2000): string {
  if (typeof input !== 'string') return '';

  // Trim and limit length
  let sanitized = input.trim().slice(0, maxLength);

  // Remove null bytes and control characters (except newline/tab)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Validates a topic/subject input (more restrictive)
 */
export function validateTopic(input: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeText(input, MAX_LENGTHS.topic);

  if (!sanitized) {
    return { valid: false, sanitized: '', error: 'Tópico não pode estar vazio' };
  }

  if (sanitized.length < 2) {
    return { valid: false, sanitized, error: 'Tópico muito curto (mínimo 2 caracteres)' };
  }

  if (!ALLOWED_CHARS.topic.test(sanitized)) {
    return { valid: false, sanitized, error: 'Tópico contém caracteres não permitidos' };
  }

  // Check for prompt injection patterns
  if (containsPromptInjection(sanitized)) {
    return { valid: false, sanitized, error: 'Tópico contém padrões suspeitos' };
  }

  return { valid: true, sanitized };
}

/**
 * Validates a prompt template (used in presets)
 */
export function validatePromptTemplate(input: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeText(input, MAX_LENGTHS.promptTemplate);

  if (!sanitized) {
    return { valid: false, sanitized: '', error: 'Prompt não pode estar vazio' };
  }

  // Validate template delimiters FIRST (before length check for templates)
  const delimiterCheck = validateTemplateDelimiters(sanitized);
  if (!delimiterCheck.valid) {
    return { valid: false, sanitized, error: delimiterCheck.error };
  }

  if (sanitized.length < 10) {
    return { valid: false, sanitized, error: 'Prompt muito curto (mínimo 10 caracteres)' };
  }

  if (!ALLOWED_CHARS.template.test(sanitized)) {
    return { valid: false, sanitized, error: 'Prompt contém caracteres não permitidos' };
  }

  // Check for prompt injection patterns
  if (containsPromptInjection(sanitized)) {
    return { valid: false, sanitized, error: 'Prompt contém padrões suspeitos de injeção' };
  }

  return { valid: true, sanitized };
}

/**
 * Validates a variable name (for template variables)
 */
export function validateVariableName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Nome da variável não pode estar vazio' };
  }

  const trimmed = name.trim();

  if (trimmed.length > MAX_LENGTHS.variableName) {
    return { valid: false, error: `Nome da variável muito longo (máx. ${MAX_LENGTHS.variableName} caracteres)` };
  }

  if (!ALLOWED_CHARS.variableName.test(trimmed)) {
    return { valid: false, error: 'Nome da variável deve conter apenas letras, números e underscore' };
  }

  // Reserved names that could be used for injection
  const reserved = ['system', 'user', 'assistant', 'prompt', 'instruction', 'ignore', 'previous', 'role', 'context'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return { valid: false, error: 'Nome da variável é reservado' };
  }

  return { valid: true };
}

/**
 * Validates a variable value (user input for template substitution)
 */
export function validateVariableValue(value: string): { valid: boolean; sanitized: string; error?: string } {
  if (typeof value !== 'string') {
    return { valid: false, sanitized: '', error: 'Valor deve ser uma string' };
  }

  // Check length BEFORE sanitization (original input length)
  if (value.length > MAX_LENGTHS.variableValue) {
    const sanitized = sanitizeText(value, MAX_LENGTHS.variableValue);
    return { valid: false, sanitized, error: `Valor muito longo (máx. ${MAX_LENGTHS.variableValue} caracteres)` };
  }

  const sanitized = sanitizeText(value, MAX_LENGTHS.variableValue);

  // Check for template delimiters in value (prevents delimiter escaping)
  if (sanitized.includes('{{') || sanitized.includes('}}')) {
    return { valid: false, sanitized, error: 'Valor não pode conter delimitadores de template' };
  }

  if (!ALLOWED_CHARS.variableValue.test(sanitized)) {
    return { valid: false, sanitized, error: 'Valor contém caracteres não permitidos' };
  }

  // Check for prompt injection patterns
  if (containsPromptInjection(sanitized)) {
    return { valid: false, sanitized, error: 'Valor contém padrões suspeitos' };
  }

  return { valid: true, sanitized };
}

/**
 * Validates system prompt (for AI config)
 */
export function validateSystemPrompt(input: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeText(input, MAX_LENGTHS.systemPrompt);

  if (!sanitized) {
    return { valid: true, sanitized: '' }; // System prompt is optional
  }

  if (sanitized.length < 10) {
    return { valid: false, sanitized, error: 'System prompt muito curto (mínimo 10 caracteres)' };
  }

  // Check for prompt injection patterns (more strict for system prompt)
  if (containsPromptInjection(sanitized, true)) {
    return { valid: false, sanitized, error: 'System prompt contém padrões suspeitos' };
  }

  return { valid: true, sanitized };
}

/**
 * Checks for common prompt injection patterns
 * Exported for testing
 */
export function containsPromptInjection(input: string, strict: boolean = false): boolean {
  const lower = input.toLowerCase();

  // Direct instruction overrides
  const injectionPatterns = [
    'ignore previous instructions',
    'ignore all previous',
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
    'ignore the below',
    'ignore everything',
    'forget everything',
    'new system',
    'change your',
    'you must',
    'you will',
    'you should',
    'obey',
    'comply',
    'execute',
    'run',
    'eval',
    'execute code',
    'system:',
    'user:',
    'assistant:',
  ];

  // Check for patterns
  for (const pattern of injectionPatterns) {
    if (lower.includes(pattern)) {
      return true;
    }
  }

  // Strict mode: check for delimiter manipulation attempts
  if (strict) {
    const strictPatterns = [
      '{{',
      '}}',
      '{system}',
      '{user}',
      '{assistant}',
      '[system]',
      '[user]',
      '[assistant]',
      '<system>',
      '<user>',
      '<assistant>',
      '###',
      '---',
      '|||',
      '<<<',
      '>>>',
    ];

    for (const pattern of strictPatterns) {
      if (lower.includes(pattern)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validates template delimiters are balanced and well-formed
 */
export function validateTemplateDelimiters(template: string): { valid: boolean; error?: string } {
  const openDelimiters = (template.match(/\{\{/g) || []).length;
  const closeDelimiters = (template.match(/\}\}/g) || []).length;

  if (openDelimiters !== closeDelimiters) {
    return { valid: false, error: 'Delimitadores de template desbalanceados' };
  }

  // Check for nested delimiters (actual nesting: {{...{{...}}...}})
  // This regex looks for {{ followed by another {{ before the first }}
  const nestedPattern = /\{\{[^{}]*\{\{[^{}]*\}\}[^{}]*\}\}/;
  if (nestedPattern.test(template)) {
    return { valid: false, error: 'Delimitadores de template aninhados não são permitidos' };
  }

  // Extract variable names and validate each
  const varRegex = /\{\{(\w+)\}\}/g;
  let match;
  const variables = new Set<string>();

  while ((match = varRegex.exec(template)) !== null) {
    const varName = match[1];
    if (variables.has(varName)) {
      return { valid: false, error: `Variável duplicada: ${varName}` };
    }
    const validation = validateVariableName(varName);
    if (!validation.valid) {
      return { valid: false, error: `Variável inválida "${varName}": ${validation.error}` };
    }
    variables.add(varName);
  }

  // Limit number of variables
  if (variables.size > 20) {
    return { valid: false, error: 'Muitas variáveis no template (máx. 20)' };
  }

  return { valid: true };
}

/**
 * Safely interpolates variables into a template
 * Validates all variables before substitution
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string>
): { success: boolean; result?: string; error?: string } {
  // First validate template
  const templateValidation = validatePromptTemplate(template);
  if (!templateValidation.valid) {
    return { success: false, error: templateValidation.error };
  }

  // Validate all variable values
  const sanitizedVars: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    const varValidation = validateVariableValue(value);
    if (!varValidation.valid) {
      return { success: false, error: `Variável "${key}": ${varValidation.error}` };
    }
    sanitizedVars[key] = varValidation.sanitized;
  }

  // Perform substitution
  let result = template;
  for (const [key, value] of Object.entries(sanitizedVars)) {
    // Escape special regex characters in key
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g'), value);
  }

  // Check for unsubstituted variables
  const remainingVars = result.match(/\{\{\w+\}\}/g);
  if (remainingVars && remainingVars.length > 0) {
    return { success: false, error: `Variáveis não preenchidas: ${remainingVars.join(', ')}` };
  }

  return { success: true, result };
}

/**
 * Builds a safe prompt using Vercel AI SDK's system/user message separation
 * This is the recommended approach to prevent prompt injection
 */
export function buildSafePrompt(
  systemPrompt: string,
  userPrompt: string
): { system: string; user: string } {
  // Validate and sanitize system prompt
  const sysValidation = validateSystemPrompt(systemPrompt);
  const validatedSystem = sysValidation.valid ? sysValidation.sanitized : '';

  // For user prompt, sanitize and check for injection + template delimiters
  const sanitizedUser = sanitizeText(userPrompt, MAX_LENGTHS.prompt);
  const hasInjection = containsPromptInjection(sanitizedUser);
  const hasDelimiters = sanitizedUser.includes('{{') || sanitizedUser.includes('}}');
  const validatedUser = (hasInjection || hasDelimiters) ? '' : sanitizedUser;

  return {
    system: validatedSystem,
    user: validatedUser,
  };
}

export { MAX_LENGTHS, ALLOWED_CHARS };