/**
 * Admin pet management type definitions
 */

export interface AdminPetItem {
  id: number;
  userId: number;
  userEmail: string | null;
  username: string | null;
  name: string;
  level: number;
  exp: number;
  state: string;
  mood: string;
  totalChats: number;
  totalBrowses: number;
  totalLikes: number;
  hatchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPetStats {
  totalPets: number;
  levelDistribution: Record<number, number>;
  totalChats: number;
  totalBrowses: number;
  totalLikes: number;
  active24h: number;
  active7d: number;
  totalMemories: number;
  totalConversations: number;
  topPets: Array<{
    id: number;
    name: string;
    level: number;
    exp: number;
    totalChats: number;
    email: string | null;
    username: string | null;
  }>;
}

export interface AdminPetConversation {
  id: number;
  role: "user" | "assistant";
  content: string;
  pageContext: string;
  pageUrl: string;
  expGained: number;
  createdAt: string;
}

export interface AdminPetMemory {
  id: number;
  memoryType: string;
  content: string;
  importance: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPetListResponse {
  items: AdminPetItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
