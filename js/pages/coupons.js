/* 9. Coupon book: funny ones, sincere ones, and a golden one that appears
   after all 7 hidden stars are found. Redeeming = screenshot + send. */
Site.register('coupons', {
  mount(root, ctx) {
    const S = Site.sound;
    const COUPONS = [
      { id: 'argue', title: 'Win One Argument', body: 'Automatically. Kanji must say "you\'re right" out loud, with no sarcasm.', fine: 'Valid once. Kanji will be annoyed about it.' },
      { id: 'carry', title: 'One Full Carry', body: 'In any game you pick. Kanji fetches the materials while you do the cool stuff.', fine: 'Complaining not included.' },
      { id: 'revive', title: '1 Free Revival', body: 'Whatever you fainted from, I\'m coming to get you.', fine: 'No expiry.', sincere: true },
      { id: 'prank', title: 'Prank Immunity', body: 'Skip one (1) of Kanji\'s pranks, no questions asked.', fine: 'Kanji may still laugh a little.' },
      { id: 'calls', title: 'Unlimited 3 A.M. Calls', body: 'Can\'t sleep, brain too loud, or just bored. Call. I\'ll pick up.', fine: 'Non-refundable.', sincere: true },
      { id: 'infodump', title: 'Infodump Pass', body: '30 minutes on ANY nerdy science topic. Kanji must nod and ask follow-up questions.', fine: 'Diagrams encouraged.' },
      { id: 'overthink', title: 'Supervised Overthinking', body: 'One session. Max 45 minutes. Snacks included. Then we go outside.', fine: 'It\'s not that deep (gently).' },
      { id: 'comfort', title: 'One Comfort Session', body: 'On demand. Blanket, snacks, your pick of show, and zero questions.', fine: 'Redeemable any day, any mood.', sincere: true },
    ];
    const GOLDEN = { id: 'golden', title: '★ Golden Star Coupon ★', body: 'One whole day where Kanji does whatever you plan. No complaints. Not even one.', fine: 'Earned by finding all 7 stars. Show-off.', golden: true };

    const redeemed = () => Site.store.get('redeemed', {}) || {};
    let golden = Site.stars.count() >= Site.STAR_TOTAL;

    root.innerHTML = `
      ${Site.header('STEP 09 // INVENTORY', 'Coupon Book')}
      <p class="cp-intro">Tap a coupon to redeem it, then screenshot it and send it to Kanji. All coupons are legally binding (see Terms 7).</p>
      <div class="coupons"></div>
      <p class="cp-locked" ${golden ? 'hidden' : ''}>There is one more coupon in this book. It's hiding. So are 7 little stars.</p>
      <div class="row cp-next"><button class="btn red" data-next>Continue &gt;</button></div>`;
    const grid = root.querySelector('.coupons');

    function render() {
      const r = redeemed();
      const list = golden ? [GOLDEN, ...COUPONS] : COUPONS;
      grid.innerHTML = list.map((c, i) => `
        <button class="coupon${c.sincere ? ' sincere' : ''}${c.golden ? ' golden' : ''}${r[c.id] ? ' used' : ''}" data-id="${c.id}" style="--tilt:${(i % 3 - 1) * 1.2}deg">
          <span class="cp-stub"><span>No. 17-${String(i + 1).padStart(2, '0')}</span></span>
          <span class="cp-main">
            <span class="cp-title"></span>
            <span class="cp-body"></span>
            <span class="cp-fine"></span>
            <span class="cp-code" aria-hidden="true"></span>
          </span>
          <span class="cp-stamp">REDEEMED</span>
        </button>`).join('');
      grid.querySelectorAll('.coupon').forEach(b => {
        const c = list.find(x => x.id === b.dataset.id);
        b.querySelector('.cp-title').textContent = c.title;
        b.querySelector('.cp-body').textContent = c.body;
        b.querySelector('.cp-fine').textContent = c.fine;
        b.setAttribute('aria-label', `${c.title}. ${c.body} ${c.fine}${r[c.id] ? ' Redeemed.' : ''}`);
        b.onclick = () => redeem(c, b);
      });
      // a sticky note slapped onto the 3 a.m. coupon
      const calls = grid.querySelector('[data-id="calls"]');
      if (calls) {
        const note = Site.el(`<span class="sticky-note">kanji too sleepy.<br>call kanji in case of fire.<br><b>don't cry yourself to sleep you crybaby</b></span>`);
        calls.querySelector('.cp-main').appendChild(note);
        // star: stuck to the sticky note (it's a span inside a button, so stop the coupon click)
        const s = Site.stars.hide(note.querySelector('b'), 'coupons', 'position:relative;display:inline-block;width:12px;height:12px;vertical-align:middle;margin-left:4px;pointer-events:auto;');
        if (s) s.addEventListener('click', e => e.preventDefault());
      }
    }

    function redeem(c, b) {
      Site.progress.mark('coupons');
      Site.markDone('coupons');
      const r = redeemed();
      if (r[c.id]) { Site.toast('Already redeemed. Screenshot it and send it to Kanji!'); return; }
      r[c.id] = Date.now();
      Site.store.set('redeemed', r);
      b.classList.add('used', 'just');
      S.play('stamp');
      if (c.sincere || c.golden) S.play('sparkle');
      S.voice('coupon', 250);
      Site.toast(c.sincere ? 'Redeemed. Screenshot this and send it to Kanji. I mean it.' : 'Redeemed! Screenshot it and send it to Kanji to claim.');
    }

    ctx.cleanup(Site.bus.on('stars', n => {
      if (n >= Site.STAR_TOTAL && !golden) { golden = true; root.querySelector('.cp-locked').hidden = true; render(); }
    }));
    root.querySelector('[data-next]').onclick = () => Site.next();
    render();
  },
});
