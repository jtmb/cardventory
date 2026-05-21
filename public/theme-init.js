(function(){
  try {
    var stored = localStorage.getItem('cv_theme');
    if (!stored) {
      // No theme saved — seed the default dark preset
      var defaults = {primary:'#b8b8c7',background:'#1a1919',card:'#1a1a1a',sidebar:'#111111',foreground:'#e5e5e5',mutedForeground:'#737373',destructive:'#ef4444'};
      localStorage.setItem('cv_theme', JSON.stringify(defaults));
      localStorage.setItem('cv_preset', 'default');
      stored = JSON.stringify(defaults);
    }
    var c = JSON.parse(stored || '{}');
    var e = document.documentElement;
    var s = function(p, v) { e.style.setProperty(p, v); };
    if (c.primary) {
      ['--primary','--ring','--sidebar-primary','--sidebar-ring','--chart-1']
        .forEach(function(p) { s(p, c.primary); });
    }
    if (c.background) s('--background', c.background);
    if (c.card) {
      ['--card','--popover','--secondary','--muted','--accent']
        .forEach(function(p) { s(p, c.card); });
    }
    if (c.sidebar) {
      ['--sidebar','--sidebar-accent'].forEach(function(p) { s(p, c.sidebar); });
    }
    if (c.foreground) {
      ['--foreground','--card-foreground','--popover-foreground',
       '--secondary-foreground','--sidebar-foreground','--accent-foreground']
        .forEach(function(p) { s(p, c.foreground); });
    }
    if (c.mutedForeground) {
      ['--muted-foreground','--sidebar-accent-foreground']
        .forEach(function(p) { s(p, c.mutedForeground); });
    }
    if (c.destructive) s('--destructive', c.destructive);
  } catch(err) {}
})();
// Font theme — applied before first paint to prevent FOUC
(function(){
  try {
    var f = localStorage.getItem('cv_font');
    var e = document.documentElement;
    if      (f === 'modern') e.style.fontFamily = 'var(--font-jakarta)';
    else if (f === 'system') e.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    else if (f === 'bebas')  e.style.fontFamily = 'var(--font-bebas)';
    else if (f === 'inter')  e.style.fontFamily = 'var(--font-inter)';
    else if (f === 'nunito') e.style.fontFamily = 'var(--font-nunito)';
  } catch(err) {}
})();
// Type density — applied before first paint to prevent FOUC
(function(){
  try {
    var d = localStorage.getItem('cv_type_density');
    if (d) document.documentElement.style.setProperty('--type-density', d);
  } catch(err) {}
})();
// Card/chip/button style + sleeve — set data attributes before first paint
(function(){
  try {
    var e = document.documentElement;
    var cs = localStorage.getItem('cv_card_style') || 'elevated'; e.setAttribute('data-card-style', cs);
    var ch = localStorage.getItem('cv_chip_style'); if (ch) e.setAttribute('data-chip-style', ch);
    var bs = localStorage.getItem('cv_btn_style');  if (bs) e.setAttribute('data-btn-style',  bs);
    var sl = localStorage.getItem('cv_sleeve');      if (sl) e.setAttribute('data-sleeve',      sl);
  } catch(err) {}
})();
