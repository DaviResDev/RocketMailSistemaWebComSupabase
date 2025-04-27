
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CheckCircle, Mail, MessageSquare, Calendar, Users } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header/Navigation */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded">
              <Mail className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">DisparoPro</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="#features" className="text-sm font-medium hover:text-primary">
              Funcionalidades
            </Link>
            <Link to="#faq" className="text-sm font-medium hover:text-primary">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="outline" className="hidden sm:flex">Entrar</Button>
            </Link>
            <Link to="/cadastro">
              <Button>Cadastre-se</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
              Automatize seus envios de <span className="text-primary">Email</span> e <span className="text-success">WhatsApp</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mb-10">
              DisparoPro é a plataforma completa para pequenos negócios e influenciadores agendarem e gerenciarem seus envios de mensagens de forma simples e eficiente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/cadastro">
                <Button size="lg" className="gap-2">
                  Comece Agora
                </Button>
              </Link>
              <Link to="#features">
                <Button variant="outline" size="lg">
                  Saiba Mais
                </Button>
              </Link>
            </div>
            <div className="mt-16 mb-8 relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-30"></div>
              <div className="relative max-w-4xl rounded-lg border border-border shadow-lg overflow-hidden">
                <img 
                  src="https://via.placeholder.com/1200x675/f5f5f5/666666?text=DisparoPro+Dashboard" 
                  alt="DisparoPro Dashboard" 
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Tudo que você precisa em um só lugar</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Gerencie seus envios, contatos e agende mensagens com facilidade usando nossas poderosas ferramentas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-card border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 text-primary">
                <Mail className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Envio Multicanal</h3>
              <p className="text-muted-foreground">
                Envie mensagens por email ou WhatsApp a partir de uma única plataforma.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-card border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 text-primary">
                <Calendar className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Agendamento Flexível</h3>
              <p className="text-muted-foreground">
                Programe envios para datas específicas com opção de repetição automática.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-card border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 text-primary">
                <Users className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Gestão de Contatos</h3>
              <p className="text-muted-foreground">
                Organize seus contatos em grupos e segmente com tags personalizadas.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-card border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 text-primary">
                <MessageSquare className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Templates Reutilizáveis</h3>
              <p className="text-muted-foreground">
                Crie modelos de mensagens para usar em diferentes campanhas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary text-primary-foreground p-1.5 rounded">
                  <Mail className="h-4 w-4" />
                </div>
                <span className="font-bold">DisparoPro</span>
              </div>
              <p className="text-sm text-muted-foreground">
                A solução completa para envio de mensagens automatizadas.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="#" className="hover:text-foreground">Funcionalidades</Link></li>
                <li><Link to="#" className="hover:text-foreground">API</Link></li>
                <li><Link to="#" className="hover:text-foreground">Integrações</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="#" className="hover:text-foreground">Sobre nós</Link></li>
                <li><Link to="#" className="hover:text-foreground">Blog</Link></li>
                <li><Link to="#" className="hover:text-foreground">Casos de Sucesso</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="#" className="hover:text-foreground">Termos de Serviço</Link></li>
                <li><Link to="#" className="hover:text-foreground">Política de Privacidade</Link></li>
                <li><Link to="#" className="hover:text-foreground">Segurança</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-12 pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} DisparoPro. Todos os direitos reservados.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <Link to="#" className="text-muted-foreground hover:text-foreground">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </Link>
              <Link to="#" className="text-muted-foreground hover:text-foreground">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </Link>
              <Link to="#" className="text-muted-foreground hover:text-foreground">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
