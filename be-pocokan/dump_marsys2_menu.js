const mysql = require('mysql2/promise');

async function run() {
  const c2 = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'password', database: 'marsys2' });
  const [rows] = await c2.query('SELECT * FROM tmenu');
  console.log(rows);
  await c2.end();
}

run();
