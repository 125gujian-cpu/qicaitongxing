import { useEffect } from 'react';

export interface ShortcutHandlers {
  reject?: () => void;
  maybe?: () => void;
  good?: () => void;
  previous?: () => void;
  next?: () => void;
  undo?: () => void;
  redo?: () => void;
  toggleZoom?: () => void;
  escape?: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable);
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const command = event.ctrlKey || event.metaKey;
      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) handlers.redo?.(); else handlers.undo?.();
        return;
      }
      const map: Record<string, (() => void) | undefined> = {
        '1': handlers.reject,
        '2': handlers.maybe,
        '3': handlers.good,
        ArrowLeft: handlers.previous,
        ArrowRight: handlers.next,
        ' ': handlers.toggleZoom,
        Escape: handlers.escape,
      };
      const handler = map[event.key];
      if (handler) { event.preventDefault(); handler(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, handlers]);
}
