/* 6. Rigged navigator: the compass points the wrong way, and every wrong
   turn ends at the same rock. The real way is the OPPOSITE of the needle.
   Escape hatches: the rock hints harder each visit, and on visit 6 it just
   carries him there. */
Site.register('nav', {
  mount(root, ctx) {
    const S = Site.sound;
    const DIRS = ['N', 'E', 'S', 'W'];
    const NAMES = { N: 'north', E: 'east', S: 'south', W: 'west' };
    const OPP = { N: 'S', E: 'W', S: 'N', W: 'E' };
    const ANGLE = { N: 0, E: 90, S: 180, W: 270 };
    const WALKS = [
      'You walk {d} for three hours.',
      'You march {d} with total confidence. You end up somewhere else. Classic.',
      'You head {d}, humming a little tune. The tune also gets lost.',
      'You sprint {d}. Very athletic. Very pointless.',
      'You go {d}. A bird watches, judging.',
      'You turn {d}. Then left. Then left again. Then left again.',
    ];
    // The rig: the first 2 trips end at the rock no matter what (even the
    // right way), so he thinks he's hopeless. From trip 3 the rock hints and
    // the opposite-of-the-needle route works. On trip 5 the rock pities him.
    const FREE_FROM = 3, PITY_AT = 5;
    const ROCK = [
      "Oh. Hi. You're back. Already.",
      'Again? Wow. You really can\'t read a compass, huh.',
      "Even I couldn't get lost this badly, and I'm a ROCK. ...psst. The compass lies. Go the OPPOSITE way.",
      'Your sense of direction is legendary. Green-haired-swordsman legendary. Opposite. Of. The. Needle.',
    ];

    root.innerHTML = `
      ${Site.header('STEP 06 // ROUTING', 'Navigator')}
      <div class="win navi">
        <div class="win-bar"><span class="dots"><i></i><i></i><i></i></span><span>BIRTHDAY_GPS.EXE</span></div>
        <div class="win-body">
          <div class="nav-view"></div>
        </div>
      </div>`;
    const view = root.querySelector('.nav-view');
    let visits = 0, needle = 'N', pitied = false;

    function compass() {
      needle = Site.pick(DIRS);
      view.innerHTML = `
        <p class="nav-dest">DESTINATION: <b>Birthday Server Core</b><br><small>Recalculating route... the compass is 100% accurate.*</small></p>
        <div class="nav-pad">
          <button class="btn nav-btn n" data-d="N">N</button>
          <button class="btn nav-btn w" data-d="W">W</button>
          <div class="compass" aria-label="A compass. It points ${NAMES[needle]}.">
            <span class="cp-n">N</span><span class="cp-e">E</span><span class="cp-s">S</span><span class="cp-w">W</span>
            <div class="needle" style="--a:${ANGLE[needle] + 720}deg"><i></i></div>
            <div class="this-way" style="--a:${ANGLE[needle]}deg"><span>THIS WAY!</span></div>
          </div>
          <button class="btn nav-btn e" data-d="E">E</button>
          <button class="btn nav-btn s" data-d="S">S</button>
        </div>
        <p class="nav-fine">*accuracy not guaranteed. compass was a gift from Kanji.</p>`;
      view.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => walk(b.dataset.d); });
    }

    function walk(d) {
      Site.progress.mark('nav');
      S.play('whoosh');
      const right = visits + 1 >= FREE_FROM && d === OPP[needle];
      view.innerHTML = `<div class="nav-walk"><p>${Site.pick(WALKS).replace('{d}', NAMES[d])}</p><div class="walker"><i></i><i></i><i></i></div></div>`;
      ctx.timeout(() => (right ? arrive() : rock()), 1500);
    }

    function rock() {
      visits++;
      S.play('thud');
      if (visits < 6) S.voice('nav_rock', 250);
      if (visits >= PITY_AT) {
        pitied = true;
        view.innerHTML = `
          <div class="rock-scene">
            <img class="rock px" src="${Site.sprite('bigrock')}" alt="A rock with a face">
            <p class="rock-says">"...You know what? I pity you. Get on. I'm carrying you there myself."</p>
            <p class="nav-fine">The rock gives you a piggyback ride. Rocks are surprisingly fast. Also surprisingly judgmental.</p>
          </div>`;
        ctx.timeout(arrive, 3400);
        return;
      }
      view.innerHTML = `
        <div class="rock-scene">
          <div class="you-are-here">YOU ARE HERE: <b>A SUSPICIOUSLY FAMILIAR ROCK</b></div>
          <div class="rock-wrap"><img class="rock px" src="${Site.sprite('bigrock')}" alt="A rock with a face"></div>
          <p class="rock-says">"${ROCK[Math.min(visits - 1, ROCK.length - 1)]}"</p>
          <p class="nav-fine">Visits to this rock: ${visits}</p>
          <button class="btn" data-back>Try again</button>
        </div>`;
      view.querySelector('[data-back]').onclick = compass;
      // star: the rock only shows it to regulars (3rd visit on)
      if (visits >= 3) Site.stars.hide(view.querySelector('.rock-wrap'), 'nav', 'right:16%;top:8%;width:15px;height:15px;');
    }

    function arrive() {
      S.play('win');
      S.voice('nav_arrive', 200);
      view.innerHTML = `
        <div class="nav-arrive">
          <div class="stamp">Destination reached</div>
          <h2>Birthday Server Core</h2>
          <p class="nav-room">It's a small room. There is a cake in it. ${pitied
            ? `Pity ride delivered after ${visits} rock visits. Sense of direction: officially rated "certified Kanji".`
            : `You found it yourself after ${visits} rock visits. The rock is a little proud of you.`}</p>
          <button class="btn red" data-next>Continue &gt;</button>
        </div>`;
      Site.markDone('nav');
      Site.stars.hide(view.querySelector('.nav-room'), 'nav2', 'position:relative;display:inline-block;width:13px;height:13px;vertical-align:middle;margin-left:4px;');
      view.querySelector('[data-next]').onclick = () => Site.next();
    }

    compass();
  },
});
