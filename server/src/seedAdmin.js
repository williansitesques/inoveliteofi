import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const dataDir = path.resolve(process.cwd(), 'server', 'data');
const usersPath = path.join(dataDir, 'users.json');

function readUsers() {
  try { return JSON.parse(fs.readFileSync(usersPath, 'utf-8')); } catch { return []; }
}
function writeUsers(list) { fs.writeFileSync(usersPath, JSON.stringify(list, null, 2)); }

export async function seedAdminIfEmpty() {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, '[]');
    const users = readUsers();
    if (users.length > 0) return; // já possui usuários

    const email = process.env.SEED_ADMIN_EMAIL;
    const name = process.env.SEED_ADMIN_NAME || 'Administrador';
    const pass = process.env.SEED_ADMIN_PASSWORD;
    if (!email || !pass) {
      console.warn('[seed] SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD ausentes');
      return;
    }

    const passwordHash = await bcrypt.hash(pass, 10);
    const now = Date.now();
    const ALL_PERMS = [
      'dashboard','clientes','produtos','pedidos','ops','kanban','financeiro','relatorios','config'
    ];
    users.push({
      id: 'admin-1',
      name,
      email,
      roleId: 'admin',
      permissions: ALL_PERMS,
      status: 'ativo',
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    writeUsers(users);
    console.log(`[seed] Admin criado: ${email}`);
  } catch (e) {
    console.error('[seed] erro ao criar admin', e);
  }
}

