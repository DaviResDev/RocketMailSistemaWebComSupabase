import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Home, 
  Mail, 
  Users, 
  Calendar, 
  FileText, 
  BarChart2, 
  Settings,
  Moon,
  Sun,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSettings } from '@/hooks/useSettings';
import { Logo } from './Logo';

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ to, icon: Icon, label, isActive, onClick }: SidebarItemProps) => {
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full',
        isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'hover:bg-muted text-foreground'
      )}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export function Sidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();
  const { signOut, user, profile } = useAuth();
  const { settings, fetchSettings } = useSettings();
  
  // Fetch user settings when component mounts
  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user, fetchSettings]);

  const navigation = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/contatos', label: 'Contatos', icon: Users },
    { to: '/templates', label: 'Templates', icon: FileText },
    { to: '/agendamentos', label: 'Agendamentos', icon: Calendar },
    { to: '/envios', label: 'Histórico de Envios', icon: Mail },
    { to: '/metricas', label: 'Métricas', icon: BarChart2 },
    { to: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleItemClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  // Get user initials for avatar fallback
  const userInitials = profile?.nome 
    ? profile.nome.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U';
    
  const userDisplayName = profile?.nome || user?.email?.split('@')[0] || 'Usuário';

  return (
    <>
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50"
          onClick={toggleSidebar}
        >
          <Menu size={20} />
        </Button>
      )}

      <div
        className={cn(
          'fixed inset-0 bg-background/80 backdrop-blur-sm z-40',
          isMobile ? (isOpen ? 'block' : 'hidden') : 'hidden'
        )}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={cn(
          'h-screen bg-card border-r fixed left-0 top-0 z-40 w-64 transition-transform duration-300 ease-in-out',
          isMobile
            ? isOpen
              ? 'transform-none'
              : '-translate-x-full'
            : 'transform-none'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <Link to="/dashboard" className="flex items-center justify-center w-full">
              <Logo size="medium" />
            </Link>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="lg:hidden"
              >
                <X size={20} />
              </Button>
            )}
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <SidebarItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                isActive={location.pathname === item.to}
                onClick={handleItemClick}
              />
            ))}
          </nav>

          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <Link 
                to="/configuracoes" 
                onClick={handleItemClick}
                className="flex items-center gap-3 w-full"
              >
                <Avatar className="h-8 w-8">
                  {settings?.foto_perfil ? (
                    <AvatarImage src={settings.foto_perfil} />
                  ) : (
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{userDisplayName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </Link>
            </div>

            <div className="flex justify-between items-center">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleTheme}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => signOut()}
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
