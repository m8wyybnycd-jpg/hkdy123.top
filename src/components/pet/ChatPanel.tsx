import { useState, useRef, useEffect } from "react";
import { usePetContext } from "../../contexts/PetContext";
import { PetCanvas } from "./PetCanvas";
import {
  LEVEL_NAMES,
  LEVEL_EMOJIS,
  LEVEL_COLORS,
  getLevelProgress,
  type ChatMessage,
} from "../../types/pet";

/**
 * ChatPanel — The expandable chat panel for the AI pet.
 * 
 * Shows conversation history, streaming AI responses,
 * page context indicator, and level progress bar.
 */

const PANEL_WIDTH = 340;
const PANEL_HEIGHT = 480;

interface ChatPanelProps {
  position: { x: number; y: number };
  onClose: () => void;
}

export function ChatPanel({ position, onClose }: ChatPanelProps) {
  const {
    pet,
    messages,
    isStreaming,
    pageContext,
    sendMessage,
    awardLikeExp,
  } = usePetContext();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Focus input on open ──
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // ── Calculate panel position (above the pet sprite) ──
  const panelX = Math.min(
    position.x,
    window.innerWidth - PANEL_WIDTH - 20
  );
  const panelY = Math.max(20, position.y - PANEL_HEIGHT - 10);

  if (!pet) return null;

  const progress = getLevelProgress(pet.exp);
  const levelColor = LEVEL_COLORS[pet.level - 1];
  const levelName = LEVEL_NAMES[pet.level - 1];
  const levelEmoji = LEVEL_EMOJIS[pet.level - 1];

  // ── Handle send ──
  const handleSend = () => {
    const msg = input.trim();
    if (!msg || isStreaming) return;
    setInput('');
    sendMessage(msg);
  };

  // ── Handle Enter key ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Show initial greeting if no messages ──
  const showGreeting = messages.length === 0;

  return (
    <div
      style={{
        position: 'fixed',
        left: panelX,
        top: panelY,
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: `1px solid ${levelColor}40`,
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${levelColor}20`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'petPanelSlide 0.2s ease-out',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
          background: `linear-gradient(135deg, ${levelColor}15, transparent)`,
        }}
      >
        {/* Mini pet avatar */}
        <div style={{ flexShrink: 0 }}>
          <PetCanvas state="idle" size={36} level={pet.level} />
        </div>

        {/* Pet name + level */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            {pet.name}
            <span style={{
              fontSize: '11px',
              color: levelColor,
              background: `${levelColor}20`,
              padding: '1px 6px',
              borderRadius: '6px',
            }}>
              {levelEmoji} {levelName} Lv.{pet.level}
            </span>
          </div>
          {/* Exp progress bar */}
          <div style={{
            marginTop: '3px',
            height: '4px',
            background: 'rgba(99, 102, 241, 0.15)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress.percent}%`,
              height: '100%',
              background: `linear-gradient(90deg, #34d399, ${levelColor})`,
              borderRadius: '2px',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{
            fontSize: '10px',
            color: '#64748b',
            marginTop: '2px',
          }}>
            {pet.level >= 5 ? '✨ 已满级' : `${progress.current}/${progress.needed} → 下一级`}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: 'none',
            color: '#94a3b8',
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          ✕
        </button>
      </div>

      {/* ── Page context indicator ── */}
      {pageContext && (
        <div style={{
          padding: '6px 14px',
          background: 'rgba(99, 102, 241, 0.08)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
          fontSize: '11px',
          color: '#818cf8',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          📍 当前页面: {pageContext.pageIcon} {pageContext.pageLabel}
        </div>
      )}

      {/* ── Messages area ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {showGreeting ? (
          <GreetingView
            petName={pet.name}
            levelEmoji={levelEmoji}
            tips={pageContext?.tips || `你好呀！我是${pet.name}，你的专属云玩精灵~ 有什么想了解的？`}
          />
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={idx}
              message={msg}
              onLike={msg.role === 'assistant' && !msg.streaming ? awardLikeExp : undefined}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid rgba(99, 102, 241, 0.15)',
          display: 'flex',
          gap: '8px',
          background: 'rgba(15, 23, 42, 0.6)',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? '精灵正在回复...' : '输入消息，Enter发送'}
          disabled={isStreaming}
          style={{
            flex: 1,
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '8px',
            padding: '8px 12px',
            color: '#e2e8f0',
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.6)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
          }}
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          style={{
            background: isStreaming || !input.trim()
              ? 'rgba(99, 102, 241, 0.2)'
              : 'linear-gradient(135deg, #6366f1, #818cf8)',
            border: 'none',
            color: '#fff',
            padding: '0 14px',
            borderRadius: '8px',
            cursor: isStreaming || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            transition: 'all 0.15s',
            opacity: isStreaming ? 0.5 : 1,
          }}
        >
          {isStreaming ? '...' : '发送'}
        </button>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes petPanelSlide {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Greeting View ────────────────────────────────────────

function GreetingView({ petName, levelEmoji, tips }: { petName: string; levelEmoji: string; tips: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      padding: '20px 10px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'rgba(99, 102, 241, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
      }}>
        {levelEmoji}
      </div>
      <div style={{
        fontSize: '14px',
        color: '#cbd5e1',
        lineHeight: '1.6',
      }}>
        {tips}
      </div>
      <div style={{
        fontSize: '11px',
        color: '#64748b',
        marginTop: '4px',
      }}>
        💡 我会根据你浏览的页面给出建议
      </div>
    </div>
  );
}

// ── Message Bubble ───────────────────────────────────────

function MessageBubble({ message, onLike }: { message: ChatMessage; onLike?: () => void }) {
  const [liked, setLiked] = useState(false);

  const isUser = message.role === 'user';
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: '6px',
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: isUser ? 'rgba(99, 102, 241, 0.2)' : 'rgba(167, 139, 250, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        flexShrink: 0,
      }}>
        {isUser ? '🧑' : '✨'}
      </div>
      <div style={{
        maxWidth: '75%',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
      }}>
        <div style={{
          background: isUser
            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(129, 140, 248, 0.2))'
            : 'rgba(30, 41, 59, 0.6)',
          border: `1px solid ${isUser ? 'rgba(99, 102, 241, 0.3)' : 'rgba(71, 85, 105, 0.3)'}`,
          borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
          padding: '8px 12px',
          color: '#e2e8f0',
          fontSize: '13px',
          lineHeight: '1.5',
          wordBreak: 'break-word',
        }}>
          {message.content}
          {message.streaming && (
            <span style={{
              display: 'inline-block',
              width: '6px',
              height: '13px',
              background: '#34d399',
              marginLeft: '2px',
              animation: 'petBlink 0.8s infinite',
              verticalAlign: 'text-bottom',
            }} />
          )}
        </div>
        {/* Like button for assistant messages */}
        {!isUser && !message.streaming && message.content && onLike && (
          <button
            onClick={() => {
              if (!liked) {
                setLiked(true);
                onLike();
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: liked ? '#fbbf24' : '#64748b',
              fontSize: '11px',
              cursor: liked ? 'default' : 'pointer',
              padding: '2px 4px',
              alignSelf: 'flex-start',
            }}
          >
            {liked ? '👍 已点赞' : '点赞'}
          </button>
        )}
      </div>
      <style>{`
        @keyframes petBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default ChatPanel;
