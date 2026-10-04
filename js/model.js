/* =====================================================================
   MODEL.JS — State Management (Persona 5 Edition)
   ===================================================================== */
const Model = {
  state: {
    screen: 'home',
    activeGame: 'ml',
    activeAccIdx: 0,
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

  async fetchComments() {
    try {
      const res = await fetch(`${this.supabase.url}/rest/v1/comments?select=*&order=created_at.desc&limit=25`, {
        headers: {
          'apikey': this.supabase.key,
          'Authorization': `Bearer ${this.supabase.key}`
        }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
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
          name: name.trim().slice(0, 30),
          comment: text.trim().slice(0, 250),
          created_at: new Date().toISOString()
        })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }
};
