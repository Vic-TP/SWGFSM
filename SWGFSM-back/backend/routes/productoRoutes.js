// backend/routes/productoRoutes.js - VERSIÓN CORREGIDA

const express = require('express');
const Producto = require('../models/Producto');

const router = express.Router();

const normalizeProducto = (doc) => {
  if (!doc) return doc;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const tipo = o.tipo != null && o.tipo !== '' ? o.tipo : o.categoriaId;
  const { stock: _legacyStock, ...rest } = o;
  return {
    ...rest,
    tipo: tipo ?? ''
  };
};

// Búsqueda por nombre (debe ir ANTES de GET /:id)
router.get('/buscar', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json([]);
    }
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const productos = await Producto.find({
      nombre: { $regex: escaped, $options: 'i' },
      estado: { $ne: 'INACTIVO' }
    })
      .limit(25)
      .sort({ nombre: 1 });
    res.json(productos.map(normalizeProducto));
  } catch (err) {
    console.error('Error en GET /producto/buscar:', err);
    res.status(500).json({ message: 'Error al buscar productos', error: err.message });
  }
});

// OBTENER TODOS LOS PRODUCTOS (GET)
router.get('/', async (req, res) => {
  try {
    const productos = await Producto.find();
    console.log(`✅ Se encontraron ${productos.length} producto`); // Para debug
    res.json(productos.map(normalizeProducto));
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
    res.json(normalizeProducto(producto));
  } catch (err) {
    console.error('Error en GET /producto/:id:', err);
    res.status(500).json({ message: 'Error al obtener el producto' });
  }
});

const bodyToProducto = (body) => {
  const b = body || {};
  const num = (v, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  return {
    nombre: String(b.nombre || '').trim(),
    tipo: String(b.tipo ?? b.categoriaId ?? '').trim(),
    unidadMedida: String(b.unidadMedida || 'kg').trim() || 'kg',
    precioVenta: num(b.precioVenta, 0),
    stockPaltaMadura: num(b.stockPaltaMadura, 0),
    stockPaltaVerde: num(b.stockPaltaVerde, 0),
    stockPaltaSazon: num(b.stockPaltaSazon, 0),
    detalle: String(b.detalle || '').trim(),
    tamano: String(b.tamano || '').trim(),
    descripcion: String(b.descripcion || '').trim(),
    estado: b.estado || 'ACTIVO'
  };
};

// CREAR PRODUCTO (POST)
router.post('/', async (req, res) => {
  try {
    const payload = bodyToProducto(req.body);
    if (!payload.nombre) {
      return res.status(400).json({ message: 'El nombre del producto es obligatorio.' });
    }
    const nuevoProducto = new Producto(payload);
    const productoGuardado = await nuevoProducto.save();
    res.status(201).json(normalizeProducto(productoGuardado));
  } catch (err) {
    console.error('Error en POST /producto:', err);
    res.status(500).json({ message: 'Error al crear el producto' });
  }
});

// ACTUALIZAR PRODUCTO (PUT)
router.put('/:id', async (req, res) => {
  try {
    const payload = bodyToProducto(req.body);
    const productoActualizado = await Producto.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { new: true }
    );
    if (!productoActualizado) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(normalizeProducto(productoActualizado));
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