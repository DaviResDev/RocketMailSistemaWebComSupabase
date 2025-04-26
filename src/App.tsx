
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Layout } from "./components/layout/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Templates from "./pages/Templates";
import Contatos from "./pages/Contatos";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { supabase } from "./integrations/supabase/client";

const queryClient = new QueryClient();

// Protected route component that checks authentication status directly from Supabase
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Get from localStorage for immediate check
  const isAuthenticated = localStorage.getItem('sb-czinoycvwsjjxuqbuxtm-auth-token');
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Non-authenticated route component (redirects to dashboard if logged in)
const NonAuthRoute = ({ children }: { children: React.ReactNode }) => {
  // Get from localStorage for immediate check
  const isAuthenticated = localStorage.getItem('sb-czinoycvwsjjxuqbuxtm-auth-token');
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<NonAuthRoute><Login /></NonAuthRoute>} />
              <Route path="/cadastro" element={<NonAuthRoute><Signup /></NonAuthRoute>} />
              
              {/* Protected routes with layout */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/contatos" element={<Contatos />} />
                {/* Add other protected routes here */}
                <Route path="/agendamentos" element={<div className="p-4">Página de Agendamentos em construção</div>} />
                <Route path="/envios" element={<div className="p-4">Histórico de Envios em construção</div>} />
                <Route path="/metricas" element={<div className="p-4">Métricas em construção</div>} />
                <Route path="/configuracoes" element={<div className="p-4">Configurações em construção</div>} />
              </Route>
              
              {/* Fallback for 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
