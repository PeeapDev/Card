'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  {
    title: 'Getting Started',
    items: [
      { name: 'Introduction', href: '/' },
      { name: 'Authentication', href: '/authentication' },
      { name: 'Errors', href: '/errors' },
    ],
  },
  {
    title: 'Apps & Widgets',
    items: [
      { name: 'All Apps', href: '/apps' },
      { name: 'POS Terminal', href: '/apps/pos' },
      { name: 'Invoicing', href: '/apps/invoicing' },
      { name: 'Event Tickets', href: '/apps/events' },
      { name: 'Payment Links', href: '/apps/payment-links' },
    ],
  },
  {
    title: 'SDK',
    items: [
      { name: 'Installation', href: '/sdk/installation' },
      { name: 'React Components', href: '/sdk/react' },
      { name: 'JavaScript SDK', href: '/sdk/javascript' },
      { name: 'Customization', href: '/sdk/customization' },
    ],
  },
  {
    title: 'POS API',
    items: [
      { name: 'Products', href: '/pos/products' },
      { name: 'Categories', href: '/pos/categories' },
      { name: 'Sales', href: '/pos/sales' },
      { name: 'Inventory', href: '/pos/inventory' },
    ],
  },
  {
    title: 'Invoices API',
    items: [
      { name: 'Invoices', href: '/invoices' },
    ],
  },
  {
    title: 'Events API',
    items: [
      { name: 'Events', href: '/events' },
      { name: 'Tickets', href: '/events/tickets' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-6">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Peeap Docs</span>
        </Link>
      </div>

      <nav className="px-4 pb-6">
        {navigation.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {section.title}
            </h3>
            <ul className="mt-2 space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-200">
        <a
          href="https://my.peeap.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600"
        >
          Dashboard &rarr;
        </a>
        <a
          href="https://api.peeap.com/api"
          target="_blank"
          rel="noopener noreferrer"
          className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600"
        >
          API Status &rarr;
        </a>
      </div>
    </aside>
  )
}
