// backend/server.js - COMPLETO CORREGIDO

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Configuración MongoDB
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('Conectado exitosamente a MongoDB Atlas'))
  .catch((err) => console.error('Error de conexión:', err));

// RUTAS - IMPORTANTE: el orden importa
const productoRoutes = require('./routes/productoRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const ventasRoutes = require('./routes/ventasRoutes'); // si ya lo tienes

// Las rutas DEBEN ser así:
app.use('/api/producto', productoRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/ventas', ventasRoutes); // si ya lo tienes

// Ruta de prueba para verificar que el backend funciona
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend funcionando correctamente' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en: http://localhost:${PORT}`);
});