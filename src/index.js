require('./config/env');

const app = require('./app');
const { port } = require('./config/env');

app.listen(port, () => {
  console.log(`API corriendo en http://localhost:${port}`);
  console.log(`Admin panel en http://localhost:${port}/admin`);
});
