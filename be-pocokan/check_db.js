const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'password' });
  const [dbs] = await conn.query('SHOW DATABASES');
  for (const dbObj of dbs) {
    const dbName = Object.values(dbObj)[0];
    try {
      const c2 = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'password', database: dbName });
      const [t] = await c2.query("SHOW TABLES LIKE 'tmenu'");
      if (t.length > 0) {
        const [r] = await c2.query('SELECT COUNT(*) as cnt FROM tmenu');
        console.log('DB:', dbName, '| tmenu count:', r[0].cnt);
      }
      await c2.end();
    } catch (e) {}
  }
  await conn.end();
}

run();
