const mongoose = require('mongoose');

const estacionMetropolitanoSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    linea: { type: String, required: true, trim: true },
    /** Punto de encuentro dentro o frente a la estación */
    referencia: { type: String, trim: true, default: '' },
    activa: { type: Boolean, default: true },
    orden: { type: Number, default: 0 },
  },
  { collection: 'estaciones_metropolitano', timestamps: true }
);

module.exports = mongoose.model('EstacionMetropolitano', estacionMetropolitanoSchema);
