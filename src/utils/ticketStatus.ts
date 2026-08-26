export const TICKET_STATUS_META: Record<string, { label: string; emoji: string }> = {
  open: { label: 'Open', emoji: '🟡' },
  in_progress: { label: 'In Progress', emoji: '🔵' },
  resolved: { label: 'Resolved', emoji: '🟢' },
  closed: { label: 'Closed', emoji: '⚪' },
}

export const TICKET_STATUS_OPTIONS = Object.entries(TICKET_STATUS_META).map(([value, meta]) => ({
  label: meta.label,
  value,
}))
