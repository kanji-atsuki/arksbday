/* 2. CAPTCHA: "select all squares containing a scout". The first two answers
   are always wrong. Escape hatch: attempt 3 always passes, and a
   "not a robot" checkbox shows up after attempt 2. */
Site.register('captcha', {
  mount(root, ctx) {
    const S = Site.sound;
    const BGS = ['#fff3b0', '#ffe0e3', '#e3f2d0', '#dff0ff', '#fde7c8'];
    const OTHERS = ['duck', 'cake', 'bush', 'rock', 'cone', 'cat'];

    root.innerHTML = `
      ${Site.header('STEP 02 // SECURITY CHECK', 'Prove you are Ark')}
      <div class="win cap">
        <div class="cap-head">
          <small>Select all squares containing a</small>
          <strong>SCOUT</strong>
          <small>If there are none, click skip.</small>
        </div>
        <div class="cap-body">
          <div class="cap-grid" role="group" aria-label="Image squares"></div>
          <div class="cap-msg" aria-live="assertive"></div>
          <label class="cap-robot" hidden><input type="checkbox"> I'm not a robot (pinky promise)</label>
        </div>
        <div class="cap-foot">
          <button class="icon" data-refresh title="New squares" aria-label="New squares">&#8635;</button>
          <button class="icon" data-audio title="Audio challenge" aria-label="Audio challenge">&#9835;</button>
          <button class="icon" data-info title="Help" aria-label="Help">?</button>
          <span class="grow"></span>
          <button class="btn" data-verify>Skip</button>
        </div>
      </div>`;

    const grid = root.querySelector('.cap-grid');
    const msg = root.querySelector('.cap-msg');
    const verify = root.querySelector('[data-verify]');
    const robot = root.querySelector('.cap-robot');
    let attempts = 0;
    let tiles = [];

    function build() {
      const kinds = ['scout', 'scout', 'notscout'];
      if (Math.random() < .5) kinds.push('scout');
      if (attempts === 1) kinds.push('bush', 'bush');
      while (kinds.length < 9) kinds.push(Site.pick(OTHERS));
      tiles = Site.shuffle(kinds);
      grid.innerHTML = tiles.map((k, i) =>
        `<button class="cap-tile fade" aria-pressed="false" style="--bg:${Site.pick(BGS)}" aria-label="Square ${i + 1}">
          <img src="${Site.sprite(k)}" alt="">
        </button>`).join('');
      paintVerify();
    }

    const selected = () => [...grid.querySelectorAll('.cap-tile')].map((b, i) => b.getAttribute('aria-pressed') === 'true' ? i : -1).filter(i => i >= 0);
    const paintVerify = () => { verify.textContent = selected().length ? 'Verify' : 'Skip'; };

    grid.addEventListener('click', e => {
      const b = e.target.closest('.cap-tile');
      if (!b) return;
      b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
      S.play('click');
      paintVerify();
    });

    function fail(text) {
      msg.textContent = text;
      S.play('error');
      S.voice(attempts === 1 ? 'cap_wrong' : 'cap_wrong2', 200);
      const win = root.querySelector('.cap');
      win.classList.remove('shake'); void win.offsetWidth; win.classList.add('shake');
      ctx.timeout(build, 700);
    }

    function pass(text) {
      Site.markDone('captcha');
      S.play('win');
      S.voice('cap_pass', 300);
      root.querySelector('.cap-body').innerHTML = `
        <div class="cap-pass">
          <div class="big-check">&#10003;</div>
          <p>${text}</p>
          <button class="btn red" data-next>Continue &gt;</button>
        </div>`;
      root.querySelector('.cap-foot').remove();
      root.querySelector('[data-next]').onclick = () => Site.next();
      root.querySelector('[data-next]').focus();
    }

    verify.onclick = () => {
      Site.progress.mark('captcha');
      const sel = selected();
      attempts++;
      if (attempts === 1) {
        // star: after the first failure it sits on the corner of a random square
        ctx.timeout(() => {
          const body = root.querySelector('.cap-body');
          const tile = Site.pick([...grid.querySelectorAll('.cap-tile')]);
          if (!body || !tile) return;
          body.style.position = 'relative';
          Site.stars.hide(body, 'captcha', `left:${tile.offsetLeft + tile.offsetWidth - 20}px;top:${tile.offsetTop + 4}px;width:15px;height:15px;`);
        }, 800);
        const pickedNot = sel.find(i => tiles[i] === 'notscout');
        if (!sel.length) fail('You selected nothing. Bold. Also wrong. There were scouts. They were hiding.');
        else if (pickedNot !== undefined) fail(`Square ${pickedNot + 1} is a guy in sunglasses. Not a scout. Clearly.`);
        else fail('Incorrect. One of those scouts was a duck in a hat.');
      } else if (attempts === 2) {
        const bush = tiles.indexOf('bush');
        fail(bush >= 0 && !sel.includes(bush)
          ? `Wrong again. The bush in square ${bush + 1} was a scout in disguise. Scouts camouflage. Read a book.`
          : 'Wrong again. Please try harder. Or worse. Either way, differently.');
        robot.hidden = false;
      } else {
        pass('Verified. You are 63% human. Close enough for a birthday.');
      }
    };

    robot.querySelector('input').onchange = e => {
      if (e.target.checked) pass('Pinky promise accepted. Legally binding. Welcome, human.');
    };
    root.querySelector('[data-refresh]').onclick = () => { S.play('click'); msg.textContent = 'New scouts loaded. They are shy.'; build(); };
    root.querySelector('[data-audio]').onclick = () => { S.play('quack'); Site.toast('Audio challenge: *distant scout noises*'); };
    root.querySelector('[data-info]').onclick = () => Site.toast('Help: a scout is someone who scouts. Hope this helps.');

    build();
  },
});
