# Control de Asistencia — Google Apps Script

Web App móvil para registrar la asistencia de **30 participantes** en **10 sesiones**, usando
Google Sheets como base de datos y Google Apps Script como backend. El código se desarrolla
localmente, se versiona con Git y se sincroniza con Apps Script mediante **clasp**.

---

## 1. Objetivo

Sustituir el pase de lista en papel por una aplicación que se abre desde el teléfono y que:

- Muestra las 10 sesiones del curso y permite elegir una.
- Lista a los participantes activos con una tarjeta grande por persona para marcar asistencia.
- Guarda el resultado en Google Sheets como `PRESENTE` o `AUSENTE`, con fecha y hora de registro.
- Permite corregir una sesión ya registrada **sin duplicar** participantes.

---

## 2. Arquitectura

```
┌───────────────────────┐  google.script.run  ┌──────────────────────────┐  openById(...)  ┌─────────────────────────┐
│ Teléfono / navegador  │ ──────────────────▶ │ Google Apps Script       │ ──────────────▶ │ Google Sheets           │
│ index.html            │ ◀────────────────── │ Code.gs · Asistencia.gs  │ ◀────────────── │ BD_Control_Asistencia   │
│ (HTML + CSS + JS)     │  datos / errores    │ Config.gs · Setup.gs     │                 │ Participantes, Sesiones,│
└───────────────────────┘                     └──────────────────────────┘                 │ Asistencias             │
                                                          ▲                                 └─────────────────────────┘
                                                          │ clasp push / pull
                                              ┌──────────────────────────┐      git push
                                              │ Carpeta local            │ ─────────────▶ GitHub
                                              │ (VS Code + agente de IA) │
                                              └──────────────────────────┘
```

- **Frontend** (`index.html`): una sola página servida por `doGet()`. Llama al backend con
  `google.script.run.withSuccessHandler(...).withFailureHandler(...)`.
- **Backend** (`*.gs`): funciones públicas que la página invoca y funciones privadas (terminan en `_`)
  que solo se usan internamente y **no** pueden llamarse desde el navegador.
- **Datos** (Google Sheets): tres hojas con claves lógicas; el backend las abre con
  `SpreadsheetApp.openById(SPREADSHEET_ID)`.

### Flujo de una sesión

1. `doGet()` entrega `index.html`.
2. La página llama a `obtenerSesiones()` y llena el selector.
3. Al elegir una sesión llama a `obtenerParticipantes(idSesion)`, que devuelve los activos con su
   estado guardado (`presente: true/false`).
4. Al pulsar **Guardar asistencia** llama a `guardarAsistencia(idSesion, participantes)`, que valida,
   actualiza o inserta por `id_sesion + id_participante` y marca la sesión como `REGISTRADA`.

---

## 3. Tecnologías

