
import { useState } from 'react';
import { toast } from 'sonner';

interface BatchProgress {
  current: number;
  total: number;
}

export function useBatchEmailSending() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress>({ current: 0, total: 0 });

  const sendEmailsInBatch = async (
    selectedContacts: any[],
    templateId: string,
    customSubject?: string,
    customContent?: string
  ) => {
    // Email sending functionality has been removed
    console.log("Email sending functionality has been disabled");
    toast.error('Funcionalidade de envio em lote foi removida do sistema. Use apenas para gerenciar templates e contatos.');
    return false;
  };

  const sendBatchEmails = async (emailJobs: any[], options?: any) => {
    // Email sending functionality has been removed
    console.log("Email sending functionality has been disabled");
    toast.error('Funcionalidade de envio em lote foi removida do sistema.');
    return { success: false };
  };

  return {
    isSending: isProcessing, // Keep backward compatibility
    isProcessing,
    progress,
    sendEmailsInBatch,
    sendBatchEmails
  };
}

export default useBatchEmailSending;
