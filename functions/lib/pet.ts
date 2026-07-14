/**
 * AI Memory Pet - Shared types and utilities
 */

// ── Pet Types ────────────────────────────────────────────

export interface Pet {
  id: number;
  userId: number;
  name: string;
  level: number; // 1-5
  exp: number;
  state: PetState;
  mood: PetMood;
  totalChats: number;
  totalBrowses: number;
  totalLikes: number;
  hatchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PetState = 'idle' | 'waving' | 'jumping' | 'running' | 'failed' | 'waiting' | 'review';
export type PetMood = 'happy' | 'curious' | 'excited' | 'tired';
export type MemoryType = 'preference' | 'fact' | 'event' | 'summary';

export interface PetMemory {
  id: number;
  petId: number;
  memoryType: MemoryType;
  content: string;
  importance: number; // 1-10
  createdAt: string;
  updatedAt: string;
}

export interface PetConversation {
  id: number;
  petId: number;
  role: 'user' | 'assistant';
  content: string;
  pageContext: string;
  pageUrl: string;
  expGained: number;
  createdAt: string;
}

export interface PageContextEntry {
  routePath: string;
  pageLabel: string;
  pageIcon: string;
  systemPrompt: string;
  tips: string;
}

// ── Level System ─────────────────────────────────────────

export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000] as const;
export const LEVEL_NAMES = ['蛋', '幼崽', '成长', '伙伴', '专家'] as const;
export const LEVEL_EMOJIS = ['🥚', '🐣', '🌱', '🌟', '✨'] as const;

export function getLevelFromExp(exp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getLevelProgress(exp: number): { current: number; needed: number; percent: number } {
  const level = getLevelFromExp(exp);
  if (level >= 5) return { current: exp - LEVEL_THRESHOLDS[4], needed: 0, percent: 100 };
  const baseExp = LEVEL_THRESHOLDS[level - 1];
  const nextExp = LEVEL_THRESHOLDS[level];
  const current = exp - baseExp;
  const needed = nextExp - baseExp;
  return { current, needed, percent: Math.round((current / needed) * 100) };
}

// ── Exp Rules ────────────────────────────────────────────

export const EXP_RULES = {
  chat: 5,
  browse: 3,
  like: 2,
} as const;

export const DAILY_EXP_LIMITS = {
  chat: 50,
  browse: 30,
  like: 20,
} as const;

/**
 * Check daily exp limit for a given action type.
 * Queries the growth_logs table for today's entries.
 */
export async function checkDailyExpLimit(
  db: D1Database,
  petId: number,
  action: 'chat' | 'browse' | 'like'
): Promise<boolean> {
  const limit = DAILY_EXP_LIMITS[action];
  const todayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z';
  
  const result = await db.prepare(
    `SELECT COALESCE(SUM(exp_delta), 0) as total FROM pet_growth_logs 
     WHERE pet_id = ? AND action = ? AND created_at >= ?`
  ).bind(petId, action, todayStart).first();
  
  const todayExp = (result?.total as number) || 0;
  return todayExp < limit;
}
