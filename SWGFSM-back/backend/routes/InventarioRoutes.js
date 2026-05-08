// backend/routes/inventarioRoutes.js
const express = require('express');
const Inventario = require('../models/Inventario');

const router = express.Router();

/** Documentos antiguos usaban precio / pago; exponemos siempre precioCompra / totalInvertido */
const normalizarRegistro = (r) => {
  if (!r) return r;
  const o = typeof r.toObject === 'function' ? r.toObject() : { ...r };
  return {
    ...o,
    precioCompra: o.precioCompra ?? o.precio,
    totalInvertido: o.totalInvertido ?? o.pago
  };
};

// OBTENER todo el inventario → GET /api/inventario
router.get('/', async (req, res) => {
  try {
    const registros = await Inventario.find().sort({ fecha: -1 }).lean();
    res.json(registros.map(normalizarRegistro));
  } catch (err) {
    res.status(500).send('Error al obtener el Inventario');
  }
});

// AGREGAR nuevo registro de inventario → POST /api/inventario
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const precioCompra = Number(body.precioCompra ?? body.precio);
    const totalInvertido = Number(body.totalInvertido ?? body.pago);

    const doc = {
      proveedor: body.proveedor,
      producto: body.producto,
      cantidad: Number(body.cantidad),
      precioCompra,
      totalInvertido,
      numeroPuesto: body.numeroPuesto,
      tipo: body.tipo,
      tamano: body.tamano,
      detalle: body.detalle
    };
    if (body.fecha) doc.fecha = new Date(body.fecha);

    if ([doc.cantidad, doc.precioCompra, doc.totalInvertido].some((n) => Number.isNaN(n))) {
      return res.status(400).json({
        message: 'Cantidad, precio de compra y total invertido deben ser números válidos.'
      });
    }

    const nuevoRegistro = new Inventario(doc);
    await nuevoRegistro.save();
    res.status(201).json(normalizarRegistro(nuevoRegistro));
  } catch (err) {
    if (err.name === 'ValidationError') {
      const first = Object.values(err.errors || {})[0];
      return res.status(400).json({ message: first?.message || err.message });
    }
    console.error(err);
    res.status(500).json({ message: 'Error al guardar el registro' });
  }
});

// EDITAR registro de inventario → PUT /api/inventario/:id
router.put('/:id', async (req, res) => {
  try {
    const body = req.body || {};
    const precioCompra = Number(body.precioCompra ?? body.precio);
    const totalInvertido = Number(body.totalInvertido ?? body.pago);

    const doc = {
      proveedor: body.proveedor,
      producto: body.producto,
      cantidad: Number(body.cantidad),
      precioCompra,
      totalInvertido,
      numeroPuesto: body.numeroPuesto,
      tipo: body.tipo,
      tamano: body.tamano,
      detalle: body.detalle
    };
    if (body.fecha) doc.fecha = new Date(body.fecha);

    if ([doc.cantidad, doc.precioCompra, doc.totalInvertido].some((n) => Number.isNaN(n))) {
      return res.status(400).json({
        message: 'Cantidad, precio de compra y total invertido deben ser números válidos.'
      });
    }

    const actualizado = await Inventario.findByIdAndUpdate(req.params.id, doc, {
      new: true,
      runValidators: true
    });
    if (!actualizado) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json(normalizarRegistro(actualizado));
  } catch (err) {
    if (err.name === 'ValidationError') {
      const first = Object.values(err.errors || {})[0];
      return res.status(400).json({ message: first?.message || err.message });
    }
    console.error(err);
    res.status(500).json({ message: err.message || 'Error al actualizar el registro' });
  }
});

// ELIMINAR registro de inventario → DELETE /api/inventario/:id
router.delete('/:id', async (req, res) => {
  try {
    const eliminado = await Inventario.findByIdAndDelete(req.params.id);
    if (!eliminado) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json({ message: 'Registro eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar el registro' });
  }
});

module.exports = router;
