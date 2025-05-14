
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

type Profile = {
  id: string;
  nome: string;
};

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Função para buscar o perfil do usuário
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Profile fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Estabelecer listener de autenticação primeiro
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setUser(currentSession?.user ?? null);
      setSession(currentSession);
      
      // Use setTimeout para evitar deadlock potencial
      if (currentSession?.user) {
        setTimeout(() => {
          fetchProfile(currentSession.user.id);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
      
      // Salvar o token de autenticação no localStorage para acesso rápido em outros componentes
      if (currentSession) {
        localStorage.setItem('sb-czinoycvwsjjxuqbuxtm-auth-token', JSON.stringify(currentSession));
      } else {
        localStorage.removeItem('sb-czinoycvwsjjxuqbuxtm-auth-token');
      }
    });

    // Depois verificar a sessão existente
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setUser(currentSession?.user ?? null);
      setSession(currentSession);
      
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Falha ao fazer login. Verifique suas credenciais.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) throw error;
      
      toast.success('Cadastro realizado com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Falha ao realizar cadastro.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      localStorage.removeItem('sb-czinoycvwsjjxuqbuxtm-auth-token');
      toast.success('Logout realizado com sucesso!');
      navigate('/login');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Falha ao fazer logout.');
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const updatePassword = async (password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ 
        password 
      });
      
      if (error) throw error;
      toast.success('Senha atualizada com sucesso!');
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(`Erro ao atualizar senha: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        updatePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
