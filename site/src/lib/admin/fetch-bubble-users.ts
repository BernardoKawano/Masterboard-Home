/**
 * Busca usuários do app Bubble para o painel admin.
 * Requer BUBBLE_API_TOKEN com acesso privilegiado.
 */

import {
  fetchAllMembers,
  fetchAllEvents,
  fetchAllEmpresas,
  type BubbleEmpresa,
  type BubbleEvento,
  type BubbleUser,
} from '../bubble';
import { mapBubbleAppUser } from './bubble-users.mjs';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CompanyProfile {
  name: string;
  revenue: string;
  size: string;
  sector: string;
  challenges: string;
  icpChallenges: string;
}

interface UsersCacheEntry {
  users: BubbleUser[];
  companies: Map<string, string>;
  companyProfiles: Map<string, CompanyProfile>;
  events: Map<string, string>;
  expiry: number;
}

let cache: UsersCacheEntry | null = null;

export function isBubbleUsersConfigured(): boolean {
  const token = import.meta.env.BUBBLE_API_TOKEN as string | undefined;
  return Boolean(token?.trim());
}

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function buildCompanyMaps(companies: BubbleEmpresa[]) {
  const names = new Map<string, string>();
  const profiles = new Map<string, CompanyProfile>();

  for (const company of companies) {
    const name = cleanText(company.Nome_Empresa);
    if (name) names.set(company._id, name);

    profiles.set(company._id, {
      name,
      revenue: cleanText(company.Faturamento),
      size: cleanText(company.Tamanho),
      sector: cleanText(company.Setores) || cleanText(company['Setores - Outro']),
      challenges: cleanText(company.Desafios),
      icpChallenges: cleanText(company['Desafios - ICP']),
    });
  }

  return { names, profiles };
}

function buildEventMap(events: BubbleEvento[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const event of events) {
    const title = event.Titulo?.trim();
    if (title) map.set(event._id, title);
  }
  return map;
}

async function loadUsersCache(): Promise<UsersCacheEntry> {
  if (cache && Date.now() < cache.expiry) return cache;

  if (!isBubbleUsersConfigured()) {
    throw new Error('BUBBLE_API_TOKEN não configurado. Configure o token no ambiente para listar usuários do app.');
  }

  const [users, companies, events] = await Promise.all([
    fetchAllMembers(),
    fetchAllEmpresas(),
    fetchAllEvents(),
  ]);

  const { names, profiles } = buildCompanyMaps(companies);

  cache = {
    users,
    companies: names,
    companyProfiles: profiles,
    events: buildEventMap(events),
    expiry: Date.now() + CACHE_TTL_MS,
  };

  return cache;
}

function mapUsers(snapshot: UsersCacheEntry) {
  return snapshot.users.map((raw) =>
    mapBubbleAppUser(raw as Record<string, unknown>, {
      companyNames: snapshot.companies,
      companyProfiles: snapshot.companyProfiles,
      eventNames: snapshot.events,
    }),
  );
}

export async function getAllAppUsersMapped() {
  const snapshot = await loadUsersCache();
  return mapUsers(snapshot);
}

export async function getAppUserById(id: string) {
  const snapshot = await loadUsersCache();
  const raw = snapshot.users.find((user) => user._id === id);
  if (!raw) return null;

  return mapBubbleAppUser(raw as Record<string, unknown>, {
    companyNames: snapshot.companies,
    companyProfiles: snapshot.companyProfiles,
    eventNames: snapshot.events,
  });
}

export async function getAppUsersTotal(): Promise<number> {
  const snapshot = await loadUsersCache();
  return snapshot.users.length;
}
