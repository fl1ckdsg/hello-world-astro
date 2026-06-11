import type { APIRoute } from 'astro';

interface Env {
  USERS_KV?: KVNamespace;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

// In-memory fallback when KV is not available
const memoryStore = new Map<string, string>();

async function kvGet(env: Env, key: string): Promise<string | null> {
  if (env.USERS_KV) {
    return env.USERS_KV.get(key);
  }
  return memoryStore.get(key) ?? null;
}

async function kvPut(env: Env, key: string, value: string): Promise<void> {
  if (env.USERS_KV) {
    await env.USERS_KV.put(key, value);
  } else {
    memoryStore.set(key, value);
  }
}

export const GET: APIRoute = async ({ url, locals }) => {
  const env = (locals as { runtime?: { env?: Env } }).runtime?.env ?? {};
  const userId = url.searchParams.get('userId');
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId required' }), { status: 400 });
  }
  const data = await kvGet(env, `user:${userId}`);
  if (!data) {
    return new Response(JSON.stringify(null), { status: 404 });
  }
  return new Response(data, {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime?: { env?: Env } }).runtime?.env ?? {};
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || !body.userId) {
      return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 });
    }
    await kvPut(env, `user:${body.userId}`, JSON.stringify(body));
    return new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 });
  }
};
