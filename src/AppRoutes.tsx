import { Routes, Route, BrowserRouter } from 'react-router-dom';
import Protected from '@/components/auth/Protected';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Kanban from '@/pages/Kanban';
import Usuarios from '@/pages/Usuarios';
import PrimeiroAcesso from '@/pages/PrimeiroAcesso';
import OPs from '@/pages/OPs';
import Pedidos from '@/pages/Pedidos';
import Produtos from '@/pages/Produtos';
import Clientes from '@/pages/Clientes';
import Profile from '@/pages/Profile';
import RelatorioPedido from '@/pages/RelatorioPedido';
import OPPlanner from '@/pages/OPPlanner';
import NotFound from '@/pages/NotFound';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/primeiro-acesso" element={<PrimeiroAcesso />} />
        <Route element={<Protected />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/kanban" element={<Kanban />} />
          <Route path="/ops" element={<OPs />} />
          <Route path="/op-planner/:id" element={<OPPlanner />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/relatorio-pedido/:id" element={<RelatorioPedido />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
