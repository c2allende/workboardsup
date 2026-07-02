# Recordatorios y Avisos de turno

El sistema registra los teléfonos autorizados y notifica individualmente a cada
empleado según su horario en Firestore, y envía alertas automáticas cuando se publica un nuevo programa o se realiza algún cambio en los turnos.

## Flujo

1. El empleado inicia sesión en `/TurnosSup` desde su teléfono.
2. Administración activa **Recordatorios de Turno** desde `index.html`.
3. La tarjeta **Recordatorio de turno** aparece para cada empleado autenticado, explicando que se enviarán recordatorios y alertas de cambio.
4. Al pulsar **Activar avisos**, el teléfono solicita permiso y guarda su token
   FCM en `notificationDevices`.
5. La función `sendPilotShiftReminders` se ejecuta cada 15 minutos para recordar turnos 24 horas antes.
6. La función `sendScheduleUpdateNotifications` se ejecuta automáticamente cada vez que administración publica un horario o guarda una modificación en `metadata/updates`.
7. Ambas funciones registran los envíos en `notificationDeliveries` para evitar duplicados en caso de reintentos.

Al apagar **Recordatorios de Turno** desde Administración, el sistema deja de
enviar recordatorios y alertas de publicación inmediatamente. Al volver a encenderlos se crea un ciclo nuevo:
los teléfonos anteriores quedan pausados y cada empleado debe activar los avisos
nuevamente.

Después de activar los avisos, la tarjeta desaparece de TurnoSup.

## Activación

El proyecto Firebase debe tener habilitados Cloud Messaging, Cloud Functions y
Cloud Scheduler. Las funciones programadas requieren un proyecto con
facturación habilitada.

```sh
cd functions
npm test
cd ..
firebase deploy --only functions:sendPilotShiftReminders,functions:sendScheduleUpdateNotifications,hosting
```

## Prueba en teléfono

- Android: abrir la aplicación instalada o el sitio y activar los avisos.
- iPhone/iPad: agregar primero la PWA a la pantalla de inicio y abrirla desde
  allí antes de activar los avisos.
- Pulsar **Probar ahora** para validar inmediatamente el permiso del teléfono.
- Para validar el envío del servidor sin esperar un día, crear temporalmente un
  turno cuyo inicio ocurra dentro de la ventana de prueba del cálculo de 24
  horas.

No se envían avisos para días libres, vacaciones ni licencias.
