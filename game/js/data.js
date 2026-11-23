// d = dealer price, a = armory price, r = rebel price, lv = unlock level, s = slots
const M = (id, name, o) => ({ id, name, type: 'melee', s: 1, range: 2.6, stam: 8, ...o });
const G = (id, name, type, o) => ({ id, name, type, s: 3, head: 1.6, spread: 0.012, recoil: 0.012, reload: 2.0, range: 250, pellets: 1, ...o });

export const ITEMS = [
  M('fists', 'Fists', { d: 0, lv: 1, dmg: 8, rate: 0.35, s: 0, register: true, revive: true, owned: true }),
  M('knuckledusters', 'Knuckledusters', { d: 100, lv: 1, dmg: 12, rate: 0.33, register: true, revive: true }),
  M('nunchucks', 'Nunchucks', { d: 0, a: 0, lv: 1, dmg: 10, rate: 0.24 }),
  M('shiv', 'Shiv', { d: 10, lv: 1, dmg: 14, rate: 0.38 }),
  M('wrench', 'Wrench', { d: 20, lv: 1, dmg: 18, rate: 0.55 }),
  M('bayonet', 'Bayonet', { d: 90, a: 120, lv: 3, dmg: 20, rate: 0.42 }),
  M('golfclub', 'Golf Club', { d: 55, lv: 2, dmg: 20, rate: 0.6, range: 3 }),
  M('shovel', 'Shovel', { d: 60, lv: 2, dmg: 22, rate: 0.65, range: 3 }),
  M('bat', 'Bat', { d: 65, lv: 2, dmg: 22, rate: 0.6, range: 3 }),
  M('balisong', 'Balisong', { d: 70, lv: 4, dmg: 17, rate: 0.32 }),
  M('taiga', 'Taiga', { d: 120, a: 150, lv: 6, dmg: 24, rate: 0.52 }),
  M('rambo', 'Rambo', { d: 110, a: 140, lv: 6, dmg: 22, rate: 0.45 }),
  M('fireaxe', 'Fire Axe', { d: 150, lv: 5, dmg: 32, rate: 0.8, range: 3, s: 2 }),
  M('baton', 'Baton', { a: 160, lv: 5, dmg: 18, rate: 0.45, stun: true }),
  M('machete', 'Machete', { a: 300, lv: 9, dmg: 28, rate: 0.6 }),
  M('metalbat', 'Metal Bat', { d: 325, lv: 10, dmg: 28, rate: 0.62, range: 3, s: 2 }),
  M('katana', 'Katana', { d: 350, lv: 15, dmg: 30, rate: 0.55, range: 3.2, s: 2 }),
  M('sledgehammer', 'Sledgehammer', { d: 375, lv: 20, dmg: 42, rate: 1.1, range: 3.2, s: 3, register: true }),
  M('chainsaw', 'Chainsaw', { d: 400, lv: 25, dmg: 9, rate: 0.1, s: 3, auto: true, stam: 1 }),
  M('hallowsblade', "Hallow's Blade", { d: 700, a: 700, lv: 30, dmg: 34, rate: 0.55, s: 2 }),
  M('curseddagger', 'Cursed Dagger', { d: 999, lv: 35, dmg: 26, rate: 0.32 }),
  M('slayersword', "Slayer's Sword", { d: 9999, lv: 50, dmg: 45, rate: 0.7, range: 3.4, s: 3 }),
  M('slayer2', "Slayer's II", { d: 33333, lv: 60, dmg: 55, rate: 0.7, range: 3.4, s: 3 }),
  M('scythe', 'Scythe', { d: 55555, lv: 70, dmg: 60, rate: 0.8, range: 3.8, s: 3 }),
  M('eradicator', 'ERADICATOR', { d: 99999, lv: 80, dmg: 75, rate: 0.9, range: 3.6, s: 4 }),

  { id: 'crowbar', name: 'Crowbar', type: 'tool', d: 50, lv: 1, s: 1, dmg: 18, rate: 0.55, range: 2.8, stam: 8, register: true, safe: true },
  { id: 'lockpick', name: 'Lockpick', type: 'tool', d: 20, lv: 1, s: 0, stack: 5, lockpick: true },

  G('beretta', 'Beretta', 'pistol', { a: 250, lv: 1, dmg: 19, rpm: 450, mag: 15, ammo: 60 }),
  G('g17', 'G-17', 'pistol', { d: 250, a: 305, lv: 1, dmg: 21, rpm: 420, mag: 17, ammo: 60 }),
  G('hawkeye', 'Hawkeye', 'pistol', { d: 400, lv: 5, dmg: 24, rpm: 380, mag: 10, ammo: 80 }),
  G('m1911', 'M1911', 'pistol', { a: 536, lv: 3, dmg: 28, rpm: 380, mag: 7, ammo: 80 }),
  G('tec9', 'TEC-9', 'pistol', { d: 450, lv: 8, dmg: 14, rpm: 750, mag: 32, auto: true, spread: 0.03, ammo: 120 }),
  G('fnp45', 'FNP-45', 'pistol', { a: 800, lv: 10, dmg: 26, rpm: 400, mag: 15, ammo: 150 }),
  G('deagle', 'Deagle', 'pistol', { d: 900, a: 1125, lv: 12, dmg: 45, rpm: 220, mag: 7, recoil: 0.05, ammo: 200 }),
  G('g18', 'G-18', 'pistol', { a: 1050, lv: 18, dmg: 17, rpm: 1000, mag: 33, auto: true, spread: 0.03, ammo: 200 }),
  G('magnum', 'Magnum', 'pistol', { a: 1200, lv: 20, dmg: 55, rpm: 160, mag: 6, reload: 3, recoil: 0.06, ammo: 250 }),
  G('mac10', 'Mac-10', 'smg', { d: 700, lv: 10, dmg: 14, rpm: 1000, mag: 30, auto: true, spread: 0.032, s: 4, ammo: 180 }),
  G('uzi', 'Uzi', 'smg', { d: 900, lv: 14, dmg: 16, rpm: 800, mag: 32, auto: true, spread: 0.028, s: 4, ammo: 200 }),
  G('mp7', 'MP-7', 'smg', { a: 1700, lv: 22, dmg: 17, rpm: 850, mag: 40, auto: true, spread: 0.022, s: 4, ammo: 300 }),
  G('ump45', 'UMP-45', 'smg', { a: 1900, lv: 26, dmg: 22, rpm: 600, mag: 25, auto: true, spread: 0.02, s: 5, ammo: 300 }),
  G('tommy', 'Tommy', 'smg', { d: 1300, lv: 30, dmg: 21, rpm: 700, mag: 50, auto: true, spread: 0.026, s: 5, reload: 3.2, ammo: 350, maxUnlock: 161200 }),
  G('supershorty', 'Super-Shorty', 'shotgun', { a: 850, lv: 8, dmg: 9, pellets: 8, rpm: 70, mag: 3, spread: 0.06, s: 4, range: 40, ammo: 150 }),
  G('doublebarrel', 'Double Barrel', 'shotgun', { d: 600, lv: 6, dmg: 11, pellets: 8, rpm: 300, mag: 2, spread: 0.065, s: 5, range: 40, ammo: 120 }),
  G('ithaca', 'Ithaca 37', 'shotgun', { d: 1100, lv: 18, dmg: 9, pellets: 8, rpm: 150, mag: 5, spread: 0.055, s: 6, range: 45, ammo: 250 }),
  G('r870', 'Remington 870', 'shotgun', { d: 1200, lv: 16, dmg: 10, pellets: 8, rpm: 75, mag: 6, spread: 0.05, s: 6, range: 45, ammo: 250 }),
  G('sks', 'SKS', 'rifle', { d: 2000, lv: 24, dmg: 40, rpm: 300, mag: 10, s: 7, ammo: 400 }),
  G('aks74u', 'AKS-74U', 'rifle', { d: 2500, lv: 28, dmg: 24, rpm: 700, mag: 30, auto: true, spread: 0.018, s: 6, ammo: 450 }),
  G('m4a1', 'M4A1', 'rifle', { a: 3100, lv: 32, dmg: 26, rpm: 800, mag: 30, auto: true, spread: 0.014, s: 7, ammo: 500 }),
  G('fal', 'FAL 50.00', 'rifle', { a: 3300, lv: 36, dmg: 42, rpm: 350, mag: 20, s: 8, ammo: 550 }),
  G('scarh', 'SCAR-H', 'rifle', { a: 4500, lv: 45, dmg: 34, rpm: 600, mag: 20, auto: true, spread: 0.016, s: 8, ammo: 600 }),
  G('akm', 'AKM', 'rifle', { r: 5600, lv: 1, dmg: 34, rpm: 600, mag: 30, auto: true, spread: 0.02, recoil: 0.02, s: 8, pen: 0.6, ammo: 700, rare: true }),
  G('mosin', 'Mosin', 'sniper', { d: 1800, lv: 20, dmg: 80, rpm: 45, mag: 5, s: 8, recoil: 0.07, spread: 0.002, ammo: 400, bolt: true }),
  G('scout', 'Scout', 'sniper', { a: 3500, lv: 40, dmg: 78, rpm: 50, mag: 5, s: 8, scope: true, spread: 0.001, recoil: 0.06, ammo: 500, bolt: true }),
  G('flaregun', 'Flare Gun', 'launcher', { d: 200, lv: 1, dmg: 15, rpm: 60, mag: 1, s: 2, burn: true, ammo: 50, proj: 'flare' }),
  G('firework', 'Firework Launcher', 'launcher', { a: 1776, lv: 1, dmg: 60, rpm: 60, mag: 1, s: 7.5, radius: 6, ammo: 500, proj: 'firework', burn: true }),
  G('m320', 'M320', 'launcher', { a: 8000, lv: 50, dmg: 90, rpm: 60, mag: 1, s: 7, radius: 6, ammo: 1200, proj: 'grenade' }),
  G('rpg', 'RPG', 'launcher', { a: 15000, lv: 75, dmg: 150, rpm: 30, mag: 1, s: 10, radius: 8, ammo: 2500, proj: 'rocket', maxUnlock: 1000000 }),
  G('bfg', 'BFG', 'launcher', { a: 18000, lv: 85, dmg: 120, rpm: 90, mag: 3, s: 10, radius: 7, ammo: 3000, proj: 'plasma' }),
  G('hallowslauncher', "Hallow's Launcher", 'launcher', { lv: 1, dmg: 80, rpm: 50, mag: 1, s: 8, radius: 6, ammo: 1500, proj: 'pumpkin', rare: true }),

  { id: 'frag', name: 'Grenade', type: 'throw', d: 500, lv: 15, s: 2, stack: 3, dmg: 110, radius: 7, fuse: 3 },
  { id: 'molotov', name: 'Molotov', type: 'throw', d: 250, lv: 8, s: 2, stack: 3, dmg: 8, radius: 4, fire: true },
  { id: 'flashbang', name: 'Flashbang', type: 'throw', d: 300, lv: 10, s: 1, stack: 3, flash: true, radius: 14, fuse: 1.6 },
  { id: 'pipebomb', name: 'Pipe Bomb', type: 'throw', d: 400, lv: 12, s: 2, stack: 3, dmg: 95, radius: 6, fuse: 4 },
  { id: 'c4', name: 'C4', type: 'throw', d: 1000, lv: 30, s: 2, stack: 3, dmg: 140, radius: 7, remote: true },
  { id: 'csgrenade', name: 'CS Grenade', type: 'throw', a: 600, lv: 14, s: 1, stack: 3, gas: true, radius: 8, fuse: 2 },
  { id: 'incendiary', name: 'Incendiary', type: 'throw', a: 700, lv: 16, s: 1, stack: 3, dmg: 10, radius: 5, fire: true, fuse: 2 },
  { id: 'pepperspray', name: 'Pepper Spray', type: 'throw', a: 100, lv: 1, s: 1, spray: true, charges: 10 },

  { id: 'bandage', name: 'Bandage', type: 'med', d: 50, a: 60, lv: 1, s: 1, stack: 5, heal: 25, use: 2.5, stock: 5 },
  { id: 'medkit', name: 'Medkit', type: 'med', d: 200, a: 240, lv: 5, s: 2, stack: 3, heal: 60, use: 4, stock: 3 },
  { id: 'ragedose', name: 'Rage Dose', type: 'med', d: 300, lv: 20, s: 1, stack: 2, rage: 20, use: 1.5 },

  { id: 't1vest', name: 'T-1 Vest', type: 'armor', slot: 'vest', d: 500, a: 600, lv: 3, s: 0, absorb: 0.25, dur: 100 },
  { id: 't2vest', name: 'T-2 Vest', type: 'armor', slot: 'vest', d: 1500, a: 1700, lv: 20, s: 0, absorb: 0.4, dur: 150 },
  { id: 't3vest', name: 'T-3 Vest', type: 'armor', slot: 'vest', d: 2250, a: 2250, lv: 40, s: 0, absorb: 0.55, dur: 200 },
  { id: 'slayerarmor', name: "Slayer's Armor", type: 'armor', slot: 'vest', d: 1850, a: 1850, lv: 50, s: 0, absorb: 0.5, dur: 220 },
  { id: 'slayerarmor2', name: "Slayer's Armor II", type: 'armor', slot: 'vest', d: 22222, lv: 60, s: 0, absorb: 0.62, dur: 280 },
  { id: 'necromancer', name: 'Necromancer', type: 'armor', slot: 'vest', d: 66666, lv: 90, s: 0, absorb: 0.7, dur: 350 },
  { id: 't1helmet', name: 'T-1 Helmet', type: 'armor', slot: 'helmet', d: 200, a: 250, lv: 3, s: 0, absorb: 0.2, dur: 60 },
  { id: 't2helmet', name: 'T-2 Helmet', type: 'armor', slot: 'helmet', d: 600, a: 700, lv: 18, s: 0, absorb: 0.35, dur: 90 },
  { id: 't3helmet', name: 'T-3 Helmet', type: 'armor', slot: 'helmet', a: 1350, lv: 38, s: 0, absorb: 0.5, dur: 130 },
  { id: 'jackohelmet', name: "Jack O'Helmet", type: 'armor', slot: 'helmet', d: 350, a: 350, lv: 10, s: 0, absorb: 0.3, dur: 80 },
  { id: 'slayerhelmet', name: "Slayer's Helmet", type: 'armor', slot: 'helmet', d: 750, a: 750, lv: 50, s: 0, absorb: 0.45, dur: 120 },
  { id: 't1backpack', name: 'T-1 Backpack', type: 'armor', slot: 'pack', d: 400, a: 450, lv: 5, s: 0, extra: 6 },
  { id: 'hazmat', name: 'Hazmat', type: 'armor', slot: 'suit', d: 1000, a: 1000, lv: 15, s: 0, hazmat: true },
  { id: 'thermal', name: 'Thermal Goggles', type: 'armor', slot: 'eyes', a: 3500, lv: 35, s: 0, thermal: true },
  { id: 't3kit', name: 'T-3 Kit', type: 'kit', a: 15000, lv: 45, s: 0, kit: ['t3vest', 't3helmet', 't1backpack', 'medkit'] },

  { id: 'scrap', name: 'Scrap', type: 'scrap', s: 1, stack: 10, sell: 40 },
  { id: 'goldscrap', name: 'Golden Scrap', type: 'scrap', s: 1, stack: 10, sell: 250 },
];

