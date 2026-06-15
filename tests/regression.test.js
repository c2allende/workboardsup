const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = global;
require(path.join(__dirname, '..', 'scheduling-engine.js'));

const globalRules = {
  coverage: {
    cocina: { required: { C1: 1, C3: 1 } },
    centro: { alternatives: [{ D1: 2, D2: 1 }] }
  },
  workShiftIds: ['C1', 'C2', 'C3', 'D1', 'D2', 'A1', 'E1'],
  absenceShiftIds: ['L', 'V', 'LR', 'FSE', 'PER', 'F', 'ENF'],
  openingShiftIds: ['C1', 'D1'],
  defaultMaxWorkDaysPerWeek: 5,
  draftEnabled: true
};

const employees = [
  { id: 1, area: 'cocina' },
  { id: 2, area: 'cocina' },
  { id: 3, area: 'centro' },
  { id: 4, area: 'centro' },
  { id: 5, area: 'centro' }
];

const result = window.SchedulingEngine.generate({
  employees,
  existingSchedule: {},
  requests: [],
  rulesByEmployee: {},
  globalRules,
  dateFrom: '2026-06-07',
  dateTo: '2026-06-13'
});

assert.equal(Object.keys(result.draftSchedule).length, 7);
for (const day of Object.values(result.draftSchedule)) {
  assert.equal(Object.keys(day).length, employees.length);
}

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const mobileHtml = fs.readFileSync(path.join(__dirname, '..', 'TurnosSup.html'), 'utf8');
const firebaseConfig = fs.readFileSync(path.join(__dirname, '..', 'firebase.json'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const pilotFunction = fs.readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');

assert.doesNotMatch(indexHtml, /window\.renderRequests\(\)/);
assert.doesNotMatch(indexHtml, /p === '890900'/);
assert.match(indexHtml, /getDocs, query, onSnapshot/);
assert.match(indexHtml, /'Turno AM Cocina': 'C1'/);
assert.match(indexHtml, /escapeHtml\(m\.text\)/);
assert.match(mobileHtml, /const isToday = dateStr === ds\(today\)/);
assert.doesNotMatch(mobileHtml, /id === '890000'/);
assert.match(mobileHtml, /autocomplete="current-password"/);
assert.match(mobileHtml, /escapeHtml\(m\.text\)/);
assert.match(firebaseConfig, /"\*\*\/\*\.xlsm"/);
assert.match(firebaseConfig, /"usuarios\.md"/);
assert.match(firebaseConfig, /"source": "functions"/);
assert.match(firebaseConfig, /"functions\/\*\*"/);
assert.match(mobileHtml, /notificationDevices/);
assert.doesNotMatch(mobileHtml, /Este piloto está limitado a Empleado Prueba/);
assert.match(mobileHtml, /window\.enableShiftReminders/);
assert.match(mobileHtml, /window\.reminderEnabled/);
assert.match(indexHtml, /toggleReminderFeature/);
assert.match(indexHtml, /reminderActivationId = Date\.now\(\)/);
assert.match(pilotFunction, /reminderEnabled/);
assert.match(pilotFunction, /reminderEnabled === false/);
assert.match(pilotFunction, /no devices enabled for the current activation/);
assert.match(serviceWorker, /firebase\.messaging\(\)/);
assert.match(serviceWorker, /workboard-cache-v85/);
assert.match(mobileHtml, /currentUserRole = 'dietista'/);
assert.match(mobileHtml, /dietSupFullScheduleLink/);
assert.match(mobileHtml, /dietsupMobile=1/);
assert.match(indexHtml, /function applyReadOnlyUi\(isViewer, isDietSup = false\)/);
assert.match(indexHtml, /readonlyBadge/);
assert.match(indexHtml, /mobile-viewer-back/);
assert.match(indexHtml, /function isCompactDietSupMobile\(\)/);
assert.match(indexHtml, /explicitlyRequested/);
assert.match(indexHtml, /buildChip\(eid,dateStr,cfg\.cls,compactViewer\)/);
assert.match(indexHtml, /registration => registration\.update\(\)/);
assert.match(indexHtml, /if\(!compactViewer\) \{\s*buildCovRow/);
assert.match(indexHtml, /function monthlyShiftSummary\(eid,monthDates\)/);
assert.match(indexHtml, /Balance mensual/);
assert.match(indexHtml, /monthly-summary/);
assert.match(indexHtml, /Total madrugadas<small>4:00 \/ 4:30/);
assert.match(indexHtml, /Total madrugadas<small>5:00 \/ 5:30/);
assert.match(indexHtml, /Total turnos<small>10:00 AM/);
assert.match(indexHtml, /madrugadaTarget:13/);
assert.match(indexHtml, /balanceTotal:monthlySummaries\.reduce/);
assert.match(indexHtml, /Dietistas Inscritos/);
assert.match(indexHtml, /window\.listenDietitians/);
assert.match(indexHtml, /dietitians', cleanName/);
assert.match(indexHtml, /Secretarias Inscritas/);
assert.match(indexHtml, /window\.listenSecretaries/);
assert.match(indexHtml, /secretaries', cleanName/);
assert.match(indexHtml, /Administrador Alterno/);
assert.match(indexHtml, /window\.listenAlternateAdmins/);
assert.match(indexHtml, /adminAlternates', cleanName/);
assert.match(indexHtml, /confirmCriticalAction/);
assert.match(indexHtml, /\^\(admin_\|dietsup_\|sup_\|sec_\)/);
assert.match(indexHtml, /Acciones Críticas y Verificación/);
assert.match(indexHtml, /Administrador Alterno/);
assert.match(indexHtml, /Balance mensual/);
assert.match(pilotFunction, /sendPilotShiftReminders/);
assert.match(pilotFunction, /devicesByEmployee/);
assert.doesNotMatch(pilotFunction, /PILOT_EMPLOYEE_NAME/);

console.log('Regression checks passed');
