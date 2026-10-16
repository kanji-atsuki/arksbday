/* Birthday Server v17.0: shared core (storage, clock, sound, router, HUD,
   celebration, debug menu). Pages register themselves with Site.register(). */
(function () {
  'use strict';
  const C = window.CONFIG;
  const DEBUG = !!(C.DEBUG_MENU || C.DEBUG_URL);

  // ---------- tiny event bus ----------
  const listeners = {};
  const bus = {
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return () => bus.off(ev, fn); },
    off(ev, fn) { listeners[ev] = (listeners[ev] || []).filter(f => f !== fn); },
    emit(ev, data) { (listeners[ev] || []).slice().forEach(fn => fn(data)); },
  };

  // ---------- storage: localStorage when it works, memory when it doesn't ----------
  const PREFIX = 'bs17.';
  const mem = {};
  const Store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(PREFIX + key);
        if (v !== null) return JSON.parse(v);
      } catch (e) { /* blocked or corrupt: fall through */ }
      return key in mem ? mem[key] : fallback;
    },
    set(key, val) {
      mem[key] = val;
      try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); } catch (e) { /* memory only */ }
    },
    del(key) {
      delete mem[key];
      try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
    },
    clearAll() {
      const keepMuted = this.get('muted', true); // wiping progress shouldn't flip the sound setting
      Object.keys(mem).forEach(k => delete mem[k]);
      try {
        Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k));
      } catch (e) { /* ignore */ }
      this.set('muted', keepMuted);
      ['tried', 'visited', 'stars', 'done'].forEach(n => cookieSet(n, []));
    },
  };

  // ---------- URL params (only when DEBUG_URL is on) ----------
  let params = new URLSearchParams('');
  if (C.DEBUG_URL) { try { params = new URLSearchParams(location.search); } catch (e) { /* ignore */ } }

  // ---------- clock (fake time only in debug builds) ----------
  const at = a => new Date(a[0], a[1], a[2], a[3] || 0, a[4] || 0, a[5] || 0).getTime();
  const BIRTHDAY = at(C.BIRTHDAY);
  const SECRET = at(C.SECRET_TARGET);

  const Clock = {
    offset: DEBUG ? Number(Store.get('fakeOffset', 0)) || 0 : 0,
    serverOffset: 0, // correction if the device clock was moved (see syncTime)
    now() { return Date.now() + this.serverOffset + this.offset; },
    set(ms) { this.offset = ms - Date.now() - this.serverOffset; Store.set('fakeOffset', this.offset); bus.emit('clock'); },
    reset() { this.offset = 0; Store.del('fakeOffset'); bus.emit('clock'); },
    // "-10" / "-10s" / "-5m" = before midnight, "+30s" = after midnight,
    // "s-10" = 10 s before the secret target, or a local date like 2026-10-16T23:59:50
    parse(v) {
      if (!v) return null;
      v = v.replace(/^(s?) /, '$1+'); // a "+" in a URL arrives as a space
      const m = /^(s?)([+-]?)(\d+)([smh]?)$/.exec(v.trim());
      if (m) {
        const n = Number(m[3]) * { s: 1e3, m: 6e4, h: 36e5 }[m[4] || 's'];
        const base = m[1] ? SECRET : BIRTHDAY;
        return m[2] === '+' ? base + n : base - n;
      }
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d.getTime();
    },
  };
  // Anti-cheat: ask the web host what time it really is (HTTP Date header).
  // If the device clock is more than 90 s off (someone moved it to midnight),
  // trust the server instead. Does nothing when opened as a local file.
  function syncTime() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return Promise.resolve();
    const t0 = Date.now();
    const req = fetch(`${location.pathname}?sync=${t0}`, { method: 'HEAD', cache: 'no-store' }).then(r => {
      const d = r.headers.get('Date');
      if (!d) return;
      const server = new Date(d).getTime();
      if (isNaN(server)) return;
      const diff = server + (Date.now() - t0) / 2 - Date.now();
      if (Math.abs(diff) > 90000) { Clock.serverOffset = diff; bus.emit('clock'); }
    }).catch(() => {});
    return Promise.race([req, new Promise(res => setTimeout(res, 2500))]);
  }

  if (params.has('t')) {
    const ms = Clock.parse(params.get('t'));
    if (ms !== null) Clock.set(ms);
  }

  const pad = n => String(n).padStart(2, '0');
  const Countdown = {
    BIRTHDAY, SECRET,
    remaining(target) { return (target || BIRTHDAY) - Clock.now(); },
    fmt(ms) {
      const s = Math.max(0, Math.ceil(ms / 1000));
      return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60);
    },
  };

  // ---------- progress ("tried" per page, for the secret) ----------
  // Mirrored into a cookie too, so clearing one store doesn't wipe it.
  const cookieGet = name => {
    try { const m = new RegExp(`(?:^|; )bs17${name}=([^;]*)`).exec(document.cookie); return m ? decodeURIComponent(m[1]).split(',').filter(Boolean) : []; }
    catch (e) { return []; }
  };
  const cookieSet = (name, list) => {
    try { document.cookie = `bs17${name}=${encodeURIComponent(list.join(','))}; max-age=${60 * 60 * 24 * 120}; path=/; SameSite=Lax`; }
    catch (e) { /* ignore */ }
  };
  const Cookie = { get: () => cookieGet('tried'), set: list => cookieSet('tried', list) };
  // a list saved in localStorage AND a cookie (union of both when read)
  const SavedList = name => ({
    get() { const a = Store.get(name, []) || []; cookieGet(name).forEach(x => { if (!a.includes(x)) a.push(x); }); return a; },
    add(x) { const a = this.get(); if (!a.includes(x)) a.push(x); Store.set(name, a); cookieSet(name, a); return a; },
    set(a) { Store.set(name, a); cookieSet(name, a); },
    clear() { Store.del(name); cookieSet(name, []); },
  });
  const Visited = SavedList('visited');
  const Done = SavedList('done');
  const StarList = SavedList('stars');
  const Progress = {
    ids: ['boot', 'captcha', 'terms', 'aim', 'quiz', 'nav', 'mbti', 'caveman', 'coupons', 'stars'],
    all() {
      const t = Object.assign({}, Store.get('tried', {}) || {});
      Cookie.get().forEach(id => { if (!t[id]) t[id] = 1; });
      return t;
    },
    mark(id) {
      const t = this.all();
      if (t[id]) return;
      t[id] = Date.now();
      Store.set('tried', t);
      Cookie.set(Object.keys(t));
      bus.emit('progress', id);
    },
    count() { const t = this.all(); return this.ids.filter(id => t[id]).length; },
    complete() { return this.count() >= this.ids.length; },
    markAll() { const t = {}; this.ids.forEach(id => { t[id] = Date.now(); }); Store.set('tried', t); Cookie.set(this.ids); bus.emit('progress'); },
    reset() { Store.del('tried'); Cookie.set([]); Store.del('secretSeen'); bus.emit('progress'); },
  };

  // ---------- sound: tiny synth blips, muted by default ----------
  const Sound = {
    muted: Store.get('muted', true) !== false,
    ctx: null,
    ensure() {
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          this.ctx = new AC();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
      } catch (e) { return null; }
    },
    setMuted(m) {
      this.muted = m; Store.set('muted', m); bus.emit('sound', m);
      if (m) { this.stopVoice(); try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
      else this.play('blip');
    },
    // pre-rendered voice lines in voice/*.wav (one at a time)
    current: null,
    voice(id, delay) {
      if (this.muted) return;
      const go = () => {
        if (this.muted) return;
        this.stopVoice();
        const a = new Audio(`voice/${id}.wav`);
        a.volume = 0.95;
        this.current = a;
        a.play().catch(() => {});
      };
      delay ? setTimeout(go, delay) : go();
    },
    stopVoice() { if (this.current) { try { this.current.pause(); } catch (e) { /* ignore */ } this.current = null; } },
    // short burst of filtered noise
    noise(dur, opts = {}) {
      const ctx = this.ctx, len = Math.floor(ctx.sampleRate * dur);
      const b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (opts.flat ? 1 : 1 - i / len);
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      const t0 = ctx.currentTime + (opts.at || 0);
      src.buffer = b;
      f.type = opts.type || 'lowpass';
      f.frequency.setValueAtTime(opts.f || 1000, t0);
      if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
      f.Q.value = opts.q || 1;
      g.gain.setValueAtTime(opts.vol || 0.1, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(t0);
    },
    lastPop: 0,
    tone(freq, dur, opts = {}) {
      const ctx = this.ctx;
      const t0 = ctx.currentTime + (opts.at || 0);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = opts.type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
      g.gain.setValueAtTime(opts.vol || 0.05, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },
    play(name) {
      if (this.muted) return;
      if (!this.ensure()) return;
      const T = (f, d, o) => this.tone(f, d, o);
      switch (name) {
        case 'blip': T(880, 0.06); break;
        case 'click': T(660, 0.04, { vol: 0.04 }); break;
        case 'type': T(1200 + Math.random() * 300, 0.02, { vol: 0.015 }); break;
        case 'error': T(180, 0.16, { type: 'sawtooth' }); T(140, 0.22, { type: 'sawtooth', at: 0.15 }); break;
        case 'faint': T(520, 0.5, { to: 90, type: 'triangle', vol: 0.08 }); break;
        case 'hit': T(1400, 0.08, { to: 500 }); break;
        case 'pew': T(900, 0.07, { to: 200, vol: 0.03 }); break;
        case 'quack': // sawtooth through a sweeping band-pass = a "wah" quack
          [0, 0.13].forEach(at => {
            const ctx = this.ctx, t0 = ctx.currentTime + at;
            const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
            o.type = 'sawtooth'; o.frequency.setValueAtTime(330, t0); o.frequency.exponentialRampToValueAtTime(220, t0 + 0.11);
            f.type = 'bandpass'; f.Q.value = 6; f.frequency.setValueAtTime(1500, t0); f.frequency.exponentialRampToValueAtTime(700, t0 + 0.11);
            g.gain.setValueAtTime(0.12, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
            o.connect(f).connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + 0.14);
          });
          break;
        case 'whoosh': this.noise(0.45, { type: 'bandpass', f: 300, to: 3000, q: 1.5, vol: 0.16 }); break;
        case 'ring': // phone ring: two tones, warbling
          for (let i = 0; i < 16; i++) { T(440, 0.05, { at: i * 0.06, type: 'sine', vol: 0.04 }); T(480, 0.05, { at: i * 0.06, type: 'sine', vol: 0.04 }); }
          break;
        case 'hangup': [0, 0.28, 0.56].forEach(at => T(480, 0.18, { at, type: 'sine', vol: 0.06 })); break;
        case 'static': this.noise(0.9, { type: 'highpass', f: 800, vol: 0.09, flat: true }); break;
        case 'sparkle': [1568, 2093, 2637, 3136, 4186].forEach((f, i) => T(f, 0.09, { at: i * 0.05, type: 'triangle', vol: 0.04 })); break;
        case 'stamp': this.noise(0.12, { f: 260, vol: 0.35 }); T(90, 0.12, { type: 'sine', vol: 0.12 }); break;
        case 'pop': {
          const now = performance.now();
          if (now - this.lastPop < 90) break; // don't machine-gun
          this.lastPop = now;
          T(500 + Math.random() * 500, 0.07, { to: 1400 + Math.random() * 600, type: 'sine', vol: 0.05 });
          break;
        }
        case 'glitch': for (let i = 0; i < 7; i++) T(80 + Math.random() * 1600, 0.04, { at: i * 0.045, type: 'square', vol: 0.04 }); this.noise(0.3, { type: 'highpass', f: 2000, vol: 0.05, flat: true }); break;
        case 'thud': T(120, 0.2, { to: 40, type: 'sine', vol: 0.2 }); break;
        case 'ok': T(660, 0.07); T(990, 0.1, { at: 0.07 }); break;
        case 'puff': this.noise(0.3, { f: 1400, to: 300, vol: 0.18 }); break;
        case 'win': [523, 659, 784, 1047].forEach((f, i) => T(f, 0.12, { at: i * 0.09 })); break;
        case 'jingle': // first phrase of the birthday tune, about 2 s
          [[392, 0], [392, .2], [440, .4], [392, .75], [523, 1.1], [494, 1.45]].forEach(([f, a]) => T(f, 0.3, { at: a, type: 'triangle', vol: 0.09 }));
          break;
      }
    },
  };

  // ---------- helpers ----------
  const el = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const kinetic = text => [...text].map((ch, i) =>
    ch === ' ' ? '<span class="sp"> </span>' : `<span style="--i:${i}">${ch}</span>`).join('');
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[Math.floor(Math.random() * a.length)];

  const spriteCache = {};
  function sprite(name) {
    if (spriteCache[name]) return spriteCache[name];
    const rows = (window.SPRITES || {})[name];
    if (!rows) return '';
    const w = Math.max(...rows.map(r => r.length));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = rows.length;
    const g = cv.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const col = window.PALETTE[ch];
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }));
    return (spriteCache[name] = cv.toDataURL());
  }

  function toast(msg, kind) {
    let box = document.getElementById('toasts');
    if (!box) { box = el('<div id="toasts" aria-live="polite"></div>'); document.body.appendChild(box); }
    const t = el(`<div class="toast ${kind || ''}"></div>`);
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3000);
  }

  // Per-page context: timers and listeners that die with the page.
  function makeCtx() {
    const timers = new Set();
    const cleanups = [];
    const ctx = {
      alive: true,
      timeout(fn, ms) {
        const id = setTimeout(() => { timers.delete(id); if (ctx.alive) fn(); }, ms);
        timers.add(id); return id;
      },
      interval(fn, ms) { const id = setInterval(() => { if (ctx.alive) fn(); }, ms); timers.add(id); return id; },
      wait(ms) { return new Promise(res => ctx.timeout(res, ms)); },
      loop(fn) {
        let last = performance.now();
        const step = now => { if (!ctx.alive) return; fn((now - last) / 1000, now); last = now; requestAnimationFrame(step); };
        requestAnimationFrame(step);
      },
      on(target, ev, fn, opts) { target.addEventListener(ev, fn, opts); cleanups.push(() => target.removeEventListener(ev, fn, opts)); },
      cleanup(fn) { cleanups.push(fn); },
      destroy() {
        ctx.alive = false;
        timers.forEach(id => { clearTimeout(id); clearInterval(id); });
        cleanups.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
      },
    };
    return ctx;
  }

  // ---------- router ----------
  const PAGES = [
    ['boot', 'Boot screen'], ['captcha', 'CAPTCHA'], ['terms', 'Terms & conditions'],
    ['aim', 'Aim trainer'], ['quiz', 'Quest board'], ['nav', 'Navigator'],
    ['mbti', 'MBTI test'], ['caveman', 'Caveman translator'], ['coupons', 'Coupon book'],
    ['final', 'Final call'],
  ];
  const ids = PAGES.map(p => p[0]);

  const Site = {
    bus, store: Store, clock: Clock, countdown: Countdown, progress: Progress, sound: Sound,
    el, kinetic, shuffle, pick, sprite, toast, pages: {}, PAGES,
    current: null, ctx: null, busy: false,
    demo: params.get('demo'),
    register(id, def) { this.pages[id] = def; },
    header(kicker, title) {
      return `<header class="page-head"><div class="kicker">${kicker}</div><h1 class="kt">${kinetic(title)}</h1></header>`;
    },
    go(id, opts = {}) {
      if (this.busy) return;
      if (!ids.includes(id) && id !== 'secret') id = 'boot';
      const swap = () => {
        if (this.ctx) this.ctx.destroy();
        const stage = document.getElementById('stage');
        stage.innerHTML = '';
        document.body.dataset.page = id;
        this.current = id;
        Store.set('page', id);
        Visited.add(id);
        this.ctx = makeCtx();
        window.scrollTo(0, 0);
        (this.pages[id] || placeholder(id)).mount(stage, this.ctx);
        // already beaten this page before? offer a way past it (no redoing everything)
        const i = ids.indexOf(id);
        if (Done.get().includes(id) && i >= 0 && i < ids.length - 1) {
          const banner = el(`<div class="cleared"><span>&#10003; Already cleared. Play again, or</span> <button class="btn sm" type="button">Skip ahead &gt;</button></div>`);
          banner.querySelector('button').onclick = () => Site.go(ids[i + 1]);
          stage.prepend(banner);
        }
        bus.emit('page', id);
      };
      Sound.stopVoice();
      if (opts.instant) return swap();
      Sound.play('whoosh');
      this.busy = true;
      const w = document.getElementById('wipe');
      w.className = 'in';
      setTimeout(() => { swap(); w.className = 'out'; }, 420);
      setTimeout(() => { w.className = ''; this.busy = false; }, 860);
    },
    next() { this.go(ids[Math.min(ids.indexOf(this.current) + 1, ids.length - 1)]); },
    // the secret needs BOTH: every page tried, and the birthday candles blown
    // (which can only happen at/after midnight), so there's no skipping ahead
    secretReady() { return Progress.complete() && !!Store.get('blown', false); },
    markDone(id) { Done.add(id); const n = ids[ids.indexOf(id) + 1]; if (n) Visited.add(n); }, // also unlocks the next page in the pager
    // glitchy cut instead of the comic wipe (used for the secret)
    glitchTo(id) {
      if (this.busy) return;
      this.busy = true;
      document.body.classList.add('glitching');
      Sound.play('glitch');
      setTimeout(() => { this.busy = false; this.go(id, { instant: true }); }, 650);
      setTimeout(() => document.body.classList.remove('glitching'), 1100);
    },
  };

  // ---------- hidden stars (7 across the pages) ----------
  const STAR_TOTAL = 17;
  const STAR_IDS = ['boot', 'boot2', 'captcha', 'terms', 'terms2', 'aim', 'aim2', 'quiz', 'quiz2', 'nav', 'nav2', 'mbti', 'caveman', 'caveman2', 'coupons', 'final', 'secret'];
  const Stars = {
    found() { return StarList.get(); },
    count() { return this.found().length; },
    // drop a hidden star into a page; `style` positions it inside `parent`
    hide(parent, id, style) {
      if (this.found().includes(id)) return null;
      const b = el(`<button class="hstar" type="button" aria-label="A tiny yellow star" style="${style || ''}"><img src="${sprite('star')}" alt=""></button>`);
      b.addEventListener('pointerdown', e => e.stopPropagation()); // don't count as a shot in the aim trainer
      b.addEventListener('click', e => {
        e.stopPropagation();
        if (this.found().includes(id)) return;
        const list = StarList.add(id);
        Progress.mark('stars');
        Sound.play('sparkle');
        Sound.voice(list.length >= STAR_TOTAL ? 'stars_all' : 'star', 250);
        b.classList.add('got');
        setTimeout(() => b.remove(), 600);
        bus.emit('stars', list.length);
        toast(list.length >= STAR_TOTAL
          ? 'ALL 17 STARS. You absolute old nerd. A golden coupon just appeared in the coupon book.'
          : `Star found! ${list.length}/${STAR_TOTAL}`);
      });
      parent.appendChild(b);
      return b;
    },
    reset() { StarList.clear(); bus.emit('stars', 0); },
    all() { StarList.set(STAR_IDS); Progress.mark('stars'); bus.emit('stars', STAR_TOTAL); },
  };
  Site.stars = Stars;
  Site.STAR_TOTAL = STAR_TOTAL;

  function placeholder(id) {
    const title = (PAGES.find(p => p[0] === id) || [id, id])[1];
    return {
      mount(root) {
        root.innerHTML = `${Site.header('UNDER CONSTRUCTION', title)}
          <div class="win"><div class="win-bar"><span class="dots"><i></i><i></i><i></i></span><span>TODO.TXT</span></div>
          <div class="win-body"><p>This page arrives in stage 2.</p>
          <button class="btn" data-next>NEXT &gt;</button></div></div>`;
        root.querySelector('[data-next]').onclick = () => Site.next();
      },
    };
  }

  // ---------- HUD: corner countdown + sound toggle ----------
  let lastRem = null;
  function buildHud() {
    const hud = document.getElementById('hud');
    hud.innerHTML = `
      <button class="chip snd" type="button" aria-pressed="false" title="Sound on/off"></button>
      <div class="chip cd" role="timer" aria-label="Countdown to the birthday">
        <span class="cd-fake" hidden>FAKE TIME</span>
        <span class="cd-time">--:--:--</span>
        <span class="cd-label">B-DAY SERVER</span>
      </div>
      <div class="chip stars-chip" aria-live="polite" title="Hidden stars found"><img src="${sprite('star')}" alt=""> <span>0/${STAR_TOTAL}</span></div>`;
    // page marker: go back to anything already reached, any time
    const pager = el(`<nav class="pager" aria-label="Pages">
        <button class="chip pg-prev" type="button" aria-label="Previous page">&#9664;</button>
        <button class="chip pg-label" type="button" aria-expanded="false">PAGE 01/10</button>
        <button class="chip pg-next" type="button" aria-label="Next page">&#9654;</button>
        <div class="pg-menu" hidden></div>
      </nav>`);
    document.body.appendChild(pager);
    const pgLabel = pager.querySelector('.pg-label');
    const pgMenu = pager.querySelector('.pg-menu');
    const visited = () => Visited.get();
    const paintPager = () => {
      const i = ids.indexOf(Site.current);
      pgLabel.textContent = i < 0 ? 'PAGE ??/??' : `PAGE ${String(i + 1).padStart(2, '0')}/${ids.length}`;
      pager.querySelector('.pg-prev').disabled = i <= 0 && Site.current !== 'secret';
      pager.querySelector('.pg-next').disabled = i < 0 || i >= ids.length - 1 || !visited().includes(ids[i + 1]);
    };
    const openMenu = open => {
      pgMenu.hidden = !open;
      pgLabel.setAttribute('aria-expanded', String(open));
      if (!open) return;
      const v = visited();
      pgMenu.innerHTML = `<p class="pg-tip">go back anytime. things hide everywhere.</p>` +
        PAGES.map(([id, name], i) => v.includes(id)
          ? `<button type="button" data-go="${id}" class="${id === Site.current ? 'here' : ''}">${String(i + 1).padStart(2, '0')} ${name}</button>`
          : `<span class="locked">${String(i + 1).padStart(2, '0')} ???</span>`).join('') +
        (Store.get('secretSeen', false) ? '<button type="button" data-go="secret" class="secret-link">?? hidden server room</button>' : '');
      Sound.play('click');
    };
    pgLabel.onclick = () => openMenu(pgMenu.hidden);
    pgMenu.addEventListener('click', e => {
      const b = e.target.closest('[data-go]');
      if (!b) return;
      openMenu(false);
      if (b.dataset.go !== Site.current) Site.go(b.dataset.go);
    });
    document.addEventListener('click', e => { if (!pgMenu.hidden && !pager.contains(e.target)) openMenu(false); });
    pager.querySelector('.pg-prev').onclick = () => {
      if (Site.current === 'secret') return Site.go('final');
      const i = ids.indexOf(Site.current);
      if (i > 0) Site.go(ids[i - 1]);
    };
    pager.querySelector('.pg-next').onclick = () => {
      const i = ids.indexOf(Site.current);
      if (i >= 0 && i < ids.length - 1 && visited().includes(ids[i + 1])) Site.go(ids[i + 1]);
    };
    bus.on('page', () => { openMenu(false); paintPager(); });

    const paintStars = () => { hud.querySelector('.stars-chip span').textContent = `${Stars.count()}/${STAR_TOTAL}`; };
    paintStars();
    bus.on('stars', () => {
      paintStars();
      const c = hud.querySelector('.stars-chip');
      c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    });
    const snd = hud.querySelector('.snd');
    const paintSnd = () => {
      snd.textContent = Sound.muted ? 'SND: OFF' : 'SND: ON';
      snd.setAttribute('aria-pressed', String(!Sound.muted));
    };
    paintSnd();
    snd.onclick = () => Sound.setMuted(!Sound.muted);
    hud.querySelector('.cd').onclick = () => { if (Countdown.remaining() <= 0) celebrate(); }; // replay the cake
    bus.on('sound', paintSnd);
    bus.on('clock', () => {
      lastRem = null;
      tick();
      // time jumped past midnight (debug menu, or the real-time check): the
      // candles still haven't been blown, so the cake shows up right away
      if (Countdown.remaining() <= 0 && !Store.get('blown', false)) setTimeout(celebrate, 400);
    });
    setInterval(tick, 250);
    tick();
  }

  function tick() {
    const rem = Countdown.remaining();
    const done = rem <= 0;
    const cd = document.querySelector('#hud .cd');
    if (cd) {
      cd.querySelector('.cd-time').textContent = done ? 'UNLOCKED' : Countdown.fmt(rem);
      cd.querySelector('.cd-label').textContent = done ? 'HAPPY B-DAY' : 'B-DAY SERVER';
      cd.querySelector('.cd-fake').hidden = !DEBUG || Clock.offset === 0;
      cd.classList.toggle('hot', !done && rem < 3600e3);
      cd.classList.toggle('done', done);
    }
    if (lastRem !== null && lastRem > 0 && done) celebrate();
    lastRem = rem;
    bus.emit('tick', rem);
  }

  // ---------- nickname storm: stickers popping up all over a layer ----------
  // Images are pre-rendered (the Japanese fonts may only ship as images);
  // text ones use the web fonts.
  const NICKS = [
    { img: 'img/nick-arkie.png', h: 66 },
    { img: 'img/nick-infj.png', h: 56 },
    { img: 'img/nick-overthinker.png', h: 54 },
    { img: 'img/nick-scientist.png', h: 54 },
    { img: 'img/nick-mhgod.png', h: 48 },
    { img: 'img/nick-omedetou.png', h: 60 },
    { img: 'img/nick-hbd.png', h: 52 },
    { text: 'MONSTER HUNTER GOD', c: '#ff7a1a', h: 44 },
    { text: 'ARKIE', c: '#ffd21f', h: 64 },
    { text: 'INFJ CUTIE', c: '#ff4fa0', h: 42, hand: true },
    { text: 'MR OVERTHINKER', c: '#3fe0ff', h: 40, hand: true },
    { text: 'NERDY SCIENTIST', c: '#b6f23a', h: 44 },
  ];
  const BURSTS = ['#ff4fa0', '#3fe0ff', '#e8202f', '#fff7e0', '#b6f23a'];
  function nickStorm(layer, opts = {}) {
    const narrow = innerWidth < 600;
    const max = opts.max || (narrow ? 14 : 28);
    const every = opts.every || (narrow ? 230 : 150);
    const shrink = Math.min(1, Math.max(.45, innerWidth / 1100));
    const live = [];
    let bag = [];
    const spawn = () => {
      if (!bag.length) bag = shuffle(NICKS.slice());
      const n = bag.pop();
      let x, y, tries = 0;
      do { x = 4 + Math.random() * 92; y = 6 + Math.random() * 88; tries++; }
      while (tries < 8 && x > 22 && x < 78 && y > 30 && y < 72); // keep the headline readable
      const node = el(n.img
        ? `<div class="nick"><img src="${n.img}" alt=""></div>`
        : `<div class="nick txt${n.hand ? ' hand' : ''}"></div>`);
      if (n.text) node.textContent = n.text;
      if (Math.random() < .3) { node.classList.add('burst'); node.style.setProperty('--burst', pick(BURSTS)); }
      node.style.left = x + '%';
      node.style.top = y + '%';
      node.style.setProperty('--r', (Math.random() * 36 - 18).toFixed(1) + 'deg');
      node.style.setProperty('--s', (.75 + Math.random() * .5).toFixed(2));
      node.style.setProperty('--h', Math.round(n.h * shrink) + 'px');
      if (n.c) node.style.setProperty('--c', n.c);
      layer.appendChild(node);
      if (!opts.quiet) Sound.play('pop');
      live.push(node);
      if (live.length > max) {
        const old = live.shift();
        old.classList.add('out');
        setTimeout(() => old.remove(), 400);
      }
    };
    for (let i = 0; i < (opts.burst || 6); i++) spawn();
    const id = setInterval(spawn, every);
    return () => clearInterval(id);
  }

  // ---------- celebration: blow out the candles, then HAPPY BIRTHDAY ----------
  // Candles go out by blowing into the mic (opt-in) or tapping/clicking each
  // flame (always works, also by keyboard). One trick candle relights once.
  const CANDLES = 5;
  function celebrate(opts = {}) {
    if (document.querySelector('.celebrate')) return;
    const ov = el(`<div class="celebrate cake-phase" role="dialog" aria-label="Happy birthday">
        <div class="nick-layer"></div>
        <canvas class="confetti"></canvas>
        <div class="cel-inner">
          <div class="wish">
            <h1 class="cel-text kt"><span class="line">${kinetic('MAKE A WISH,')}</span><span class="line mid">${kinetic('ARK')}</span></h1>
            <div class="cake">
              <div class="candles">${Array.from({ length: CANDLES }, (_, i) =>
                `<button class="candle" type="button" aria-label="Blow out candle ${i + 1}"><i class="flame"></i></button>`).join('')}</div>
              <div class="tier top"></div>
              <div class="tier bottom"></div>
              <div class="plate"></div>
            </div>
            <p class="wish-hint" aria-live="polite">Blow into your mic, or swipe across the flames like a big gust of wind.</p>
            <div class="wish-ctrl">
              <button class="btn" type="button" data-mic>Blow with mic</button>
              <span class="mic-meter" hidden><i></i></span>
            </div>
          </div>
          <div class="hbd" hidden>
            <h1 class="cel-text kt"><span class="line">${kinetic('HAPPY BIRTHDAY,')}</span><span class="line big">${kinetic('ARK')}</span></h1>
            <button class="btn red" type="button" data-close>[ CONTINUE ]</button>
          </div>
        </div>
      </div>`);
    document.body.appendChild(ov);
    Sound.play('ok');
    if (!opts.noCake && Site.demo !== 'hbd') Sound.voice('cake_wish', 500);

    const hint = ov.querySelector('.wish-hint');
    const candles = [...ov.querySelectorAll('.candle')];
    let trickDone = false, finished = false, mic = null;

    function blowOut(c) {
      if (finished || c.classList.contains('out')) return;
      c.classList.add('out');
      Sound.play('puff');
      if (candles.some(x => !x.classList.contains('out'))) return;
      if (!trickDone) { // the rig: one trick candle
        trickDone = true;
        setTimeout(() => {
          if (finished) return;
          const t = pick(candles);
          t.classList.remove('out');
          t.classList.add('relit');
          hint.textContent = 'Trick candle. Classic. One more blow!';
          Sound.play('error');
          Sound.voice('k_trick');
        }, 800);
        return;
      }
      finish();
    }
    candles.forEach(c => { c.onclick = () => blowOut(c); });

    // no mic? swipe across the flames fast, like a gust of wind
    const cake = ov.querySelector('.cake');
    const gust = new Map();
    let lastP = null;
    cake.addEventListener('pointermove', e => {
      if (finished) return;
      const now = performance.now();
      if (lastP) {
        const speed = Math.hypot(e.clientX - lastP.x, e.clientY - lastP.y) / Math.max(1, now - lastP.t); // px per ms
        candles.forEach(c => {
          if (c.classList.contains('out')) return;
          const f = c.querySelector('.flame').getBoundingClientRect();
          const cx = f.left + f.width / 2, cy = f.top + f.height / 2;
          const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
          if (dist > 80) return;
          c.style.setProperty('--lean', (Math.max(-1, Math.min(1, (cx - e.clientX) / 50)) * Math.min(1, speed + 0.3)).toFixed(2));
          if (speed > 0.5) {
            const g = (gust.get(c) || 0) + speed * (1 - dist / 80);
            gust.set(c, g);
            if (g > 2) blowOut(c);
          }
        });
      }
      lastP = { x: e.clientX, y: e.clientY, t: now };
    });
    const calm = () => { lastP = null; candles.forEach(c => c.style.removeProperty('--lean')); };
    cake.addEventListener('pointerleave', calm);
    cake.addEventListener('pointerup', calm);

    // mic: loudness above the room's noise floor counts as blowing
    ov.querySelector('[data-mic]').onclick = async e => {
      const btn = e.currentTarget;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AC = window.AudioContext || window.webkitAudioContext;
        const ctx = new AC();
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(an);
        const buf = new Float32Array(an.fftSize);
        mic = { stream, ctx };
        btn.hidden = true;
        const meter = ov.querySelector('.mic-meter');
        meter.hidden = false;
        hint.textContent = 'Listening... now blow!';
        const t0 = performance.now();
        let floor = 0.02, blowMs = 0, last = t0;
        const loop = now => {
          if (!mic) return;
          an.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          if (now - t0 < 600) floor = Math.max(floor, rms); // learn the room
          const thr = Math.max(0.1, floor * 3);
          const lvl = Math.min(1, rms / (thr * 1.6));
          ov.style.setProperty('--blow', lvl.toFixed(2));
          meter.style.setProperty('--lvl', Math.round(lvl * 100) + '%');
          if (rms > thr) {
            blowMs += now - last;
            if (blowMs > 260) {
              blowMs = 0;
              const lit = candles.filter(c => !c.classList.contains('out'));
              if (lit.length) blowOut(pick(lit));
            }
          } else blowMs = Math.max(0, blowMs - (now - last) / 2);
          last = now;
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      } catch (err) {
        btn.hidden = true;
        hint.textContent = 'The mic said no. Tap the flames instead!';
      }
    };
    const stopMic = () => {
      if (!mic) return;
      mic.stream.getTracks().forEach(t => t.stop());
      try { mic.ctx.close(); } catch (e) { /* ignore */ }
      mic = null;
      ov.style.setProperty('--blow', 0);
    };

    function finish() {
      finished = true;
      stopMic();
      Store.set('blown', true);
      setTimeout(() => {
        ov.classList.remove('cake-phase');
        ov.classList.add('boom');
        ov.querySelector('.wish').hidden = true;
        ov.querySelector('.hbd').hidden = false;
        Sound.play('jingle');
        party();
      }, 700);
    }

    let alive = true, stopStorm = () => {}, resize = () => {};
    function party() {
    Sound.voice('hbd', 300);
    Sound.voice('jp_hbd', 2100);
    const cv = ov.querySelector('canvas');
    const g = cv.getContext('2d');
    const colors = ['#ffd23f', '#e63946', '#161412', '#fffdf5', '#fff3b0'];
    let bits = [];
    resize = () => { cv.width = innerWidth; cv.height = innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const frame = now => {
      if (!alive) return;
      if (now - start < 5000 && bits.length < (reduce ? 60 : 260)) {
        for (let i = 0; i < 6; i++) bits.push({
          x: Math.random() * cv.width, y: -10, vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 3,
          s: 6 + Math.floor(Math.random() * 3) * 4, c: pick(colors), r: Math.random() * 6,
        });
      }
      g.clearRect(0, 0, cv.width, cv.height);
      bits.forEach(b => {
        b.x += b.vx; b.y += b.vy; b.vy += 0.04; b.r += 0.1;
        g.fillStyle = b.c;
        const w = Math.abs(Math.cos(b.r)) * b.s + 2;
        g.fillRect(Math.round(b.x), Math.round(b.y), Math.round(w), b.s);
      });
      bits = bits.filter(b => b.y < cv.height + 20);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    setTimeout(() => { if (alive) stopStorm = nickStorm(ov.querySelector('.nick-layer')); }, 700);
    ov.querySelector('[data-close]').focus();
    }

    ov.querySelector('[data-close]').onclick = () => {
      alive = false; stopStorm(); stopMic();
      window.removeEventListener('resize', resize); ov.remove();
      // candles out + everything tried = the secret opens right now
      if (Site.secretReady() && !Store.get('secretSeen', false) && Site.current !== 'secret') setTimeout(() => Site.glitchTo('secret'), 600);
    };
    if (Site.demo === 'hbd' || opts.noCake) { trickDone = true; candles.forEach(c => c.classList.add('out')); finished = true; Store.set('blown', true);
      ov.classList.remove('cake-phase'); ov.querySelector('.wish').hidden = true; ov.querySelector('.hbd').hidden = false; Sound.play('jingle'); party(); }
  }

  // ---------- debug menu (Shift+D) ----------
  function toLocalInput(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  function openDebug() {
    const old = document.querySelector('.debug');
    if (old) { old.remove(); return; }
    const d = el(`<div class="debug" role="dialog" aria-label="Debug menu"><div class="win">
      <div class="win-bar"><span class="dots"><i></i><i></i><i></i></span><span>DEBUG (SHIFT+D)</span></div>
      <div class="win-body">
        <h3>Jump to page</h3>
        <div class="dbg-grid">${PAGES.map((p, i) => `<button class="btn sm" data-go="${p[0]}">${i + 1}. ${p[1]}</button>`).join('')}</div>
        <h3>Fake current time</h3>
        <p class="dbg-now"></p>
        <div class="dbg-grid">
          <button class="btn sm" data-t="-10">10 s to midnight</button>
          <button class="btn sm" data-t="-3590">59:50 to midnight</button>
          <button class="btn sm" data-t="+60">After midnight</button>
          <button class="btn sm" data-t="s-10">10 s to secret (10:00)</button>
          <button class="btn sm" data-t="s+60">After secret target</button>
          <button class="btn sm red" data-t="real">Real time</button>
        </div>
        <div class="dbg-row"><input type="datetime-local" step="1" class="dbg-dt"><button class="btn sm" data-set>Set</button></div>
        <h3>Secret progress</h3>
        <p class="dbg-prog"></p>
        <div class="dbg-grid">
          <button class="btn sm" data-prog="all">Mark all pages tried</button>
          <button class="btn sm" data-prog="reset">Reset progress</button>
          <button class="btn sm" data-celebrate>Preview celebration</button>
          <button class="btn sm" data-go="secret">Secret screen</button>
          <button class="btn sm" data-stars="all">Find all stars</button>
          <button class="btn sm" data-stars="reset">Reset stars</button>
          <button class="btn sm" data-candles>Un-blow candles</button>
          <button class="btn sm red" data-wipe>Clear all saved data</button>
        </div>
        <button class="btn" data-close>Close</button>
      </div></div></div>`);
    document.body.appendChild(d);
    const paint = () => {
      d.querySelector('.dbg-now').textContent = `Site time: ${new Date(Clock.now()).toLocaleString()}${Clock.offset ? ' (fake)' : ' (real)'} · midnight in ${Countdown.fmt(Countdown.remaining())}`;
      d.querySelector('.dbg-prog').textContent = `Tried: ${Progress.count()}/10 (${Object.keys(Progress.all()).join(', ') || 'none'}) · stars ${Stars.count()}/${STAR_TOTAL} · secret seen: ${Store.get('secretSeen', false) ? 'yes' : 'no'}`;
    };
    paint();
    const iv = setInterval(() => { if (!document.body.contains(d)) return clearInterval(iv); paint(); }, 500);
    d.querySelector('.dbg-dt').value = toLocalInput(Clock.now());
    d.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) { if (e.target === d) d.remove(); return; }
      if (b.dataset.go) { d.remove(); Site.go(b.dataset.go); }
      else if (b.dataset.t) { b.dataset.t === 'real' ? Clock.reset() : Clock.set(Clock.parse(b.dataset.t)); paint(); }
      else if (b.hasAttribute('data-set')) { const ms = Clock.parse(d.querySelector('.dbg-dt').value); if (ms !== null) Clock.set(ms); paint(); }
      else if (b.dataset.prog) { b.dataset.prog === 'all' ? Progress.markAll() : Progress.reset(); paint(); }
      else if (b.hasAttribute('data-celebrate')) { d.remove(); celebrate(); }
      else if (b.dataset.stars) { b.dataset.stars === 'all' ? Stars.all() : Stars.reset(); paint(); }
      else if (b.hasAttribute('data-candles')) { Store.del('blown'); Site.toast('Candles relit.'); }
      else if (b.hasAttribute('data-wipe')) { Store.clearAll(); Clock.reset(); location.reload(); }
      else if (b.hasAttribute('data-close')) d.remove();
    });
  }

  // ---------- boot ----------
  function start() {
    buildHud();
    // Browsers keep audio asleep until the visitor interacts. Any tap or key
    // wakes it (again), so timer-driven sounds (the midnight cake, voice
    // lines) aren't silently stuck in a suspended audio context.
    const wake = () => { if (!Sound.muted) Sound.ensure(); };
    ['pointerdown', 'keydown', 'touchend'].forEach(ev => document.addEventListener(ev, wake, true));
    // the secret: once every page has been tried, glitch over to it (once)
    bus.on('progress', () => {
      if (!Site.secretReady() || Store.get('secretSeen', false) || Site.current === 'secret') return;
      setTimeout(() => {
        if (document.querySelector('.celebrate')) return; // wait until he's done celebrating
        Site.glitchTo('secret');
      }, 1400);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { const dbg = document.querySelector('.debug'); if (dbg) dbg.remove(); }
      if (!C.DEBUG_MENU) return;
      const typing = e.target.closest && e.target.closest('input, textarea, [contenteditable="true"]');
      if (e.shiftKey && (e.key === 'D' || e.key === 'd') && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault(); openDebug();
      }
    });
    const first = params.get('page') || Store.get('page', 'boot');
    Site.go(first, { instant: true });
    if (Site.demo === 'celebrate' || Site.demo === 'hbd') celebrate();
    // opened after midnight and the candles haven't been blown yet: cake first
    // (only after the real time has been checked, so a moved clock can't trigger it)
    syncTime().then(() => {
      if (Countdown.remaining() <= 0 && !Store.get('blown', false)) setTimeout(celebrate, 500);
    });
    if (params.get('still')) document.documentElement.classList.add('still'); // screenshots only
    if (params.get('snd')) Sound.setMuted(false); // testing only

  }

  Site.start = start;
  Site.celebrate = celebrate;
  Site.nickStorm = nickStorm;
  window.Site = Site;
})();
