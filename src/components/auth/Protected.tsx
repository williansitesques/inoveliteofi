import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type Props = { perm?: string };

export default function Protected({ perm }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // pode exibir skeleton global aqui

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (perm && !user.permissions?.includes(perm)) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-16 text-center space-y-3">
        <h1 className="text-2xl font-semibold">Você não tem acesso a esta página</h1>
        <p className="text-muted-foreground">Contate o responsável pelo sistema para solicitar permissão: "{perm}".</p>
      </div>
    );
  }

  return <Outlet />;
}
