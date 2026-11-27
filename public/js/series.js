// One result per date and pairing. Keep map rounds separate from series wins.
globalThis.onyxSeries = function onyxSeries(matches) {
  const groups = new Map();
  for (const m of matches) {
    if (m.ra == null || m.rb == null || +m.ra === +m.rb || m.a === m.b) continue;
    const [a,b] = [m.a,m.b].sort();
    const key = JSON.stringify([String(m.fecha),a,b]);
    if (!groups.has(key)) groups.set(key,{a,b,regular:[],decider:[]});
    groups.get(key)[m.leg === 'desempate' ? 'decider' : 'regular'].push(m);
  }
  const series = [];
  for (const {a,b,regular,decider} of groups.values()) {
    const s = {a,b,ra:0,rb:0,roundA:0,roundB:0,proj:false};
    for (const m of [...regular.slice(0,2),...decider.slice(0,1)]) {
      if (s.ra === 2 || s.rb === 2) break;
      if (m.leg === 'desempate' && !(s.ra === 1 && s.rb === 1)) continue;
      const [x,y] = m.a === a ? [+m.ra,+m.rb] : [+m.rb,+m.ra];
      s[x>y?'ra':'rb']++;
      s.roundA+=x; s.roundB+=y; s.proj ||= !!m.proj;
    }
    series.push(s);
  }
  return series;
};
