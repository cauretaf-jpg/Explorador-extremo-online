# Roadmap de desarrollo · Explorador Extremo Online

Estado actualizado para V12.5.

| Prioridad | Mejora | Estado | Siguiente objetivo |
|---|---|---|---|
| 1 | Estabilizar modo online | Implementado / validación | Pruebas de estrés con dos dispositivos y cortes reales |
| 2 | Lobby cooperativo | Implementado | Pulido de UX |
| 3 | Cooperación real | Implementado | Más puzzles y objetivos asimétricos |
| 4 | Separar el código | Avanzado | Ya se extrajeron combate, sesión online, niveles, progresión y audio; siguen UI general y motor de juego |
| 5 | Mejorar combate | Avanzado | Sistema de arma, cargador, recarga y mejoras implementado; faltan más armas/power-ups físicos |
| 6 | Mejor progresión | Implementado / expansión | Objetivos 1–11 y mejoras entre niveles; se puede profundizar con más eventos exclusivos |
| 7 | Ranking y perfiles | Pendiente | Supabase Auth/estadísticas persistentes |
| 8 | Modo móvil | Pendiente | Joystick, disparo y cámara táctil |
| 9 | Logros y desafíos | Pendiente | Sistema persistente de objetivos |
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

## Próximas versiones propuestas

### V12.6 · UI + móvil
- Extraer UI general del HTML.
- Controles táctiles y joystick virtual.
- Cámara adaptada a pantallas pequeñas.
- Botones táctiles de disparo, recarga e interacción.

### V13 · Persistencia
- Perfil de jugador.
- Ranking, récords y estadísticas con Supabase.
