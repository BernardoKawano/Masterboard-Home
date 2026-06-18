import type { EventStatus } from '../types/domain';

export function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export function resolveEventStatus(
  date: string,
  storedStatus: EventStatus = 'upcoming',
): EventStatus {
  if (storedStatus === 'cancelled') return 'cancelled';

  const eventDay = date.slice(0, 10);
  return eventDay < todayInSaoPaulo() ? 'past' : 'upcoming';
}

export function eventStatusLabel(status: EventStatus): string {
  if (status === 'upcoming') return 'Em breve';
  if (status === 'cancelled') return 'Cancelado';
  return 'Já realizado';
}
