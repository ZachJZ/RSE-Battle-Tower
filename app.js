(function () {
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const BANNED = new Set(['MEW','MEWTWO','LUGIA','HO_OH','CELEBI','KYOGRE','GROUDON','RAYQUAZA','JIRACHI','DEOXYS']);
const STATN = ['HP','Atk','Def','SpA','SpD','Spe'];
let DATA, E, team, result, rows = [], members = [];
let view = 'fast', round = 0, q = '', mon = 0, crit = false, uses = [0,0,0], game = 'rs', mode = '50', cardOn = true, help = false;
let mc = {s: null, moves: [], item: null, speed: null};
const store = {get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}, set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const st0 = store.get('bt-state') || {};
if (st0.view) view = st0.view; if (st0.round != null) round = +st0.round; if (st0.mon != null) mon = +st0.mon; if (st0.crit) crit = true; if (Array.isArray(st0.uses)) uses = st0.uses.slice(0,3).map(x=>+x||0);
if (st0.game === 'em') game = 'em'; if (st0.mode === 'open') mode = 'open'; if (st0.cardOn === false) cardOn = false; if (st0.mc && st0.mc.s) mc = {s: st0.mc.s, moves: st0.mc.moves || [], item: st0.mc.item ?? null, speed: st0.mc.speed ?? null};
$('#round').value = String(round); $('#crit').checked = crit;

// ---------- helpers for table rendering ----------
const sortState = {};
function dmgPill(v, lo){const c=v>=100?'p-red':v>=50?'p-amber':v>=34?'p-blue':'p-green';const f=x=>x>999?'999+':x;return `<span class="pill ${c}">${lo!=null?f(lo)+'–':''}${f(v)}%</span>`}
function usesPill(v){if(v==null)return `<span class="pill p-red">Never</span>`;const c=v>=4?'p-red':v>=2?'p-amber':'p-green';return `<span class="pill ${c}">+${v}</span>`}
function hkoPill(n){if(n==null)return `<span class="pill p-red">Can't hit</span>`;const c=n>=4?'p-red':n>=2?'p-amber':'p-green';return `<span class="pill ${c}">${n===1?'OHKO':n+'HKO'}</span>`}
function monCell(s){return `<span class="mon">${esc(s.n)}</span>${s.br?` <span class="tag bad">${esc(s.br)}</span>`:`<span class="set">#${s.i}</span>`}<div class="moves">${s.mv.map(esc).join(' · ')}</div>`}
const rl = r => r[r.length-1]===8 ? (r[0]<8?`R${r[0]}+`:'R8+') : (r[0]===r[r.length-1]?`R${r[0]}`:`R${r[0]}–${r[r.length-1]}`);
function match(s){
  if(round && !s.r.includes(round)) return false;
  if(!q) return true;
  return (s.n+' '+s.it+' '+s.mv.join(' ')+' '+s.na).toLowerCase().includes(q);
}
function build(id, cols, list, defSort){
  const t=$(id); const key=id; const st=sortState[key]||(sortState[key]={k:defSort[0],d:defSort[1]});
  const col=cols.find(c=>c.k===st.k)||cols[0];
  list=list.slice().sort((a,b)=>{const x=col.v(a),y=col.v(b);return (x<y?-1:x>y?1:0)*st.d || a.i-b.i});
  t.innerHTML=`<thead><tr>${cols.map(c=>`<th data-k="${c.k}" scope="col">${c.h}${st.k===c.k?(st.d>0?' ▲':' ▼'):''}</th>`).join('')}</tr></thead>`+
    (list.length?`<tbody>${list.map(r=>`<tr>${cols.map(c=>`<td class="${c.cls||''}">${c.r(r)}</td>`).join('')}</tr>`).join('')}</tbody>`
     :`<tbody><tr><td class="empty" colspan="${cols.length}">No sets match this round and filter.</td></tr></tbody>`);
  t.querySelectorAll('th').forEach(th=>th.onclick=()=>{const k=th.dataset.k;st.d=st.k===k?-st.d:1;st.k=k;renderTables()});
}
const M = s => s.m[mon];
const hit = s => crit ? [M(s).tcm, M(s).tcl, M(s).tc] : M(s).t;

function renderTables(){
  const me = members[mon]; if (!me) return;
  const nm = me.short, spe = me.st.spe, setup = me.setup;
  const all = rows.filter(match);
  const fast = all.filter(s=>s.sp>=spe);
  const cond = all.filter(s=>s.sp<spe && M(s).c.length);
  const U = setup ? Math.min(uses[mon]||0, me.maxUses) : 0, at = setup ? ` at +${U}` : '';
  const ko = all.filter(s=>hit(s)[2]>=100||M(s).om.length);
  const easy = all.filter(s=>M(s).cg!=null && M(s).cg<=U);
  const bulk = all.filter(s=>!(M(s).cg!=null && M(s).cg<=U));
  const safe = !setup?[]:all.filter(s=>M(s).t[2]<=33 && (me.noCrit||M(s).tc<100) && (me.hasSub||s.sp<spe));
  $('#tab-safe').hidden = !setup;
  $('#boostctl').hidden = !setup;
  if(setup){ $('#blabel').textContent = setup.name+' used'; $('#bval').textContent = '+'+U; $('#bminus').disabled = U<=0; $('#bplus').disabled = U>=me.maxUses; }
  if(!setup && view==='safe') view='fast';

  $('#statline').innerHTML=[['Lv',me.lv+' · '+me.raw.na],...STATN.map((k,i)=>[k,me.st[['hp','atk','def','spa','spd','spe'][i]]]),['IVs',me.iv.join('/')],['Item',me.item||'None'],['Moves',me.moves.map(k=>DATA.moves[k].n).join(' · ')]]
    .map(([k,v])=>`<span class="stat"><b>${k}</b>${esc(v)}</span>`).join('');
  $('#n-fast').textContent=fast.length; $('#n-ko').textContent=ko.length; $('#n-bulk').textContent=bulk.length; $('#n-easy').textContent=easy.length; $('#n-safe').textContent=safe.length;

  // texts
  $('#l-fast').textContent='Faster than '+nm;
  $('#h-fast').textContent=`Outspeeds ${nm} (${spe} Speed)`;
  $('#p-fast').textContent=`Sets with more than ${spe} Speed always move first. At exactly ${spe} it's a speed tie, so each side moves first half the time. Damage is the opponent's strongest hit on ${nm} as a share of its ${me.st.hp} HP. "You KO it" is `+(setup?`how many uses of ${setup.name} before your best move is a guaranteed OHKO.`:`how many hits your best move needs on the lowest damage roll.`);
  $('#p-cond').textContent=`These sets are slower than ${nm}, but Quick Claw (20% per turn), a speed boost or a weather ability can let them move first. Salac Berry only triggers at 25% HP or below.`;
  $('#h-ko').textContent=`Can OHKO ${nm} from full HP`;
  $('#p-ko').textContent=`Every set whose best hit can take ${nm} from full to 0 in one move, faster or slower. With "Assume critical hits" off, this lists sets that KO on a normal hit. Tick it to also include sets that only KO with a critical hit (1 in 16 in Gen 3) and to show crit damage across the page. Sheer Cold, Horn Drill, Guillotine and Fissure hit 30% of the time at equal levels and are always listed.`+(me.noCrit?` ${DATA.abilities[me.ability]} blocks critical hits.`:'');
  $('#h-easy').textContent=`${nm} OHKOs these${at}`;
  $('#p-easy').textContent=`Your best move KOs these sets from full HP even on the lowest damage roll${setup?`, after ${U} use${U===1?'':'s'} of ${setup.name}`:''}. Together with "Survives a hit", every set in the Tower is on one of the two lists. The speed column shows whether they get a move in first, and "Their best hit" shows what that move does to you.`;
  $('#h-bulk').textContent=`Not guaranteed an OHKO by ${nm}${at || ' at +0'}`;
  $('#p-bulk').textContent=`"Best hit" is ${nm}'s strongest move against that set at the highest IVs it can have, with whichever ability helps it most. "Hits to KO" uses the lowest roll and ignores their Leftovers or berries. `+
    (setup?`Damage reflects the ${setup.name} count set at the top. "Guaranteed" is how many total uses of ${setup.name} before even the lowest roll KOs; "Possible" is before the highest roll can. "Never" means +6 isn't enough.`:'')+
    (me.moves.some(k=>k==='EXPLOSION'||k==='SELF_DESTRUCT')?` The Explosion column is your last resort; it halves their Defense and faints you.`:'');
  if(setup){
    $('#l-safe').textContent='Safe to '+setup.name;
    $('#h-safe').textContent=`Safe to set up ${setup.name} on`;
    $('#p-safe').textContent=`Their best non-critical hit does at most 33% and a critical hit can't KO from full. `+
      (me.hasSub?`Speed isn't required because ${nm} has Substitute; "Breaks Sub" marks hits that do 25% or more, enough to break it in one hit. `:`They're also slower than ${nm}. `)+
      `"Clean" sets have nothing that undoes your setup; "Watch" lists what can. Their damage is against you at +${U}; "After 1 more" is their best hit after one more ${setup.name}.`;
  }

  const C={
    mon:{k:'mon',h:'Pokémon · set',v:s=>s.n,r:monCell},
    rnd:{k:'rnd',h:'Rounds',v:s=>s.r[0],r:s=>rl(s.r),cls:'num'},
    iv:{k:'iv',h:'IV',v:s=>s.iv,r:s=>s.iv,cls:'num'},
    item:{k:'item',h:'Item',v:s=>s.it,r:s=>esc(s.it||'—')},
    thr:{k:'t',h:'Best hit on you',v:s=>hit(s)[2],r:s=>hit(s)[0]==='-'?'<span class="moves">No damaging move</span>':`${esc(hit(s)[0])} ${dmgPill(hit(s)[2],hit(s)[1])}${crit&&!me.noCrit?' <span class="tag">crit</span>':''}`},
    crit:{k:'tc',h:'Crit',v:s=>M(s).tc,r:s=>M(s).tc?dmgPill(M(s).tc):'—',cls:'num'},
    ko:{k:'ko',h:'You KO it',v:s=>setup?(M(s).cg??9):(M(s).hko??99),r:s=>setup?usesPill(M(s).cg):hkoPill(M(s).hko)},
    hko:{k:'hko',h:'Hits to KO',v:s=>M(s).hko??99,r:s=>hkoPill(M(s).hko)},
  };
  build('#t-fast',[C.mon,C.rnd,C.iv,{k:'sp',h:'Speed',v:s=>s.sp,r:s=>s.sp===spe?`${s.sp} <span class="pill p-amber">tie</span>`:s.sp,cls:'num'},C.item,C.thr,C.crit,C.ko],fast,['sp',-1]);
  build('#t-cond',[C.mon,C.rnd,{k:'sp',h:'Speed',v:s=>s.sp,r:s=>s.sp,cls:'num'},
    {k:'c',h:'How it gets ahead',v:s=>M(s).c[0][0],r:s=>M(s).c.map(c=>`${esc(c[0])}${c[0].startsWith('Quick')?'':` → ${c[1]}`}`).join('<br>')},C.thr,C.crit],cond,['t',-1]);
  const odds=s=>{const h=hit(s);if(h[1]>=100)return[3,'<span class="pill p-red">Every time</span>'];if(h[2]>=100)return[2,'<span class="pill p-amber">High roll</span>'];
    if(!crit&&M(s).tc>=100)return[1,'<span class="pill p-blue">On a crit</span>'];return[0,'—']};
  build('#t-ko',[C.mon,C.rnd,
    {k:'sp',h:'Speed',v:s=>s.sp,r:s=>`${s.sp} `+(s.sp>spe?'<span class="pill p-red">faster</span>':s.sp===spe?'<span class="pill p-amber">tie</span>':'<span class="pill p-green">slower</span>')+(M(s).c.length?`<div class="moves">${M(s).c.map(c=>esc(c[0])).join(', ')}</div>`:''),cls:'num'},
    C.thr,{k:'odds',h:'KOs from full',v:s=>odds(s)[0],r:s=>odds(s)[1]},
    {k:'om',h:'OHKO move',v:s=>M(s).om.length,r:s=>M(s).om.length?M(s).om.map(m=>`<span class="tag bad">${esc(m)} · 30%</span>`).join(''):'—'},
    C.ko,C.item],ko,['odds',-1]);
  build('#t-easy',[C.mon,C.rnd,
    {k:'sp',h:'Speed',v:s=>s.sp,r:s=>`${s.sp} `+(s.sp>spe?'<span class="pill p-red">faster</span>':s.sp===spe?'<span class="pill p-amber">tie</span>':'<span class="pill p-green">slower</span>'),cls:'num'},
    {k:'l',h:'Your best hit',v:s=>M(s).l[2],r:s=>`${esc(M(s).l[0])} <span class="pill p-green">${M(s).l[1]>999?'999+':M(s).l[1]}–${M(s).l[2]>999?'999+':M(s).l[2]}%</span>`},
    {...C.thr,h:'Their best hit'},C.item],easy,['sp',-1]);
  const bestHit={k:'l',h:`Best hit${at||' at +0'}`,v:s=>M(s).l[2],r:s=>M(s).l[0]==='-'?'<span class="pill p-red">Immune to your moves</span>':`${esc(M(s).l[0])} ${dmgPill(M(s).l[2],M(s).l[1]).replace(/p-(red|amber|blue|green)/,'p-blue')}`};
  const bcols=[C.mon,C.rnd,C.iv,bestHit,C.hko];
  if(setup) bcols.push({k:'cg',h:'Guaranteed OHKO',v:s=>M(s).cg??9,r:s=>usesPill(M(s).cg)},
    {k:'cp',h:'Possible OHKO',v:s=>M(s).cp??9,r:s=>M(s).cp==null?'<span class="pill p-red">Never</span>':`+${M(s).cp}`,cls:'num'});
  if(me.moves.some(k=>k==='EXPLOSION'||k==='SELF_DESTRUCT')) bcols.push({k:'boom',h:'Explosion',v:s=>M(s).boom?M(s).boom[0]:0,r:s=>{const b=M(s).boom;if(!b||!b[1])return '<span class="pill p-red">No effect</span>';return `<span class="pill ${b[0]>=100?'p-green':b[1]>=100?'p-amber':'p-red'}">${b[0]>999?'999+':b[0]}–${b[1]>999?'999+':b[1]}%</span>`}});
  bcols.push({k:'ab',h:'Their ability',v:s=>M(s).ab,r:s=>esc(M(s).ab)},C.item);
  build('#t-bulk',bcols,bulk,[setup?'cg':'hko',-1]);
  if(setup){
    const cols=[C.mon,C.rnd,
      {k:'t',h:'Best hit (+0)',v:s=>M(s).t[2],r:s=>M(s).t[0]==='-'?'<span class="moves">No damaging move</span>':`${esc(M(s).t[0])} ${dmgPill(M(s).t[2],M(s).t[1])}`},
      {k:'t1',h:'After 1 more',v:s=>M(s).t1,r:s=>M(s).t1+'%',cls:'num'},
      {k:'tc',h:'Crit',v:s=>M(s).tc,r:s=>M(s).tc?M(s).tc+'%':'—',cls:'num'}];
    if(me.hasSub) cols.push({k:'sub',h:'Breaks Sub',v:s=>M(s).t[2],r:s=>M(s).t[2]>=25?'<span class="pill p-amber">Yes</span>':'<span class="pill p-green">No</span>'},
                            {k:'spd',h:'Speed',v:s=>s.sp,r:s=>s.sp,cls:'num'});
    cols.push({k:'w',h:'Watch',v:s=>s.f.length*10+s.st.length,r:s=>{
      const t=[...s.f.map(x=>`<span class="tag bad">${esc(x)}</span>`),...s.st.map(x=>`<span class="tag warn">${esc(x)}</span>`),...s.b.map(x=>`<span class="tag">${esc(x)}</span>`)];
      return t.length?t.join(''):'<span class="pill p-green">Clean</span>'}},C.item);
    build('#t-safe',cols,safe,['w',1]);
  }
  ['fast','ko','easy','bulk','safe'].forEach(v=>{$('#v-'+v).hidden=v!==view;$('#tab-'+v).setAttribute('aria-selected',v===view)});
  $('#v-team').hidden=view!=='team'; $('#tab-team').setAttribute('aria-pressed',view==='team');
  store.set('bt-state',{view,round,mon,crit,uses,game,mode,cardOn,mc});
  renderCard();
}

// ---------- team editor ----------
const spByName = {}, mvByName = {};
function fillLists(){
  const spKeys = Object.keys(DATA.species).sort((a,b)=>DATA.species[a].n.localeCompare(DATA.species[b].n));
  spKeys.forEach(k=>spByName[DATA.species[k].n.toLowerCase()]=k);
  $('#dl-species').innerHTML = spKeys.map(k=>`<option value="${esc(DATA.species[k].n)}">`).join('');
  const mvKeys = Object.keys(DATA.moves).sort((a,b)=>DATA.moves[a].n.localeCompare(DATA.moves[b].n));
  mvKeys.forEach(k=>mvByName[DATA.moves[k].n.toLowerCase()]=k);
  $('#dl-moves').innerHTML = mvKeys.map(k=>`<option value="${esc(DATA.moves[k].n)}">`).join('');
}
function validate(m){
  m.iv = (m.iv||[]).slice(0,6).map(v=>Math.max(0,Math.min(31,+v||0))); while(m.iv.length<6) m.iv.push(31);
  m.ev = (m.ev||[]).slice(0,6).map(v=>Math.max(0,Math.min(255,+v||0))); while(m.ev.length<6) m.ev.push(0);
  if(!DATA.species[m.s]) m.s='LATIOS';
  if(!E.NAT[m.na]) m.na='Hardy';
  const abs = DATA.species[m.s].a; if(!abs.includes(m.ab)) m.ab = abs[0]||'NONE';
  m.mv = (m.mv||[]).slice(0,4).map(k=>DATA.moves[k]?k:''); while(m.mv.length<4) m.mv.push('');
  if(!E.ITEMS.includes(m.it)) m.it='';
  m.nick = (m.nick||'').slice(0,12);
  m.lv = Math.max(1, Math.min(100, Math.round(+m.lv || 50)));
  return m;
}
function cardHTML(m, i){
  const sp = DATA.species[m.s];
  const st = E.calcStats(sp.b, m.na, m.iv, m.ev, m.lv);
  const evTotal = m.ev.reduce((a,b)=>a+b,0);
  const hp = m.mv.includes('HIDDEN_POWER') ? E.hiddenPower(m.iv) : null;
  const opt=(v,l,sel)=>`<option value="${esc(v)}"${v===sel?' selected':''}>${esc(l)}</option>`;
  return `<div class="card" data-i="${i}">
    <div class="row2">
      <div class="fld"><label for="sp${i}">Species</label><input id="sp${i}" data-f="s" list="dl-species" value="${esc(sp.n)}" autocomplete="off"></div>
      <div class="fld"><label for="nk${i}">Nickname</label><input id="nk${i}" data-f="nick" value="${esc(m.nick)}" maxlength="12" placeholder="Optional"></div>
      <div class="fld"><label for="lv${i}">Level</label><input id="lv${i}" data-f="lv" type="number" min="1" max="100" value="${m.lv}"></div>
    </div>
    <div class="types">${sp.t.map(t=>`<span class="tag">${t[0]+t.slice(1).toLowerCase()}</span>`).join('')}${BANNED.has(m.s)?'<span class="tag bad">Banned in the Tower</span>':''}</div>
    <div class="row3">
      <div class="fld"><label for="na${i}">Nature</label><select id="na${i}" data-f="na">${Object.keys(E.NAT).map(n=>{const x=E.NAT[n];return opt(n,x.length?`${n} (+${x[0]} −${x[1]})`.replace(/spa/g,'SpA').replace(/spd/g,'SpD').replace(/atk/g,'Atk').replace(/def/g,'Def').replace(/spe/g,'Spe'):n,m.na)}).join('')}</select></div>
      <div class="fld"><label for="ab${i}">Ability</label><select id="ab${i}" data-f="ab">${sp.a.map(a=>opt(a,DATA.abilities[a]||a,m.ab)).join('')}</select></div>
      <div class="fld"><label for="it${i}">Item</label><select id="it${i}" data-f="it">${E.ITEMS.map(x=>opt(x,x||'None',m.it)).join('')}</select></div>
    </div>
    <div class="moves4">${m.mv.map((k,j)=>`<div class="fld"><label for="mv${i}${j}">Move ${j+1}</label><input id="mv${i}${j}" data-f="mv" data-j="${j}" list="dl-moves" value="${esc(k?DATA.moves[k].n:'')}" autocomplete="off" placeholder="—"></div>`).join('')}</div>
    ${hp?`<p class="hint">Hidden Power from these IVs: ${hp.type[0]+hp.type.slice(1).toLowerCase()} ${hp.power}</p>`:''}
    <table class="stats"><thead><tr><th></th>${STATN.map(s=>`<th>${s}</th>`).join('')}</tr></thead><tbody>
      <tr><th>Base</th>${sp.b.map(v=>`<td>${v}</td>`).join('')}</tr>
      <tr><th>IV</th>${m.iv.map((v,j)=>`<td><input aria-label="${STATN[j]} IV" id="iv${i}${j}" data-f="iv" data-j="${j}" type="number" min="0" max="31" value="${v}"></td>`).join('')}</tr>
      <tr><th>EV</th>${m.ev.map((v,j)=>`<td><input aria-label="${STATN[j]} EV" id="ev${i}${j}" data-f="ev" data-j="${j}" type="number" min="0" max="255" step="4" value="${v}"></td>`).join('')}</tr>
      <tr class="tot"><th>Lv ${m.lv}</th>${['hp','atk','def','spa','spd','spe'].map(k=>`<td>${st[k]}</td>`).join('')}</tr>
    </tbody></table>
    <p class="hint ${evTotal>510?'bad':''}">EVs used: ${evTotal} / 510</p>
  </div>`;
}
function teamWarnings(){
  const w=[]; const sp=team.map(m=>m.s), it=team.map(m=>m.it).filter(Boolean);
  if(new Set(sp).size<sp.length) w.push('Two team members are the same species.');
  if(new Set(it).size<it.length) w.push('Two team members hold the same item.');
  team.forEach((m,i)=>{if(!m.mv.some(Boolean)) w.push(`Slot ${i+1} has no moves.`)});
  if(mode==='50' && team.some(m=>m.lv>50)) w.push('Level 50 mode only allows Pokémon at level 50 or below.');
  return w;
}
function renderTeam(){
  $('#teamgrid').innerHTML = team.map(cardHTML).join('');
  const w=teamWarnings(); $('#msg').textContent = w.join(' ');
}
let timer=null;
function onTeamInput(e){
  const el=e.target, card=el.closest('.card'); if(!card||!el.dataset.f) return;
  const i=+card.dataset.i, m=team[i], f=el.dataset.f, j=+el.dataset.j;
  let rerenderCard=false;
  if(f==='s'){const k=spByName[el.value.trim().toLowerCase()]; if(!k) return; if(k!==m.s){m.s=k; rerenderCard=true;}}
  else if(f==='nick') m.nick=el.value.slice(0,12);
  else if(f==='lv'){ if(el.value==='') return; m.lv=+el.value; rerenderCard=true; }
  else if(f==='na'||f==='ab'||f==='it'){m[f]=el.value; rerenderCard=true;}
  else if(f==='mv'){const v=el.value.trim(); if(!v){m.mv[j]='';} else {const k=mvByName[v.toLowerCase()]; if(!k) return; m.mv[j]=k;} rerenderCard = (m.mv[j]==='HIDDEN_POWER');}
  else if(f==='iv'||f==='ev'){m[f][j]=Math.max(0,Math.min(f==='iv'?31:255,+el.value||0)); rerenderCard=true;}
  validate(m);
  if(rerenderCard && e.type==='change'){ const focusId=document.activeElement&&document.activeElement.id; requestAnimationFrame(()=>{ const c=document.querySelector(`.card[data-i="${i}"]`); if(!c) return; c.outerHTML=cardHTML(m,i); if(focusId&&document.getElementById(focusId)) document.getElementById(focusId).focus(); }); }
  store.set('bt-team',team);
  clearTimeout(timer); timer=setTimeout(recompute,150);
}
function recompute(){
  const key = dsKey(); const oppLevel = oppLv();
  result = E.analyze(team, {uses, sets: DATA.sets[key], round, oppLevel, tag: key}); rows = result.rows; members = result.members;
  syncModeUI();
  rows.forEach(r=>r.rl=rl(r.r));
  $('#msg').textContent = teamWarnings().join(' ');
  renderTables();
}

// ---------- wiring ----------
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{view=b.dataset.v; renderTables()});
$('#tab-team').onclick=()=>{view = view==='team' ? 'fast' : 'team'; if(view==='team') renderTeam(); renderTables(); if(view==='team') $('#v-team').scrollIntoView({block:'start',behavior:'smooth'})};
const step=d=>{const me=members[mon]; if(!me||!me.setup) return; uses[mon]=Math.max(0,Math.min(me.maxUses,(uses[mon]||0)+d)); recompute()};
$('#bminus').onclick=()=>step(-1); $('#bplus').onclick=()=>step(1);
$('#round').onchange=e=>{round=+e.target.value;recompute()};
$('#mon').onchange=e=>{mon=+e.target.value;renderTables()};
$('#crit').onchange=e=>{crit=e.target.checked;renderTables()};
$('#q').oninput=e=>{q=e.target.value.trim().toLowerCase();renderTables()};
$('#teamgrid').addEventListener('input',onTeamInput);
$('#teamgrid').addEventListener('change',onTeamInput);
$('#reset').onclick=()=>{team=JSON.parse(JSON.stringify(DATA.team)).map(validate); store.set('bt-team',team); renderTeam(); recompute(); $('#msg').textContent='Team reset.'};
const encode=t=>btoa(unescape(encodeURIComponent(JSON.stringify(t.map(m=>[m.s,m.nick,m.na,m.ab,m.it,m.mv,m.iv,m.ev,m.lv])))));
const decode=s=>JSON.parse(decodeURIComponent(escape(atob(s.trim())))).map(a=>({s:a[0],nick:a[1],na:a[2],ab:a[3],it:a[4],mv:a[5],iv:a[6],ev:a[7],lv:a[8]||50}));
$('#copy').onclick=()=>{const code=encode(team); const p=$('#paste'); p.value=code;
  const done=()=>$('#msg').textContent='Team code copied.';
  if(navigator.clipboard) navigator.clipboard.writeText(code).then(done,()=>{p.select();$('#msg').textContent='Copy the selected code with Ctrl+C or ⌘C.'}); else {p.select();$('#msg').textContent='Copy the selected code with Ctrl+C or ⌘C.'}};
$('#load').onclick=()=>{try{const t=decode($('#paste').value); if(!Array.isArray(t)||!t.length) throw 0; team=t.slice(0,3).map(validate); while(team.length<3) team.push(validate(JSON.parse(JSON.stringify(DATA.team[team.length]))));
  store.set('bt-team',team); renderTeam(); recompute(); $('#msg').textContent='Team loaded.'}catch(e){$('#msg').textContent="That code didn't work. Copy the whole code and try again."}};

// ---------- game / mode ----------
const dsKey = () => game === 'rs' ? (mode === '50' ? 'rs50' : 'rs100') : (mode === '50' ? 'em50' : 'emopen');
const oppLv = () => mode === '50' ? 50 : (game === 'rs' ? 100 : Math.max(60, ...team.map(m => m.lv)));
const GAME_NAME = {rs: 'Ruby & Sapphire', em: 'Emerald'};
function syncModeUI(){
  document.querySelectorAll('[data-game]').forEach(b => b.setAttribute('aria-pressed', b.dataset.game === game));
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode));
  $('#mode-hi').textContent = game === 'rs' ? 'Level 100' : 'Open Level';
  $('#opp-lv').textContent = `Opponents are level ${oppLv()}` + (game === 'em' && mode === 'open' ? ' (your highest level, minimum 60)' : '') + '.';
  $('#sub-game').textContent = GAME_NAME[game];
  const sel = $('#mon'); const cur = mon;
  sel.innerHTML = members.map((m,i)=>`<option value="${i}">${esc(m.name)} · Lv ${m.lv}</option>`).join('');
  mon = Math.min(cur, members.length-1); sel.value = String(mon);
}
function setGame(g){ game = g; mc = {s: null, moves: [], item: null, speed: null}; recompute(); }
function setMode(m){ mode = m; recompute(); if (view === 'team') renderTeam(); }

