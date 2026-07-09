import { useEffect } from "react";

/**
 * Hook to close a component when the Escape key is pressed.
 *
 * @param isOpen - Whether the component is open
 * @param onClose - Callback when Escape is pressed
 */
export function useEscapeKey(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);
}
