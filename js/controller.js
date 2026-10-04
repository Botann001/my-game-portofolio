/* =====================================================================
   CONTROLLER.JS — Event Handling & Logic (Persona 5 Edition)
   ===================================================================== */
const Controller = {
  transitioning: false,
  audioUnlocked: false,

  init() {
    View.init();
    this.bindNavigation();
    this.bindGameCards();
    this.bindKeyboard();
    this.bindAudio();
    this.bindAimTrainer();
    this.bindComments();
    this.bindLightbox();
    this.bindAccountSwitcher();

    // Pre-fetch Supabase comments so they are immediately visible
    this.loadComments();

    // Check if initial hash exists (e.g. #valo, #ml)
    const hash = window.location.hash.replace('#', '');
    if (GAMES_DATA[hash]) {
      this.openGame(hash);
    }
  },

  /* ---------- SCREEN TRANSITIONS ---------- */
  goTo(screenId) {
    if (this.transitioning || Model.state.screen === screenId) return;
    this.transitioning = true;
    this.playSFX();

    View.wipe(
      () => {
        Model.state.screen = screenId;
        View.showScreen(screenId);

        if (screenId === 'stats') {
          View.animateCountUps();
        } else if (screenId === 'comments') {
          this.loadComments();
        }
      },
      () => {
        this.transitioning = false;
      }
    );
  },

  openGame(gameId) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.playSFX();

    View.wipe(
      () => {
        Model.state.screen = 'game';
        Model.state.activeGame = gameId;
        Model.state.activeAccIdx = 0;
        View.renderGameDetail(gameId, 0);
        View.showScreen('game');
        View.animateCountUps();
      },
      () => {
        this.transitioning = false;
      }
    );
  },

  /* ---------- EVENT BINDINGS ---------- */
  bindNavigation() {
    // Menu items on Home
    document.querySelectorAll('.menu-item[data-target]').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        this.goTo(target);
      });

      btn.addEventListener('mouseenter', () => {
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('sel'));
        btn.classList.add('sel');
      });
    });

    // Back buttons
    document.querySelectorAll('[data-back]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.goTo('home');
      });
    });
  },

  bindGameCards() {
    // Click on Tarot Game cards on Home
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.game-tarot-card');
      if (card && card.dataset.game) {
        this.openGame(card.dataset.game);
      }
    });
  },

  bindAccountSwitcher() {
    // Switch between Main and Smurf accounts
    document.addEventListener('click', (e) => {
      const pill = e.target.closest('.acc-pill-p5');
      if (pill && pill.dataset.accIdx !== undefined) {
        const idx = +pill.dataset.accIdx;
        if (idx !== Model.state.activeAccIdx) {
          Model.state.activeAccIdx = idx;
          this.playSFX();
          View.renderGameDetail(Model.state.activeGame, idx);
          View.animateCountUps();
        }
      }
    });
  },

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      // ESC key to go back home
      if (e.key === 'Escape') {
        if (!View.els.lightbox.hidden) {
          View.closeLB();
        } else if (Model.state.screen !== 'home') {
          this.goTo('home');
        }
        return;
      }

      // Quick numbers 1 - 4 on Home to open games
      if (Model.state.screen === 'home' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const map = { '1': 'ml', '2': 'wuwa', '3': 'valo', '4': 'roblox' };
        if (map[e.key]) {
          this.openGame(map[e.key]);
        }
      }
    });
  },

  /* ---------- AUDIO SYSTEM ---------- */
  playSFX() {
    View.playSelect();
  },

  bindAudio() {
    const bgm = View.els.bgmPlayer;
    const btn = View.els.bgmToggle;
    const label = View.els.bgmLabel;

    if (!bgm || !btn) return;

    // Check saved state
    const savedState = localStorage.getItem('botan_p5_bgm');
    const shouldPlay = savedState !== '0';

    const updateUI = (isPlaying) => {
      Model.state.bgmPlaying = isPlaying;
      btn.classList.toggle('playing', isPlaying);
      if (label) label.textContent = isPlaying ? 'BGM: ON' : 'BGM: OFF';
    };

    const toggleBgm = () => {
      if (bgm.paused) {
        bgm.play().then(() => {
          updateUI(true);
          localStorage.setItem('botan_p5_bgm', '1');
        }).catch(() => {});
      } else {
        bgm.pause();
        updateUI(false);
        localStorage.setItem('botan_p5_bgm', '0');
      }
    };

    btn.addEventListener('click', toggleBgm);

    // Auto-play on first user interaction if enabled
    const unlockAudio = () => {
      if (shouldPlay && bgm.paused) {
        bgm.volume = 0.55;
        bgm.play().then(() => {
          updateUI(true);
        }).catch(() => {});
      }
      this.audioUnlocked = true;
      ['click', 'keydown', 'pointerdown'].forEach(evt => {
        window.removeEventListener(evt, unlockAudio);
      });
    };

    ['click', 'keydown', 'pointerdown'].forEach(evt => {
      window.addEventListener(evt, unlockAudio, { once: true, passive: true });
    });
  },

  /* ---------- AIM TRAINER (PHANTOM RETICLE) ---------- */
  bindAimTrainer() {
    const arena = document.getElementById('aimArena');
    const overlay = document.getElementById('aimOverlay');
    const startBtn = document.getElementById('aimStartBtn');
    const scoreEl = document.getElementById('aimScore');
    const timeEl = document.getElementById('aimTime');
    const accEl = document.getElementById('aimAcc');
    const bestEl = document.getElementById('aimBest');

    if (!arena || !startBtn) return;

    bestEl.textContent = Model.state.aim.best;

    const spawnTarget = () => {
      arena.querySelectorAll('.aim-target').forEach(t => t.remove());
      if (!Model.state.aim.active) return;

      const target = document.createElement('div');
      target.className = 'aim-target';

      const pad = 50;
      const x = pad + Math.random() * (arena.clientWidth - pad * 2);
      const y = pad + Math.random() * (arena.clientHeight - pad * 2);
      target.style.left = `${x}px`;
      target.style.top = `${y}px`;

      target.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (!Model.state.aim.active) return;

        Model.state.aim.score += 100;
        Model.state.aim.hits++;
        Model.state.aim.total++;
        this.playSFX();

        scoreEl.textContent = Model.state.aim.score;
        updateAccuracy();
        spawnTarget();
      });

      arena.appendChild(target);
    };

    const updateAccuracy = () => {
      const { hits, total } = Model.state.aim;
      const acc = total > 0 ? Math.round((hits / total) * 100) : 0;
      accEl.textContent = `${acc}%`;
    };

    arena.addEventListener('pointerdown', () => {
      if (!Model.state.aim.active) return;
      Model.state.aim.total++;
      updateAccuracy();
    });

    const endGame = () => {
      Model.state.aim.active = false;
      clearInterval(Model.state.aim.timerId);
      arena.querySelectorAll('.aim-target').forEach(t => t.remove());

      if (Model.state.aim.score > Model.state.aim.best) {
        Model.state.aim.best = Model.state.aim.score;
        localStorage.setItem('botan_p5_aim_best', Model.state.aim.best.toString());
        bestEl.textContent = Model.state.aim.best;
      }

      overlay.innerHTML = `
        <h3>MISI SELESAI!</h3>
        <p style="font-size:18px;color:#fff;">SKOR AKHIR: <b style="color:var(--yellow);font-size:26px;">${Model.state.aim.score}</b></p>
        <p style="font-size:15px;color:#ccc;">Akurasi: ${accEl.textContent} • Skor Terbaik: ${Model.state.aim.best}</p>
        <button class="btn-p5" id="aimRestartBtn">MAIN LAGI ▶</button>
      `;
      overlay.style.display = 'flex';

      document.getElementById('aimRestartBtn').addEventListener('click', startGame);
    };

    const startGame = () => {
      overlay.style.display = 'none';
      Model.state.aim.score = 0;
      Model.state.aim.time = 30;
      Model.state.aim.hits = 0;
      Model.state.aim.total = 0;
      Model.state.aim.active = true;

      scoreEl.textContent = '0';
      timeEl.textContent = '30';
      accEl.textContent = '0%';

      spawnTarget();

      Model.state.aim.timerId = setInterval(() => {
        Model.state.aim.time--;
        timeEl.textContent = Model.state.aim.time;
        if (Model.state.aim.time <= 0) {
          endGame();
        }
      }, 1000);
    };

    startBtn.addEventListener('click', startGame);
  },

  /* ---------- PHAN-SITE COMMENTS ---------- */
  bindComments() {
    const form = document.getElementById('commentForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('commentName');
      const textInput = document.getElementById('commentText');
      const submitBtn = form.querySelector('button[type="submit"]');

      if (!nameInput.value.trim() || !textInput.value.trim()) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'MENGIRIM KE SUPABASE...';

      const ok = await Model.postComment(nameInput.value, textInput.value);
      if (ok) {
        textInput.value = '';
        this.playSFX();
        await this.loadComments();
      } else {
        alert('Gagal mengirim komentar ke Supabase. Cek koneksi internetmu.');
      }

      submitBtn.disabled = false;
      submitBtn.textContent = 'KIRIM KE PHAN-SITE ▶';
    });
  },

  async loadComments() {
    const list = document.getElementById('commentsList');
    if (!list) return;

    list.innerHTML = '<p style="color:var(--yellow);font-size:14px;background:rgba(0,0,0,0.6);padding:8px 12px;border-left:3px solid var(--yellow);">⚡ Menghubungkan & memuat pesan dari Supabase...</p>';
    const comments = await Model.fetchComments();

    if (!comments || comments.length === 0) {
      list.innerHTML = '<p style="color:#eee;font-size:14px;background:rgba(0,0,0,0.6);padding:10px 14px;border-left:3px solid var(--yellow);">Belum ada pesan di Supabase. Jadilah yang pertama mengirim pesan!</p>';
      return;
    }

    list.innerHTML = comments.map(c => {
      const date = c.created_at ? new Date(c.created_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
      const text = c.text || c.comment || '';
      return `
        <div class="comment-bubble">
          <div>
            <b>${this.escapeHTML(c.name || 'Anonymous Phantom')}</b>
            <small>${date}</small>
          </div>
          <p>${this.escapeHTML(text)}</p>
        </div>
      `;
    }).join('');
  },

  escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
  },

  /* ---------- LIGHTBOX ---------- */
  bindLightbox() {
    const lb = View.els.lightbox;
    const closeBtn = document.getElementById('lbClose');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => View.closeLB());
    }

    if (lb) {
      lb.addEventListener('click', (e) => {
        if (e.target === lb) View.closeLB();
      });
    }
  }
};

// Auto-run on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  Controller.init();
});
