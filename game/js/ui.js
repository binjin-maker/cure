import { ITEMS, ITEM, isGun, isMeleeish, PASSES, ALLOWANCE_SEC, MAX_WITHDRAW, xpForLevel } from './data.js';
import { fmt, clamp } from './engine.js';
import { ROADS, EDGE, MAP_MARKERS } from './world.js';

let G, cur = null, curData = null, typingNow = false, fadingNow = false, lpOn = false;
const $ = (id) => document.getElementById(id);
const menu = $('menu');

export function init(g) {
  G = g;
  addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && G.state === 'play') {
      if ($('lp') && !$('lp').classList.contains('hide')) return;
      if (cur && cur !== 'death') { if (cur === 'pause') { close(); G.lock(); } else if (['settings', 'controls', 'guide', 'store'].includes(cur) && curData === 'pause') open('pause'); else { close(); } }
    }
    if (e.code === 'Tab' && G.state === 'play') { e.preventDefault(); $('plist').classList.remove('hide'); playerList(); }
  });
  addEventListener('keyup', (e) => { if (e.code === 'Tab') $('plist').classList.add('hide'); });
  menu.addEventListener('focusin', (e) => { if (e.target.tagName === 'INPUT' && e.target.type === 'text') typingNow = true; });
  menu.addEventListener('focusout', () => { typingNow = false; });
  $('xh').querySelectorAll('i').forEach(i => i.style.background = G.save.settings.xhair);
}
export const typing = () => typingNow;
export const isOpen = () => !!cur || lpOn;
export const current = () => cur;
export const fading = () => fadingNow;
export function showHUD(on) { $('hud').classList.toggle('hide', !on); }
export function close() { cur = null; curData = null; menu.classList.add('hide'); menu.className = 'hide'; menu.innerHTML = ''; typingNow = false; }

export function open(name, data) {
  cur = name; curData = data;
  menu.className = name === 'main' ? 'main' : '';
  const f = VIEWS[name];
  menu.innerHTML = '';
  f(data);
  if (G.state === 'play' && name !== 'main') G.unlock();
}
function panel(title, body, closeable = true, width) {
  const p = document.createElement('div'); p.className = 'panel'; if (width) p.style.width = width;
  p.innerHTML = `<h2><span>${title}</span>${closeable ? '<span class="x" data-close>✕</span>' : ''}</h2>`;
  const b = document.createElement('div'); p.appendChild(b);
  if (typeof body === 'string') b.innerHTML = body; else b.appendChild(body);
  menu.appendChild(p);
  p.querySelector('[data-close]')?.addEventListener('click', () => { if (curData === 'pause' && cur !== 'pause') return open('pause'); if (curData === 'main') return open('main'); close(); if (G.state === 'play') G.lock(); });
  return b;
}
const on = (root, sel, ev, fn) => root.querySelectorAll(sel).forEach(el => el.addEventListener(ev, (e) => { G.sfx.click(); fn(el, e); }));

