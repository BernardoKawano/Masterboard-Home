import assert from 'node:assert/strict';
import test from 'node:test';
import {
  eventStatusLabel,
  resolveEventStatus,
  todayInSaoPaulo,
} from '../src/lib/event-status.ts';

test('resolveEventStatus marca evento de ontem como past', () => {
  const today = todayInSaoPaulo();
  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const isoDay = yesterday.toISOString().slice(0, 10);

  assert.equal(resolveEventStatus(isoDay, 'upcoming'), 'past');
});

test('resolveEventStatus preserva cancelado', () => {
  assert.equal(resolveEventStatus('2099-01-01', 'cancelled'), 'cancelled');
});

test('eventStatusLabel usa Já realizado para passados', () => {
  assert.equal(eventStatusLabel('past'), 'Já realizado');
});
