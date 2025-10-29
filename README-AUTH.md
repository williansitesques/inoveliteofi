Autenticação (Front + Backend)

Backend (Express)
- Requisitos: Node 18+
- Instalar deps: dentro de `server/`
  - npm i
  - cp .env.example .env (ajuste se quiser)
  - npm start

Endpoints:
- POST /api/auth/login { email, password } -> { token, user }
- GET /api/auth/me -> user
- POST /api/auth/logout -> 204

Seed de Admin:
- Usa variáveis do `.env`. Se não houver usuários, cria um admin e loga no console.

Frontend (Vite + React + TS)
- Instalar deps se faltar: npm i react-hook-form zod
- Rodar: npm run dev (porta 8081)
- Vite proxy já aponta /api -> http://localhost:3001

Arquivos principais:
- src/types/auth.ts (AuthUser, AuthResponse)
- src/services/auth.ts (login, me, logout)
- src/contexts/AuthContext.tsx (persistência em localStorage)
- src/components/auth/Protected.tsx (guard)
- src/pages/Login.tsx (tela de login)

Fluxo:
1) Suba o backend (server/ npm start)
2) Acesse /login e entre com as credenciais do seed
3) Redireciona para /
4) Use <Protected /> para proteger rotas e <Protected perm="kanban" /> para checar permissão

