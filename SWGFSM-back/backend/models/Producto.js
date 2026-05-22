// backend/models/Producto.js

const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    /** Antes "categoría"; en UI: Tipo */
    tipo: {
      type: String,
      required: false,
      trim: true,
      default: ''
    },
    unidadMedida: {
      type: String,
      required: false,
      trim: true,
      default: 'kg'
    },
    precioVenta: {
      type: Number,
      required: true,
      min: 0
    },
    stockPaltaMadura: { type: Number, default: 0, min: 0 },
    stockPaltaVerde: { type: Number, default: 0, min: 0 },
    stockPaltaSazon: { type: Number, default: 0, min: 0 },
    detalle: { type: String, required: false, trim: true, default: '' },
    tamano: { type: String, required: false, trim: true, default: '' },
    descripcion: { type: String, required: false, trim: true, default: '' },
    estado: { type: String, default: 'ACTIVO' },
    fechaCreacion: { type: Date, default: Date.now },

    // --- Legacy (documentos antiguos en Atlas) ---
    categoriaId: { type: String, required: false },
    precioCompra: { type: Number, required: false },
    stockMinimo: { type: Number, required: false },
    stockSemanal: { type: Number, required: false }
  },
  {
    collection: 'producto',
    strict: true
  }
);

module.exports = mongoose.model('Producto', productoSchema);
