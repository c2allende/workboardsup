'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getCandidateDates, getReminderCandidate, groupNotificationDevices } = require('./pilot-core');

test('returns a reminder exactly 24 hours before a work shift', () => {
  const candidate = getReminderCandidate({
    date: '2026-06-15',
    shiftId: 'D1',
    now: new Date('2026-06-14T08:30:00.000Z')
  });

  assert.equal(candidate.shiftId, 'D1');
  assert.equal(candidate.reminderAt, '2026-06-14T04:30:00.000-04:00');
});

test('ignores non-work shifts and reminders outside the tolerance', () => {
  assert.equal(getReminderCandidate({
    date: '2026-06-15',
    shiftId: 'L',
    now: new Date('2026-06-14T08:30:00.000Z')
  }), null);
  assert.equal(getReminderCandidate({
    date: '2026-06-15',
    shiftId: 'D1',
    now: new Date('2026-06-14T09:00:00.000Z')
  }), null);
});

test('checks the current and next two Puerto Rico calendar dates', () => {
  assert.deepEqual(getCandidateDates(new Date('2026-06-14T03:30:00.000Z')), [
    '2026-06-13',
    '2026-06-14',
    '2026-06-15'
  ]);
});

test('groups unique registered phones by employee', () => {
  const grouped = groupNotificationDevices([
    { eid: '10', employeeName: 'Ana', token: 'phone-a' },
    { eid: '10', employeeName: 'Ana', token: 'phone-b' },
    { eid: '10', employeeName: 'Ana', token: 'phone-a' },
    { eid: '20', employeeName: 'Luis', token: 'phone-c' },
    { eid: '30', employeeName: 'No Token' }
  ]);

  assert.deepEqual([...grouped.entries()], [
    ['10', { employeeName: 'Ana', tokens: ['phone-a', 'phone-b'] }],
    ['20', { employeeName: 'Luis', tokens: ['phone-c'] }]
  ]);
});
