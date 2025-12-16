/**
 * Branded QR Code Component
 *
 * A centralized QR code component with Peeap branding (logo in center).
 * Use this component for all QR code generation to ensure consistent branding.
 *
 * The logo uses error correction level "H" (High ~30%) to ensure QR codes
 * remain scannable even with the logo overlay.
 */

import { useEffect } from 'react';
import QRCode from 'react-qr-code';
import * as QRCodeLib from 'qrcode';

// Load Google Font for cursive branding
const CURSIVE_FONT_URL = 'https://fonts.googleapis.com/css2?family=Pacifico&display=swap';

let fontLoaded = false;
function loadCursiveFont() {
  if (fontLoaded || typeof document === 'undefined') return;

  const existing = document.querySelector(`link[href="${CURSIVE_FONT_URL}"]`);
  if (!existing) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CURSIVE_FONT_URL;
    document.head.appendChild(link);
  }
  fontLoaded = true;
}

export interface BrandedQRCodeProps {
  /** The data to encode in the QR code */
  value: string;
  /** Size of the QR code in pixels (default: 200) */
  size?: number;
  /** Whether to show the Peeap logo in the center (default: true) */
  showLogo?: boolean;
  /** Logo size as percentage of QR code size (default: 20) */
  logoSizePercent?: number;
  /** Background color of the QR code (default: white) */
  bgColor?: string;
  /** Foreground color of the QR code modules (default: black) */
  fgColor?: string;
  /** Custom logo element (overrides default Peeap logo) */
  customLogo?: React.ReactNode;
  /** Additional CSS class for the container */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** Whether the QR code is expired/disabled (adds blur effect) */
  disabled?: boolean;
}

/**
 * Default Peeap logo component using the app icon
 */
function PeeapLogo({ size }: { size: number }) {
  return (
    <img
      src="/icons/icon-192x192.svg"
      alt="Peeap"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.167,
      }}
    />
  );
}

/**
 * Branded QR Code with Peeap logo overlay
 *
 * @example
 * // Basic usage
 * <BrandedQRCode value="https://pay.peeap.com/user123" />
 *
 * @example
 * // Custom size without logo
 * <BrandedQRCode value="https://pay.peeap.com/user123" size={300} showLogo={false} />
 *
 * @example
 * // Custom colors
 * <BrandedQRCode value="data" fgColor="#1d4ed8" bgColor="#f0f9ff" />
 */
export function BrandedQRCode({
  value,
  size = 200,
  showLogo = true,
  logoSizePercent = 20,
  bgColor = '#FFFFFF',
  fgColor = '#000000',
  customLogo,
  className = '',
  style,
  disabled = false,
}: BrandedQRCodeProps) {
  const logoSize = Math.floor(size * (logoSizePercent / 100));
  const logoContainerSize = logoSize + 8;

  // Load cursive font on mount
  useEffect(() => {
    loadCursiveFont();
  }, []);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: size,
        height: size,
        ...style,
      }}
    >
      {/* QR Code */}
      <QRCode
        value={value}
        size={size}
        level={showLogo ? 'H' : 'M'} // High error correction when logo is shown
        bgColor={bgColor}
        fgColor={fgColor}
        style={{
          width: '100%',
          height: '100%',
          filter: disabled ? 'blur(4px)' : 'none',
          opacity: disabled ? 0.5 : 1,
          display: 'block',
        }}
      />

      {/* Logo Overlay - centered using transform */}
      {showLogo && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: logoContainerSize * 1.5,
            height: logoContainerSize,
            paddingLeft: 12,
            paddingRight: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            borderRadius: logoContainerSize / 2,
            boxShadow: '0 3px 12px rgba(34, 197, 94, 0.45)',
            zIndex: 10,
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.3)',
          }}
        >
          <span
            style={{
              color: 'white',
              fontSize: Math.max(logoSize * 0.6, 14),
              fontFamily: '"Pacifico", "Brush Script MT", "Segoe Script", cursive',
              letterSpacing: '0.5px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap',
            }}
          >
            peeap
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Generate a branded QR code as an SVG string (for print layouts)
 * This is useful for generating QR codes for PDFs or print layouts.
 * Returns a promise since QR code generation is async.
 */
export async function generateBrandedQRSVG(
  value: string,
  size: number = 200,
  showLogo: boolean = true
): Promise<string> {
  // Generate the base QR code as SVG string
  const qrSvg = await QRCodeLib.toString(value, {
    type: 'svg',
    width: size,
    margin: 1,
    errorCorrectionLevel: showLogo ? 'H' : 'M', // High error correction when logo is shown
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  if (!showLogo) {
    return qrSvg;
  }

  // Parse the SVG to inject the logo with gradient and cursive style
  const logoHeight = Math.floor(size * 0.15);
  const logoWidth = Math.floor(logoHeight * 2.8); // wider for "peeap" text
  const logoX = (size - logoWidth) / 2;
  const logoY = (size - logoHeight) / 2;
  const fontSize = Math.max(Math.floor(logoHeight * 0.65), 10);
  const rx = logoHeight / 2; // pill shape

  const logoSVG = `
    <defs>
      <linearGradient id="peeapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#22c55e"/>
        <stop offset="100%" style="stop-color:#16a34a"/>
      </linearGradient>
    </defs>
    <g>
      <rect x="${logoX}" y="${logoY}" width="${logoWidth}" height="${logoHeight}" rx="${rx}" fill="url(#peeapGradient)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <text x="${size / 2}" y="${logoY + logoHeight * 0.72}" font-size="${fontSize}" text-anchor="middle" fill="white" font-family="Pacifico, Brush Script MT, cursive" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.15)">peeap</text>
    </g>
  `;

  // Insert the logo before the closing </svg> tag
  return qrSvg.replace('</svg>', `${logoSVG}</svg>`);
}

/**
 * Generate a branded QR code as a data URL (for images in print)
 * Returns a promise since QR code generation is async.
 */
export async function generateBrandedQRDataURL(
  value: string,
  size: number = 200
): Promise<string> {
  const svg = await generateBrandedQRSVG(value, size, true);
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Get the Peeap logo as an SVG string with cursive styling
 */
export function getPeeapLogoSVG(size: number = 40): string {
  const width = size * 2.8;
  const height = size;
  const rx = size / 2; // pill shape
  const fontSize = Math.floor(size * 0.55);
  const textY = Math.floor(size * 0.68);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="peeapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#22c55e"/>
          <stop offset="100%" style="stop-color:#16a34a"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="${rx}" fill="url(#peeapGrad)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <text x="${width / 2}" y="${textY}" font-size="${fontSize}" text-anchor="middle" fill="white" font-family="Pacifico, Brush Script MT, cursive">peeap</text>
    </svg>
  `.trim();
}

export default BrandedQRCode;