// ---------- matchup card ----------
const evText = ev => ev.map((v,i)=>v?`${v} ${STATN[i]}`:'').filter(Boolean).join(' / ') || 'None';
function cardCandidates(){ return mc.s ? rows.filter(r => r.s === mc.s) : []; }
function cardFilter(list, skip){
  const me = members[mon];
  return list.filter(r =>
    (skip === 'moves' || mc.moves.every(k => r.mk.includes(k))) &&
    (skip === 'item' || mc.item == null || r.it === mc.item) &&
    (skip === 'speed' || !mc.speed || (mc.speed === 'first' ? (r.sp >= me.st.spe || r.it === 'Quick Claw') : r.sp <= me.st.spe)));
}
function verdictFor(idx, list){
  const me = members[idx]; const U = me.setup ? Math.min(uses[idx]||0, me.maxUses) : 0;
  const ms = list.map(r => r.m[idx]);
  const faster = list.filter(r => r.sp > me.st.spe).length, ties = list.filter(r => r.sp === me.st.spe).length;
  const inc = ms.map(m => crit && !me.noCrit ? [m.tcm, m.tcl, m.tc] : m.t);
  let worst = inc.reduce((a,b) => b[2] > a[2] ? b : a, ['-',0,0]);
  const om = [...new Set(ms.flatMap(m => m.om))];
  const ko = ms.filter(m => m.cg != null && m.cg <= U).length;
  const minOut = ms.reduce((a,m)=>Math.min(a,m.l[1]), Infinity), maxOut = ms.reduce((a,m)=>Math.max(a,m.l[2]), 0);
  const outMove = ms.length ? ms.reduce((a,m)=>m.l[1] < a.l[1] ? m : a).l[0] : '-';
  const hkos = ms.map(m => m.hko).filter(x => x != null); const worstHko = ms.some(m => m.hko == null) ? null : Math.max(...hkos);
  const needs = me.setup ? ms.map(m => m.cg) : [];
  const needAll = me.setup ? (needs.some(x => x == null) ? null : Math.max(...needs)) : null;
  const n = list.length, ohkoAll = ko === n, outspeedAll = faster === 0 && ties === 0, survives = worst[2] < 100 && !om.length;
  // Damage race: hits you need (lowest roll, worst set) vs hits it needs (highest roll, worst set)
  const myHits = worstHko ?? 99, theirHits = worst[2] > 0 ? Math.ceil(100 / worst[2]) : 99;
  const wins = outspeedAll ? myHits <= theirHits : myHits < theirHits;
  let label, cls;
  if (ohkoAll && outspeedAll) { label = 'OHKOs before it moves'; cls = 'p-green'; }
  else if (ohkoAll && survives) { label = 'Takes a hit, then OHKOs'; cls = 'p-green'; }
  else if (ohkoAll) { label = 'OHKOs, but can be OHKO\'d first'; cls = 'p-amber'; }
  else if (myHits === 99) { label = 'Can\'t damage it'; cls = 'p-red'; }
  else if (wins) { label = 'Wins the exchange'; cls = 'p-blue'; }
  else if (survives) { label = 'Loses the exchange'; cls = 'p-amber'; }
  else { label = 'Can be OHKO\'d'; cls = 'p-red'; }
  const score = Math.max(-5, Math.min(5, theirHits - myHits)) + (outspeedAll ? 1 : 0) + (ohkoAll && outspeedAll ? 5 : 0) + (wins ? 3 : 0) - (om.length ? 0.5 : 0) - worst[2] / 1000;
  const race = myHits === 99 ? '' : `You need ${myHits === 1 ? '1 hit' : myHits + ' hits'}, it needs ${theirHits === 99 ? 'none (no attacks)' : theirHits === 1 ? '1 hit' : theirHits + ' hits'}`;
  return {me, U, faster, ties, n, worst, om, ko, minOut, maxOut, outMove, worstHko, needAll, label, cls, score, race};
}
function renderCard(){
  const box = $('#mcard'); if (!box || !DATA) return;
  $('#mc-switch').checked = cardOn; $('#mc-body').hidden = !cardOn;
  if (!cardOn) return;
  // species list for the current game/mode/round
  const spKeys = [...new Set(rows.map(r => r.s))].sort((a,b) => DATA.species[a].n.localeCompare(DATA.species[b].n));
  $('#dl-opp').innerHTML = spKeys.map(k => `<option value="${esc(DATA.species[k].n)}">`).join('');
  const inp = $('#mc-sp');
  if (document.activeElement !== inp) inp.value = mc.s ? DATA.species[mc.s].n : '';
  const cands = cardCandidates();
  const out = $('#mc-out');
  if (!mc.s) { out.innerHTML = `<p class="note">Type the Pokémon you're facing. The card lists every set it can have in ${round ? 'round ' + round : 'any round'} and how each of your Pokémon handles it.</p>`; return; }
  if (!cands.length) { out.innerHTML = `<p class="note">${esc(DATA.species[mc.s].n)} doesn't appear in ${GAME_NAME[game]} ${mode === '50' ? 'Level 50' : $('#mode-hi').textContent} ${round ? 'round ' + round : ''}. Check the round, game or mode.</p>`; return; }
  const left = cardFilter(cands);
  const me = members[mon];
  // chips
  const moveKeys = [...new Set(cands.flatMap(r => r.mk))].sort((a,b) => DATA.moves[a].n.localeCompare(DATA.moves[b].n));
  const items = [...new Set(cands.map(r => r.it))].sort();
  const chip = (group, val, label, on, count) => `<button type="button" class="chipb" data-g="${group}" data-v="${esc(val)}" aria-pressed="${on}" ${!on && !count ? 'disabled' : ''}>${esc(label)}<span class="cnt">${count}</span></button>`;
  const baseM = cardFilter(cands, 'moves');
  const moveChips = moveKeys.map(k => chip('move', k, DATA.moves[k].n, mc.moves.includes(k), baseM.filter(r => r.mk.includes(k) && mc.moves.every(x => r.mk.includes(x))).length)).join('');
  const baseI = cardFilter(cands, 'item');
  const itemChips = items.map(it => chip('item', it, it || 'No item', mc.item === it, baseI.filter(r => r.it === it).length)).join('');
  const baseS = cardFilter(cands, 'speed');
  const spFirst = baseS.filter(r => r.sp >= me.st.spe || r.it === 'Quick Claw').length, spSecond = baseS.filter(r => r.sp <= me.st.spe).length;
  const speedChips = chip('speed', 'first', `It moved before ${me.short}`, mc.speed === 'first', spFirst) + chip('speed', 'second', `${me.short} moved first`, mc.speed === 'second', spSecond);
  const anyFilter = mc.moves.length || mc.item != null || mc.speed;
  // verdicts
  let html = `<div class="mc-left">
    <div class="mc-count"><b>${left.length}</b> of ${cands.length} possible set${cands.length===1?'':'s'}${anyFilter?' <button type="button" class="linkbtn" id="mc-reset">Clear revealed info</button>':''}</div>
    <div class="chipgroup"><span class="glabel">Moves it used</span>${moveChips}</div>
    <div class="chipgroup"><span class="glabel">Item it showed</span>${itemChips}</div>
    <div class="chipgroup"><span class="glabel">Turn order</span>${speedChips}</div>
    <p class="hint">Turn order ignores priority moves like Quick Attack. "It moved before" also keeps Quick Claw sets.</p>
  </div>`;
  if (left.length) {
    const vs = members.map((m,i) => verdictFor(i, left));
    const best = vs.reduce((a,b) => b.score > a.score ? b : a);
    html += `<div class="mc-vs">${vs.map((v,i) => `<div class="vcard${v===best?' best':''}${i===mon?' active':''}">
      <div class="vhead"><span class="mon">${esc(v.me.short)}</span>${v===best?'<span class="pill p-green">Best answer</span>':''}</div>
      <span class="pill ${v.cls}">${esc(v.label)}</span>
      <dl>
        <dt>Speed ${v.me.st.spe}</dt><dd>${v.faster+v.ties===0?'Faster than every set':v.faster===v.n?'Slower than every set':`${v.faster} faster${v.ties?`, ${v.ties} tie`:''} of ${v.n}`}</dd>
        <dt>Their worst hit${crit&&!v.me.noCrit?' (crit)':''}</dt><dd>${v.worst[0]==='-'?'No damaging moves':`${esc(v.worst[0])} ${dmgPill(v.worst[2])}`}${v.om.length?` <span class="tag bad">${esc(v.om.join(', '))}</span>`:''}</dd>
        <dt>Your hit${v.me.setup?` at +${v.U}`:''}</dt><dd>${v.maxOut?`${esc(v.outMove)} ${v.minOut}–${v.maxOut>999?'999+':v.maxOut}%`:'Can\'t damage it'} · OHKOs ${v.ko} of ${v.n}</dd>
        ${v.race?`<dt>Exchange</dt><dd>${v.race}</dd>`:''}
        ${v.me.setup?`<dt>${esc(v.me.setup.name)} to OHKO all</dt><dd>${v.needAll==null?'Never':'+'+v.needAll}</dd>`:''}
      </dl></div>`).join('')}</div>`;
    html += `<details class="mc-sets"${left.length<=4?' open':''}><summary>Show the ${left.length} remaining set${left.length===1?'':'s'}</summary><div class="tablebox"><table class="mini"><thead><tr><th>Set</th><th>Item</th><th>Nature</th><th>EVs</th><th>Moves</th><th>IV</th><th>Speed</th></tr></thead><tbody>${
      left.map(r => `<tr><td>${r.br?esc(r.br):'#'+r.i}</td><td>${esc(r.it||'—')}</td><td>${esc(r.na)}</td><td>${evText(r.ev)}</td><td>${r.mv.map(esc).join(' · ')}</td><td class="num">${r.iv}</td><td class="num">${r.sp}</td></tr>`).join('')}</tbody></table></div></details>`;
  } else {
    html += `<p class="note">No set matches everything you've marked. Clear one of the chips.</p>`;
  }
  out.innerHTML = html;
}
function cardEvents(){
  $('#mc-switch').onchange = e => { cardOn = e.target.checked; renderTables(); };
  const pick = () => { const k = spByName[$('#mc-sp').value.trim().toLowerCase()]; if (k && k !== mc.s) { mc = {s: k, moves: [], item: null, speed: null}; renderTables(); } };
  $('#mc-sp').addEventListener('input', pick); $('#mc-sp').addEventListener('change', pick);
  $('#mc-clear').onclick = () => { mc = {s: null, moves: [], item: null, speed: null}; $('#mc-sp').value = ''; renderTables(); $('#mc-sp').focus(); };
  $('#mc-out').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'mc-reset') { mc.moves = []; mc.item = null; mc.speed = null; renderTables(); return; }
    const g = b.dataset.g, v = b.dataset.v; if (!g) return;
    if (g === 'move') mc.moves = mc.moves.includes(v) ? mc.moves.filter(x => x !== v) : [...mc.moves, v];
    if (g === 'item') mc.item = mc.item === v ? null : v;
    if (g === 'speed') mc.speed = mc.speed === v ? null : v;
    renderTables();
  });
  document.querySelectorAll('[data-game]').forEach(b => b.onclick = () => setGame(b.dataset.game));
  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
  $('#helpbtn').onclick = () => { help = !help; $('#help').hidden = !help; $('#helpbtn').setAttribute('aria-expanded', help); if (help) $('#help').scrollIntoView({block: 'nearest'}); };
  $('#help-close').onclick = () => { help = false; $('#help').hidden = true; $('#helpbtn').setAttribute('aria-expanded', false); $('#helpbtn').focus(); };
}

(window.TOWER_DATA?Promise.resolve(window.TOWER_DATA):Promise.reject()).then(d=>{
  DATA=d; E=TowerEngine.makeEngine(DATA); fillLists(); cardEvents();
  const saved=store.get('bt-team');
  team = (Array.isArray(saved)&&saved.length===3?saved:JSON.parse(JSON.stringify(DATA.team))).map(validate);
  if(view==='team') renderTeam();
  recompute();
}).catch(()=>{$('#t-fast').innerHTML='<tbody><tr><td class="empty">The Battle Tower data didn\'t load. Reload the page to try again.</td></tr></tbody>'});
})();
