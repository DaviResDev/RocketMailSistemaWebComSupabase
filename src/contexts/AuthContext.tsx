
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Mock authentication state for now
// This will be replaced with Supabase Auth when integrated
type User = {
  id: string;
  email: string;
  nome: string;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for session in localStorage (mock implementation)
    const storedUser = localStorage.getItem('disparo-pro-user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user', error);
        localStorage.removeItem('disparo-pro-user');
      }
    }
    setLoading(false);
  }, []);

  // Mock sign in
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      // Mock successful login
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email,
        nome: email.split('@')[0],
      };
      
      localStorage.setItem('disparo-pro-user', JSON.stringify(mockUser));
      setUser(mockUser);
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Falha ao fazer login. Verifique suas credenciais.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Mock sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      // Mock successful Google login
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        email: 'usuario.google@gmail.com',
        nome: 'Usuário Google',
      };
      
      localStorage.setItem('disparo-pro-user', JSON.stringify(mockUser));
      setUser(mockUser);
      toast.success('Login com Google realizado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Falha ao fazer login com Google.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Mock sign up
  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      // Mock successful registration
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        email,
        nome: name,
      };
      
      localStorage.setItem('disparo-pro-user', JSON.stringify(mockUser));
      setUser(mockUser);
      toast.success('Cadastro realizado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Falha ao realizar cadastro.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Mock sign out
  const signOut = async () => {
    try {
      setLoading(true);
      localStorage.removeItem('disparo-pro-user');
      setUser(null);
      toast.success('Logout realizado com sucesso!');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Falha ao fazer logout.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut
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
