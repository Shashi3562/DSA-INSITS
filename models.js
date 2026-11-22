// In-memory data store (replaces MongoDB). Data lives in RAM and resets on restart.

const users = new Map(); // userId -> user
const codes = new Map(); // `${userId}|${problemId}|${language}` -> { userId, problemId, language, code }

export function connectDB() {
  console.log('Using in-memory store (no database)');
}

export function isConnected() {
  return true;
}

function newUser(userId, name = 'User') {
  const now = new Date().toISOString();
  return {
    userId,
    name,
    email: '',
    profile: { totalSolved: 0, currentStreak: 0, lastActiveDate: '', dailyHistory: [] },
    solvedProblems: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const store = {
  getUser(userId) {
    return users.get(userId) || null;
  },
  getOrCreateUser(userId, name) {
    let u = users.get(userId);
    if (!u) {
      u = newUser(userId, name || 'User');
      users.set(userId, u);
    }
    return u;
  },
  updateUser(userId, { name, email, profile }) {
    const u = this.getOrCreateUser(userId);
    if (name !== undefined) u.name = name;
    if (email !== undefined) u.email = email;
    if (profile !== undefined) u.profile = { ...u.profile, ...profile };
    u.updatedAt = new Date().toISOString();
    return u;
  },
  addSolved(userId, problemId) {
    const u = this.getOrCreateUser(userId);
    if (!u.solvedProblems.includes(problemId)) u.solvedProblems.push(problemId);
    u.updatedAt = new Date().toISOString();
    return u;
  },
  leaderboard(limit = 50) {
    return [...users.values()]
      .sort((a, b) =>
        (b.profile.totalSolved - a.profile.totalSolved) ||
        (b.profile.currentStreak - a.profile.currentStreak))
      .slice(0, limit);
  },
  saveCode(userId, problemId, language, code) {
    codes.set(`${userId}|${problemId}|${language}`, { userId, problemId, language, code });
  },
  getCode(userId, problemId, language) {
    return codes.get(`${userId}|${problemId}|${language}`)?.code || '';
  },
};
