'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface NavItem {
  name: string
  href: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navigation: NavSection[] = [
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

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Auto-expand section containing current page
  useEffect(() => {
    const currentSection = navigation.find(section =>
      section.items.some(item => item.href === pathname || pathname.startsWith(item.href + '/'))
    )
    if (currentSection) {
      setExpandedSections(prev => {
        const newSet = new Set(Array.from(prev))
        newSet.add(currentSection.title)
        return newSet
      })
    }
  }, [pathname])

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(Array.from(prev))
      if (newSet.has(title)) {
        newSet.delete(title)
      } else {
        newSet.add(title)
      }
      return newSet
    })
  }

  const isItemActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
      <div className="p-6">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Peeap Docs</span>
        </Link>
      </div>

      {/* Get API Keys Button */}
      <div className="px-4 mb-4">
        <a
          href="https://my.peeap.com/merchant/api-keys"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <KeyIcon />
          Get API Keys
        </a>
      </div>

      <nav className="px-4 pb-6 flex-1">
        {navigation.map((section) => {
          const isExpanded = expandedSections.has(section.title)
          const hasActiveItem = section.items.some(item => isItemActive(item.href))

          return (
            <div key={section.title} className="mb-2">
              <button
                onClick={() => toggleSection(section.title)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                  hasActiveItem
                    ? 'text-primary-700 bg-primary-50/50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{section.title}</span>
                <ChevronIcon isOpen={isExpanded} />
              </button>

              {isExpanded && (
                <ul className="mt-1 ml-3 space-y-1 border-l border-gray-200">
                  {section.items.map((item) => {
                    const isActive = isItemActive(item.href)
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={`block pl-4 pr-3 py-1.5 text-sm font-medium transition-colors ${
                            isActive
                              ? 'text-primary-700 border-l-2 border-primary-600 -ml-px bg-primary-50/50'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          {item.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer Links */}
      <div className="px-4 py-4 border-t border-gray-200 mt-auto">
        <a
          href="https://my.peeap.com/merchant"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Dashboard
          <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <a
          href="https://api.peeap.com/api"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          API Status
          <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </aside>
  )
}
