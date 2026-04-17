const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- MIDDLEWARES ---
app.use(express.json()); 
app.use(cors());

// --- CONFIGURACIÓN DE MONGODB ATLAS ---
const mongoURI = process.env.MONGO_URI;

// Debug opcional: Descomenta la siguiente línea si vuelve a fallar para ver qué lee el sistema
// console.log("Intentando conectar a:", mongoURI);

mongoose.connect(mongoURI)
  .then(() => {
    console.log(' Conectado exitosamente a MongoDB Atlas');
    console.log(' Base de Datos activa:', mongoose.connection.name);
  })
  .catch((err) => {
    console.error(' Error crítico de conexión:');
    if (err.message.includes('Authentication failed')) {
      console.error(' CAUSA: Usuario o contraseña incorrectos en el .env');
    } else if (err.message.includes('ETIMEDOUT')) {
      console.error(' CAUSA: Tu IP no tiene permiso en Atlas (Network Access)');
    } else {
      console.error(' DETALLE:', err.message);
    }
  });

// --- RUTAS ---
const productoRoutes = require('./routes/productoRoutes');
const inventarioRoutes = require('./routes/InventarioRoutes');

app.use('/api/productos', productoRoutes);
app.use('/api/inventario', inventarioRoutes);

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Servidor corriendo en: http://localhost:${5000}`);
});