export const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export const isGun = i => ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'launcher'].includes(i.type);
export const isMeleeish = i => i.type === 'melee' || (i.type === 'tool' && i.dmg);

export const CODES = {
  FIX21: { cash: 3000, msg: '$3,000 added' },
  WINTER25: { cash: 2500, msg: '$2,500 added' },
  SORRY4WAIT: { cash: 1500, msg: '$1,500 added' },
  HALLOWS25: { cash: 1000, xp: 500, msg: '$1,000 + 500 XP' },
  BAYONET: { unlock: 'bayonet', msg: 'Bayonet unlocked' },
  WINTERSOON: { cash: 10000, msg: '$10,000 added' },
  KRAMPUS: { cash: 2000, msg: '$2,000 added' },
  '2323': { dev: true, msg: 'DEV: $1,000,000, level 100, everything unlocked' },
};

export const PASSES = [
  { id: 'weaponry', name: 'Weaponry', price: 15000, desc: 'Access the Armories and armory-only weapons.' },
  { id: 'extraincome', name: 'Extra Income', price: 8000, desc: '+20% allowance.' },
  { id: 'group', name: 'Join Group', price: 0, desc: '+10% income (free).' },
  { id: 'premium', name: 'Premium', price: 12000, desc: '+30% allowance.' },
];

