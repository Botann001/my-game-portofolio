/* =====================================================================
   CONTROLLER.JS — Event Handling & Logic (Persona 5 Edition)
   ===================================================================== */
const Controller = {
  transitioning: false,
  audioUnlocked: false,

  init() {
    View.init();
    this.bindIntroSplash();
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

  
  /* ---------- INTRO SPLASH (Persona 5 'Press Any Key') ---------- */
  bindIntroSplash() {
    const splash = document.getElementById('intro-splash');
    if (!splash) return;
    const dismiss = () => {
      const bgm = document.getElementById('bgm-player');
      const userMuted = localStorage.getItem('botan_p5_bgm') === '0';
      if (bgm && !userMuted) {
        bgm.play().then(() => {
          this.audioUnlocked = true;
          const label = document.querySelector('#bgm-toggle .bgm-label');
          if (label) label.textContent = 'BGM: ON';
        }).catch(err => console.warn('BGM intro play error:', err));
      }
      this.audioUnlocked = true;
      splash.classList.add('exiting');
      setTimeout(() => { splash.style.display = 'none'; }, 750);
      ['keydown','pointerdown','touchstart'].forEach(e => document.removeEventListener(e, dismiss, {capture:true}));
    };
    ['keydown','pointerdown','touchstart'].forEach(e => document.addEventListener(e, dismiss, {once:true,capture:true}));
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
        const dest = btn.dataset.back || 'home';
        this.goTo(dest);
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
      // ESC key to go back
      if (e.key === 'Escape') {
        if (!View.els.lightbox.hidden) {
          View.closeLB();
        } else if (Model.state.screen === 'game') {
          this.goTo('games');
        } else if (Model.state.screen !== 'home') {
          this.goTo('home');
        }
        return;
      }

      // Quick numbers 1 - 4 to open games
      if ((Model.state.screen === 'home' || Model.state.screen === 'games') && !e.ctrlKey && !e.altKey && !e.metaKey) {
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

    bgm.volume = 0.55;

    const updateUI = (isPlaying) => {
      Model.state.bgmPlaying = isPlaying;
      btn.classList.toggle('playing', isPlaying);
      if (label) label.textContent = isPlaying ? 'BGM: ON' : 'BGM: OFF';
    };

    bgm.addEventListener('play', () => updateUI(true));
    bgm.addEventListener('pause', () => updateUI(false));

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (bgm.paused) {
        bgm.play().then(() => {
          localStorage.setItem('botan_p5_bgm', '1');
        }).catch((err) => {
          console.warn("BGM play error:", err);
        });
      } else {
        bgm.pause();
        localStorage.setItem('botan_p5_bgm', '0');
      }
    });

    // Autoplay handled by intro splash (browser policy compliance)
    const userMuted = localStorage.getItem('botan_p5_bgm') === '0';
    if (userMuted) updateUI(false);

    // Audio unlocker untuk efek suara (SFX)
    const unlockSFX = () => {
      this.audioUnlocked = true;
      ['touchstart', 'touchend', 'pointerdown', 'click'].forEach(evt => {
        document.removeEventListener(evt, unlockSFX, { capture: true });
      });
    };
    ['touchstart', 'touchend', 'pointerdown', 'click'].forEach(evt => {
      document.addEventListener(evt, unlockSFX, { once: true, capture: true });
    });
  },

  /* ---------- AIM TRAINER (PHANTOM RETICLE) & LEADERBOARD ---------- */
  bindAimTrainer() {
    const arena = document.getElementById('aimArena');
    const overlay = document.getElementById('aimOverlay');
    const startBtn = document.getElementById('aimStartBtn');
    const scoreEl = document.getElementById('aimScore');
    const timeEl = document.getElementById('aimTime');
    const accEl = document.getElementById('aimAcc');
    const bestEl = document.getElementById('aimBest');

    // Agent Profile UI Elements
    const agentBar = document.getElementById('agentBar');
    const agentDisplayName = document.getElementById('agentDisplayName');
    const agentDisplayCodename = document.getElementById('agentDisplayCodename');
    const openAgentModalBtn = document.getElementById('openAgentModalBtn');
    const agentModal = document.getElementById('agentModal');
    const closeAgentModalBtn = document.getElementById('closeAgentModalBtn');
    const agentProfileForm = document.getElementById('agentProfileForm');
    const inputAgentName = document.getElementById('inputAgentName');
    const inputAgentMsg = document.getElementById('inputAgentMsg');
    const codenameChips = document.getElementById('codenameChips');
    const inputCustomCodename = document.getElementById('inputCustomCodename');

    // Leaderboard & History UI Elements
    const tabGlobal = document.getElementById('tabGlobalLeaderboard');
    const tabHistory = document.getElementById('tabMyHistory');
    const viewGlobal = document.getElementById('viewGlobalLeaderboard');
    const viewHistory = document.getElementById('viewMyHistory');
    const leaderboardList = document.getElementById('leaderboardList');
    const myHistoryList = document.getElementById('myHistoryList');
    const refreshBtn = document.getElementById('refreshLeaderboardBtn');

    if (!arena || !startBtn) return;

    // Initialize personal best
    bestEl.textContent = Model.state.aim.best;

    /* ---- 1. AGENT IDENTITY PASS (FORM DATA PENGUNJUNG) ---- */
    let selectedCodename = 'JOKER';

    const updateAgentBarDisplay = () => {
      const profile = Model.getAgentProfile();
      if (agentDisplayName) agentDisplayName.textContent = profile.name || 'Tamu Misterius';
      if (agentDisplayCodename) agentDisplayCodename.textContent = profile.codename || 'JOKER';
    };

    updateAgentBarDisplay();

    // Codename chip selection
    if (codenameChips) {
      codenameChips.querySelectorAll('.codename-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          this.playSFX();
          codenameChips.querySelectorAll('.codename-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          selectedCodename = chip.dataset.code;

          if (selectedCodename === 'CUSTOM') {
            if (inputCustomCodename) {
              inputCustomCodename.style.display = 'block';
              inputCustomCodename.focus();
            }
          } else {
            if (inputCustomCodename) inputCustomCodename.style.display = 'none';
          }
        });
      });
    }

    // Open agent modal
    const openModal = () => {
      this.playSFX();
      const current = Model.getAgentProfile();
      if (inputAgentName) inputAgentName.value = current.name || '';
      if (inputAgentMsg) inputAgentMsg.value = current.message || '';
      
      selectedCodename = current.codename || 'JOKER';
      if (codenameChips) {
        let matched = false;
        codenameChips.querySelectorAll('.codename-chip').forEach(c => {
          if (c.dataset.code === selectedCodename) {
            c.classList.add('active');
            matched = true;
          } else {
            c.classList.remove('active');
          }
        });

        if (!matched && inputCustomCodename) {
          const customChip = codenameChips.querySelector('[data-code="CUSTOM"]');
          if (customChip) customChip.classList.add('active');
          inputCustomCodename.style.display = 'block';
          inputCustomCodename.value = selectedCodename;
        } else if (inputCustomCodename) {
          inputCustomCodename.style.display = 'none';
        }
      }

      if (agentModal) agentModal.hidden = false;
    };

    const closeModal = () => {
      if (agentModal) agentModal.hidden = true;
    };

    if (openAgentModalBtn) openAgentModalBtn.addEventListener('click', openModal);
    if (closeAgentModalBtn) closeAgentModalBtn.addEventListener('click', closeModal);
    if (agentModal) {
      agentModal.addEventListener('click', (e) => {
        if (e.target === agentModal) closeModal();
      });
    }

    // Save agent profile form
    if (agentProfileForm) {
      agentProfileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.playSFX();
        let codename = selectedCodename;
        if (selectedCodename === 'CUSTOM' && inputCustomCodename) {
          codename = inputCustomCodename.value.trim().toUpperCase() || 'PHANTOM';
        }

        Model.saveAgentProfile({
          name: inputAgentName.value,
          codename: codename,
          message: inputAgentMsg.value
        });

        updateAgentBarDisplay();
        closeModal();
      });
    }

    /* ---- 2. LEADERBOARD & HISTORY TAB SWITCHER ---- */
    const switchTab = (tab) => {
      this.playSFX();
      if (tab === 'global') {
        tabGlobal.classList.add('active');
        tabHistory.classList.remove('active');
        viewGlobal.classList.add('active');
        viewHistory.classList.remove('active');
        loadLeaderboard();
      } else {
        tabHistory.classList.add('active');
        tabGlobal.classList.remove('active');
        viewHistory.classList.add('active');
        viewGlobal.classList.remove('active');
        renderHistory();
      }
    };

    if (tabGlobal) tabGlobal.addEventListener('click', () => switchTab('global'));
    if (tabHistory) tabHistory.addEventListener('click', () => switchTab('history'));

    /* ---- 3. FETCH & RENDER LEADERBOARD (SUPABASE) ---- */
    const loadLeaderboard = async () => {
      if (!leaderboardList) return;
      leaderboardList.innerHTML = '<p class="hof-loading">&#9889; Mengambil peringkat dari Supabase...</p>';

      const data = await Model.fetchAimLeaderboard();

      if (!data || data.length === 0) {
        leaderboardList.innerHTML = `
          <div class="hof-empty">
            <span class="hof-empty-icon">&#127917;</span>
            <p>Belum ada skor yang tercatat di Supabase.</p>
            <small>Jadilah agen Phantom pertama yang memecahkan rekor!</small>
          </div>
        `;
        return;
      }

      leaderboardList.innerHTML = data.map((item, idx) => {
        const rank = idx + 1;
        let rankBadgeClass = 'rank-normal';
        let rankIcon = `#${rank}`;

        if (rank === 1) {
          rankBadgeClass = 'rank-1';
          rankIcon = '&#128081; #1';
        } else if (rank === 2) {
          rankBadgeClass = 'rank-2';
          rankIcon = '&#129352; #2';
        } else if (rank === 3) {
          rankBadgeClass = 'rank-3';
          rankIcon = '&#129353; #3';
        }

        const dateStr = item.created_at
          ? new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
          : '-';

        return `
          <div class="leaderboard-row ${rankBadgeClass}">
            <div class="lb-col-rank">
              <span class="rank-tag">${rankIcon}</span>
            </div>
            <div class="lb-col-player">
              <span class="player-name">${this.escapeHTML(item.player_name || 'Anonymous')}</span>
              ${item.message ? `<span class="player-msg">"${this.escapeHTML(item.message)}"</span>` : ''}
            </div>
            <div class="lb-col-codename">
              <span class="code-badge">${this.escapeHTML(item.codename || 'JOKER')}</span>
            </div>
            <div class="lb-col-score">
              <b class="score-num">${item.score}</b>
            </div>
            <div class="lb-col-acc">
              <span class="acc-val">${this.escapeHTML(item.accuracy || '0%')}</span>
            </div>
            <div class="lb-col-date">
              <span class="date-txt">${dateStr}</span>
            </div>
          </div>
        `;
      }).join('');
    };

    /* ---- 4. RENDER LOCAL MATCH HISTORY ---- */
    const renderHistory = () => {
      if (!myHistoryList) return;
      const history = Model.getMyAimHistory();

      if (!history || history.length === 0) {
        myHistoryList.innerHTML = `
          <div class="hof-empty">
            <span class="hof-empty-icon">&#128220;</span>
            <p>Belum ada riwayat tembakan di perangkat ini.</p>
            <small>Mainkan mini game di atas untuk melihat riwayat latihanmu!</small>
          </div>
        `;
        return;
      }

      myHistoryList.innerHTML = history.map((item, idx) => {
        const dateStr = item.timestamp
          ? new Date(item.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
          : '-';

        return `
          <div class="history-row">
            <div class="h-col-num">#${idx + 1}</div>
            <div class="h-col-score"><b style="color:var(--yellow);font-size:18px;">${item.score}</b></div>
            <div class="h-col-acc">${item.accuracy}</div>
            <div class="h-col-hits">${item.hits || 0} target</div>
            <div class="h-col-time">${dateStr}</div>
          </div>
        `;
      }).join('');
    };

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.playSFX();
        refreshBtn.classList.add('rotating');
        setTimeout(() => refreshBtn.classList.remove('rotating'), 600);
        if (tabGlobal.classList.contains('active')) {
          loadLeaderboard();
        } else {
          renderHistory();
        }
      });
    }

    // Initial load of leaderboard
    loadLeaderboard();

    /* ---- 5. AIM GAME LOGIC & AUTO-SUBMIT ---- */
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

    const endGame = async () => {
      Model.state.aim.active = false;
      clearInterval(Model.state.aim.timerId);
      arena.querySelectorAll('.aim-target').forEach(t => t.remove());

      const finalScore = Model.state.aim.score;
      const finalAcc = accEl.textContent;
      const finalHits = Model.state.aim.hits;
      const profile = Model.getAgentProfile();

      // Update personal best
      if (finalScore > Model.state.aim.best) {
        Model.state.aim.best = finalScore;
        localStorage.setItem('botan_p5_aim_best', Model.state.aim.best.toString());
        bestEl.textContent = Model.state.aim.best;
      }

      // Show intermediate saving screen
      overlay.innerHTML = `
        <h3 style="color:var(--yellow);font-size:32px;">MISI SELESAI!</h3>
        <p style="font-size:18px;color:#fff;margin:8px 0;">SKOR AKHIR: <b style="color:var(--yellow);font-size:28px;">${finalScore}</b></p>
        <p style="font-size:14px;color:#ccc;">Akurasi: ${finalAcc} &#9670; Hits: ${finalHits}</p>
        <p style="color:var(--yellow);font-size:14px;margin-top:10px;">&#9889; Mengirim rekor ke Supabase...</p>
      `;
      overlay.style.display = 'flex';

      // Submit to Supabase
      const success = await Model.postAimScore(finalScore, finalAcc, finalHits);

      // Display final results with options
      overlay.innerHTML = `
        <div class="aim-result-box">
          <span class="card-tarot-tag">// MISSION COMPLETED</span>
          <h3 style="font-family:var(--font-display);font-size:36px;color:var(--white);text-shadow:3px 3px 0 var(--black);">MISI SELESAI!</h3>
          <div class="aim-score-highlight">
            <small>SKOR AKHIR</small>
            <b>${finalScore}</b>
          </div>
          <div class="aim-stat-pills">
            <span>&#127917; AKURASI: <b>${finalAcc}</b></span>
            <span>&#128128; HITS: <b>${finalHits}</b></span>
            <span>&#127942; REKOR TERBAIK: <b>${Model.state.aim.best}</b></span>
          </div>
          <div class="aim-player-tag">
            <span>AGENT: <b>${this.escapeHTML(profile.name)}</b> [${this.escapeHTML(profile.codename)}]</span>
          </div>
          <p style="font-size:13px;color:${success ? '#00e676' : 'var(--yellow)'};margin-top:4px;">
            ${success ? '&#10004; Skor berhasil dicatat di Papan Peringkat Global Supabase!' : '&#9888; Rekor tersimpan di riwayat lokal!'}
          </p>
          <div class="aim-result-btns">
            <button class="btn-p5" id="aimRestartBtn">MAIN LAGI &#9654;</button>
            <button class="btn-p5 btn-secondary-p5" id="viewRankBtn">LIHAT PERINGKAT &#127942;</button>
          </div>
        </div>
      `;

      // Refresh leaderboard & history
      loadLeaderboard();
      renderHistory();

      // Hook buttons
      const restartBtn = document.getElementById('aimRestartBtn');
      if (restartBtn) restartBtn.addEventListener('click', startGame);

      const viewRankBtn = document.getElementById('viewRankBtn');
      if (viewRankBtn) {
        viewRankBtn.addEventListener('click', () => {
          this.playSFX();
          overlay.style.display = 'none';
          const hofEl = document.getElementById('hallOfFame');
          if (hofEl) hofEl.scrollIntoView({ behavior: 'smooth' });
        });
      }
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
      submitBtn.textContent = 'KIRIM KE PHAN-SITE ?';
    });
  },

  async loadComments() {
    const list = document.getElementById('commentsList');
    if (!list) return;

    list.innerHTML = '<p style="color:var(--yellow);font-size:14px;background:rgba(0,0,0,0.6);padding:8px 12px;border-left:3px solid var(--yellow);">? Menghubungkan & memuat pesan dari Supabase...</p>';
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






