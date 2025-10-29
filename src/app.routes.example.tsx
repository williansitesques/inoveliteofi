import { Routes, Route } from 'react-router-dom';
import Protected from '@/components/auth/Protected';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Kanban from '@/pages/Kanban';
import Usuarios from '@/pages/Usuarios';

export default function AppRoutesExample() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route element={<Protected perm="kanban" />}>
          <Route path="/kanban" element={<Kanban />} />
        </Route>
      </Route>
    </Routes>
  );
}

