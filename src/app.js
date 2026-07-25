const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const multer = require('multer');

const routes = require('./routes');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api', routes);
app.use('/admin/api', adminRoutes);
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError || err.message === 'Solo se permiten imágenes') {
    return res.status(400).json({ error: err.message });
  }
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
    ...(err.code ? { code: err.code } : {}),
  });
});

module.exports = app;
