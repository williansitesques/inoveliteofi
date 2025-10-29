import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  remember: z.boolean().optional(),
});

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [err, setErr] = useState<string | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: true },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    setErr(null);
    try {
      await login(data.email, data.password, data.remember);
      const to = location?.state?.from?.pathname || '/';
      navigate(to, { replace: true });
    } catch (e) {
      setErr('Credenciais inválidas');
    }
  });

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="email" className="text-sm font-medium">E-mail</label>
              <Input id="email" type="email" placeholder="email@empresa.com" {...form.register('email')} />
              <p className="text-xs text-red-500">{form.formState.errors.email?.message}</p>
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium">Senha</label>
              <Input id="password" type="password" placeholder="••••••" {...form.register('password')} />
              <p className="text-xs text-red-500">{form.formState.errors.password?.message}</p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={!!form.watch('remember')} onCheckedChange={(v) => form.setValue('remember', !!v)} />
              <label htmlFor="remember" className="text-sm">Manter conectado</label>
            </div>
            {err && <div className="text-sm text-red-600" role="alert">{err}</div>}
            <Button type="submit" className="w-full" aria-label="Entrar">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

