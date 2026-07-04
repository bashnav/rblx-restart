// Toda petición debe incluir el header:
//   Authorization: Bearer <SHARED_SECRET>
// Si el token no coincide, se responde 401 Unauthorized.
const express = require('express');

/**
 * Crea la app de Express.
 * @param {Function} getRestartFlag - función que devuelve true/false
 * @param {Function} ackRestart     - función que resetea el flag a false
 */
function createServer(getRestartFlag, ackRestart) {
  const app = express();
  app.use(express.json());

  const SECRET = process.env.SHARED_SECRET;

  // --- Middleware de autenticación simple con token compartido ---
  app.use((req, res, next) => {
    const authHeader = req.headers['authorization'];
    const expected = `Bearer ${SECRET}`;

    if (!SECRET || authHeader !== expected) {
      return res.status(401).json({ error: 'Token inválido o ausente.' });
    }
    next();
  });

  // Roblox llama esto cada X segundos (polling) para saber si debe reiniciar
  app.get('/check-restart', (req, res) => {
    res.json({ restart: getRestartFlag() });
  });

  // Roblox llama esto justo después de expulsar a todos los jugadores,
  // para avisar que ya procesó el reinicio y así resetear el flag.
  app.post('/ack-restart', (req, res) => {
    ackRestart();
    res.json({ ok: true });
  });

  // Ruta simple de salud, útil para comprobar que el servidor está vivo
  app.get('/', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

module.exports = createServer;
