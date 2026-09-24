import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" }
  });

const clampInt = (value: unknown, min: number, max: number) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
};

const validUuid = (value: unknown) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const cleanName = (value: unknown) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "server_not_configured" }, 500);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "invalid_json" }, 400); }

  const action = String(body?.action || "");
  const playerId = body?.player_id;
  const secret = String(body?.secret || "");

  if (!validUuid(playerId)) return json({ error: "invalid_player_id" }, 400);
  if (secret.length < 32 || secret.length > 256) return json({ error: "invalid_secret" }, 400);

  const secretHash = await sha256(secret);

  if (action === "register") {
    const displayName = cleanName(body?.display_name);
    if (displayName.length < 2) return json({ error: "invalid_display_name" }, 400);

    const { data: existing } = await supabase
      .from("player_profiles").select("id").eq("id", playerId).maybeSingle();
    if (existing) return json({ error: "profile_exists" }, 409);

    const { data: profile, error: profileError } = await supabase
      .from("player_profiles")
      .insert({ id: playerId, display_name: displayName })
      .select("*").single();

    if (profileError) return json({ error: "profile_create_failed", detail: profileError.message }, 400);

    const { error: credentialError } = await supabase
      .from("player_credentials")
      .insert({ player_id: playerId, secret_hash: secretHash });

    if (credentialError) {
      await supabase.from("player_profiles").delete().eq("id", playerId);
      return json({ error: "credential_create_failed" }, 500);
    }
    return json({ profile }, 201);
  }

  const { data: credential, error: credentialError } = await supabase
    .from("player_credentials")
    .select("secret_hash").eq("player_id", playerId).maybeSingle();

  if (credentialError || !credential || credential.secret_hash !== secretHash) {
    return json({ error: "unauthorized_profile" }, 401);
  }

  if (action === "rename") {
    const displayName = cleanName(body?.display_name);
    if (displayName.length < 2) return json({ error: "invalid_display_name" }, 400);

    const { data: profile, error } = await supabase
      .from("player_profiles")
      .update({ display_name: displayName })
      .eq("id", playerId).select("*").single();

    if (error) return json({ error: "rename_failed", detail: error.message }, 400);
    return json({ profile });
  }

  if (action === "record_match") {
    const match = body?.match || {};
    const matchId = match?.match_id;
    if (!validUuid(matchId)) return json({ error: "invalid_match_id" }, 400);

    const won = !!match.won;
    const score = clampInt(match.score, 0, 10_000_000);
    const timeSeconds = clampInt(match.time_seconds, 1, 86_400);
    const maxLevel = clampInt(match.max_level, 1, 11);
    const enemiesDefeated = clampInt(match.enemies_defeated, 0, 5000);
    const revives = clampInt(match.revives, 0, 1000);
    const levelsCompleted = clampInt(match.levels_completed, 0, 11);
    const bossesDefeated = clampInt(match.bosses_defeated, 0, 50);
    const mode = match.mode === "coop" ? "coop" : "solo";

    const { data: profileAfterMatch, error } = await supabase.rpc("record_player_match", {
      p_match_id: matchId,
      p_player_id: playerId,
      p_won: won,
      p_score: score,
      p_time_seconds: timeSeconds,
      p_max_level: maxLevel,
      p_enemies_defeated: enemiesDefeated,
      p_revives: revives,
      p_levels_completed: levelsCompleted
    });

    if (error) return json({ error: "match_record_failed", detail: error.message }, 400);

    const { data: unlockedIds, error: achievementError } = await supabase.rpc("unlock_player_achievements", {
      p_player_id: playerId,
      p_match_id: matchId,
      p_mode: mode,
      p_won: won,
      p_score: score,
      p_time_seconds: timeSeconds,
      p_max_level: maxLevel,
      p_enemies_defeated: enemiesDefeated,
      p_revives: revives,
      p_levels_completed: levelsCompleted,
      p_bosses_defeated: bossesDefeated
    });

    if (achievementError) {
      return json({ error: "achievement_unlock_failed", detail: achievementError.message }, 400);
    }

    const ids = Array.isArray(unlockedIds) ? unlockedIds : [];
    let unlockedAchievements: unknown[] = [];
    if (ids.length) {
      const { data } = await supabase
        .from("achievement_definitions")
        .select("id,title,description,category,icon,points,sort_order")
        .in("id", ids)
        .order("sort_order", { ascending: true });
      unlockedAchievements = data || [];
    }

    const { data: freshProfile } = await supabase
      .from("player_profiles")
      .select("*")
      .eq("id", playerId)
      .single();

    return json({
      profile: freshProfile || profileAfterMatch,
      unlocked_achievements: unlockedAchievements
    });
  }

  return json({ error: "unknown_action" }, 400);
});