const VIEWS = {
  main() {
    const s = G.save;
    menu.innerHTML = `<div class="mainmenu">
      <div class="title">CURE</div><div class="sub">SECTOR-07 · FREE-ROAM FIGHTING</div>
      <button class="btn red" data-m="standard">PLAY — STANDARD<span class="mode">Bleed out when downed · more cash lost on death · XP from kills + allowance</span></button>
      <button class="btn" data-m="casual">PLAY — CASUAL<span class="mode">Legacy downs (you recover) · less cash lost · XP only from allowance</span></button>
      <button class="btn" data-v="store">STORE (PASSES)</button>
      <button class="btn" data-v="settings">SETTINGS</button>
      <button class="btn" data-v="controls">CONTROLS</button>
      <button class="btn" data-v="guide">GUIDE / WIKI</button>
      <div class="foot">Level ${s.level} · Bank ${fmt(s.bank)} · ${s.stats.kills} kills · ${s.stats.deaths} deaths · ${s.stats.safes} safes cracked<br>
      ${s.session ? 'Saved loadout: ' + (s.session.inv?.length || 0) + ' items, ' + fmt(s.session.cash || 0) + ' cash<br>' : ''}
      Build ${G.version} · auto-updates from GitHub</div></div>`;
    on(menu, '[data-m]', 'click', (el) => G.startGame(el.dataset.m));
    on(menu, '[data-v]', 'click', (el) => open(el.dataset.v, 'main'));
  },
  pause() {
    const b = panel('PAUSED', `<div style="display:flex;flex-direction:column;gap:8px;width:320px">
      <button class="btn green" data-a="resume">Resume</button>
      <button class="btn" data-v="inventory">Inventory (G)</button><button class="btn" data-v="map">Map (M)</button>
      <button class="btn" data-v="store">Store</button><button class="btn" data-v="settings">Settings</button>
      <button class="btn" data-v="controls">Controls</button><button class="btn" data-v="guide">Guide / Wiki</button>
      <button class="btn red" data-a="reset">Reset Character (lose 10% cash, drop items)</button>
      <button class="btn" data-a="menu">Save &amp; Main Menu</button></div>`);
    on(b, '[data-a=resume]', 'click', () => { close(); G.lock(); });
    on(b, '[data-a=reset]', 'click', () => G.resetChar());
    on(b, '[data-a=menu]', 'click', () => G.toMenu());
    on(b, '[data-v]', 'click', (el) => open(el.dataset.v, 'pause'));
  },
  settings(from) {
    const s = G.save.settings;
    const sl = (k, label, min, max, step) => `<span>${label}</span><span class="row"><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${s[k]}"><b data-v="${k}">${s[k]}</b></span>`;
    const ck = (k, label) => `<span>${label}</span><span><input type="checkbox" data-c="${k}" ${s[k] ? 'checked' : ''} style="pointer-events:auto"></span>`;
    const b = panel('SETTINGS', `<div class="kv">
      ${sl('sens', 'Mouse sensitivity', 0.1, 4, 0.05)}${sl('adsSens', 'Aim sensitivity', 0.1, 2, 0.05)}${sl('fov', 'Field of view', 60, 110, 1)}
      ${sl('vol', 'Master volume', 0, 1, 0.05)}${sl('lights', 'Dynamic lights (lower = faster)', 0, 8, 1)}${sl('quality', 'Render scale', 0.4, 1, 0.05)}${sl('view', 'View distance', 150, 700, 10)}
      ${ck('tp', 'Third-person camera (T)')}${ck('invertY', 'Invert mouse Y')}${ck('fps', 'Show FPS')}${ck('names', 'Show name tags')}${ck('bob', 'View bobbing')}
      <span>Crosshair color</span><span><input type="text" data-t="xhair" value="${s.xhair}" style="width:110px"></span></div>
      <div class="note" style="margin-top:12px">Settings save automatically.</div>`);
    b.querySelectorAll('input[type=range]').forEach(i => i.addEventListener('input', () => { s[i.dataset.k] = +i.value; b.querySelector(`[data-v=${i.dataset.k}]`).textContent = i.value; G.applySettings(); }));
    b.querySelectorAll('input[type=checkbox]').forEach(i => i.addEventListener('change', () => { s[i.dataset.c] = i.checked; G.applySettings(); }));
    b.querySelector('[data-t]').addEventListener('change', (e) => { s.xhair = e.target.value; $('xh').querySelectorAll('i').forEach(i => i.style.background = s.xhair); });
    b.addEventListener('change', () => G.saveNow());
  },
  controls() {
    const rows = [['WASD', 'Move'], ['Shift', 'Sprint (uses stamina)'], ['C / Ctrl', 'Crouch'], ['Space', 'Jump'], ['Mouse', 'Look'], ['LMB', 'Shoot / swing / throw / use'], ['RMB', 'Aim down sights'], ['R', 'Reload · hold R with fists/med to revive downed'], ['E', 'Interact (ATM, dealers, safes, scrap, doors)'], ['F', 'Finish a downed enemy with a melee (+30 HP)'], ['1–0 / Wheel', 'Hotbar'], ['V', 'Fists'], ['T', 'Toggle first / third person'], ['Q', 'Drop held item'], ['G', 'Inventory'], ['M', 'Map'], ['Tab (hold)', 'Player list & bounties'], ['N', 'Toggle thermal goggles'], ['F9', 'Apply downloaded update now'], ['Esc', 'Pause']];
    panel('CONTROLS', `<table class="t">${rows.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td></tr>`).join('')}</table>`);
  },
  guide() {
    panel('GUIDE / WIKI', `<div class="guide" style="max-width:760px">
      <h3>The Sector</h3><p>SECTOR-07 is walled off by a brutalist wall and rock faces. Fight, loot and survive. Your <b>bank</b> is safe; the <b>cash in your pocket</b> drops when you die (Standard: 10%, max $500 · Casual: 5%, max $250). Bought items drop too.</p>
      <h3>Money</h3><p>Every 15 minutes you get an <b>allowance</b> ($600 base, +10% group, +20% Extra Income, +30% Premium) — claim it at an ATM. ATMs also deposit, withdraw (max $25,000 per transaction) and redeem codes. New players start with $5,000 in the bank. Level-ups pay out to the bank.</p>
      <table class="t"><tr><th>Container</th><th>Open with</th><th>Payout</th><th>Respawn</th><th>Where</th></tr>
      <tr><td>Cash Register</td><td>Fists (3 hits), Knuckledusters, Crowbar, Sledgehammer, explosives</td><td>~$80–$375</td><td>10 min</td><td>Cafe, Thrift Store (2), Workshop, Junkyard, Gas Station, Barber Shop, Pizzeria</td></tr>
      <tr><td>Small Safe</td><td>Crowbar (4 hits) or Lockpick (2 squares), explosives</td><td>~$120–$720</td><td>12 min</td><td>Factory (3), Cafe, Warehouse (catwalk), Workshop, Junkyard (2), Tower (3), Subway (3), Sewer</td></tr>
      <tr><td>Big Safe</td><td>Crowbar (5 hits) or Lockpick (3 squares), explosives</td><td>~$200–$1,080</td><td>12 min</td><td>Tower (2), Junkyard, Thrift Store, Subway, Vibe Check (3), Thrift Sewer Room, ? Room</td></tr>
      <tr><td>Scrap Pile</td><td>Hold E</td><td>Scrap, cash, tools, guns</td><td>5 min</td><td>Everywhere; golden piles in Vibe Check</td></tr>
      <tr><td>Weapon Crate</td><td>Hold E</td><td>Mid/high-tier gun</td><td>15 min</td><td>Tower, Factory, Warehouse, Junkyard, Vibe Check, Subway…</td></tr></table>
      <p>Crowbarring a safe or register in a building with an alarm (Cafe, Thrift, Barber, Workshop, Gas Station, Pizzeria, Tower) sets it off and pulls nearby players toward you. Explosions also blow safes open.</p>
      <h3>Shops</h3><p><b>Dealers</b> (Basketball, Tower, Workshop, Factory, Thrift Store) share one street stock. <b>Armories</b> — Armory 1 (blue sign, across from the basketball court, facing the Cafe) and Armory 2 (red sign, beside the Junkyard, behind the shops across from the Pizzeria) — need the <b>Weaponry pass</b>. The <b>Rebel Dealer</b> moves between five sewer spots every 10 minutes, sells at 20% off and stocks one AKM. Items above your level can be <b>rented</b> at 3× price or <b>unlocked</b> (unlock price drops as you level). Paying from the bank adds a fee.</p>
      <h3>Downing</h3><p>At 0 HP you go down. <b>Standard:</b> you bleed out in ~45s unless revived; enemies can finish you. <b>Casual:</b> you slowly recover and get up with 30% HP. Revive a downed player by holding <b>R</b> with fists (12s) or a bandage/medkit (5s). Revived players stay friendly for a while. Press <b>F</b> with a melee to finish someone downed (+30 HP).</p>
      <h3>Danger zones</h3><p><b>Subway</b>: under the Central Plaza. Trains run through — stay off the tracks. The elevator on the far platform drops into <b>Vibe Check</b>: three big safes, golden scrap, a golden crate and the grinder pit. The elevator can't be called from below — wait for someone above to bring it down, or reset. <b>Sewers</b>: manholes behind the Thrift Store and in front of Vibin', a cave by Armory 2, and a ladder in the Subway. The secret <b>?</b> room holds a big safe and the Mystery Crate. <b>Airdrops</b> land every 7–10 minutes at the yellow map markers.</p>
      <h3>Bounties</h3><p>Three kills in a row puts a bounty on your head (+$300 per kill, up to $5,000). Kill a bounty target to collect it. Hold Tab to see the list.</p></div>`, true, '820px');
  },
  store() {
    const b = panel('STORE', `<div class="note" style="margin-bottom:10px">Passes are bought with bank money. Bank: <b>${fmt(G.save.bank)}</b></div>
      ${PASSES.map(p => `<div class="it" style="cursor:default"><span><b>${p.name}</b><br><span class="note">${p.desc}</span></span><span>${G.hasPass(p.id) ? '<span class="p">OWNED</span>' : `<button class="btn sm" data-p="${p.id}">${p.price ? fmt(p.price) : 'FREE'}</button>`}</span></div>`).join('')}`);
    on(b, '[data-p]', 'click', (el) => { G.buyPass(PASSES.find(p => p.id === el.dataset.p)); open('store', curData); });
  },
  atm(a) {
    const P = G.P, s = G.save, ready = G.allowanceReady();
    const left = Math.max(0, ALLOWANCE_SEC - s.allowanceT);
    const b = panel('ATM' + (a?.name ? ' — ' + a.name : ''), `<div class="kv">
      <span>Bank balance</span><span class="big">${fmt(s.bank)}</span>
      <span>Cash on you</span><span class="big" style="color:#ffd36b">${fmt(P.cash)}</span></div>
      <h3>Deposit</h3><div class="row"><input type="number" id="dep" min="0" placeholder="amount"><button class="btn" data-a="dep">Deposit</button><button class="btn" data-a="depall">Deposit all</button></div>
      <h3>Withdraw (max ${fmt(MAX_WITHDRAW)} per transaction)</h3><div class="row"><input type="number" id="wd" min="0" placeholder="amount"><button class="btn" data-a="wd">Withdraw</button><button class="btn sm" data-w="250">$250</button><button class="btn sm" data-w="1000">$1,000</button><button class="btn sm" data-w="5000">$5,000</button></div>
      <h3>Allowance</h3><div class="row">${ready ? `<button class="btn green" data-a="allow">Claim ${fmt(G.allowanceAmount())}</button>` : `<span>Next allowance (${fmt(G.allowanceAmount())}) in <b>${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</b></span>`}</div>
      <h3>Redeem codes</h3><div class="row"><input type="text" id="code" placeholder="ENTER CODE" style="text-transform:uppercase"><button class="btn" data-a="code">Redeem</button></div>
      <div class="note" style="margin-top:12px">Press E or Esc to close.</div>`);
    const re = () => open('atm', a);
    on(b, '[data-a=dep]', 'click', () => { G.deposit(+b.querySelector('#dep').value || 0); re(); });
    on(b, '[data-a=depall]', 'click', () => { G.deposit(P.cash); re(); });
    on(b, '[data-a=wd]', 'click', () => { G.withdraw(+b.querySelector('#wd').value || 0); re(); });
    on(b, '[data-w]', 'click', (el) => { G.withdraw(+el.dataset.w); re(); });
    on(b, '[data-a=allow]', 'click', () => { G.claimAllowance(); re(); });
    on(b, '[data-a=code]', 'click', () => { G.redeem(b.querySelector('#code').value); re(); });
    b.querySelector('#code').addEventListener('keydown', (e) => { if (e.key === 'Enter') { G.redeem(e.target.value); re(); } e.stopPropagation(); });
  },
  shop(d) { renderShop(d); },
  inventory() {
    const P = G.P;
    const b = panel('INVENTORY', `<div class="note">Slots: <b>${G.invSlotsUsed()}/${G.invCap()}</b> · Cash ${fmt(P.cash)}</div>
      <h3>Hotbar</h3><table class="t">${P.inv.map((e, i) => { const it = ITEM[e.id]; return `<tr><td>${i + 1}</td><td><b>${it.name}</b>${i === P.eq ? ' <span class="p" style="color:#e0453c">(held)</span>' : ''}</td><td>${invInfo(e)}</td><td>${it.s || 0} slot</td><td class="row">
        <button class="btn sm" data-eq="${i}">Hold</button>${i > 1 ? `<button class="btn sm" data-up="${i}">▲</button>` : ''}${i > 0 && i < P.inv.length - 1 ? `<button class="btn sm" data-dn="${i}">▼</button>` : ''}${e.id !== 'fists' ? `<button class="btn sm red" data-dr="${i}">Drop</button>` : ''}</td></tr>`; }).join('')}</table>
      <h3>Worn</h3><table class="t">${['vest', 'helmet', 'pack', 'suit', 'eyes'].map(s => { const a = P.armor[s]; return `<tr><td style="width:80px;text-transform:capitalize">${s}</td><td>${a ? `<b>${ITEM[a.id].name}</b>${ITEM[a.id].dur ? ` · ${Math.round(a.dur)}/${ITEM[a.id].dur}` : ''}` : '<span class="note">empty</span>'}</td><td>${a ? `<button class="btn sm red" data-da="${s}">Drop</button>` : ''}</td></tr>`; }).join('')}</table>`);
    on(b, '[data-eq]', 'click', (el) => { G.equip(+el.dataset.eq); open('inventory'); });
    on(b, '[data-up]', 'click', (el) => { G.moveInv(+el.dataset.up, +el.dataset.up - 1); open('inventory'); });
    on(b, '[data-dn]', 'click', (el) => { G.moveInv(+el.dataset.dn, +el.dataset.dn + 1); open('inventory'); });
    on(b, '[data-dr]', 'click', (el) => { G.dropInv(+el.dataset.dr); open('inventory'); });
    on(b, '[data-da]', 'click', (el) => { G.dropArmor(el.dataset.da); open('inventory'); });
  },
  map() { renderMap(G.P.alive ? G.P.zone : 'surface'); },
  death(info) {
    const b = panel('YOU DIED', `<div style="font-size:16px;line-height:1.8">Killed by <b style="color:#ff6a5a">${info.by}</b>${info.weapon ? ' — ' + info.weapon : ''}<br>
      You dropped your pocket cash share${info.lost ? ' and ' + info.lost + ' item(s)' : ''}.<br><span class="note">Your bank (${fmt(G.save.bank)}) is safe.</span></div>
      <div class="row" style="margin-top:16px"><button class="btn red" data-a="r" id="rsp">Respawn</button><button class="btn" data-a="m">Main Menu</button></div>`, false);
    const btn = b.querySelector('#rsp'); btn.classList.add('dis'); let n = 3; btn.textContent = 'Respawn (' + n + ')';
    const iv = setInterval(() => { n--; if (n <= 0) { clearInterval(iv); btn.classList.remove('dis'); btn.textContent = 'Respawn'; } else btn.textContent = 'Respawn (' + n + ')'; }, 1000);
    on(b, '[data-a=r]', 'click', () => G.respawn());
    on(b, '[data-a=m]', 'click', () => { G.respawn(); G.toMenu(); });
  },
};
export function death(info) { $('downed').classList.add('hide'); open('death', info); }

function invInfo(e) {
  const it = ITEM[e.id];
  if (isGun(it)) return `${e.mag}/${it.mag} · ${e.reserve} reserve`;
  if (e.count) return 'x' + e.count;
  if (e.charges !== undefined) return e.charges + ' sprays';
  return '';
}

// ---------- shop ----------
const CATS = [['melee', 'Melee'], ['pistol', 'Pistols'], ['smg', 'SMGs'], ['shotgun', 'Shotguns'], ['rifle', 'Rifles'], ['sniper', 'Snipers'], ['launcher', 'Launchers'], ['throw', 'Throwables'], ['med', 'Medical'], ['armor', 'Armor'], ['tool', 'Tools'], ['kit', 'Kits'], ['sell', 'SELL / AMMO']];
let shopCat = 'pistol', shopSel = null, payBank = false;
function renderShop(d) {
  const P = G.P, kind = d.kind, stock = G.stockOf(kind);
  const items = ITEMS.filter(i => stock[i.id] !== undefined || (kind === 'rebel' && i.r));
  const cats = CATS.filter(([c]) => c === 'sell' || items.some(i => i.type === c));
  if (!cats.find(c => c[0] === shopCat)) shopCat = cats[0][0];
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:10px"><span>Cash <b style="color:#7dff9a">${fmt(P.cash)}</b> · Bank <b>${fmt(G.save.bank)}</b> · Level <b>${G.save.level}</b> · Slots <b>${G.invSlotsUsed()}/${G.invCap()}</b></span>
    <label style="pointer-events:auto;cursor:pointer"><input type="checkbox" id="pb" ${payBank ? 'checked' : ''}> Pay with bank (+fee)</label></div>
    <div class="grid"><div class="cats">${cats.map(([c, n]) => `<button class="btn ${c === shopCat ? 'on' : ''}" data-c="${c}">${n}</button>`).join('')}</div><div class="list" id="sl"></div><div class="detail" id="sd"></div></div>
    <div class="note" style="margin-top:8px">${kind === 'dealer' ? 'Dealers share one street stock. Restocks every 5 minutes.' : kind === 'armory' ? 'Armory stock — Weaponry pass holders only. Restocks every 5 minutes.' : 'Rebel Dealer — 20% off street prices, rare stock. Moves every 10 minutes.'}</div>`;
  menu.innerHTML = '';
  const body = panel(d.name.toUpperCase(), wrap, true, '1100px');
  const list = body.querySelector('#sl'), det = body.querySelector('#sd');
  body.querySelector('#pb').addEventListener('change', (e) => { payBank = e.target.checked; renderShop(d); });
  on(body, '[data-c]', 'click', (el) => { shopCat = el.dataset.c; shopSel = null; renderShop(d); });
  if (shopCat === 'sell') {
    list.innerHTML = P.inv.map((e, i) => { const it = ITEM[e.id]; if (e.id === 'fists') return ''; const v = it.sell ?? Math.round((it.d || it.a || it.r || 0) * 0.5); return `<div class="it"><span><b>${it.name}</b> <span class="os">${invInfo(e)}</span></span><span class="row">${isGun(it) ? `<button class="btn sm" data-rf="${i}">Refill ${fmt(it.ammo + (payBank ? G.bankFee(it.ammo) : 0))}</button>` : ''}<button class="btn sm" data-sl="${i}">Sell ${fmt(v * (e.count || 1))}</button></span></div>`; }).join('')
      + ['vest', 'helmet', 'pack', 'suit', 'eyes'].map(s => P.armor[s] ? `<div class="it"><span><b>${ITEM[P.armor[s].id].name}</b> <span class="os">worn</span></span><button class="btn sm" data-sa="${s}">Sell</button></div>` : '').join('') || '<div class="it">Nothing to sell.</div>';
    det.innerHTML = '<b>Selling</b><br>Items sell for 50% of their street price (armor scales with durability). Scrap sells for $40, golden scrap for $250.<br><br><b>Ammo</b><br>Refill tops up a gun to 5 magazines of reserve.';
    on(list, '[data-sl]', 'click', (el) => { G.sell(+el.dataset.sl); renderShop(d); });
    on(list, '[data-sa]', 'click', (el) => { G.sellArmor(el.dataset.sa); renderShop(d); });
    on(list, '[data-rf]', 'click', (el) => { G.refill(+el.dataset.rf, payBank); renderShop(d); });
    return;
  }
  const rows = items.filter(i => i.type === shopCat);
  if (!shopSel || !rows.find(r => r.id === shopSel)) shopSel = rows[0]?.id;
  list.innerHTML = rows.map(it => {
    const price = G.shopPrice(it, kind), st = stock[it.id] ?? 0, unl = G.isUnlocked(it);
    return `<div class="it ${it.id === shopSel ? 'on' : ''}" data-i="${it.id}"><span>${it.name} ${!unl ? `<span class="lk">LV ${it.lv}</span>` : ''}</span><span>${st ? '' : '<span class="os">sold out </span>'}<span class="p">${price ? fmt(price) : 'FREE'}</span></span></div>`;
  }).join('');
  on(list, '[data-i]', 'click', (el) => { shopSel = el.dataset.i; renderShop(d); });
  const it = ITEM[shopSel];
  if (!it) { det.innerHTML = 'Nothing here.'; return; }
  const price = G.shopPrice(it, kind), st = stock[it.id] ?? 0, unl = G.isUnlocked(it), fee = payBank ? G.bankFee(price) : 0;
  const stat = (k, v) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`;
  let s = `<div class="nm">${it.name}</div><div class="note">${it.type.toUpperCase()} · Unlock level ${it.lv || 1}</div>`;
  if (isGun(it)) s += stat('Damage', it.dmg + (it.pellets > 1 ? ' × ' + it.pellets : '')) + stat('Headshot', '×' + it.head) + stat('Fire rate', it.rpm + ' RPM' + (it.auto ? ' (auto)' : '')) + stat('Magazine', it.mag) + stat('Reload', it.reload + 's') + (it.radius ? stat('Blast radius', it.radius + 'm') : '') + stat('Refill price', fmt(it.ammo));
  else if (isMeleeish(it)) s += stat('Damage', it.dmg) + stat('Swing time', it.rate + 's') + stat('Range', it.range + 'm') + (it.register ? stat('Breaks registers', 'Yes') : '') + (it.safe ? stat('Forces safes', 'Yes') : '');
  else if (it.type === 'armor') s += (it.absorb ? stat('Absorbs', Math.round(it.absorb * 100) + '%') + stat('Durability', it.dur) : '') + (it.extra ? stat('Extra slots', '+' + it.extra) : '') + (it.hazmat ? stat('Immune to', 'Fire & gas') : '') + (it.thermal ? stat('Thermal', 'Press N') : '');
  else if (it.type === 'med') s += it.heal ? stat('Heals', it.heal + ' HP') + stat('Use time', it.use + 's') : stat('Effect', 'Infinite stamina, +15% dmg for ' + it.rage + 's');
  else if (it.type === 'throw') s += (it.dmg ? stat('Damage', it.dmg) : '') + (it.radius ? stat('Radius', it.radius + 'm') : '') + (it.remote ? stat('Detonation', 'Remote (click again)') : it.fuse ? stat('Fuse', it.fuse + 's') : '');
  else if (it.type === 'kit') s += stat('Contains', it.kit.map(k => ITEM[k].name).join(', '));
  s += stat('Slots', it.s ?? 0) + stat('Stock', st) + stat('Sell value', fmt(Math.round((price || 0) * 0.5)));
  s += '<div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">';
  if (unl) s += `<button class="btn green ${st ? '' : 'dis'}" data-b="buy">Buy ${price ? fmt(price + fee) : 'FREE'}</button>`;
  else {
    const up = G.unlockPrice(it);
    s += `<button class="btn ${st ? '' : 'dis'}" data-b="rent">Rent (early buy, 3×) ${fmt(price * 3 + (payBank ? G.bankFee(price * 3) : 0))}</button>`;
    s += `<button class="btn red" data-b="unlock">Unlock now ${fmt(up + (payBank ? G.bankFee(up) : 0))}</button><div class="note">Unlocks free at level ${it.lv}. Unlock price drops as you level up.</div>`;
  }
  s += '</div>';
  det.innerHTML = s;
  on(det, '[data-b]', 'click', (el) => { G.buy(it.id, kind, el.dataset.b, payBank); renderShop(d); });
}

// ---------- map ----------
function renderMap(zone) {
  const W = G.W;
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="row" style="margin-bottom:8px">${[['surface', 'SECTOR-07'], ['subway', 'Subway'], ['sewer', 'Sewers'], ['vibe', 'Vibe Check']].map(([z, n]) => `<button class="btn sm ${z === zone ? 'red' : ''}" data-z="${z}">${n}</button>`).join('')}</div>
    <canvas id="mapc" width="760" height="760"></canvas>
    <div class="legend"><span><i style="background:${MAP_MARKERS.zone}"></i>Combat zones</span><span><i style="background:${MAP_MARKERS.armory}"></i>Armories</span><span><i style="background:${MAP_MARKERS.dealer};border:1px solid #aaa"></i>Dealers</span><span><i style="background:${MAP_MARKERS.atm}"></i>ATMs</span><span><i style="background:${MAP_MARKERS.airdrop}"></i>Airdrop spots</span><span><i style="background:#c9a"></i>Safes</span><span><i style="background:#fff"></i>You</span></div>`;
  menu.innerHTML = '';
  const b = panel('MAP', wrap, true);
  on(b, '[data-z]', 'click', (el) => renderMap(el.dataset.z));
  const c = b.querySelector('#mapc'), x = c.getContext('2d');
  x.fillStyle = '#1a1b1d'; x.fillRect(0, 0, 760, 760);
  let tx, tz, sc;
  const inZone = (y) => (zone === 'surface' ? y > -6 : zone === 'subway' ? y <= -6 && y > -19 : zone === 'sewer' ? y <= -19 && y > -38 : y <= -38);
  if (zone === 'surface') {
    sc = 760 / (EDGE * 2 + 8); tx = (v) => (v + EDGE + 4) * sc; tz = tx;
    x.fillStyle = '#45433f'; x.fillRect(tx(-EDGE), tz(-EDGE), EDGE * 2 * sc, EDGE * 2 * sc);
    x.fillStyle = '#2a2b2e';
    for (const r of ROADS) { x.fillRect(tx(r - 6), tz(-EDGE), 12 * sc, EDGE * 2 * sc); x.fillRect(tx(-EDGE), tz(r - 6), EDGE * 2 * sc, 12 * sc); }
    x.strokeStyle = '#777'; x.lineWidth = 3; x.strokeRect(tx(-EDGE), tz(-EDGE), EDGE * 2 * sc, EDGE * 2 * sc);
    for (const bd of W.buildings) { x.fillStyle = bd.name?.startsWith('Armory') ? '#2a4a7a' : '#6a655d'; x.fillRect(tx(bd.x0), tz(bd.z0), (bd.x1 - bd.x0) * sc, (bd.z1 - bd.z0) * sc); }
    x.fillStyle = '#6a5a43'; x.fillRect(tx(118), tz(60), 52 * sc, 44 * sc);
  } else {
    const u = W.under[zone];
    const w = u.rows[0].length * u.cs, h = u.rows.length * u.cs;
    sc = 720 / Math.max(w, h); const offx = (760 - w * sc) / 2, offz = (760 - h * sc) / 2;
    tx = (v) => offx + (v - u.ox) * sc; tz = (v) => offz + (v - u.oz) * sc;
    for (let j = 0; j < u.rows.length; j++) for (let i = 0; i < u.rows[0].length; i++) {
      const ch = u.rows[j][i]; if (ch === '#') continue;
      x.fillStyle = ch === 't' ? '#4a3a2a' : ch === 'w' ? '#2f4a3a' : ch === 'g' ? '#3a0a0a' : '#5a5a55';
      x.fillRect(tx(u.ox + i * u.cs), tz(u.oz + j * u.cs), u.cs * sc + 0.5, u.cs * sc + 0.5);
    }
  }
  const dot = (px, pz, col, r = 5, sq) => { x.fillStyle = col; x.strokeStyle = '#000'; x.lineWidth = 1.5; x.beginPath(); if (sq) x.rect(tx(px) - r, tz(pz) - r, r * 2, r * 2); else x.arc(tx(px), tz(pz), r, 0, 7); x.fill(); x.stroke(); };
  const text = (t, px, pz, col = '#fff', size = 12, dy = 0) => { x.font = `700 ${size}px Segoe UI`; x.textAlign = 'center'; x.fillStyle = '#000'; x.fillText(t, tx(px) + 1, tz(pz) + 1 + dy); x.fillStyle = col; x.fillText(t, tx(px), tz(pz) + dy); };
  for (const o of G.inter) if (o.kind === 'safe' && inZone(o.y)) dot(o.x, o.z, o.open ? '#555' : '#c9a', o.big ? 4 : 3, true);
  for (const o of G.inter) if (o.kind === 'register' && inZone(o.y)) dot(o.x, o.z, o.open ? '#555' : '#9c9', 3, true);
  if (zone === 'surface') for (const [ax, az] of W.airdrops) dot(ax, az, MAP_MARKERS.airdrop, 5);
  if (zone === 'surface' && G.airdrop) { dot(G.airdrop.x, G.airdrop.z, '#ff3', 10); text('AIRDROP', G.airdrop.x, G.airdrop.z, '#ff3', 13, -14); }
  for (const a of W.atms) if (inZone(a.y)) dot(a.x, a.z, MAP_MARKERS.atm, 5);
  for (const d of W.dealers) if (inZone(d.y)) { dot(d.x, d.z, MAP_MARKERS.dealer, 6); }
  for (const a of W.armories) if (inZone(a.y)) { dot(a.x, a.z, MAP_MARKERS.armory, 7); }
  if (zone === 'sewer') { for (const [rx, rz, n] of W.rebelSpots) dot(rx, rz, '#7a2020', 4); dot(G.rebel.x, G.rebel.z, '#ff3030', 7); text('Rebel Dealer', G.rebel.x, G.rebel.z, '#ff8080', 11, -10); }
  for (const t of W.teleports) if (inZone(t.y)) { dot(t.x, t.z, '#8af', 4); }
  for (const l of W.labels) if (l.map && (zone === 'surface' ? !W.under.subway || true : false)) { }
  const zoneLabels = W.labels.filter(l => l.map && zoneOfLabel(l, W) === zone);
  for (const l of zoneLabels) text(l.text, l.x, l.z, l.type === 'zone' ? '#ff8a7a' : l.type === 'armory' ? '#8ab8ff' : '#ddd', l.type === 'poi' ? 11 : 13);
  const P = G.P;
  if (P.alive && P.zone === zone) {
    x.save(); x.translate(tx(P.pos.x), tz(P.pos.z)); x.rotate(-P.yaw); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, -10); x.lineTo(7, 8); x.lineTo(0, 4); x.lineTo(-7, 8); x.closePath(); x.fill(); x.stroke(); x.restore();
  }
  for (const bt of G.bots) if (bt.friendT > 0 && !bt.dead && bt.zone === zone) dot(bt.pos.x, bt.pos.z, '#7dff9a', 4);
}
function zoneOfLabel(l, W) {
  if (!W._labelZones) {
    W._labelZones = new Map();
    const under = { subway: ['Subway platforms'], sewer: ['Thrift Sewer Safe Room', '?'], vibe: ['Vibe Check'] };
    for (const lb of W.labels) { let z = 'surface'; for (const [k, v] of Object.entries(under)) if (v.includes(lb.text)) z = k; W._labelZones.set(lb, z); }
  }
  return W._labelZones.get(l);
}

