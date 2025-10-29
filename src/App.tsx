import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import Login from "./pages/Login";
import { AuthProvider } from "./contexts/AuthContext";
import Protected from "./components/auth/Protected";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Produtos from "./pages/Produtos";
import Pedidos from "./pages/Pedidos";
import OPs from "./pages/OPs";
import OPPlanner from "./pages/OPPlanner";
import Kanban from "./pages/Kanban";
import KanbanArchived from "./pages/KanbanArchived";
import RelatorioPedido from "./pages/RelatorioPedido";
import NotFound from "./pages/NotFound";
import UsuariosPage from "./pages/Usuarios";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route element={<Protected />}>
              <Route path="/" element={<Dashboard />} />
              <Route element={<Protected perm="config" />}>
                <Route path="/usuarios" element={<UsuariosPage />} />
              </Route>
              <Route path="/perfil" element={<Profile />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/ops" element={<OPs />} />
              <Route path="/ops/:id/planner" element={<OPPlanner />} />
              <Route element={<Protected perm="kanban" />}>
                <Route path="/kanban" element={<Kanban />} />
              </Route>
              <Route path="/kanban/arquivados" element={<KanbanArchived />} />
              <Route path="/relatorios/pedido/:id" element={<RelatorioPedido />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
