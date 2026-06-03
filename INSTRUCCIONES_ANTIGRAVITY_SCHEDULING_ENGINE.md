# Instrucciones para Antigravity: Motor de Automatizacion de Horarios

## Objetivo

Implementar un motor de generacion automatica de horarios mensuales para WorkBoard, respetando reglas estrictas por empleado, cobertura diaria, peticiones/vacaciones existentes y balance de turnos de apertura. El resultado debe generarse primero como borrador editable y solo escribirse en Firestore cuando el administrador lo apruebe.

## Estado actual verificado

- La aplicacion principal esta en `index.html`.
- Los datos se leen/escriben en Firebase Firestore con estas colecciones existentes:
  - `employees`
  - `schedules`
  - `requests`
  - `metadata`
- El horario se guarda por dia en `schedules/{YYYY-MM-DD}`, con campos por ID de empleado: `{ "1": "C1", "2": "L" }`.
- La UI de administrador tiene tres pestanas: `Horario`, `Reportes`, `Gestion de Personal`.
- La cobertura ya esta codificada en `index.html`:
  - Cocina OK: al menos `C1 >= 1` y `C3 >= 1`.
  - Centro OK: `D1 >= 2 && D2 >= 1` o `A1 >= 1 && D1 >= 1 && D2 >= 1`.
- Ya existe validacion manual de maximo 5 turnos por semana en la funcion `assign`.
- Ya existe flujo de publicacion con `btnPublish`, pero actualmente publicar solo notifica; no distingue entre borrador y horario publicado.
- El archivo `programa-oficial-jun-2026.js` contiene empleados y horarios oficiales usados para importar junio 2026.

## Evaluacion del plan original

El plan es viable, pero debe ajustarse antes de implementarlo:

- No conviene meter todo el algoritmo dentro de `index.html`; el archivo ya es grande. Crear un archivo separado para el motor reduce riesgo.
- La coleccion `rules` es correcta, pero debe incluir tambien reglas globales de cobertura. Sin eso el algoritmo queda atado a valores hardcodeados.
- La pregunta de cobertura diaria no esta totalmente abierta: la app ya usa reglas de cobertura. Aun asi deben moverse a configuracion editable.
- La rotacion de fines de semana necesita definicion precisa: un fin de semana trabajado cuenta si el empleado trabaja sabado o domingo. Para el primer release, aplicar la regla solo a empleados con `weekendRotationEnabled: true`.
- La cuota de aperturas de `~13` por mes debe tratarse como objetivo flexible, no como regla estricta, porque el mes, vacaciones y cobertura pueden hacerlo imposible.
- El motor debe generar reportes de conflictos: reglas incumplidas, huecos de cobertura, exceso semanal, aperturas desbalanceadas y fines de semana consecutivos.

## Arquitectura recomendada

Crear estos archivos nuevos:

- `scheduling-engine.js`: logica pura del motor, sin DOM ni Firestore.
- `scheduling-validation.js`: funciones de validacion reutilizables para cobertura, maximo semanal, restricciones por empleado y fines de semana.
- Opcional si Antigravity prefiere mantener menos archivos: combinar ambos en `scheduling-engine.js`, pero mantener funciones puras y exportadas en `window.SchedulingEngine`.

Actualizar `index.html` para:

- Cargar el motor antes del script principal:
  ```html
  <script src="./scheduling-engine.js"></script>
  ```
- Agregar una pestana o panel de reglas. Preferencia recomendada: dentro de `Gestion de Personal`, porque las reglas pertenecen a empleados y configuracion administrativa.
- Agregar boton en `Horario`: `Generar automatico`.
- Agregar estado visual de borrador: chips con borde o fondo diferente y una barra de acciones con `Aprobar y publicar` y `Descartar borrador`.

## Modelo de datos Firestore

### Coleccion `rules`

Usar un documento por empleado:

```js
rules/{employeeId} = {
  employeeId: 1,
  allowedShifts: ["C1", "C3"],
  fixedAssignments: [
    {
      weekdays: [1, 2, 5, 6, 0],
      shift: "D2",
      startsOn: "2026-06-01",
      expiresOn: null
    }
  ],
  blockedDates: [
    { date: "2026-07-15", code: "L", reason: "No disponible" }
  ],
  weekendRotationEnabled: true,
  maxConsecutiveWeekends: 2,
  preferAlternatingWeekends: true,
  maxWorkDaysPerWeek: 5,
  preferredConsecutiveDaysOff: true,
  openingTargetPerMonth: 13,
  openingShiftIds: ["C1", "D1"],
  priority: 50,
  active: true,
  updatedAt: 1710000000000
}
```

Notas:

- `weekdays` usa JavaScript: domingo `0`, lunes `1`, martes `2`, miercoles `3`, jueves `4`, viernes `5`, sabado `6`.
- `fixedAssignments` son reglas estrictas cuando estan activas por fecha.
- `allowedShifts` es regla estricta para turnos de trabajo. Ausencias como `L`, `V`, `PER`, `LR`, `FSE`, `F`, `ENF` siempre deben poder asignarse.
- `priority` permite resolver empates: menor numero = asignar primero.

