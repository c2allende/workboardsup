'use strict';

const { onSchedule } = require('firebase-functions/v2/scheduler');
const functions = require('firebase-functions/v1');
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { getCandidateDates, getReminderCandidate, groupNotificationDevices, shouldSendScheduleUpdate, TIME_ZONE } = require('./pilot-core');

initializeApp();

exports.sendPilotShiftReminders = onSchedule({
  schedule: 'every 15 minutes',
  timeZone: TIME_ZONE,
  region: 'us-east1'
}, async () => {
  const db = getFirestore();
  const configSnapshot = await db.collection('config').doc('system').get();
  const config = configSnapshot.exists ? configSnapshot.data() : {};
  if(config.reminderEnabled === false) {
    logger.info('Shift reminders skipped: reminders are disabled');
    return;
  }
  const reminderActivationId = Number(config.reminderActivationId) || 0;

  const devicesSnapshot = await db.collection('notificationDevices')
    .where('enabled', '==', true)
    .get();
  if(devicesSnapshot.empty) {
    logger.info('Shift reminders skipped: no enabled devices');
    return;
  }

  const devicesByEmployee = groupNotificationDevices(
    devicesSnapshot.docs
      .map(device => device.data())
      .filter(device => (Number(device.reminderActivationId) || 0) === reminderActivationId)
  );
  if(devicesByEmployee.size === 0) {
    logger.info('Shift reminders skipped: no devices enabled for the current activation');
    return;
  }

  const now = new Date();

  for(const date of getCandidateDates(now)) {
    const scheduleSnapshot = await db.collection('schedules').doc(date).get();
    if(!scheduleSnapshot.exists) continue;
    const schedule = scheduleSnapshot.data();

    for(const [employeeId, deviceGroup] of devicesByEmployee.entries()) {
      const shiftId = schedule[employeeId];
      const candidate = getReminderCandidate({ date, shiftId, now });
      if(!candidate) continue;

      const deliveryId = `${employeeId}_${date}_${shiftId}_24h`;
      const deliveryRef = db.collection('notificationDeliveries').doc(deliveryId);
      if((await deliveryRef.get()).exists) continue;

      const response = await getMessaging().sendEachForMulticast({
        tokens: deviceGroup.tokens,
        notification: {
          title: 'Recordatorio de turno',
          body: `Mañana tienes turno ${shiftId} a las ${candidate.timeLabel}.`
        },
        data: {
          deliveryId,
          url: '/TurnosSup',
          employeeId,
          date,
          shiftId
        },
        webpush: {
          notification: {
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: deliveryId
          },
          fcmOptions: { link: 'https://workboard-cocina.web.app/TurnosSup' }
        }
      });

      await deliveryRef.set({
        employeeId,
        employeeName: deviceGroup.employeeName,
        date,
        shiftId,
        sentAt: FieldValue.serverTimestamp(),
        successCount: response.successCount,
        failureCount: response.failureCount
      });
      logger.info('Shift reminder processed', { deliveryId, ...response });
    }
  }
});

exports.sendScheduleUpdateNotifications = functions.region('us-east1').firestore
  .document('metadata/updates')
  .onWrite(async (change) => {
    if (!change.after.exists) return;
    const afterData = change.after.data();
    const beforeData = change.before.exists ? change.before.data() : {};
    const afterTime = Number(afterData.lastScheduleUpdate) || 0;
    const beforeTime = Number(beforeData.lastScheduleUpdate) || 0;

  const db = getFirestore();
  const configSnapshot = await db.collection('config').doc('system').get();
  const config = configSnapshot.exists ? configSnapshot.data() : {};

  if (!shouldSendScheduleUpdate({ beforeTime, afterTime, config })) {
    logger.info('Schedule update notifications skipped: no new update or reminders disabled');
    return;
  }

  const reminderActivationId = Number(config.reminderActivationId) || 0;
  const devicesSnapshot = await db.collection('notificationDevices')
    .where('enabled', '==', true)
    .get();
  if (devicesSnapshot.empty) {
    logger.info('Schedule update notifications skipped: no enabled devices');
    return;
  }

  const activeDevices = devicesSnapshot.docs
    .map(doc => doc.data())
    .filter(device => (Number(device.reminderActivationId) || 0) === reminderActivationId);

  const tokens = [...new Set(activeDevices.map(d => d.token).filter(Boolean))];
  if (tokens.length === 0) {
    logger.info('Schedule update notifications skipped: no tokens available for current activation');
    return;
  }

  const deliveryId = `schedule_update_${afterTime}`;
  const deliveryRef = db.collection('notificationDeliveries').doc(deliveryId);
  if ((await deliveryRef.get()).exists) {
    logger.info('Schedule update notification already sent for this timestamp', { deliveryId });
    return;
  }

  let totalSuccess = 0;
  let totalFailure = 0;
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const response = await getMessaging().sendEachForMulticast({
      tokens: batch,
      notification: {
        title: '¡Horario Actualizado!',
        body: 'Se ha publicado un nuevo programa o se han realizado cambios en los turnos. Entra para revisarlo.'
      },
      data: {
        deliveryId,
        url: '/TurnosSup',
        type: 'schedule_update',
        timestamp: String(afterTime)
      },
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'turnosup-schedule-update'
        },
        fcmOptions: { link: 'https://workboard-cocina.web.app/TurnosSup' }
      }
    });
    totalSuccess += response.successCount;
    totalFailure += response.failureCount;
  }

  await deliveryRef.set({
    type: 'schedule_update',
    timestamp: afterTime,
    sentAt: FieldValue.serverTimestamp(),
    successCount: totalSuccess,
    failureCount: totalFailure
  });
  logger.info('Schedule update notifications processed', { deliveryId, successCount: totalSuccess, failureCount: totalFailure });
});
