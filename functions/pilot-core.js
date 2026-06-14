'use strict';

const { DateTime } = require('luxon');

const TIME_ZONE = 'America/Puerto_Rico';
const SHIFT_STARTS = Object.freeze({
  C1: '04:00',
  C2: '05:00',
  C3: '06:00',
  CE: '04:00',
  D1: '04:30',
  D2: '10:00',
  A1: '05:00',
  E1: '05:30'
});

function getReminderCandidate({ date, shiftId, now, toleranceMinutes = 20 }) {
  const startTime = SHIFT_STARTS[shiftId];
  if(!startTime) return null;

  const shiftStart = DateTime.fromISO(`${date}T${startTime}`, { zone: TIME_ZONE });
  const reminderAt = shiftStart.minus({ hours: 24 });
  const current = DateTime.fromJSDate(now, { zone: TIME_ZONE });
  const ageMinutes = current.diff(reminderAt, 'minutes').minutes;

  if(ageMinutes < 0 || ageMinutes > toleranceMinutes) return null;
  return {
    date,
    shiftId,
    shiftStart: shiftStart.toISO(),
    reminderAt: reminderAt.toISO(),
    timeLabel: shiftStart.toLocaleString(DateTime.TIME_SIMPLE)
  };
}

function getCandidateDates(now) {
  const current = DateTime.fromJSDate(now, { zone: TIME_ZONE });
  return [0, 1, 2].map(days => current.plus({ days }).toISODate());
}

function groupNotificationDevices(devices) {
  const devicesByEmployee = new Map();
  for(const data of devices) {
    if(!data.eid || !data.token) continue;
    const employeeId = String(data.eid);
    const entry = devicesByEmployee.get(employeeId) || { employeeName: data.employeeName || '', tokens: [] };
    if(!entry.tokens.includes(data.token)) entry.tokens.push(data.token);
    if(data.employeeName) entry.employeeName = data.employeeName;
    devicesByEmployee.set(employeeId, entry);
  }
  return devicesByEmployee;
}

module.exports = { SHIFT_STARTS, TIME_ZONE, getCandidateDates, getReminderCandidate, groupNotificationDevices };
