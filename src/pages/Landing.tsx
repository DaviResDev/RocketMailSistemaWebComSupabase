
import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Users, Calendar, FileText, BarChart2 } from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();
  const featuresRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);

  const scrollToRef = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded">
              <Mail className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">DisparoPro</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <button 
              onClick={() => scrollToRef(featuresRef)} 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Funcionalidades
            </button>
            <button
              onClick={() => scrollToRef(aboutRef)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sobre Nós
            </button>
          </nav>
          <div className="flex gap-4">
            {user ? (
              <Link to="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline">Entrar</Button>
                </Link>
                <Link to="/cadastro">
                  <Button>Cadastrar</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="py-24 md:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
                  Sistema de automação de emails profissional
                </h1>
                <p className="text-muted-foreground text-lg">
                  Automatize seus envios de email, ganhe tempo e aumente o engajamento com seus clientes.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {user ? (
                    <Link to="/dashboard">
                      <Button size="lg">Acessar Dashboard</Button>
                    </Link>
                  ) : (
                    <>
                      <Link to="/cadastro">
                        <Button size="lg">Comece Agora</Button>
                      </Link>
                      <Link to="/login">
                        <Button variant="outline" size="lg">Já tenho conta</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center">
                <img
                  src="/placeholder.svg"
                  width={550}
                  height={400}
                  alt="Hero image"
                  className="aspect-video overflow-hidden rounded-xl object-cover w-full"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-muted/50" ref={featuresRef}>
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Tudo que você precisa em um só lugar
              </h2>
              <p className="mt-3 text-muted-foreground text-lg">
                Ferramentas poderosas para automatizar sua comunicação por email
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center text-center p-6 space-y-4 border rounded-lg">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Gerenciamento de Contatos</h3>
                <p className="text-muted-foreground">
                  Organize seus contatos com informações detalhadas e segmentação por tags.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 space-y-4 border rounded-lg">
                <div className="p-3 bg-primary/10 rounded-full">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Templates Personalizados</h3>
                <p className="text-muted-foreground">
                  Crie templates de email profissionais com variáveis personalizadas para cada contato.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 space-y-4 border rounded-lg">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Agendamento de Envios</h3>
                <p className="text-muted-foreground">
                  Programe seus emails para serem enviados no momento ideal para seu público.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 space-y-4 border rounded-lg">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Disparos em Massa</h3>
                <p className="text-muted-foreground">
                  Envie emails para múltiplos contatos de uma só vez, mantendo a personalização.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 space-y-4 border rounded-lg">
                <div className="p-3 bg-primary/10 rounded-full">
                  <BarChart2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Métricas e Relatórios</h3>
                <p className="text-muted-foreground">
                  Acompanhe o desempenho dos seus envios com métricas detalhadas e visualizações.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 space-y-4 border rounded-lg">
                <div className="p-3 bg-primary/10 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6 text-primary"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Envio Profissional</h3>
                <p className="text-muted-foreground">
                  Configure seus servidores SMTP para envios com sua identidade de marca.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                    Todas as ferramentas que você precisa para crescer seu negócio
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    Nossa plataforma foi desenvolvida pensando em pequenas e médias empresas que precisam de um sistema eficiente de comunicação com clientes.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-primary"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>Interface intuitiva e fácil de usar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-primary"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>Sem limites de envios mensais</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-primary"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>Suporte técnico dedicado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-primary"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>Atualizações gratuitas</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <img
                  src="/placeholder.svg"
                  width={550}
                  height={400}
                  alt="Product features"
                  className="aspect-video overflow-hidden rounded-xl object-cover w-full"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-muted/50" ref={aboutRef}>
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Sobre a DisparoPro
              </h2>
              <p className="mt-3 text-muted-foreground text-lg">
                Nossa missão é ajudar empresas a se comunicarem melhor com seus clientes
              </p>
            </div>
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="flex flex-col items-center text-center p-6 space-y-4 border rounded-lg">
                <h3 className="text-xl font-bold">Nossa História</h3>
                <p className="text-muted-foreground">
                  A DisparoPro nasceu da necessidade de oferecer uma solução acessível e simples para automação de emails
                  para empreendedores e pequenas empresas que precisam de ferramentas profissionais.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 space-y-4 border rounded-lg">
                <h3 className="text-xl font-bold">Nossa Missão</h3>
                <p className="text-muted-foreground">
                  Tornar a comunicação por email mais eficiente e acessível para empresas de todos os tamanhos,
                  permitindo que cada negócio cresça através do relacionamento com seus clientes.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 space-y-4 border rounded-lg">
                <h3 className="text-xl font-bold">Nossa Equipe</h3>
                <p className="text-muted-foreground">
                  Somos um time de desenvolvedores e especialistas em marketing apaixonados por criar ferramentas
                  que simplificam processos e potencializam resultados.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container px-4 md:px-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Pronto para começar?
              </h2>
              <p className="text-muted-foreground text-lg">
                Crie sua conta e comece a enviar emails profissionais hoje mesmo.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                {user ? (
                  <Link to="/dashboard">
                    <Button size="lg">Acessar Dashboard</Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/cadastro">
                      <Button size="lg">Criar Conta Grátis</Button>
                    </Link>
                    <Link to="/login">
                      <Button variant="outline" size="lg">Fazer Login</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary p-1.5 rounded">
                  <Mail className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-xl">DisparoPro</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Sistema completo para gerenciamento e automação de emails profissionais.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Plataforma</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button 
                    onClick={() => scrollToRef(featuresRef)} 
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Funcionalidades
                  </button>
                </li>
                <li>
                  <Link to="/login" className="text-muted-foreground hover:text-foreground">
                    Entrar
                  </Link>
                </li>
                <li>
                  <Link to="/cadastro" className="text-muted-foreground hover:text-foreground">
                    Cadastrar
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Empresa</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button 
                    onClick={() => scrollToRef(aboutRef)} 
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Sobre Nós
                  </button>
                </li>
                <li>
                  <Link to="#" className="text-muted-foreground hover:text-foreground">
                    Contato
                  </Link>
                </li>
                <li>
                  <Link to="#" className="text-muted-foreground hover:text-foreground">
                    Política de Privacidade
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Contato</h4>
              <div className="text-sm text-muted-foreground">
                <p>contato@disparopro.com.br</p>
                <p>+55 (11) 99999-9999</p>
                <p className="mt-4">São Paulo - Brasil</p>
              </div>
              <div className="flex gap-4">
                <Link to="#" className="text-muted-foreground hover:text-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-instagram"
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </Link>
                <Link to="#" className="text-muted-foreground hover:text-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-linkedin"
                  >
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect width="4" height="12" x="2" y="9" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-12 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} DisparoPro. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
