# Explorador Extremo V13.2 · modo batalla multijugador

Copia independiente del juego del profesor Juan Neira (crédito conservado en pantalla). V13 mantiene el modo individual y cooperativo y agrega persistencia de perfiles, estadísticas y ranking con Supabase.

## Novedades V13.2

- Nuevo **Modo Batalla** separado de Expedición y Cooperativo.
- Salas de **2 a 8 jugadores** mediante Supabase Realtime.
- Un jugador crea la sala y recibe un código de seis dígitos.
- Los demás participantes se unen con el código o con un enlace `?batalla=XXXXXX`.
- Lobby dinámico que muestra todos los participantes, no solo Jugador 1/Jugador 2.
- Cada participante tiene nombre, color y estado **LISTO / ESPERANDO**.
- El anfitrión solo puede iniciar cuando hay al menos 2 jugadores y todos están listos.
- Límite estricto de 8 participantes, con rechazo de ingresos excedentes incluso ante uniones simultáneas.
- Arena 3D propia con obstáculos, paredes y ocho puntos de aparición.
- Combate **todos contra todos**:
  - 100 HP,
  - 25 de daño por impacto,
  - respawn automático tras 2,5 segundos,
  - bajas y muertes individuales.
- Condiciones de victoria:
  - primer jugador en alcanzar **10 bajas**, o
  - mayor cantidad de bajas al terminar **5 minutos**.
- Clasificación en vivo con bajas y muertes.
- El anfitrión mantiene autoridad sobre daño, proyectiles, respawn, tiempo y resultado.
- Clientes invitados envían posición y disparos mediante Broadcast; el anfitrión valida desplazamientos básicos y distribuye snapshots.
- Los jugadores desconectados dejan de ser objetivos y desaparecen visualmente.
- Controles de escritorio: WASD/Flechas + Espacio.
- Controles táctiles básicos en móvil: joystick + botón de disparo.
- Invitación y lobby de Batalla usan un canal distinto a Expedición, por lo que no modifican el cooperativo existente.
- Nuevos módulos:
  - `src/battle/mode.js`,
  - `src/battle/battle.css`.

Esta primera versión de Batalla no suma todavía sus bajas/victorias al perfil global de Expedición. Esa persistencia competitiva puede añadirse después de validar el modo con varios dispositivos reales.

## Novedades V13.1

- **20 logros persistentes** repartidos en cuatro categorías:
  - Exploración,
  - Combate,
  - Cooperación,
  - Maestría.
- Nueva sección **Logros e insignias** dentro de Perfil y Ranking.
- Cada logro muestra icono, descripción, estado bloqueado/desbloqueado y puntos.
- El perfil muestra total de logros y puntuación acumulada de insignias.
- El ranking global ahora muestra también la cantidad de logros de cada jugador.
- Notificación animada **LOGRO DESBLOQUEADO** al registrar nuevos logros.
- Logros por hitos como:
  - completar el primer nivel,
  - alcanzar Egipto, Maya, Azteca, China y Grecia,
  - derrotar 1 / 10 / 50 / 100 enemigos,
  - derrotar al Guardián del Desierto,
  - realizar 1 / 5 / 20 reanimaciones,
  - ganar en cooperativo,
  - completar la expedición,
  - ganar en 15 minutos o menos,
  - superar 25.000 puntos,
  - conseguir 5 victorias.
- Los desbloqueos se calculan en Supabase después de registrar una partida.
- Sistema idempotente: reenviar la misma partida no vuelve a desbloquear ni duplicar logros.
- Retrocompatibilidad: perfiles creados en V13 reciben automáticamente los logros acumulativos que ya cumplen.
- Nuevas tablas:
  - `achievement_definitions`,
  - `player_achievements`.
- `player_profiles` incorpora `achievement_count`.
- Edge Function `player-profile` actualizada a V3.
- RLS mantiene las escrituras restringidas a `service_role`; las definiciones y desbloqueos son legibles para mostrar insignias públicas.
- Migración V13.1 versionada en `supabase/migrations/20260924_v13_1_achievements.sql`.

Los desafíos diarios/semanales quedan para una versión posterior; V13.1 se concentra en logros permanentes y verificables a partir de las estadísticas de partida.

## Novedades V13

