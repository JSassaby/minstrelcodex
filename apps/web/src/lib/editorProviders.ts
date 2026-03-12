import { supabase } from '@/integrations/supabase/client';

export type ProviderId = 'claude' | 'openai' | 'gemini' | 'mistral' | 'ollama';

export interface ProviderConfig {
  label: string;
  models: string[];
  keyPlaceholder: string | null;
  keyUrl: string;
  isLocal: boolean;
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  claude: {
    label: 'Claude (Anthropic)',
    models: ['claude-sonnet-4-5', 'claude-haiku-4-5-20251001'],
    keyPlaceholder: 'sk-ant-...',
    keyUrl: 'https://console.anthropic.com',
    isLocal: false,
  },
  openai: {
    label: 'ChatGPT (OpenAI)',
    models: ['gpt-4o', 'gpt-4o-mini'],
    keyPlaceholder: 'sk-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    isLocal: false,
  },
  gemini: {
    label: 'Gemini (Google)',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    keyPlaceholder: 'AIza...',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    isLocal: false,
  },
  mistral: {
    label: 'Mistral',
    models: ['mistral-small-latest', 'mistral-medium-latest'],
    keyPlaceholder: '...',
    keyUrl: 'https://console.mistral.ai',
    isLocal: false,
  },
  ollama: {
    label: 'Ollama (local)',
    models: [],
    keyPlaceholder: null,
    keyUrl: 'https://ollama.com',
    isLocal: true,
  },
};

const KEYS_STORAGE_KEY = 'minstrel-editor-keys';
const ACTIVE_PROVIDER_KEY = 'minstrel-editor-provider';
const ACTIVE_MODEL_KEY = 'minstrel-editor-model';

type KeyStore = Partial<Record<ProviderId, string>>;

