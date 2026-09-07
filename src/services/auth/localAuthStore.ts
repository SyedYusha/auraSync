import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppRole, AuthUser } from '@/types/member';

const USERS_KEY = 'aurasync_demo_users';
const SESSION_KEY = 'aurasync_demo_session';

type DemoRole = Extract<AppRole, 'member' | 'gym_owner'>;

interface LocalUserRecord extends AuthUser {
  readonly passwordHash: string;
  readonly fullName: string;
}

const DEMO_ACCOUNTS: Record<DemoRole, { readonly id: string; readonly email: string; readonly fullName: string }> = {
  member: {
    id: 'local-demo-member',
    email: 'demo.member@aurasync.local',
    fullName: 'Alex Morgan',
  },
  gym_owner: {
    id: 'local-demo-gym-owner',
    email: 'demo.owner@aurasync.local',
    fullName: 'Jordan Williams',
  },
};

// Demo-only obfuscation for the local fallback auth used when Supabase is not
// configured. This is never used when real credentials are supplied.
function hashPassword(password: string): string {
  let hash = 5381;
  const salted = `aurasync::${password}`;
  for (let i = 0; i < salted.length; i += 1) {
    hash = ((hash * 33) ^ salted.charCodeAt(i)) >>> 0;
  }
  return `djb2:${hash.toString(16)}`;
}

async function readUsers(): Promise<Record<string, LocalUserRecord>> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  return raw ? (JSON.parse(raw) as Record<string, LocalUserRecord>) : {};
}

async function writeUsers(users: Record<string, LocalUserRecord>): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function makeId(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const localAuthStore = {
  async signUp(email: string, password: string, fullName: string): Promise<AuthUser | null> {
    const users = await readUsers();
    if (users[email]) return null;
    const user: LocalUserRecord = { id: makeId(), email, passwordHash: hashPassword(password), fullName };
    users[email] = user;
    await writeUsers(users);
    return { id: user.id, email: user.email };
  },

  async signIn(email: string, password: string): Promise<AuthUser | null> {
    const users = await readUsers();
    const user = users[email];
    if (!user || user.passwordHash !== hashPassword(password)) return null;
    return { id: user.id, email: user.email };
  },

  async getDemoUser(role: DemoRole): Promise<AuthUser> {
    const account = DEMO_ACCOUNTS[role];
    const users = await readUsers();
    const existing = users[account.email];

    if (existing) {
      return { id: existing.id, email: existing.email };
    }

    const user: LocalUserRecord = {
      ...account,
      passwordHash: hashPassword('local-demo-only'),
    };
    users[account.email] = user;
    await writeUsers(users);
    return { id: user.id, email: user.email };
  },

  async saveSession(user: AuthUser): Promise<void> {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  async loadSession(): Promise<AuthUser | null> {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },

  async clearSession(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
  },
};
