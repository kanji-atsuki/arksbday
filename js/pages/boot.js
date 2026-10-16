/* 1. Boot screen: fake server boot, absurd errors, bar sticks at 99%.
   Escape hatch: RETRY / FORCE BOOT buttons appear once it's stuck. */
Site.register('boot', {
  mount(root, ctx) {
    const S = Site.sound;
    root.innerHTML = `
      <div class="win crt">
        <div class="win-bar"><span class="dots"><i></i><i></i><i></i></span><span>BIRTHDAY_SERVER.EXE</span></div>
        <div class="crt-body">
          <div class="boot-banner"><h1>BIRTHDAY SERVER</h1><span class="ver">v17.0</span></div>
          <p class="boot-sub">(c) 2026 Kanji Industries. All rights reversed.</p>
          <div class="boot-log" aria-live="polite"></div>
          <div class="boot-bar-wrap" hidden>
            <div class="boot-status cursor-blink"></div>
            <div class="boot-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="boot-fill"></div></div>
            <div class="boot-pct">0%</div>
          </div>
          <div class="boot-actions row" hidden>
            <button class="btn ghost" data-retry>Retry</button>
            <button class="btn red" data-force>Force boot (not recommended)</button>
          </div>
        </div>
      </div>`;

    const log = root.querySelector('.boot-log');
    const wrap = root.querySelector('.boot-bar-wrap');
    const bar = root.querySelector('.boot-bar');
    const fill = root.querySelector('.boot-fill');
    const pct = root.querySelector('.boot-pct');
    const status = root.querySelector('.boot-status');
    const actions = root.querySelector('.boot-actions');

    const LINES = [
      ['Memory check: 640K of cake', 'OK', 'ok'],
      ['Detecting birthday person', 'ARK (probably)', 'ok'],
      ['Loading candles.sys', 'ERROR', 'fail'],
      ['> Candle count overflowed. Rounding down to "a lot".', '', 'sub'],
      ['Mounting /dev/feelings', 'FAIL', 'fail'],
      ['> Reason: emotional damage (expected)', '', 'sub'],
      ['Checking duck drivers', 'QUACK', 'warn'],
      ["Syncing with Kanji's brain", 'TIMEOUT', 'fail'],
      ['> No signal found. Has never been found.', '', 'sub'],
      ['Compiling surprise', '1 WARNING', 'warn'],
      ['> A surprise is not a surprise if you read this line.', '', 'sub'],
      ['CPU temperature', 'COZY', 'ok'],
      ['Starting Birthday Server', '...', 'warn'],
    ];

    const addLine = ([l, r, k]) => {
      const row = Site.el(k === 'sub'
        ? '<div class="ln sub"><span class="l"></span></div>'
        : `<div class="ln"><span class="l"></span><span class="lead"></span><span class="r ${k}">[ ${r} ]</span></div>`);
      row.querySelector('.l').textContent = l;
      log.appendChild(row);
      S.play(k === 'fail' ? 'error' : 'type');
    };

    let progress = 0;
    const setPct = v => {
      progress = v;
      fill.style.width = v + '%';
      pct.textContent = v + '%';
      bar.setAttribute('aria-valuenow', v);
    };

    const STALLS = [
      'Installing feelings.dll',
      'Reticulating birthday splines',
      'Inflating balloons (by mouth)',
      'Waiting for Ark to blink',
      'Downloading more RAM for the cake',
    ];
    const STUCK = [
      '99%: almost there',
      '99%: still almost there',
      '99%: emotionally 100%',
      '99%: the last 1% is shy',
      '99%: have you tried believing harder',
    ];

    let i = 0;
    const nextLine = () => {
      if (i < LINES.length) { addLine(LINES[i++]); ctx.timeout(nextLine, LINES[i - 1][2] === 'sub' ? 220 : 380); }
      else startBar();
    };
    if (Site.demo === 'stuck') { // screenshot helper (DEBUG_URL only)
      LINES.forEach(addLine);
      i = LINES.length;
      wrap.hidden = false;
      setPct(99);
      pct.classList.add('stuck');
      status.textContent = '99%: emotionally 100%';
      actions.hidden = false;
    } else { ctx.timeout(nextLine, 500); S.voice('boot_start', 300); }

    function startBar() {
      wrap.hidden = false;
      let s = 0;
      status.textContent = STALLS[0];
      const step = () => {
        if (progress >= 99) return stuck();
        const jump = progress < 60 ? 6 + Math.floor(Math.random() * 10) : 2 + Math.floor(Math.random() * 5);
        setPct(Math.min(99, progress + jump));
        if (Math.random() < .35) status.textContent = STALLS[++s % STALLS.length];
        S.play('click');
        ctx.timeout(step, progress > 80 ? 520 : 260 + Math.random() * 260);
      };
      step();
    }

    let k = 0;
    function stuck() {
      pct.classList.add('stuck');
      status.textContent = STUCK[0];
      S.voice('boot_99');
      ctx.timeout(() => S.voice('boot_stuck'), 3600);
      ctx.interval(() => { status.textContent = STUCK[++k % STUCK.length]; }, 1800);
      ctx.timeout(() => { actions.hidden = false; S.play('error'); }, 3200);
    }

    let retries = 0;
    root.querySelector('[data-retry]').onclick = () => {
      Site.progress.mark('boot');
      retries++;
      addLine([['Retrying', 'FAILED SUCCESSFULLY', 'warn'], ['Retrying again', 'NOPE', 'fail'], ['Retrying with feeling', 'STILL NO', 'fail']][Math.min(retries - 1, 2)]);
      setPct(97);
      ctx.timeout(() => setPct(98), 300);
      ctx.timeout(() => setPct(99), 650);
      if (retries === 2) {
        addLine(['> ERROR 0x99: try the other button.', '', 'sub']);
        // star: only shows up in the log for people who retry twice
        Site.stars.hide(log.lastElementChild, 'boot', 'position:relative;display:inline-block;width:14px;height:14px;vertical-align:middle;margin-left:8px;');
      }
    };

    // FORCE BOOT runs away, round and round, until it's past midnight AND the
    // candles are blown. (Retry still works and still hides a star.)
    const force = root.querySelector('[data-force]');
    const body = root.querySelector('.crt-body');
    const quip = Site.el('<p class="force-quip" aria-live="polite"></p>');
    actions.after(quip);
    const canForce = () => !!Site.store.get('blown', false);
    const RUN_QUIPS = [
      'nope.', 'not yet.', 'too early, birthday boy.', 'the server is still asleep.',
      'force boot is scared of you.', 'check the timer in the corner.', 'patience, grasshopper.',
      'nice try.', 'you will never catch it.', "it's doing laps now.", 'stay on the line.',
      'the button has filed a restraining order.', 'come back at midnight.',
    ];
    let runs = 0, lastRun = 0, dodgedTap = false, tamed = false;
    function runForce() {
      const now = performance.now();
      if (now - lastRun < 180) return;
      lastRun = now;
      runs++;
      Site.progress.mark('boot');
      if (!force.classList.contains('runner')) { // pin it where it is, then let it loose on the whole screen
        const br = body.getBoundingClientRect(), fr = force.getBoundingClientRect();
        force.style.left = (fr.left - br.left) + 'px';
        force.style.top = (fr.top - br.top) + 'px';
        force.classList.add('runner');
        body.appendChild(force);
        void force.offsetWidth;
      }
      const maxX = Math.max(8, body.clientWidth - force.offsetWidth - 8);
      const maxY = Math.max(8, body.clientHeight - force.offsetHeight - 8);
      force.style.left = (8 + Math.random() * (maxX - 8)) + 'px';
      force.style.top = (8 + Math.random() * (maxY - 8)) + 'px';
      quip.textContent = RUN_QUIPS[(runs - 1) % RUN_QUIPS.length];
      S.play('quack');
      if (runs === 6 || runs % 15 === 0) Site.toast('FORCE BOOT unlocks when the countdown in the corner hits zero. Stay on the line.');
    }
    ctx.on(body, 'pointermove', e => {
      if (e.pointerType !== 'mouse' || actions.hidden || canForce()) return;
      const r = force.getBoundingClientRect();
      const d = Math.hypot(Math.max(r.left - e.clientX, 0, e.clientX - r.right), Math.max(r.top - e.clientY, 0, e.clientY - r.bottom));
      if (d < 50) runForce();
    });
    force.addEventListener('pointerdown', e => { // phones: the tap never lands
      if (e.pointerType === 'mouse' || canForce()) return;
      e.preventDefault();
      dodgedTap = true;
      runForce();
    });
    ctx.cleanup(Site.bus.on('tick', () => {
      if (tamed || !canForce()) return;
      tamed = true;
      force.classList.add('tame');
      if (runs) quip.textContent = 'okay okay. NOW you can force boot. happy birthday.';
    }));

    force.onclick = () => {
      if (dodgedTap) { dodgedTap = false; return; }
      if (!canForce()) { runForce(); return; } // a mouse (or the keyboard) somehow reached it
      Site.progress.mark('boot');
      S.play('thud');
      S.voice('boot_force', 200);
      const crt = root.querySelector('.crt');
      crt.classList.add('quake');
      const ov = Site.el('<div class="boot-override">OVERRIDE ACCEPTED.<br>Booting with 99% of a server.<br>Good enough.</div>');
      root.querySelector('.crt-body').appendChild(ov);
      Site.markDone('boot');
      // star: on the red override screen, only for the few seconds it's up
      Site.stars.hide(ov, 'boot2', 'right:16px;bottom:14px;width:13px;height:13px;');
      ctx.timeout(() => Site.next(), S.muted ? 1900 : 4300); // let the voice line finish
    };
  },
});
