export default function JavaScriptSDKPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">JavaScript SDK</h1>
      <p className="text-xl text-gray-600 mb-8">
        Use Peeap widgets without React using our vanilla JavaScript SDK.
      </p>

      {/* CDN Installation */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">CDN Installation</h2>
        <p className="text-gray-600 mb-4">
          Add the script to your HTML file. No build tools required.
        </p>

        <pre>
{`<!-- Add to your HTML head or before closing body tag -->
<script src="https://cdn.peeap.com/widgets.js"></script>`}
        </pre>
      </section>

      {/* Basic Usage */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Basic Usage</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Render a Widget</h3>
            <pre>
{`<div id="pos-terminal"></div>

<script>
  // Render POS Terminal
  Peeap.render('POSTerminal', {
    container: '#pos-terminal',
    apiKey: 'pk_live_your_api_key',
    merchantId: 'your_merchant_id',
    theme: 'light',
    onSaleComplete: function(sale) {
      console.log('Sale completed:', sale)
    }
  })
</script>`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Widgets</h3>
            <pre>
{`// POS Terminal
Peeap.render('POSTerminal', { container: '#pos', ... })

// Invoice Creator
Peeap.render('InvoiceCreator', { container: '#invoices', ... })

// Event Tickets
Peeap.render('EventTicketSales', { container: '#tickets', eventId: 'evt_xxx', ... })

// Ticket Scanner
Peeap.render('TicketScanner', { container: '#scanner', eventId: 'evt_xxx', ... })

// Payment Link Creator
Peeap.render('PaymentLinkCreator', { container: '#payment-links', ... })

// Payment Button
Peeap.render('PaymentLinkButton', {
  container: '#pay-button',
  amount: 99.00,
  description: 'Premium Plan',
  ...
})`}
            </pre>
          </div>
        </div>
      </section>

      {/* Full Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Example</h2>
        <pre>
{`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Store</title>
  <style>
    .pos-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="pos-container">
    <h1>Point of Sale</h1>
    <div id="pos-terminal"></div>
  </div>

  <script src="https://cdn.peeap.com/widgets.js"></script>
  <script>
    // Wait for Peeap to be ready
    Peeap.ready(function() {
      // Render the POS Terminal
      var pos = Peeap.render('POSTerminal', {
        container: '#pos-terminal',
        apiKey: 'pk_live_your_api_key',
        merchantId: 'your_merchant_id',
        theme: 'light',
        currency: 'SLL',
        taxRate: 15,
        showCategories: true,
        showInventory: true,

        onSaleComplete: function(sale) {
          console.log('Sale ID:', sale.id)
          console.log('Total:', sale.total)
          alert('Sale completed! Receipt: ' + sale.receipt_number)
        },

        onError: function(error) {
          console.error('POS Error:', error)
          alert('Error: ' + error.message)
        }
      })

      // You can also control the widget programmatically
      // pos.clearCart()
      // pos.addProduct(productId, quantity)
      // pos.destroy()
    })
  </script>
</body>
</html>`}
        </pre>
      </section>

      {/* API Reference */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">API Reference</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Peeap.ready(callback)</h3>
            <p className="text-gray-600 mb-2">
              Execute code when the SDK is fully loaded.
            </p>
            <pre>
{`Peeap.ready(function() {
  // SDK is ready, safe to render widgets
})`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Peeap.render(widgetName, options)</h3>
            <p className="text-gray-600 mb-2">
              Render a widget into a container element. Returns a widget instance.
            </p>
            <pre>
{`var widget = Peeap.render('POSTerminal', {
  container: '#my-container',  // CSS selector or DOM element
  apiKey: 'pk_live_xxx',
  merchantId: 'xxx',
  // ... other options
})`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Widget Instance Methods</h3>
            <pre>
{`var pos = Peeap.render('POSTerminal', { ... })

// Destroy the widget
pos.destroy()

// Update configuration
pos.setConfig({ theme: 'dark' })

// POS-specific methods
pos.clearCart()
pos.addProduct('product_id', 2)
pos.setDiscount(10)  // 10%

// Invoice-specific methods
invoice.reset()
invoice.setCustomer({ name: 'John', email: 'john@example.com' })`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Global Configuration</h3>
            <pre>
{`// Set default config for all widgets
Peeap.config({
  apiKey: 'pk_live_xxx',
  merchantId: 'xxx',
  theme: 'dark',
  currency: 'SLL'
})

// Now you can render without repeating config
Peeap.render('POSTerminal', { container: '#pos' })
Peeap.render('InvoiceCreator', { container: '#invoices' })`}
            </pre>
          </div>
        </div>
      </section>

      {/* Event Handling */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Handling</h2>
        <pre>
{`var pos = Peeap.render('POSTerminal', {
  container: '#pos',
  apiKey: 'pk_live_xxx',
  merchantId: 'xxx',

  // Event callbacks
  onReady: function() {
    console.log('Widget is ready')
  },

  onProductAdded: function(product, quantity) {
    console.log('Added to cart:', product.name, 'x', quantity)
  },

  onCartUpdated: function(cart) {
    console.log('Cart total:', cart.total)
    document.getElementById('cart-count').textContent = cart.items.length
  },

  onSaleComplete: function(sale) {
    // Handle completed sale
    console.log('Sale:', sale.id)
    printReceipt(sale)
  },

  onError: function(error) {
    // Handle errors
    showNotification('Error: ' + error.message, 'error')
  }
})`}
        </pre>
      </section>

      {/* WordPress/Shopify */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Platform Integration</h2>

        <div className="space-y-6">
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">WordPress</h3>
            <pre className="text-sm">
{`<!-- Add to your theme's footer.php or via a custom HTML block -->
<div id="peeap-pos"></div>
<script src="https://cdn.peeap.com/widgets.js"></script>
<script>
  Peeap.ready(function() {
    Peeap.render('POSTerminal', {
      container: '#peeap-pos',
      apiKey: 'pk_live_xxx',
      merchantId: 'xxx'
    })
  })
</script>`}
            </pre>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Shopify</h3>
            <pre className="text-sm">
{`<!-- Add to theme.liquid before </body> -->
{% if template contains 'page.pos' %}
  <script src="https://cdn.peeap.com/widgets.js"></script>
  <script>
    Peeap.ready(function() {
      Peeap.render('POSTerminal', {
        container: '#peeap-pos',
        apiKey: '{{ settings.peeap_api_key }}',
        merchantId: '{{ settings.peeap_merchant_id }}'
      })
    })
  </script>
{% endif %}`}
            </pre>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Webflow</h3>
            <pre className="text-sm">
{`<!-- Add to page settings > Custom Code > Footer -->
<script src="https://cdn.peeap.com/widgets.js"></script>
<script>
  Peeap.ready(function() {
    Peeap.render('PaymentLinkButton', {
      container: '[data-peeap-button]',
      apiKey: 'pk_live_xxx',
      amount: 99,
      description: 'Service Payment'
    })
  })
</script>`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  )
}
