const STORAGE_KEY = 'explorador-player-identity-v13';
const PENDING_KEY = 'explorador-pending-matches-v13';

function loadIdentity() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (value?.id && value?.secret) return value;
  } catch {}
  return null;
}

function randomSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function createIdentity() {
  return { id: crypto.randomUUID(), secret: randomSecret() };
}

function saveIdentity(identity) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

function loadPendingMatches() {
  try {
    const items = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    return Array.isArray(items) ? items.filter(item => item?.match_id) : [];
  } catch {
    return [];
  }
}

function savePendingMatches(items) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(items.slice(-20)));
}

function queuePendingMatch(match) {
  const items = loadPendingMatches();
  if (!items.some(item => item.match_id === match.match_id)) items.push(match);
  savePendingMatches(items);
}

function cleanName(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 18);
}

function defaultName() {
  const remembered = cleanName(localStorage.getItem('explorador-player-name'));
  if (remembered.length >= 2) return remembered;
  return 'Explorador ' + String(Math.floor(Math.random() * 9000) + 1000);
}

function createProfileClient() {
  const cfg = window.EXPLORADOR_CONFIG;
  if (!cfg?.url || !cfg?.publishableKey || !window.createSupabaseClient) {
    return {
      available: false,
      async ensureProfile() { return null; },
      async rename() { return null; },
      async recordMatch() { return null; },
      async getProfile() { return null; },
      async getLeaderboard() { return []; },
      async getRank() { return null; },
      async flushPendingMatches() { return 0; }
    };
  }

  const supabase = window.createSupabaseClient(cfg.url, cfg.publishableKey);
  let identity = loadIdentity();
  let profile = null;
  let creating = null;

  async function invoke(body) {
    const { data, error } = await supabase.functions.invoke('player-profile', { body });
    if (error) throw error;
    if (data?.error) {
      const err = new Error(data.error);
      err.code = data.error;
      throw err;
    }
    return data;
  }

  async function fetchProfile(id = identity?.id) {
    if (!id) return null;
    const { data, error } = await supabase
      .from('player_profiles')
      .select('id,display_name,games_played,wins,best_score,best_time_seconds,max_level,enemies_defeated,revives,levels_completed,total_score,created_at,updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function register(name) {
    identity = createIdentity();
    saveIdentity(identity);
    const data = await invoke({
      action: 'register',
      player_id: identity.id,
      secret: identity.secret,
      display_name: cleanName(name) || defaultName()
    });
    profile = data.profile;
    return profile;
  }

  async function ensureProfile(preferredName = '') {
    if (creating) return creating;
    creating = (async () => {
      if (!identity) {
        profile = await register(preferredName || defaultName());
      } else {
        const existing = await fetchProfile(identity.id);
        if (existing) {
          profile = existing;
        } else {
          try {
            const data = await invoke({
              action: 'register',
              player_id: identity.id,
              secret: identity.secret,
              display_name: cleanName(preferredName) || defaultName()
            });
            profile = data.profile;
          } catch (error) {
            if (error.code === 'profile_exists') {
              identity = null;
              localStorage.removeItem(STORAGE_KEY);
              profile = await register(preferredName || defaultName());
            } else {
              throw error;
            }
          }
        }
      }
      await flushPendingMatches().catch(() => 0);
      return profile;
    })();

    try {
      return await creating;
    } finally {
      creating = null;
    }
  }

  async function rename(displayName) {
    await ensureProfile(displayName);
    const name = cleanName(displayName);
    if (name.length < 2) throw new Error('El nombre debe tener al menos 2 caracteres.');
    const data = await invoke({
      action: 'rename',
      player_id: identity.id,
      secret: identity.secret,
      display_name: name
    });
    profile = data.profile;
    localStorage.setItem('explorador-player-name', profile.display_name);
    return profile;
  }

  async function sendMatch(match) {
    const data = await invoke({
      action: 'record_match',
      player_id: identity.id,
      secret: identity.secret,
      match
    });
    profile = data.profile;
    return profile;
  }

  async function flushPendingMatches() {
    if (!identity) return 0;
    const pending = loadPendingMatches();
    if (!pending.length) return 0;

    const remaining = [];
    let sent = 0;
    for (const match of pending) {
      try {
        await sendMatch(match);
        sent++;
      } catch {
        remaining.push(match);
      }
    }
    savePendingMatches(remaining);
    return sent;
  }

  async function recordMatch(match) {
    await ensureProfile(profile?.display_name || defaultName());
    const payload = {
      ...match,
      match_id: match?.match_id || crypto.randomUUID()
    };
    try {
      return await sendMatch(payload);
    } catch (error) {
      queuePendingMatch(payload);
      throw error;
    }
  }

  async function getProfile() {
    await ensureProfile();
    profile = await fetchProfile(identity.id);
    return profile;
  }

  async function getLeaderboard(limit = 20) {
    const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
    const { data, error } = await supabase
      .from('player_profiles')
      .select('id,display_name,games_played,wins,best_score,best_time_seconds,max_level,enemies_defeated,revives,levels_completed,total_score')
      .order('best_score', { ascending: false })
      .order('wins', { ascending: false })
      .order('best_time_seconds', { ascending: true, nullsFirst: false })
      .limit(safeLimit);
    if (error) throw error;
    return data || [];
  }

  async function getRank() {
    const own = await getProfile();
    if (!own) return null;
    const { count, error } = await supabase
      .from('player_profiles')
      .select('*', { count: 'exact', head: true })
      .gt('best_score', own.best_score);
    if (error) throw error;
    return (count || 0) + 1;
  }

  return {
    available: true,
    ensureProfile,
    rename,
    recordMatch,
    getProfile,
    getLeaderboard,
    getRank,
    flushPendingMatches,
    get identity() { return identity; },
    get cachedProfile() { return profile; }
  };
}

window.ExploradorProfile = { createProfileClient };
