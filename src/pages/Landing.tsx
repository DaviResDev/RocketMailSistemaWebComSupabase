
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
            <span className="text-xl font-bold">Disparo Pro</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="#features" className="text-sm font-medium hover:text-primary">
              Funcionalidades
            </Link>
            <Link to="#about" className="text-sm font-medium hover:text-primary">
              Sobre Nós
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
              Disparo Pro é a plataforma completa para pequenos negócios e influenciadores agendarem e gerenciarem seus envios de mensagens de forma simples e eficiente.
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
                  src="https://via.placeholder.com/1200x675/f5f5f5/666666?text=Disparo+Pro+Dashboard" 
                  alt="Disparo Pro Dashboard" 
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
      <footer id="about" className="bg-card border-t py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary text-primary-foreground p-1.5 rounded">
                  <Mail className="h-4 w-4" />
                </div>
                <span className="font-bold">Disparo Pro</span>
              </div>
              <p className="text-sm text-muted-foreground">
                A solução completa para envio de mensagens automatizadas.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="#features" className="hover:text-foreground">Funcionalidades</Link></li>
                <li><Link to="#" className="hover:text-foreground">API</Link></li>
                <li><Link to="#" className="hover:text-foreground">Integrações</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="#about" className="hover:text-foreground">Sobre nós</Link></li>
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
              &copy; {new Date().getFullYear()} Disparo Pro. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