- **Perfil persistente por navegador**, sin registro obligatorio de correo o contraseña.
- Nombre de explorador editable y sincronizado con el nombre usado en el lobby.
- Pantalla **Perfil y Ranking** desde el menú principal.
- Ranking global **Top 20** ordenado por mejor puntaje, victorias y mejor tiempo.
- Estadísticas persistentes:
  - partidas jugadas,
  - victorias,
  - mejor puntaje,
  - mejor tiempo de victoria,
  - nivel máximo,
  - enemigos derrotados,
  - reanimaciones,
  - niveles completados,
  - puntaje acumulado.
- Las bajas se atribuyen al jugador que realizó el disparo y las reanimaciones al explorador que efectuó el rescate.
- Registro automático de resultados al ganar o perder una expedición.
- Registro de partidas **idempotente** mediante `match_id`: un reintento de red no duplica estadísticas.
- Si una grabación falla por conectividad, queda en una cola local y se reintenta al recuperar el perfil.
- Nueva Edge Function de Supabase: `player-profile`.
- Tablas:
  - `player_profiles`: información pública del ranking,
  - `player_credentials`: credencial técnica accesible solo por `service_role`,
  - `player_matches`: historial técnico de partidas, no expuesto al navegador.
- RLS activo y permisos de mínimo privilegio: el navegador solo puede hacer `SELECT` sobre `player_profiles`.
- Auditor de seguridad de Supabase sin advertencias después de las migraciones.
- Nuevos módulos:
  - `src/profile/client.js`,
  - `src/ui/profile-panel.js`,
  - `src/ui/profile.css`.

El ranking V13 está pensado como ranking casual. El host sigue siendo autoritativo para la partida, pero la simulación corre en el navegador; todavía no existe validación antitrampas del lado servidor.

## Novedades V12.6

- **Modo móvil táctil** detectado automáticamente en dispositivos con puntero táctil.
- Joystick virtual analógico para movimiento relativo a la cámara.
- Botón táctil de disparo con disparo mantenido respetando el cooldown del arma.
- Botón táctil de **recarga**.
- Botón táctil de **interacción/reanimación** mantenida.
- Cámara táctil mediante arrastre sobre la escena.
- Botones **+ / −** para zoom en móvil.
- HUD reposicionado para convivir con joystick y botones sin tapar información crítica.
- Soporte para áreas seguras de pantalla mediante `env(safe-area-inset-*)`.
- Menú y pantalla de mejoras adaptados a pantallas pequeñas y orientación vertical.
- Los controles táctiles se ocultan automáticamente durante cinemáticas finales, fin de partida y elección de mejoras.
- Modularización ampliada:
  - `src/ui/mobile-controls.js`
  - `src/ui/mobile.css`
  - `src/ui/hud.js`
- Salud, arma, objetivo de nivel y pantalla de mejoras pasan a renderizarse mediante el módulo de UI.

## Novedades V12.5

- **Objetivos temáticos para los 11 niveles**, visibles durante la expedición.
- Escalado progresivo de velocidad, vida y daño de enemigos según nivel.
- Pantalla de **mejora de expedición** entre niveles 1–10.
- En cooperativo, el anfitrión elige una mejora que se aplica al equipo completo.
- Mejoras disponibles:
  - munición reforzada,
  - cargador ampliado,
  - mecanismo rápido,
  - cañón de precisión,
  - equipo médico,
  - kit de rescate.
- Sistema de **cargador y munición**.
- Recarga manual con **R** y recarga automática al vaciar el cargador.
- Armas que evolucionan en clase según las mejoras: rifle pesado, carabina táctica, carabina rápida y rifle de precisión.
- HUD de arma con munición y estado de recarga.
- Recompensa adicional al completar cada nivel.
- El estado de progresión, arma, munición y mejora pendiente se sincroniza entre host e invitado y se incluye en las instantáneas de recuperación.
- Modularización ampliada:
  - `src/progression/config.js`
  - `src/audio/engine.js`
  - además de los módulos de combate, sesión y niveles ya existentes.

## Novedades V12.4

- Reconexión automática con reintentos progresivos ante cortes de Realtime o internet.
- La partida cooperativa **se pausa** si falta uno de los dos jugadores y continúa al recuperar Presence.
- Sesión online guardada localmente durante hasta 12 horas.
- Botón **Reanudar sala** después de recargar el navegador.
- Si recarga el anfitrión, se conserva una instantánea local de nivel, laberinto, posiciones, HP, puntaje, botiquines, enemigos, placas y jefe.
- Si recarga el invitado, vuelve a unirse y recibe el estado autoritativo del anfitrión.
- Presencia deduplicada por cliente para reducir falsos “tercer jugador” durante reconexiones.
- Canal protegido contra eventos tardíos de conexiones anteriores.
- Botón **Salir de sala** que limpia la sesión y detiene los reintentos.
- Modularización ampliada:
  - `src/combat-config.js`
  - `src/multiplayer/session.js`
  - `src/levels/config.js`

