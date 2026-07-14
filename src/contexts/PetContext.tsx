import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import type {
  Pet,
  PageContextInfo,
  ChatMessage,
  PetContextValue,
} from "../types/pet";
import { useAuthContext } from "./AuthContext";

const PetContext = createContext<PetContextValue | undefined>(undefined);

// Routes where the pet widget should NOT appear
const HIDDEN_ROUTES = ['/login', '/admin/login', '/admin'];

// Debounce tracking for browse exp
const browsedRoutes = new Set<string>();

export function PetProvider({ children }: { children: ReactNode }) {
  const { authState } = useAuthContext();
  const location = useLocation();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageContext, setPageContext] = useState<PageContextInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [expGained, setExpGained] = useState(0);
  const lastBrowseRoute = useRef<string>('');

  const isAuthenticated = authState.isAuthenticated;
  const currentPath = location.pathname;

  // ── Fetch pet profile ──
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/pet/profile', { credentials: 'include' });
      const data = await res.json() as { code: number; data?: { pet?: Pet; memoryCount?: number; todayExp?: number } };
      if (data.code === 0 && data.data?.pet) {
        setPet(data.data.pet as Pet);
      } else {
        setPet(null);
      }
    } catch {
      setPet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Adopt a pet ──
  const adoptPet = useCallback(async () => {
    try {
      const res = await fetch('/api/pet/adopt', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json() as { code: number; data?: { pet?: Pet } };
      if (data.code === 0 && data.data?.pet) {
        setPet(data.data.pet as Pet);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // ── Load pet on auth state change ──
  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setPet(null);
      setLoading(false);
      setMessages([]);
    }
  }, [isAuthenticated, fetchProfile]);

  // ── Set page context by route ──
  const setPageContextByRoute = useCallback(async (routePath: string) => {
    try {
      const res = await fetch(`/api/pet/context?path=${encodeURIComponent(routePath)}`, {
        credentials: 'include',
      });
      const data = await res.json() as { code: number; data?: PageContextInfo };
      if (data.code === 0 && data.data) {
        setPageContext(data.data as PageContextInfo);
      }
    } catch {
      // Fallback: use basic label
      setPageContext({
        routePath,
        pageLabel: '首页',
        pageIcon: '🏠',
        systemPrompt: '',
        tips: '',
      });
    }
  }, []);

  // ── Award browse exp when route changes ──
  const awardBrowseExp = useCallback(async (routePath: string) => {
    if (!isAuthenticated || !pet) return;
    // Prevent duplicate browse exp for the same route in a session
    if (browsedRoutes.has(routePath)) return;
    browsedRoutes.add(routePath);

    try {
      const res = await fetch('/api/pet/grow', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'browse', detail: routePath }),
      });
      const data = await res.json() as { code: number; data?: { expGained?: number; leveledUp?: boolean; currentExp?: number; currentLevel?: number } };
      if (data.code === 0 && data.data) {
        // Update pet state
        await fetchProfile();
        if (data.data.expGained && data.data.expGained > 0) {
          setExpGained(data.data.expGained);
          setTimeout(() => setExpGained(0), 2000);
        }
      }
    } catch {
      // Silent fail
    }
  }, [isAuthenticated, pet, fetchProfile]);

  // ── Award like exp ──
  const awardLikeExp = useCallback(async () => {
    if (!isAuthenticated || !pet) return;

    try {
      const res = await fetch('/api/pet/grow', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like' }),
      });
      const data = await res.json() as { code: number; data?: { expGained?: number } };
      if (data.code === 0) {
        await fetchProfile();
        if (data.data?.expGained && data.data.expGained > 0) {
          setExpGained(data.data.expGained);
          setTimeout(() => setExpGained(0), 2000);
        }
      }
    } catch {
      // Silent fail
    }
  }, [isAuthenticated, pet, fetchProfile]);

  // ── Route change effect ──
  useEffect(() => {
    if (!isAuthenticated) return;

    // Hide pet on login/admin pages
    if (HIDDEN_ROUTES.some(r => currentPath.startsWith(r))) {
      return;
    }

    // Update page context
    setPageContextByRoute(currentPath);
    lastBrowseRoute.current = currentPath;

    // Award browse exp (debounced — only once per route per session)
    const timer = setTimeout(() => {
      awardBrowseExp(currentPath);
    }, 3000); // Wait 3s on page before awarding browse exp

    return () => clearTimeout(timer);
  }, [currentPath, isAuthenticated, setPageContextByRoute, awardBrowseExp]);

  // ── Send message (SSE streaming) ──
  const sendMessage = useCallback(async (message: string) => {
    if (!pet || isStreaming) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      pageLabel: pageContext ? `${pageContext.pageIcon} ${pageContext.pageLabel}` : '',
    };
    setMessages(prev => [...prev, userMsg]);

    // Add placeholder for assistant streaming
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      pageLabel: pageContext ? `${pageContext.pageIcon} ${pageContext.pageLabel}` : '',
      streaming: true,
    };
    setMessages(prev => [...prev, assistantMsg]);
    setIsStreaming(true);

    try {
      const res = await fetch('/api/pet/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          pageUrl: currentPath,
          pageContextLabel: pageContext?.pageLabel || '',
        }),
      });

      // Check if response is SSE or JSON
      const contentType = res.headers.get('Content-Type') || '';
      
      if (contentType.includes('text/event-stream')) {
        // ── SSE Streaming ──
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;

              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.done) {
                  // Final chunk — update exp
                  if (parsed.expGained > 0) {
                    setExpGained(parsed.expGained);
                    await fetchProfile();
                    setTimeout(() => setExpGained(0), 2000);
                  }
                } else if (parsed.content) {
                  // Incremental content
                  setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === 'assistant' && last.streaming) {
                      updated[updated.length - 1] = {
                        ...last,
                        content: last.content + parsed.content,
                      };
                    }
                    return updated;
                  });
                }
              } catch {
                // Skip malformed
              }
            }
          }
        }

        // Mark streaming as done
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant' && last.streaming) {
            updated[updated.length - 1] = { ...last, streaming: false };
          }
          return updated;
        });
      } else {
        // ── JSON fallback (no AI backend) ──
        const data = await res.json() as { code: number; data?: { reply?: string; expGained?: number } };
        if (data.code === 0 && data.data?.reply) {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'assistant' && last.streaming) {
              updated[updated.length - 1] = {
                ...last,
                content: data.data!.reply!,
                streaming: false,
              };
            }
            return updated;
          });

          if (data.data.expGained && data.data.expGained > 0) {
            setExpGained(data.data.expGained);
            await fetchProfile();
            setTimeout(() => setExpGained(0), 2000);
          }
        }
      }
    } catch {
      // Network error
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant' && last.streaming) {
          updated[updated.length - 1] = {
            ...last,
            content: '网络出了点小问题，稍后再试~ 🿵',
            streaming: false,
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [pet, isStreaming, pageContext, currentPath, fetchProfile]);

  // ── Toggle chat panel ──
  const toggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);

  const setChatOpen = useCallback((open: boolean) => {
    setIsChatOpen(open);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const value: PetContextValue = {
    pet,
    loading,
    pageContext,
    messages,
    isChatOpen,
    isStreaming,
    expGained,
    adoptPet,
    fetchProfile,
    sendMessage,
    toggleChat,
    setChatOpen,
    awardBrowseExp,
    awardLikeExp,
    setPageContextByRoute,
    clearMessages,
  };

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>;
}

export function usePetContext(): PetContextValue {
  const context = useContext(PetContext);
  if (!context) {
    throw new Error("usePetContext must be used within a PetProvider");
  }
  return context;
}

export default PetContext;
