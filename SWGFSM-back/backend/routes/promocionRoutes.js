const express = require("express");
const Promocion = require("../models/Promocion");
const Producto = require("../models/Producto");
const verifyJWT = require("../middleware/verifyJWT");
const { encontrarProductoCatalogoPorVariedad } = require("../utils/catalogoProducto");

const router = express.Router();

const VARIEDADES = ["Fuerte", "Hass", "Hall", "Naval"];

const mensajeVariedadSinCatalogo = (variedad) =>
  `No hay producto activo en el listado para la variedad "${variedad}". Regístralo primero en Listado de productos.`;

const assertVariedadEnCatalogo = async (variedad) => {
  const prod = await encontrarProductoCatalogoPorVariedad(Producto, variedad);
  if (!prod) return mensajeVariedadSinCatalogo(variedad);
  return null;
};

const bodyToPromocion = (body) => {
  const b = body || {};
  const num = (v, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  return {
    nombre: String(b.nombre || "Pack Familiar").trim() || "Pack Familiar",
    variedad: String(b.variedad || "").trim(),
    precio: num(b.precio),
    kgMadura: Math.max(0.01, num(b.kgMadura, 1)),
    descripcion: String(b.descripcion || "").trim(),
    estado: String(b.estado || "ACTIVO").toUpperCase() === "INACTIVO" ? "INACTIVO" : "ACTIVO",
  };
};

router.get("/", async (_req, res) => {
  try {
    const list = await Promocion.find().sort({ fechaCreacion: -1 }).lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al listar promociones" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Promocion.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Promoción no encontrada" });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener la promoción" });
  }
});

router.post("/", verifyJWT, async (req, res) => {
  try {
    const payload = bodyToPromocion(req.body);
    if (!payload.variedad) {
      return res.status(400).json({ message: "La variedad es obligatoria." });
    }
    if (!VARIEDADES.includes(payload.variedad)) {
      return res.status(400).json({
        message: `Variedad no válida. Use: ${VARIEDADES.join(", ")}.`,
      });
    }
    if (payload.precio <= 0) {
      return res.status(400).json({ message: "El precio debe ser mayor a 0." });
    }
    const errCatalogo = await assertVariedadEnCatalogo(payload.variedad);
    if (errCatalogo) return res.status(400).json({ message: errCatalogo });
    const doc = await Promocion.create(payload);
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al crear la promoción" });
  }
});

router.put("/:id", verifyJWT, async (req, res) => {
  try {
    const payload = bodyToPromocion(req.body);
    if (!payload.variedad) {
      return res.status(400).json({ message: "La variedad es obligatoria." });
    }
    if (!VARIEDADES.includes(payload.variedad)) {
      return res.status(400).json({
        message: `Variedad no válida. Use: ${VARIEDADES.join(", ")}.`,
      });
    }
    if (payload.precio <= 0) {
      return res.status(400).json({ message: "El precio debe ser mayor a 0." });
    }
    const errCatalogo = await assertVariedadEnCatalogo(payload.variedad);
    if (errCatalogo) return res.status(400).json({ message: errCatalogo });
    const doc = await Promocion.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ message: "Promoción no encontrada" });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al actualizar la promoción" });
  }
});

router.delete("/:id", verifyJWT, async (req, res) => {
  try {
    const doc = await Promocion.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Promoción no encontrada" });
    res.json({ message: "Promoción eliminada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al eliminar la promoción" });
  }
});

module.exports = router;
