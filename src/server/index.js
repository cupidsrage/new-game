const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');

const GameDatabase = require('./database');
const GameEngine = require('./gameEngine');
const SessionStore = require('./modules/sessionStore');
const registerHttpRoutes = require('./modules/httpRoutes');
const registerSocketHandlers = require('./modules/socketHandlers');

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../../public')));

  const db = new GameDatabase();
  await db.initialize();
  const gameEngine = new GameEngine(db, io);
  const sessions = new SessionStore();

  registerHttpRoutes(app, { db, sessions });
  registerSocketHandlers(io, { db, gameEngine, sessions });

  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../../public/index.html')));

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Archmage server running on ${PORT}`);
  });

  process.on('SIGTERM', () => {
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
