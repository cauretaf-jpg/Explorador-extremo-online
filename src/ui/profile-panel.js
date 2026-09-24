function fmtTime(value) {
  if (!value) return '—';
  const m = Math.floor(value / 60).toString().padStart(2, '0');
  const s = Math.floor(value % 60).toString().padStart(2, '0');
  return m + ':' + s;
}

function number(value) {
  return Number(value || 0).toLocaleString('es-CL');
}

function createStat(label, value) {
  const item = document.createElement('div');
  item.className = 'profile-stat';
  const l = document.createElement('span');
  l.className = 'profile-stat-label';
  l.textContent = label;
  const v = document.createElement('strong');
  v.textContent = value;
  item.append(l, v);
  return item;
}

function showAchievementToast(achievements = []) {
  if (!Array.isArray(achievements) || !achievements.length) return;

  let host = document.getElementById('achievement-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'achievement-toast-host';
    document.body.appendChild(host);
  }

  achievements.forEach((achievement, index) => {
    setTimeout(() => {
      const toast = document.createElement('div');
      toast.className = 'achievement-toast';
      toast.innerHTML = `
        <div class="achievement-toast-icon">${achievement.icon || '🏆'}</div>
        <div class="achievement-toast-copy">
          <div class="achievement-toast-kicker">LOGRO DESBLOQUEADO</div>
          <strong>${achievement.title || 'Nuevo logro'}</strong>
          <span>${achievement.description || ''}</span>
        </div>
        <div class="achievement-toast-points">+${achievement.points || 0}</div>`;
      host.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('show'));
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 420);
      }, 4200);
    }, index * 850);
  });
}

function createAchievementCard(definition, unlockedMap) {
  const unlocked = unlockedMap.get(definition.id);
  const card = document.createElement('article');
  card.className = 'achievement-card' + (unlocked ? ' unlocked' : ' locked');

  const icon = document.createElement('div');
  icon.className = 'achievement-icon';
  icon.textContent = unlocked ? definition.icon : '🔒';

  const body = document.createElement('div');
  body.className = 'achievement-copy';

  const title = document.createElement('strong');
  title.textContent = definition.title;
  const description = document.createElement('span');
  description.textContent = definition.description;

  const meta = document.createElement('small');
  meta.textContent = unlocked
    ? 'Desbloqueado · +' + definition.points + ' pts'
    : definition.category.toUpperCase() + ' · ' + definition.points + ' pts';

  body.append(title, description, meta);
  card.append(icon, body);
  return card;
}

