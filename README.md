# Pulse Bot

Bot de WhatsApp basado en la estructura de [Pain Bot](https://github.com/nexusday/pain-bot), con los plugins originales reemplazados por comandos de [Pulse API](https://pulse-api-indol.vercel.app). El menú es una lista interactiva de categorías de Pulse.

## Instalación

Necesitas Node.js 20 o superior (recomendado 22), npm, Git y FFmpeg. En Termux: `pkg install nodejs-lts git ffmpeg`.

```sh
npm ci
cp config.example.js config.js
# Edita global.owner en config.js con tu número internacional sin + ni espacios.
npm start
```

Elige `qr` para vincular desde **WhatsApp → Dispositivos vinculados** o `code` para usar un código de vinculación. Mantén privada la carpeta `sessions/`, que contiene las credenciales. El uso de bibliotecas no oficiales puede estar sujeto a restricciones de WhatsApp.

## Menú y comandos

Al enviar `.menu` se genera una tarjeta visual con clima, hora (con segundos), usuario y tipo de chat/rol, junto al botón de lista en el mismo mensaje. WhatsApp no interpreta HTML dentro de mensajes, por lo que la tarjeta se envía como imagen; si no se puede generar o enviar la lista, se usa texto. El clima se consulta en Pulse API para **Maldonado** por defecto y se guarda hasta 10 minutos. Cambia la ciudad y la zona horaria (IANA) antes de iniciar el bot:

```sh
PULSE_MENU_CITY="Montevideo" PULSE_MENU_TZ="America/Montevideo" npm start
```

Si no defines la zona horaria, se usa la del sistema; si la API de clima falla se muestra «No disponible». La hora es la del momento de generar el mensaje, no un reloj que se actualice en el chat. El modo indica si el chat es privado o de grupo y si el usuario es owner; no cambia la privacidad del bot. Reacciones: 🕒 al comenzar y ⭐ al completar la respuesta.

Envía `.menu`, selecciona una categoría y verás sus comandos. Si la lista no funciona en tu cliente, usa `.menu anime`, `.menu ia`, `.menu canvas`, `.menu descargas`, `.menu busquedas`, `.menu imagenes`, `.menu herramientas`, `.menu audios` o `.menu random`. La categoría juegos está vacía en el catálogo de Pulse y no aparece.

Se incluyen los **76 endpoints** del catálogo público de Pulse API en la instantánea `lib/pulse-catalog.json`. Cada uno tiene el comando `.p_<categoría>_<endpoint>` y también se puede invocar como `.pulse <categoría> <endpoint>`. Por ejemplo:

```text
.p_ia_gemini ¿Qué es Pulse?
.p_anime_pokemon pikachu
.p_canvas_brat texto de ejemplo | bg=8ACE00
.p_herramientas_emojimix emoji1=😂 | emoji2=🥰
.p_imagenes_pixel https://ejemplo.com/foto.jpg | size=12
.p_audios_reverse https://ejemplo.com/audio.mp3
.p_descargas_tiktok https://ejemplo.com/video | direct=true
.pulse busquedas wiki Uruguay
```

El primer valor sin nombre corresponde al primer parámetro del endpoint; para varios parámetros usa `nombre=valor`, separados por `|`. El bot muestra los parámetros obligatorios si falta alguno. Las imágenes y audios de efectos requieren una **URL pública directa**, no una foto o audio adjunto. Para descargas, la respuesta predeterminada es JSON con metadatos y enlaces; `direct=true` solicita el archivo si Pulse lo ofrece. Las respuestas de imagen, audio y video se envían como medios, y los documentos como adjuntos, con un límite de 20 MB. Las respuestas JSON se muestran como texto (hasta 12.000 caracteres).

Se mantienen los alias anteriores, como `.pulseia`, `.pulsewiki`, `.pulseimagen` y `.pulseclima`. Los endpoints dependen de la disponibilidad de Pulse y de sus proveedores; Gemini requiere que el servidor de Pulse tenga configurada su clave. La URL predeterminada es `https://pulse-api-indol.vercel.app`; puede cambiarse con la variable de entorno `PULSE_API_URL`.

El catálogo es una instantánea, no se actualiza automáticamente; cuando Pulse agregue endpoints hay que actualizar `lib/pulse-catalog.json`. No se incluyen los plugins de Pain Bot, por lo que los comandos de administración, juegos y sub-bots originales ya no están disponibles.

## Pruebas

```sh
npm test
```

Las pruebas simulan Pulse API y WhatsApp; no sustituyen una prueba real de vinculación o de disponibilidad del servidor.
