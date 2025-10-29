import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { seedAdminIfEmpty } from './seedAdmin.js';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3001;
const ORIGIN = process.env.ORIGIN || 'http://localhost:8081';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Persistência simples em arquivo JSON (demo)
import fs from 'fs';
import path from 'path';
const dataDir = path.resolve(process.cwd(), 'server', 'data');
const usersPath = path.join(dataDir, 'users.json');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, '[]');

function readUsers() {
  try { return JSON.parse(fs.readFileSync(usersPath, 'utf-8')); } catch { return []; }
}
function writeUsers(list) { fs.writeFileSync(usersPath, JSON.stringify(list, null, 2)); }

const ALL_PERMS = [
  'dashboard','clientes','produtos','pedidos','ops','kanban','financeiro','relatorios','config'
];

function publicUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function getTokenFromReq(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  if (req.cookies?.auth) return req.cookies.auth;
  return null;
}

// Schemas
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const users = readUsers();
    console.log('[auth] login attempt:', { email });
    const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u) {
      console.log('[auth] login fail: user not found');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    if (u.status === 'inativo') {
      console.log('[auth] login fail: user inactive');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const ok = await bcrypt.compare(password, u.passwordHash || '');
    if (!ok) {
      console.log('[auth] login fail: bad password');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = signToken(u.id);
    res.cookie('auth', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.json({ token, user: publicUser(u) });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Payload inválido' });
    console.error('[auth] login error', e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/api/auth/me', (req, res) => {
  try {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ error: 'Não autenticado' });
    const payload = jwt.verify(token, JWT_SECRET);
    const users = readUsers();
    const u = users.find((x) => x.id === payload.sub);
    if (!u) return res.status(401).json({ error: 'Não autenticado' });
    return res.json(publicUser(u));
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth');
  return res.status(204).end();
});

// health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// CRUD Users (demo)
const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  roleId: z.enum(['admin','producao','comercial','viewer']),
  permissions: z.array(z.string()),
  password: z.string().min(6),
  status: z.enum(['ativo','inativo']).optional(),
});

app.get('/api/users', (req,res)=>{
  const q = (req.query.q || '').toString().toLowerCase();
  const users = readUsers();
  const data = users.filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  res.json(data.map(publicUser));
});

app.post('/api/users', async (req,res)=>{
  try{
    const body = CreateUserSchema.parse(req.body);
    const users = readUsers();
    if (users.some(u=>u.email.toLowerCase()===body.email.toLowerCase())) return res.status(409).json({error:'E-mail já cadastrado'});
    const now = Date.now();
    const user = {
      id: crypto.randomUUID?.() || String(now),
      name: body.name,
      email: body.email,
      phone: body.phone,
      roleId: body.roleId,
      permissions: body.permissions,
      status: body.status || 'ativo',
      passwordHash: await bcrypt.hash(body.password,10),
      createdAt: now,
      updatedAt: now,
    };
    users.push(user); writeUsers(users);
    res.json(publicUser(user));
  }catch(e){
    if (e instanceof z.ZodError) return res.status(400).json({error:'Payload inválido'});
    res.status(500).json({error:'Erro interno'});
  }
});

app.patch('/api/users/:id', async (req,res)=>{
  try{
    const users = readUsers();
    const idx = users.findIndex(u=>u.id===req.params.id);
    if (idx<0) return res.status(404).json({error:'Não encontrado'});
    
    const patch = req.body || {};
    const protectedIds = new Set(['admin-fixed','admin-1']);
    const protectedEmails = new Set(['willianinove01@gmail.com']);

    if (protectedIds.has(req.params.id) || protectedEmails.has(users[idx].email)) {
      if (patch.email && patch.email !== users[idx].email) {
        return res.status(400).json({ error: 'Email do usuário protegido não pode ser alterado' });
      }
    }

    if (patch.email && users.some(u=>u.email.toLowerCase()===patch.email.toLowerCase() && u.id!==req.params.id)) {
      return res.status(409).json({error:'E-mail já cadastrado'});
    }

    if (patch.password){
      patch.passwordHash = await bcrypt.hash(patch.password,10);
      delete patch.password;
    }

    users[idx] = { ...users[idx], ...patch, updatedAt: Date.now() };
    writeUsers(users);
    res.json(publicUser(users[idx]));
  }catch(e){
    console.error('[patch-user]', e)
    res.status(500).json({error:'Erro interno'});
  }
});

app.delete('/api/users/:id', (req, res) => {
  console.log(`[server] Recebida requisição para excluir usuário: ${req.params.id}`);

  const users = readUsers();
  const protectedIds = new Set(['admin-fixed', 'admin-1']);
  const protectedEmails = new Set(['willianinove01@gmail.com']);

  const userIndex = users.findIndex(u => u.id === req.params.id);

  if (userIndex === -1) {
    console.log('[server] Usuário não encontrado');
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  const victim = users[userIndex];

  if (protectedIds.has(victim.id) || protectedEmails.has(victim.email)) {
    console.log('[server] Tentativa de excluir usuário protegido');
    return res.status(400).json({ error: 'Este usuário é protegido e não pode ser excluído.' });
  }

  try {
    const next = users.filter(u => u.id !== req.params.id);
    writeUsers(next);
    console.log(`[server] Usuário ${req.params.id} excluído com sucesso.`);
    return res.status(204).end();
  } catch (error) {
    console.error('[server] Erro ao escrever o arquivo de usuários:', error);
    return res.status(500).json({ error: 'Erro interno ao tentar excluir o usuário.' });
  }
});

// Dev-only seed endpoint
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/seed-user', async (req, res) => {
    try {
      const body = req.body || {};
      const email = (body.email || '').toLowerCase();
      if (!email || !body.password || !body.name) return res.status(400).json({ error: 'name, email, password obrigatórios' });
      const users = readUsers();
      if (users.some(u => u.email.toLowerCase() === email)) return res.status(409).json({ error: 'E-mail já cadastrado' });
      const now = Date.now();
      const user = {
        id: crypto.randomUUID?.() || String(now),
        name: body.name,
        email,
        phone: body.phone || '',
        roleId: body.roleId || 'admin',
        permissions: body.permissions || ALL_PERMS,
        status: body.status || 'ativo',
        passwordHash: await bcrypt.hash(body.password, 10),
        createdAt: now,
        updatedAt: now,
      };
      users.push(user); writeUsers(users);
      res.json(publicUser(user));
    } catch (e) {
      res.status(500).json({ error: 'Erro interno' });
    }
  });
}

seedAdminIfEmpty().then(() => {
  app.listen(PORT, () => console.log(`[auth] Server running on http://localhost:${PORT}`));
});
