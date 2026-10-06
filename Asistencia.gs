function obtenerSesiones() {
  const ss = obtenerLibro_();
  const hoja = ss.getSheetByName(HOJAS.SESIONES);

  if (!hoja || hoja.getLastRow() < 2) {
    return [];
  }

  const datos = hoja
    .getRange(2, 1, hoja.getLastRow() - 1, 5)
    .getValues();

  const zona = Session.getScriptTimeZone();

  return datos.map(fila => ({
    id: fila[0],
    numero: fila[1],
    fecha: fila[2] instanceof Date
      ? Utilities.formatDate(fila[2], zona, 'yyyy-MM-dd')
      : fila[2],
    tema: fila[3],
    estado: fila[4]
  }));
}

function obtenerParticipantes(idSesion) {
  if (!idSesion) {
    throw new Error('Debes seleccionar una sesión.');
  }

  const ss = obtenerLibro_();
  const hojaParticipantes = ss.getSheetByName(HOJAS.PARTICIPANTES);
  const hojaAsistencias = ss.getSheetByName(HOJAS.ASISTENCIAS);

  const participantes = hojaParticipantes.getLastRow() < 2
    ? []
    : hojaParticipantes
        .getRange(2, 1, hojaParticipantes.getLastRow() - 1, 4)
        .getValues();

  const asistencias = hojaAsistencias.getLastRow() < 2
    ? []
    : hojaAsistencias
        .getRange(2, 1, hojaAsistencias.getLastRow() - 1, 4)
        .getValues();

  const estadoPorParticipante = new Map();

  asistencias.forEach(fila => {
    if (fila[0] === idSesion) {
      estadoPorParticipante.set(fila[1], fila[2]);
    }
  });

  return participantes
    .filter(fila => fila[3] === true)
    .map(fila => ({
      id: fila[0],
      nombre: fila[1],
      correo: fila[2],
      presente: estadoPorParticipante.get(fila[0]) === 'PRESENTE'
    }));
}

function guardarAsistencia(idSesion, participantes) {
  if (!idSesion) {
    throw new Error('Debes seleccionar una sesión.');
  }

  if (!Array.isArray(participantes) || participantes.length === 0) {
    throw new Error('No se recibieron participantes.');
  }

  // Solo se aceptan sesiones y participantes activos que existan en la hoja.
  if (!obtenerSesiones().some(s => s.id === idSesion)) {
    throw new Error(`La sesión ${idSesion} no existe.`);
  }

  const activos = new Set(obtenerParticipantes(idSesion).map(p => p.id));
  participantes.forEach(p => {
    if (!p || !activos.has(p.id)) {
      throw new Error(`Participante inválido: ${p && p.id}`);
    }
  });

  // Evita que dos guardados simultáneos se sobrescriban entre sí.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss = obtenerLibro_();
    const hoja = ss.getSheetByName(HOJAS.ASISTENCIAS);

    const existentes = hoja.getLastRow() < 2
      ? []
      : hoja.getRange(2, 1, hoja.getLastRow() - 1, 4).getValues();

    const indice = new Map();

    existentes.forEach((fila, i) => {
      indice.set(`${fila[0]}|${fila[1]}`, i);
    });

    const ahora = new Date();

    participantes.forEach(p => {
      const clave = `${idSesion}|${p.id}`;
      const registro = [
        idSesion,
        p.id,
        p.presente ? 'PRESENTE' : 'AUSENTE',
        ahora
      ];

      if (indice.has(clave)) {
        existentes[indice.get(clave)] = registro;
      } else {
        indice.set(clave, existentes.length);
        existentes.push(registro);
      }
    });

    if (existentes.length > 0) {
      hoja.getRange(2, 1, existentes.length, 4).setValues(existentes);
      hoja.getRange(2, 4, existentes.length, 1)
        .setNumberFormat('yyyy-mm-dd hh:mm:ss');
    }

    marcarSesionRegistrada_(idSesion);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  const presentes = participantes.filter(p => p.presente).length;

  return {
    ok: true,
    idSesion,
    presentes,
    ausentes: participantes.length - presentes,
    total: participantes.length
  };
}

function marcarSesionRegistrada_(idSesion) {
  const ss = obtenerLibro_();
  const hoja = ss.getSheetByName(HOJAS.SESIONES);

  if (!hoja || hoja.getLastRow() < 2) return;

  const datos = hoja
    .getRange(2, 1, hoja.getLastRow() - 1, 5)
    .getValues();

  const posicion = datos.findIndex(fila => fila[0] === idSesion);

  if (posicion >= 0) {
    hoja.getRange(posicion + 2, 5).setValue('REGISTRADA');
  }
}
