export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  'fashion-shop': 'Fashion Shop',
  restaurant: 'Restaurant',
  salon: 'Salon',
  pharmacy: 'Pharmacy',
  supermarket: 'Supermarket',
  'electronics-shop': 'Electronics Shop',
}

export function businessTypeLabel(type: string): string {
  return BUSINESS_TYPE_LABELS[type] || type
}
