// backend/server.js - UNIFICADO CON CRON Y ML

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron'); // Nueva dependencia
require('dotenv').config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// --- Configuración de Base de Datos ---
const mongoURI = process.env.MONGO_URI;
const mongoDbName = process.env.MONGO_DB_NAME || 'test';

mongoose
  .connect(mongoURI, { dbName: mongoDbName })
  .then(() => {
    console.log(`Conectado a MongoDB — base de datos: ${mongoDbName} ✓`);

    // --- Lógica de Machine Learning (Cron Job) ---
    // Importamos el trainer solo después de conectar a la DB
    const { entrenarModelo } = require("./ml/trainer");
    
    // 1. Primer entrenamiento al arrancar el servidor
    console.log("Iniciando entrenamiento inicial del modelo...");
    entrenarModelo();

    // 2. Cron: Reentrenar cada hora ("0 * * * *")
    cron.schedule("0 * * * *", () => {
      console.log("[CRON] Ejecutando reentrenamiento programado...");
      entrenarModelo();
    });
  })
  .catch((err) => console.error('Error de conexión a MongoDB:', err));

// --- Importación de Rutas ---
const productoRoutes = require('./routes/productoRoutes');
const inventarioRoutes = require('./routes/InventarioRoutes');
const ventasRoutes = require('./routes/ventasRoutes');
const proveedorRoutes = require('./routes/proveedorRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const empleadoRoutes = require('./routes/empleadoRoutes');
const prediccionRoutes = require('./routes/prediccion'); // Nueva ruta de ML
const pagoSimuladoRoutes = require('./routes/pagoSimuladoRoutes');
const tareaRoutes = require('./routes/tareaRoutes');

// --- Definición de Endpoints ---
app.use('/api/producto', productoRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/empleados', empleadoRoutes);
app.use('/api/prediccion', prediccionRoutes); // Endpoint para las predicciones
app.use('/api/pago-simulado', pagoSimuladoRoutes); // Simulador de pasarela (sin PSP real)
app.use('/api/tareas', tareaRoutes);

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend y sistema de cron funcionando' });
});

// --- Lanzamiento del Servidor ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en: http://localhost:${PORT}`);
});