// ---------- HUD ----------
let hudT = 0;
const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export function hud(P, G, ex) {
  $('flash').style.opacity = clamp(ex.flash / 2, 0, 1);
  $('gas').style.opacity = ex.gas > 0 ? 0.35 : 0;
  const yawDeg = ((-P.yaw * 180 / Math.PI) % 360 + 360) % 360;
  let cs = ''; for (let a = -180; a <= 540; a += 45) { const px = 180 + (a - yawDeg) * 2; if (px > -20 && px < 380) cs += `<div style="left:${px - 8}px">${dirs[((a / 45) % 8 + 8) % 8]}</div>`; }
  $('compass').innerHTML = cs;
  hudT -= 1;
  if (hudT > 0) return; hudT = 4;
  const s = G.save, it = ITEM[P.inv[P.eq]?.id] || ITEM.fists;
  $('hpb').firstChild.style.width = (P.downed ? 0 : P.hp) + '%'; $('hpt').textContent = P.downed ? 'DOWNED' : Math.ceil(P.hp);
  $('stb').firstChild.style.width = P.stamina + '%'; $('stb').firstChild.style.background = P.rageT > 0 ? '#ff4a3a' : '#d8c34a';
  const v = P.armor.vest, h = P.armor.helmet;
  $('vb').firstChild.style.width = v ? (v.dur / ITEM[v.id].dur * 100) + '%' : '0%';
  $('hb').firstChild.style.width = h ? (h.dur / ITEM[h.id].dur * 100) + '%' : '0%';
  $('xpb').firstChild.style.width = (s.xp / xpForLevel(s.level) * 100) + '%';
  $('lvl').textContent = 'Level ' + s.level + ' · ' + (G.mode === 'casual' ? 'Casual' : 'Standard');
  $('cash').textContent = fmt(P.cash);
  $('bank').textContent = 'Bank ' + fmt(s.bank);
  const left = Math.max(0, ALLOWANCE_SEC - s.allowanceT);
  $('allow').textContent = left <= 0 ? 'Allowance ready — claim at an ATM' : 'Allowance in ' + Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
  $('bounty').textContent = P.bounty ? 'BOUNTY ON YOU: ' + fmt(P.bounty) : '';
  $('fps').classList.toggle('hide', !s.settings.fps); $('fps').textContent = G.fps + ' FPS';
  $('hotbar').innerHTML = P.inv.slice(0, 10).map((e, i) => `<div class="hs ${i === P.eq ? 'on' : ''}"><b>${(i + 1) % 10}</b><div class="n">${ITEM[e.id].name}</div><div class="a">${invInfo(e)}</div></div>`).join('');
  $('slots').textContent = 'Slots ' + G.invSlotsUsed() + '/' + G.invCap();
  const e = P.inv[P.eq];
  $('wname').textContent = it.name.toUpperCase() + (P.reloadT > 0 ? ' — RELOADING' : P.using ? ' — USING' : '');
  if (e && isGun(it)) { $('amag').textContent = e.mag; $('ares').textContent = '/ ' + e.reserve; }
  else if (e?.count !== undefined) { $('amag').textContent = 'x' + e.count; $('ares').textContent = ''; }
  else { $('amag').textContent = ''; $('ares').textContent = ''; }
  $('xh').style.opacity = P.ads > 0.6 && it.scope ? 0 : P.ads > 0.6 ? 0.5 : 1;
  $('downed').classList.toggle('hide', !P.downed || !P.alive);
  if (P.downed) { $('dbar').style.width = P.downHp + '%'; $('dsub').textContent = G.mode === 'casual' ? 'Recovering...' : 'Bleeding out'; }
  $('vig').style.opacity = P.alive && !P.downed ? clamp((45 - P.hp) / 45, 0, 0.8) + hurtFlash : P.downed ? 0.85 : 0;
  hurtFlash = Math.max(0, hurtFlash - 0.08);
}
let hurtFlash = 0;
export function hurt(d) { hurtFlash = Math.min(0.7, hurtFlash + d / 40); }
let hmT;
export function hitmarker(head) { const h = $('hm'); h.classList.toggle('head', head); h.style.transition = 'none'; h.style.opacity = 1; clearTimeout(hmT); hmT = setTimeout(() => { h.style.transition = 'opacity .25s'; h.style.opacity = 0; }, 60); }
let lastPrompt = '';
export function prompt(text, prog) {
  const key = text + '|' + (prog !== undefined ? Math.round(prog * 50) : '');
  if (key === lastPrompt) return; lastPrompt = key;
  $('prompt').innerHTML = text ? `${text}${prog !== undefined ? `<div class="pb"><i style="width:${clamp(prog, 0, 1) * 100}%"></i></div>` : ''}` : '';
}
export function toast(msg, type = '') {
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; $('toasts').appendChild(t);
  while ($('toasts').children.length > 5) $('toasts').firstChild.remove();
  setTimeout(() => t.remove(), 3800);
}
export function feed(a, b, w, killed, downed) {
  const d = document.createElement('div');
  d.innerHTML = `<b>${a}</b> <span class="${killed ? 'k' : 'd'}">${killed ? '✖' : '▼'} ${w}</span> <b>${b}</b>`;
  $('feed').prepend(d); while ($('feed').children.length > 6) $('feed').lastChild.remove();
  setTimeout(() => d.remove(), 7000);
}
let banT;
export function banner(t, s) { $('bt').textContent = t; $('bs').textContent = s || ''; $('banner').style.opacity = 1; clearTimeout(banT); banT = setTimeout(() => $('banner').style.opacity = 0, 3500); }
let zT;
export function zone(n) { $('zname').textContent = n.toUpperCase(); }
let cpT, cpSum = 0;
export function cashPop(a) { cpSum += a; $('cashpop').textContent = '+' + fmt(cpSum); $('cashpop').style.opacity = 1; clearTimeout(cpT); cpT = setTimeout(() => { $('cashpop').style.opacity = 0; cpSum = 0; }, 1500); }
export function scope(on) { $('scope').classList.toggle('hide', !on); }
export function updateReady(v) { const u = $('updbar'); u.classList.remove('hide'); u.textContent = 'Update ' + v + ' downloaded — applies on the menu or after death. Press F9 to restart now (progress saves).'; }
export function fade(dur, cb) {
  const f = $('fade'); fadingNow = true; f.style.opacity = 1;
  setTimeout(() => { cb(); setTimeout(() => { f.style.opacity = 0; fadingNow = false; }, dur * 400); }, 380);
}

