/**
 * Pet module type definitions
 */

// ── Pet Types ────────────────────────────────────────────

export type PetState = 'idle' | 'waving' | 'jumping' | 'running' | 'failed' | 'waiting' | 'review';
export type PetMood = 'happy' | 'curious' | 'excited' | 'tired';
export type MemoryType = 'preference' | 'fact' | 'event' | 'summary';

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

export interface PetMemory {
  id: number;
  petId: number;
  memoryType: MemoryType;
  content: string;
  importance: number;
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

export interface PageContextInfo {
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
export const LEVEL_COLORS = ['#fbbf24', '#6366f1', '#818cf8', '#a78bfa', '#c084fc'] as const;

export function getLevelFromExp(exp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getLevelProgress(exp: number): { current: number; needed: number; percent: number; level: number } {
  const level = getLevelFromExp(exp);
  if (level >= 5) return { current: exp - LEVEL_THRESHOLDS[4], needed: 0, percent: 100, level };
  const baseExp = LEVEL_THRESHOLDS[level - 1];
  const nextExp = LEVEL_THRESHOLDS[level];
  const current = exp - baseExp;
  const needed = nextExp - baseExp;
  return { current, needed, percent: Math.round((current / needed) * 100), level };
}

// ── Chat Types ───────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  pageLabel?: string;
  streaming?: boolean;
}

export interface PetContextValue {
  pet: Pet | null;
  loading: boolean;
  pageContext: PageContextInfo | null;
  messages: ChatMessage[];
  isChatOpen: boolean;
  isStreaming: boolean;
  expGained: number;
  adoptPet: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
  awardBrowseExp: (routePath: string) => Promise<void>;
  awardLikeExp: () => Promise<void>;
  setPageContextByRoute: (routePath: string) => Promise<void>;
  clearMessages: () => void;
}
