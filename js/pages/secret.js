/* 12. The secret: reached only after trying everything (or the fallback).
   Big countdown to CONFIG.SECRET_TARGET (10:00 on Oct 17, local time). At
   zero: flash, HAPPY BIRTHDAY, confetti. After the target: birthday state. */
Site.register('secret', {
  mount(root, ctx) {
    const S = Site.sound;
    Site.store.set('secretSeen', true);
    const MSG = 'congratulations, you have tried it all... they say curiosity killed the cat, let\'s see what awaits you at the end of this...';

    root.innerHTML = `
      <section class="secret">
        <p class="sec-kicker">/// HIDDEN SERVER ROOM ///</p>
        <p class="sec-msg" aria-label="${MSG}"></p>
        <div class="sec-cd" hidden>
          <div class="sec-time" role="timer">--:--:--</div>
          <p class="sec-label">until the birthday server unlocks</p>
        </div>
        <div class="sec-after" hidden>
          <h1 class="kt sec-hbd">${Site.kinetic('HAPPY BIRTHDAY, ARK')}</h1>
          <p class="sec-label">the server is unlocked. go check your messages.</p>
        </div>
        <button class="btn sm ghost sec-back" data-back>&lt; back to the site</button>
      </section>`;

    const msg = root.querySelector('.sec-msg');
    const cd = root.querySelector('.sec-cd');
    const time = root.querySelector('.sec-time');
    const after = root.querySelector('.sec-after');
    root.querySelector('[data-back]').onclick = () => Site.go('final');
    S.voice('secret', 700);

    // type the message out, glitching a little
    let i = 0;
    const typer = ctx.interval(() => {
      i++;
      msg.textContent = MSG.slice(0, i);
      if (i % 2 === 0) S.play('type');
      if (i >= MSG.length) {
        clearInterval(typer);
        showClock();
        // star: the very last one, at the end of the message
        Site.stars.hide(msg, 'secret', 'position:relative;display:inline-block;width:13px;height:13px;vertical-align:middle;margin-left:6px;');
      }
    }, Site.demo ? 1 : 55);

    let lastRem = null;
    function showClock() {
      const paint = () => {
        const rem = Site.countdown.remaining(Site.countdown.SECRET);
        if (rem <= 0) {
          cd.hidden = true;
          after.hidden = false;
          if (lastRem !== null && lastRem > 0) Site.celebrate({ noCake: true });
        } else {
          cd.hidden = false;
          after.hidden = true;
          time.textContent = Site.countdown.fmt(rem);
          time.classList.toggle('hot', rem < 3600e3);
        }
        lastRem = rem;
      };
      paint();
      ctx.cleanup(Site.bus.on('tick', paint));
    }
  },
});
