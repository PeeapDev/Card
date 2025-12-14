/**
 * Accessibility Utilities
 *
 * Helper functions for ARIA attributes, keyboard navigation,
 * focus management, and screen reader announcements.
 */

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export function generateId(prefix = 'aria'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Trap focus within an element (for modals/dialogs)
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  element.addEventListener('keydown', handleKeyDown);
  firstElement?.focus();

  return () => element.removeEventListener('keydown', handleKeyDown);
}

/**
 * Handle escape key to close modals/menus
 */
export function handleEscapeKey(callback: () => void): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      callback();
    }
  };
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcer = document.createElement('div');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.textContent = message;

  document.body.appendChild(announcer);

  setTimeout(() => {
    document.body.removeChild(announcer);
  }, 1000);
}

/**
 * Keyboard navigation for lists/menus
 */
export function handleListKeyboardNav(
  e: React.KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  onSelect: (index: number) => void
): void {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[nextIndex]?.focus();
      break;
    case 'ArrowUp':
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prevIndex]?.focus();
      break;
    case 'Home':
      e.preventDefault();
      items[0]?.focus();
      break;
    case 'End':
      e.preventDefault();
      items[items.length - 1]?.focus();
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      onSelect(currentIndex);
      break;
  }
}

/**
 * Common ARIA props for interactive elements
 */
export const ariaProps = {
  button: (label: string, expanded?: boolean, controls?: string) => ({
    'aria-label': label,
    ...(expanded !== undefined && { 'aria-expanded': expanded }),
    ...(controls && { 'aria-controls': controls }),
  }),

  dialog: (labelledBy: string, describedBy?: string) => ({
    role: 'dialog' as const,
    'aria-modal': true,
    'aria-labelledby': labelledBy,
    ...(describedBy && { 'aria-describedby': describedBy }),
  }),

  alert: (type: 'error' | 'warning' | 'info' | 'success' = 'info') => ({
    role: type === 'error' ? 'alert' : 'status',
    'aria-live': type === 'error' ? 'assertive' as const : 'polite' as const,
  }),

  tab: (selected: boolean, controls: string) => ({
    role: 'tab' as const,
    'aria-selected': selected,
    'aria-controls': controls,
    tabIndex: selected ? 0 : -1,
  }),

  tabPanel: (id: string, labelledBy: string) => ({
    role: 'tabpanel' as const,
    id,
    'aria-labelledby': labelledBy,
    tabIndex: 0,
  }),

  menu: (labelledBy?: string) => ({
    role: 'menu' as const,
    ...(labelledBy && { 'aria-labelledby': labelledBy }),
  }),

  menuItem: (label?: string) => ({
    role: 'menuitem' as const,
    ...(label && { 'aria-label': label }),
  }),

  listbox: (label: string, multiselectable = false) => ({
    role: 'listbox' as const,
    'aria-label': label,
    'aria-multiselectable': multiselectable,
  }),

  option: (selected: boolean, label?: string) => ({
    role: 'option' as const,
    'aria-selected': selected,
    ...(label && { 'aria-label': label }),
  }),

  progressbar: (value: number, min = 0, max = 100, label?: string) => ({
    role: 'progressbar' as const,
    'aria-valuenow': value,
    'aria-valuemin': min,
    'aria-valuemax': max,
    ...(label && { 'aria-label': label }),
  }),

  loading: (label = 'Loading') => ({
    role: 'status' as const,
    'aria-live': 'polite' as const,
    'aria-label': label,
  }),
};

/**
 * Skip link component helper
 */
export const skipLinkStyles = {
  base: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400',
};

/**
 * Focus visible styles (for keyboard navigation)
 */
export const focusStyles = {
  ring: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
  outline: 'focus:outline-none focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2',
  within: 'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2',
};

/**
 * Visually hidden class (for screen readers only)
 */
export const visuallyHidden = 'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}
