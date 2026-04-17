// backend/routes/productoRoutes.js - VERSIÓN CORREGIDA

const express = require('express');
const Producto = require('../models/Producto');

const router = express.Router();

// OBTENER TODOS LOS PRODUCTOS (GET)
router.get('/', async (req, res) => {
  try {
    const productos = await Producto.find();
    console.log(`✅ Se encontraron ${productos.length} producto`); // Para debug
    res.json(productos);
  } catch (err) {
    console.error('Error en GET /producto:', err);
    res.status(500).json({ message: 'Error al obtener los producto', error: err.message });
  }
});

// OBTENER UN PRODUCTO POR ID
router.get('/:id', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (err) {
    console.error('Error en GET /producto/:id:', err);
    res.status(500).json({ message: 'Error al obtener el producto' });
  }
});

// CREAR PRODUCTO (POST)
router.post('/', async (req, res) => {
  try {
    const nuevoProducto = new Producto(req.body);
    const productoGuardado = await nuevoProducto.save();
    res.status(201).json(productoGuardado);
  } catch (err) {
    console.error('Error en POST /producto:', err);
    res.status(500).json({ message: 'Error al crear el producto' });
  }
});

// ACTUALIZAR PRODUCTO (PUT)
router.put('/:id', async (req, res) => {
  try {
    const productoActualizado = await Producto.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!productoActualizado) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(productoActualizado);
  } catch (err) {
    console.error('Error en PUT /productos/:id:', err);
    res.status(500).json({ message: 'Error al actualizar el producto' });
  }
});

// ELIMINAR PRODUCTO (DELETE)
router.delete('/:id', async (req, res) => {
  try {
    const productoEliminado = await Producto.findByIdAndDelete(req.params.id);
    if (!productoEliminado) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error('Error en DELETE /productos/:id:', err);
    res.status(500).json({ message: 'Error al eliminar el producto' });
  }
});

module.exports = router;