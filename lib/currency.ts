export type Currency = 'mxn' | 'usd'

export const normCurrency = (c: unknown): Currency => (c === 'usd' ? 'usd' : 'mxn')

/** Monto con su moneda: pesos como "$1,200"; dólares como "$25 USD" para que nadie los confunda con pesos. */
export function fmtMoney(n: number, currency: unknown = 'mxn'): string {
  const v = Number(n).toLocaleString(normCurrency(currency) === 'usd' ? 'en-US' : 'es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return normCurrency(currency) === 'usd' ? `$${v} USD` : `$${v}`
}

export const currencyName = (c: unknown) => (normCurrency(c) === 'usd' ? 'USD' : 'MXN')
