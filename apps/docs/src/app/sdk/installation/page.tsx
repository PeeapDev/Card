export default function SDKInstallationPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Installation</h1>
      <p className="text-xl text-gray-600 mb-8">
        Get started with the Peeap Widgets SDK in your project.
      </p>

      {/* Quick Start */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Install the package</h3>
            <pre>
{`# npm
npm install @peeap/widgets

# yarn
yarn add @peeap/widgets

# pnpm
pnpm add @peeap/widgets`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Import and use</h3>
            <pre>
{`import { POSTerminal, InvoiceCreator, EventTicketSales } from '@peeap/widgets'

function App() {
  return (
    <POSTerminal
      apiKey="pk_live_your_api_key"
      merchantId="your_merchant_id"
    />
  )
}`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Get your API key</h3>
            <p className="text-gray-600">
              Get your API key from the{' '}
              <a href="https://my.peeap.com" className="text-primary-600 hover:underline">
                Peeap Dashboard
              </a>
              {' '}under Settings → API Keys.
            </p>
          </div>
        </div>
      </section>

      {/* Framework-Specific Instructions */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Framework Setup</h2>

        <div className="space-y-8">
          {/* Next.js */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Next.js (App Router)</h3>
            <pre className="mb-4">
{`// app/pos/page.tsx
'use client'

import { POSTerminal } from '@peeap/widgets'

export default function POSPage() {
  return (
    <div className="container mx-auto p-4">
      <POSTerminal
        apiKey={process.env.NEXT_PUBLIC_PEEAP_KEY!}
        merchantId={process.env.NEXT_PUBLIC_MERCHANT_ID!}
      />
    </div>
  )
}`}
            </pre>
            <p className="text-sm text-gray-500">
              Note: Use 'use client' directive as widgets are client components.
            </p>
          </div>

          {/* React + Vite */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">React + Vite</h3>
            <pre>
{`// src/App.tsx
import { POSTerminal } from '@peeap/widgets'

function App() {
  return (
    <POSTerminal
      apiKey={import.meta.env.VITE_PEEAP_KEY}
      merchantId={import.meta.env.VITE_MERCHANT_ID}
    />
  )
}`}
            </pre>
          </div>

          {/* Vue */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Vue 3</h3>
            <pre>
{`<template>
  <POSTerminal
    :api-key="apiKey"
    :merchant-id="merchantId"
  />
</template>

<script setup>
import { POSTerminal } from '@peeap/widgets/vue'

const apiKey = import.meta.env.VITE_PEEAP_KEY
const merchantId = import.meta.env.VITE_MERCHANT_ID
</script>`}
            </pre>
          </div>

          {/* Vanilla JS */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Vanilla JavaScript (CDN)</h3>
            <pre>
{`<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.peeap.com/widgets.js"></script>
</head>
<body>
  <div id="pos-terminal"></div>

  <script>
    Peeap.render('POSTerminal', {
      container: '#pos-terminal',
      apiKey: 'pk_live_your_api_key',
      merchantId: 'your_merchant_id'
    })
  </script>
</body>
</html>`}
            </pre>
          </div>
        </div>
      </section>

      {/* Environment Variables */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Environment Variables</h2>
        <p className="text-gray-600 mb-4">
          Never expose your secret API key in client-side code. Use public keys for widgets:
        </p>

        <pre className="mb-4">
{`# .env.local (Next.js)
NEXT_PUBLIC_PEEAP_KEY=pk_live_your_public_key
NEXT_PUBLIC_MERCHANT_ID=your_merchant_id

# For server-side API calls only
PEEAP_SECRET_KEY=sk_live_your_secret_key`}
        </pre>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            <strong>Important:</strong> Public keys (<code>pk_*</code>) are safe for client-side use.
            Secret keys (<code>sk_*</code>) should only be used on your server.
          </p>
        </div>
      </section>

      {/* TypeScript */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">TypeScript Support</h2>
        <p className="text-gray-600 mb-4">
          The SDK includes full TypeScript definitions. Types are automatically available:
        </p>

        <pre>
{`import {
  POSTerminal,
  POSTerminalProps,
  Sale,
  Product,
  CartItem
} from '@peeap/widgets'

const handleSale = (sale: Sale) => {
  console.log('Sale ID:', sale.id)
  console.log('Total:', sale.total)
  console.log('Items:', sale.items)
}

<POSTerminal
  apiKey="pk_live_xxx"
  merchantId="xxx"
  onSaleComplete={handleSale}
/>`}
        </pre>
      </section>

      {/* Troubleshooting */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Troubleshooting</h2>
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">"Module not found" error</h3>
            <p className="text-gray-600 text-sm mb-2">
              Make sure you've installed the package and restarted your dev server:
            </p>
            <pre className="text-sm">
{`npm install @peeap/widgets
npm run dev`}
            </pre>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">"Window is not defined" (SSR)</h3>
            <p className="text-gray-600 text-sm mb-2">
              Use dynamic import for Next.js or check for window:
            </p>
            <pre className="text-sm">
{`// Next.js - use dynamic import
import dynamic from 'next/dynamic'

const POSTerminal = dynamic(
  () => import('@peeap/widgets').then(mod => mod.POSTerminal),
  { ssr: false }
)`}
            </pre>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">"Invalid API key" error</h3>
            <p className="text-gray-600 text-sm">
              Ensure you're using a public key (<code>pk_*</code>) for widgets, not a secret key.
              Check that your API key is active in the dashboard.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
