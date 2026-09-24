# Explorador Extremo V11 · cooperativo online

Copia independiente del juego del profesor Juan Neira (crédito conservado en pantalla). Dos personas pueden jugar en una sala con código: el anfitrión simula la partida y el invitado recibe el estado mediante Supabase Realtime. Ambos deben llegar al portal de salida. También conserva el modo individual.

## Publicar en Vercel

1. Crea un proyecto Supabase para este juego y copia **Project URL** y la **publishable key**. Nunca uses una secret key o `service_role` en el navegador.
2. Importa este repositorio en Vercel. El directorio raíz es este proyecto. El comando `npm run build` produce `dist/`, según `vercel.json`.
3. Configura las variables de entorno `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` en los entornos Production y Preview de Vercel. La clave publicable es apta para código de navegador.
4. Publica y prueba el enlace HTTPS desde dos navegadores de escritorio: **Crear sala cooperativa** en uno, **Unirse** con el código en el otro. Usa las flechas y la barra espaciadora; el juego original requiere teclado y ratón.

No requiere tablas ni políticas SQL: las salas efímeras usan canales públicos de **Realtime Broadcast y Presence**. El código de seis dígitos permite entrar a una sala, por lo que no debe tratarse como autenticación ni compartirse ampliamente. No se almacenan partidas: al desconectarse el anfitrión se cierra la sala. Supabase tiene límites de mensajes y conexiones según el plan contratado.

## Desarrollo local

`npm ci`, luego configura `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` en el entorno y ejecuta `npm run build`. Sirve la carpeta `dist` mediante un servidor estático (por ejemplo `npx serve dist`). Abrir `index.html` directamente con `file://` no es equivalente a servirlo por HTTP.

La versión del curso tenía un cierre de testing el 3 de octubre de 2026. En esta copia se desactivó ese cierre para permitir jugar después de esa fecha. El archivo original sigue separado.

## Validación

El build y la sintaxis del script se comprobaron. La variante previa de salas con servidor WebSocket se probó con dos clientes automatizados. La nueva conexión Supabase Realtime **aún requiere prueba de extremo a extremo con un proyecto real y dos navegadores** antes de darla por lista para compartir.
