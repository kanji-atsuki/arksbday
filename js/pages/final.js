/* 11. Final: a call that never connects, hold music, the call drops, then the
   glitchy message with the nicknames and the big countdown to midnight.
   The countdown does one fake-out (jumps back 10 s for a moment) but always
   shows the true time again before zero. After midnight it shows the
   birthday state instead. A faint "??" hints at the secret. */
Site.register('final', {
  mount(root, ctx) {
    const S = Site.sound;
    const P = Site.progress;
    const seen = Site.store.get('callSeen', false);

    root.innerHTML = `
      <section class="call">
        <div class="phone">
          <p class="call-status">calling ARK...</p>
          <div class="avatar"><span class="ring"></span><span class="ring r2"></span><span class="ring r3"></span><img src="${Site.sprite('kanji')}" alt=""></div>
          <p class="call-name">KANJI</p>
          <p class="call-sub">connecting... stay on the line</p>
          <p class="call-time">00:00</p>
          <div class="call-btns">
            <button class="cb" data-mute aria-label="Mute">MUTE</button>
            <button class="cb end" data-end aria-label="End call">END</button>
            <button class="cb" data-spk aria-label="Speaker">SPKR</button>
          </div>
          ${seen ? '<button class="skip-call" data-skip>skip the call &gt;</button>' : ''}
        </div>
      </section>`;

    // star: on the phone, only while the call is ringing
    Site.stars.hide(root.querySelector('.phone'), 'final', 'right:26px;top:26px;width:14px;height:14px;');
    const status = root.querySelector('.call-status');
    const sub = root.querySelector('.call-sub');
    const timeEl = root.querySelector('.call-time');
    let secs = 0, dropped = false;

    ctx.interval(() => { if (!dropped) { secs++; timeEl.textContent = `00:${String(secs).padStart(2, '0')}`; } }, 1000);
    const HOLD = ['connecting... stay on the line', 'your call is very important to us', 'please continue to hold', 'estimated wait time: one (1) birthday', 'stay on the line...'];
    HOLD.forEach((t, i) => ctx.timeout(() => { if (!dropped) sub.textContent = t; }, 1800 + i * 1600));
    ctx.timeout(() => { if (!dropped) status.textContent = 'ringing...'; }, 1400);
    // ring ring, then the hold message
    [200, 2200].forEach(t => ctx.timeout(() => { if (!dropped) S.play('ring'); }, t));
    ctx.timeout(() => { if (!dropped) S.voice('call_hold'); }, 4300);

    // hold music: a little looping tune, only when sound is on
    const TUNE = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 988, 784, 659, 587];
    let n = 0;
    ctx.interval(() => {
      if (dropped || secs < 4 || S.muted || !S.ensure()) return;
      S.tone(TUNE[n % TUNE.length], 0.22, { type: 'triangle', vol: 0.035 });
      if (n % 4 === 0) S.tone(TUNE[n % TUNE.length] / 2, 0.4, { type: 'sine', vol: 0.03 });
      n++;
    }, 260);

    root.querySelector('[data-end]').onclick = () => Site.toast("You can't hang up on your own birthday.");
    root.querySelector('[data-mute]').onclick = () => Site.toast('Muted. (It was already quiet in here.)');
    root.querySelector('[data-spk]').onclick = () => Site.toast('Speaker on. Nobody is talking yet.');
    const skip = root.querySelector('[data-skip]');
    if (skip) skip.onclick = () => drop(true);

    ctx.timeout(() => drop(false), 9800);

    function drop(fast) {
      if (dropped) return;
      dropped = true;
      Site.store.set('callSeen', true);
      S.play('static');
      S.play('hangup');
      S.voice('call_drop', 300);
      const st = Site.el('<div class="static"><p>CALL DROPPED</p></div>');
      root.appendChild(st);
      ctx.timeout(() => { st.remove(); message(); }, fast ? 500 : 1900);
    }

    function message() {
      root.innerHTML = `
        <section class="fin">
          <div class="nick-layer"></div>
          <div class="fin-inner">
            <p class="fin-kicker">incoming transmission</p>
            <h1 class="glitchy" data-text="HAPPY BIRTHDAY, ARK">HAPPY BIRTHDAY, ARK</h1>
            <div class="big-cd" role="timer">
              <div class="big-time">--:--:--</div>
              <p class="big-label">until the birthday server unlocks</p>
            </div>
            <div class="fin-after" hidden>
              <p class="big-time done">UNLOCKED</p>
              <p class="big-label">the birthday server is open. it's officially your day.</p>
              <button class="btn red" data-cake>Blow the candles again</button>
            </div>
            <button class="qq" aria-label="??">??</button>
            <div class="levels">
              <p>mess around some more:</p>
              <div class="lv-btns">${Site.PAGES.filter(p => p[0] !== 'final').map(([id, name], i) => `<button class="btn sm ghost" data-go="${id}">${i + 1}. ${name}</button>`).join('')}</div>
            </div>
          </div>
        </section>`;
      S.play('glitch');
      S.voice('hbd', 500);
      S.voice('jp_hbd', 2300);
      const stopStorm = Site.nickStorm(root.querySelector('.nick-layer'), { max: innerWidth < 600 ? 8 : 16, every: 420, burst: 4, quiet: true });
      ctx.cleanup(stopStorm);
      root.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => Site.go(b.dataset.go); });
      root.querySelector('[data-cake]').onclick = () => Site.celebrate();

      // big countdown with one fake-out
      const big = root.querySelector('.big-cd .big-time');
      const cdBox = root.querySelector('.big-cd');
      const after = root.querySelector('.fin-after');
      let fakeDone = false, fakeUntil = 0;
      const paint = rem => {
        if (rem <= 0) { cdBox.hidden = true; after.hidden = false; return; }
        cdBox.hidden = false; after.hidden = true;
        const now = performance.now();
        if (!fakeDone && rem < 14000 && rem > 11000) { fakeDone = true; fakeUntil = now + 1400; S.play('error'); }
        const faking = now < fakeUntil;
        big.textContent = Site.countdown.fmt(faking ? rem + 10000 : rem);
        big.classList.toggle('glitch', faking);
        big.classList.toggle('hot', rem < 3600e3);
      };
      paint(Site.countdown.remaining());
      ctx.cleanup(Site.bus.on('tick', paint));

      // the secret hint
      const qq = root.querySelector('.qq');
      const paintQQ = () => {
        const done = Site.secretReady() || Site.store.get('secretSeen', false);
        qq.textContent = done ? '!!' : '??';
        qq.classList.toggle('ready', done);
        qq.style.setProperty('--vis', done ? 1 : (0.05 + P.count() * 0.075).toFixed(2));
      };
      paintQQ();
      ctx.cleanup(Site.bus.on('progress', paintQQ));
      let pokes = 0;
      qq.onclick = () => {
        // fallback: if saved progress got wiped, 17 pokes open it anyway,
        // but never before the candles are out
        const blown = !!Site.store.get('blown', false);
        if (qq.classList.contains('ready') || (blown && ++pokes >= 17)) Site.glitchTo('secret');
        else { S.play('click'); if (!blown && ++pokes >= 17) { pokes = 0; Site.toast('not yet.'); } }
      };
      if (Site.secretReady() && !Site.store.get('secretSeen', false)) ctx.timeout(() => Site.glitchTo('secret'), 3500);
    }

    if (Site.demo === 'message') drop(true);
  },
});
