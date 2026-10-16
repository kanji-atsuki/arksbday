/* 7. MBTI test: absurd questions, the result is always INFJ. No rig to get
   stuck on: every answer moves forward. */
Site.register('mbti', {
  mount(root, ctx) {
    const S = Site.sound;
    // Each question has one chaotic Kanji (ESTP) answer; picking it gets called out.
    const QS = [
      ['At a party, you are most likely to:', ["Find the host's cat and befriend it", 'Leave at 9:30 and call it a big night out', 'Have one deep conversation, then need 3 business days to recover', 'Become the party']],
      ['Someone texts "we need to talk." You:', ['Calmly plan your own funeral', 'Draft 14 replies, send none', 'Replay every conversation since 2019', 'Call them instantly. "Talk about WHAT."']],
      ['Your ideal weekend:', ['Blanket. Game. Snacks. Do not perceive me.', 'Hunt one large monster for six hours for one gem', 'Reorganize your feelings alphabetically', 'Spending an entire day dedicated to planning a big ass prank on your friends']],
      ['Pick a color:', ['Yellow', 'Yellow', 'Also yellow', 'Red. Fast. Like me.']],
      ['How many tabs are open in your brain right now?', ['3', '47', 'Yes', "Zero. I don't think, I act."]],
      ['A friend makes a terrible pun. You:', ['Groan, but secretly love it', 'Laugh about it four hours later, alone', 'Explain why it works on a molecular level', 'Make it worse']],
      ['Choose your weapon:', ['A very big hammer', 'A long sword and a longer grudge', 'A carefully worded paragraph', "Whatever does the most damage, I didn't read the description"]],
      ['Final question. Are you an INFJ?', ['Yes', 'I need 3 to 5 business days to think about it', 'What is an INFJ', "No, I'm an ESTP and I'm the GOAT (see Terms 7.1)"]],
    ];
    const QUIPS = {
      'Become the party': 'That is an ESTP answer. Kanji detected. Ignoring.',
      'Call them instantly. "Talk about WHAT."': 'Confrontational AND efficient. Kanji, get off his keyboard.',
      'Spending an entire day dedicated to planning a big ass prank on your friends': 'Spontaneity detected. Disregarding. Ark plans things.',
      'Red. Fast. Like me.': 'Wrong answer AND wrong person.',
      "Zero. I don't think, I act.": 'Zero tabs. That explains a lot, Kanji.',
      'Make it worse': 'Ark, stop pretending to be Kanji.',
      "Whatever does the most damage, I didn't read the description": 'Classic ESTP. Reading is for INFJs.',
      "No, I'm an ESTP and I'm the GOAT (see Terms 7.1)": 'Nice try, Kanji. The test knows who you are.',
      'What is an INFJ': 'You will find out in about 4 seconds.',
    };

    root.innerHTML = `
      ${Site.header('STEP 07 // PERSONALITY SCAN', 'MBTI Test')}
      <div class="win mbti">
        <div class="win-bar"><span class="dots"><i></i><i></i><i></i></span><span>TOTALLY_SCIENTIFIC_TEST.EXE</span></div>
        <div class="win-body"><div class="mb-view"></div></div>
      </div>`;
    const view = root.querySelector('.mb-view');
    // resume mid-test after a reload
    let qi = Math.min(Site.store.get('mbtiQ', 0) || 0, QS.length - 1), kanjiPicks = Site.store.get('mbtiKanji', 0) || 0, takes = Site.store.get('mbtiTakes', 0);

    function ask() {
      const q = QS[qi][0];
      const opts = Site.shuffle(QS[qi][1].slice());
      view.innerHTML = `
        <div class="mb-prog"><i style="width:${(qi / QS.length) * 100}%"></i></div>
        <p class="mb-num">QUESTION ${qi + 1}/${QS.length}</p>
        <h2 class="mb-q"></h2>
        <div class="mb-opts">${opts.map((o, i) => `<button class="mb-opt" data-i="${i}"><b>${'ABCD'[i]}</b><span></span></button>`).join('')}</div>`;
      view.querySelector('.mb-q').textContent = q;
      view.querySelectorAll('.mb-opt').forEach((b, i) => {
        b.querySelector('span').textContent = opts[i];
        b.onclick = () => answer(opts[i], b);
      });
    }

    function answer(text, b) {
      Site.progress.mark('mbti');
      if (text === QS[qi][1][3]) kanjiPicks++; // the 4th option in each list is the Kanji one
      S.play('click');
      b.classList.add('picked');
      if (QUIPS[text]) { Site.toast(QUIPS[text], text === 'What is an INFJ' ? '' : 'bad'); if (text !== 'What is an INFJ') S.play('error'); }
      ctx.timeout(() => {
        qi++;
        Site.store.set('mbtiQ', qi < QS.length ? qi : 0);
        Site.store.set('mbtiKanji', qi < QS.length ? kanjiPicks : 0);
        qi < QS.length ? ask() : analyze();
      }, 380);
    }

    function analyze() {
      const steps = ['Analyzing answers...', 'Consulting the stars...', 'Ignoring the stars...', 'Found 4 letters...', '98% sure...', '103% sure...'];
      view.innerHTML = `<div class="mb-analyze"><p class="mb-step"></p><div class="mb-prog big"><i></i></div></div>`;
      const step = view.querySelector('.mb-step');
      const bar = view.querySelector('.mb-prog i');
      steps.forEach((s, i) => ctx.timeout(() => { step.textContent = s; bar.style.width = ((i + 1) / steps.length) * 100 + '%'; S.play('type'); }, i * 450));
      ctx.timeout(kanjiPicks >= QS.length ? fakeEstp : result, steps.length * 450 + 300);
    }

    // every single answer was a Kanji answer: pretend it worked, then don't
    function fakeEstp() {
      S.play('win');
      view.innerHTML = `
        <div class="mb-result">
          <p class="mb-kicker">YOUR RESULT</p>
          <div class="mb-type estp">ESTP</div>
          <p class="mb-title mb-fake">...wait.</p>
        </div>`;
      const title = view.querySelector('.mb-fake');
      const type = view.querySelector('.mb-type');
      ctx.timeout(() => { type.classList.add('glitch'); S.play('glitch'); title.textContent = 'ESTP?? ...no.'; }, 1500);
      ctx.timeout(() => { title.textContent = 'Recalculating...'; type.textContent = 'E?T?'; S.play('error'); }, 2800);
      ctx.timeout(() => { type.textContent = 'I?F?'; }, 3500);
      ctx.timeout(() => result(true), 4300);
    }

    function result(possessed) {
      Site.markDone('mbti');
      takes++;
      Site.store.set('mbtiTakes', takes);
      S.play('win');
      S.voice('mbti_result', 400);
      view.innerHTML = `
        <div class="mb-result">
          <p class="mb-kicker">YOUR RESULT${takes > 1 ? ` (attempt #${takes})` : ''}</p>
          <div class="mb-type kt">${Site.kinetic('INFJ')}</div>
          <p class="mb-title">The Advocate (of cozy things)</p>
          <ul class="mb-traits">
            <li>Feels everything. Twice. Then once more at 2 a.m.</li>
            <li>Favorite color: yellow (confirmed by science, see Q4).</li>
            <li>Brain has 47 tabs open and all of them are important.</li>
            <li>Secretly the funniest person in the room. Not secretly the kindest.</li>
            ${possessed ? '<li class="mb-possessed">Was clearly possessed by Kanji for 8 questions. Nice try. Still INFJ.</li>' : ''}
          </ul>
          <div class="mb-compat">
            <span>Compatibility with ESTP:</span>
            <div class="mb-meter"><i></i></div>
            <b class="mb-pct">0%</b>
          </div>
          <p class="mb-sus">Result: <em>suspiciously high.</em></p>
          <div class="row">
            <button class="btn ghost" data-retake>Think it's rigged? Try again 😏</button>
            <button class="btn red" data-next>Continue &gt;</button>
          </div>
        </div>`;
      const pct = view.querySelector('.mb-pct');
      const meter = view.querySelector('.mb-meter i');
      let p = 0;
      const id = ctx.interval(() => {
        p += p < 90 ? 7 : 3;
        if (p >= 112) { p = 112; clearInterval(id); view.querySelector('.mb-compat').classList.add('over'); }
        pct.textContent = p + '%';
        meter.style.width = Math.min(p, 100) + '%';
      }, 60);
      view.querySelector('[data-retake]').onclick = () => { qi = 0; kanjiPicks = 0; Site.store.set('mbtiQ', 0); Site.store.set('mbtiKanji', 0); ask(); };
      Site.stars.hide(view.querySelector('.mb-traits li:nth-child(2)'), 'mbti', 'position:relative;display:inline-block;width:15px;height:15px;vertical-align:middle;margin-left:4px;');
      view.querySelector('[data-next]').onclick = () => Site.next();
    }

    ask();
  },
});
