
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Logo } from '@/components/layout/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  
  // Check for existing session on page load
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate('/dashboard');
      }
    };
    
    checkSession();
  }, [navigate]);
  
  // If user becomes authenticated, redirect them
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn(email, password);
      // The redirect will be handled by the useEffect hook that watches the user state
    } catch (error) {
      console.error('Login error:', error);
      // Toast is handled in the signIn function
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Digite seu email para recuperar a senha');
      return;
    }

    try {
      setIsResettingPassword(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success('Email de recuperação enviado!', {
        description: 'Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.'
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error('Erro ao enviar email de recuperação: ' + error.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo size="medium" />
        </div>
        
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">Login</CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-300">
              Entre com suas credenciais para acessar sua conta
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 border-0"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <Button
                type="button"
                variant="link"
                onClick={handleForgotPassword}
                disabled={isResettingPassword}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {isResettingPassword ? 'Enviando...' : 'Esqueceu a senha?'}
              </Button>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
              Não tem uma conta?{" "}
              <Link to="/cadastro" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
                Cadastre-se
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
