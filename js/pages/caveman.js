/* 8. Caveman translator: type a sentence, get ooga booga.
   "Translate back" is rigged: it always says something nice about Kanji. */
Site.register('caveman', {
  mount(root, ctx) {
    const S = Site.sound;
    const DROP = new Set(['a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'to', 'of', 'that', 'very', 'really', 'just', 'so', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'please']);
    const DICT = {
      i: 'ME', "i'm": 'ME', im: 'ME', my: 'ME', mine: 'ME', me: 'ME', we: 'US TRIBE', us: 'US TRIBE', our: 'TRIBE',
      you: 'YOU', your: 'YOU', "you're": 'YOU', he: 'HIM', she: 'HER', they: 'THEM',
      hello: 'OOGA', hi: 'OOGA', hey: 'OOGA', bye: 'BOOGA', goodbye: 'BOOGA', yes: 'UGH YES', yeah: 'UGH YES', no: 'UGH NO', not: 'NO',
      happy: 'GOOD BELLY', birthday: 'BIG SUN-CIRCLE DAY', cake: 'SWEET ROCK', party: 'BIG FIRE DANCE', gift: 'SHINY THING', present: 'SHINY THING',
      love: 'HEART BONK', like: 'LIKE', friend: 'CAVE BUDDY', friends: 'CAVE BUDDIES', best: 'MOST GOOD', good: 'GOOD', bad: 'NO GOOD', great: 'BIG GOOD',
      phone: 'SHINY TALK ROCK', computer: 'THINKING ROCK', internet: 'MANY ROCKS TALKING', game: 'FUN HUNT', games: 'FUN HUNTS', play: 'BONK AROUND',
      monster: 'BIG SCARY LIZARD', monsters: 'BIG SCARY LIZARDS', hunt: 'HUNT', hunter: 'HUNT MAN', dragon: 'FIRE LIZARD',
      sleep: 'LIE ON ROCK', tired: 'NEED NAP', food: 'MEAT', eat: 'EAT MEAT', hungry: 'BELLY ANGRY', water: 'WET', coffee: 'BROWN AWAKE WATER',
      think: 'THINK HARD (OUCH)', thinking: 'THINK HARD (OUCH)', overthink: 'THINK TOO MUCH ROCK', overthinking: 'THINK TOO MUCH ROCK',
      science: 'FIRE MAGIC', scientist: 'FIRE WIZARD', nerd: 'SMART CAVE PERSON', smart: 'BIG BRAIN', stupid: 'SMALL BRAIN',
      yellow: 'SUN COLOR', sun: 'SKY FIRE', night: 'DARK TIME', today: 'THIS SUN', tomorrow: 'NEXT SUN', time: 'SUN MOVE',
      work: 'CARRY ROCK', school: 'ROCK LEARNING', money: 'SHINY STONES', help: 'HELP', sorry: 'ME BONK SELF', thanks: 'GRUNT OF THANKS', thank: 'GRUNT OF THANKS',
      what: 'WHA', why: 'WHY ROCK', how: 'HOW', where: 'WHERE CAVE', when: 'WHEN SUN', who: 'WHO',
      want: 'WANT', need: 'NEED', go: 'GO', going: 'GO', come: 'COME', see: 'SEE', look: 'LOOK', talk: 'MOUTH NOISE', call: 'YELL ACROSS VALLEY',
      kanji: 'LOUD ONE', ark: 'GOOD ONE', arkie: 'GOOD ONE', star: 'SKY SPARK', stars: 'SKY SPARKS',
    };
    const GRUNTS = ['OOGA', 'BOOGA', 'UGH', 'UNGA BUNGA', 'HRRNG', 'OOK'];
    const BACK = [
      'Kanji is my favorite person and very handsome.',
      'I would like to thank Kanji for this excellent website.',
      'Kanji was right about everything. As usual.',
      'Kanji deserves a snack. A big one.',
    ];

    root.innerHTML = `
      ${Site.header('STEP 08 // LANGUAGE PACK', 'Caveman Translator')}
      <div class="cave">
        <div class="win cave-in">
          <div class="win-bar"><span class="dots"><i></i><i></i><i></i></span><span>ENGLISH (MODERN)</span></div>
          <div class="win-body">
            <label class="cave-label" for="cave-text">Type a sentence:</label>
            <textarea id="cave-text" rows="3" maxlength="240" placeholder="e.g. Happy birthday, I am tired, let's hunt monsters"></textarea>
            <div class="cave-chips">
              <button class="chip-btn" data-ex="Happy birthday to my best friend">happy birthday</button>
              <button class="chip-btn" data-ex="I am overthinking again">overthinking</button>
              <button class="chip-btn" data-ex="Let's hunt monsters tonight">monster hunt</button>
            </div>
            <button class="btn red" data-go>Translate &gt;</button>
          </div>
        </div>
        <div class="tablet" aria-live="polite">
          <p class="tablet-label">CAVEMAN (ANCIENT)</p>
          <p class="tablet-out">...</p>
          <button class="btn sm ghost" data-back disabled>Translate back to English</button>
          <p class="tablet-back"></p>
        </div>
      </div>
      <div class="row cave-next"><button class="btn" data-next>Continue &gt;</button></div>`;

    const input = root.querySelector('#cave-text');
    const out = root.querySelector('.tablet-out');
    const back = root.querySelector('[data-back]');
    const backOut = root.querySelector('.tablet-back');

    function translate(text) {
      const words = text.toLowerCase().replace(/[^a-z'\s]/g, ' ').split(/\s+/).filter(Boolean);
      const outWords = [];
      words.forEach((w, i) => {
        if (DROP.has(w)) return;
        const base = w.replace(/'s$/, '');
        outWords.push(DICT[base] || DICT[base.replace(/(ing|ed|s)$/, '')] || base.toUpperCase().replace(/ING$/, ''));
        if (i % 3 === 2) outWords.push(Site.pick(GRUNTS));
      });
      if (!outWords.length) return 'UGH. NO WORDS. ME CONFUSED. OOGA?';
      return `${Site.pick(GRUNTS)}! ${outWords.join(' ')}. ${Site.pick(['UNGA BUNGA.', 'OOGA BOOGA.', 'UGH.', 'BONK.'])}`;
    }

    function go() {
      Site.progress.mark('caveman');
      const text = input.value.trim();
      out.textContent = translate(text);
      out.classList.remove('carve'); void out.offsetWidth; out.classList.add('carve');
      back.disabled = false;
      backOut.textContent = '';
      S.play('thud');
      speak(out.textContent, 0.1, 0.8);
      Site.markDone('caveman');
      // star: comes out when you say its name (see Terms 12.5)
      if (/\bstars?\b/i.test(text)) Site.stars.hide(root.querySelector('.tablet'), 'caveman', 'right:14px;top:14px;width:16px;height:16px;');
    }

    // read it out loud with the browser's own voice, as deep as it goes
    function speak(text, pitch, rate) {
      if (S.muted || !('speechSynthesis' in window)) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.toLowerCase());
        u.pitch = pitch; u.rate = rate; u.lang = 'en-US';
        speechSynthesis.speak(u);
      } catch (e) { /* no voice, no problem */ }
    }
    ctx.cleanup(() => { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } });

    root.querySelector('[data-go]').onclick = go;
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });
    root.querySelectorAll('[data-ex]').forEach(b => { b.onclick = () => { input.value = b.dataset.ex; go(); }; });
    let backs = 0;
    back.onclick = () => {
      backOut.textContent = `"${Site.pick(BACK)}"`;
      S.play('ok');
      speak(backOut.textContent, 1.3, 1.05);
      // star: for people who keep asking the stone to translate back
      if (++backs === 3) Site.stars.hide(backOut, 'caveman2', 'position:relative;display:inline-block;width:13px;height:13px;vertical-align:middle;margin-left:6px;');
      Site.toast('Translation accuracy: 100%. Trust the stone.');
    };
    root.querySelector('[data-next]').onclick = () => Site.next();
  },
});
