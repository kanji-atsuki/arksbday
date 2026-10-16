/* 5. Quest board quiz. Five absurdly easy questions, all rigged.
   Desktop: the mouse getting near the right answer = kicked, faint, answer runs.
   Phone: first tap on the right answer = network error / buttons shift.
   Escape hatches: keyboard (Tab + Enter) always works, the nametag hints at it
   after 4 fails, the second tap always works on phones, and after 9 fails the
   anti-cheat switches itself off. */
Site.register('quiz', {
  mount(root, ctx) {
    const S = Site.sound;
    const QUESTIONS = [
      { q: 'Whose birthday is it?', a: ['Ark', "Kanji's (every day is)", 'The duck from §3', 'Nobody. Go home.'], c: 0 },
      { q: 'What color is the sun in literally every drawing?', a: ['Beige', 'Yellow', 'Plaid', 'Wednesday'], c: 1 },
      { q: 'What do you do with birthday cake?', a: ['File taxes with it', 'Return it to the store', 'Eat it', 'Challenge it to a duel'], c: 2 },
      { q: 'What sound does a duck make?', a: ['Moo', 'Dial-up internet noises', 'Your name, at 3 a.m.', 'Quack'], c: 3 },
      { q: 'Final question. Who is the best hunter on this server?', a: ['KANJI (certified legit)', 'KANJI (definitely)', 'Ark', 'KANJI (#1, check the board)'], c: 2 },
    ];
    const RIGHT = [
      'Wait. How did you... okay. Correct. Lucky.',
      'Again?! Stop that. (Correct.)',
      "I'm reporting you to the guild. (Correct.)",
      'Okay, this is getting embarrassing. For me.',
    ];
    const WRONG = [
      "That's... incorrect. Impressive, honestly.",
      'Bold choice. Wrong, but bold.',
      'The guild has been notified of this answer.',
      'No. But I respect the confidence.',
    ];
    const MOUSE_LINES = [
      '',
      'Connection lost? On MY server? Must be your wifi. Definitely not the anti-cheat.',
      'Fainted again. Have you tried being better at clicking?',
      "Quest failed! Don't worry, I kept your progress. I'm generous like that.",
      '...okay. Off the record? Real hunters have a lag switch.',
      'There is a key in the top-left corner of your keyboard. Nobody ever uses it. Just saying.',
      'The ` key. Under Esc. Press it, then click. You did not hear this from me.',
      "` then click. I'm begging you. I'm running out of fake lag.",
      'For real: tap the ` key (top-left, under Esc), then click the right answer.',
    ];
    const SHIFT_LINES = [
      'Lag spike! The buttons moved. Probably the wind.',
      'Whoops, server hiccup. Everything shifted. Totally random.',
      'The answers reshuffled. Solar flares, probably.',
    ];
    const FAINT_SUBS = ['Carried back to camp by two very small cats.', 'Your hunter needs a nap.', 'Skill issue detected.', 'This is fine.'];
    const SINCERE = "No lag, no tricks, no anti-cheat: I'm really, really glad you were born, Ark.";
    const RIG_OFF_AT = 9;

    root.innerHTML = `
      <section class="mh">
        <div class="board">
          <div class="plaque">QUEST BOARD &middot; BIRTHDAY OUTPOST</div>
          <div class="board-grid">
            <aside class="note quest-note">
              <img class="pin" src="${Site.sprite('pin')}" alt="">
              <h3><span class="stars">&#9733;&#9733;&#9733;</span><br>URGENT QUEST</h3>
              <dl>
                <dt>QUEST</dt><dd>"The Five Questions"</dd>
                <dt>TARGET</dt><dd>5 very easy questions</dd>
                <dt>CLIENT</dt><dd>An extremely honest hunter</dd>
                <dt>REWARD</dt><dd>1&times; birthday</dd>
                <dt>FAILS IF</dt><dd>Hunter faints 3 times</dd>
              </dl>
            </aside>
            <div class="note quest-card">
              <div class="q-head"><span class="q-num">QUESTION 1/5</span><span class="faints" aria-label="Hunter health"></span></div>
              <h2 class="q-text" aria-live="polite"></h2>
              <div class="answers"></div>
            </div>
            <aside class="note scoreboard">
              <img class="pin" src="${Site.sprite('pin')}" alt="">
              <h3>HUNTER RANKINGS</h3>
              <ol class="ranks">
                <li class="me"><span class="pos">#1</span><span class="who">KANJI</span><span class="pts">999,999</span><span class="tag">&#10003; certified legit</span></li>
                <li><span class="pos">#2</span><span class="who">Guest_404</span><span class="pts">1,204</span><span class="tag">probably a bot</span></li>
                <li><span class="pos">#3</span><span class="who">a literal rock</span><span class="pts">312</span><span class="tag">has not moved</span></li>
                <li class="ark"><span class="pos">#4</span><span class="who">ARK</span><span class="pts">99</span><span class="tag">stuck (server issue)</span></li>
              </ol>
            </aside>
          </div>
        </div>
        <div class="dialogue" role="log" aria-live="polite">
          <div class="nametag">KANJI<span class="tag-hint"></span></div>
          <img class="portrait" src="${Site.sprite('kanji')}" alt="">
          <p class="d-text"></p>
          <span class="d-next" aria-hidden="true">&#9660;</span>
        </div>
      </section>`;

    const qText = root.querySelector('.q-text');
    const answers = root.querySelector('.answers');
    const dialogue = root.querySelector('.dialogue');
    const dText = root.querySelector('.d-text');
    const nametag = root.querySelector('.nametag');
    const tagHint = root.querySelector('.tag-hint');
    const arkPts = root.querySelector('.ranks .ark .pts');

    // resume where he left off after a reload
    let qi = Math.min(Site.store.get('quizQ', 0) || 0, QUESTIONS.length - 1), faints = 0, fails = Site.store.get('quizFails', 0) || 0, busy = false, won = false, rigOff = fails >= RIG_OFF_AT;
    let coolUntil = 0, netShown = false, lastPointer = 'mouse', slots = [0, 1, 2, 3];
    const touchRigged = {};

    // ---------- dialogue ----------
    let typeId = null, full = '';
    function say(text, sincere) {
      full = text;
      dText.classList.toggle('sincere', !!sincere);
      clearInterval(typeId);
      let n = 0;
      dText.textContent = '';
      typeId = ctx.interval(() => {
        n++;
        dText.textContent = text.slice(0, n);
        if (n % 3 === 0) S.play('type');
        if (n >= text.length) clearInterval(typeId);
      }, sincere ? 45 : 22);
    }
    dialogue.onclick = () => { clearInterval(typeId); dText.textContent = full; };
    const hint = text => { tagHint.textContent = text; nametag.classList.toggle('hinting', !!text); };

    // ---------- question rendering ----------
    const correctBtn = () => answers.querySelector(`[data-i="${QUESTIONS[qi].c}"]`);
    function applySlots() {
      answers.querySelectorAll('.ans').forEach((b, i) => { b.className = b.className.replace(/\bs\d\b/, 's' + slots[i]); });
    }
    function renderQuestion() {
      const Q = QUESTIONS[qi];
      root.querySelector('.q-num').textContent = `QUESTION ${qi + 1}/${QUESTIONS.length}`;
      qText.textContent = Q.q;
      slots = Site.shuffle([0, 1, 2, 3]);
      answers.innerHTML = Q.a.map((t, i) => `<button class="ans s${slots[i]}" data-i="${i}" data-key="${'ABCD'[i]}"></button>`).join('');
      answers.querySelectorAll('.ans').forEach((b, i) => { b.textContent = Q.a[i]; });
    }
    function paintFaints() {
      const box = root.querySelector('.faints');
      box.innerHTML = 'HP ' + [0, 1, 2].map(i => `<img src="${Site.sprite(i < 3 - faints ? 'heart' : 'heartoff')}" alt="">`).join('');
      box.setAttribute('aria-label', `Hunter health: ${3 - faints} of 3`);
    }

    // ---------- overlay ----------
    let ov = null;
    function overlay(title, sub, cls, spinner) {
      if (!ov) { ov = Site.el('<div class="mh-overlay" role="alert"></div>'); root.appendChild(ov); }
      ov.className = 'mh-overlay ' + (cls || '');
      ov.innerHTML = `<div><p class="ov-title"></p><p class="ov-sub"></p>${spinner ? '<div class="ov-spin"><i></i><i></i><i></i></div>' : ''}</div>`;
      ov.querySelector('.ov-title').textContent = title;
      ov.querySelector('.ov-sub').textContent = sub;
    }
    const closeOverlay = () => { if (ov) { ov.remove(); ov = null; } };

    // ---------- the rig ----------
    function runAway(all) {
      const c = QUESTIONS[qi].c;
      if (all) {
        const before = slots[c];
        do { slots = Site.shuffle([0, 1, 2, 3]); } while (slots[c] === before);
      } else {
        const j = Site.pick([0, 1, 2, 3].filter(i => i !== c));
        [slots[c], slots[j]] = [slots[j], slots[c]];
      }
      applySlots();
      const b = correctBtn();
      b.classList.add('running');
      ctx.timeout(() => b.classList.remove('running'), 1000);
    }

    // kind: 'lost' (mouse got close), 'net' (first phone tap), 'shift' (later phone taps)
    async function kick(kind) {
      busy = true;
      faints++;
      fails++;
      Site.store.set('quizFails', fails);
      Site.progress.mark('quiz');
      if (kind === 'shift') {
        S.play('faint');
        Site.toast(`Lag spike! Hunter fainted ${faints}/3`, 'bad');
      } else {
        S.play('error');
        if (kind === 'net') { netShown = true; overlay('NETWORK ERROR', 'Packet dropped (code 0xQUACK). Reconnecting...', '', true); S.play('static'); }
        else { overlay('CONNECTION LOST.', 'Returning to camp...', '', true); S.voice('quiz_lost', 150); }
        await ctx.wait(S.muted ? 1500 : 2300);
        S.play('faint');
        S.voice('quiz_faint');
        overlay(`YOUR HUNTER FAINTED ${faints}/3`, Site.pick(FAINT_SUBS), 'faint');
        await ctx.wait(1400);
      }
      if (faints >= 3) {
        overlay('QUEST FAILED', 'Returning to the quest board. Progress kept. Dignity not.', 'failed');
        S.voice('quiz_failed');
        await ctx.wait(1700);
        faints = 0;
      }
      closeOverlay();
      runAway(kind !== 'lost');
      paintFaints();
      react(kind);
      coolUntil = performance.now() + 700;
      busy = false;
    }

    function react(kind) {
      if (!rigOff && fails >= RIG_OFF_AT) {
        rigOff = true;
        hint(' · anti-cheat: OFF');
        say("Fine. I unplugged the anti-cheat. Click whatever you want. I'm not crying, you're crying.");
        return;
      }
      if (kind === 'lost') {
        say(MOUSE_LINES[Math.min(fails, MOUSE_LINES.length - 1)]);
        if (fails === 1) S.voice('k_lag', 200);
        if (fails === 5 || fails === 7) S.voice('k_hint', 200);
        hint(fails >= 6 ? ' · press ` (under Esc)' : fails >= 5 ? ' · top-left key' : fails >= 4 ? ' · psst' : '');
      } else {
        say(kind === 'net' ? 'Network error? Weird. Phones, am I right? Try again. If you dare.' : Site.pick(SHIFT_LINES));
        if (fails >= 2) hint(' · psst: 2nd tap works');
      }
    }

    // desktop: the mouse getting near the right answer = kicked
    ctx.on(document, 'pointermove', e => {
      if (e.pointerType !== 'mouse' || busy || won || rigOff || lagOn() || performance.now() < coolUntil) return;
      const b = correctBtn();
      if (!b) return;
      const r = b.getBoundingClientRect();
      const d = Math.hypot(Math.max(r.left - e.clientX, 0, e.clientX - r.right), Math.max(r.top - e.clientY, 0, e.clientY - r.bottom));
      if (d < 30) kick('lost');
    });

    answers.addEventListener('pointerdown', e => { lastPointer = e.pointerType; });
    answers.addEventListener('click', e => {
      const b = e.target.closest('.ans');
      if (!b || busy || won) return;
      const i = Number(b.dataset.i);
      if (i !== QUESTIONS[qi].c) return wrong(b);
      if (rigOff || lagOn() || e.detail === 0) return correct(b); // e.detail 0 = keyboard (Enter/Space)
      if (lastPointer === 'mouse') return kick('lost');
      if (!touchRigged[qi]) { touchRigged[qi] = true; return kick(netShown ? 'shift' : 'net'); }
      correct(b);
    });

    function wrong(b) {
      Site.progress.mark('quiz');
      b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong');
      S.play('error');
      say(qi === QUESTIONS.length - 1 ? 'Flattering. Very accurate. Wrong, though.' : Site.pick(WRONG));
    }

    async function correct(b) {
      busy = true;
      Site.progress.mark('quiz');
      b.classList.add('right');
      S.play('ok');
      if (qi === QUESTIONS.length - 1) return win();
      say(RIGHT[qi]);
      await ctx.wait(1600);
      qi++;
      Site.store.set('quizQ', qi);
      renderQuestion();
      busy = false;
      const first = answers.querySelector('.ans');
      if (e2kb && first) first.focus();
    }
    // keep keyboard players on the answers after each question
    let e2kb = false;
    ctx.on(document, 'keydown', e => { if (e.key === 'Tab' || e.key === 'Enter') e2kb = true; });

    // the secret way through: ` (backtick, under Esc) = lag switch for 8 s
    let lagUntil = 0, lagUses = 0;
    const lagOn = () => performance.now() < lagUntil;
    const lagBadge = Site.el('<span class="lag-badge" hidden>LAG SWITCH: ON</span>');
    root.querySelector('.q-head').appendChild(lagBadge);
    ctx.on(document, 'keydown', e => {
      if (won || (e.code !== 'Backquote' && e.key !== '`')) return;
      if (e.target.closest && e.target.closest('input, textarea')) return;
      e.preventDefault();
      lagUntil = performance.now() + 8000;
      lagUses++;
      lagBadge.hidden = false;
      S.play('glitch');
      // star: a reward for finding the lag switch
      if (lagUses === 1) Site.stars.hide(root.querySelector('.q-head'), 'quiz2', 'position:relative;display:inline-block;width:14px;height:14px;');
      say(lagUses === 1 ? 'WAIT. Who told you about the lag switch?! ...fine. You have 8 seconds.' : Site.pick(['Lag switch again?! Cheater. (Go.)', 'The anti-cheat is sleeping. Hurry.', 'I am filing a complaint with the guild.']));
      ctx.timeout(() => { if (!lagOn()) lagBadge.hidden = true; }, 8100);
    });

    function win() {
      won = true;
      Site.markDone('quiz');
      Site.store.del('quizQ'); // a replay starts from question 1
      Site.store.set('quizFails', Math.min(fails, 6)); // replays are rigged again, but the hints he earned stay
      S.play('win');
      S.play('stamp');
      S.voice('quiz_done', 200);
      const ranks = root.querySelector('.ranks');
      const ark = ranks.querySelector('.ark');
      const me = ranks.querySelector('.me');
      ark.querySelector('.pts').textContent = '100';
      ark.querySelector('.tag').innerHTML = '&#10003; actually legit';
      // star: only exists once Ark is #1
      Site.stars.hide(ark.querySelector('.tag'), 'quiz', 'position:relative;display:inline-block;width:13px;height:13px;vertical-align:middle;margin-left:4px;');
      me.querySelector('.tag').innerHTML = '<s>certified legit</s> under review';
      ranks.prepend(ark);
      ranks.querySelectorAll('.pos').forEach((p, i) => { p.textContent = '#' + (i + 1); });
      root.querySelector('.q-num').textContent = 'QUEST COMPLETE';
      qText.textContent = '5/5. Flawless. Suspiciously flawless.';
      answers.outerHTML = `<div class="q-done"><div class="stamp">Reward: 1&times; birthday</div><div class="row q-done-btns"><button class="btn ghost" data-retake>Think it's rigged? Try again 😏</button><button class="btn red" data-next>Return to camp &gt;</button></div></div>`;
      root.querySelector('[data-next]').onclick = () => Site.next();
      root.querySelector('[data-retake]').onclick = () => Site.go('quiz');
      hint('');
      faints = 0;
      paintFaints();
      say(SINCERE, true);
    }

    // Ark's score keeps trying to reach 100 and getting knocked back
    ctx.interval(() => {
      if (won) return;
      arkPts.textContent = '100';
      arkPts.classList.add('glitch');
      ctx.timeout(() => { if (!won) { arkPts.textContent = '99'; arkPts.classList.remove('glitch'); } }, 160);
    }, 2800);

    renderQuestion();
    paintFaints();
    say("Welcome to the Quest Board, hunter. Five questions. Very easy. The anti-cheat is totally normal. Don't worry about it.");
    S.voice('k_welcome', 600);
    if (fails >= 4 && !Site.demo) ctx.timeout(() => react('lost'), 2500); // came back after a reload: keep the hints he earned

    // screenshot helpers (only reachable with DEBUG_URL)
    if (Site.demo === 'kick') overlay('CONNECTION LOST.', 'Returning to camp...', '', true);
    if (Site.demo === 'faint') { faints = 1; paintFaints(); overlay('YOUR HUNTER FAINTED 1/3', FAINT_SUBS[0], 'faint'); }
    if (Site.demo === 'hint') { fails = 6; faints = 2; paintFaints(); react('lost'); }
    if (Site.demo === 'win') { qi = 4; renderQuestion(); win(); }
  },
});
