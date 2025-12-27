/**
 * POS Product Labels / Barcode Printing Page
 * Generates printable labels with product name, price, SKU, and barcode
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Loader2,
  Printer,
  Download,
  Check,
  Settings2,
  Package,
  Barcode,
  Tag,
} from 'lucide-react';
import posService, { POSProduct } from '@/services/pos.service';

// Label sizes in mm
const LABEL_SIZES = {
  small: { width: 50, height: 25, name: 'Small (50x25mm)' },
  medium: { width: 70, height: 35, name: 'Medium (70x35mm)' },
  large: { width: 100, height: 50, name: 'Large (100x50mm)' },
  custom: { width: 80, height: 40, name: 'Custom' },
};

// Generate EAN-13 barcode bars pattern
const generateBarcodePattern = (code: string): string[] => {
  if (!code || code.length !== 13) return [];

  const encodings = {
    L: [
      '0001101', '0011001', '0010011', '0111101', '0100011',
      '0110001', '0101111', '0111011', '0110111', '0001011',
    ],
    G: [
      '0100111', '0110011', '0011011', '0100001', '0011101',
      '0111001', '0000101', '0010001', '0001001', '0010111',
    ],
    R: [
      '1110010', '1100110', '1101100', '1000010', '1011100',
      '1001110', '1010000', '1000100', '1001000', '1110100',
    ],
  };

  const parityPatterns = [
    'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
    'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
  ];

  const firstDigit = parseInt(code[0]);
  const parity = parityPatterns[firstDigit];

  const bars: string[] = ['101']; // Start guard

  // Left side (digits 2-7)
  for (let i = 1; i <= 6; i++) {
    const digit = parseInt(code[i]);
    const encoding = parity[i - 1] === 'L' ? encodings.L[digit] : encodings.G[digit];
    bars.push(encoding);
  }

  bars.push('01010'); // Center guard

  // Right side (digits 8-13)
  for (let i = 7; i <= 12; i++) {
    const digit = parseInt(code[i]);
    bars.push(encodings.R[digit]);
  }

  bars.push('101'); // End guard

  return bars;
};

export function POSLabelsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const merchantId = user?.id;

  // State
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [labelSize, setLabelSize] = useState<keyof typeof LABEL_SIZES>('medium');
  const [showPrice, setShowPrice] = useState(true);
  const [showSKU, setShowSKU] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [labelsPerProduct, setLabelsPerProduct] = useState(1);
  const [generating, setGenerating] = useState(false);

  // Load products
  useEffect(() => {
    if (merchantId) {
      loadProducts();
    }
  }, [merchantId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const prods = await posService.getProducts(merchantId!);
      setProducts(prods);
      // Select all products by default
      setSelectedProducts(new Set(prods.map(p => p.id)));
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedProducts(new Set(products.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedProducts(new Set());
  };

  // Generate barcode if product doesn't have one
  const getBarcode = (product: POSProduct): string => {
    if (product.barcode && product.barcode.length === 13) {
      return product.barcode;
    }
    // Generate a barcode based on product ID
    const prefix = '20';
    const productCode = Math.abs(product.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)).toString().padStart(10, '0').substring(0, 10);
    const baseCode = prefix + productCode;

    // Calculate check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(baseCode[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;

    return baseCode + checkDigit;
  };

  // Render barcode SVG
  const renderBarcode = (code: string) => {
    const pattern = generateBarcodePattern(code);
    if (pattern.length === 0) return null;

    const fullPattern = pattern.join('');
    const barWidth = 1.5;
    const height = 40;

    return (
      <svg
        width={fullPattern.length * barWidth}
        height={height}
        className="mx-auto"
      >
        {fullPattern.split('').map((bit, i) => (
          bit === '1' && (
            <rect
              key={i}
              x={i * barWidth}
              y={0}
              width={barWidth}
              height={height}
              fill="black"
            />
          )
        ))}
      </svg>
    );
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product Labels</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; }
            .labels-container {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              padding: 10px;
            }
            .label {
              border: 1px solid #ccc;
              padding: 8px;
              text-align: center;
              page-break-inside: avoid;
            }
            .product-name {
              font-weight: bold;
              font-size: 12px;
              margin-bottom: 4px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .product-price {
              font-size: 14px;
              font-weight: bold;
              color: #16a34a;
              margin-bottom: 4px;
            }
            .product-sku {
              font-size: 9px;
              color: #666;
              margin-bottom: 4px;
            }
            .barcode-number {
              font-size: 10px;
              letter-spacing: 2px;
              margin-top: 2px;
            }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .label { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const selectedProductsList = products.filter(p => selectedProducts.has(p.id));
  const size = LABEL_SIZES[labelSize];

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/merchant/apps/pos/products')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Print Labels</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Generate printable labels with barcodes
              </p>
            </div>
          </div>
          <Button
            onClick={handlePrint}
            disabled={selectedProducts.size === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Labels
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Label Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Label Settings
              </h3>

              <div className="space-y-4">
                {/* Label Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Label Size
                  </label>
                  <select
                    value={labelSize}
                    onChange={e => setLabelSize(e.target.value as keyof typeof LABEL_SIZES)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  >
                    {Object.entries(LABEL_SIZES).map(([key, val]) => (
                      <option key={key} value={key}>{val.name}</option>
                    ))}
                  </select>
                </div>

                {/* Labels per product */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Labels per product
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={labelsPerProduct}
                    onChange={e => setLabelsPerProduct(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={e => setShowPrice(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Show price</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSKU}
                      onChange={e => setShowSKU(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Show SKU</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBarcode}
                      onChange={e => setShowBarcode(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Show barcode</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Product Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Products ({selectedProducts.size}/{products.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    All
                  </button>
                  <button
                    onClick={deselectAll}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    None
                  </button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {products.map(product => (
                  <label
                    key={product.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {product.sku || 'No SKU'} • NLe {product.price.toLocaleString()}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Preview ({selectedProducts.size * labelsPerProduct} labels)
              </h3>

              {selectedProducts.size === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select products to preview labels</p>
                </div>
              ) : (
                <div
                  ref={printRef}
                  className="labels-container bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-[600px]"
                >
                  <div className="flex flex-wrap gap-3">
                    {selectedProductsList.flatMap(product =>
                      Array(labelsPerProduct).fill(null).map((_, i) => {
                        const barcode = getBarcode(product);
                        return (
                          <div
                            key={`${product.id}-${i}`}
                            className="label bg-white border border-gray-300 rounded-lg p-3 text-center"
                            style={{
                              width: `${size.width * 2}px`,
                              minHeight: `${size.height * 2}px`,
                            }}
                          >
                            <div
                              className="product-name text-sm font-bold truncate mb-1"
                              title={product.name}
                            >
                              {product.name}
                            </div>

                            {showPrice && (
                              <div className="product-price text-green-600 font-bold text-lg mb-1">
                                NLe {product.price.toLocaleString()}
                              </div>
                            )}

                            {showSKU && product.sku && (
                              <div className="product-sku text-xs text-gray-500 mb-2">
                                SKU: {product.sku}
                              </div>
                            )}

                            {showBarcode && (
                              <div className="barcode-container">
                                {renderBarcode(barcode)}
                                <div className="barcode-number text-xs tracking-widest mt-1">
                                  {barcode}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
}

export default POSLabelsPage;
