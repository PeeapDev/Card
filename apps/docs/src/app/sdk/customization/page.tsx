export default function CustomizationPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Customization</h1>
      <p className="text-xl text-gray-600 mb-8">
        Customize the appearance and behavior of Peeap widgets to match your brand.
      </p>

      {/* Theming */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Theming</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Built-in Themes</h3>
            <pre>
{`// Light theme (default)
<POSTerminal theme="light" />

// Dark theme
<POSTerminal theme="dark" />

// System (follows user preference)
<POSTerminal theme="system" />`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom Theme</h3>
            <pre>
{`<POSTerminal
  theme={{
    // Colors
    primaryColor: '#4F46E5',
    primaryHover: '#4338CA',
    secondaryColor: '#10B981',
    backgroundColor: '#FFFFFF',
    surfaceColor: '#F9FAFB',
    textColor: '#111827',
    textSecondary: '#6B7280',
    borderColor: '#E5E7EB',

    // Typography
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      small: '12px',
      medium: '14px',
      large: '18px',
    },

    // Spacing & Borders
    borderRadius: '8px',
    padding: '16px',

    // Shadows
    shadow: '0 1px 3px rgba(0,0,0,0.1)',
    shadowLarge: '0 10px 25px rgba(0,0,0,0.15)',
  }}
/>`}
            </pre>
          </div>
        </div>
      </section>

      {/* CSS Customization */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">CSS Customization</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Using CSS Variables</h3>
            <pre>
{`/* Override widget CSS variables */
.peeap-widget {
  --peeap-primary: #4F46E5;
  --peeap-primary-hover: #4338CA;
  --peeap-secondary: #10B981;
  --peeap-background: #FFFFFF;
  --peeap-surface: #F9FAFB;
  --peeap-text: #111827;
  --peeap-text-secondary: #6B7280;
  --peeap-border: #E5E7EB;
  --peeap-radius: 8px;
  --peeap-shadow: 0 1px 3px rgba(0,0,0,0.1);
}`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Targeting Specific Elements</h3>
            <pre>
{`/* Product cards */
.peeap-product-card {
  border: 2px solid transparent;
  transition: all 0.2s;
}

.peeap-product-card:hover {
  border-color: var(--peeap-primary);
  transform: translateY(-2px);
}

/* Cart panel */
.peeap-cart {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Checkout button */
.peeap-checkout-button {
  background: linear-gradient(90deg, #10B981 0%, #059669 100%);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Category tabs */
.peeap-category-tab.active {
  background: var(--peeap-primary);
  color: white;
}`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Tailwind CSS Integration</h3>
            <pre>
{`<POSTerminal
  className="rounded-2xl shadow-2xl overflow-hidden"
  classNames={{
    container: "bg-gradient-to-br from-slate-900 to-slate-800",
    productGrid: "gap-4 p-6",
    productCard: "bg-white/10 backdrop-blur hover:bg-white/20",
    cart: "bg-slate-800 border-l border-slate-700",
    checkoutButton: "bg-emerald-500 hover:bg-emerald-600 rounded-xl"
  }}
/>`}
            </pre>
          </div>
        </div>
      </section>

      {/* Component Slots */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Component Slots</h2>
        <p className="text-gray-600 mb-4">
          Replace or extend parts of the widget with your own components.
        </p>

        <pre>
{`<POSTerminal
  apiKey="pk_live_xxx"
  merchantId="xxx"

  // Custom header
  renderHeader={() => (
    <div className="flex justify-between items-center p-4 bg-blue-600 text-white">
      <h1>My Store POS</h1>
      <span>Staff: John</span>
    </div>
  )}

  // Custom product card
  renderProductCard={(product, addToCart) => (
    <button
      onClick={() => addToCart(product)}
      className="p-4 bg-white rounded-lg shadow hover:shadow-lg"
    >
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p className="text-green-600 font-bold">\${product.price}</p>
    </button>
  )}

  // Custom receipt
  renderReceipt={(sale) => (
    <MyCustomReceipt sale={sale} />
  )}

  // Custom empty cart message
  renderEmptyCart={() => (
    <div className="text-center py-8">
      <span className="text-4xl">🛒</span>
      <p>Start adding products!</p>
    </div>
  )}
/>`}
        </pre>
      </section>

      {/* Localization */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Localization</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Built-in Languages</h3>
            <pre>
{`<POSTerminal
  locale="en"  // English (default)
  // locale="fr"  // French
  // locale="ar"  // Arabic (RTL supported)
/>`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom Translations</h3>
            <pre>
{`<POSTerminal
  translations={{
    // Cart
    cart: 'Shopping Cart',
    emptyCart: 'Your cart is empty',
    subtotal: 'Subtotal',
    tax: 'Tax',
    discount: 'Discount',
    total: 'Total',

    // Actions
    addToCart: 'Add to Cart',
    checkout: 'Complete Sale',
    clearCart: 'Clear Cart',

    // Categories
    allCategories: 'All',

    // Messages
    saleComplete: 'Sale completed successfully!',
    printReceipt: 'Print Receipt',
    newSale: 'New Sale',

    // Errors
    outOfStock: 'Out of stock',
    invalidDiscount: 'Invalid discount amount',
  }}
/>`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Currency Formatting</h3>
            <pre>
{`<POSTerminal
  currency="SLL"
  locale="en-SL"
  formatCurrency={(amount) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLL',
      minimumFractionDigits: 0,
    }).format(amount)
  }}
/>

// Or simpler:
<POSTerminal
  currency="SLL"
  currencySymbol="Le"
  currencyPosition="before"  // "before" or "after"
/>`}
            </pre>
          </div>
        </div>
      </section>

      {/* Feature Flags */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Feature Flags</h2>
        <p className="text-gray-600 mb-4">
          Enable or disable specific features to create a customized experience.
        </p>

        <pre>
{`<POSTerminal
  // Display options
  showCategories={true}
  showSearch={true}
  showInventory={true}
  showProductImages={true}
  showProductDescription={false}

  // Cart options
  allowDiscounts={true}
  allowNotes={true}
  allowQuantityEdit={true}

  // Payment options
  allowCash={true}
  allowCard={true}
  allowMobileMoney={true}
  allowSplitPayment={false}

  // Receipt options
  enablePrint={true}
  enableEmailReceipt={true}
  showQRCode={true}

  // Advanced
  offlineMode={false}
  autoSync={true}
/>`}
        </pre>
      </section>

      {/* AI Customization Prompt */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Customization Prompt</h2>
        <p className="text-gray-600 mb-4">
          Use this prompt with your AI assistant to customize widgets:
        </p>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-6">
          <pre className="text-sm whitespace-pre-wrap text-green-400">
{`I want to customize a Peeap widget in my app. Here's what I need:

## Current Widget
<POSTerminal apiKey="..." merchantId="..." />

## My Requirements
- Brand colors: Primary #[YOUR_COLOR], Secondary #[YOUR_COLOR]
- Theme: [light/dark]
- Currency: [YOUR_CURRENCY] with symbol [SYMBOL]
- Language: [YOUR_LANGUAGE]
- Features to ENABLE: [list features]
- Features to DISABLE: [list features]
- Custom styling: [describe styling needs]

## Available Customization Options
1. Theme colors: primaryColor, secondaryColor, backgroundColor, etc.
2. CSS classes: className, classNames object for specific elements
3. Translations: translations object for all text strings
4. Feature flags: showCategories, allowDiscounts, enablePrint, etc.
5. Component slots: renderHeader, renderProductCard, renderReceipt, etc.

Please generate the customized widget code with these specifications.`}
          </pre>
        </div>
      </section>
    </div>
  )
}
