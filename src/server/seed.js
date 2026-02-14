const GameDatabase = require('./database');

function printUsage() {
  console.log('Seed Archmage database by creating tables and inserting initial data.');
  console.log('Usage: npm run seed');
  console.log('Required env: DATABASE_URL');
  console.log('Optional env: DB_SCHEMA, PGSSLMODE=require');
}

async function run() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }

  const db = new GameDatabase();

  try {
    await db.initialize();
    console.log('Database seed complete.');
  } finally {
    await db.close();
  }
}

run().catch((error) => {
  console.error('Failed to seed database:', error);
  process.exit(1);
});
