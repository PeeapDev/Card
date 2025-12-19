import { ReactNode, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { trapFocus, handleEscapeKey, generateId } from '@/lib/accessibility';

interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Modal description for screen readers */
  description?: string;
  /** Modal content */
  children: ReactNode;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Whether clicking backdrop closes the modal */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes the modal */
  closeOnEscape?: boolean;
  /** Additional class name for the modal */
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const titleId = useRef(generateId('modal-title'));
  const descriptionId = useRef(generateId('modal-desc'));

  // Handle escape key - use ref to avoid re-running effect
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Trap focus and restore on close
  useEffect(() => {
    if (!isOpen) return;

    // Store currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Add escape key listener
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Trap focus within modal (only set up tab trapping, don't auto-focus)
    const element = modalRef.current;
    let cleanup: (() => void) | undefined;
    if (element) {
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
      // Focus first element only on initial open
      firstElement?.focus();
      cleanup = () => element.removeEventListener('keydown', handleKeyDown);
    }

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', escapeHandler);
      cleanup?.();
      document.body.style.overflow = '';

      // Restore focus to previous element
      previousActiveElement.current?.focus();
    };
  }, [isOpen, closeOnEscape]); // Only depend on isOpen and closeOnEscape

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
        onClick={closeOnBackdropClick ? onClose : undefined}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        aria-describedby={description ? descriptionId.current : undefined}
        className={clsx(
          'relative z-10 w-full bg-white rounded-lg shadow-xl',
          'max-h-[90vh] overflow-auto',
          'focus:outline-none',
          sizeClasses[size],
          className
        )}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2
            id={titleId.current}
            className="text-lg font-semibold text-gray-900"
          >
            {title}
          </h2>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Description (visually hidden but available to screen readers) */}
        {description && (
          <p id={descriptionId.current} className="sr-only">
            {description}
          </p>
        )}

        {/* Content */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );

  // Render in portal to escape stacking context issues
  return createPortal(modalContent, document.body);
}

// Compound components for structured modal content
Modal.Body = function ModalBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx('space-y-4', className)}>{children}</div>;
};

Modal.Footer = function ModalFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex items-center justify-end gap-3 pt-4 border-t border-gray-200 mt-4',
        className
      )}
    >
      {children}
    </div>
  );
};