const tagPool = [];
export function tags(bots, cam) {
  const box = $('tags');
  const show = G.save.settings.names;
  let n = 0;
  const v = new G.THREE.Vector3();
  if (show) for (const b of bots) {
    if (b.dead || b.zone !== G.P.zone) continue;
    const d = b.pos.distanceTo(G.P.pos);
    if (d > 45 || (!b.seesPlayer && d > 12 && b.friendT <= 0)) continue;
    v.set(b.pos.x, b.pos.y + (b.downed ? 1.1 : 2.35), b.pos.z).project(cam);
    if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) continue;
    let el = tagPool[n]; if (!el) { el = document.createElement('div'); el.className = 'tag'; box.appendChild(el); tagPool.push(el); }
    el.style.display = ''; el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
    el.className = 'tag' + (b.friendT > 0 ? ' f' : b.downed ? ' dn' : b.bounty ? ' b' : '');
    const h = `${b.name}<small>${b.downed ? 'DOWNED — [R] revive / [F] finish' : 'Lv ' + b.level + (b.bounty ? ' · BOUNTY ' + fmt(b.bounty) : '')}</small>`;
    if (el._h !== h) { el.innerHTML = h; el._h = h; }
    n++;
  }
  for (let i = n; i < tagPool.length; i++) tagPool[i].style.display = 'none';
}
function playerList() {
  const all = [G.P, ...G.bots.filter(b => !b.dead)].sort((a, b) => (b.bounty || 0) - (a.bounty || 0) || (b.kills || 0) - (a.kills || 0));
  $('plist').innerHTML = `<table><tr><th>Player</th><th>Level</th><th>Kills</th><th>Bounty</th><th>Where</th></tr>${all.map(c => `<tr><td>${c.isPlayer ? '<b style="color:#e0453c">You</b>' : c.name}${c.friendT > 0 ? ' <span style="color:#7dff9a">(ally)</span>' : ''}</td><td>${c.isPlayer ? G.save.level : c.level}</td><td>${c.kills || 0}</td><td>${c.bounty ? fmt(c.bounty) : '-'}</td><td>${{ surface: 'Sector', subway: 'Subway', sewer: 'Sewers', vibe: 'Vibe Check' }[c.zone]}</td></tr>`).join('')}</table>`;
}

