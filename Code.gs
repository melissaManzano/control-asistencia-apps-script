function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle('Control de asistencia')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
