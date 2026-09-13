import { SearchResult, UserRole } from '../types/search';

export async function fetchAvailableRoles(): Promise<UserRole[]> {
  const res = await fetch('/api/v1/search/roles');
  if (!res.ok) throw new Error('Failed to fetch user roles');
  return res.json();
}

export async function executeEntitledQuery(params: {
  query: string;
  user_role: string;
  business_unit?: string;
  top_k?: number;
}): Promise<SearchResult> {
  const res = await fetch('/api/v1/search/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: params.query,
      user_role: params.user_role,
      business_unit: params.business_unit || 'MAJOR_ACCOUNTS',
      top_k: params.top_k || 5,
    }),
  });
  if (!res.ok) throw new Error('Failed to execute search query');
  return res.json();
}
