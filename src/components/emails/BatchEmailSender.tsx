
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBatchEmailSending } from '@/hooks/useBatchEmailSending';
import { toast } from 'sonner';
import { Mail, Users, Clock, CheckCircle, XCircle } from 'lucide-react';

interface BatchEmailSenderProps {
  selectedContacts: any[];
  templateId: string;
  customSubject?: string;
  customContent?: string;
  onComplete: () => void;
}

export const BatchEmailSender: React.FC<BatchEmailSenderProps> = ({
  selectedContacts,
  templateId,
  customSubject,
  customContent,
  onComplete
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<any>(null);
  const { sendEmailsInBatch } = useBatchEmailSending();

  const handleBatchSend = useCallback(async () => {
    if (selectedContacts.length === 0) {
      toast.error('Selecione ao menos um contato para envio');
      return;
    }

    if (selectedContacts.length > 10000) {
      toast.error('Limite máximo de 10.000 contatos por lote');
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedContacts.length });
    
    try {
      console.log(`Iniciando envio em lote para ${selectedContacts.length} contatos`);
      
      const startTime = Date.now();
      
      // Use the updated sendEmailsInBatch function with all contact data
      const result = await sendEmailsInBatch(
        selectedContacts,
        templateId,
        customSubject,
        customContent
      );
      
      const totalTime = Date.now() - startTime;
      
      if (result) {
        setResults({
          ...result,
          totalTime: Math.round(totalTime / 1000),
          throughput: Math.round((selectedContacts.length / totalTime) * 1000)
        });
      } else {
        toast.error('O envio falhou. Verifique os logs para mais detalhes.');
      }

    } catch (error: any) {
      console.error('Erro no envio em lote:', error);
      toast.error(`Erro no processamento em lote: ${error.message}`);
    } finally {
      setIsProcessing(false);
      onComplete();
    }
  }, [selectedContacts, templateId, customSubject, customContent, sendEmailsInBatch, onComplete]);

  const resetResults = () => {
    setResults(null);
    setProgress({ current: 0, total: 0 });
  };

  if (results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Relatório de Envio em Lote
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{results.successCount}</div>
              <div className="text-sm text-muted-foreground">Sucessos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{results.errorCount}</div>
              <div className="text-sm text-muted-foreground">Falhas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{results.successRate}%</div>
              <div className="text-sm text-muted-foreground">Taxa Sucesso</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{results.throughput}</div>
              <div className="text-sm text-muted-foreground">Emails/seg</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="outline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tempo total: {results.totalTime}s
            </Badge>
            <Button onClick={resetResults} variant="outline">
              Novo Envio
            </Button>
          </div>

          {results.errorTypes && Object.keys(results.errorTypes).length > 0 && (
            <div className="border rounded-lg p-4 bg-red-50">
              <h4 className="font-medium text-red-800 mb-2">Tipos de Erro:</h4>
              <div className="space-y-1">
                {Object.entries(results.errorTypes).map(([errorType, count]) => (
                  <div key={errorType} className="flex justify-between text-sm">
                    <span className="text-red-700">{errorType}</span>
                    <Badge variant="destructive" className="text-xs">{count as number}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Envio em Lote
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">
              {selectedContacts.length.toLocaleString()} contatos selecionados
            </span>
          </div>
          {selectedContacts.length > 5000 && (
            <Badge variant="secondary">Volume Alto</Badge>
          )}
        </div>

        {selectedContacts.length > 10000 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Limite excedido: máximo 10.000 contatos por lote
              </span>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processando...</span>
              <span>{progress.current} de {progress.total}</span>
            </div>
            <Progress 
              value={(progress.current / progress.total) * 100} 
              className="w-full"
            />
          </div>
        )}

        <Button
          onClick={handleBatchSend}
          disabled={isProcessing || selectedContacts.length === 0 || selectedContacts.length > 10000}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            'Enviando...'
          ) : (
            `Enviar para ${selectedContacts.length.toLocaleString()} contatos`
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
