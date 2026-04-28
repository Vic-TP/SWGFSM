const mongoose = require('mongoose');

const proveedorSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    numeroPuesto: { type: String, default: '', trim: true },
    telefono: { type: String, default: '', trim: true },
    nombreMercado: { type: String, default: '', trim: true },
    entidadBancaria: { type: String, default: '', trim: true },
    numeroCuenta: { type: String, default: '', trim: true },
    estado: { type: String, enum: ['ACTIVO', 'INACTIVO'], default: 'ACTIVO' }
  },
  { timestamps: true, collection: 'proveedors' }
);

// Misma colección que en Atlas: test.proveedors
module.exports = mongoose.model('Proveedor', proveedorSchema, 'proveedors');
