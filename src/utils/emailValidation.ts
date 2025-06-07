
// Utilitário completo para validação de emails antes do envio SMTP
interface EmailValidationResult {
  isValid: boolean;
  reason?: string;
  type: 'valid' | 'syntax' | 'domain' | 'disposable' | 'mx' | 'blocked';
}

// Lista de domínios temporários/descartáveis mais comuns
const DISPOSABLE_DOMAINS = [
  '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com',
  'temp-mail.org', 'throwaway.email', 'getnada.com', 'yopmail.com',
  'maildrop.cc', 'dispostable.com', 'tmpeml.com', 'sharklasers.com',
  'mailtemp.info', 'trashmail.com', 'mohmal.com', 'tempail.com'
];

// Validação de sintaxe de email
function validateEmailSyntax(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
}

// Verificar se é um domínio descartável
function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.includes(domain);
}

// Verificação DNS de domínio (simulada para frontend)
async function checkDomainExists(domain: string): Promise<boolean> {
  try {
    // Para uma verificação mais robusta, isso seria feito no backend
    // Aqui fazemos uma verificação básica via fetch para testar conectividade
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // timeout de 3s
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return data.Answer && data.Answer.length > 0;
  } catch (error) {
    console.warn(`Falha na verificação DNS para ${domain}:`, error);
    // Em caso de erro na verificação DNS, consideramos válido para não bloquear envios
    return true;
  }
}

// Validação completa do email
export async function validateEmail(email: string): Promise<EmailValidationResult> {
  const cleanEmail = email.trim().toLowerCase();
  
  // 1. Validação de sintaxe
  if (!validateEmailSyntax(cleanEmail)) {
    return {
      isValid: false,
      reason: 'Formato de email inválido',
      type: 'syntax'
    };
  }
  
  // 2. Verificar emails descartáveis
  if (isDisposableEmail(cleanEmail)) {
    return {
      isValid: false,
      reason: 'Email temporário/descartável detectado',
      type: 'disposable'
    };
  }
  
  // 3. Verificação de domínio
  const domain = cleanEmail.split('@')[1];
  const domainExists = await checkDomainExists(domain);
  
  if (!domainExists) {
    return {
      isValid: false,
      reason: 'Domínio não existe ou sem registro MX',
      type: 'domain'
    };
  }
  
  return {
    isValid: true,
    type: 'valid'
  };
}

// Validação em lote
export async function validateEmailBatch(emails: string[]): Promise<Map<string, EmailValidationResult>> {
  const results = new Map<string, EmailValidationResult>();
  
  // Processar em lotes de 10 para não sobrecarregar
  const batchSize = 10;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchPromises = batch.map(async (email) => {
      const result = await validateEmail(email);
      return { email, result };
    });
    
    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(({ email, result }) => {
      results.set(email, result);
    });
    
    // Pequeno delay entre lotes
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Filtrar apenas emails válidos
export function filterValidEmails(contacts: any[], validationResults: Map<string, EmailValidationResult>) {
  return contacts.filter(contact => {
    const result = validationResults.get(contact.email?.toLowerCase());
    return result?.isValid === true;
  });
}

// Obter estatísticas de validação
export function getValidationStats(validationResults: Map<string, EmailValidationResult>) {
  const stats = {
    total: validationResults.size,
    valid: 0,
    syntaxErrors: 0,
    domainErrors: 0,
    disposableEmails: 0,
    blockedEmails: 0
  };
  
  validationResults.forEach(result => {
    if (result.isValid) {
      stats.valid++;
    } else {
      switch (result.type) {
        case 'syntax':
          stats.syntaxErrors++;
          break;
        case 'domain':
        case 'mx':
          stats.domainErrors++;
          break;
        case 'disposable':
          stats.disposableEmails++;
          break;
        case 'blocked':
          stats.blockedEmails++;
          break;
      }
    }
  });
  
  return stats;
}
