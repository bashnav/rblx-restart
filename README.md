# Roblox Restart Bot

Bot de Discord con el comando `/restart` que reinicia remotamente un servidor
de Roblox: expulsa a todos los jugadores para que Roblox cierre esa instancia
automáticamente y los siguientes jugadores entren a un servidor nuevo.

## 📁 Estructura del proyecto

```
roblox-restart-bot/
├── bot/                        # Bot de Discord (Node.js)
│   ├── index.js                # Lógica principal + comando /restart
│   ├── server.js                # Servidor HTTP que Roblox consulta
│   ├── package.json
│   └── .env.example             # Plantilla de variables de entorno
├── roblox/
│   └── RestartHandler.server.lua  # Script para pegar en Roblox Studio
└── README.md
```

## ⚙️ Cómo funciona (arquitectura)

Roblox **no puede recibir** peticiones HTTP entrantes (un servidor de juego
no tiene una IP pública a la que Discord pueda "tocar la puerta"). Por eso la
comunicación funciona así:

1. Alguien ejecuta `/restart` en Discord.
2. El bot guarda internamente "hay que reiniciar" (`restartRequested = true`).
3. El script de Roblox pregunta cada pocos segundos (*polling*) al bot,
   vía `HttpService`, si hay un reinicio pendiente (`GET /check-restart`).
4. Si la respuesta es sí, Roblox expulsa (`Kick`) a todos los jugadores con
   el mensaje de reinicio y le avisa al bot que ya lo procesó
   (`POST /ack-restart`).
5. Al quedar vacío, Roblox cierra esa instancia automáticamente. Los nuevos
   jugadores entran a un servidor nuevo (comportamiento normal de Roblox).

Toda la comunicación va protegida con un **token secreto compartido**
(`Authorization: Bearer <token>`), así nadie más puede activar el reinicio.

## 🚀 Configuración paso a paso

### 1. Crear la aplicación/bot de Discord

1. Ve a https://discord.com/developers/applications y crea una aplicación.
2. En la pestaña **Bot**, crea el bot y copia su **Token**.
3. En **OAuth2 → URL Generator**, marca los scopes `bot` y `applications.commands`,
   y el permiso `Send Messages`. Usa la URL generada para invitar el bot a tu servidor.
4. Copia el **Application ID** (CLIENT_ID) desde "General Information".
5. Activa el "Modo desarrollador" en Discord (Ajustes → Avanzado) y haz clic
   derecho sobre tu servidor para copiar su **ID** (GUILD_ID).

### 2. Configurar el bot (carpeta `bot/`)

```bash
cd bot
npm install
cp .env.example .env
```

Edita `.env` y completa:

```
DISCORD_TOKEN=...
CLIENT_ID=...
GUILD_ID=...
SHARED_SECRET=elige_un_token_largo_y_aleatorio
PORT=3000
```

Corre el bot localmente para probar:

```bash
npm start
```

### 3. Publicar el bot con una URL pública

Roblox necesita poder llegar a `http://tu-servidor/check-restart` desde
internet, así que el bot debe estar alojado en algún sitio con URL pública
(no solo tu PC local). Opciones típicas y gratuitas/económicas:

- **Railway** (railway.app)
- **Render** (render.com)
- **Fly.io**
- Un VPS propio (con un dominio o IP fija)

Sube la carpeta `bot/` a GitHub y conecta ese repo con el servicio elegido,
configurando ahí las mismas variables de entorno del `.env`.

Cuando el despliegue termine, tendrás una URL tipo:
`https://tu-bot.up.railway.app`

### 4. Configurar el script en Roblox Studio

1. Abre tu juego en Roblox Studio.
2. Ve a **Home → Game Settings → Security** y activa **"Allow HTTP Requests"**.
3. En el **Explorer**, dentro de `ServerScriptService`, crea un `Script`
   normal (nombre sugerido: `RestartHandler`) y pega el contenido de
   `roblox/RestartHandler.server.lua`.
4. Edita las dos variables al inicio del script:
   ```lua
   local BOT_SERVER_URL = "https://tu-bot.up.railway.app" -- tu URL real
   local SECRET_TOKEN = "elige_un_token_largo_y_aleatorio"  -- igual al SHARED_SECRET del .env
   ```
5. Publica el juego.

### 5. Probar

1. Con el bot corriendo (en la nube) y el juego publicado y con jugadores
   dentro, escribe `/restart` en tu servidor de Discord.
2. En unos segundos (según `POLL_INTERVAL_SECONDS`), todos los jugadores
   serán expulsados con el mensaje de reinicio.
3. Al quedar vacío el servidor, Roblox lo cerrará y los nuevos jugadores
   entrarán a una instancia nueva automáticamente.

## 🔒 Seguridad

- El `SHARED_SECRET` debe ser largo, aleatorio y **nunca** debe subirse a
  GitHub (el `.env` real está fuera del repo; solo se sube `.env.example`).
- Si sospechas que el token se filtró, cámbialo tanto en el `.env` del bot
  como en el script de Roblox.
- Puedes agregar un `.gitignore` con la línea `bot/.env` para evitar
  subirlo por error.

## 📝 Notas

- `POLL_INTERVAL_SECONDS` en el script de Roblox controla cada cuánto se
  pregunta al bot. Bajarlo hace el reinicio más rápido pero genera más
  tráfico; 5 segundos es un buen balance.
- Este proyecto es intencionalmente mínimo: no usa base de datos, el estado
  del reinicio vive solo en memoria del bot (se resetea si el bot se reinicia).