### Documento `rules/global`

Guardar configuracion general:

```js
rules/global = {
  coverage: {
    cocina: {
      required: { C1: 1, C3: 1 },
      optional: { C2: 0 }
    },
    centro: {
      alternatives: [
        { D1: 2, D2: 1 },
        { A1: 1, D1: 1, D2: 1 }
      ]
    }
  },
  workShiftIds: ["C1", "C2", "C3", "D1", "D2", "A1", "E1"],
  absenceShiftIds: ["L", "V", "LR", "FSE", "PER", "F", "ENF"],
  openingShiftIds: ["C1", "D1"],
  defaultMaxWorkDaysPerWeek: 5,
  draftEnabled: true
}
```

Si Firestore no permite usar `rules/global` junto con IDs numericos sin confusion, usar `rules/_global`.

## UI requerida

### Panel de reglas en `Gestion de Personal`

Agregar un panel llamado `Reglas del motor`.

Controles por empleado:

- Selector de empleado.
- Multiselect o checkboxes de turnos permitidos: `C1`, `C2`, `C3`, `D1`, `D2`, `A1`, `E1`.
- Reglas fijas:
  - Dias de semana.
  - Turno fijo.
  - Fecha de inicio.
  - Fecha de expiracion opcional.
- Toggle de rotacion de fines de semana.
- Campo numerico de maximo de fines de semana consecutivos.
- Toggle de preferir fines de semana alternos.
- Campo numerico de maximo de dias trabajados por semana.
- Campo numerico de meta de aperturas mensuales.
- Boton `Guardar reglas`.

### Controles en `Horario`

Agregar junto a `Limpiar`, `Imprimir`, `Publicar`:

- `Generar automatico`: genera borrador para el rango actual.
- `Aprobar y publicar`: visible solo si hay borrador.
- `Descartar borrador`: visible solo si hay borrador.

Comportamiento:

- `Generar automatico` no debe escribir en Firestore.
- El borrador debe vivir en memoria, por ejemplo `window.draftSched`.
- Mientras haya borrador, `getShift(eid, dateStr)` puede seguir leyendo el horario publicado, pero `buildChip` debe mostrar el valor del borrador si existe.
- Al aprobar, escribir cada dia en `schedules/{date}` con `setDoc(..., { merge: true })`, llamar `notifyScheduleUpdate()` y limpiar `window.draftSched`.
- Al descartar, limpiar `window.draftSched` y re-renderizar.

## Orden del algoritmo

Implementar el motor como funcion pura:

```js
window.SchedulingEngine.generate({
  employees,
  existingSchedule,
  requests,
  rulesByEmployee,
  globalRules,
  dateFrom,
  dateTo
})
```

Debe devolver:

```js
{
  draftSchedule: {
    "2026-07-01": { "1": "C1", "2": "L" }
  },
  diagnostics: {
    hardViolations: [],
    warnings: [],
    stats: {
      openingsByEmployee: {},
      weekendsWorkedByEmployee: {},
      daysWorkedByEmployee: {}
    }
  }
}
```

Pasos:

1. Inicializar el calendario del rango con todos los empleados en `null`.
2. Copiar ausencias existentes del horario actual: `V`, `LR`, `FSE`, `PER`, `F`, `ENF`. Estas no deben sobreescribirse.
3. Aplicar peticiones aprobadas o registradas:
   - Si la app aun no tiene estado `Aprobada`, tratar solo peticiones que puedan interpretarse claramente como codigo de ausencia o turno.
   - Las peticiones ambiguas deben generar warning, no asignacion automatica.
4. Aplicar reglas fijas activas:
   - Ejemplo: Carolyn `D2` lunes, martes, viernes, sabado y domingo.
   - Si una regla fija choca con ausencia existente, conservar la ausencia y registrar warning.
5. Asignar libres de fin de semana:
   - Contar fin de semana trabajado si sabado o domingo tiene turno de trabajo.
   - Evitar 3 fines de semana consecutivos para empleados con rotacion activa.
   - Preferir patron alterno cuando la cobertura lo permita.
6. Rellenar empleados con restricciones fuertes:
   - Victor, Andres, Ernix u otros con `allowedShifts` reducido deben asignarse antes que flexibles.
   - Nunca asignar un turno fuera de `allowedShifts`.
7. Distribuir aperturas:
   - Turnos de apertura: `C1` y `D1`, o lo definido en `globalRules.openingShiftIds`.
   - Priorizar al empleado con menos aperturas acumuladas en el mes y que cumpla reglas.
   - La meta `openingTargetPerMonth` es flexible.