function readKeyStore(): KeyStore {
  try {
    return JSON.parse(localStorage.getItem(KEYS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeKeyStore(store: KeyStore) {
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(store));
}

export function getProviderKey(provider: ProviderId): string {
  return readKeyStore()[provider] ?? '';
}

export function getOllamaUrl(): string {
  return localStorage.getItem('minstrel-editor-ollama-url') ?? 'http://localhost:11434';
}

export function setOllamaUrl(url: string) {
  localStorage.setItem('minstrel-editor-ollama-url', url);
}

export function getOllamaModel(): string {
  return localStorage.getItem('minstrel-editor-ollama-model') ?? '';
}

export function setOllamaModel(model: string) {
  localStorage.setItem('minstrel-editor-ollama-model', model);
}

export async function setProviderKey(provider: ProviderId, key: string, userId?: string | null): Promise<void> {
  const store = readKeyStore();
  store[provider] = key;
  writeKeyStore(store);

  if (userId) {
    try {
      const { data, error: fetchError } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('id', userId)
        .single();
      const existing = (data?.settings as Record<string, unknown>) ?? {};
      if (!fetchError) {
        await supabase.from('user_settings').upsert({
          id: userId,
          settings: { ...existing, editor_provider_keys: store },
          updated_at: new Date().toISOString(),
        });
      }
    } catch {
      // silent — key is already saved locally
    }
  }
}

export function getActiveProvider(): ProviderId {
  const saved = localStorage.getItem(ACTIVE_PROVIDER_KEY) as ProviderId | null;
  if (saved && PROVIDERS[saved]) return saved;
  // Default to first provider that has a key
  const store = readKeyStore();
  for (const id of Object.keys(PROVIDERS) as ProviderId[]) {
    if (id === 'ollama') continue; // ollama doesn't need a key
    if (store[id]) return id;
  }
  // If ollama model is configured, use it
  if (getOllamaModel()) return 'ollama';
  return 'claude';
}

export function setActiveProvider(provider: ProviderId): void {
  localStorage.setItem(ACTIVE_PROVIDER_KEY, provider);
  window.dispatchEvent(
    new StorageEvent('storage', { key: ACTIVE_PROVIDER_KEY, newValue: provider })
  );
}

/** Returns true if a provider is explicitly set in localStorage (not falling back). */
export function hasActiveProvider(): boolean {
  const saved = localStorage.getItem(ACTIVE_PROVIDER_KEY) as ProviderId | null;
  return !!(saved && PROVIDERS[saved]);
}

export function getActiveModel(provider: ProviderId): string {
  const saved = localStorage.getItem(`${ACTIVE_MODEL_KEY}-${provider}`);
  if (saved) return saved;
  const models = PROVIDERS[provider].models;
  return models[0] ?? '';
}

export function setActiveModel(provider: ProviderId, model: string): void {
  localStorage.setItem(`${ACTIVE_MODEL_KEY}-${provider}`, model);
}

/** Canonical fallback order — active provider is always tried first at call time. */
const FALLBACK_ORDER: ProviderId[] = ['claude', 'openai', 'gemini', 'mistral', 'ollama'];

/** Returns every provider that has a usable key/model saved in localStorage. */
export function getProvidersWithKeys(): ProviderId[] {
  const store = readKeyStore();
  return FALLBACK_ORDER.filter(id => {
    if (id === 'ollama') return !!getOllamaModel();
    return !!store[id];
  });
}

/** True if at least one provider has a saved key — used to gate the feedback button. */
export function hasAnyProviderKey(): boolean {
  return getProvidersWithKeys().length > 0;
}

export interface EditorialContext {
  genre?: string;
  audience?: string;
  premise?: string;
  scenePurpose?: string;
  povCharacter?: string;
  emotionalGoal?: string;
  specificConcerns?: string;
}

export interface EditorialFeedback {
  strengths: string[];
  clarity: { observation: string; suggestions: string[] };
  pacing: { observation: string; suggestions: string[] };
  dialogue: { observation: string; suggestions: string[] } | null;
  character: { observation: string; suggestions: string[] };
  emotionalImpact: { observation: string; suggestions: string[] };
  narrativePurpose: { observation: string; suggestions: string[] };
  topSuggestions: string[];
  rewrite: string | null;
}

type ConsultParams = {
  text: string;
  context?: EditorialContext;
  includeRewrite: boolean;
  scope: 'selection' | 'scene' | 'document';
};

async function callProviderOnce(
  provider: ProviderId,
  params: ConsultParams,
  authToken: string,
): Promise<EditorialFeedback> {
  const model = provider === 'ollama' ? getOllamaModel() : getActiveModel(provider);
  const apiKey = provider === 'ollama' ? undefined : getProviderKey(provider);
  const ollamaBaseUrl = provider === 'ollama' ? getOllamaUrl() : undefined;

  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/editor-counsel`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        provider,
        model,
        apiKey,
        ollamaBaseUrl,
        text: params.text,
        context: params.context ?? {},
        includeRewrite: params.includeRewrite,
        scope: params.scope,
      }),
    }
  );

  const json = await resp.json();
  if (json.error) throw new Error(json.error);
  return json as EditorialFeedback;
}

export async function consultEditor(params: ConsultParams): Promise<EditorialFeedback> {
  const withKeys = getProvidersWithKeys();
  if (withKeys.length === 0) {
    throw new Error("No provider keys saved. Go to Profile → Providers to add one.");
  }

  // Active provider first, then the rest in FALLBACK_ORDER, deduped.
  const active = getActiveProvider();
  const sequence = [active, ...FALLBACK_ORDER.filter(id => id !== active)]
    .filter(id => withKeys.includes(id));

  const { data: { session } } = await supabase.auth.getSession();
  // Use session token when signed in; fall back to anon key for anonymous users.
  const authToken = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const errors: string[] = [];
  for (let i = 0; i < sequence.length; i++) {
    const provider = sequence[i];
    try {
      return await callProviderOnce(provider, params, authToken);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider}: ${msg}`);
      const next = sequence[i + 1];
      if (next) console.log(`Editor: ${provider} failed, trying ${next}...`);
    }
  }

  throw new Error(
    `All providers failed. Check your API keys in Profile → Providers.\n${errors.join('\n')}`
  );
}
