/**
 * Card Generator Component
 *
 * Generates digital card preview with QR code and PDF export
 */

import { useRef, useState } from 'react';
import { CreditCard, Download, Printer, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { clsx } from 'clsx';
import { BrandedQRCode, generateBrandedQRSVG } from './BrandedQRCode';

interface CardGeneratorProps {
  cardNumber: string;
  cardholderName: string;
  expiryMonth: number;
  expiryYear: number;
  cardType: 'VIRTUAL' | 'PHYSICAL';
  cardTypeName: string;
  colorGradient: string;
  qrCode: string;
  showBack?: boolean;
}

export function CardGenerator({
  cardNumber,
  cardholderName,
  expiryMonth,
  expiryYear,
  cardType,
  cardTypeName,
  colorGradient,
  qrCode,
  showBack = false,
}: CardGeneratorProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Format card number with spaces
  const formatCardNumber = (num: string): string => {
    return num.replace(/(.{4})/g, '$1 ').trim();
  };

  // Generate printable PDF
  const handlePrint = async () => {
    const printContent = cardRef.current;
    if (!printContent) return;

    setIsPrinting(true);

    try {
      // Generate the branded QR code SVG
      const qrSvgContent = await generateBrandedQRSVG(qrCode, 80, true);
      // Extract just the inner content (remove the outer <svg> wrapper since we have our own)
      const svgInner = qrSvgContent.replace(/<svg[^>]*>/, '').replace('</svg>', '');

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setIsPrinting(false);
        return;
      }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Card - ${cardNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              background: #f5f5f5;
            }
            .card-container {
              display: flex;
              flex-direction: column;
              gap: 40px;
              page-break-inside: avoid;
            }
            .card {
              width: 340px;
              height: 214px;
              border-radius: 16px;
              padding: 24px;
              color: white;
              position: relative;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .card.front { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
            .card.back { background: linear-gradient(135deg, #374151, #111827); }
            .card-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .card-type { font-size: 10px; text-transform: uppercase; opacity: 0.8; }
            .card-name { font-weight: bold; font-size: 16px; margin-top: 4px; }
            .card-icon { width: 32px; height: 32px; opacity: 0.8; }
            .card-footer {
              position: absolute;
              bottom: 24px;
              left: 24px;
              right: 24px;
            }
            .card-number {
              font-family: 'Courier New', monospace;
              font-size: 18px;
              letter-spacing: 2px;
            }
            .card-info {
              display: flex;
              justify-content: space-between;
              margin-top: 12px;
              font-size: 12px;
            }
            .card-label { opacity: 0.7; font-size: 10px; }
            .qr-container {
              position: absolute;
              right: 24px;
              bottom: 24px;
              background: white;
              padding: 8px;
              border-radius: 8px;
            }
            .qr-container svg { width: 80px; height: 80px; }
            .magnetic-strip {
              position: absolute;
              top: 30px;
              left: 0;
              right: 0;
              height: 40px;
              background: #1f2937;
            }
            .print-info {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 20px;
            }
            @media print {
              body { background: white; }
              .card { box-shadow: none; border: 1px solid #ddd; }
            }
          </style>
        </head>
        <body>
          <div class="card-container">
            <!-- Front of Card -->
            <div class="card front">
              <div class="card-header">
                <div>
                  <div class="card-type">${cardType}</div>
                  <div class="card-name">${cardTypeName}</div>
                </div>
                <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div class="card-footer">
                <div class="card-number">${formatCardNumber(cardNumber)}</div>
                <div class="card-info">
                  <div>
                    <div class="card-label">EXPIRES</div>
                    <div>${String(expiryMonth).padStart(2, '0')}/${String(expiryYear).slice(-2)}</div>
                  </div>
                  <div style="text-align: right;">
                    <div class="card-label">CARDHOLDER</div>
                    <div>${cardholderName.toUpperCase()}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Back of Card -->
            <div class="card back">
              <div class="magnetic-strip"></div>
              <div class="qr-container">
                <svg viewBox="0 0 80 80" width="80" height="80">
                  ${svgInner}
                </svg>
              </div>
              <div class="card-footer" style="left: 24px; right: auto; width: 140px;">
                <div style="font-size: 10px; opacity: 0.7; line-height: 1.4;">
                  <p>Scan QR code to activate your card</p>
                  <p style="margin-top: 8px; font-size: 9px; opacity: 0.6;">
                    Card Number: ${cardNumber}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="print-info">
            <p>Card generated on ${new Date().toLocaleString()}</p>
            <p>Please print on a quality card stock for best results</p>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
      printWindow.document.close();
    } catch (error) {
      console.error('Failed to generate print preview:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Card Preview Container */}
      <div ref={cardRef} className="flex flex-col sm:flex-row gap-6 justify-center items-center">
        {/* Front of Card */}
        <div
          className={clsx(
            'relative w-80 aspect-[1.586/1] rounded-xl p-6 text-white bg-gradient-to-br shadow-xl',
            colorGradient
          )}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-80">{cardType}</p>
              <p className="font-bold mt-1">{cardTypeName}</p>
            </div>
            <CreditCard className="w-8 h-8 opacity-80" />
          </div>
          <div className="absolute bottom-6 left-6 right-6">
            <p className="text-lg tracking-widest font-mono">
              {formatCardNumber(cardNumber)}
            </p>
            <div className="flex justify-between mt-3">
              <div>
                <p className="text-xs opacity-70">EXPIRES</p>
                <p className="text-sm">
                  {String(expiryMonth).padStart(2, '0')}/{String(expiryYear).slice(-2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-70">CARDHOLDER</p>
                <p className="text-sm">{cardholderName.toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Back of Card */}
        {showBack && (
          <div className="relative w-80 aspect-[1.586/1] rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 shadow-xl overflow-hidden">
            {/* Magnetic Strip */}
            <div className="absolute top-8 left-0 right-0 h-10 bg-gray-800" />

            {/* QR Code */}
            <div className="absolute bottom-6 right-6 bg-white p-1 rounded-lg">
              <BrandedQRCode value={qrCode} size={80} logoSizePercent={25} />
            </div>

            {/* Info */}
            <div className="absolute bottom-6 left-6 max-w-[140px] text-white">
              <p className="text-xs opacity-70 leading-relaxed">
                Scan QR code to activate your card
              </p>
              <p className="text-[10px] opacity-50 mt-2 font-mono truncate">
                {cardNumber}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={handlePrint} disabled={isPrinting}>
          {isPrinting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Printer className="w-4 h-4 mr-2" />
          )}
          Print Card
        </Button>
        <Button variant="outline" onClick={handlePrint} disabled={isPrinting}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>
    </div>
  );
}

export default CardGenerator;
