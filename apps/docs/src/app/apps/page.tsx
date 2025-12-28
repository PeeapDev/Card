import Link from 'next/link'

const apps = [
  {
    id: 'pos',
    name: 'POS Terminal',
    description: 'Complete point-of-sale system with product management, cart, and payment processing.',
    icon: '🛒',
    color: 'bg-green-500',
    features: ['Product catalog', 'Shopping cart', 'Multiple payment methods', 'Receipt generation', 'Inventory tracking'],
    href: '/apps/pos',
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    description: 'Professional invoice creation, management, and payment collection system.',
    icon: '📄',
    color: 'bg-blue-500',
    features: ['Invoice builder', 'Email delivery', 'Payment tracking', 'PDF export', 'Recurring invoices'],
    href: '/apps/invoicing',
  },
  {
    id: 'events',
    name: 'Event Tickets',
    description: 'Event management with ticket sales, QR codes, and door scanning.',
    icon: '🎫',
    color: 'bg-purple-500',
    features: ['Ticket types', 'QR code tickets', 'Door scanning', 'Attendee management', 'Sales analytics'],
    href: '/apps/events',
  },
  {
    id: 'payment-links',
    name: 'Payment Links',
    description: 'Create shareable payment links for quick one-time or recurring payments.',
    icon: '🔗',
    color: 'bg-orange-500',
    features: ['One-click payments', 'Custom amounts', 'Expiry dates', 'Payment tracking', 'WhatsApp sharing'],
    href: '/apps/payment-links',
  },
]

export default function AppsPage() {
  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Apps & Widgets</h1>
      <p className="text-xl text-gray-600 mb-8">
        Pre-built, embeddable business apps you can integrate into your platform in minutes.
        Each app comes with interactive demos, AI-friendly documentation, and full customization options.
      </p>

      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-10">
        <h2 className="text-lg font-semibold text-primary-800 mb-2">Built for AI-First Development</h2>
        <p className="text-primary-700">
          Our documentation is designed to work seamlessly with AI coding tools like v0, Cursor, Claude, and ChatGPT.
          Simply copy the integration code or describe what you need, and let AI handle the implementation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {apps.map((app) => (
          <Link
            key={app.id}
            href={app.href}
            className="group border border-gray-200 rounded-xl p-6 hover:border-primary-300 hover:shadow-lg transition-all"
          >
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 ${app.color} rounded-xl flex items-center justify-center text-2xl`}>
                {app.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {app.name}
                </h3>
                <p className="text-gray-600 mt-1 mb-4">{app.description}</p>
                <div className="flex flex-wrap gap-2">
                  {app.features.map((feature) => (
                    <span
                      key={feature}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Integration</h2>
        <p className="text-gray-600 mb-6">
          Get started in under 5 minutes with our SDK. Works with React, Next.js, Vue, or vanilla JavaScript.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-3">React / Next.js</h3>
            <pre className="text-sm">
{`npm install @peeap/widgets

import { POSTerminal } from '@peeap/widgets'

<POSTerminal
  apiKey="pk_live_xxx"
  theme="light"
/>`}
            </pre>
          </div>

          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Vanilla JavaScript</h3>
            <pre className="text-sm">
{`<script src="https://cdn.peeap.com/widgets.js"></script>

<div id="pos-terminal"></div>

<script>
  Peeap.render('POSTerminal', {
    container: '#pos-terminal',
    apiKey: 'pk_live_xxx'
  })
</script>`}
            </pre>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">For AI Coding Assistants</h2>
        <p className="text-gray-600 mb-6">
          Building with v0, Cursor, or other AI tools? Here's how to prompt for Peeap integration:
        </p>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-2">Example prompt for AI:</p>
          <pre className="text-sm whitespace-pre-wrap">
{`"Add a Peeap POS Terminal to my Next.js app.
Use the @peeap/widgets package with my API key 'pk_live_xxx'.
Make it full-width on mobile and 600px wide on desktop.
Use dark theme and hide the inventory section."`}
          </pre>
        </div>
      </section>
    </div>
  )
}
