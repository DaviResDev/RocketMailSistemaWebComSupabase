
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Settings } from '@/types/settings';

interface SignaturePreviewProps {
  settings: Settings;
  emailContent?: string;
  emailDescription?: string;
}

export function SignaturePreview({ 
  settings, 
  emailContent = "Conteúdo do email...", 
  emailDescription
}: SignaturePreviewProps) {
  const { smtp_nome, email_usuario, area_negocio, signature_image } = settings || {};
  
  return (
    <Card className="overflow-hidden border border-border">
      <CardContent className="p-6 bg-card text-card-foreground">
        <div className="space-y-4">
          <div className="border-b border-border pb-2 mb-2">
            <div className="font-semibold text-foreground">De: {smtp_nome || 'Seu Nome'}</div>
            <div className="text-muted-foreground">Para: destinatario@exemplo.com</div>
            <div className="text-muted-foreground">Assunto: {emailDescription || (emailContent ? emailContent.slice(0, 30) + (emailContent.length > 30 ? '...' : '') : 'Assunto do Email')}</div>
          </div>
          
          <div className="prose max-w-full mb-6 text-foreground">
            {emailContent || (
              <>
                <p>Olá,</p>
                <p>Este é um exemplo de conteúdo do email que você está enviando.</p>
                <p>Atenciosamente,</p>
              </>
            )}
          </div>
          
          {/* Linha divisória antes da assinatura */}
          <div className="border-t border-border my-4"></div>
          
          {/* Assinatura */}
          <div className="signature-container text-sm">
            <div className="font-semibold text-foreground">{smtp_nome || "Seu Nome"}</div>
            {area_negocio && <div className="text-muted-foreground">{area_negocio}</div>}
            {email_usuario && <div className="text-primary">{email_usuario}</div>}
            
            {signature_image && (
              <div className="mt-2">
                <img 
                  src={signature_image} 
                  alt="Assinatura" 
                  className="max-h-20 object-contain border rounded"
                  onError={(e) => {
                    // If image fails to load, remove src to prevent broken image icon
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
