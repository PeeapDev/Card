/**
 * Skip Link Component
 *
 * Allows keyboard users to skip navigation and jump directly to main content.
 * Only visible when focused (using Tab key).
 */

interface SkipLinkProps {
  /** ID of the element to skip to (defaults to 'main-content') */
  targetId?: string;
  /** Link text */
  children?: string;
}

export function SkipLink({
  targetId = 'main-content',
  children = 'Skip to main content',
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
    >
      {children}
    </a>
  );
}
