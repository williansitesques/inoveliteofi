import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useState } from 'react';

export default function Profile() {
  const { user, updateProfile, changePassword } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [cur, setCur] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  // restaura valores persistidos
  useEffect(() => {
    const stored = localStorage.getItem('profile:draft');
    if (stored) {
      try {
        const obj = JSON.parse(stored) as { name?: string; email?: string };
        if (obj.name) setName(obj.name);
        if (obj.email) setEmail(obj.email);
      } catch {}
    }
  }, []);

  // salva rascunho local a cada mudança
  useEffect(() => {
    localStorage.setItem('profile:draft', JSON.stringify({ name, email }));
  }, [name, email]);

  const emailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);

  if (!user) return null;
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Meu Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">Nome</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">E-mail</div>
            <Input value={email} onChange={(e)=>setEmail(e.target.value)} />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Papel</div>
            <div className="font-medium">{user.roleId || 'admin'}</div>
          </div>
          {Array.isArray(user.permissions) && (
            <div>
              <div className="text-sm text-muted-foreground">Permissões</div>
              <div className="flex flex-wrap gap-2">
                {user.permissions.map((p) => (
                  <span key={p} className="px-2 py-1 rounded bg-muted text-sm">{p}</span>
                ))}
              </div>
            </div>
          )}
          <div className="pt-4 border-t">
            <div className="font-medium mb-2">Trocar Senha</div>
            <div className="grid gap-2">
              <Input type="password" placeholder="Senha atual" value={cur} onChange={(e)=>setCur(e.target.value)} />
              <Input type="password" placeholder="Nova senha" value={pwd} onChange={(e)=>setPwd(e.target.value)} />
              <Input type="password" placeholder="Confirmar nova senha" value={pwd2} onChange={(e)=>setPwd2(e.target.value)} />
              <Button disabled={saving || !pwd || pwd!==pwd2} onClick={async ()=>{ setMsg(null); setSaving(true); try { await changePassword(cur,pwd); setCur(''); setPwd(''); setPwd2(''); setMsg('Senha alterada com sucesso'); } catch(e){ setMsg('Falha ao alterar senha'); } finally { setSaving(false);} }}>Alterar Senha</Button>
            </div>
          </div>
          {msg && <div className="text-sm text-green-600">{msg}</div>}
        </CardContent>
        <CardFooter>
          <Button disabled={saving || !name.trim() || !emailValid} onClick={async ()=>{ setMsg(null); setSaving(true); try{ const nextName=name.trim(); const nextEmail=email.trim().toLowerCase(); await updateProfile({name: nextName, email: nextEmail}); localStorage.setItem('profile:last', JSON.stringify({name: nextName, email: nextEmail})); setMsg('Perfil atualizado'); } catch{ setMsg('Falha ao atualizar'); } finally{ setSaving(false);} }}>Salvar Alterações</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
