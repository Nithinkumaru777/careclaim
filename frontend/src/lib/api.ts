import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function getAuthHeaders() {
  const mockToken = localStorage.getItem('mock_token');
  if (mockToken) {
    return {
      'Authorization': `Bearer ${mockToken}`,
      'Content-Type': 'application/json'
    };
  }

  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) return {};
  return {
    'Authorization': `Bearer ${data.session.access_token}`,
    'Content-Type': 'application/json'
  };
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });
  
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `API error ${res.status}`);
  }
  
  return res.json();
}
