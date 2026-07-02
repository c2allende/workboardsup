const monthMap = {
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
  'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
  'ene': '01', 'abr': '04', 'ago': '08', 'dic': '12'
};

function parseDate(str) {
  if(!str) return null;
  const s = String(str).trim();
  if(s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
  const m = s.match(/^(\d{1,2})-([a-zA-Z]{3})\.?-(\d{2,4})$/);
  if(m) {
    const d = m[1].padStart(2, '0');
    const mon = monthMap[m[2].toLowerCase()] || '01';
    let y = parseInt(m[3]);
    if(y < 100) y = y < 50 ? 2000 + y : 1900 + y;
    return `${y}-${mon}-${d}`;
  }
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(m2) {
    const mon = m2[1].padStart(2, '0');
    const d = m2[2].padStart(2, '0');
    let y = parseInt(m2[3]);
    if(y < 100) y = y < 50 ? 2000 + y : 1900 + y;
    return `${y}-${mon}-${d}`;
  }
  if(s.match(/^\d{5}$/)) {
    const num = parseInt(s);
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    const y = date.getUTCFullYear();
    const mon = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${mon}-${d}`;
  }
  return null;
}

const json = [
  ["Nombre Empleado", "D", "L", "M", "W", "J", "V", "S"],
  [null, "28-Jun-26", "29-Jun-26", "30-Jun-26", "1-Jul-26", "2-Jul-26", "3-Jul-26", "4-Jul-26"],
  ["Victor Vazquez Tirado", "4/12", "4/12", "L", "L", "4/12", "ENF", "4/12"],
  ["889961", null, null, null, null, null, null, null],
  ["Andres Rivera Maldonado", "6/2", "L", "4/12", "4/12", "6/2", "4/12", "L"],
  ["889553", null, null, null, null, null, null, null]
];

let dateRowIndex = -1;
let dates = [];
for(let i=0; i<json.length; i++) {
  const row = json[i] || [];
  const parsed = parseDate(row[1]);
  if (parsed) {
    dateRowIndex = i;
    for(let c=1; c<row.length; c++) {
       dates[c] = parseDate(row[c]);
    }
    break;
  }
}

console.log("dateRowIndex:", dateRowIndex);
console.log("dates:", dates);

const schedules = {};
for(let c=1; c<dates.length; c++) {
   if(dates[c]) schedules[dates[c]] = {};
}

for(let i = dateRowIndex + 1; i < json.length - 1; i++) {
  const row1 = json[i] || [];
  const row2 = json[i+1] || [];
  
  const name = String(row1[0] || '').trim();
  const empIdStr = String(row2[0] || '').trim();
  
  if (name && name.length > 3 && !name.match(/^\d+$/) && name !== '***' && name !== 'ALM') {
     if (empIdStr && empIdStr.match(/^\d+$/)) {
        const empId = empIdStr;
        for(let c=1; c<dates.length; c++) {
           const dateStr = dates[c];
           let shift = String(row1[c] || '').trim();
           if(dateStr && shift && shift !== '***' && shift !== 'ALM' && shift !== 'null' && shift !== 'undefined') {
              schedules[dateStr][empId] = shift;
           }
        }
     }
  }
}

console.log("Schedules:", JSON.stringify(schedules, null, 2));
