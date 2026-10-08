// 30 badges (§2.7 "Rozetler"). Ids, names and descriptions match src/ui/strings (badge.<id>, badge.<id>.desc);
// conditions here are the machine-checkable truth. PURE data + evaluator.

import type {
  BadgeCondition,
  BadgeContext,
  BadgeDef,
  FlightStatKey,
  FlightStats,
  ProfileStats,
  RoundStatKey,
  SuruRoundStats,
} from './types.ts';

function b(
  id: string,
  tr: string,
  en: string,
  descTr: string,
  descEn: string,
  icon: string,
  category: BadgeDef['category'],
  condition: BadgeCondition,
): BadgeDef {
  return { id, name: { tr, en }, desc: { tr: descTr, en: descEn }, icon, category, condition };
}

export const BADGES: readonly BadgeDef[] = [
  // ---- flight craft ----
  b('firstJump', 'İlk Atlayış', 'First Jump', 'İlk rotanı bitir.', 'Finish your first route.', 'jump', 'kariyer', {
    kind: 'profile',
    stat: 'routesLanded',
    atLeast: 1,
  }),
  b('threeMetre', '3 Metre Kulübü', '3 Metre Club', 'Tek uçuşta toplam 10 sn ×5.', '10 s total at ×5 in one flight.', 'proximity', 'ucus', {
    kind: 'flight',
    min: { x5TotalSec: 10 },
  }),
  b('cloudPiercer', 'Bulut Delen', 'Cloud Piercer', 'Bulut Denizi’ni üç yıldızla bitir.', 'Three-star Sea of Clouds.', 'cloud', 'kariyer', {
    kind: 'routeStars',
    routeId: 'w3r1',
    atLeast: 3,
  }),
  b('zeroContact', 'Sıfır Temas', 'Zero Contact', 'Hiç temas etmeden üç yıldız al.', 'Earn three stars without a touch.', 'shield', 'ucus', {
    kind: 'flight',
    min: { stars: 3, landed: 1 },
    max: { contacts: 0 },
  }),
  b('sunsetPilot', 'Gün Batımı Pilotu', 'Sunset Pilot', 'Pamukkale’nin dört rotasını bitir.', 'Finish all four Pamukkale routes.', 'sun', 'kariyer', {
    kind: 'worldRoutesLanded',
    world: 'pamukkale',
    atLeast: 4,
  }),
  b('postcardHunter', 'Kartpostal Avcısı', 'Postcard Hunter', '25 kartpostalın hepsini topla.', 'Collect all 25 postcards.', 'postcard', 'koleksiyon', {
    kind: 'profile',
    stat: 'postcards',
    atLeast: 25,
  }),
  b('flockLeader', 'Sürü Lideri', 'Flock Leader', 'SÜRÜ.io’da bir turu birinci bitir.', 'Finish first in a SÜRÜ.io round.', 'flock', 'suru', {
    kind: 'round',
    max: { placement: 1 },
  }),
  b('encircleMaster', 'Kuşatma Ustası', 'Encircle Master', 'Tek turda üç Kuşatma yap.', 'Encircle three times in one round.', 'encircle', 'suru', {
    kind: 'round',
    min: { sieges: 3 },
  }),
  b('diamondWing', 'Elmas Kanat', 'Diamond Wing', 'Elmas lige yüksel.', 'Reach the Diamond league.', 'diamond', 'suru', {
    kind: 'profile',
    stat: 'leagueIndex',
    atLeast: 4,
  }),
  b('balloonFriend', 'Balon Dostu', 'Balloon Friend', 'Tek uçuşta beş Balon İlmeği.', 'Five Balloon Threads in one flight.', 'balloon', 'ucus', {
    kind: 'flight',
    min: { balloonThreads: 5 },
  }),
  b('gateChain', 'Kesintisiz Zincir', 'Unbroken Chain', 'Bir rotanın tüm kapılarını tek zincirde geç.', 'Clear every gate of a route in one chain.', 'gate', 'ucus', {
    kind: 'flight',
    allGates: true,
  }),
  b('thermalWolf', 'Termal Kurdu', 'Thermal Wolf', 'Tek uçuşta üç termale gir.', 'Ride three thermals in one flight.', 'thermal', 'ucus', {
    kind: 'flight',
    min: { thermalsEntered: 3 },
  }),
  // ---- worlds ----
  b('dawnRider', 'Şafak Yolcusu', 'Dawn Rider', 'Kapadokya’nın 12 yıldızını topla.', 'Collect all 12 Cappadocia stars.', 'sunrise', 'kariyer', {
    kind: 'worldStars',
    world: 'kapadokya',
    atLeast: 12,
  }),
  b('turquoiseShadow', 'Turkuaz Gölge', 'Turquoise Shadow', 'Likya’da suyun 4 m üstünde 5 sn uç.', 'Fly 5 s within 4 m of Lycian water.', 'wave', 'ucus', {
    kind: 'flight',
    world: 'likya',
    min: { waterSkimSec: 5 },
    allowFree: true,
  }),
  b('highlandWind', 'Yayla Rüzgârı', 'Highland Wind', 'Karadeniz’in 12 yıldızını topla.', 'Collect all 12 Black Sea stars.', 'wind', 'kariyer', {
    kind: 'worldStars',
    world: 'karadeniz',
    atLeast: 12,
  }),
  b('snowBird', 'Kar Kuşu', 'Snow Bird', 'Erciyes’in 12 yıldızını topla.', 'Collect all 12 Erciyes stars.', 'snow', 'kariyer', {
    kind: 'worldStars',
    world: 'erciyes',
    atLeast: 12,
  }),
  b('mirrorFlight', 'Ayna Uçuşu', 'Mirror Flight', 'Ayna Havuzlar’da ×5 ile 3 sn uç.', 'Hold ×5 for 3 s over the Mirror Pools.', 'mirror', 'ucus', {
    kind: 'flight',
    routeId: 'w5r3',
    min: { maxX5StreakSec: 3 },
  }),
  // ---- landing ----
  b('bullseye', 'Tam Ortası', 'Bullseye', 'Hedefin 2 m içine in.', 'Land within 2 m of the target.', 'target', 'ucus', {
    kind: 'flight',
    min: { landed: 1 },
    max: { landingDist: 2 },
  }),
  b('featherlight', 'Kuş Tüyü', 'Featherlight', 'On yumuşak iniş yap.', 'Make ten soft landings.', 'feather', 'ucus', {
    kind: 'profile',
    stat: 'softLandings',
    atLeast: 10,
  }),
  b('boldOpening', 'Cesur Kanopi', 'Bold Canopy', 'On kez Cesur Açılış yap.', 'Make ten Bold Openings.', 'parachute', 'ucus', {
    kind: 'profile',
    stat: 'braveOpenings',
    atLeast: 10,
  }),
  // ---- habits / social ----
  b('flightLog', 'Uçuş Günlüğü', 'Flight Log', 'Yedi damga topla.', 'Collect seven stamps.', 'stamp', 'koleksiyon', {
    kind: 'profile',
    stat: 'stamps',
    atLeast: 7,
  }),
  b('pilotOfDay', 'Günün Pilotu', 'Pilot of the Day', 'Günün Rotası’nda üç yıldız al.', 'Three-star a Daily Route.', 'calendar', 'sosyal', {
    kind: 'profile',
    stat: 'dailyThreeStars',
    atLeast: 1,
  }),
  b('duelist', 'Düellocu', 'Duelist', 'Bir Hayalet Düello kazan.', 'Win a Ghost Duel.', 'duel', 'sosyal', {
    kind: 'profile',
    stat: 'duelWins',
    atLeast: 1,
  }),
  b('rematch', 'Rövanş', 'Rematch', 'Rövanş koduyla bir düello kazan.', 'Win a duel with a rematch code.', 'rematch', 'sosyal', {
    kind: 'profile',
    stat: 'rematchWins',
    atLeast: 1,
  }),
  // ---- completion ----
  b('sixtyStars', 'Altmış Yıldız', 'Sixty Stars', '60 yıldızın hepsini topla.', 'Collect all 60 stars.', 'star', 'kariyer', {
    kind: 'profile',
    stat: 'totalStars',
    atLeast: 60,
  }),
  b('masterHands', 'Usta Eller', 'Master Hands', '60 Usta Görevi’nin hepsini bitir.', 'Complete all 60 Master Tasks.', 'task', 'kariyer', {
    kind: 'profile',
    stat: 'ustaDone',
    atLeast: 60,
  }),
  b('legend', 'Efsane', 'Legend', 'Pilot Rütbesi 44’e ulaş.', 'Reach Pilot Rank 44.', 'rank', 'koleksiyon', {
    kind: 'profile',
    stat: 'rankLevel',
    atLeast: 44,
  }),
  b('quietGlide', 'Sakin Süzülüş', 'Quiet Glide', 'Serbest Uçuş’ta on dakika geçir.', 'Spend ten minutes in Free Flight.', 'glide', 'koleksiyon', {
    kind: 'profile',
    stat: 'freeFlightSec',
    atLeast: 600,
  }),
  b('shutterbug', 'Objektif', 'Shutterbug', 'Foto Modu’nda ilk kareni kaydet.', 'Save your first Photo Mode shot.', 'camera', 'koleksiyon', {
    kind: 'profile',
    stat: 'photosSaved',
    atLeast: 1,
  }),
  b('untilSunset', 'Gün Batımına Kadar', 'Until Sunset', 'SÜRÜ.io’da gün batımına kadar ayakta kal.', 'Stay in a SÜRÜ.io round until sunset.', 'sunset', 'suru', {
    kind: 'round',
    min: { survivedToSunset: 1 },
  }),
];

