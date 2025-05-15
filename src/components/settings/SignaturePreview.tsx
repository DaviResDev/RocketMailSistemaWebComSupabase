
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Settings } from '@/types/settings';

interface SignaturePreviewProps {
  settings: Settings;
  emailContent?: string;
}

export function SignaturePreview({ settings, emailContent = "Conteúdo do email..." }: SignaturePreviewProps) {
  const { smtp_nome, email_usuario, area_negocio, signature_image } = settings || {};
  
  return (
    <Card className="overflow-hidden border">
      <CardContent className="p-6 bg-white text-black">
        <div className="space-y-4">
          <div className="border-b pb-2 mb-2">
            <div className="font-semibold">De: {smtp_nome || 'Seu Nome'}</div>
            <div>Para: destinatario@exemplo.com</div>
            <div>Assunto: {emailContent ? emailContent.slice(0, 30) + (emailContent.length > 30 ? '...' : '') : 'Assunto do Email'}</div>
          </div>
          
          <div className="prose max-w-full mb-6">
            {emailContent || (
              <>
                <p>Olá,</p>
                <p>Este é um exemplo de conteúdo do email que você está enviando.</p>
                <p>Atenciosamente,</p>
              </>
            )}
          </div>
          
          {/* Linha divisória antes da assinatura */}
          <div className="border-t my-4"></div>
          
          {/* Assinatura */}
          <div className="signature-container text-sm">
            <div className="font-semibold">{smtp_nome || "Seu Nome"}</div>
            {area_negocio && <div className="text-gray-600">{area_negocio}</div>}
            {email_usuario && <div className="text-blue-600">{email_usuario}</div>}
            
            {signature_image && (
              <div className="mt-2">
                <img 
                  src={signature_image} 
                  alt="Assinatura" 
                  className="max-h-20 object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
