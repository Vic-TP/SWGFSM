const express = require('express');
const Proveedor = require('../models/Proveedor');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const list = await Proveedor.find().sort({ nombre: 1 });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener proveedores' });
  }
});

router.post('/', async (req, res) => {
  try {
    const doc = new Proveedor(req.body);
    const guardado = await doc.save();
    res.status(201).json(guardado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Error al crear proveedor' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const actualizado = await Proveedor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!actualizado) return res.status(404).json({ message: 'Proveedor no encontrado' });
    res.json(actualizado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Error al actualizar proveedor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const eliminado = await Proveedor.findByIdAndDelete(req.params.id);
    if (!eliminado) return res.status(404).json({ message: 'Proveedor no encontrado' });
    res.json({ message: 'Proveedor eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar proveedor' });
  }
});

module.exports = router;
