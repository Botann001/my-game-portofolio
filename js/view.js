/* =====================================================================
   VIEW.JS � Rendering & UI Controller (Persona 5 Edition)
   ===================================================================== */
const View = {
  els: {},

  init() {
    this.cacheElements();
    this.initCursor();
    this.buildAllRansoms();
    this.renderHomeTarotCards();
    this.renderTotalStats();
  },

  cacheElements() {
    this.els = {
      wipe: document.getElementById('wipe'),
      cursor: document.getElementById('cursor'),
      stage: document.getElementById('stage'),
      screens: document.querySelectorAll('.screen'),
      gameCardsGrid: document.getElementById('gameCardsGrid'),
      gamePanel: document.getElementById('gamePanel'),
      lightbox: document.getElementById('lightbox'),
      lbImg: document.getElementById('lbImg'),
      lbCap: document.getElementById('lbCap'),
      sfxSelect: document.getElementById('sfx-select'),
      bgmPlayer: document.getElementById('bgm-player'),
      bgmToggle: document.getElementById('bgm-toggle'),
      bgmLabel: document.querySelector('#bgm-toggle .bgm-label')
    };
  },

  /* ---------- CUSTOM CURSOR ---------- */
  initCursor() {
    const c = this.els.cursor;
    if (!c || window.matchMedia('(pointer: coarse)').matches) return;

    document.body.classList.add('cursor-on');
    c.style.display = 'block';

    window.addEventListener('mousemove', (e) => {
      c.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    });

    window.addEventListener('mouseleave', () => {
      c.style.display = 'none';
    });

    window.addEventListener('mouseenter', () => {
      c.style.display = 'block';
    });

    this.bindHoverLinks();
  },

  bindHoverLinks() {
    const c = this.els.cursor;
    if (!c) return;

    const clickable = 'a, button, .menu-item, .game-tarot-card, .thumb-p5, .acc-pill-p5, .stat-card-p5, .aim-target, input, textarea';
    document.querySelectorAll(clickable).forEach(el => {
      el.addEventListener('mouseenter', () => c.classList.add('link'));
      el.addEventListener('mouseleave', () => c.classList.remove('link'));
    });
  },

  /* ---------- RANSOM NOTE LETTERS GENERATOR ---------- */
  buildAllRansoms() {
    document.querySelectorAll('.ransom[data-ransom]').forEach(el => {
      this.makeRansom(el, el.dataset.ransom);
    });
  },

  makeRansom(el, text) {
    el.innerHTML = '';
    const chars = text.split('');
    const styles = ['box', 'boxw', 'red', 'yellow', 'box', 'boxw'];

    chars.forEach((ch, idx) => {
      if (ch === ' ') {
        const sp = document.createElement('span');
        sp.style.display = 'inline-block';
        sp.style.width = '0.35em';
        el.appendChild(sp);
        return;
      }

      const span = document.createElement('span');
      span.className = 'ch ' + styles[idx % styles.length];
      span.textContent = ch;

      // Random tilt & skew
      const rot = ((idx * 7) % 11) - 5; // -5 to +5 deg
      const skew = ((idx * 5) % 9) - 4;
      span.style.transform = `rotate(${rot}deg) skewX(${skew}deg)`;

      el.appendChild(span);
    });
  },

  /* ---------- WIPE TRANSITION ---------- */
  wipe(midCallback, finishCallback) {
    const w = this.els.wipe;
    if (!w) {
      if (midCallback) midCallback();
      if (finishCallback) finishCallback();
      return;
    }

    w.classList.remove('go');
    void w.offsetWidth;
    w.classList.add('go');

    setTimeout(() => {
      if (midCallback) midCallback();
    }, 320);

    setTimeout(() => {
      w.classList.remove('go');
      if (finishCallback) finishCallback();
    }, 680);
  },

  showScreen(screenId) {
    document.body.dataset.screen = screenId;
    this.els.screens.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
      target.classList.add('active');
      target.scrollTop = 0;
    }
    this.bindHoverLinks();
  },

  /* ---------- HOME TAROT CARDS ---------- */
  renderHomeTarotCards() {
    const grid = this.els.gameCardsGrid;
    if (!grid) return;

    const tilts = ['-1.5deg', '1.8deg', '-2deg', '1.5deg'];
    let idx = 0;

    grid.innerHTML = Object.entries(GAMES_DATA).map(([key, g]) => {
      const tilt = tilts[idx % tilts.length];
      idx++;
      return `
        <div class="game-tarot-card" data-game="${key}" style="--tilt:${tilt}; --game-c:${g.color}">
          <div class="card-top">
            <img class="card-icon" src="${g.icon}" alt="${g.title}">
            <div>
              <span class="card-tarot-tag">${g.tarot} � ${g.genre}</span>
              <h4 class="card-title">${g.title}</h4>
            </div>
          </div>
          <div class="card-preview">
            <img src="${g.poster}" alt="${g.title}" loading="lazy">
          </div>
          <p class="card-meta">${g.tagline}</p>
          <button class="card-btn">BUKA STATS ?</button>
        </div>
      `;
    }).join('');
  },

  /* ---------- TOTAL STATS SUMMARY ---------- */
  renderTotalStats() {
    const container = document.getElementById('totalStatsCards');
    if (!container) return;

    const tilts = ['-1deg', '1.5deg', '-1.8deg', '1.2deg'];
    container.innerHTML = TOTAL_STATS.map((s, i) => `
      <div class="total-card-p5" style="--tilt:${tilts[i % tilts.length]}">
        <b data-count="${s.val}">0</b>
        <h4>${s.label}</h4>
        <p>${s.sub}</p>
      </div>
    `).join('');

    this.animateCountUps();
  },

  /* ---------- COUNT UP ANIMATION ---------- */
  animateCountUps() {
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = +el.dataset.count;
      const duration = 1200;
      const start = performance.now();

      function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const val = Math.floor(ease * target);
        el.textContent = val.toLocaleString('id-ID');
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    });
  },

  /* ---------- GAME DETAIL RENDERING ---------- */
  renderGameDetail(gameId, accIdx = 0) {
    const g = GAMES_DATA[gameId];
    if (!g) return;

    const panel = this.els.gamePanel;
    if (!panel) return;

    const accounts = g.accounts || [];
    const acc = accounts[accIdx] || accounts[0];

    // Build switcher pills if multiple accounts exist
    let switcherHTML = '';
    if (accounts.length > 1) {
      switcherHTML = `
        <div class="account-switcher-p5">
          ${accounts.map((a, i) => `
            <button class="acc-pill-p5 ${i === accIdx ? 'active' : ''}" data-acc-idx="${i}">
              <span>${a.icon || '??'}</span>
              <span>${a.name}</span>
              <span class="tag">${a.tag || 'ACCOUNT'}</span>
            </button>
          `).join('')}
        </div>
      `;
    }

    // Build visualizer card (Radar, Donut, EXP bar)
    let vizHTML = '';
    if (acc.radar) {
      vizHTML = `
        <div class="viz-card-p5">
          <h4>RADAR PERFORMA // STATISTIK</h4>
          <canvas id="p5RadarCanvas" width="360" height="300" style="width:100%;max-width:360px;height:auto;display:block;margin:0 auto;"></canvas>
        </div>
      `;
    } else if (acc.donut) {
      const C = 2 * Math.PI * 46;
      const total = acc.donut.win + acc.donut.lose;
      const winPct = acc.donut.win / total;
      vizHTML = `
        <div class="viz-card-p5">
          <h4>KOMPETITIF OVERVIEW // WIN RATE</h4>
          <div class="donut-wrap">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="46" stroke="#222" />
              <circle cx="60" cy="60" r="46" stroke="var(--red)" stroke-dasharray="${(C * (1 - winPct)).toFixed(1)} ${C}" stroke-dashoffset="0" />
              <circle cx="60" cy="60" r="46" stroke="#00e5ff" stroke-dasharray="${(C * winPct).toFixed(1)} ${C}" stroke-dashoffset="-${(C * (1 - winPct)).toFixed(1)}" />
            </svg>
            <div class="donut-info">
              <b>${acc.donut.win}W � ${acc.donut.lose}L</b>
              <span>WIN RATE: ${acc.donut.pct}%</span>
              <p style="font-size:12px;color:#888;margin-top:4px;">Total Match: ${total}</p>
            </div>
          </div>
        </div>
      `;
    } else if (acc.bars) {
      const pct = (acc.bars.cur / acc.bars.max * 100).toFixed(1);
      vizHTML = `
        <div class="viz-card-p5">
          <h4>${acc.bars.title} // PROGRESS</h4>
          <div class="exp-bar-wrap">
            <div class="exp-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="exp-label">
            <span>${acc.bars.cur.toLocaleString('id-ID')} / ${acc.bars.max.toLocaleString('id-ID')}</span>
            <span>${pct}%</span>
          </div>
        </div>
      `;
    }

    panel.innerHTML = `
      ${switcherHTML}
      <div class="game-detail-panel">
        <div class="p-art-box">
          <img class="main-art" src="${acc.art}" alt="${acc.title}">
          <div class="p-art-badge">
            <img src="${acc.badge.img}" alt="">
            <div>
              <b>${acc.badge.name}</b>
              <small>${acc.badge.sub}</small>
            </div>
          </div>
        </div>

        <div class="p-info-box">
          <div class="p-header">
            <div>
              <span class="p-genre-tag">${g.genre}</span>
              <h2>${g.title}</h2>
            </div>
            ${acc.copyId ? `
              <button class="copy-id-btn-p5" id="copyIdBtn" data-val="${acc.copyId.value}">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                SALIN ${acc.copyId.label}
              </button>
            ` : ''}
          </div>

          <p class="p-meta-text">${acc.meta}</p>

          <div class="stat-grid-p5">
            ${acc.stats.map(s => `
              <div class="stat-card-p5 ${s.hl ? 'hl' : ''}">
                <b data-count="${s.v}">${s.v}${s.s || ''}</b>
                <small>${s.l}</small>
              </div>
            `).join('')}
          </div>

          <div class="viz-box">${vizHTML}</div>

          <div class="chips-p5">
            ${acc.chips.map(c => `<span class="chip-p5">? ${c}</span>`).join('')}
          </div>

          <h3 class="gallery-heading">SCREENSHOT & GALERI</h3>
          <div class="gallery-grid-p5">
            ${acc.gallery.map((img, i) => `
              <button class="thumb-p5" data-src="${img.src}" data-cap="${img.cap}">
                <img src="${img.src}" alt="${img.cap}" loading="lazy">
                <span>${img.cap}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Draw radar if present
    if (acc.radar) {
      const cv = document.getElementById('p5RadarCanvas');
      if (cv) this.drawRadar(cv, acc.radar);
    }

    // Bind Lightbox clicks
    panel.querySelectorAll('.thumb-p5').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openLB(btn.dataset.src, btn.dataset.cap);
      });
    });

    // Bind Copy ID button
    const copyBtn = document.getElementById('copyIdBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const val = copyBtn.dataset.val;
        navigator.clipboard.writeText(val).then(() => {
          const orig = copyBtn.innerHTML;
          copyBtn.innerHTML = `? TERSALIN!`;
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.innerHTML = orig;
            copyBtn.classList.remove('copied');
          }, 2000);
        });
      });
    }

    this.bindHoverLinks();
  },

  /* ---------- RADAR CHART (PERSONA THEME) ---------- */
  drawRadar(canvas, radar) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2 + 10;
    const radius = 100;
    const N = radar.labels.length;

    ctx.clearRect(0, 0, w, h);

    // Background Web Grid (5 levels)
    for (let level = 1; level <= 5; level++) {
      const r = (radius / 5) * level;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const angle = (i * 2 * Math.PI) / N - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = level === 5 ? '#f6f4ef' : 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = level === 5 ? 2 : 1;
      ctx.stroke();
    }

    // Spokes
    for (let i = 0; i < N; i++) {
      const angle = (i * 2 * Math.PI) / N - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Data Polygon (Red glow with yellow points)
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const val = radar.values[i];
      const r = radius * val;
      const angle = (i * 2 * Math.PI) / N - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 47, 61, 0.45)';
    ctx.fill();
    ctx.strokeStyle = '#ff2f3d';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Data points & Labels
    for (let i = 0; i < N; i++) {
      const val = radar.values[i];
      const r = radius * val;
      const angle = (i * 2 * Math.PI) / N - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);

      // Node point
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffc800';
      ctx.fill();
      ctx.strokeStyle = '#0b0b0d';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label text
      const lx = cx + (radius + 24) * Math.cos(angle);
      const ly = cy + (radius + 24) * Math.sin(angle);
      ctx.font = '700 13px "Chakra Petch", sans-serif';
      ctx.fillStyle = '#f6f4ef';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(radar.labels[i], lx, ly);
    }
  },

  /* ---------- LIGHTBOX ---------- */
  openLB(src, cap) {
    this.els.lbImg.src = src;
    this.els.lbCap.textContent = cap || '';
    this.els.lightbox.hidden = false;
    try {
      history.pushState(
        { modal: 'lightbox', screen: Model.state.screen, gameId: Model.state.activeGame, accIdx: Model.state.activeAccIdx },
        '',
        window.location.href
      );
    } catch (e) {}
  },

  closeLB() {
    if (!this.els.lightbox.hidden) {
      this.els.lightbox.hidden = true;
      this.els.lbImg.src = '';
      try {
        if (history.state && history.state.modal === 'lightbox') {
          history.back();
        }
      } catch (e) {}
    }
  },

  /* ---------- SOUND EFFECT (SELECT) ---------- */
  playSelect() {
    const sfx = this.els.sfxSelect;
    if (sfx) {
      sfx.currentTime = 0;
      sfx.volume = 0.55;
      sfx.play().catch(() => {});
    }
  }
};
