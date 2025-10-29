import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Connect } from 'vite';

// Simple in-memory mock for /api/auth when backend isn't running
function authMock(): Connect.SimpleHandleFunction {
  const ADMIN_EMAIL = 'admin@admin.com';
  const ADMIN_PASSWORD = process.env.VITE_ADMIN_PASSWORD || '123456';
  let currentToken: string | null = null;
  let user = {
    id: '1',
    name: 'Admin',
    email: ADMIN_EMAIL,
    roleId: 'admin',
    permissions: ['dashboard','clientes','produtos','pedidos','ops','kanban','financeiro','relatorios','config'],
  };

  return async (req, res, next) => {
    const _url = req.url || ''; if (!_url.startsWith('/api/auth')) return next();

    const send = (status: number, body?: any) => {
      res.statusCode = status;
      if (body === undefined) return res.end();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    };

        if (req.method === 'POST' && (req.url || '').startsWith('/api/auth/login')) {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => {
        let body: any = {};
        try {
          body = data ? JSON.parse(data) : {};
        } catch {}

        const email = String((body as any).email || '').toLowerCase();
        const password = String((body as any).password || '');

        if (password === ADMIN_PASSWORD) {
          currentToken = 'mock-token-' + Date.now();
          if (email) user = { ...user, email, name: email.split('@')[0] } as any;
          return send(200, { token: currentToken, user });
        }
        return send(401, { message: 'Credenciais inválidas' });
      });
      return;
    }

    if (req.method === 'GET' && (req.url || '').startsWith('/api/auth/me')) {
      return currentToken ? send(200, user) : send(401, { message: 'NÃ£o autenticado' });
    }

    if (req.method === 'POST' && (req.url || '').startsWith('/api/auth/profile')) {
      if (!currentToken) return send(401, { message: 'Não autenticado' });
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => {
        try {
          const body: any = data ? JSON.parse(data) : {};
          const next = {
            ...user,
            ...(body.name ? { name: String(body.name) } : {}),
            ...(body.email ? { email: String(body.email).toLowerCase() } : {}),
          } as any;
          user = next;
          return send(200, user);
        } catch {
          return send(400, { message: 'Dados inválidos' });
        }
      });
      return;
    }

    if (req.method === 'POST' && (req.url || '').startsWith('/api/auth/logout')) {
      currentToken = null;
      return send(204);
    }

    // Users mock endpoints desabilitados para usar backend real via proxy
    // As chamadas a /api/users serão encaminhadas ao servidor Express (porta 3001).

    return next();
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 8081,
    // If you have a real backend at 3001, the proxy will handle other routes.
    // The mock below intercepts only /api/auth.* endpoints.
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
    // Register middleware via configureServer hook below
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // auth-mock desabilitado para usar backend real de autenticação
    // {
    //   name: 'auth-mock-middleware',
    //   configureServer(server) {
    //     server.middlewares.use(authMock());
    //   },
    // },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));




