
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSettings } from '@/hooks/useSettings';
import { Logo } from './Logo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ to, icon: Icon, label, isActive, onClick }: SidebarItemProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link 
          to={to} 
          onClick={onClick}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full',
            isActive 
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' 
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
          )}
        >
          <Icon size={20} className={cn(
            'transition-all',
            isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/80'
          )} />
          <span className="font-medium">{label}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
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
    { to: '/historico-envios', label: 'Histórico de Envios', icon: Mail },
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
          aria-label="Menu"
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
          'h-screen bg-sidebar-background backdrop-blur-sm border-r border-sidebar-border fixed left-0 top-0 z-40 w-64 transition-transform duration-300 ease-in-out shadow-lg',
          isMobile
            ? isOpen
              ? 'transform-none'
              : '-translate-x-full'
            : 'transform-none'
        )}
        data-sidebar="sidebar"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-start py-3 px-2">
            <Logo size="large" />
          </div>
          
          <Separator className="mb-2 opacity-30 bg-sidebar-border" />

          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-hide">
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

          <div className="p-4 mt-auto border-t border-sidebar-border bg-sidebar-background">
            <div 
              className="flex items-center gap-3 mb-4 p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors cursor-pointer"
              onClick={() => navigate('/configuracoes')}
            >
              <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/20">
                {settings?.foto_perfil ? (
                  <AvatarImage src={settings.foto_perfil} />
                ) : (
                  <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary font-medium">
                    {userInitials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-sidebar-foreground">{userDisplayName}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button 
                variant="outline" 
                size="icon"
                onClick={toggleTheme}
                className="rounded-lg border-sidebar-border bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground"
                aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => signOut()}
                className="rounded-lg px-4 flex items-center gap-2 bg-red-600 hover:bg-red-700"
              >
                <LogOut size={16} />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
