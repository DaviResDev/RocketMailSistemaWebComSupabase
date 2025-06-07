
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Settings, Plus, CheckCircle2 } from 'lucide-react';
import { useSmtpConfiguracoes } from '@/hooks/useSmtpConfiguracoes';
import { toast } from 'sonner';

export function SmtpConfiguracaoForm() {
  const { 
    configuracoes, 
    loading, 
    fetchConfiguracoes, 
    salvarConfiguracao, 
    ativarConfiguracao, 
    excluirConfiguracao 
  } = useSmtpConfiguracoes();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nome_configuracao: '',
    host: '',
    porta: 587,
    email_origem: '',
    senha: '',
    ativo: true
  });

  useEffect(() => {
    fetchConfiguracoes();
  }, [fetchConfiguracoes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome_configuracao || !formData.host || !formData.email_origem || !formData.senha) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const sucesso = await salvarConfiguracao(formData);
    if (sucesso) {
      setFormData({
        nome_configuracao: '',
        host: '',
        porta: 587,
        email_origem: '',
        senha: '',
        ativo: true
      });
      setShowForm(false);
    }
  };

  const configuracaoAtiva = configuracoes.find(config => config.ativo);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações SMTP Persistentes
              </CardTitle>
              <CardDescription>
                Gerencie suas configurações SMTP salvas de forma segura no banco de dados
              </CardDescription>
            </div>
            
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Configuração
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Configuração Ativa */}
          {configuracaoAtiva && (
            <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h4 className="font-medium text-green-800">
                      {configuracaoAtiva.nome_configuracao}
                    </h4>
                    <Badge className="bg-green-100 text-green-800">ATIVA</Badge>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    {configuracaoAtiva.host}:{configuracaoAtiva.porta} | {configuracaoAtiva.email_origem}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Configurações */}
          {configuracoes.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Todas as Configurações</h4>
              {configuracoes.map((config) => (
                <div 
                  key={config.id} 
                  className={`p-3 border rounded-lg ${config.ativo ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium">{config.nome_configuracao}</h5>
                        {config.ativo && <Badge variant="outline" className="bg-green-100">Ativa</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {config.host}:{config.porta} | {config.email_origem}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!config.ativo && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => ativarConfiguracao(config.id)}
                          disabled={loading}
                        >
                          Ativar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => excluirConfiguracao(config.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulário para Nova Configuração */}
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Nova Configuração SMTP</h4>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_configuracao">Nome da Configuração *</Label>
                  <Input
                    id="nome_configuracao"
                    placeholder="Ex: Gmail Corporativo"
                    value={formData.nome_configuracao}
                    onChange={(e) => setFormData({...formData, nome_configuracao: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="host">Servidor SMTP *</Label>
                  <Input
                    id="host"
                    placeholder="smtp.gmail.com"
                    value={formData.host}
                    onChange={(e) => setFormData({...formData, host: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="porta">Porta</Label>
                  <Select
                    value={formData.porta.toString()}
                    onValueChange={(value) => setFormData({...formData, porta: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="587">587 (TLS)</SelectItem>
                      <SelectItem value="465">465 (SSL)</SelectItem>
                      <SelectItem value="25">25 (Não seguro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_origem">Email de Origem *</Label>
                  <Input
                    id="email_origem"
                    type="email"
                    placeholder="contato@suaempresa.com"
                    value={formData.email_origem}
                    onChange={(e) => setFormData({...formData, email_origem: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="senha">Senha/Token *</Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder="Sua senha ou token de aplicativo"
                    value={formData.senha}
                    onChange={(e) => setFormData({...formData, senha: e.target.value})}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2 md:col-span-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({...formData, ativo: checked})}
                  />
                  <Label htmlFor="ativo">Ativar esta configuração</Label>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Salvando...' : 'Salvar Configuração SMTP'}
              </Button>
            </form>
          )}

          {configuracoes.length === 0 && !showForm && (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma configuração SMTP cadastrada</p>
              <p className="text-sm">Clique em "Nova Configuração" para começar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
