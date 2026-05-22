// backend/models/Cliente.js — colección: clientes

const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema(
  {
    nombres: { type: String, required: true, trim: true },
    apellidos: { type: String, default: '', trim: true },
    tipoCliente: { type: String, default: 'MINORISTA', trim: true },
    telefono: { type: String, default: '', trim: true },
    correo: { type: String, default: '', trim: true, lowercase: true },
    direccion: { type: String, default: '', trim: true },
    documento: { type: String, default: '', trim: true },
    estado: { type: String, default: 'ACTIVO' },
    fechaRegistro: { type: Date, default: Date.now },
    ultimaCompra: { type: Date },
    passwordHash: { type: String, select: false }
  },
  { collection: 'clientes' }
);

module.exports = mongoose.model('Cliente', clienteSchema);
