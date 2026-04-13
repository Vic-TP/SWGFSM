// backend/routes/ventasRoutes.js - VERSIÓN CORREGIDA

const express = require('express');
const Venta = require('../models/Venta');

const router = express.Router();

// GET todas las ventas
router.get('/', async (req, res) => {
  try {
    const ventas = await Venta.find().sort({ fecha: -1 });
    console.log('Ventas encontradas:', ventas.length);
    res.json(ventas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener ventas' });
  }
});
// GET todas las ventas (con filtro por email)
router.get('/', async (req, res) => {
  try {
    const { clienteEmail } = req.query;
    let filtro = {};
    
    if (clienteEmail) {
      filtro.clienteEmail = clienteEmail;
    }
    
    const ventas = await Venta.find(filtro).sort({ fecha: -1 });
    console.log('Ventas encontradas:', ventas.length);
    res.json(ventas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener ventas' });
  }
});
// POST nueva venta
router.post('/', async (req, res) => {
  try {
    console.log('📦 Datos recibidos:', JSON.stringify(req.body, null, 2));
    
    // Asegurar que productos sea un array (el frontend envía "productos")
    let productosArray = req.body.productos || req.body.producto || [];
    
    // Si es un objeto, convertirlo a array
    if (!Array.isArray(productosArray)) {
      productosArray = [productosArray];
    }
    
    const ventaData = {
      cliente: req.body.cliente,
      clienteEmail: req.body.clienteEmail || '',
      clienteTelefono: req.body.clienteTelefono || '',
      productos: productosArray,
      subtotal: req.body.subtotal,
      total: req.body.total,
      metodoPago: req.body.metodoPago,
      comprobante: req.body.comprobante || 'Boleta',
      estado: req.body.estado || 'Pendiente'
    };
    
    console.log('📦 Venta a guardar:', JSON.stringify(ventaData, null, 2));
    
    const nuevaVenta = new Venta(ventaData);
    const guardada = await nuevaVenta.save();
    
    console.log('✅ Venta guardada exitosamente:', guardada.numeroVenta);
    res.status(201).json(guardada);
  } catch (err) {
    console.error('❌ Error al guardar venta:', err.message);
    console.error('❌ Detalle:', err);
    res.status(500).json({ 
      message: 'Error al crear venta', 
      error: err.message 
    });
  }
});

// PUT actualizar estado de venta
router.put('/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    const venta = await Venta.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    );
    if (!venta) return res.status(404).json({ message: 'Venta no encontrada' });
    res.json(venta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar estado' });
  }
});

// DELETE eliminar venta
router.delete('/:id', async (req, res) => {
  try {
    await Venta.findByIdAndDelete(req.params.id);
    res.json({ message: 'Venta eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar venta' });
  }
});

module.exports = router;