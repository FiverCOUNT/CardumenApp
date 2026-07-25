const mysql = require('mysql2/promise');

const passwords = ['', 'root', 'password', 'admin', '1234', '123456', 'mysql'];

async function tryConnect(password) {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password,
  });
  return conn;
}

async function main() {
  let conn;
  let usedPassword = null;

  for (const password of passwords) {
    try {
      conn = await tryConnect(password);
      usedPassword = password === '' ? '(vacía)' : password;
      break;
    } catch (err) {
      // try next
    }
  }

  if (!conn) {
    console.error('No se pudo conectar como root con contraseñas comunes.');
    console.error('Indica la contraseña de root de MySQL.');
    process.exit(1);
  }

  console.log('Conectado como root. Password usada:', usedPassword);
  console.log('');

  const [dbs] = await conn.query(
    "SHOW DATABASES"
  );
  console.log('=== BASES DE DATOS ===');
  dbs.forEach((row) => console.log('-', row.Database));

  console.log('');
  console.log('=== USUARIOS ROOT ===');
  const [users] = await conn.query(`
    SELECT User, Host, plugin,
           IF(authentication_string = '' OR authentication_string IS NULL, 'SIN PASSWORD', 'CON PASSWORD') AS password_status
    FROM mysql.user
    WHERE User = 'root'
    ORDER BY Host
  `);

  if (users.length === 0) {
    console.log('(no se encontraron usuarios root)');
  } else {
    users.forEach((u) => {
      console.log(`- root@${u.Host} | plugin: ${u.plugin} | ${u.password_status}`);
    });
  }

  console.log('');
  console.log('=== TODOS LOS USUARIOS ===');
  const [allUsers] = await conn.query(`
    SELECT User, Host
    FROM mysql.user
    ORDER BY User, Host
  `);
  allUsers.forEach((u) => console.log(`- ${u.User}@${u.Host}`));

  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
