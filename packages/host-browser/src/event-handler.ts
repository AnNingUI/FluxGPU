/**
 * Event Handler - Utilities for managing DOM events
 * 
 * Responsibilities:
 * - Attach and detach event listeners
 * - Normalize event data
 * - Handle common interaction patterns
 * - Provide cleanup mechanisms
 * 
 * Requirements: 6.1 - Browser-specific event handling
 */

export type EventCallback<T extends Event = Event> = (event: T) => void;

export interface EventSubscription {
  unsubscribe: () => void;
}

/**
 * Attach an event listener with automatic cleanup
 */
export function addEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  eventType: K,
  callback: EventCallback<HTMLElementEventMap[K]>,
  options?: AddEventListenerOptions
): EventSubscription {
  element.addEventListener(eventType, callback as EventListener, options);
  
  return {
    unsubscribe: () => {
      element.removeEventListener(eventType, callback as EventListener, options);
    },
  };
}

/**
 * Attach multiple event listeners at once
 */
export function addEventListeners(
  element: HTMLElement,
  events: Array<{
    type: keyof HTMLElementEventMap;
    callback: EventCallback;
    options?: AddEventListenerOptions;
  }>
): EventSubscription {
  const subscriptions = events.map(({ type, callback, options }) =>
    addEventListener(element, type, callback, options)
  );
  
  return {
    unsubscribe: () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    },
  };
}

/**
 * Get normalized mouse position relative to canvas
 */
export function getCanvasMousePosition(
  event: MouseEvent,
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  return { x, y };
}

/**
 * Get normalized mouse position in canvas coordinates (0-1 range)
 */
export function getNormalizedMousePosition(
  event: MouseEvent,
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  const pos = getCanvasMousePosition(event, canvas);
  return {
    x: pos.x / canvas.clientWidth,
    y: pos.y / canvas.clientHeight,
  };
}

/**
 * Handle pointer events with unified API for mouse and touch
 */
export interface PointerEventHandlers {
  onPointerDown?: (x: number, y: number, event: PointerEvent) => void;
  onPointerMove?: (x: number, y: number, event: PointerEvent) => void;
  onPointerUp?: (x: number, y: number, event: PointerEvent) => void;
}

export function attachPointerHandlers(
  element: HTMLElement,
  handlers: PointerEventHandlers
): EventSubscription {
  const subscriptions: EventSubscription[] = [];
  
  if (handlers.onPointerDown) {
    subscriptions.push(
      addEventListener(element, 'pointerdown', (event) => {
        const pos = getCanvasMousePosition(event, element as HTMLCanvasElement);
        handlers.onPointerDown!(pos.x, pos.y, event);
      })
    );
  }
  
  if (handlers.onPointerMove) {
    subscriptions.push(
      addEventListener(element, 'pointermove', (event) => {
        const pos = getCanvasMousePosition(event, element as HTMLCanvasElement);
        handlers.onPointerMove!(pos.x, pos.y, event);
      })
    );
  }
  
  if (handlers.onPointerUp) {
    subscriptions.push(
      addEventListener(element, 'pointerup', (event) => {
        const pos = getCanvasMousePosition(event, element as HTMLCanvasElement);
        handlers.onPointerUp!(pos.x, pos.y, event);
      })
    );
  }
  
  return {
    unsubscribe: () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    },
  };
}

/**
 * Handle keyboard events
 */
export interface KeyboardEventHandlers {
  onKeyDown?: (key: string, event: KeyboardEvent) => void;
  onKeyUp?: (key: string, event: KeyboardEvent) => void;
}

export function attachKeyboardHandlers(
  element: HTMLElement,
  handlers: KeyboardEventHandlers
): EventSubscription {
  const subscriptions: EventSubscription[] = [];
  
  if (handlers.onKeyDown) {
    subscriptions.push(
      addEventListener(element, 'keydown', (event) => {
        handlers.onKeyDown!(event.key, event);
      })
    );
  }
  
  if (handlers.onKeyUp) {
    subscriptions.push(
      addEventListener(element, 'keyup', (event) => {
        handlers.onKeyUp!(event.key, event);
      })
    );
  }
  
  return {
    unsubscribe: () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    },
  };
}

/**
 * Handle resize events with debouncing
 */
export function onResize(
  callback: (width: number, height: number) => void,
  debounceMs: number = 100
): EventSubscription {
  let timeoutId: number | null = null;
  
  const handleResize = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = window.setTimeout(() => {
      callback(window.innerWidth, window.innerHeight);
      timeoutId = null;
    }, debounceMs);
  };
  
  window.addEventListener('resize', handleResize);
  
  return {
    unsubscribe: () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('resize', handleResize);
    },
  };
}
