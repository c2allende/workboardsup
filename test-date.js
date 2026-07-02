const monthMap = {
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
  'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
  'ene': '01', 'abr': '04', 'ago': '08', 'dic': '12'
};

function parseDate(str) {
  if(!str) return null;
  const s = String(str).trim();
  
  // YYYY-MM-DD
  if(s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
  
  // DD-MMM-YY or DD-MMM-YYYY or DD-MMM.-YY
  const m = s.match(/^(\d{1,2})-([a-zA-Z]{3})\.?-(\d{2,4})$/);
  if(m) {
    const d = m[1].padStart(2, '0');
    const mon = monthMap[m[2].toLowerCase()] || '01';
    let y = parseInt(m[3]);
    if(y < 100) y = y < 50 ? 2000 + y : 1900 + y;
    return `${y}-${mon}-${d}`;
  }
  
  // MM/DD/YYYY or M/D/YY
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(m2) {
    const mon = m2[1].padStart(2, '0');
    const d = m2[2].padStart(2, '0');
    let y = parseInt(m2[3]);
    if(y < 100) y = y < 50 ? 2000 + y : 1900 + y;
    return `${y}-${mon}-${d}`;
  }
  
  // DD/MM/YYYY or D/M/YY
  const m3 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); // Wait, this overlaps. If it's DD/MM, how to know? Usually if >12 it's DD.
  
  // Excel serial number
  if(s.match(/^\d{5}$/)) {
    const num = parseInt(s);
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  return null;
}

console.log(parseDate("28-Jun-26"));
console.log(parseDate("28-jun.-26"));
console.log(parseDate("05/31/2026"));
console.log(parseDate("2026-06-28"));
console.log(parseDate("46153")); // roughly 2026 something
