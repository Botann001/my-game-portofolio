/* ================================================================
   MODEL - State Management & Supabase Data Service
   ================================================================ */

const Model = {
  state: {
    currentScreen: 'home',
    selectedGame: null,
    accountType: 'primary',
    bgmPlaying: false,
    aim: {
      score: 0,
      time: 30,
      hits: 0,
      total: 0,
      best: parseInt(localStorage.getItem('botan_p5_aim_best') || '0', 10),
      active: false,
      timerId: null,
      targetTimerId: null
    }
  },

  supabase: {
    url: 'https://rtqhwyvloixlftecndev.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0cWh3eXZsb2l4bGZ0ZWNuZGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNjYyMzgsImV4cCI6MjEwNjY0MjIzOH0.ppp6t-4Poy0bHREmg5I11nKC1jNNG5CNi-0Jk8CNTDU'
  },

  /* ---------- AGENT / VISITOR PROFILE ---------- */
  getAgentProfile() {
    try {
      const stored = localStorage.getItem('botan_agent_profile');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
      name: 'Tamu ' + Math.floor(100 + Math.random() * 900),
      codename: 'JOKER',
      message: 'Take Your Heart!'
    };
  },

  saveAgentProfile(profile) {
    try {
      localStorage.setItem('botan_agent_profile', JSON.stringify({
        name: (profile.name || 'Tamu').trim().slice(0, 25),
        codename: (profile.codename || 'JOKER').trim().toUpperCase().slice(0, 20),
        message: (profile.message || '').trim().slice(0, 50)
      }));
      return true;
    } catch (e) {
      return false;
    }
  },

  /* ---------- LOCAL MATCH HISTORY ---------- */
  getMyAimHistory() {
    try {
      const stored = localStorage.getItem('botan_aim_history');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  },

  saveMyAimHistory(entry) {
    try {
      const history = this.getMyAimHistory();
      history.unshift({
        score: entry.score,
        accuracy: entry.accuracy,
        hits: entry.hits,
        timestamp: new Date().toISOString()
      });
      // Keep up to 50 latest matches
      localStorage.setItem('botan_aim_history', JSON.stringify(history.slice(0, 50)));
    } catch (e) {}
  },

  /* ---------- SUPABASE: COMMENTS (PHAN-SITE) ---------- */
  async fetchComments() {
    try {
      // Exclude aim_reticle scores so they do not mix with public forum messages
      const res = await fetch(`${this.supabase.url}/rest/v1/comments?select=*&game_id=neq.aim_reticle&order=created_at.desc&limit=30`, {
        headers: {
          'apikey': this.supabase.key,
          'Authorization': `Bearer ${this.supabase.key}`
        }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error('Supabase fetch error:', e);
      return [];
    }
  },

  async postComment(name, text) {
    try {
      const res = await fetch(`${this.supabase.url}/rest/v1/comments`, {
        method: 'POST',
        headers: {
          'apikey': this.supabase.key,
          'Authorization': `Bearer ${this.supabase.key}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          game_id: 'general',
          name: name.trim().slice(0, 30),
          text: text.trim().slice(0, 250)
        })
      });
      return res.ok;
    } catch (e) {
      console.error('Supabase post error:', e);
      return false;
    }
  },

  /* ---------- SUPABASE: AIM LEADERBOARD ---------- */
  async fetchAimLeaderboard() {
    try {
      // 1. Try fetching from dedicated aim_leaderboard table
      const res = await fetch(`${this.supabase.url}/rest/v1/aim_leaderboard?select=*&order=score.desc&limit=25`, {
        headers: {
          'apikey': this.supabase.key,
          'Authorization': `Bearer ${this.supabase.key}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }

      // 2. Fallback: Query comments table with game_id = 'aim_reticle'
      const fallbackRes = await fetch(`${this.supabase.url}/rest/v1/comments?select=*&game_id=eq.aim_reticle&order=created_at.desc&limit=60`, {
        headers: {
          'apikey': this.supabase.key,
          'Authorization': `Bearer ${this.supabase.key}`
        }
      });

      if (fallbackRes.ok) {
        const rows = await fallbackRes.json();
        const parsed = rows.map(r => {
          let score = 0;
          let acc = '0%';
          let hits = 0;
          let codename = 'JOKER';
          let playerName = r.name || 'Anonymous';
          let msg = '';

          try {
            const parsedObj = JSON.parse(r.text);
            score = parsedObj.score || 0;
            acc = parsedObj.accuracy || '0%';
            hits = parsedObj.hits || 0;
            codename = parsedObj.codename || 'JOKER';
            msg = parsedObj.msg || '';
          } catch (err) {
            // Parse plain text if not JSON
            const scoreMatch = (r.text || '').match(/Score:\s*(\d+)/i);
            const accMatch = (r.text || '').match(/Acc:\s*([0-9%]+)/i);
            const hitsMatch = (r.text || '').match(/Hits:\s*(\d+)/i);
            if (scoreMatch) score = parseInt(scoreMatch[1], 10);
            if (accMatch) acc = accMatch[1];
            if (hitsMatch) hits = parseInt(hitsMatch[1], 10);
            
            const codeMatch = (r.name || '').match(/\[(.*?)\]/);
            if (codeMatch) {
              codename = codeMatch[1];
              playerName = r.name.replace(/\[.*?\]/, '').trim();
            }
          }

          return {
            id: r.id,
            player_name: playerName,
            codename: codename,
            score: score,
            accuracy: acc,
            hits: hits,
            message: msg,
            created_at: r.created_at
          };
        });

        // Sort descending by score
        parsed.sort((a, b) => b.score - a.score);
        return parsed.slice(0, 25);
      }

      return [];
    } catch (e) {
      console.error('Leaderboard fetch error:', e);
      return [];
    }
  },

  async postAimScore(score, accuracy, hits) {
    const profile = this.getAgentProfile();

    // Always record locally
    this.saveMyAimHistory({ score, accuracy, hits });

    try {
      // 1. Try posting to aim_leaderboard table
      const res = await fetch(`${this.supabase.url}/rest/v1/aim_leaderboard`, {
        method: 'POST',
        headers: {
          'apikey': this.supabase.key,
          'Authorization': `Bearer ${this.supabase.key}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          player_name: profile.name,
          codename: profile.codename,
          score: score,
          accuracy: accuracy,
          hits: hits,
          message: profile.message
        })
      });

      if (res.ok) return true;

      // 2. Fallback: post to comments table with game_id: 'aim_reticle'
      const fallbackRes = await fetch(`${this.supabase.url}/rest/v1/comments`, {
        method: 'POST',
        headers: {
          'apikey': this.supabase.key,
          'Authorization': `Bearer ${this.supabase.key}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          game_id: 'aim_reticle',
          name: profile.name,
          text: JSON.stringify({
            score: score,
            accuracy: accuracy,
            hits: hits,
            codename: profile.codename,
            msg: profile.message
          })
        })
      });

      return fallbackRes.ok;
    } catch (e) {
      console.error('Aim score post error:', e);
      return false;
    }
  }
};