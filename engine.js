/* Gen 3 Battle Tower damage engine (Ruby/Sapphire, Level 50).
   Formula and data follow the pret/pokeruby decompilation. */
(function (root) {
  const NAT = {Hardy:[],Lonely:['atk','def'],Brave:['atk','spe'],Adamant:['atk','spa'],Naughty:['atk','spd'],
    Bold:['def','atk'],Docile:[],Relaxed:['def','spe'],Impish:['def','spa'],Lax:['def','spd'],
    Timid:['spe','atk'],Hasty:['spe','def'],Serious:[],Jolly:['spe','spa'],Naive:['spe','spd'],
    Modest:['spa','atk'],Mild:['spa','def'],Quiet:['spa','spe'],Bashful:[],Rash:['spa','spd'],
    Calm:['spd','atk'],Gentle:['spd','def'],Sassy:['spd','spe'],Careful:['spd','spa'],Quirky:[]};
  const KEYS = ['hp','atk','def','spa','spd','spe'];

  const CH = {};
  const chart = {NORMAL:{ROCK:.5,STEEL:.5,GHOST:0},
    FIRE:{FIRE:.5,WATER:.5,GRASS:2,ICE:2,BUG:2,ROCK:.5,DRAGON:.5,STEEL:2},
    WATER:{FIRE:2,WATER:.5,GRASS:.5,GROUND:2,ROCK:2,DRAGON:.5},
    ELECTRIC:{WATER:2,ELECTRIC:.5,GRASS:.5,GROUND:0,FLYING:2,DRAGON:.5},
    GRASS:{FIRE:.5,WATER:2,GRASS:.5,POISON:.5,GROUND:2,FLYING:.5,BUG:.5,ROCK:2,DRAGON:.5,STEEL:.5},
    ICE:{FIRE:.5,WATER:.5,GRASS:2,ICE:.5,GROUND:2,FLYING:2,DRAGON:2,STEEL:.5},
    FIGHTING:{NORMAL:2,ICE:2,POISON:.5,FLYING:.5,PSYCHIC:.5,BUG:.5,ROCK:2,GHOST:0,DARK:2,STEEL:2},
    POISON:{GRASS:2,POISON:.5,GROUND:.5,ROCK:.5,GHOST:.5,STEEL:0},
    GROUND:{FIRE:2,ELECTRIC:2,GRASS:.5,POISON:2,FLYING:0,BUG:.5,ROCK:2,STEEL:2},
    FLYING:{ELECTRIC:.5,GRASS:2,FIGHTING:2,BUG:2,ROCK:.5,STEEL:.5},
    PSYCHIC:{FIGHTING:2,POISON:2,PSYCHIC:.5,DARK:0,STEEL:.5},
    BUG:{FIRE:.5,GRASS:2,FIGHTING:.5,POISON:.5,FLYING:.5,PSYCHIC:2,GHOST:.5,DARK:2,STEEL:.5},
    ROCK:{FIRE:2,ICE:2,FIGHTING:.5,GROUND:.5,FLYING:2,BUG:2,STEEL:.5},
    GHOST:{NORMAL:0,PSYCHIC:2,GHOST:2,DARK:.5,STEEL:.5},
    DRAGON:{DRAGON:2,STEEL:.5},
    DARK:{FIGHTING:.5,PSYCHIC:2,GHOST:2,DARK:.5,STEEL:.5},
    STEEL:{FIRE:.5,WATER:.5,ELECTRIC:.5,ICE:2,ROCK:2,STEEL:.5}};
  for (const a in chart) for (const d in chart[a]) CH[a + '>' + d] = chart[a][d];
  const mult = (a, d) => (CH[a + '>' + d] ?? 1);
  const eff = (a, types) => types.reduce((m, d) => m * mult(a, d), 1);
  const PHYS = new Set(['NORMAL','FIGHTING','FLYING','GROUND','ROCK','BUG','GHOST','POISON','STEEL']);
  const TYPEITEM = {'Black Belt':'FIGHTING','BlackGlasses':'DARK','Charcoal':'FIRE','Dragon Fang':'DRAGON','Hard Stone':'ROCK','Magnet':'ELECTRIC',
    'Metal Coat':'STEEL','Miracle Seed':'GRASS','Mystic Water':'WATER','NeverMeltIce':'ICE','Poison Barb':'POISON','Sharp Beak':'FLYING',
    'Silk Scarf':'NORMAL','SilverPowder':'BUG','Soft Sand':'GROUND','Spell Tag':'GHOST','TwistedSpoon':'PSYCHIC'};
  const ITEMS = ['','Leftovers','Lum Berry','Choice Band','Shell Bell','Sitrus Berry','Salac Berry','Liechi Berry','Petaya Berry','Ganlon Berry',
    'Apicot Berry','Chesto Berry','Quick Claw',"King's Rock",'Scope Lens','BrightPowder','Focus Band','White Herb','Mental Herb',
    ...Object.keys(TYPEITEM),'Light Ball','Thick Club','DeepSeaTooth','DeepSeaScale','Metal Powder'];
  const HP_TYPES = ['FIGHTING','FLYING','POISON','GROUND','ROCK','BUG','GHOST','STEEL','FIRE','WATER','GRASS','ELECTRIC','PSYCHIC','ICE','DRAGON','DARK'];
  // Setup moves: stage changes per use
  const BOOSTS = {CALM_MIND:{spa:1,spd:1},SWORDS_DANCE:{atk:2},DRAGON_DANCE:{atk:1,spe:1},BULK_UP:{atk:1,def:1},GROWTH:{spa:1},
    TAIL_GLOW:{spa:2},HOWL:{atk:1},MEDITATE:{atk:1},SHARPEN:{atk:1},CURSE:{atk:1,def:1},BELLY_DRUM:{atk:6}};
  const OHKO = new Set(['FISSURE','HORN_DRILL','GUILLOTINE','SHEER_COLD']);
  const SELFKO = new Set(['EXPLOSION','SELF_DESTRUCT']);
  const IGNORE_INTIM = new Set(['CLEAR_BODY','HYPER_CUTTER','WHITE_SMOKE']);
  const DISRUPT = {ROAR:'phaze',WHIRLWIND:'phaze',HAZE:'Haze',PSYCH_UP:'Psych Up',TAUNT:'Taunt',ENCORE:'Encore',DISABLE:'Disable',
    PERISH_SONG:'Perish Song',DESTINY_BOND:'Destiny Bond',EXPLOSION:'Explosion',SELF_DESTRUCT:'Selfdestruct',MIRROR_COAT:'Mirror Coat',
    COUNTER:'Counter',SHEER_COLD:'OHKO move',HORN_DRILL:'OHKO move',GUILLOTINE:'OHKO move',FISSURE:'OHKO move',TRICK:'Trick',
    SKILL_SWAP:'Skill Swap',IMPRISON:'Imprison',SNATCH:'Snatch'};
  const STATUS = new Set(['TOXIC','THUNDER_WAVE','WILL_O_WISP','SPORE','HYPNOSIS','GLARE','STUN_SPORE','YAWN','CONFUSE_RAY','SWAGGER',
    'FLATTER','TEETER_DANCE','SUPERSONIC','ATTRACT','POISON_GAS','SING','SLEEP_POWDER','LOVELY_KISS','GRASS_WHISTLE','POISON_POWDER','SWEET_KISS']);
  const STAT_UP = new Set(['DRAGON_DANCE','SWORDS_DANCE','BELLY_DRUM','CURSE','AGILITY','CALM_MIND','GROWTH','BULK_UP','HOWL','MEDITATE',
    'AMNESIA','COSMIC_POWER','IRON_DEFENSE','ACID_ARMOR','STOCKPILE','TAIL_GLOW','SHARPEN','BARRIER']);

  const STAGE = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);

  function calcStats(base, nature, ivs, evs, LEVEL = 50) {
    const [up, dn] = NAT[nature] || [];
    const o = {};
    KEYS.forEach((k, i) => {
      let x = Math.floor((2 * base[i] + ivs[i] + Math.floor(evs[i] / 4)) * LEVEL / 100);
      if (k === 'hp') { o.hp = base[i] === 1 ? 1 : x + LEVEL + 10; return; }
      x += 5;
      if (k === up) x = Math.floor(x * 110 / 100);
      if (k === dn) x = Math.floor(x * 90 / 100);
      o[k] = x;
    });
    return o;
  }
  function hiddenPower(iv) {
    const [h, a, d, sa, sd, s] = iv;
    const t = Math.floor(((h & 1) + 2 * (a & 1) + 4 * (d & 1) + 8 * (s & 1) + 16 * (sa & 1) + 32 * (sd & 1)) * 15 / 63);
    const p = Math.floor((((h >> 1) & 1) + 2 * ((a >> 1) & 1) + 4 * ((d >> 1) & 1) + 8 * ((s >> 1) & 1) + 16 * ((sa >> 1) & 1) + 32 * ((sd >> 1) & 1)) * 40 / 63) + 30;
    return {type: HP_TYPES[t], power: p};
  }
  // Gen 3 damage: base -> +2 -> crit -> STAB -> type (per type, floored) -> random 85..100
  function damage(LEVEL, power, type, A, D, atkTypes, defTypes, crit) {
    let base = Math.floor(Math.floor(Math.floor(2 * LEVEL / 5 + 2) * power * A / D) / 50) + 2;
    if (crit) base *= 2;
    if (atkTypes.includes(type)) base = Math.floor(base * 15 / 10);
    if (eff(type, defTypes) === 0) return [0, 0];
    for (const d of defTypes) { const m = mult(type, d); if (m !== 1) base = Math.floor(base * m); }
    return [Math.max(1, Math.floor(base * 85 / 100)), Math.max(1, base)];
  }

  function makeEngine(DATA) {
    const SP = DATA.species, MV = DATA.moves;

    // Effective power / hit count for a move. Returns null if it isn't a normal damaging move.
    function moveInfo(key, user) {
      const m = MV[key]; if (!m) return null;
      let p = m.p, t = m.t, hits = [1, 1], fixed = null;
      switch (key) {
        case 'RETURN': case 'FRUSTRATION': p = 102; break;
        case 'ERUPTION': case 'WATER_SPOUT': p = 150; break;
        case 'FLAIL': case 'REVERSAL': p = 20; break;
        case 'LOW_KICK': p = 60; break;
        case 'MAGNITUDE': p = 150; break;
        case 'WEATHER_BALL': p = 50; break;
        case 'ROLLOUT': case 'ICE_BALL': p = 30; break;
        case 'FUTURE_SIGHT': case 'DOOM_DESIRE': t = 'MYSTERY'; break;
        case 'HIDDEN_POWER': { if (!user.iv) return null; const hp = hiddenPower(user.iv); p = hp.power; t = hp.type; break; }
        case 'SEISMIC_TOSS': case 'NIGHT_SHADE': fixed = user.lv || 50; break;
        case 'DRAGON_RAGE': fixed = 40; break;
        case 'SONIC_BOOM': fixed = 20; break;
      }
      if (m.e === 'DOUBLE_HIT' || m.e === 'TWINEEDLE') hits = [2, 2];
      else if (m.e === 'MULTI_HIT') hits = [2, 5];
      else if (m.e === 'TRIPLE_KICK') { p = 20; hits = [3, 3]; }
      if (OHKO.has(key)) return null;
      if (fixed == null && (p <= 1 || key === 'SPIT_UP')) return null;
      return {key, name: m.n, p, t, hits, fixed, selfKO: SELFKO.has(key)};
    }

    // attacker: {types, st, item, ability, species, stage:{atk,spa}} defender: {types, st, ability, stage:{def,spd}, hp}
    function hit(mi, atk, def, crit, intim) {
      if (!mi) return [0, 0];
      const t = mi.t;
      if (t !== 'MYSTERY') {
        if (def.ability === 'LEVITATE' && t === 'GROUND') return [0, 0];
        if (def.ability === 'VOLT_ABSORB' && t === 'ELECTRIC') return [0, 0];
        if (def.ability === 'WATER_ABSORB' && t === 'WATER') return [0, 0];
        if (def.ability === 'FLASH_FIRE' && t === 'FIRE') return [0, 0];
        if (def.ability === 'WONDER_GUARD' && eff(t, def.types) <= 1) return [0, 0];
      }
      if (mi.fixed != null) {
        if (t !== 'MYSTERY' && eff(t, def.types) === 0) return [0, 0];
        return [mi.fixed, mi.fixed];
      }
      const phys = PHYS.has(t) && t !== 'MYSTERY';
      let A = phys ? atk.st.atk : atk.st.spa;
      let D = phys ? def.st.def : def.st.spd;
      if (phys) {
        if (atk.item === 'Choice Band') A = Math.floor(A * 15 / 10);
        if (atk.ability === 'HUGE_POWER' || atk.ability === 'PURE_POWER') A *= 2;
        if (atk.item === 'Thick Club' && (atk.species === 'CUBONE' || atk.species === 'MAROWAK')) A *= 2;
        if (atk.ability === 'HUSTLE') A = Math.floor(A * 15 / 10);
      } else {
        if (atk.item === 'Light Ball' && atk.species === 'PIKACHU') A *= 2;
        if (atk.item === 'DeepSeaTooth' && atk.species === 'CLAMPERL') A *= 2;
        if (def.item === 'DeepSeaScale' && def.species === 'CLAMPERL') D *= 2;
      }
      if (phys && def.item === 'Metal Powder' && def.species === 'DITTO') D *= 2;
      if (!phys && atk.item === 'Soul Dew' && (atk.species === 'LATIOS' || atk.species === 'LATIAS')) A = Math.floor(A * 15 / 10);
      if (!phys && def.item === 'Soul Dew' && (def.species === 'LATIOS' || def.species === 'LATIAS')) D = Math.floor(D * 15 / 10);
      if (TYPEITEM[atk.item] === t) A = Math.floor(A * 110 / 100);
      let as = phys ? (atk.stage?.atk || 0) : (atk.stage?.spa || 0);
      if (phys && intim) as -= 1;
      let ds = phys ? (def.stage?.def || 0) : (def.stage?.spd || 0);
      if (crit) { as = Math.max(0, as); ds = Math.min(0, ds); }
      as = Math.max(-6, Math.min(6, as)); ds = Math.max(-6, Math.min(6, ds));
      A = Math.floor(A * STAGE(as)); D = Math.floor(D * STAGE(ds));
      if (def.ability === 'THICK_FAT' && (t === 'FIRE' || t === 'ICE')) A = Math.floor(A / 2);
      if (mi.selfKO) D = Math.max(1, Math.floor(D / 2));
      const r = damage(atk.lv || 50, mi.p, t, A, Math.max(1, D), t === 'MYSTERY' ? [] : atk.types, def.types, crit);
      return [r[0] * mi.hits[0], r[1] * mi.hits[1]];
    }

    function buildMember(m) {
      const sp = SP[m.s];
      const lv = Math.max(1, Math.min(100, +m.lv || 50));
      const st = calcStats(sp.b, m.na, m.iv, m.ev, lv);
      const setupKey = m.mv.find(k => BOOSTS[k]);
      return {raw: m, lv, species: m.s, name: m.nick ? `${m.nick} (${sp.n})` : sp.n, short: m.nick || sp.n, st, types: sp.t,
        item: m.it, ability: m.ab, iv: m.iv, moves: m.mv.filter(Boolean),
        setup: setupKey ? {key: setupKey, name: MV[setupKey].n, d: BOOSTS[setupKey]} : null,
        hasSub: m.mv.includes('SUBSTITUTE'), maxUses: setupKey ? (setupKey === 'BELLY_DRUM' ? 1 : Math.ceil(6 / Math.max(...Object.values(BOOSTS[setupKey]).filter(v => v > 0)))) : 0, noCrit: m.ab === 'BATTLE_ARMOR' || m.ab === 'SHELL_ARMOR'};
    }
    const stageAfter = (setup, uses) => {
      const s = {atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
      if (!setup) return s;
      for (const k in setup.d) s[k] = Math.min(6, setup.d[k] * uses);
      return s;
    };

    const oppCache = new Map();
    const ivFor = (set, round) => round ? (set.ri[round] ?? 0) : Math.max(...Object.values(set.ri));
    function oppMon(set, iv, lv, tag) {
      const key = tag + ':' + set.i + ':' + iv + ':' + lv;
      if (oppCache.has(key)) return oppCache.get(key);
      const sp = SP[set.s];
      const o = {set, lv, iv, species: set.s, sp, types: sp.t, st: calcStats(sp.b, set.na, Array(6).fill(iv), set.ev, lv), item: set.it,
        abilities: sp.a.length ? sp.a : ['NONE'], moves: set.mv};
      oppCache.set(key, o); return o;
    }

    // opts: {uses, sets, oppLevel, round, tag}
    function analyze(team, opts) {
      const usesArr = opts.uses || [], round = opts.round || 0, oppLv = opts.oppLevel || 50;
      const members = team.map(buildMember);
      const list = opts.sets.filter(set => !round || set.ri[round] != null);
      const rows = list.map(set => {
        const o = oppMon(set, ivFor(set, round), oppLv, opts.tag || '');
        const keys = set.mv;
        const row = {i: set.i, s: set.s, n: o.sp.n, br: set.br || '', it: set.it, na: set.na, ev: set.ev, mv: keys.map(k => MV[k].n), mk: keys, r: Object.keys(set.ri).map(Number).sort((a, b) => a - b), iv: o.iv, lv: oppLv, sp: o.st.spe, hp: o.st.hp,
          f: [...new Set(keys.map(k => DISRUPT[k]).filter(Boolean))].sort(),
          st: keys.filter(k => STATUS.has(k)).map(k => MV[k].n).sort(),
          b: keys.filter(k => STAT_UP.has(k)).map(k => MV[k].n).sort(), m: []};
        for (const [mi_, me] of members.entries()) {
          const U = me.setup ? Math.min(usesArr?.[mi_] || 0, me.maxUses) : 0;
          const meDef = (stage) => ({types: me.types, st: me.st, ability: me.ability, item: me.item, species: me.species, stage});
          // ---- their best hit on me (worst case ability)
          const theirBest = (stage, crit) => {
            let best = ['-', 0, 0];
            for (const ab of o.abilities) {
              const atk = {lv: oppLv, types: o.types, st: o.st, item: o.item, ability: ab, species: o.species, stage: {}};
              const intim = me.ability === 'INTIMIDATE' && !IGNORE_INTIM.has(ab);
              for (const k of keys) {
                const mi = moveInfo(k, {lv: oppLv});
                if (!mi) continue;
                const r = hit(mi, atk, meDef(stage), crit, intim);
                const pct = [r[0] * 100 / me.st.hp, r[1] * 100 / me.st.hp];
                if (pct[1] > best[2]) best = [mi.name, pct[0], pct[1]];
              }
            }
            return best;
          };
          const t = theirBest(stageAfter(me.setup, U), false);
          const tc = me.noCrit ? t : theirBest({}, true);
          const t1 = theirBest(stageAfter(me.setup, U + 1), false);
          // ---- my best hit on them (they get their best ability)
          const myMoves = me.moves.map(k => moveInfo(k, me)).filter(Boolean);
          const mine = (uses, list) => {
            let worst = null;
            for (const ab of o.abilities) {
              const def = {types: o.types, st: o.st, ability: ab, item: o.item, species: o.species, stage: {}};
              const atk = {lv: me.lv, types: me.types, st: me.st, item: me.item, ability: me.ability, species: me.species, stage: stageAfter(me.setup, uses)};
              const intim = ab === 'INTIMIDATE' && !IGNORE_INTIM.has(me.ability);
              let best = {name: '-', r: [0, 0]};
              for (const mi of list) {
                const r = hit(mi, atk, def, false, intim);
                if (r[1] > best.r[1] || (r[1] === best.r[1] && r[0] > best.r[0])) best = {name: mi.name, r};
              }
              best.ab = ab;
              if (!worst || best.r[0] < worst.r[0] || (best.r[0] === worst.r[0] && best.r[1] < worst.r[1])) worst = best;
            }
            return worst;
          };
          const normal = myMoves.filter(mi => !mi.selfKO);
          const boomMoves = myMoves.filter(mi => mi.selfKO);
          const l = mine(U, normal);
          let cg = null, cp = null;
          const maxUses = me.maxUses;
          for (let u = U; u <= maxUses; u++) {
            const b = u === U ? l : mine(u, normal);
            if (cp == null && b.r[1] >= o.st.hp) cp = u;
            if (cg == null && b.r[0] >= o.st.hp) { cg = u; break; }
          }
          const hko = l.r[0] ? Math.ceil(o.st.hp / l.r[0]) : null;
          let boom = null;
          if (boomMoves.length) { const b = mine(U, boomMoves); boom = [Math.round(b.r[0] * 100 / o.st.hp), Math.round(b.r[1] * 100 / o.st.hp), b.name]; }
          // ---- speed conditions
          const cond = [];
          const has = k => keys.includes(k), abil = a => o.abilities.includes(a);
          if (set.it === 'Quick Claw') cond.push(['Quick Claw (20%/turn)', o.st.spe]);
          if (has('AGILITY')) cond.push(['after Agility', o.st.spe * 2]);
          if (has('DRAGON_DANCE')) cond.push(['after Dragon Dance', Math.floor(o.st.spe * 3 / 2)]);
          if (set.it === 'Salac Berry') cond.push(['Salac Berry (≤25% HP)', Math.floor(o.st.spe * 3 / 2)]);
          if (abil('SWIFT_SWIM') && has('RAIN_DANCE')) cond.push(['Swift Swim after Rain Dance', o.st.spe * 2]);
          if (abil('CHLOROPHYLL') && has('SUNNY_DAY')) cond.push(['Chlorophyll after Sunny Day', o.st.spe * 2]);
          if (abil('SPEED_BOOST')) cond.push(['Speed Boost (turn 2+)', Math.floor(o.st.spe * 3 / 2)]);
          const c = cond.filter(x => x[0].startsWith('Quick') || x[1] > me.st.spe);
          const om = (me.ability === 'STURDY' || oppLv < me.lv) ? [] : keys.filter(k => OHKO.has(k) && !(k === 'FISSURE' && (me.ability === 'LEVITATE' || me.types.includes('FLYING')))).map(k => `${MV[k].n} · ${Math.min(100, 30 + oppLv - me.lv)}%`);
          const R = x => Math.round(x);
          row.m.push({t: [t[0], R(t[1]), R(t[2])], tc: R(tc[2]), tcl: R(tc[1]), tcm: tc[0], t1: R(t1[2]),
            l: [l.name, R(l.r[0] * 100 / o.st.hp), R(l.r[1] * 100 / o.st.hp)], cg, cp, hko, ab: (DATA.abilities[l.ab] || ''),
            c, boom, om});
        }
        return row;
      });
      return {members, rows};
    }
    return {analyze, ivFor, buildMember, calcStats, hiddenPower, moveInfo, ITEMS, NAT, BOOSTS};
  }
  const api = {makeEngine, NAT, ITEMS};
  if (typeof module !== 'undefined') module.exports = api; else root.TowerEngine = api;
})(this);
