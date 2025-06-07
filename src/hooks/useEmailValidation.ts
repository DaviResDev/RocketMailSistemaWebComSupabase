
import { useState, useCallback } from 'react';
import { validateEmailBatch, filterValidEmails, getValidationStats } from '@/utils/emailValidation';
import { toast } from 'sonner';

interface ValidationProgress {
  current: number;
  total: number;
  percentage: number;
  isValidating: boolean;
}

export function useEmailValidation() {
  const [validationProgress, setValidationProgress] = useState<ValidationProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    isValidating: false
  });

  const [validationResults, setValidationResults] = useState<Map<string, any>>(new Map());

  const validateContacts = useCallback(async (contacts: any[]) => {
    if (!contacts || contacts.length === 0) {
      toast.error('Nenhum contato para validar');
      return { validContacts: [], invalidContacts: [], stats: null };
    }

    setValidationProgress({
      current: 0,
      total: contacts.length,
      percentage: 0,
      isValidating: true
    });

    try {
      console.log(`🔍 Iniciando validação de ${contacts.length} emails`);
      
      // Extrair emails únicos
      const emails = [...new Set(contacts.map(c => c.email?.toLowerCase()).filter(Boolean))];
      
      // Simulação de progresso para melhor UX
      const progressInterval = setInterval(() => {
        setValidationProgress(prev => {
          if (prev.current >= prev.total) return prev;
          const increment = Math.ceil(prev.total / 20);
          const newCurrent = Math.min(prev.current + increment, prev.total);
          return {
            ...prev,
            current: newCurrent,
            percentage: (newCurrent / prev.total) * 100
          };
        });
      }, 200);

      // Validação em lote
      const results = await validateEmailBatch(emails);
      clearInterval(progressInterval);
      
      setValidationResults(results);
      
      // Filtrar contatos válidos e inválidos
      const validContacts = filterValidEmails(contacts, results);
      const invalidContacts = contacts.filter(contact => {
        const result = results.get(contact.email?.toLowerCase());
        return result?.isValid !== true;
      });
      
      // Estatísticas
      const stats = getValidationStats(results);
      const invalidCount = stats.total - stats.valid;
      
      setValidationProgress({
        current: contacts.length,
        total: contacts.length,
        percentage: 100,
        isValidating: false
      });
      
      // Feedback para o usuário
      if (stats.valid === contacts.length) {
        toast.success(`✅ Todos os ${stats.valid} emails são válidos!`, {
          description: '100% dos contatos aprovados para envio',
          duration: 5000
        });
      } else {
        toast.warning(`⚠️ ${invalidCount} emails inválidos removidos da fila`, {
          description: `${stats.valid} emails válidos aprovados para envio`,
          duration: 6000
        });
        
        // Detalhes dos tipos de erro
        if (stats.syntaxErrors > 0) {
          toast.error(`❌ ${stats.syntaxErrors} emails com formato inválido`);
        }
        if (stats.domainErrors > 0) {
          toast.error(`🚫 ${stats.domainErrors} domínios inexistentes`);
        }
        if (stats.disposableEmails > 0) {
          toast.error(`🗑️ ${stats.disposableEmails} emails temporários/descartáveis`);
        }
      }
      
      console.log(`✅ Validação concluída:`, {
        total: stats.total,
        valid: stats.valid,
        invalid: invalidCount,
        successRate: `${((stats.valid / stats.total) * 100).toFixed(1)}%`
      });
      
      return { validContacts, invalidContacts, stats };
      
    } catch (error: any) {
      console.error('Erro na validação:', error);
      toast.error(`Erro na validação: ${error.message}`);
      
      setValidationProgress({
        current: 0,
        total: 0,
        percentage: 0,
        isValidating: false
      });
      
      return { validContacts: contacts, invalidContacts: [], stats: null };
    }
  }, []);

  const resetValidation = useCallback(() => {
    setValidationResults(new Map());
    setValidationProgress({
      current: 0,
      total: 0,
      percentage: 0,
      isValidating: false
    });
  }, []);

  return {
    validateContacts,
    resetValidation,
    validationProgress,
    validationResults,
    isValidating: validationProgress.isValidating
  };
}
