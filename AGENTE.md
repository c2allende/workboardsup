# Sistema de Turnos y Peticiones (Workboard ASEM)
Plataforma web y PWA diseñada para gestionar los horarios, turnos y peticiones del personal (supervisores, asistentes, dietistas y secretarias) del Servicio de Alimentos de ASEM. Permite la visualización de calendarios, importación masiva desde Excel y aprobación de cambios de turno en tiempo real.

## Stack
- Lenguaje: JavaScript (Vanilla ES6+), HTML5 y CSS3 nativo.
- Framework / runtime: PWA nativa, sin frameworks de frontend. Node.js para las Cloud Functions.
- Base de datos: Firebase Firestore (NoSQL en tiempo real).
- Infraestructura: Firebase Hosting, Firebase Functions, Firebase Auth.
- Tests: Node.js test runner nativo (`node --test`).

## Comandos
- `npx firebase-tools serve` — arranca el servidor local de Firebase para pruebas.
- `node --test tests/regression.test.js` — ejecuta los tests de regresión (deben pasar antes de cada commit).
- `npx firebase-tools deploy` — compila y despliega a producción (aplica automáticamente el script de predeploy con las pruebas).

## Estructura del proyecto
- `/` (Raíz) — Contiene los archivos principales de la aplicación (`index.html`, `TurnosSup.html`), el Service Worker (`sw.js`) y configuración general.
- `functions/` — Backend y Cloud Functions de Firebase (p. ej. envío de notificaciones y recordatorios automáticos).
- `tests/` — Pruebas automatizadas para evitar regresiones en reglas o lógica núcleo.
- `icon-alternatives/` — Recursos gráficos y logotipos de la PWA.

## Convenciones
- **Estilo de nombres:** `camelCase` para variables y funciones en JavaScript.
- **Sin Frameworks:** Todo el desarrollo visual se realiza mediante manipulación directa del DOM con Vanilla JS. Las actualizaciones de UI son manuales o reactivas a `onSnapshot`.
- **Manejo de Base de Datos:** Usar escuchas en tiempo real (`onSnapshot`) para refrescar la interfaz. Es imperativo ejecutar las funciones de limpieza (`unsubscribe`) cuando el usuario cierra sesión para prevenir memory leaks.
- **Carga de Excel:** La importación mapea los valores humanos legibles a IDs internos de turno (`C1`, `C2`, `D1`, etc.) utilizando la función dedicada `mapExcelShift`.

## No hagas
- No instalar frameworks de frontend (React, Angular, Vue, Tailwind). Mantener la pureza de Vanilla JS.
- No modificar `firestore.rules` ni las políticas de acceso sin validar exhaustivamente los tests de regresión.
- No exponer credenciales, usar siempre el entorno de Firebase.
- No eliminar o modificar comentarios de documentación interna dentro de los bloques de código JS, actúan como guía estructural.

## Flujo de trabajo
- Antes de una tarea no trivial, propón un plan detallado y espera mi OK.
- Una tarea a la vez; al terminar, dime exactamente qué cambiaste para poder revisarlo.
- Siempre ejecuta el entorno de pruebas antes de aplicar un push a la rama principal.
- Si no estás seguro al 80%, pregunta primero. No inventes.

## Documentación
- Las configuraciones de acceso por rol están descritas en el bloque `USER_ROLES` de `index.html`.
- Listado referencial de empleados y áreas en `usuarios.md`.
- Reglas detalladas de la base de datos se ubican en `firestore.rules`.
