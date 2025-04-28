
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Template } from '@/hooks/useTemplates';
import { Edit, Trash2, ExternalLink } from 'lucide-react';
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
  const previewContent = template.conteudo
    .replace(/{nome}/g, "João")
    .replace(/{email}/g, "joao@exemplo.com")
    .replace(/{telefone}/g, "(11) 99999-9999");

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold">{template.nome}</h3>
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
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Prévia com Variáveis Substituídas:</h4>
                    <div className="p-4 bg-muted rounded-md whitespace-pre-wrap">
                      {previewContent}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Variáveis substituídas:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>{"{nome}"} → João</li>
                      <li>{"{email}"} → joao@exemplo.com</li>
                      <li>{"{telefone}"} → (11) 99999-9999</li>
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
