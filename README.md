# Pulse Bot

Bot de WhatsApp basado en la estructura y los plugins de [Pain Bot](https://github.com/nexusday/pain-bot) (revisión `3e462a7`). Usa Baileys y añade comandos para [Pulse API](https://pulse-api-indol.vercel.app). Los plugins heredados de Pain Bot se conservan y algunos utilizan otros servicios; no todos han sido migrados a Pulse.

## Instalación

Requisitos: Node.js 20 o superior (recomendado 22), npm, Git y FFmpeg. En Linux instala FFmpeg con el gestor de paquetes de tu distribución. En Termux: `pkg install nodejs-lts git ffmpeg`.

```sh
npm install
cp config.example.js config.js
# Edita config.js: configura global.owner con tu número internacional sin + ni espacios.
npm start
```

Al iniciar, elige `qr` para escanear desde **WhatsApp → Dispositivos vinculados**, o `code` para vincular mediante número. Mantén privada la carpeta `sessions/`: contiene las credenciales de la cuenta. `config.js`, sesiones y bases de datos de usuario no se versionan. El uso de bibliotecas no oficiales puede estar sujeto a restricciones de WhatsApp.

## Menú y comandos

Envía `.menu` para abrir el menú en **lista interactiva** y selecciona **PULSE API**. Si el envío interactivo falla, se muestra el menú completo en texto. La disponibilidad de listas depende del cliente de WhatsApp. También puedes usar directamente:

| Comando | Uso |
|---|---|
| `.pulseia <pregunta>` | Gemini |
| `.pulseimagen <descripción>` | Generar imagen |
| `.pulsewiki <búsqueda>` / `.pulseyoutube <búsqueda>` | Buscar |
| `.pulseanime <nombre>` / `.pulsepokemon <nombre>` | Anime y Pokémon |
| `.pulseclima <ciudad>` / `.pulsepais <país>` | Información |
| `.pulsemorse <texto>` / `.pulsetraducir <texto>` | Herramientas; traductor al español |
| `.pulsegato` / `.pulseperro` | Imagen aleatoria (datos y enlace) |

Las respuestas JSON se muestran como texto y las imágenes binarias se envían como imagen. Los servicios externos pueden fallar o limitar las peticiones; Gemini requiere que el servidor de Pulse tenga su clave configurada. La URL por defecto es `https://pulse-api-indol.vercel.app`; para usar otra instancia define `PULSE_API_URL` antes de iniciar.

El catálogo de personajes grande y los archivos OCR entrenados no se incluyen. Para regenerar el catálogo opcional ejecuta `npm run sync:chars` con acceso a Kitsu. Algunas funciones heredadas necesitan dependencias o datos adicionales: la transcripción local usa `@xenova/transformers` (dependencia opcional, cuya instalación puede fallar según la plataforma) y OCR puede requerir archivos de idioma. Consulta el proyecto original para detalles de sus plugins.

## Pruebas

```sh
npm test
```

Las pruebas de Pulse simulan la API; no requieren cuenta de WhatsApp ni acceso a la red. No sustituyen una prueba de vinculación real.