function createProfilePanel({ profileClient, onNameChanged } = {}) {
  const start = document.getElementById('btn-start');
  if (!start || !profileClient) return null;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn profile-open-button';
  button.id = 'btn-profile-ranking';
  button.textContent = 'Perfil, Ranking y Logros';
  start.insertAdjacentElement('afterend', button);

  const overlay = document.createElement('div');
  overlay.id = 'profile-screen';
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="profile-shell">
      <div class="profile-heading">
        <div>
          <h2>Perfil de Explorador</h2>
          <div class="profile-subtitle">Estadísticas, ranking global e insignias persistentes</div>
        </div>
        <button type="button" id="profile-close" class="profile-close" aria-label="Cerrar">×</button>
      </div>
      <div id="profile-message" class="profile-message"></div>
      <div class="profile-main-grid">
        <section class="profile-card">
          <div class="profile-name-row">
            <input id="profile-name-input" maxlength="18" autocomplete="nickname" aria-label="Nombre del perfil">
            <button type="button" id="profile-save-name">Guardar</button>
          </div>
          <div id="profile-rank" class="profile-rank">Ranking —</div>
          <div id="profile-stats" class="profile-stats"></div>
        </section>
        <section class="profile-card leaderboard-card">
          <div class="leaderboard-title">Top 20 · Mejor puntaje</div>
          <div class="leaderboard-head">
            <span>#</span><span>Explorador</span><span>Puntaje</span><span>Victorias</span><span>Logros</span><span>Tiempo</span>
          </div>
          <div id="leaderboard-list"></div>
        </section>
      </div>
      <section class="profile-card achievements-card">
        <div class="achievements-heading">
          <div>
            <div class="leaderboard-title">Logros e insignias</div>
            <div id="achievement-summary" class="achievement-summary">0/0 desbloqueados</div>
          </div>
          <div class="achievement-legend">Exploración · Combate · Cooperación · Maestría</div>
        </div>
        <div id="achievement-list" class="achievement-grid"></div>
      </section>
    </div>`;
  document.body.appendChild(overlay);

  const message = overlay.querySelector('#profile-message');
  const stats = overlay.querySelector('#profile-stats');
  const list = overlay.querySelector('#leaderboard-list');
  const achievementList = overlay.querySelector('#achievement-list');
  const achievementSummary = overlay.querySelector('#achievement-summary');
  const input = overlay.querySelector('#profile-name-input');
  const rankEl = overlay.querySelector('#profile-rank');
  const save = overlay.querySelector('#profile-save-name');
  const close = overlay.querySelector('#profile-close');
  let loading = false;

  function renderProfile(profile, rank) {
    input.value = profile?.display_name || '';
    rankEl.textContent = rank ? 'Ranking #' + rank : 'Ranking —';
    stats.replaceChildren(
      createStat('Partidas', number(profile?.games_played)),
      createStat('Victorias', number(profile?.wins)),
      createStat('Mejor puntaje', number(profile?.best_score)),
      createStat('Mejor tiempo', fmtTime(profile?.best_time_seconds)),
      createStat('Nivel máximo', String(profile?.max_level || 1)),
      createStat('Enemigos derrotados', number(profile?.enemies_defeated)),
      createStat('Reanimaciones', number(profile?.revives)),
      createStat('Niveles completados', number(profile?.levels_completed)),
      createStat('Logros', number(profile?.achievement_count)),
      createStat('Puntaje acumulado', number(profile?.total_score))
    );
  }

  function renderLeaderboard(rows, ownId) {
    list.replaceChildren();
    rows.forEach((row, index) => {
      const entry = document.createElement('div');
      entry.className = 'leaderboard-row' + (row.id === ownId ? ' own' : '');

      const rank = document.createElement('span');
      rank.textContent = String(index + 1);
      const name = document.createElement('span');
      name.className = 'leaderboard-name';
      name.textContent = row.display_name;
      const score = document.createElement('span');
      score.textContent = number(row.best_score);
      const wins = document.createElement('span');
      wins.textContent = number(row.wins);
      const achievements = document.createElement('span');
      achievements.textContent = '🏆 ' + number(row.achievement_count);
      const time = document.createElement('span');
      time.textContent = fmtTime(row.best_time_seconds);
      entry.append(rank, name, score, wins, achievements, time);
      list.appendChild(entry);
    });

    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'leaderboard-empty';
      empty.textContent = 'Aún no hay expediciones registradas.';
      list.appendChild(empty);
    }
  }

  function renderAchievements(data) {
    const definitions = data?.definitions || [];
    const unlocked = data?.unlocked || [];
    const unlockedMap = new Map(unlocked.map(item => [item.achievement_id, item]));
    achievementSummary.textContent = unlocked.length + '/' + definitions.length + ' desbloqueados';
    achievementList.replaceChildren(
      ...definitions.map(definition => createAchievementCard(definition, unlockedMap))
    );
  }

  async function refresh() {
    if (loading) return;
    loading = true;
    message.textContent = 'Cargando perfil…';
    save.disabled = true;
    try {
      const profile = await profileClient.ensureProfile(input.value);
      const [rank, leaderboard, achievements] = await Promise.all([
        profileClient.getRank(),
        profileClient.getLeaderboard(20),
        profileClient.getAchievements()
      ]);
      renderProfile(profile, rank);
      renderLeaderboard(leaderboard, profileClient.identity?.id);
      renderAchievements(achievements);
      message.textContent = '';
    } catch (error) {
      console.error('Perfil:', error);
      message.textContent = 'No se pudo cargar el perfil. El juego sigue disponible.';
    } finally {
      save.disabled = false;
      loading = false;
    }
  }

  button.addEventListener('click', async () => {
    overlay.style.display = 'flex';
    await refresh();
  });

  close.addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  save.addEventListener('click', async () => {
    save.disabled = true;
    message.textContent = 'Guardando nombre…';
    try {
      const profile = await profileClient.rename(input.value);
      onNameChanged?.(profile.display_name);
      loading = false;
      await refresh();
      message.textContent = 'Nombre actualizado.';
    } catch (error) {
      console.error('Renombrar perfil:', error);
      message.textContent = error.message || 'No se pudo cambiar el nombre.';
    } finally {
      save.disabled = false;
    }
  });

  return {
    refresh,
    open: async () => {
      overlay.style.display = 'flex';
      await refresh();
    },
    close: () => { overlay.style.display = 'none'; }
  };
}

window.ExploradorProfileUI = { createProfilePanel, showAchievementToast };
