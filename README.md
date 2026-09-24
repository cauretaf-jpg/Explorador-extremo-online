# Explorador Extremo V12 · cooperativo online

Copia independiente del juego del profesor Juan Neira (crédito conservado en pantalla). La V12 mantiene el modo individual y refuerza el cooperativo de dos jugadores usando Supabase Realtime.

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

Las salas son efímeras y usan **Realtime Broadcast + Presence**. No requieren tablas SQL para funcionar. El código de sala no constituye autenticación.

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

La sintaxis del script principal se comprueba antes de publicar. La validación funcional final debe hacerse con dos clientes reales conectados al mismo despliegue HTTPS, verificando lobby, Presence, movimiento, disparos, cambio de nivel y desconexión.
