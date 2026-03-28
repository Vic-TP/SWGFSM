const express = require('express');
const Producto = require('../models/Producto');

const router = express.Router();

// ==========================================
// OBTENER TODOS LOS PRODUCTOS (GET)
// ==========================================
router.get('/productos', async (req, res) => {
  try {
    const productos = await Producto.find();
    res.json(productos);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los productos');
  }
});

// ==========================================
// CREAR UN NUEVO PRODUCTO (POST)
// ==========================================
// Nota: Cambiado a plural '/productos' para coincidir con el frontend
router.post('/productos', async (req, res) => {
  try {
    // Extraemos todos los campos que envía el formulario de React
    const { 
      nombre, 
      categoriaId, 
      unidadMedida, 
      precioCompra, 
      precioVenta, 
      stockMinimo, 
      stockSemanal, 
      descripcion, 
      estado 
    } = req.body;

    const nuevoProducto = new Producto({
      nombre,
      categoriaId,
      unidadMedida,
      precioCompra,
      precioVenta,
      stockMinimo,
      stockSemanal,
      descripcion,
      estado
    });

    const productoGuardado = await nuevoProducto.save();
    res.status(201).json(productoGuardado);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al agregar el producto');
  }
});

// ==========================================
// EDITAR UN PRODUCTO (PUT)
// ==========================================
router.put('/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizados = req.body;

    // findByIdAndUpdate devuelve el documento anterior por defecto, 
    // { new: true } hace que devuelva el actualizado.
    const productoActualizado = await Producto.findByIdAndUpdate(
      id, 
      datosActualizados, 
      { new: true } 
    );

    if (!productoActualizado) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json(productoActualizado);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar el producto');
  }
});

// ==========================================
// ELIMINAR UN PRODUCTO (DELETE)
// ==========================================
router.delete('/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Producto.findByIdAndDelete(id);
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al eliminar el producto');
  }
});

module.exports = router;
