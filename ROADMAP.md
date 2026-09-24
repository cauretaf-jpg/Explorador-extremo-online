# Roadmap de desarrollo · Explorador Extremo Online

Estado actualizado para V13.2.

| Prioridad | Mejora | Estado | Siguiente objetivo |
|---|---|---|---|
| 1 | Estabilizar modo online | Implementado / validación | Pruebas de estrés con dos dispositivos y cortes reales |
| 2 | Lobby cooperativo | Implementado | Pulido de UX |
| 3 | Cooperación real | Implementado | Más puzzles y objetivos asimétricos; Batalla multijugador funciona como modo separado |
| 4 | Separar el código | Muy avanzado | Combate, red, niveles, progresión, audio y parte relevante de UI ya están modularizados; queda extraer el motor principal/escena |
| 5 | Mejorar combate | Avanzado | Sistema de arma, cargador, recarga y mejoras implementado; faltan más armas/power-ups físicos |
| 6 | Mejor progresión | Implementado / expansión | Objetivos 1–11 y mejoras entre niveles; se puede profundizar con más eventos exclusivos |
| 7 | Ranking y perfiles | Implementado / validación | Perfiles locales persistentes, estadísticas, Top 20 y escritura segura mediante Edge Function |
| 8 | Modo móvil | Implementado / validación | Probar en Android/iOS y ajustar tamaños/sensibilidad según dispositivo |
| 9 | Logros y desafíos | Parcial / logros implementados | 20 logros persistentes listos; siguiente paso: desafíos diarios/semanales y recompensas rotativas |
| 10 | Pulido audiovisual | Parcial | Feedback de impacto, menús y audio |

## Entregas

### V12
- Salas Supabase Realtime.
- Lobby, nombres, estado listo e invitación por enlace.
- Portal sincronizado para dos jugadores.

### V12.1
- Controles WASD además de flechas.

### V12.2
- Caída y reanimación.
- Marcador del compañero.
- Placas cooperativas.

### V12.3
- 100 HP individuales.
- Botiquines.
- Enemigos con roles y HP.
- Guardián del Desierto en nivel 3.
- Barra de salud del jefe y segunda fase.
- Inicio de modularización con `src/combat-config.js`.

### V12.4
- Reconexión automática con backoff.
- Pausa segura cuando falta un jugador.
- Recuperación de sala tras recarga.
- Instantánea local para recuperar la partida del anfitrión.
- Separación de `src/multiplayer/session.js` y `src/levels/config.js`.
- Limpieza explícita al salir de una sala.

### V12.5
- Objetivos temáticos para los 11 niveles.
- Escalado de dificultad por nivel.
- Mejoras de equipo entre niveles.
- Cargador, munición y recarga.
- Evolución del arma según mejoras.
- Extracción de `src/progression/config.js` y `src/audio/engine.js`.

### V12.6
- Joystick analógico táctil.
- Disparo, recarga e interacción táctiles.
- Cámara por arrastre y zoom táctil.
- HUD adaptable y soporte de safe areas.
- Extracción de `src/ui/mobile-controls.js`, `src/ui/mobile.css` y `src/ui/hud.js`.

### V13
- Perfil persistente por navegador.
- Cambio de nombre.
- Estadísticas acumuladas y mejor tiempo/puntaje.
- Ranking global Top 20.
- Edge Function de escritura protegida.
- RLS y permisos de mínimo privilegio.
- Registro idempotente y cola local de reintentos.

### V13.1
- 20 logros persistentes.
- Insignias visibles en el perfil.
- Puntos de logros.
- Notificaciones de desbloqueo.
- Contador de logros en ranking.
- Retrocompatibilidad con perfiles V13.
- Evaluación e inserción idempotente desde Supabase.

### V13.2
- Modo Batalla todos contra todos.
- Salas dinámicas para 2–8 jugadores.
- Lobby con lista completa de participantes.
- Ready-check para todos.
- Arena 3D propia.
- 100 HP, respawn y 10 bajas como objetivo.
- Partidas de 5 minutos.
- Clasificación en vivo.
- Host autoritativo para daño y resultado.
- Soporte táctil básico.

## Próximas versiones propuestas

### V13.3 · Batalla persistente + desafíos
- Registrar victorias, bajas y muertes de Batalla en el perfil.
- Ranking específico de Batalla.
- Reconexión durante una batalla.
- Desafíos diarios y semanales.
- Retos por bioma, combate y cooperación.

### V14 · Cuenta opcional
- Supabase Auth para migrar el perfil local a una cuenta.
- Sincronización del mismo perfil entre dispositivos.


## Prueba pendiente V13.2

Validar el Modo Batalla con 3–8 dispositivos/navegadores reales, incluyendo entrada simultánea, ready-check, disparos, respawn, desconexión y resultado final.