La recuperación V12.4 es local al navegador. Todavía no persiste partidas en una tabla de Supabase; esa persistencia de cuenta/estadísticas queda para V13.

## Novedades V12.3

- **Salud individual:** 100 HP por explorador.
- El daño reduce HP; al llegar a 0 comienza el sistema de caída/reanimación.
- **Botiquines** que restauran 35 HP al jugador que los recoge.
- HUD con salud propia y del compañero.
- Enemigos con roles de combate: veloces, tanques, emboscadores y atacantes a distancia.
- Enemigos ahora tienen HP y pueden requerir varios disparos.
- **Mini-jefe del nivel 3: Guardián del Desierto**, con barra de vida y segunda fase.
- En cooperativo, el Guardián queda protegido hasta activar las placas y vuelve a quedar protegido si un compañero cae.
- El portal del nivel 3 no se abre hasta derrotar al Guardián.
- Se inició la separación del código con `src/combat-config.js`, primer paso de la refactorización modular.

## Novedades V12.2

- Sistema de **caída y reanimación** en cooperativo.
- El jugador caído dispone de **12 segundos** antes de consumir una vida.
- El compañero puede reanimarlo manteniendo **E durante 2 segundos** a corta distancia.
- Desde el nivel 2 aparecen **dos placas cooperativas**: cada jugador debe ocupar una simultáneamente durante 1,5 segundos para desbloquear el portal.
- Marcador en pantalla con **nombre, distancia y estado** del compañero.
- Jugadores caídos dejan de atraer enemigos, recibir daño adicional o recoger premios.

## Novedades V12.1

- Movimiento con **WASD o flechas del teclado**.
- Prevención de teclas “pegadas” al cambiar de pestaña.

## Novedades V12

- Lobby cooperativo con nombre de jugador.
- Estados **LISTO / NO LISTO** para ambos exploradores.
- El anfitrión solo puede iniciar cuando los dos jugadores están conectados y listos.
- Código de sala de seis dígitos.
- Invitación mediante enlace con `?sala=XXXXXX`.
- Reintentos acotados al entrar a una sala para evitar quedar esperando indefinidamente.
- Estado de conexión y lobby actualizado mediante Supabase Presence.
- Movimiento, disparos y estado del mundo sincronizados mediante Realtime Broadcast.
- Portal cooperativo: en online ambos jugadores deben llegar a la salida y permanecer juntos durante 1,5 segundos para activar el siguiente nivel.
- Indicador visual de progreso de activación del portal.

## Arquitectura online

El anfitrión es autoritativo: ejecuta la física, enemigos, trampas, puntaje y progresión. El invitado envía su pose y acciones, mientras recibe instantáneas del mundo.

Las salas usan **Realtime Broadcast + Presence** y siguen siendo efímeras. V12.4 agrega recuperación local de sesión/partida mediante `localStorage`. V13 usa Postgres para perfiles y estadísticas y una Edge Function para todas las escrituras sensibles. El código de sala no constituye autenticación.

El proyecto configurado en `supabase.public.json` usa exclusivamente URL y clave **publicable**. La `service_role` solo existe dentro de la Edge Function administrada por Supabase y nunca se envía al navegador.

## Publicar en Vercel

1. Importa este repositorio en Vercel.
2. El comando `npm run build` genera `dist/`, según `vercel.json`.
3. `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` son opcionales; si no están definidas, el build usa `supabase.public.json`.
4. Para Expedición cooperativa, prueba desde dos navegadores/dispositivos. Para Batalla, prueba idealmente con 3 o más clientes: uno crea la sala, comparte el código/enlace, todos marcan **Listo** y el anfitrión inicia.

## Desarrollo local

```bash
npm ci
npm run build
npx serve dist
```

Abrir `index.html` directamente con `file://` no equivale a servirlo por HTTP.

La versión del curso tenía un cierre de testing el 3 de octubre de 2026. Esta edición cooperativa mantiene ese cierre desactivado.

## Validación

La sintaxis del script principal y de los módulos se comprueba antes de publicar y Vercel debe completar el build. Para V13 también se valida RLS/permisos y persistencia. V13.2 añade una validación específica de Batalla: creación/unión con 2–8 clientes, límite de sala, ready-check, movimiento, disparos, respawn, clasificación y resultado final.