const BY_ID = new Map<string, BadgeDef>(BADGES.map((x) => [x.id, x]));

export function badge(id: string): BadgeDef | undefined {
  return BY_ID.get(id);
}

function flightValue(s: FlightStats, k: FlightStatKey): number {
  const v = s[k];
  return typeof v === 'boolean' ? (v ? 1 : 0) : v;
}

function roundValue(r: SuruRoundStats, k: RoundStatKey): number {
  const v = r[k];
  return typeof v === 'boolean' ? (v ? 1 : 0) : v;
}

function within<K extends string>(get: (k: K) => number, min?: Partial<Record<K, number>>, max?: Partial<Record<K, number>>): boolean {
  if (min) for (const k of Object.keys(min) as K[]) if (!(get(k) >= (min[k] as number))) return false;
  if (max) for (const k of Object.keys(max) as K[]) if (!(get(k) <= (max[k] as number))) return false;
  return true;
}

function profileValue(p: ProfileStats, c: Extract<BadgeCondition, { kind: 'profile' }>): number {
  return p[c.stat];
}

/** True when the badge condition holds for this context (call after every flight / round / profile change). */
export function checkBadge(def: BadgeDef, ctx: BadgeContext): boolean {
  const c = def.condition;
  switch (c.kind) {
    case 'profile':
      return profileValue(ctx.profile, c) >= c.atLeast;
    case 'worldStars':
      return (ctx.profile.worldStars[c.world] ?? 0) >= c.atLeast;
    case 'worldRoutesLanded':
      return (ctx.profile.worldRoutesLanded[c.world] ?? 0) >= c.atLeast;
    case 'routeStars':
      return (ctx.profile.routeStars[c.routeId] ?? 0) >= c.atLeast;
    case 'flight': {
      const f = ctx.flight;
      if (!f) return false;
      if (f.mode === 'free' && !c.allowFree) return false;
      if (c.routeId && f.routeId !== c.routeId) return false;
      if (c.world && f.world !== c.world) return false;
      if (c.allGates && !(f.gatesTotal > 0 && f.gatesMissed === 0 && f.maxGateChain >= f.gatesTotal)) return false;
      return within<FlightStatKey>((k) => flightValue(f, k), c.min, c.max);
    }
    case 'round': {
      const r = ctx.round;
      if (!r) return false;
      return within<RoundStatKey>((k) => roundValue(r, k), c.min, c.max);
    }
  }
}

/** Badges newly earned in this context (ids not yet owned). */
export function newBadges(ctx: BadgeContext, owned: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const d of BADGES) if (!owned.has(d.id) && checkBadge(d, ctx)) out.push(d.id);
  return out;
}
