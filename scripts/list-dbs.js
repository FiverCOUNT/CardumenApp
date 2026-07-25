const { Client } = require('pg');

const url =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/postgres';

const client = new Client({
  connectionString: url.replace(/\/[^/?]+(\?|$)/, '/postgres$1'),
});

async function main() {
  await client.connect();
  const { rows } = await client.query(`
    SELECT datname AS name
    FROM pg_database
    WHERE datistemplate = false
    ORDER BY datname
  `);
  console.log('Bases de datos:');
  rows.forEach((r) => console.log('-', r.name));
  await client.end();
}

main().catch((err) => {
  console.error('No se pudo conectar a PostgreSQL:');
  console.error(err.message || err);
  if (err.code) console.error('Código:', err.code);
  process.exit(1);
});
