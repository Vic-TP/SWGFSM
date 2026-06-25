// backend/server.js - UNIFICADO CON CRON Y ML
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron"); // Nueva dependencia
require("dotenv").config();

const app = express();

// Middlewares
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
      : true,
    credentials: true,
  }),
);

// --- Configuración de Base de Datos ---
const mongoURI = process.env.MONGO_URI;
const mongoDbName = process.env.MONGO_DB_NAME || "test";

if (!mongoURI) {
  console.error(
    "Error: falta MONGO_URI en las variables de entorno (.env o panel del hosting).",
  );
  if (require.main === module) process.exit(1);
}

if (mongoURI) {
  mongoose
    .connect(mongoURI, { dbName: mongoDbName })
    .then(() => {
      console.log(`Conectado a MongoDB — base de datos: ${mongoDbName} ✓`);

      // --- Lógica de Machine Learning (Cron Job) ---
      const { entrenarModelo } = require("./ml/trainer");

      console.log("Iniciando entrenamiento inicial del modelo...");
      entrenarModelo();

      cron.schedule("0 * * * *", () => {
        console.log("[CRON] Ejecutando reentrenamiento programado...");
        entrenarModelo();
      });
    })
    .catch((err) => console.error("Error de conexión a MongoDB:", err));
}

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
const pagoRoutes = require("./routes/pagoRoutes");
const promocionRoutes = require("./routes/promocionRoutes");
const descuentoRoutes = require("./routes/descuentoRoutes");
const verifyJWT = require("./middleware/verifyJWT"); // Middleware para proteger rutas

// --- Definición de Endpoints ---
app.use("/api/clientes", clienteRoutes); //CORREGIR
app.use("/api/empleados", empleadoRoutes); //CORREGIR
app.use("/api/producto", productoRoutes); //PARA PODER VER EL PRODUCTO DESDE EL LANDING PAGE
app.use("/api/promociones", promocionRoutes);
app.use("/api/descuentos", descuentoRoutes);
app.use("/api/entrega", entregaRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/inventario", verifyJWT, inventarioRoutes);
app.use("/api/ventas", verifyJWT, ventasRoutes);
app.use("/api/proveedores", verifyJWT, proveedorRoutes);
app.use("/api/prediccion", verifyJWT, prediccionRoutes);
app.use("/api/pago-simulado", verifyJWT, pagoSimuladoRoutes);
app.use("/api/tareas", verifyJWT, tareaRoutes);

// Ruta de prueba
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend y sistema de cron funcionando" });
});

// --- Lanzamiento del Servidor ---
const PORT = process.env.PORT || 5000;

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });
}
