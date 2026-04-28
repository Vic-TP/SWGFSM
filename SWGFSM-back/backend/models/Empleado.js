// backend/models/Empleado.js — colección: empleados

const mongoose = require('mongoose');

/** Roles válidos (mismo orden que el formulario de alta en admin) */
const ROLES_EMPLEADO = [
  'Vendedor',
  'Personal de despacho',
  'Administrador de almacén',
  'Administrador de compras',
  'Administrador de sistemas'
];

const empleadoSchema = new mongoose.Schema(
  {
    nombres: { type: String, required: true, trim: true },
    apellidos: { type: String, default: '', trim: true },
    correo: { type: String, required: true, trim: true, lowercase: true },
    telefono: { type: String, default: '', trim: true },
    rol: {
      type: String,
      enum: ROLES_EMPLEADO,
      default: 'Vendedor',
      trim: true
    },
    estado: { type: String, default: 'ACTIVO' },
    fechaRegistro: { type: Date, default: Date.now },
    passwordHash: { type: String, select: false }
  },
  { collection: 'empleados' }
);

const Empleado = mongoose.model('Empleado', empleadoSchema);
Empleado.ROLES_EMPLEADO = ROLES_EMPLEADO;
module.exports = Empleado;
