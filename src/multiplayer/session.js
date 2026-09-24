const STORAGE_KEY = 'explorador-online-session-v124';
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

function safeParse(value) {
  try { return value ? JSON.parse(value) : null; } catch { return null; }
}

export function loadSession() {
  const session = safeParse(localStorage.getItem(STORAGE_KEY));
  if (!session || !session.savedAt || Date.now() - session.savedAt > MAX_AGE_MS) {
    if (session) localStorage.removeItem(STORAGE_KEY);
    return null;
  }
  return session;
}

export function saveSession(patch) {
  const current = loadSession() || {};
  const next = { ...current, ...patch, savedAt: Date.now() };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  return next;
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function createReconnectController({ onReconnect, onStatus }) {
  let timer = null;
  let attempts = 0;
  let stopped = false;

  function reset() {
    attempts = 0;
    stopped = false;
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function stop() {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function schedule(reason = 'connection_lost') {
    if (stopped || timer || !navigator.onLine) return;
    attempts += 1;
    const delay = Math.min(12000, 700 * Math.pow(1.7, Math.min(attempts - 1, 6)));
    onStatus?.(`Reconectando… intento ${attempts}`);
    timer = setTimeout(async () => {
      timer = null;
      if (stopped || !navigator.onLine) return;
      try {
        await onReconnect?.({ attempt: attempts, reason });
      } catch (error) {
        console.warn('Reintento online fallido:', error);
        schedule('retry_failed');
      }
    }, delay);
  }

  const handleOnline = () => {
    onStatus?.('Conexión a internet recuperada · reconectando sala…');
    schedule('browser_online');
  };
  const handleOffline = () => {
    onStatus?.('Sin internet · la partida queda pausada hasta recuperar conexión.');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  function destroy() {
    stop();
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  }

  return { reset, stop, destroy, schedule, get attempts() { return attempts; } };
}

window.ExploradorNetworkSession = {
  loadSession,
  saveSession,
  clearSession,
  createReconnectController
};