8. Completar cobertura diaria:
   - Usar `globalRules.coverage`.
   - Flexibles pueden cubrir Cocina o Centro segun sus turnos permitidos.
   - Angel u otros con `shiftLock: "A1"` deben permanecer en `A1` si trabajan.
9. Asignar libres restantes:
   - Ningun empleado debe superar `maxWorkDaysPerWeek`.
   - Si un empleado trabaja 5 dias en una semana, asignar 2 libres.
   - Preferir pares consecutivos de libres cuando no rompa cobertura.
10. Validar todo el borrador:
   - Cobertura diaria.
   - Turnos permitidos.
   - Ausencias preservadas.
   - Maximo semanal.
   - Fines de semana consecutivos.
   - Empleados sin asignacion.

## Heuristica recomendada

Usar un sistema de puntuacion para escoger candidatos:

```js
scoreCandidate(employee, shift, date) =
  +100 si cumple cobertura faltante
  +40 si reduce desbalance de aperturas
  +25 si respeta libre consecutivo preferido
  -1000 si viola allowedShifts
  -1000 si viola maxWorkDaysPerWeek
  -1000 si crea 3 fines de semana consecutivos
  -500 si rompe una ausencia o regla fija
  -20 por cada apertura por encima del promedio
```

Elegir siempre el candidato de mayor puntuacion. En empates, usar menor cantidad de turnos trabajados en el rango y luego `priority`.

## Reglas estrictas vs flexibles

Reglas estrictas:

- Ausencias existentes y vacaciones.
- `shiftLock`.
- `allowedShifts`.
- `fixedAssignments`.
- Cobertura minima diaria.
- Maximo 5 dias trabajados por semana.
- Maximo 2 fines de semana consecutivos cuando `weekendRotationEnabled` sea `true`.

Reglas flexibles:

- Libres consecutivos.
- Patron 1 fin de semana si / 1 no.
- Cuota exacta de 13 aperturas.
- Balance perfecto de total de turnos.

## Validacion visual y funcional

Despues de implementar:

1. Abrir la app localmente.
2. Iniciar sesion como administrador.
3. Importar el programa oficial si Firestore esta vacio.
4. Crear reglas de prueba:
   - Victor: `allowedShifts = ["C1", "C3"]`.
   - Ernix: `allowedShifts = ["C2", "C3"]` con expiracion al `2026-07-31`.
   - Carolyn: regla fija `D2` lunes, martes, viernes, sabado y domingo.
   - Angel: mantener `shiftLock = "A1"`.
5. Seleccionar un rango mensual.
6. Presionar `Generar automatico`.
7. Confirmar que aparece borrador sin escribir Firestore.
8. Revisar diagnosticos.
9. Ajustar manualmente celdas si hace falta.
10. Presionar `Aprobar y publicar`.
11. Recargar la app y confirmar que el horario publicado persiste.

## Casos que deben pasar

- Carolyn recibe `D2` en los dias configurados cuando no tiene ausencia.
- Victor nunca recibe turnos fuera de `C1` o `C3`.
- Ernix nunca recibe turnos fuera de `C2` o `C3` antes de la expiracion configurada.
- Angel no recibe turnos distintos a `A1` en dias trabajados.
- Nadie con rotacion activa trabaja 3 fines de semana consecutivos.
- Ningun empleado supera 5 turnos trabajados en una semana.
- Cocina queda cubierta con al menos `C1` y `C3`.
- Centro queda cubierto con `2 D1 + D2` o `A1 + D1 + D2`.
- Las vacaciones y ausencias existentes no se sobreescriben.
- El borrador se puede descartar sin modificar Firestore.
- Al aprobar, se llama `notifyScheduleUpdate()`.

## Entregables esperados

- `scheduling-engine.js` creado.
- `index.html` actualizado con:
  - carga del motor,
  - UI de reglas,
  - listeners de `rules`,
  - flujo de borrador,
  - botones de generar/aprobar/descartar.
- Validaciones y diagnosticos visibles al administrador.
- Sin cambios innecesarios en `empleado.html`, salvo que se necesite mostrar claramente que el empleado solo ve horarios publicados.

## Riesgos y mitigaciones

- Riesgo: horario imposible por pocas personas disponibles.
  - Mitigacion: mostrar diagnosticos y no publicar automaticamente.
- Riesgo: reglas ambiguas en peticiones.
  - Mitigacion: solo autoaplicar peticiones con codigo reconocible; listar las demas como warning.
- Riesgo: `index.html` crece demasiado.
  - Mitigacion: mantener motor y validadores en archivo separado.
- Riesgo: cobertura hardcodeada divergente.
  - Mitigacion: mover cobertura a `rules/global` y hacer que `getDayStatus` use la misma configuracion.

## Criterio de aceptacion

La implementacion se considera lista cuando el administrador puede configurar reglas, generar un horario mensual como borrador, revisar diagnosticos, hacer ajustes manuales, aprobarlo y verlo persistido en Firestore sin violar reglas estrictas conocidas.
