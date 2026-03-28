const express = require('express');
const Inventario = require('../models/Inventario');

const router = express.Router();

// OBTENER todo el inventario → GET /api/inventario
router.get('/', async (req, res) => {
  try {
    // Ordenamos por fecha descendente (lo más nuevo primero)
    const registros = await Inventario.find().sort({ fecha: -1 });
    res.json(registros);
  } catch (err) {
    res.status(500).send('Error al obtener el Inventario');
  }
});

// AGREGAR nuevo registro de inventario → POST /api/inventario
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const doc = {
      proveedor: body.proveedor,
      producto: body.producto,
      cantidad: Number(body.cantidad),
      precio: Number(body.precio),
      pago: Number(body.pago),
      numeroPuesto: body.numeroPuesto,
      tipo: body.tipo,
      tamano: body.tamano,
      detalle: body.detalle,
    };
    if (body.fecha) doc.fecha = new Date(body.fecha);

    if ([doc.cantidad, doc.precio, doc.pago].some((n) => Number.isNaN(n))) {
      return res.status(400).json({ message: 'Cantidad, precio y pago deben ser números válidos.' });
    }

    const nuevoRegistro = new Inventario(doc);
    await nuevoRegistro.save();
    res.status(201).json(nuevoRegistro);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const first = Object.values(err.errors || {})[0];
      return res.status(400).json({ message: first?.message || err.message });
    }
    console.error(err);
    res.status(500).json({ message: 'Error al guardar el registro' });
  }
});

module.exports = router;