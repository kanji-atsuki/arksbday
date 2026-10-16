/* 3. Terms & conditions: scroll to the bottom to accept, then one yes/no
   question where "No" runs away. Escape hatch: No gets tired after a few
   dodges and can be clicked (it still counts as yes). Keyboard always works. */
Site.register('terms', {
  mount(root, ctx) {
    const S = Site.sound;
    const CLAUSES = [
      ['§1 Parties', 'This agreement is between the Birthday Server ("the Server") and the Birthday Person ("Ark", "you", "the main character").'],
      ['§2 Perception', 'Ark agrees to be celebrated, perceived, and mildly embarrassed for the duration of the birthday and up to 72 hours after.'],
      ['§3 Cake', 'All cake is the property of the Birthday Person. Crumbs are community property. Frosting disputes go to a judge (a duck).'],
      ['§4 Sentiment', 'The Server may become sentimental without warning. This is not a bug and will not be patched.'],
      ['§5 Games', 'You acknowledge that "one more game" is a legally binding lie.'],
      ['§6 Complaints', 'Complaints must be submitted in writing, on a napkin, during a full moon, to the duck mentioned in §3.'],
      ['§7 Kanji (the important part)', '<span class="k-clause">§7.1 You hereby agree that for the next 24 hours and the rest of your life, you will listen to every word Kanji says. You promise that Kanji is always, ALWAYS right about everything, every second of the day and that Kanji is the GOAT.</span>'],
      ['§7.2 Being right', 'Kanji reserves the right to be right. Kanji waives the right to admit when wrong. In the event that Kanji is wrong, see Terms 7.1.'],
      ['§7.3 Pranks', "All of Kanji's pranks are a form of affection. They are non-refundable and may not be reported to any authority, including Ark's own common sense."],
      ['§7.4 Snacks', 'Kanji gets first pick of all snacks, forever. This clause was not negotiated. Negotiations are closed.'],
      ['§7.5 Arguments', 'Should Ark win an argument against Kanji, the argument will be replayed until Kanji wins. (Exception: see Coupon No. 17-01.)'],
      ['§7.6 Appreciation', 'Ark agrees to say "thank you Kanji, very cool" at least once per day. A thumbs-up emoji counts as half.'],
      ['§7.7 Rankings', 'Kanji will remain #1 on every leaderboard, scoreboard, and list of favorite people. The score is 999,999 and it is certified legit.'],
      ['§7.8 Fine print', '<span class="fine k-fine">kanji wrote every clause in section 7. kanji also wrote this one. kanji would like it noted that kanji is the GOAT. see Terms 7.1.</span>'],
      ['§8 Aging', 'Getting older is non-refundable. Wisdom ships separately. Please allow 5 to 10 business years for delivery.'],
      ['§9 The bar', 'You agree not to look directly at the loading bar. It gets nervous.'],
      ['§10 Yellow', 'Yellow is hereby the official color of today. Disagreements will be ignored, politely.'],
      ['§11 Scrolling', 'By scrolling, you confirm that you are scrolling.'],
      ['§12 Ducks', 'Ducks may appear. Ducks are not affiliated with the Server. Ducks answer to no one.'],
      ['§12.5 Stars', 'Stars are shy. Some of them only come out if you say their name in the right language.'],
      ['§13 Law', 'This agreement is governed by the Laws of Vibes, Section Cozy, Subsection Blanket.'],
      ['§14 Severability', 'If any clause is found to be unenforceable, it will be enforced harder.'],
      ['§15 Hidden fees', 'One (1) smile, payable on completion. No refunds. Smiles in advance are accepted.'],
      ['§16 Fine print', '<span class="fine">you are allowed to rest today. you do not have to earn it. this clause is small on purpose so nobody makes it weird.</span>'],
    ];

    root.innerHTML = `
      ${Site.header('STEP 03 // LEGAL STUFF', 'Terms & Conditions')}
      <div class="win tos">
        <div class="win-bar"><span class="dots"><i></i><i></i><i></i></span><span>TERMS_v17.0.TXT</span></div>
        <div class="win-body">
          <div class="tos-scroll" tabindex="0" aria-label="Terms and conditions">
            ${CLAUSES.map(([h, p]) => `<h3>${h}</h3><p>${p}</p>`).join('')}
            <p class="end">— you reached the bottom. nobody reaches the bottom. hi. —</p>
          </div>
          <p class="tos-hint" aria-live="polite">Please scroll to the bottom. We know you didn't read it. Nobody does.</p>
          <label class="tos-agree locked"><input type="checkbox" disabled> I have read and agree to the terms (I did not read the terms)</label>
          <button class="btn red" data-accept disabled>Accept</button>
        </div>
      </div>
      <div class="q-slot"></div>`;

    // star: tucked into the tiny fine print of §7.8
    Site.stars.hide(root.querySelector('.k-fine'), 'terms', 'position:relative;display:inline-block;width:11px;height:11px;vertical-align:baseline;margin-left:3px;');
    const scroller = root.querySelector('.tos-scroll');
    const hint = root.querySelector('.tos-hint');
    const agree = root.querySelector('.tos-agree');
    const box = agree.querySelector('input');
    const accept = root.querySelector('[data-accept]');
    let unlocked = false;

    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      agree.classList.remove('locked');
      box.disabled = false;
      hint.textContent = 'Wow. You scrolled. Legally impressive.';
      S.play('ok');
    };
    const check = () => { if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 12) unlock(); };
    ctx.on(scroller, 'scroll', check, { passive: true });
    ctx.timeout(check, 100); // short screens: nothing to scroll
    // escape hatch: if scrolling never registers (odd devices), unlock anyway
    ctx.timeout(() => { if (!unlocked) { unlock(); hint.textContent = 'Fine. We scrolled it for you. You owe us.'; } }, 45000);

    // Kanji reads the GOAT clause out loud when it scrolls into view
    const goat = root.querySelector('.k-clause');
    if (goat && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => {
        if (es.some(x => x.isIntersecting)) { io.disconnect(); S.play('stamp'); S.voice('tos_goat'); goat.classList.add('lit'); }
      }, { root: scroller, threshold: 0.6 });
      io.observe(goat);
      ctx.cleanup(() => io.disconnect());
    }

    box.onchange = () => { accept.disabled = !box.checked; S.play('click'); };
    accept.onclick = () => {
      Site.progress.mark('terms');
      S.play('stamp');
      S.voice('tos_accept');
      accept.disabled = true;
      box.disabled = true;
      askQuestion();
    };

    function askQuestion() {
      const slot = root.querySelector('.q-slot');
      slot.innerHTML = `
        <div class="win q-card">
          <div class="win-bar"><span class="dots"><i></i><i></i><i></i></span><span>ONE MORE THING</span></div>
          <div class="win-body">
            <div class="clause">§17 MANDATORY QUESTION</div>
            <h2>Do you agree to have an excellent birthday?</h2>
            <div class="q-arena">
              <button class="btn yes">Yes</button>
              <button class="btn ghost no">No</button>
            </div>
            <p class="q-quip" aria-live="polite"></p>
          </div>
        </div>`;
      const arena = slot.querySelector('.q-arena');
      const yes = slot.querySelector('.yes');
      const no = slot.querySelector('.no');
      const quip = slot.querySelector('.q-quip');
      slot.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const place = (b, x, y) => { b.style.left = x + 'px'; b.style.top = y + 'px'; };
      const layout = () => {
        const w = arena.clientWidth, h = arena.clientHeight;
        place(yes, w * .3 - yes.offsetWidth / 2, h / 2 - yes.offsetHeight / 2);
        if (!runs) place(no, w * .7 - no.offsetWidth / 2, h / 2 - no.offsetHeight / 2);
      };

      const QUIPS = ['nope.', 'the No button has left the chat', "it's shy", 'you will never catch it', 'it has a family', 'okay it is getting tired', 'it is wheezing'];
      const MAX_RUNS = 7;
      let runs = 0;
      const run = () => {
        if (runs >= MAX_RUNS) return false;
        runs++;
        const w = arena.clientWidth - no.offsetWidth, h = arena.clientHeight - no.offsetHeight;
        const yr = yes.getBoundingClientRect(), ar = arena.getBoundingClientRect();
        let x, y, tries = 0;
        do { // land somewhere that isn't on top of Yes
          x = Math.random() * w; y = Math.random() * h; tries++;
        } while (tries < 30 && x + no.offsetWidth > yr.left - ar.left - 10 && x < yr.right - ar.left + 10 &&
                 y + no.offsetHeight > yr.top - ar.top - 10 && y < yr.bottom - ar.top + 10);
        place(no, x, y);
        quip.textContent = QUIPS[runs - 1];
        S.play('quack');
        if (runs >= MAX_RUNS) {
          no.classList.add('tired');
          no.textContent = 'No (tired)';
          quip.textContent = 'The No button gave up. You may click it now. Out of pity.';
          // star: falls out of the exhausted No button
          Site.stars.hide(arena, 'terms2', `left:${parseFloat(no.style.left) + no.offsetWidth + 6}px;top:${parseFloat(no.style.top) + no.offsetHeight - 10}px;width:14px;height:14px;`);
        }
        return true;
      };

      layout();
      ctx.on(window, 'resize', layout);
      // desktop: dodge when the mouse gets close
      ctx.on(arena, 'pointermove', e => {
        if (e.pointerType !== 'mouse' || runs >= MAX_RUNS) return;
        const r = no.getBoundingClientRect();
        const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
        const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
        if (Math.hypot(dx, dy) < 34) run();
      });
      // phones: dodge on touch, the tap never lands
      let dodgedTap = false;
      no.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse') return;
        if (run()) { dodgedTap = true; e.preventDefault(); }
      });

      const finish = text => {
        Site.markDone('terms');
        yes.disabled = no.disabled = true;
        quip.textContent = text;
        S.play('win');
        ctx.timeout(() => Site.next(), 2600);
      };
      yes.onclick = () => finish('Excellent. That is now legally binding.');
      no.onclick = e => {
        if (dodgedTap) { dodgedTap = false; return; }
        if (e.detail > 0 && runs < MAX_RUNS) { run(); return; } // a mouse somehow caught it
        finish('Response recorded as: YES. (We rounded up.)');
      };
    }
  },
});
