import { useEffect, type RefObject } from "react";

/**
 * Focus trap hook for modal/dialog accessibility (WCAG 2.1).
 *
 * - Traps Tab/Shift+Tab within the container
 * - Restores focus to the trigger element on unmount
 * - Closes on Escape key
 *
 * @param containerRef - Ref to the modal container element
 * @param isOpen - Whether the modal is open
 * @param onClose - Callback when Escape is pressed
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isOpen: boolean,
  onClose: () => void
): void {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the first focusable element in the container
    const focusable = getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      container.setAttribute("tabindex", "-1");
      container.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const focusableElements = getFocusableElements(container);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the trigger element
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose, containerRef]);
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = 'a[href], button:not([disabled]), textarea, input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="number"], select, [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0
  );
}
