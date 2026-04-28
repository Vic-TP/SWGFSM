// backend/server.js - COMPLETO CORREGIDO

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Base de datos en Atlas (mismo cluster; "test" es la BD por defecto típica en desarrollo)
const mongoURI = process.env.MONGO_URI;
const mongoDbName = process.env.MONGO_DB_NAME || 'test';

mongoose
  .connect(mongoURI, { dbName: mongoDbName })
  .then(() =>
    console.log(`Conectado a MongoDB — base de datos: ${mongoDbName}`)
  )
  .catch((err) => console.error('Error de conexión:', err));

// RUTAS - IMPORTANTE: el orden importa
const productoRoutes = require('./routes/productoRoutes');
const inventarioRoutes = require('./routes/InventarioRoutes');
const ventasRoutes = require('./routes/ventasRoutes');
const proveedorRoutes = require('./routes/proveedorRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const empleadoRoutes = require('./routes/empleadoRoutes');

// Las rutas DEBEN ser así:
app.use('/api/producto', productoRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/ventas', ventasRoutes); // si ya lo tienes
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/empleados', empleadoRoutes);

// Ruta de prueba para verificar que el backend funciona
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend funcionando correctamente' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en: http://localhost:${PORT}`);
});