// ---------- lockpick ----------
export function lockpick(n, cb) {
  const lp = $('lp'); lp.classList.remove('hide'); lpOn = true; G.unlock();
  let i = 0, pos = 0, dir = 1, done = false;
  const zoneL = 42, zoneW = 16;
  const draw = () => {
    lp.innerHTML = `<h2 style="font:900 26px Impact">LOCKPICK</h2><div class="note">Click or press Space when the square is inside the green zone. ${n} pins. Esc to stop.</div>
      ${Array.from({ length: n }, (_, k) => `<div class="track"><div class="zone" style="left:${zoneL}%;width:${zoneW}%"></div><div class="sq ${k < i ? 'done' : ''}" style="left:calc(${k < i ? zoneL + zoneW / 2 : k === i ? pos : 0}% - 11px)"></div></div>`).join('')}`;
  };
  const speed = 75 + n * 15;
  let last = performance.now();
  const tick = (t) => {
    if (done) return;
    const dt = (t - last) / 1000; last = t;
    pos += dir * speed * dt; if (pos > 100) { pos = 100; dir = -1; } if (pos < 0) { pos = 0; dir = 1; }
    draw(); requestAnimationFrame(tick);
  };
  const finish = (ok, broke) => { done = true; lpOn = false; lp.classList.add('hide'); removeEventListener('keydown', key, true); lp.removeEventListener('mousedown', press); cb(ok, broke); G.lock(); };
  const press = () => {
    if (pos >= zoneL && pos <= zoneL + zoneW) { i++; G.sfx.click(); pos = 0; dir = 1; if (i >= n) { G.sfx.metal(); finish(true, false); } }
    else { G.sfx.denied(); finish(false, Math.random() < 0.35); }
  };
  const key = (e) => { if (e.code === 'Space') { e.preventDefault(); e.stopPropagation(); press(); } if (e.code === 'Escape') { e.stopPropagation(); finish(false, false); } };
  addEventListener('keydown', key, true); lp.addEventListener('mousedown', press);
  requestAnimationFrame(tick);
}