export const BOT_NAMES = ['xXslayerXx', 'g17_enjoyer', 'vibecheck_king', 'Rvvz_fan', 'safe_cracker99', 'noob_123', 'TowerCamper', 'junkyard_rat', 'deaglegod', 'crowbar_carl', 'sector07local', 'Lumi_ttv', 'bacon_hair', 'pizzaguy', 'MotelMenace', 'subway_sam', 'scrapper', 'r870_rex', 'bandage_bob', 'K1ngKatana', 'AlleyCat', 'thrift_thief', 'gasstation_g', 'barber_b', 'tommy_tom', 'ithaca_ivy', 'sledge_steve', 'rebel_rae', 'sewer_rat', 'qwerty_kid'];

export const ALLOWANCE = 600, ALLOWANCE_SEC = 900, MAX_WITHDRAW = 25000, START_BANK = 5000, MAX_BOUNTY = 5000;
export const xpForLevel = l => 120 + l * 45;
export const levelReward = l => 250 + l * 60;

export function unlockPrice(item, lv) {
  if (!item.lv || lv >= item.lv) return 0;
  const base = item.maxUnlock || Math.max(1000, (item.d || item.a || item.r || 100) * 40);
  return Math.round(base * (1 - (lv - 1) / item.lv) / 10) * 10;
}
