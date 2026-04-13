// backend/models/Producto.js

const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { 
    type: String, 
    required: true 
  },
  categoriaId: { 
    type: String, 
    required: false 
  },
  unidadMedida: { 
    type: String, 
    required: false 
  },
  precioCompra: { 
    type: Number, 
    required: true 
  },
  precioVenta: { 
    type: Number, 
    required: true 
  },
  stockMinimo: { 
    type: Number, 
    default: 0 
  },
  stockSemanal: { 
    type: Number, 
    required: true 
  },
  descripcion: { 
    type: String, 
    required: false 
  },
  estado: { 
    type: String, 
    default: 'ACTIVO' 
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  }
});

// Asegurar que la colección se llame 'productos' (en minúsculas)
module.exports = mongoose.model('Producto', productoSchema, 'producto');