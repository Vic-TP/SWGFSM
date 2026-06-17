const mongoose = require("mongoose");

const promocionSchema = new mongoose.Schema(
  {
    nombre: { type: String, trim: true, default: "Pack Familiar" },
    variedad: { type: String, required: true, trim: true },
    precio: { type: Number, required: true, min: 0 },
    kgMadura: { type: Number, default: 1, min: 0.01 },
    descripcion: { type: String, trim: true, default: "" },
    estado: { type: String, default: "ACTIVO" },
    fechaCreacion: { type: Date, default: Date.now },
  },
  { collection: "promocion" },
);

module.exports = mongoose.model("Promocion", promocionSchema);
