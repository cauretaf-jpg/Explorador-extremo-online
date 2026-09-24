# Explorador Extremo V12.4 · estabilidad online

Copia independiente del juego del profesor Juan Neira (crédito conservado en pantalla). La V12 mantiene el modo individual y refuerza el cooperativo de dos jugadores usando Supabase Realtime.

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

Las salas usan **Realtime Broadcast + Presence** y siguen siendo efímeras en Supabase. V12.4 agrega recuperación local de sesión/partida mediante `localStorage`, sin tablas SQL. El código de sala no constituye autenticación.

El proyecto configurado en `supabase.public.json` usa exclusivamente URL y clave **publicable**. Nunca debe utilizarse una secret key o `service_role` en el navegador.

## Publicar en Vercel

1. Importa este repositorio en Vercel.
2. El comando `npm run build` genera `dist/`, según `vercel.json`.
3. `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` son opcionales; si no están definidas, el build usa `supabase.public.json`.
4. Prueba el despliegue desde dos navegadores o dispositivos distintos: uno crea la sala y comparte el enlace; el otro se une, ambos marcan **Estoy listo** y el anfitrión inicia la expedición.

## Desarrollo local

```bash
npm ci
npm run build
npx serve dist
```

Abrir `index.html` directamente con `file://` no equivale a servirlo por HTTP.

La versión del curso tenía un cierre de testing el 3 de octubre de 2026. Esta edición cooperativa mantiene ese cierre desactivado.

## Validación

La sintaxis del script principal se comprueba antes de publicar y Vercel debe completar el build. La validación funcional final debe hacerse con dos clientes reales conectados al mismo despliegue HTTPS, incluyendo: desconectar/red-conectar, recargar invitado, recargar anfitrión, reanudar sala, movimiento, combate y progresión.
