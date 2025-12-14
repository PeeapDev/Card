/**
 * Accessibility Utilities Tests
 */

import {
  generateId,
  handleEscapeKey,
  ariaProps,
  prefersReducedMotion,
  prefersHighContrast,
} from '@/lib/accessibility';

describe('Accessibility Utilities', () => {
  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('uses prefix when provided', () => {
      const id = generateId('modal');
      expect(id).toMatch(/^modal-\d+$/);
    });

    it('uses default prefix when not provided', () => {
      const id = generateId();
      expect(id).toMatch(/^aria-\d+$/);
    });
  });

  describe('handleEscapeKey', () => {
    it('calls callback when Escape is pressed', () => {
      const callback = jest.fn();
      const handler = handleEscapeKey(callback);

      handler({ key: 'Escape' } as KeyboardEvent);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('does not call callback for other keys', () => {
      const callback = jest.fn();
      const handler = handleEscapeKey(callback);

      handler({ key: 'Enter' } as KeyboardEvent);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('ariaProps', () => {
    describe('button', () => {
      it('returns aria-label', () => {
        const props = ariaProps.button('Close');
        expect(props['aria-label']).toBe('Close');
      });

      it('includes aria-expanded when provided', () => {
        const props = ariaProps.button('Menu', true, 'menu-1');
        expect(props['aria-expanded']).toBe(true);
        expect(props['aria-controls']).toBe('menu-1');
      });
    });

    describe('dialog', () => {
      it('returns required dialog props', () => {
        const props = ariaProps.dialog('dialog-title');
        expect(props.role).toBe('dialog');
        expect(props['aria-modal']).toBe(true);
        expect(props['aria-labelledby']).toBe('dialog-title');
      });

      it('includes describedBy when provided', () => {
        const props = ariaProps.dialog('dialog-title', 'dialog-desc');
        expect(props['aria-describedby']).toBe('dialog-desc');
      });
    });

    describe('alert', () => {
      it('uses alert role for errors', () => {
        const props = ariaProps.alert('error');
        expect(props.role).toBe('alert');
        expect(props['aria-live']).toBe('assertive');
      });

      it('uses status role for info', () => {
        const props = ariaProps.alert('info');
        expect(props.role).toBe('status');
        expect(props['aria-live']).toBe('polite');
      });
    });

    describe('tab', () => {
      it('returns tab props', () => {
        const props = ariaProps.tab(true, 'panel-1');
        expect(props.role).toBe('tab');
        expect(props['aria-selected']).toBe(true);
        expect(props['aria-controls']).toBe('panel-1');
        expect(props.tabIndex).toBe(0);
      });

      it('sets tabIndex to -1 when not selected', () => {
        const props = ariaProps.tab(false, 'panel-1');
        expect(props.tabIndex).toBe(-1);
      });
    });

    describe('progressbar', () => {
      it('returns progressbar props', () => {
        const props = ariaProps.progressbar(50, 0, 100, 'Loading');
        expect(props.role).toBe('progressbar');
        expect(props['aria-valuenow']).toBe(50);
        expect(props['aria-valuemin']).toBe(0);
        expect(props['aria-valuemax']).toBe(100);
        expect(props['aria-label']).toBe('Loading');
      });
    });
  });

  describe('prefersReducedMotion', () => {
    it('returns false when matchMedia returns false', () => {
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: false,
      }));
      expect(prefersReducedMotion()).toBe(false);
    });

    it('returns true when matchMedia returns true', () => {
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: true,
      }));
      expect(prefersReducedMotion()).toBe(true);
    });
  });

  describe('prefersHighContrast', () => {
    it('returns false when matchMedia returns false', () => {
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: false,
      }));
      expect(prefersHighContrast()).toBe(false);
    });

    it('returns true when matchMedia returns true', () => {
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: true,
      }));
      expect(prefersHighContrast()).toBe(true);
    });
  });
});
