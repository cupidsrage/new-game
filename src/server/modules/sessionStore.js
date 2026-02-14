class SessionStore {
  constructor() {
    this.sessions = new Map();
  }

  createSession(playerId, tokenGenerator) {
    const token = tokenGenerator();
    this.sessions.set(token, playerId);
    return token;
  }

  getPlayerId(token) {
    return this.sessions.get(token) || null;
  }
}

module.exports = SessionStore;
