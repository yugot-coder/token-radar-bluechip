// Blue-Chip Token Radar's dashboard. It reads window.RADAR (written beside dashboard/ by main.ts)
// and renders the ranked board with its risk tiers, a per-protocol detail drawer that recomputes
// the model's arithmetic in the page, the priced-peer evidence, and the method. No network:
// every byte it shows is in data.js. State lives in the URL hash, so a view can be linked.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var M = DATA.model;
  var TIERS = ['Core', 'Established', 'Emerging'];
  var TIER_ORDER = { Core: 0, Established: 1, Emerging: 2 };
  var SECTIONS = ['Watchlist', 'Overlooked major', 'Early radar'];

  var state = { view: 'board', q: '', tier: 'all', section: 'all', category: 'all', chain: 'all', sort: 'rank', dir: 1, selected: null };
  (function fromHash() {
    var h = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (h.get('view')) state.view = h.get('view');
    if (h.get('tier')) state.tier = h.get('tier');
    if (h.get('section')) state.section = h.get('section');
    if (h.get('cat')) state.category = h.get('cat');
    if (h.get('chain')) state.chain = h.get('chain');
    if (h.get('q')) state.q = h.get('q');
    if (h.get('p')) state.selected = h.get('p');
  })();

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtFull(n) { return usd.format(n); }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unreported';
    if (days >= 365) return (days / 365).toFixed(1) + ' yrs';
    return Math.max(0, Math.round(days)) + ' days';
  }
  function fmtMult(n) { return 'x' + Number(n).toFixed(4); }
  function fmtX(n) { return 'x' + Number(n).toFixed(3); }

  // The model in one function: the page recomputes a row's implied value from the factors data.js
  // carries and checks it against the value board.json states, so the page's code and the board's
  // data are visibly the same arithmetic (a small drift is expected: the factors are shown rounded).
  function recompute(r) {
    return Math.max(1, Math.round(r.tvl_usd * r.multiple * r.maturity_multiplier * r.tvl_scale_multiplier * r.reach_multiplier * r.momentum_multiplier));
  }

  function saveHash() {
    var h = new URLSearchParams();
    if (state.view !== 'board') h.set('view', state.view);
    if (state.tier !== 'all') h.set('tier', state.tier);
    if (state.section !== 'all') h.set('section', state.section);
    if (state.category !== 'all') h.set('cat', state.category);
    if (state.chain !== 'all') h.set('chain', state.chain);
    if (state.q) h.set('q', state.q);
    if (state.selected) h.set('p', state.selected);
    history.replaceState(null, '', h.toString() ? '#' + h.toString() : location.pathname + location.search);
  }

  function header() {
    var tc = DATA.tier_counts;
    return '' +
      '<header class="masthead">' +
      '<div class="kicker">make.fun &middot; token-radar-01 &middot; model ' + esc(DATA.model_version) + '</div>' +
      '<h1>Blue-Chip Token Radar</h1>' +
      '<p class="standfirst">A conservative launch radar over the sealed DefiLlama snapshot of ' + esc(DATA.as_of) + '. ' +
      'Every protocol ranked here <b>records no token</b> in that snapshot. Each is priced at the <b>lower quartile</b> of what ' +
      'comparable tokenised protocols at scale actually sustain per dollar of TVL, then adjusted for the protocol&rsquo;s own ' +
      'scale, seasoning and reach &mdash; and graded <b>Core</b>, <b>Established</b> or <b>Emerging</b> on stated bars, so a reader ' +
      'can size a farm the way an allocator would: blue chips first, speculation labelled as speculation.</p>' +
      '<div class="stats">' +
      '<div class="stat"><div class="v">' + DATA.board_size + '</div><div class="k">protocols ranked</div></div>' +
      '<div class="stat"><div class="v">' + DATA.watchlist_size + ' / ' + DATA.watchlist_size + '</div><div class="k">watchlist covered</div></div>' +
      '<div class="stat"><div class="v">' + tc.Core + '</div><div class="k">Core tier</div></div>' +
      '<div class="stat"><div class="v">' + tc.Established + '</div><div class="k">Established tier</div></div>' +
      '<div class="stat"><div class="v">' + tc.Emerging + '</div><div class="k">Emerging tier</div></div>' +
      '<div class="stat"><div class="v">' + fmtUsd(DATA.rows[0].implied_value_usd) + '</div><div class="k">top implied value</div></div>' +
      '</div></header>';
  }

  function tabs() {
    function t(view, label) {
      return '<button data-view="' + view + '" aria-selected="' + (state.view === view) + '">' + label + '</button>';
    }
    return '<nav class="tabs" role="tablist">' + t('board', 'The board') + t('peers', 'Priced peers') + t('method', 'Method &amp; caveats') + '</nav>';
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.tier !== 'all' && r.tier !== state.tier) return false;
      if (state.section !== 'all' && r.section !== state.section) return false;
      if (state.category !== 'all' && (r.category || 'Uncategorised') !== state.category) return false;
      if (state.chain !== 'all' && r.chains.indexOf(state.chain) < 0) return false;
      if (q && (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function sorted(rows) {
    var k = state.sort, d = state.dir;
    var val = {
      rank: function (r) { return r.rank; },
      name: function (r) { return r.name.toLowerCase(); },
      tier: function (r) { return TIER_ORDER[r.tier]; },
      tvl: function (r) { return r.tvl_usd; },
      change: function (r) { return r.change_7d === null ? -Infinity : r.change_7d; },
      multiple: function (r) { return r.multiple; },
      implied: function (r) { return r.implied_value_usd; }
    }[k];
    return rows.slice().sort(function (a, b) {
      var x = val(a), y = val(b);
      if (x < y) return -d; if (x > y) return d;
      return a.rank - b.rank;
    });
  }

  function controls() {
    var cats = {}, chains = {};
    DATA.rows.forEach(function (r) {
      cats[r.category || 'Uncategorised'] = 1;
      r.chains.forEach(function (c) { chains[c] = 1; });
    });
    function chip(kind, value, label, n) {
      var on = state[kind] === value;
      return '<button class="chip" data-kind="' + kind + '" data-value="' + esc(value) + '" aria-pressed="' + on + '">' + esc(label) + (n !== undefined ? ' <span class="n">' + n + '</span>' : '') + '</button>';
    }
    function opts(all, values, cur) {
      var s = '<option value="all">' + all + '</option>';
      values.forEach(function (v) { s += '<option value="' + esc(v) + '"' + (cur === v ? ' selected' : '') + '>' + esc(v) + '</option>'; });
      return s;
    }
    return '<div class="controls">' +
      '<span class="grp"><span class="lbl">Tier</span>' +
      chip('tier', 'all', 'All', DATA.board_size) +
      TIERS.map(function (t) { return chip('tier', t, t, DATA.tier_counts[t]); }).join('') + '</span>' +
      '<span class="grp"><span class="lbl">Section</span>' +
      chip('section', 'all', 'All') +
      SECTIONS.map(function (s) { return chip('section', s, s); }).join('') + '</span>' +
      '<span class="grp"><span class="lbl">Category</span><select id="f-cat">' + opts('All categories', Object.keys(cats).sort(), state.category) + '</select></span>' +
      '<span class="grp"><span class="lbl">Chain</span><select id="f-chain">' + opts('All chains', Object.keys(chains).sort(), state.chain) + '</select></span>' +
      '<span class="grp"><input type="search" id="f-q" placeholder="Search name or category" value="' + esc(state.q) + '"></span>' +
      '</div>';
  }

  function boardView() {
    var rows = sorted(filtered());
    function th(key, label, cls) {
      var arrow = state.sort === key ? ' <span class="dir">' + (state.dir === 1 ? '&#9650;' : '&#9660;') + '</span>' : '';
      return '<th class="sortable ' + (cls || '') + '" data-sort="' + key + '">' + label + arrow + '</th>';
    }
    var body = rows.map(function (r) {
      var chg = r.change_7d === null ? '<td class="num">n/a</td>' :
        '<td class="num ' + (r.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(r.change_7d) + '</td>';
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td class="num">' + r.rank + '</td>' +
        '<td class="name"><span class="nm">' + esc(r.name) + '</span><br><span class="sub">' + esc(r.category || 'Uncategorised') + ' &middot; ' + esc(r.section) + '</span></td>' +
        '<td><span class="tier tier-' + r.tier + '">' + r.tier + '</span></td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' + chg +
        '<td class="num">' + fmtMult(r.multiple) + '</td>' +
        '<td class="num"><b>' + fmtUsd(r.implied_value_usd) + '</b><br><span class="range">' + fmtUsd(r.range_low_usd) + ' &ndash; ' + fmtUsd(r.range_high_usd) + '</span></td>' +
        '<td class="chains"><span class="sec">' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</span></td>' +
        '</tr>';
    }).join('');
    return controls() +
      '<p class="count-line">Showing <b>' + rows.length + '</b> of ' + DATA.board_size + ' ranked protocols. ' +
      'Implied value is this model&rsquo;s lower-quartile claim, with the peer p10&ndash;median range beneath it. Select a row for the full arithmetic, the tier reasoning and the farm plan.</p>' +
      '<table class="board"><thead><tr>' +
      th('rank', '#') + th('name', 'Protocol') + th('tier', 'Tier') + th('tvl', 'TVL') + th('change', '7d TVL') +
      th('multiple', 'Peer p25') + th('implied', 'Implied value') + '<th class="chains">Chains</th>' +
      '</tr></thead><tbody>' + (body || '<tr><td colspan="8">No protocol matches these filters.</td></tr>') + '</tbody></table>';
  }

  function peersView() {
    var body = DATA.live.map(function (r) {
      return '<tr><td><b>' + esc(r.name) + '</b></td><td>' + esc(r.category || 'Uncategorised') + '</td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td><td class="num">' + fmtUsd(r.mcap_usd) + '</td>' +
        '<td class="num">' + (r.ratio === null ? 'n/a' : fmtMult(r.ratio)) + '</td>' +
        '<td>' + (r.at_scale ? 'peer at scale &mdash; prices the board' : 'below the $25M peer floor &mdash; shown, not used') + '</td></tr>';
    }).join('');
    return '<div class="prose"><p>These protocols&rsquo; tokens already trade, so they are <b>never ranked</b> on the board. ' +
      'They are the evidence the board is priced from: the model reads the market-cap-over-TVL ratios of the ones at scale ' +
      '(TVL at or above $25M) and prices each pre-token protocol at the lower quartile of its peer group. ' +
      'Exchange-category tokens are excluded from the pricing set: an exchange token&rsquo;s ratio prices the exchange&rsquo;s whole business against custodial balances, not a protocol launch.</p></div>' +
      '<table class="plain"><thead><tr><th>Protocol</th><th>Category</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">mcap / TVL</th><th>Role</th></tr></thead><tbody>' + body + '</tbody></table>';
  }

  function methodView() {
    var groups = DATA.peers.map(function (g) {
      return '<tr><td><b>' + esc(g.name) + '</b></td><td>' + g.kind + '</td><td class="num">' + g.peers + '</td>' +
        '<td class="num">' + fmtMult(g.p10) + '</td><td class="num">' + fmtMult(g.p25) + '</td><td class="num">' + fmtMult(g.median) + '</td><td class="num"><b>' + fmtMult(g.shrunk_p25) + '</b></td></tr>';
    }).join('');
    return '<div class="prose">' +
      '<h2 class="serif">The ' + esc(DATA.model_version) + ' model, stated whole</h2>' +
      '<p>A launch is priced the way a cautious allocator prices an illiquid position: at what the weaker half of comparable ' +
      'launches sustain, not at the median hope &mdash; and only after the protocol itself has proved it is built to last. ' +
      'Every figure below is read off the sealed snapshot itself; no protocol name is special-cased anywhere in the model ' +
      '(the function <code>impliedFor</code> in the model source scores every row by the same path).</p>' +
      '<div class="formula">peer multiple = shrunk p25 of mcap/TVL, peers at TVL &ge; $25M, by category (n &ge; 5), else family, else market<br>' +
      'scale factor = maturity (0.72&ndash;1.12 on listing age) &times; TVL scale (0.68&ndash;1.15 on log TVL) &times; reach (1.00&ndash;1.15 on chain count)<br>' +
      'momentum = 1 + clamp(7d TVL change, &minus;20%, +20%) &times; 0.005 &mdash; at most &plusmn;10%<br>' +
      '<b>implied value = TVL &times; peer multiple &times; scale factor &times; momentum</b>, rounded to whole dollars<br>' +
      'range = the same formula at the group&rsquo;s shrunk p10 (low) and shrunk median (high)</div>' +
      '<p>Shrinkage pulls a small peer group toward the market&rsquo;s quartile by peer count, weight n/(n+6), so five peers ' +
      'move the price less than fifty would. The central claim sits at the lower quartile on purpose: the range above it shows ' +
      'what the median peer would imply, and a reader who wants the optimistic case can read it there instead.</p>' +
      '<h3 class="serif">Risk tiers, on stated bars</h3>' +
      '<p><span class="tier tier-Core">Core</span> TVL at or above $1B, listed at least 540 days, on at least 3 chains. ' +
      '<span class="tier tier-Established">Established</span> TVL at or above $150M and listed at least 365 days. ' +
      '<span class="tier tier-Emerging">Emerging</span> everything else. Each row&rsquo;s detail view states the facts that put it in its tier, ' +
      'including the bar it falls short of. The tier never changes the price; it tells the reader how to size the farm.</p>' +
      '<h3 class="serif">The peer evidence</h3>' +
      '<table class="plain"><thead><tr><th>Group</th><th>Kind</th><th class="num">Peers</th><th class="num">p10</th><th class="num">p25</th><th class="num">Median</th><th class="num">Shrunk p25 used</th></tr></thead><tbody>' + groups + '</tbody></table>' +
      '<h3 class="serif">Board composition</h3>' +
      '<p>The board holds all ' + DATA.watchlist_size + ' watchlist protocols, ' + DATA.majors_size + ' overlooked majors at or above the $50M floor that pass every test of the ' +
      'house&rsquo;s watchlist rule the snapshot itself can show (only the parent-protocol record, which the snapshot does not carry, can have kept them off the list), and ' +
      DATA.early_size + ' early protocols below the floor passing the same tests. Wrapped, staked or bridged products of assets that already trade, and exchange balances, are never ranked.</p>' +
      '<h3 class="serif">What the model cannot see</h3>' +
      '<div class="note">The snapshot is one day&rsquo;s record (' + esc(DATA.as_of) + '): a protocol&rsquo;s revenue, users, audits, team and token plans are not in it, and none are claimed here. ' +
      'DefiLlama&rsquo;s record is not proof: a protocol ranked here <b>records no token</b> in it, which is not the same as having none &mdash; a token the record misses would make the row wrong, and the farm plan&rsquo;s first step (verify the venue yourself) is the reader&rsquo;s guard. ' +
      'A lower-quartile price is a discipline, not a forecast: it says what a launch would be worth if this protocol were priced like the weaker half of its peers, nothing about whether or when a token is issued.</div>' +
      '</div>';
  }

  function drawer(r) {
    var rec = recompute(r);
    var drift = Math.abs(rec - r.implied_value_usd) / r.implied_value_usd * 100;
    var pos = 50;
    if (r.range_high_usd > r.range_low_usd && r.range_low_usd > 0) {
      pos = (Math.log(r.implied_value_usd) - Math.log(r.range_low_usd)) / (Math.log(r.range_high_usd) - Math.log(r.range_low_usd)) * 100;
      pos = Math.max(0, Math.min(100, pos));
    }
    function arow(label, value) { return '<tr><td>' + label + '</td><td class="v">' + value + '</td></tr>'; }
    return '<div class="scrim" id="scrim"></div><aside class="drawer" role="dialog" aria-label="Protocol detail">' +
      '<button class="close" id="d-close">Close</button>' +
      '<h2>' + esc(r.name) + '</h2>' +
      '<p class="sub">Rank #' + r.rank + ' &middot; ' + esc(r.category || 'Uncategorised') + ' &middot; ' + esc(r.section) + ' &middot; records no token</p>' +
      '<div class="kv">' +
      '<div><div class="k">Implied value (p25)</div><div class="v">' + fmtFull(r.implied_value_usd) + '</div></div>' +
      '<div><div class="k">TVL</div><div class="v">' + fmtFull(r.tvl_usd) + '</div></div>' +
      '<div><div class="k">7d TVL change</div><div class="v">' + fmtPct(r.change_7d) + '</div></div>' +
      '<div><div class="k">Listed for</div><div class="v">' + fmtAge(r.age_days) + '</div></div>' +
      '<div><div class="k">Chains</div><div class="v">' + r.chains.length + '</div></div>' +
      '<div><div class="k">Peer group</div><div class="v">' + esc(r.peer_group) + '</div></div>' +
      '</div>' +
      '<h3>Risk tier</h3><div class="tierbox"><span class="tier tier-' + r.tier + '">' + r.tier + '</span><br>' + esc(r.tier_reason) + '</div>' +
      '<h3>The arithmetic</h3>' +
      '<table class="arith">' +
      arow('TVL (snapshot)', fmtFull(r.tvl_usd)) +
      arow('Peer multiple &mdash; shrunk p25 of ' + esc(r.peer_group) + ' (' + r.peer_count + ' peers at scale; raw p25 ' + fmtMult(r.peer_p25) + ')', fmtMult(r.multiple)) +
      arow('Maturity &mdash; listing age', fmtX(r.maturity_multiplier)) +
      arow('TVL scale &mdash; size against the $50M floor', fmtX(r.tvl_scale_multiplier)) +
      arow('Reach &mdash; ' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's'), fmtX(r.reach_multiplier)) +
      arow('Momentum &mdash; 7d TVL change, capped at &plusmn;10%', fmtX(r.momentum_multiplier)) +
      '<tr class="total"><td>Implied value</td><td class="v">' + fmtFull(r.implied_value_usd) + '</td></tr>' +
      '</table>' +
      '<p class="check">Recomputed in this page from the factors above: <b>' + fmtFull(rec) + '</b> &mdash; drift ' + drift.toFixed(2) + '% against board.json (the model rounds each factor to four decimals for display).</p>' +
      '<h3>Peer range</h3>' +
      '<div class="rangebar"><div class="mark" style="left:' + pos.toFixed(1) + '%"></div></div>' +
      '<div class="rangelabels"><span>p10 ' + fmtUsd(r.range_low_usd) + '</span><span>this claim ' + fmtUsd(r.implied_value_usd) + '</span><span>median ' + fmtUsd(r.range_high_usd) + '</span></div>' +
      '<p class="sub">Chains: ' + esc(r.chains.join(', ') || 'none recorded') + '. First listed ' + esc(r.listed_at || 'unreported') + '.</p>' +
      '<h3>Farm plan &mdash; safety first</h3>' +
      '<ol class="plan">' + r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '</aside>';
  }

  function render() {
    var html = header() + tabs();
    if (state.view === 'board') html += boardView();
    else if (state.view === 'peers') html += peersView();
    else html += methodView();
    html += '<footer class="colophon">Blue-Chip Token Radar &middot; model ' + esc(DATA.model_version) + ' &middot; source: ' + esc(DATA.source) + ' &middot; snapshot as of ' + esc(DATA.as_of) + '. ' +
      'Implied values are this entry&rsquo;s own claims, read off the snapshot&rsquo;s figures; they are not a prediction that a token will be issued. ' +
      'Every ranked protocol records no token in the snapshot.</footer>';
    var sel = state.selected ? DATA.rows.find(function (r) { return r.slug === state.selected; }) : null;
    if (sel && state.view === 'board') html += drawer(sel);
    app.innerHTML = html;
    app.setAttribute('aria-busy', 'false');
    bind();
  }

  function bind() {
    app.querySelectorAll('.tabs button').forEach(function (b) {
      b.addEventListener('click', function () { state.view = b.getAttribute('data-view'); saveHash(); render(); });
    });
    app.querySelectorAll('.chip').forEach(function (c) {
      c.addEventListener('click', function () {
        state[c.getAttribute('data-kind')] = c.getAttribute('data-value');
        saveHash(); render();
      });
    });
    var cat = document.getElementById('f-cat');
    if (cat) cat.addEventListener('change', function () { state.category = cat.value; saveHash(); render(); });
    var ch = document.getElementById('f-chain');
    if (ch) ch.addEventListener('change', function () { state.chain = ch.value; saveHash(); render(); });
    var q = document.getElementById('f-q');
    if (q) q.addEventListener('input', function () {
      state.q = q.value;
      var pos = q.selectionStart;
      saveHash(); render();
      var q2 = document.getElementById('f-q');
      if (q2) { q2.focus(); q2.setSelectionRange(pos, pos); }
    });
    app.querySelectorAll('th.sortable').forEach(function (t) {
      t.addEventListener('click', function () {
        var k = t.getAttribute('data-sort');
        if (state.sort === k) state.dir = -state.dir;
        else { state.sort = k; state.dir = k === 'name' || k === 'tier' || k === 'rank' ? 1 : -1; }
        render();
      });
    });
    app.querySelectorAll('tbody tr[data-slug]').forEach(function (tr) {
      tr.addEventListener('click', function () {
        state.selected = tr.getAttribute('data-slug');
        saveHash(); render();
      });
    });
    var close = document.getElementById('d-close');
    if (close) close.addEventListener('click', closeDrawer);
    var scrim = document.getElementById('scrim');
    if (scrim) scrim.addEventListener('click', closeDrawer);
  }

  function closeDrawer() { state.selected = null; saveHash(); render(); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.selected) closeDrawer(); });

  render();
})();
