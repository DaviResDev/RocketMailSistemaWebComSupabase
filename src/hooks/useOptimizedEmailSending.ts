
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailData {
  to: string;
  contato_id: string;
  template_id: string;
  contato_nome: string;
  subject?: string;
  content?: string;
  template_nome?: string;
  contact?: any;
}

interface BatchResult {
  success: boolean;
  message: string;
  summary: {
    successful: number;
    failed: number;
    totalDuration: number;
    avgThroughput: number;
    successRate: string;
  };
  results: any[];
}

interface OptimizedSendingOptions {
  maxRetries?: number;
  retryDelay?: number;
  chunkSize?: number;
  maxConcurrent?: number;
  enableFallback?: boolean;
}

export function useOptimizedEmailSending() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [lastResult, setLastResult] = useState<BatchResult | null>(null);

  const sendEmailsWithRetry = useCallback(async (
    emailsData: EmailData[],
    templateId: string,
    options: OptimizedSendingOptions = {}
  ): Promise<boolean> => {
    const {
      maxRetries = 3,
      retryDelay = 2000,
      chunkSize = 25,
      maxConcurrent = 15,
      enableFallback = true
    } = options;

    setIsProcessing(true);
    setProgress({ current: 0, total: emailsData.length });

    let attempt = 0;
    let lastError: Error | null = null;
    let currentRetryDelay = retryDelay; // Create mutable local variable

    while (attempt < maxRetries) {
      try {
        attempt++;
        console.log(`📧 Attempt ${attempt}/${maxRetries} for ${emailsData.length} emails`);

        // Get user settings for SMTP
        const { data: userSettings, error: settingsError } = await supabase
          .from('configuracoes')
          .select('signature_image, email_usuario, use_smtp, smtp_host, smtp_pass, smtp_from_name, email_porta, smtp_seguranca')
          .single();

        if (settingsError && attempt === 1) {
          console.warn('⚠️ Could not fetch user settings:', settingsError);
        }

        // Prepare SMTP settings
        const smtpSettings = userSettings?.use_smtp && userSettings?.smtp_host ? {
          host: userSettings.smtp_host,
          port: userSettings.email_porta || 587,
          secure: userSettings.smtp_seguranca === 'ssl' || userSettings.email_porta === 465,
          password: userSettings.smtp_pass,
          from_name: userSettings.smtp_from_name || '',
          from_email: userSettings.email_usuario || ''
        } : null;

        const batchRequestData = {
          batch: true,
          emails: emailsData,
          smtp_settings: smtpSettings,
          use_smtp: userSettings?.use_smtp || false,
          gmail_optimized: emailsData.length >= 1000,
          max_concurrent: maxConcurrent,
          chunk_size: chunkSize,
          target_throughput: emailsData.length >= 1000 ? 50 : 12
        };

        console.log(`🚀 Sending batch request (attempt ${attempt}):`, {
          total_emails: emailsData.length,
          use_smtp: userSettings?.use_smtp || false,
          has_smtp_settings: !!smtpSettings,
          gmail_optimized: batchRequestData.gmail_optimized
        });

        const response = await supabase.functions.invoke('send-email', {
          body: batchRequestData
        });

        if (response.error) {
          throw new Error(`Edge function error: ${response.error.message || response.error}`);
        }

        const responseData = response.data;
        if (!responseData || !responseData.success) {
          throw new Error(responseData?.error || "Batch send failed");
        }

        console.log('✅ Batch send completed successfully:', responseData);

        // Update progress to completion
        setProgress({ current: emailsData.length, total: emailsData.length });

        // Store result for reference
        setLastResult(responseData);

        // Show success toast
        const { summary } = responseData;
        if (summary.successful > 0) {
          toast.success(
            `🎉 ${summary.successful} emails sent successfully! (${summary.successRate}% success rate)`,
            {
              description: `Completed in ${summary.totalDuration}s at ${summary.avgThroughput.toFixed(1)} emails/s`,
              duration: 5000
            }
          );
        }

        if (summary.failed > 0) {
          toast.warning(
            `⚠️ ${summary.failed} emails failed to send`,
            {
              description: `Success rate: ${summary.successRate}%`,
              duration: 8000
            }
          );
        }

        setIsProcessing(false);
        return true;

      } catch (error: any) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          console.log(`⏳ Waiting ${currentRetryDelay}ms before retry...`);
          toast.info(`Attempt ${attempt} failed, retrying in ${currentRetryDelay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, currentRetryDelay));
          // Exponential backoff using the mutable local variable
          currentRetryDelay *= 1.5;
        }
      }
    }

    // All retries failed
    setIsProcessing(false);
    const errorMessage = lastError?.message || 'Unknown error';
    
    if (enableFallback) {
      toast.error(
        `❌ All ${maxRetries} attempts failed`,
        {
          description: `Error: ${errorMessage}. Please check your settings and try again.`,
          duration: 10000,
          action: {
            label: "Retry",
            onClick: () => sendEmailsWithRetry(emailsData, templateId, options)
          }
        }
      );
    } else {
      toast.error(
        `❌ Email sending failed after ${maxRetries} attempts`,
        {
          description: errorMessage,
          duration: 10000
        }
      );
    }

    return false;
  }, []);

  const sendSingleEmail = useCallback(async (emailData: EmailData): Promise<boolean> => {
    return sendEmailsWithRetry([emailData], emailData.template_id, {
      maxRetries: 2,
      retryDelay: 1000,
      chunkSize: 1,
      maxConcurrent: 1
    });
  }, [sendEmailsWithRetry]);

  const sendBulkEmails = useCallback(async (
    emailsData: EmailData[],
    templateId: string,
    options?: OptimizedSendingOptions
  ): Promise<boolean> => {
    // Optimize settings based on volume
    const optimizedOptions = {
      maxRetries: 3,
      retryDelay: 2000,
      chunkSize: emailsData.length >= 1000 ? 50 : 25,
      maxConcurrent: emailsData.length >= 1000 ? 25 : 15,
      enableFallback: true,
      ...options
    };

    return sendEmailsWithRetry(emailsData, templateId, optimizedOptions);
  }, [sendEmailsWithRetry]);

  return {
    isProcessing,
    progress,
    lastResult,
    sendSingleEmail,
    sendBulkEmails,
    sendEmailsWithRetry
  };
}
