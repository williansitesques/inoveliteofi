import { Link, useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { ReactNode } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  ClipboardList,
  Kanban,
  Download,
  Upload,
  History,
  RotateCcw
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link as RLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Usuários', href: '/usuarios', icon: Users },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Produtos', href: '/produtos', icon: Package },
  { name: 'Pedidos', href: '/pedidos', icon: ShoppingCart },
  { name: 'OPs', href: '/ops', icon: ClipboardList },
  { name: 'Kanban', href: '/kanban', icon: Kanban },
];

export const Layout = ({ children }: { children?: ReactNode }) => {
  const location = useLocation();
  const { exportJSON, importJSON, resetToSeed } = useStore();
  const [commits, setCommits] = useState<Array<{ id: string; message: string; date: string }>>([]);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    // Ambiente browser: não pode usar `require('child_process')`.
    setCommits([]);
  }, []);

  const handleVersionChange = async (_commitId: string) => {
    toast.info('Troca de versão indisponível no navegador.');
    setShowVersions(false);
  };

  const handleReset = () => {
    try {
      resetToSeed();
      toast.success('Dados restaurados com sucesso!');
    } catch (error) {
      toast.error('Erro ao restaurar dados');
    }
  };

  const handleExport = () => {
    try {
      const json = exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      saveAs(blob, `inovelite-backup-${new Date().toISOString().split('T')[0]}.json`);
      toast.success('Dados exportados com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar dados');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          importJSON(json);
          toast.success('Dados importados com sucesso!');
        } catch (error) {
          toast.error('Erro ao importar dados');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <Package className="h-8 w-8" />
              <span className="text-2xl font-bold">InoveLite</span>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImport}
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              {/* Botões Restaurar Dados e Versões removidos a pedido */}
              <UserMenu />
            </div>
          </div>
        </div>

        {/* Menu de Versões */}
        {showVersions && (
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border p-4 z-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Histórico de Versões</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVersions(false)}
                className="hover:bg-destructive/10"
              >
                ?</Button>
              <UserMenu />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {commits.map((commit) => (
                <div
                  key={commit.id}
                  className="p-3 hover:bg-muted rounded-md cursor-pointer flex items-center justify-between"
                  onClick={() => handleVersionChange(commit.id)}
                >
                  <div>
                    <div className="font-medium">{commit.message}</div>
                    <div className="text-sm text-muted-foreground">
                      {commit.date}  {commit.id}
                    </div>
                  </div>
                  <RotateCcw className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Navigation */}
      <nav className="bg-card border-b sticky top-16 z-40">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                               (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                    }
                  `}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      {/* Sem botão de seed em dev */}

      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>InoveLite © 2025 - Sistema de Gestão de Produção</p>
        </div>
      </footer>
    </div>
  );
};

function UserMenu() {
  const { user, logout } = useAuth();
  const initials = (user?.name || user?.email || 'U').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="ml-2 cursor-pointer">
          <Avatar className="h-8 w-8"><AvatarFallback>{initials}</AvatarFallback></Avatar>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Conectado</DropdownMenuLabel>
        <div className="px-2 py-1 text-sm">
          <div className="font-medium">{user?.name || 'Usuário'}</div>
          <div className="text-muted-foreground">{user?.email || 'admin@admin.com'}</div>
        </div>
        {user?.permissions && (
          <div className="px-2 py-1 text-xs text-muted-foreground">
            Permissões: {user.permissions.join(', ')}
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/perfil">Meu Perfil</a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => logout()}>Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}



