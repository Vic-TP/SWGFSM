const express = require("express");
const Producto = require("../models/Producto");
const { calcularDescuentoOnline } = require("../utils/descuentoOnline");

const router = express.Router();

/** Validar código de descuento (tienda online — vista previa en carrito). */
router.post("/validar", async (req, res) => {
  try {
    const { codigo, lineas } = req.body || {};
    const productos = await Producto.find({ estado: { $ne: "INACTIVO" } }).lean();
    const result = calcularDescuentoOnline({
      codigo,
      lineas: Array.isArray(lineas) ? lineas : [],
      productosCatalogo: productos,
    });
    if (!result.ok) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Error al validar el código." });
  }
});

module.exports = router;
