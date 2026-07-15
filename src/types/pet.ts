/**
 * Pet module type definitions
 * V2: Synced with functions/lib/pet.ts — 7-level + 6-mood + Designer Tokens
 */

// ── Pet Types ────────────────────────────────────────────

export type PetState = 'idle' | 'waving' | 'jumping' | 'running' | 'failed' | 'waiting' | 'review';
export type PetMood = 'happy' | 'sad' | 'angry' | 'curious' | 'thinking' | 'sleep';
export type MemoryType = 'preference' | 'fact' | 'event' | 'summary';

export interface Pet {
  id: number;
  userId: number;
  name: string;
  level: number; // 1-7
  exp: number;
  state: PetState;
  mood: PetMood;
  totalChats: number;
  totalBrowses: number;
  totalLikes: number;
  streakDays: number;
  lastCheckinDate: string | null;
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

// ── 7-Level Growth System (synced with backend V2) ──────
//
// 温度漂移配色（设计师方案）：冷色→暖色渐进
// L1 青蓝→L2 双色→L3 靛蓝→L4 白核→L5 翠绿→L6 金色→L7 全光谱

export const LEVEL_THRESHOLDS = [0, 80, 200, 400, 700, 1200, 2000] as const;
export const MAX_LEVEL = 7;

export const LEVEL_NAMES = [
  '蛋',     // L1
  '幼崽',   // L2
  '少年',   // L3
  '青年',   // L4
  '成年',   // L5
  '精英',   // L6
  '传说',   // L7
] as const;

export const LEVEL_EMOJIS = [
  '🥚',   // L1
  '🐣',   // L2
  '🌿',   // L3
  '🌱',   // L4
  '🌟',   // L5
  '💎',   // L6
  '✨',   // L7
] as const;

/** UI hex colors for 7-level system (temperature-drift: cool→warm) */
export const LEVEL_COLORS = [
  '#06B6D4',  // L1 蛋    — 青蓝
  '#F59E0B',  // L2 幼崽  — 琥珀
  '#6366F1',  // L3 少年  — 靛蓝
  '#38BDF8',  // L4 青年  — 天蓝
  '#10B981',  // L5 成年  — 翠绿
  '#EAB308',  // L6 精英  — 金色
  '#FFFFFF',  // L7 传说  — 纯白
] as const;

// ── Designer Tokens: Per-level particle & color params ───

export interface LevelDesignToken {
  level: number;
  name: string;
  particleCount: [number, number];   // [min, max]
  primaryHue: number;                 // HSL hue
  secondaryHue: number | null;
  accentHue: number | null;
  saturation: number;                 // 0-100
  lightness: number;                  // 0-100 (core brightness)
  memoryAnchor: string;               // Designer's "记忆锚点"
}

export const LEVEL_DESIGN_TOKENS: LevelDesignToken[] = [
  {
    level: 1, name: '蛋',
    particleCount: [40, 60],
    primaryHue: 190, secondaryHue: null, accentHue: null,
    saturation: 80, lightness: 55,
    memoryAnchor: '静止的光球',
  },
  {
    level: 2, name: '幼崽',
    particleCount: [80, 100],
    primaryHue: 190, secondaryHue: 35, accentHue: null,
    saturation: 75, lightness: 58,
    memoryAnchor: '破壳的双色斑点',
  },
  {
    level: 3, name: '少年',
    particleCount: [120, 150],
    primaryHue: 190, secondaryHue: 35, accentHue: 239,
    saturation: 70, lightness: 60,
    memoryAnchor: '长出耳朵的轮廓',
  },
  {
    level: 4, name: '青年',
    particleCount: [180, 220],
    primaryHue: 190, secondaryHue: 35, accentHue: 239,
    saturation: 65, lightness: 65,
    memoryAnchor: '可见的核心光点',
  },
  {
    level: 5, name: '成年',
    particleCount: [250, 300],
    primaryHue: 190, secondaryHue: 35, accentHue: 160,
    saturation: 60, lightness: 68,
    memoryAnchor: '环绕的光晕',
  },
  {
    level: 6, name: '精英',
    particleCount: [350, 400],
    primaryHue: 200, secondaryHue: 45, accentHue: null,
    saturation: 55, lightness: 72,
    memoryAnchor: '棱角装甲 + 拖尾',
  },
  {
    level: 7, name: '传说',
    particleCount: [450, 500],
    primaryHue: 0, secondaryHue: null, accentHue: null,
    saturation: 5, lightness: 100,
    memoryAnchor: '多层光体 + 环绕星尘',
  },
];

export function getDesignToken(level: number): LevelDesignToken {
  return LEVEL_DESIGN_TOKENS[Math.min(level, MAX_LEVEL) - 1];
}

// ── Level Helpers ────────────────────────────────────────

export function getLevelFromExp(exp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getLevelProgress(exp: number): { current: number; needed: number; percent: number } {
  const level = getLevelFromExp(exp);
  if (level >= MAX_LEVEL) {
    const baseExp = LEVEL_THRESHOLDS[MAX_LEVEL - 1];
    return { current: exp - baseExp, needed: 0, percent: 100 };
  }
  const baseExp = LEVEL_THRESHOLDS[level - 1];
  const nextExp = LEVEL_THRESHOLDS[level];
  const current = exp - baseExp;
  const needed = nextExp - baseExp;
  return { current, needed, percent: Math.round((current / needed) * 100) };
}

// ── Emotion System (6 emotions, synced with backend) ─────

export interface EmotionToken {
  mood: PetMood;
  label: string;
  behavior: string;
  primaryHue: number;
  saturation: number;
  lightness: number;
  transitionMs: number;
  motionPattern: string;
}

export const EMOTION_TOKENS: EmotionToken[] = [
  {
    mood: 'happy',
    label: '开心',
    behavior: '向外扩散，振动频率提升',
    primaryHue: 35, saturation: 85, lightness: 60,
    transitionMs: 350,
    motionPattern: 'sine-bounce',
  },
  {
    mood: 'sad',
    label: '难过',
    behavior: '向内收缩，运动减速',
    primaryHue: 210, saturation: 20, lightness: 40,
    transitionMs: 400,
    motionPattern: 'droop-slow-drift',
  },
  {
    mood: 'angry',
    label: '生气',
    behavior: '高频振动，方向突变',
    primaryHue: 20, saturation: 90, lightness: 50,
    transitionMs: 200,
    motionPattern: 'zigzag-shake',
  },
  {
    mood: 'curious',
    label: '好奇',
    behavior: '向交互点倾斜',
    primaryHue: 239, saturation: 70, lightness: 55,
    transitionMs: 300,
    motionPattern: 'tilt-orbit',
  },
  {
    mood: 'thinking',
    label: '思考',
    behavior: '缓慢旋转，部分粒子上浮',
    primaryHue: 190, saturation: 60, lightness: 55,
    transitionMs: 400,
    motionPattern: 'spiral-rise',
  },
  {
    mood: 'sleep',
    label: '睡眠',
    behavior: '极度收缩，几乎静止',
    primaryHue: 210, saturation: 15, lightness: 30,
    transitionMs: 600,
    motionPattern: 'breath-scale',
  },
];

export function getEmotionToken(mood: PetMood): EmotionToken {
  return EMOTION_TOKENS.find(e => e.mood === mood) || EMOTION_TOKENS[0];
}

// ── Level-Up Effect ──────────────────────────────────────

export interface LevelUpEffect {
  leveledUp: boolean;
  fromLevel: number;
  toLevel: number;
  fromToken: LevelDesignToken;
  toToken: LevelDesignToken;
  isHatch: boolean;
  isMaxLevel: boolean;
}

export function getLevelUpEffect(oldLevel: number, newLevel: number): LevelUpEffect {
  return {
    leveledUp: newLevel > oldLevel,
    fromLevel: oldLevel,
    toLevel: newLevel,
    fromToken: getDesignToken(oldLevel),
    toToken: getDesignToken(newLevel),
    isHatch: oldLevel < 2 && newLevel >= 2,
    isMaxLevel: newLevel >= MAX_LEVEL,
  };
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
