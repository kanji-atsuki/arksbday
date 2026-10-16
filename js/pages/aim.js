/* 4. Aim trainer: ducks dodge the crosshair, score sticks at 99/100.
   Escape hatch: the round always ends on a timer and the result screen
   has CONTINUE. */
Site.register('aim', {
  mount(root, ctx) {
    const S = Site.sound;
    const ROUND = 25;
    root.innerHTML = `
      ${Site.header('STEP 04 // CALIBRATION', 'Aim Trainer')}
      <div class="win">
        <div class="aim-hud">
          <span class="sc">SCORE <b>0</b>/100</span>
          <span class="tm">TIME <b>${ROUND}</b></span>
          <span class="sh">SHOTS <b>0</b></span>
        </div>
        <div class="arena">
          <img class="cloud" src="${Site.sprite('cloud')}" style="top:10%;animation-delay:-6s" alt="">
          <img class="cloud" src="${Site.sprite('cloud')}" style="top:28%;width:80px;animation-delay:-19s;animation-duration:36s" alt="">
          <div class="ground"></div>
          <div class="crosshair" hidden></div>
          <div class="aim-start">
            <div>
              <p>Hit the ducks. Get 100 points. Become legend.<br><small>(The ducks have not agreed to this.)</small></p>
              <button class="btn red" data-start>Start</button>
            </div>
          </div>
        </div>
      </div>`;

    const arena = root.querySelector('.arena');
    const cross = root.querySelector('.crosshair');
    const scEl = root.querySelector('.sc b');
    const tmEl = root.querySelector('.tm b');
    const shEl = root.querySelector('.sh b');
    const NOPE = ['nope', 'quack no', 'too slow', 'skill issue', 'lol', 'missed me', 'not today'];
    const LAST = ['99 is basically 100', 'the last point is shy', 'close enough', 'nice try', 'certified 99'];

    let score = 0, shots = 0, hits = 0, time = ROUND, live = false, targets = [];

    const rand = (a, b) => a + Math.random() * (b - a);
    const spot = (avoidX, avoidY) => {
      let x, y, tries = 0;
      do { x = rand(10, 90); y = rand(12, 70); tries++; }
      while (avoidX !== undefined && tries < 20 && Math.hypot(x - avoidX, y - avoidY) < 30);
      return [x, y];
    };

    function makeTarget() {
      const t = { el: Site.el(`<div class="target"><img src="${Site.sprite('duck')}" alt=""></div>`), rolled: false, x: 0, y: 0 };
      arena.appendChild(t.el);
      move(t, ...spot());
      return t;
    }
    function move(t, x, y, slow) {
      t.el.classList.toggle('wander', !!slow);
      t.el.classList.toggle('left', x < t.x);
      t.x = x; t.y = y;
      t.el.style.left = x + '%';
      t.el.style.top = y + '%';
    }
    function bubble(x, y, text, cls) {
      const b = Site.el(`<div class="${cls || 'bubble'}"></div>`);
      b.textContent = text;
      b.style.left = x + '%';
      b.style.top = y + '%';
      arena.appendChild(b);
      ctx.timeout(() => b.remove(), 950);
    }
    function dodge(t, px, py) {
      bubble(t.x, t.y - 6, score >= 99 ? Site.pick(LAST) : Site.pick(NOPE));
      move(t, ...spot(px, py));
      S.play('quack');
    }
    const dodgeChance = () => score >= 99 ? 1 : Math.max(.22, .62 - hits * .05);
    const pct = e => {
      const r = arena.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100, r];
    };
    const near = (t, e, r, mult) => {
      const tr = t.el.getBoundingClientRect();
      return Math.hypot(e.clientX - (tr.left + tr.width / 2), e.clientY - (tr.top + tr.height / 2)) < tr.width * mult;
    };

    ctx.on(arena, 'pointermove', e => {
      if (!live) return;
      const [x, y, r] = pct(e);
      if (e.pointerType === 'mouse') {
        cross.hidden = false;
        cross.style.left = x + '%';
        cross.style.top = y + '%';
      }
      if (e.pointerType !== 'mouse') return;
      targets.forEach(t => {
        if (near(t, e, r, .95)) {
          if (!t.rolled) { t.rolled = true; if (Math.random() < dodgeChance()) dodge(t, x, y); }
        } else if (!near(t, e, r, 1.5)) t.rolled = false;
      });
    });

    ctx.on(arena, 'pointerdown', e => {
      if (!live) return;
      Site.progress.mark('aim');
      const [x, y, r] = pct(e);
      shots++;
      shEl.textContent = shots;
      S.play('pew');
      if (e.pointerType !== 'mouse') { // show where the tap landed
        cross.hidden = false;
        cross.style.left = x + '%';
        cross.style.top = y + '%';
      }
      const t = targets.find(t => near(t, e, r, .55));
      if (!t) return;
      const touchDodge = e.pointerType !== 'mouse' && Math.random() < .3;
      if (score >= 99 || touchDodge) return dodge(t, x, y);
      hits++;
      const gain = Math.min(99 - score, 8 + Math.floor(Math.random() * 7));
      score += gain;
      scEl.textContent = score;
      bubble(t.x, t.y, '+' + gain, 'score-pop');
      S.play('hit');
      if (score >= 99) root.querySelector('.sc').classList.add('stuck');
      t.el.classList.add('poof');
      ctx.timeout(() => { t.el.classList.remove('poof'); move(t, ...spot(x, y)); t.rolled = false; }, 300);
    });

    function startRound() {
      score = 0; shots = 0; hits = 0; time = ROUND;
      scEl.textContent = '0'; shEl.textContent = '0'; tmEl.textContent = ROUND;
      root.querySelector('.sc').classList.remove('stuck');
      arena.querySelectorAll('.aim-start, .aim-result, .target').forEach(n => n.remove());
      targets = [makeTarget(), makeTarget()];
      live = true;
      S.voice('aim_start');
      arena.classList.add('live');
      // star: zips across the sky once per round, somewhere in the middle of it
      ctx.timeout(() => {
        if (!live) return;
        const s = Site.stars.hide(arena, 'aim', `top:${10 + Math.random() * 35}%;left:-30px;z-index:7;width:20px;height:20px;`);
        if (s) { s.classList.add('fly'); ctx.timeout(() => s.remove(), 2700); }
      }, 6000 + Math.random() * 10000);
      const wanderId = ctx.interval(() => {
        if (!live) return clearInterval(wanderId);
        const t = Site.pick(targets);
        move(t, ...spot(), true);
      }, 1500);
      const clockId = ctx.interval(() => {
        if (!live) return clearInterval(clockId);
        time--;
        tmEl.textContent = time;
        if (time <= 0) { clearInterval(clockId); endRound(); }
      }, 1000);
    }

    function endRound() {
      live = false;
      arena.classList.remove('live');
      arena.querySelectorAll('.aim-start').forEach(n => n.remove());
      cross.hidden = true;
      S.play('win');
      S.voice('aim_result', 500);
      const card = Site.el(`
        <div class="aim-result"><div class="win result-card">
          <div class="win-bar"><span class="dots"><i></i><i></i><i></i></span><span>RESULTS</span></div>
          <div class="win-body">
            <dl>
              <dt>SCORE</dt><dd>${score}/100</dd>
              <dt>SHOTS</dt><dd>${shots}</dd>
              <dt>HITS</dt><dd>${hits}</dd>
              <dt>ACCURACY</dt><dd><span class="stamp">certified quack shot</span></dd>
            </dl>
            <div class="row">
              <button class="btn ghost" data-retry>Retry</button>
              <button class="btn red" data-next>Continue &gt;</button>
            </div>
          </div>
        </div></div>`);
      arena.appendChild(card);
      Site.markDone('aim');
      // star: only on a "perfect" 99 run
      if (score >= 99) Site.stars.hide(card.querySelector('.result-card'), 'aim2', 'right:12px;bottom:12px;width:14px;height:14px;');
      card.querySelector('[data-retry]').onclick = startRound;
      card.querySelector('[data-next]').onclick = () => Site.next();
    }

    root.querySelector('[data-start]').onclick = startRound;
    if (Site.demo === 'result') { score = 99; shots = 31; hits = 11; endRound(); }
  },
});
