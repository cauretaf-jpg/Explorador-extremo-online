# Roadmap de desarrollo · Explorador Extremo Online

Estado actualizado para V12.4.

| Prioridad | Mejora | Estado | Siguiente objetivo |
|---|---|---|---|
| 1 | Estabilizar modo online | Implementado / validación | Pruebas de estrés con dos dispositivos y cortes reales |
| 2 | Lobby cooperativo | Implementado | Pulido de UX |
| 3 | Cooperación real | Implementado | Más puzzles y objetivos asimétricos |
| 4 | Separar el código | En progreso | Ya se extrajeron combate, sesión online y niveles; siguen UI, audio y motor de juego |
| 5 | Mejorar combate | En progreso | Armas, munición y más power-ups |
| 6 | Mejor progresión | Parcial | Reglas y objetivos exclusivos por nivel |
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

## Próximas versiones propuestas

### V12.4
- Reconexión automática con backoff.
- Pausa segura cuando falta un jugador.
- Recuperación de sala tras recarga.
- Instantánea local para recuperar la partida del anfitrión.
- Separación de `multiplayer/session.js` y `levels/config.js`.
- Limpieza explícita al salir de una sala.

### V12.5 · Progresión + modularización
- Extraer UI, audio y lógica principal del juego.
- Objetivos exclusivos por bioma.
- Mejoras entre niveles.
- Armas y munición diferenciadas.

### V13 · Persistencia
- Perfil de jugador.
- Ranking, récords y estadísticas con Supabase.
