
import { useState } from 'react';
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
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

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
  const { signOut } = useAuth();

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
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-1.5 rounded">
                <Mail size={20} />
              </div>
              <h1 className="text-xl font-bold">DisparoPro</h1>
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
