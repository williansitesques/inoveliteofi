import { useEffect, useMemo, useState } from 'react';
import type { User } from '@/types/auth';
import { listUsers, createUser, updateUser, deleteUser } from '@/services/users';
import { UserFormDialog } from '@/components/users/UserFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function UsuariosPage() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<User | null>(null);

  const fetchRemote = async () => {
    setLoading(true);
    try {
      const data = await listUsers(q);
      setUsers(data);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRemote(); }, []);
  useEffect(() => {
    const t = setTimeout(() => fetchRemote(), 300);
    return () => clearTimeout(t);
  }, [q]);

  const total = users.length;

  const onCreate = async (data: any) => {
    try {
      await createUser({
        name: data.name,
        email: data.email,
        phone: data.phone,
        roleId: data.roleId,
        permissions: data.permissions,
        password: data.password,
        status: data.status,
      } as any);
      toast.success('Usuário criado com sucesso!');
      setOpen(false);
      await fetchRemote();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Não foi possível criar o usuário.';
      toast.error(msg);
    }
  };

  const onEdit = async (id: string, data: any) => {
    try {
      const patch = { ...data, updatedAt: Date.now() } as Partial<User>;
      // Prevent password from being sent if empty
      if (patch.password === '') {
        delete patch.password;
      }
      await updateUser(id, patch as any);
      toast.success('Usuário atualizado com sucesso!');
      setOpen(false);
      await fetchRemote();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Não foi possível atualizar o usuário.';
      toast.error(msg);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Confirmar exclusão?')) return;
    try {
      await deleteUser(id);
      toast.success('Usuário excluído com sucesso!');
      await fetchRemote();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Não foi possível excluir o usuário.';
      toast.error(msg);
    }
  };

  const openCreate = () => {
    setMode('create');
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (u: User) => {
    setMode('edit');
    setEditing(u);
    setOpen(true);
  };

  const grid = useMemo(() => {
    if (loading && !users.length) { // Show skeleton only on initial load
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardHeader>
                <div className="h-5 w-40 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="h-7 w-28 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!users.length) {
      return (
        <div className="text-center py-16 space-y-4">
          <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-medium">Nenhum usuário encontrado</p>
          <p className="text-sm text-muted-foreground">Use a busca ou crie um novo usuário.</p>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Novo Usuário</Button>
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {users.map(u => (
          <Card key={u.id} className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="truncate" title={u.name}>{u.name}</span>
                <Badge variant={u.status === 'ativo' ? 'default' : 'secondary'}>
                  {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground truncate" title={u.email}>{u.email}</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="capitalize">{u.roleId}</Badge>
                <Badge variant="secondary">{u.permissions.length} perms</Badge>
              </div>
              <Separator />
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button aria-label="Editar" variant="outline" size="sm" onClick={() => openEdit(u)} disabled={u.id === 'admin-fixed' || u.id === 'admin-1' || u.email === 'willianinove01@gmail.com'}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{(u.id === 'admin-fixed' || u.id === 'admin-1' || u.email === 'willianinove01@gmail.com') ? 'Usuário protegido' : 'Editar'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button aria-label="Excluir" variant="destructive" size="sm" onClick={() => onDelete(u.id)} disabled={u.id === 'admin-fixed' || u.id === 'admin-1' || u.email === 'willianinove01@gmail.com'}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{(u.id === 'admin-fixed' || u.id === 'admin-1' || u.email === 'willianinove01@gmail.com') ? 'Usuário protegido' : 'Excluir'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }, [users, loading]);

  return (
    <div className="mx-auto max-w-[1200px] px-4 lg:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerencie acesso e permissões do sistema.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input
            aria-label="Buscar usuário"
            placeholder="Buscar por nome ou e-mail"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="sm:w-[280px]"
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Novo Usuário
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">Total: {total}</div>
      {grid}

      <UserFormDialog
        open={open}
        onOpenChange={setOpen}
        mode={mode}
        editingUser={editing ?? undefined}
        onSubmitCreate={onCreate}
        onSubmitEdit={onEdit}
      />
    </div>
  );
}
