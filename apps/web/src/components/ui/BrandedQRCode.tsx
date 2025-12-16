/**
 * Branded QR Code Component
 *
 * A centralized QR code component with Peeap branding (logo in center).
 * Use this component for all QR code generation to ensure consistent branding.
 *
 * The logo uses error correction level "H" (High ~30%) to ensure QR codes
 * remain scannable even with the logo overlay.
 */

import QRCode from 'react-qr-code';
import * as QRCodeLib from 'qrcode';

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
            minWidth: logoContainerSize,
            height: logoContainerSize,
            paddingLeft: 8,
            paddingRight: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#22c55e',
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            zIndex: 10,
            overflow: 'hidden',
          }}
        >
          <span style={{
            color: 'white',
            fontSize: Math.max(logoSize * 0.45, 10),
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            letterSpacing: '-0.5px',
            textTransform: 'lowercase',
          }}>
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

  // Parse the SVG to inject the logo
  const logoHeight = Math.floor(size * 0.15);
  const logoWidth = Math.floor(logoHeight * 2.5); // wider for "peeap" text
  const logoX = (size - logoWidth) / 2;
  const logoY = (size - logoHeight) / 2;
  const fontSize = Math.max(Math.floor(logoHeight * 0.6), 8);

  const logoSVG = `
    <g>
      <rect x="${logoX}" y="${logoY}" width="${logoWidth}" height="${logoHeight}" rx="4" fill="#22c55e"/>
      <text x="${size / 2}" y="${logoY + logoHeight * 0.7}" font-size="${fontSize}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">peeap</text>
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
 * Get the Peeap logo as an SVG string
 */
export function getPeeapLogoSVG(size: number = 40): string {
  const width = size * 2.5;
  const height = size;
  const rx = Math.floor(size * 0.15);
  const fontSize = Math.floor(size * 0.5);
  const textY = Math.floor(size * 0.65);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" rx="${rx}" fill="#22c55e"/>
      <text x="${width / 2}" y="${textY}" font-size="${fontSize}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">peeap</text>
    </svg>
  `.trim();
}

export default BrandedQRCode;
