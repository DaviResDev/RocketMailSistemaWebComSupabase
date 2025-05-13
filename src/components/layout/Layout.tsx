
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export function Layout() {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />
      <main className={cn("min-h-screen", isMobile ? "pt-16" : "ml-64")}>
        <div className="container mx-auto py-8 px-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
