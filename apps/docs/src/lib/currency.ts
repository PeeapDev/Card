// Sierra Leone New Leones (NLe) - ISO code: SLE
// Redenominated in 2022: 1 NLe = 1,000 old Le

export function formatNLE(amount: number): string {
  return new Intl.NumberFormat('en-SL', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatCurrency(amount: number, showSymbol = true): string {
  const formatted = formatNLE(amount)
  return showSymbol ? `NLe ${formatted}` : formatted
}

// Common prices in NLe for demos
export const DEMO_PRICES = {
  // Beverages
  coffee: 15,
  latte: 18,
  espresso: 12,
  cappuccino: 16,
  tea: 8,
  juice: 12,
  water: 5,

  // Food
  croissant: 10,
  muffin: 8,
  sandwich: 25,
  salad: 30,
  burger: 35,
  pizza: 45,

  // Events
  generalAdmission: 50,
  vipTicket: 150,
  premiumTicket: 250,

  // Services
  basicService: 100,
  standardService: 250,
  premiumService: 500,
}
