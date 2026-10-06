const SPREADSHEET_ID = '1jCzzUq3IJDb8f_GuAolGuUC1-bAjB7rEkTVVrNzqeS0';

const HOJAS = Object.freeze({
  PARTICIPANTES: 'Participantes',
  SESIONES: 'Sesiones',
  ASISTENCIAS: 'Asistencias'
});

function obtenerLibro_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.includes('PEGA_AQUI')) {
    throw new Error('Configura SPREADSHEET_ID en Config.gs antes de ejecutar la aplicación.');
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}
