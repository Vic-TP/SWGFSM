// backend/server.js - UNIFICADO CON CRON Y ML
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron"); // Nueva dependencia
require("dotenv").config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// --- Configuración de Base de Datos ---
const mongoURI = process.env.MONGO_URI;
const mongoDbName = process.env.MONGO_DB_NAME || "test";

// --- Importación de Rutas ---
const productoRoutes = require("./routes/productoRoutes");
const inventarioRoutes = require("./routes/InventarioRoutes");
const ventasRoutes = require("./routes/ventasRoutes");
const proveedorRoutes = require("./routes/proveedorRoutes");
const clienteRoutes = require("./routes/clienteRoutes");
const empleadoRoutes = require("./routes/empleadoRoutes");
const prediccionRoutes = require("./routes/prediccion"); // Nueva ruta de ML
const pagoSimuladoRoutes = require("./routes/pagoSimuladoRoutes");
const tareaRoutes = require("./routes/tareaRoutes");
const entregaRoutes = require("./routes/entregaRoutes");
const promocionRoutes = require("./routes/promocionRoutes");
const descuentoRoutes = require("./routes/descuentoRoutes");
const verifyJWT = require("./middleware/verifyJWT"); // Middleware para proteger rutas

// --- Definición de Endpoints ---
app.use("/api/clientes", clienteRoutes);
app.use("/api/empleados", empleadoRoutes);
app.use("/api/producto", productoRoutes); // público — landing page
app.use("/api/promociones", promocionRoutes);
app.use("/api/descuentos", descuentoRoutes);
app.use("/api/inventario", verifyJWT, inventarioRoutes);
app.use("/api/ventas", verifyJWT, ventasRoutes);
app.use("/api/proveedores", verifyJWT, proveedorRoutes);
app.use("/api/prediccion", verifyJWT, prediccionRoutes);
app.use("/api/pago-simulado", verifyJWT, pagoSimuladoRoutes);
app.use("/api/tareas", verifyJWT, tareaRoutes);
app.use("/api/entrega", verifyJWT, entregaRoutes);

// Ruta de prueba
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend y sistema de cron funcionando" });
});

// --- Conexión a MongoDB + arranque del servidor ---
//
// ÚNICO CAMBIO respecto al original: app.listen() se mueve DENTRO del .then()
// para que el servidor no empiece a aceptar peticiones HTTP (ventas, predicción,
// etc.) mientras Mongoose todavía está conectando a la base de datos.
// Flujo correcto: conectar → entrenar modelo → programar cron → abrir puerto.
const PORT = process.env.PORT || 5000;

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

    // 3. Recién ahora el servidor acepta tráfico real
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error de conexión a MongoDB:", err);
    process.exit(1);
  });