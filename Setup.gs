function prepararBaseDatos() {
  const ss = obtenerLibro_();

  const participantes = obtenerOCrearHoja_(
    ss,
    HOJAS.PARTICIPANTES,
    ['id_participante', 'nombre', 'correo', 'activo']
  );

  const sesiones = obtenerOCrearHoja_(
    ss,
    HOJAS.SESIONES,
    ['id_sesion', 'numero', 'fecha', 'tema', 'estado']
  );

  obtenerOCrearHoja_(
    ss,
    HOJAS.ASISTENCIAS,
    ['id_sesion', 'id_participante', 'estado', 'hora_registro']
  );

  if (participantes.getLastRow() === 1) {
    const datosParticipantes = Array.from({ length: 30 }, (_, i) => {
      const numero = String(i + 1).padStart(2, '0');
      return [
        `P${numero}`,
        `Participante ${numero}`,
        `participante${numero}@ejemplo.com`,
        true
      ];
    });

    participantes
      .getRange(2, 1, datosParticipantes.length, datosParticipantes[0].length)
      .setValues(datosParticipantes);
  }

  if (sesiones.getLastRow() === 1) {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);

    const datosSesiones = Array.from({ length: 10 }, (_, i) => {
      const numero = String(i + 1).padStart(2, '0');
      const fecha = new Date(inicio);
      fecha.setDate(inicio.getDate() + (i * 7));

      return [
        `S${numero}`,
        i + 1,
        fecha,
        `Sesión ${i + 1}`,
        'PENDIENTE'
      ];
    });

    sesiones
      .getRange(2, 1, datosSesiones.length, datosSesiones[0].length)
      .setValues(datosSesiones);

    sesiones.getRange(2, 3, datosSesiones.length, 1)
      .setNumberFormat('yyyy-mm-dd');
  }

  formatearHoja_(participantes);
  formatearHoja_(sesiones);
  formatearHoja_(ss.getSheetByName(HOJAS.ASISTENCIAS));

  return 'Base de datos preparada correctamente.';
}

function obtenerOCrearHoja_(ss, nombre, encabezados) {
  let hoja = ss.getSheetByName(nombre);

  if (!hoja) {
    hoja = ss.insertSheet(nombre);
  }

  if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
  }

  return hoja;
}

function formatearHoja_(hoja) {
  const ultimaColumna = hoja.getLastColumn();
  if (ultimaColumna === 0) return;

  hoja.setFrozenRows(1);
  hoja.getRange(1, 1, 1, ultimaColumna)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  hoja.autoResizeColumns(1, ultimaColumna);
}
