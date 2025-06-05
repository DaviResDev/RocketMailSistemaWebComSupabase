
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Logo } from '@/components/layout/Logo';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we have valid session from email link
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao verificar sessão:', error);
          toast.error('Link inválido ou expirado');
          navigate('/login');
          return;
        }

        if (data.session) {
          setIsValidSession(true);
        } else {
          toast.error('Link inválido ou expirado');
          navigate('/login');
        }
      } catch (error) {
        console.error('Erro:', error);
        toast.error('Erro ao verificar link de recuperação');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Erro ao redefinir senha:', error);
        throw error;
      }

      toast.success('Senha redefinida com sucesso!', {
        description: 'Você será redirecionado para a página de login'
      });

      // Sign out user and redirect to login
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      toast.error('Erro ao redefinir senha: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando link de recuperação...</p>
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Link Inválido</CardTitle>
            <CardDescription>
              O link de recuperação é inválido ou expirou. Solicite um novo link de recuperação.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full"
            >
              Voltar ao Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo size="medium" />
        </div>
        
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Redefinir Senha
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Digite sua nova senha abaixo
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                  Nova Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                  minLength={6}
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500">Mínimo de 6 caracteres</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-300">
                  Confirmar Nova Senha
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirme sua nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                  minLength={6}
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 border-0"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Redefinindo...' : 'Redefinir Senha'}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <Button
              variant="link"
              onClick={() => navigate('/login')}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              disabled={isSubmitting}
            >
              Voltar ao login
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
