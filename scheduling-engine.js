window.SchedulingEngine = {
  generate({ employees, existingSchedule, requests, rulesByEmployee, globalRules, dateFrom, dateTo }) {
    employees = employees || [];
    existingSchedule = existingSchedule || {};
    requests = requests || [];
    rulesByEmployee = rulesByEmployee || {};
    globalRules = globalRules || {};
    const draftSchedule = {};
    const stats = {
      openingsByEmployee: {},
      weekendsWorkedByEmployee: {},
      daysWorkedByEmployee: {}
    };
    const hardViolations = [];
    const warnings = [];

    // Helper functions
    const ds = (d) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const getDayOfWeek = (dateStr) => {
      // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const [y, m, d] = dateStr.split('-');
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getDay();
    };

    const isWeekend = (dateStr) => {
      const day = getDayOfWeek(dateStr);
      return day === 0 || day === 6; // Sunday or Saturday
    };

    // 1. Initialize calendar
    const dates = [];
    let curr = new Date(dateFrom + 'T12:00:00');
    const end = new Date(dateTo + 'T12:00:00');
    while (curr <= end) {
      const dStr = ds(curr);
      dates.push(dStr);
      draftSchedule[dStr] = {};
      
      // Load existing schedule into draft
      if (existingSchedule[dStr]) {
        for (const eid in existingSchedule[dStr]) {
          draftSchedule[dStr][eid] = existingSchedule[dStr][eid];
        }
      }
      curr.setDate(curr.getDate() + 1);
    }

    employees.forEach(e => {
      stats.openingsByEmployee[e.id] = 0;
      stats.daysWorkedByEmployee[e.id] = 0;
      stats.weekendsWorkedByEmployee[e.id] = new Set();
    });

    const isAbsence = (shiftId) => {
      return globalRules.absenceShiftIds.includes(shiftId);
    };

    const isWorkShift = (shiftId) => {
      return globalRules.workShiftIds.includes(shiftId);
    };

    // 2. Preservar ausencias existentes (ya cargadas en draftSchedule por existingSchedule, pero vamos a marcarlas para no tocarlas)
    const fixedCells = new Set(); // 'date-eid'
    for (const dStr of dates) {
      for (const eid in draftSchedule[dStr]) {
        const shift = draftSchedule[dStr][eid];
        if (isAbsence(shift) && shift !== 'L') {
          fixedCells.add(`${dStr}-${eid}`);
        } else if (shift === 'L') {
           delete draftSchedule[dStr][eid];
        } else if (shift && !isAbsence(shift)) {
           // Si ya hay turnos publicados, tambien podrian estar fijos. 
           // Depende de si queremos sobreescribir dias ya trabajados. Asumimos reescribir libres y trabajos, EXCEPTO ausencias aprobadas.
           if (globalRules.draftEnabled) {
               // Limpiar turnos normales para recalcular, a menos que queramos mantener el historial.
               // Asumiremos que el motor regenera el mes COMPLETO.
               delete draftSchedule[dStr][eid];
           }
        }
      }
    }

    // Recargar ausencias que no borramos
    for (const dStr of dates) {
      if(existingSchedule[dStr]) {
        for (const eid in existingSchedule[dStr]) {
           const shift = existingSchedule[dStr][eid];
           if (isAbsence(shift) && shift !== 'L') {
              draftSchedule[dStr][eid] = shift;
           }
        }
      }
    }

    // 3. Aplicar peticiones (simulado - el user menciona que peticiones pueden ser ambiguas)
    requests.forEach(req => {
      if (dates.includes(req.date) && !fixedCells.has(`${req.date}-${req.eid}`)) {
        if (isAbsence(req.note) || isWorkShift(req.note)) {
          draftSchedule[req.date][req.eid] = req.note;
          fixedCells.add(`${req.date}-${req.eid}`);
        } else {
          warnings.push(`Petición ambigua de empleado ${req.eid} el ${req.date}: ${req.note}`);
        }
      }
    });

    // 4. Aplicar reglas fijas activas
    employees.forEach(e => {
      const rules = rulesByEmployee[e.id] || {};
      if (rules.fixedAssignments) {
        rules.fixedAssignments.forEach(fa => {
          dates.forEach(dStr => {
            const day = getDayOfWeek(dStr);
            if (fa.weekdays.includes(day)) {
              // Validar fechas de inicio y fin
              if ((!fa.startsOn || dStr >= fa.startsOn) && (!fa.expiresOn || dStr <= fa.expiresOn)) {
                if (!fixedCells.has(`${dStr}-${e.id}`)) {
                  draftSchedule[dStr][e.id] = fa.shift;
                  fixedCells.add(`${dStr}-${e.id}`);
                } else {
                  warnings.push(`Regla fija choca con ausencia existente para ${e.id} el ${dStr}`);
                }
              }
            }
          });
        });
      }
      
      // Aplicar shiftLock de la bd principal si existe
      if (e.shiftLock) {
         // Se aplicara en la heuristica, prefiriendo siempre shiftLock.
      }
    });

    // Validacion y conteos preliminares
    const updateStats = () => {
      employees.forEach(e => {
        stats.openingsByEmployee[e.id] = 0;
        stats.daysWorkedByEmployee[e.id] = 0;
        stats.weekendsWorkedByEmployee[e.id] = new Set();
      });

      for (const dStr of dates) {
        const weekendId = getWeekendId(dStr);
        for (const eid in draftSchedule[dStr]) {
          const shift = draftSchedule[dStr][eid];
          if (isWorkShift(shift)) {
            stats.daysWorkedByEmployee[eid]++;
            if (globalRules.openingShiftIds.includes(shift)) {
              stats.openingsByEmployee[eid]++;
            }
            if (isWeekend(dStr)) {
              stats.weekendsWorkedByEmployee[eid].add(weekendId);
            }
          }
        }
      }
    };

    function getWeekendId(dateStr) {
      // Retorna el lunes anterior para identificar el fin de semana unico
      const d = new Date(dateStr + 'T12:00:00');
      d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1)); 
      return ds(d);
    }

    // Funciones de validacion
    const canAssign = (eid, dateStr, shift) => {
       const rules = rulesByEmployee[eid] || {};
       const emp = employees.find(e => e.id == eid);
       
       if (fixedCells.has(`${dateStr}-${eid}`)) return false;
       
       // Max days per week
       const weekStart = getWeekendId(dateStr);
       let daysInWeek = 0;
       for (let i=0; i<7; i++) {
          const cd = new Date(weekStart + 'T12:00:00');
          cd.setDate(cd.getDate() + i);
          const cds = ds(cd);
          if (draftSchedule[cds] && isWorkShift(draftSchedule[cds][eid])) {
             daysInWeek++;
          }
       }
       const maxDays = rules.maxWorkDaysPerWeek || globalRules.defaultMaxWorkDaysPerWeek || 5;
       if (isWorkShift(shift) && daysInWeek >= maxDays) return false;

       // Allowed shifts
       if (isWorkShift(shift) && rules.allowedShifts && rules.allowedShifts.length > 0) {
          if (!rules.allowedShifts.includes(shift)) return false;
       }
       if (isWorkShift(shift) && emp.shiftLock && shift !== emp.shiftLock) return false;

       // Consecutive weekends
       if (isWorkShift(shift) && isWeekend(dateStr) && rules.weekendRotationEnabled) {
          const weekendId = getWeekendId(dateStr);
          const wks = Array.from(stats.weekendsWorkedByEmployee[eid]).sort();
          if (!wks.includes(weekendId)) {
             wks.push(weekendId);
             wks.sort();
          }
          // Chequear si hay > max consecutivos
          const maxW = rules.maxConsecutiveWeekends || 2;
          let consec = 1;
          for(let i=1; i<wks.length; i++) {
             const prev = new Date(wks[i-1] + 'T12:00:00');
             const curr = new Date(wks[i] + 'T12:00:00');
             if ((curr - prev) / (1000*60*60*24) === 7) {
                consec++;
                if (consec > maxW) return false;
             } else {
                consec = 1;
             }
          }
       }
       return true;
    };

    // Heuristica de asignacion (Greedy backtracking simplificado)
    const assignDay = (dStr) => {
       const dayReq = globalRules.coverage || {};
       
       const needs = []; // Lista de turnos a cubrir hoy
       const countShift = (shiftId) => {
          let count = 0;
          Object.values(draftSchedule[dStr] || {}).forEach(shift => {
             if (shift === shiftId) count++;
          });
          return count;
       };

       if (dayReq.cocina && dayReq.cocina.required) {
          Object.entries(dayReq.cocina.required).forEach(([s, count]) => {
             const missing = Math.max(0, count - countShift(s));
             for(let i=0; i<missing; i++) needs.push({ shift: s, area: 'cocina' });
          });
       }
       if (dayReq.centro && dayReq.centro.alternatives) {
          const alt = dayReq.centro.alternatives
            .map(option => {
              const missing = {};
              let missingTotal = 0;
              Object.entries(option).forEach(([s, count]) => {
                const n = Math.max(0, count - countShift(s));
                missing[s] = n;
                missingTotal += n;
              });
              return { option, missing, missingTotal };
            })
            .sort((a, b) => a.missingTotal - b.missingTotal)[0];
          Object.entries(alt?.missing || {}).forEach(([s, count]) => {
             for(let i=0; i<count; i++) needs.push({ shift: s, area: 'centro' });
          });
       }

       // Shuffle employees to avoid bias, then sort by heuristic
       for (const req of needs) {
          let bestEmp = null;
          let bestScore = -99999;

          employees.forEach(emp => {
             if (draftSchedule[dStr][emp.id]) return; // ya tiene turno
             if (!canAssign(emp.id, dStr, req.shift)) return;

             // Validar area
             if (emp.area !== req.area && emp.area !== 'flex') return;

             const rules = rulesByEmployee[emp.id] || {};
             
             let score = 100; // Base: cubre necesidad
             
             // Balanceo de aperturas
             if (globalRules.openingShiftIds.includes(req.shift)) {
                const target = rules.openingTargetPerMonth || 13;
                const current = stats.openingsByEmployee[emp.id];
                if (current < target) {
                   score += 40; // Favorecer a quienes les faltan aperturas
                } else {
                   score -= 20 * (current - target + 1); // Penalizar si se pasan
                }
             }

             // Fines de semana alternos
             if (isWeekend(dStr) && rules.weekendRotationEnabled && rules.preferAlternatingWeekends) {
                const prevWkId = ds(new Date(new Date(getWeekendId(dStr) + 'T12:00:00').getTime() - 7*24*60*60*1000));
                if (stats.weekendsWorkedByEmployee[emp.id].has(prevWkId)) {
                   score -= 30; // Preferir no trabajar si trabajo el anterior
                } else {
                   score += 30; // Preferir trabajar si no trabajo el anterior
                }
             }

             // Priority
             score -= (rules.priority || 50);

             if (score > bestScore) {
                bestScore = score;
                bestEmp = emp;
             }
          });

          if (bestEmp) {
             draftSchedule[dStr][bestEmp.id] = req.shift;
             updateStats();
          } else {
             warnings.push(`No se pudo cubrir ${req.shift} el ${dStr}`);
          }
       }
       
       // Asignar "L" a los que no tienen turno hoy
       employees.forEach(emp => {
          if (!draftSchedule[dStr][emp.id]) {
             draftSchedule[dStr][emp.id] = 'L';
          }
       });
    };

    updateStats();
    for (const dStr of dates) {
       assignDay(dStr);
    }

    return {
      draftSchedule,
      diagnostics: {
        hardViolations,
        warnings,
        stats
      }
    };
  }
};
