// backend/models/Inventario.js
const mongoose = require('mongoose');

const inventarioSchema = new mongoose.Schema({
  // --- CAMPOS OBLIGATORIOS ---
  fecha: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  proveedor: { 
    type: String, 
    required: true,
    trim: true
  },
  producto: { 
    type: String, 
    required: true,
    trim: true
  },
  cantidad: { 
    type: Number, 
    required: true,
    min: 0
  },
  precioCompra: {
    type: Number,
    required: true,
    min: 0
  },
  totalInvertido: {
    type: Number,
    required: true,
    min: 0
  },

  // --- CAMPOS OPCIONALES ---
  numeroPuesto: { 
    type: String, 
    required: false,
    trim: true
  },
  tipo: { 
    type: String, 
    required: false,
    trim: true
  },
  tamano: { 
    type: String, 
    required: false,
    trim: true
  },
  detalle: { 
    type: String, 
    required: false,
    trim: true
  }
}, {
  // Misma colección que en Atlas: test.Inventario
  collection: 'Inventario'
});

module.exports = mongoose.model('Inventario', inventarioSchema, 'Inventario');