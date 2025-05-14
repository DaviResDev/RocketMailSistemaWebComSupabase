
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Template } from '@/hooks/useTemplates';
import { Edit, Trash2, ExternalLink, Paperclip } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
  onDelete: (id: string) => void;
}

export function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  const currentDate = new Date();
  const formattedDate = `${currentDate.toLocaleDateString('pt-BR')}`;
  const formattedTime = `${currentDate.toLocaleTimeString('pt-BR')}`;

  const previewContent = template.conteudo
    .replace(/{nome}/g, "João")
    .replace(/{email}/g, "joao@exemplo.com")
    .replace(/{telefone}/g, "(11) 99999-9999")
    .replace(/{cliente}/g, "Cliente Exemplo")
    .replace(/{razao_social}/g, "Empresa Exemplo Ltda.")
    .replace(/{data}/g, formattedDate)
    .replace(/{hora}/g, formattedTime);

  const previewFull = template.assinatura 
    ? previewContent + "\n\n" + template.assinatura
    : previewContent;
    
  // Parse attachments if they exist
  const attachments = template.attachments
    ? (typeof template.attachments === 'string'
      ? JSON.parse(template.attachments)
      : template.attachments)
    : [];
    
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  const hasSignature = !!template.signature_image;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">{template.nome}</h3>
            {(hasAttachments || hasSignature) && (
              <div className="flex gap-1 mt-1">
                {hasAttachments && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Paperclip className="h-3 w-3 mr-1" />
                    {attachments.length} anexo(s)
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Prévia do Template: {template.nome}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Template Original:</h4>
                    <div className="p-4 bg-muted rounded-md whitespace-pre-wrap">
                      {template.conteudo}
                      {template.assinatura && (
                        <>
                          <hr className="my-2" />
                          <div className="text-sm font-medium mt-2">Assinatura:</div>
                          {template.assinatura}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Prévia com Variáveis Substituídas:</h4>
                    <div className="p-4 bg-muted rounded-md whitespace-pre-wrap">
                      {previewFull}
                    </div>
                    {template.signature_image && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">Assinatura digital:</p>
                        <img 
                          src={template.signature_image} 
                          alt="Assinatura" 
                          className="max-h-16 border rounded p-1"
                        />
                      </div>
                    )}
                    {hasAttachments && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">Anexos ({attachments.length}):</p>
                        <ul className="text-sm text-muted-foreground list-disc pl-5">
                          {attachments.map((attachment: any, i: number) => (
                            <li key={i}>
                              {attachment.name} ({(attachment.size / 1024).toFixed(1)} KB)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Variáveis substituídas:</p>
                    <ul className="list-disc list-inside mt-1 grid grid-cols-2">
                      <li>{"{nome}"} → João</li>
                      <li>{"{email}"} → joao@exemplo.com</li>
                      <li>{"{telefone}"} → (11) 99999-9999</li>
                      <li>{"{cliente}"} → Cliente Exemplo</li>
                      <li>{"{razao_social}"} → Empresa Exemplo Ltda.</li>
                      <li>{"{data}"} → {formattedDate}</li>
                      <li>{"{hora}"} → {formattedTime}</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onEdit(template)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir template</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(template.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {template.conteudo.length > 200
              ? template.conteudo.substring(0, 200) + '...'
              : template.conteudo}
          </p>
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Prévia:</p>
            <p className="text-sm text-muted-foreground mt-1">
              {previewContent.length > 200
                ? previewContent.substring(0, 200) + '...'
                : previewContent}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
