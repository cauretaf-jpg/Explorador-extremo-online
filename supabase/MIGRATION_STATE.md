# Estado de migraciones de Supabase

Proyecto activo: `explorador-extremo-online` (`sqimzwhoyiwddvjnqdkr`).

## Historial registrado antes de V13.2.1

- `v13_player_profiles_and_rankings`
- `v13_atomic_match_stats`
- `v13_credentials_service_only`
- `v13_idempotent_match_history`
- `v13_explicit_deny_internal_tables`
- `v13_least_privilege_grants`
- `v13_1_achievements`
- `v13_1_backfill_existing_achievements`

Los SQL históricos presentes en GitHub son snapshots consolidados y no deben tratarse como reproducción 1:1 de cada migración aplicada.

A partir de V13.2.1, cada DDL nuevo debe aplicarse con un nombre único y quedar versionado en `supabase/migrations/`.

Nuevas migraciones:\n\n- `v13_2_1_rank_consistency_indexes`\n- `v13_2_1_rank_function_invoker` (corrige el contexto de seguridad del RPC de ranking a `SECURITY INVOKER`).