| Tecnología | Uso |
|---|---|
| Google Apps Script (runtime **V8**) | Backend y servidor de la Web App |
| Google Sheets | Almacenamiento (`BD_Control_Asistencia`) |
| HtmlService + `google.script.run` | Comunicación página ↔ backend |
| HTML, CSS, JavaScript | Interfaz *mobile-first* sin librerías externas |
| [clasp](https://github.com/google/clasp) 3.x | Sincronización entre la carpeta local y Apps Script |
| Node.js + npm | Instalación de clasp |
| Git + GitHub | Control de versiones |
| VS Code + agente de IA (Claude Code) | Desarrollo asistido y revisión de código |

---

## 4. Estructura del proyecto

```
control_asistencia/
├── .clasp.json       # scriptId del proyecto remoto de Apps Script
├── .claspignore      # Qué sube clasp (solo .gs, index.html y appsscript.json)
├── appsscript.json   # Manifiesto: zona horaria, runtime V8 y configuración de la Web App
├── Config.gs         # SPREADSHEET_ID, objeto HOJAS y obtenerLibro_()
├── Setup.gs          # prepararBaseDatos(): crea hojas y carga P01–P30 y S01–S10
├── Asistencia.gs     # obtenerSesiones, obtenerParticipantes, guardarAsistencia
├── Code.gs           # doGet(): sirve la interfaz con título y viewport móvil
├── index.html        # Interfaz móvil
├── README.md
└── .gitignore        # Excluye credenciales (.clasprc.json), node_modules, .env, etc.
```

### Funciones principales

| Archivo | Función | Pública | Descripción |
|---|---|:---:|---|
| Config.gs | `obtenerLibro_()` | — | Abre la hoja con `openById`; lanza error si falta el ID |
| Setup.gs | `prepararBaseDatos()` | ✓ | Crea las 3 hojas si no existen y carga los datos iniciales sin duplicar |
| Setup.gs | `obtenerOCrearHoja_()`, `formatearHoja_()` | — | Crea una hoja con encabezados / le da formato |
| Code.gs | `doGet()` | ✓ | Punto de entrada de la Web App |
| Asistencia.gs | `obtenerSesiones()` | ✓ | Devuelve `[{ id, numero, fecha, tema, estado }]` |
| Asistencia.gs | `obtenerParticipantes(idSesion)` | ✓ | Activos con `{ id, nombre, correo, presente }` |
| Asistencia.gs | `guardarAsistencia(idSesion, participantes)` | ✓ | Valida, actualiza o inserta con `LockService` y marca `REGISTRADA` |
| Asistencia.gs | `marcarSesionRegistrada_()` | — | Cambia el estado de la sesión |

---

## 5. Modelo de datos (`BD_Control_Asistencia`)

| Hoja | Columnas | Clave lógica |
|---|---|---|
| Participantes | `id_participante, nombre, correo, activo` | `id_participante` |
| Sesiones | `id_sesion, numero, fecha, tema, estado` | `id_sesion` |
| Asistencias | `id_sesion, id_participante, estado, hora_registro` | `id_sesion + id_participante` |

Reglas:

- `activo = FALSE` oculta a un participante en la app sin borrar su historial.
- Las fechas de las sesiones son semanales a partir del día en que se ejecuta `prepararBaseDatos()`.
- `estado` de la sesión: `PENDIENTE` → `REGISTRADA` al guardar asistencia.
- `estado` de la asistencia: solo `PRESENTE` o `AUSENTE`.
- Guardar de nuevo una sesión **actualiza** las filas existentes; nunca se crea un segundo registro
  para el mismo participante en la misma sesión.

---

## 6. Instalación

### Requisitos

- Cuenta de Google con acceso a la hoja `BD_Control_Asistencia`.
- [Node.js](https://nodejs.org/) 18 o superior.
- Git.

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/melissaManzano/control-asistencia-apps-script.git
cd control-asistencia-apps-script

# 2. Instalar clasp de forma global
npm install -g @google/clasp
clasp --version          # debe mostrar 3.x
```

---

## 7. Configuración de clasp

1. **Activar la API de Apps Script** (una sola vez por cuenta):
   abre <https://script.google.com/home/usersettings> y activa *Google Apps Script API*.
2. **Iniciar sesión**:
   ```bash
   clasp login
   clasp show-authorized-user     # comprueba la cuenta activa
   ```
   Las credenciales se guardan en `~/.clasprc.json`. **Nunca** se suben al repositorio
   (están en `.gitignore`).
3. **Vincular la carpeta con el proyecto remoto.** El repositorio ya incluye `.clasp.json` con el
   `scriptId`. Para trabajar con otro proyecto, cambia el `scriptId` o clona desde cero:
   ```bash
   clasp clone <scriptId>
   ```
4. **Comprobar qué se sube.** `.claspignore` limita la sincronización a los archivos del backend y la
   interfaz:
   ```bash
   clasp status
   ```
   Como *tracked files* deben aparecer solo `appsscript.json`, los `.gs` e `index.html`.

---

## 8. Configuración de la aplicación

En `Config.gs` define el ID de la hoja de cálculo:

```js
const SPREADSHEET_ID = 'ID_DE_BD_CONTROL_ASISTENCIA';
```

El ID está en la URL de la hoja: `https://docs.google.com/spreadsheets/d/<ID>/edit`.

Comprueba también que la zona horaria de la hoja (**Archivo → Configuración**) sea
`America/Mexico_City`, igual que en `appsscript.json`, para que las fechas no se desfasen.

---

## 9. Sincronización

| Comando | Qué hace |
|---|---|
| `clasp push` | Sube los archivos locales y **reemplaza** los del proyecto remoto |
| `clasp push --force` | Igual, sin preguntar antes de sobrescribir el manifiesto |
| `clasp pull` | Descarga el proyecto remoto y **reemplaza** los archivos locales |
| `clasp status` | Lista los archivos que se subirán |
| `clasp open-script` | Abre el editor de Apps Script del proyecto |

Flujo recomendado (la carpeta local es la fuente de verdad):

```bash
git pull                     # 1. traer cambios del repositorio
# ... editar código ...
git diff                     # 2. revisar los cambios
git add .
git commit -m "Descripción clara del cambio"
clasp push                   # 3. sincronizar con Apps Script
git push                     # 4. compartir en GitHub
```

> No edites a la vez en el editor web y en local: `push` y `pull` sobrescriben sin combinar cambios.
> Si alguien cambió algo en el editor web, haz `clasp pull` y un commit **antes** de seguir trabajando.

---

## 10. Inicializar la base de datos

Solo la primera vez (o para recrear hojas faltantes):

1. `clasp push` y luego `clasp open-script`.
2. En el editor abre **Setup.gs**, elige **`prepararBaseDatos`** en la lista de funciones y pulsa
   **▷ Ejecutar**. (La lista solo muestra las funciones del archivo abierto.)
3. Autoriza los permisos: *Revisar permisos* → tu cuenta → *Configuración avanzada* →
   *Ir a … (no seguro)* → **Permitir**. El aviso aparece porque Google no ha verificado el proyecto.
4. Verifica en la hoja:
   - **Participantes**: encabezado + P01–P30 con `activo = TRUE`.
   - **Sesiones**: encabezado + S01–S10 en `PENDIENTE`.
   - **Asistencias**: solo el encabezado.

Puede ejecutarse varias veces: no duplica datos ni sobrescribe hojas existentes.

---

## 11. Publicación de la Web App

`appsscript.json` ya define la configuración:

```json
"webapp": { "executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS" }
```

### Probar sin publicar

En el editor: **Implementar → Implementaciones de prueba** y abre la URL que termina en `/dev`.
Siempre ejecuta el último código subido y solo la puede abrir el propietario.

### Primera publicación

Desde el editor: **Implementar → Nueva implementación → Tipo: Aplicación web**
(Ejecutar como: *Yo*; Quién tiene acceso: *Cualquier persona*). O desde la terminal:

```bash
clasp create-deployment --description "v1 - primera versión"
clasp list-deployments           # muestra el deploymentId de cada implementación
clasp open-web-app <deploymentId>
```

### Publicar cambios conservando la misma URL

```bash
clasp push
clasp update-deployment <deploymentId> --description "v2 - descripción del cambio"
```

O en el editor: **Implementar → Gestionar implementaciones → Editar (lápiz) → Versión: Nueva versión**.

> La URL `/exec` sirve la **versión publicada**, no el último `push`. Si no ves tus cambios,
> crea una nueva versión de la implementación.

---

## 12. Ejecución y uso

1. Abre la URL `/exec` en el teléfono (puedes añadirla a la pantalla de inicio).
2. Elige la **sesión** en el selector.
3. Toca la tarjeta de cada participante presente (se pone verde), o usa **Marcar todos** /
   **Desmarcar todos**. El contador muestra `Presentes: N / 30`.
4. Pulsa **Guardar asistencia** (fijo en la parte inferior). El botón muestra *Guardando...* y después
   aparece la confirmación o el error.
5. Para corregir una sesión ya registrada, vuelve a elegirla: se cargan los estados guardados y, al
   guardar, se actualizan sin duplicar.

---

## 13. Uso del agente de IA

El proyecto se desarrolló con apoyo de un agente de IA (Claude Code en VS Code) que trabajó sobre la
carpeta local. El agente propuso la estructura, revisó el código base proporcionado por el profesor,
detectó problemas y aplicó correcciones, entre ellas:

- `LockService` en `guardarAsistencia` para evitar pérdida de datos cuando dos personas guardan a la vez.
- Validación en el servidor de la sesión y los participantes (la Web App es anónima; evita IDs
  inventados e inyección de fórmulas en la hoja).
- Eliminación de un `clearContent()` innecesario que podía dejar vacía la hoja si fallaba la escritura.
- Descarte de respuestas obsoletas en el frontend para no guardar marcas en la sesión equivocada.
- Rediseño *mobile-first* con tarjetas táctiles y botón de guardado fijo.

### Reglas de trabajo con la IA

1. **Pedir primero la propuesta** (archivos, funciones y decisiones) y después el código.
2. **Revisar antes de aceptar**:
   ```bash
   git status
   git diff                          # cambios en archivos ya versionados
   git add . && git diff --cached    # incluye también los archivos nuevos
   ```
   Revisa funciones, nombres, permisos (`appsscript.json`, acceso de la Web App) y manejo de errores.
3. **Pedir explicación** de cualquier fragmento que no se entienda antes de aceptarlo.
4. **Probar** en la implementación de prueba (`/dev`) antes de publicar.
5. **Hacer un commit descriptivo** y después `clasp push`.
6. **Nunca publicar código generado por IA sin revisarlo.**

---

## 14. Seguridad

- La Web App se ejecuta con la cuenta de quien la implementa y es accesible para **cualquiera con el
  enlace**: esa persona puede ver nombres y correos y registrar asistencia. Comparte la URL solo con
  quien deba usarla.
- El backend valida sesión, participantes y estados antes de escribir; un usuario anónimo no puede
  insertar filas arbitrarias.
- `openById` requiere el permiso *ver, editar, crear y eliminar todas tus hojas de cálculo*.
- `.clasprc.json` contiene tus credenciales de Google: está en `.gitignore` y nunca debe compartirse.
- `SPREADSHEET_ID` y `scriptId` sí se versionan; por sí solos no dan acceso sin permisos de Google.

---

## 15. Evidencia (v1.0)

| Recurso | URL |
|---|---|
| Web App publicada (versión 1) | <https://script.google.com/macros/s/AKfycbyTcBOGYUEOK3aqc2A4qn7kDYakado6BOhSf1Q328RmF0_wQbtSHmeChG_K9dkxsGp6/exec> |
| Google Sheets (`BD_Control_Asistencia`) | <https://docs.google.com/spreadsheets/d/1jCzzUq3IJDb8f_GuAolGuUC1-bAjB7rEkTVVrNzqeS0/edit> (acceso restringido) |
| Repositorio | <https://github.com/melissaManzano/control-asistencia-apps-script> (etiqueta `v1.0`) |

---

## 16. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Configura SPREADSHEET_ID en Config.gs...` | Falta el ID | Pega el ID en `Config.gs` y haz `clasp push` |
| `User has not enabled the Apps Script API` | API desactivada | Actívala en <https://script.google.com/home/usersettings> |
| No aparece `prepararBaseDatos` en el editor | La lista solo muestra funciones del archivo abierto | Abre **Setup.gs** |
| La URL `/exec` no muestra los cambios | Sigue publicada una versión anterior | Crea una nueva versión de la implementación |
| Fechas corridas un día | La hoja tiene otra zona horaria | Cambia la hoja a `America/Mexico_City` |
| El selector de sesiones aparece vacío | Base sin inicializar o hoja renombrada | Ejecuta `prepararBaseDatos()` y revisa los nombres en `HOJAS` |
