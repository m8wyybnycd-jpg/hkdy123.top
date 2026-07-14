import { useState, useRef, useEffect, useCallback } from "react";
import { PetCanvas } from "./PetCanvas";
import { ChatPanel } from "./ChatPanel";
import { usePetContext } from "../../contexts/PetContext";
import { LEVEL_NAMES, LEVEL_EMOJIS, getLevelProgress } from "../../types/pet";

/**
 * PetWidget — The floating pet widget.
 * 
 * Shows as a small floating pet sprite in the corner.
 * Click to expand the chat panel.
 * Draggable — snaps to nearest corner on release.
 */

const PET_SIZE = 72;
const EDGE_MARGIN = 20;

export function PetWidget() {
  const {
    pet,
    loading,
    isChatOpen,
    toggleChat,
    setChatOpen,
    pageContext,
    expGained,
  } = usePetContext();

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [widgetStart, setWidgetStart] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // ── Initialize position (bottom-right) ──
  useEffect(() => {
    if (initialized) return;
    const x = window.innerWidth - PET_SIZE - EDGE_MARGIN;
    const y = window.innerHeight - PET_SIZE - EDGE_MARGIN;
    setPosition({ x, y });
    setInitialized(true);
  }, [initialized]);

  // ── Determine pet state ──
  const getPetState = () => {
    if (!pet) return 'idle' as const;
    if (isDragging) return 'running' as const;
    if (hovered && !isChatOpen) return 'waving' as const;
    if (isChatOpen) return 'idle' as const;
    return pet.state || 'idle';
  };

  // ── Drag handlers ──
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isChatOpen) return; // Don't drag when chat is open
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setWidgetStart({ x: position.x, y: position.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPosition({
      x: widgetStart.x + dx,
      y: widgetStart.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Snap to nearest corner
    const centerX = position.x + PET_SIZE / 2;
    const centerY = position.y + PET_SIZE / 2;
    const snapX = centerX < window.innerWidth / 2 ? EDGE_MARGIN : window.innerWidth - PET_SIZE - EDGE_MARGIN;
    const snapY = centerY < window.innerHeight / 2 ? EDGE_MARGIN : window.innerHeight - PET_SIZE - EDGE_MARGIN;
    
    // Animate to snap position
    setPosition({ x: snapX, y: snapY });
  };

  // ── Don't render if loading, not authenticated, or on hidden routes ──
  if (loading) return null;
  if (!pet) return null;

  const progress = getLevelProgress(pet.exp);
  const petState = getPetState();

  return (
    <>
      {/* Floating pet sprite */}
      <div
        ref={widgetRef}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: PET_SIZE,
          height: PET_SIZE,
          zIndex: 9998,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
          transition: isDragging ? 'none' : 'left 0.3s ease, top 0.3s ease',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => {
          if (!isDragging) toggleChat();
        }}
      >
        {/* Exp gained floating indicator */}
        {expGained > 0 && (
          <div
            style={{
              position: 'absolute',
              top: -10,
              right: -5,
              background: '#34d399',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 'bold',
              padding: '2px 6px',
              borderRadius: '10px',
              animation: 'petExpFloat 2s ease-out forwards',
              zIndex: 1,
            }}
          >
            +{expGained} exp
          </div>
        )}

        {/* Canvas sprite */}
        <PetCanvas state={petState} size={PET_SIZE} level={pet.level} />

        {/* Level badge */}
        <div
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(99, 102, 241, 0.5)',
            borderRadius: '8px',
            padding: '1px 5px',
            fontSize: '10px',
            fontWeight: 'bold',
            color: '#a78bfa',
            backdropFilter: 'blur(4px)',
          }}
        >
          {LEVEL_EMOJIS[pet.level - 1]} Lv.{pet.level}
        </div>

        {/* Notification dot when chat is closed */}
        {!isChatOpen && pet.totalChats === 0 && (
          <div
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 10,
              height: 10,
              background: '#ef4444',
              borderRadius: '50%',
              border: '2px solid rgba(15, 23, 42, 0.9)',
              animation: 'petPulse 1.5s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* Chat panel */}
      {isChatOpen && (
        <ChatPanel
          position={position}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Inline styles for animations */}
      <style>{`
        @keyframes petExpFloat {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-30px); }
        }
        @keyframes petPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
      `}</style>
    </>
  );
}

export default PetWidget;
