// backend/models/Tarea.js — colección: tareas

const mongoose = require("mongoose");

const ESTADOS_TAREA = ["pendiente", "completada"];

const tareaSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "", trim: true },
    empleadoAsignado: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Empleado",
      required: true,
    },
    estado: {
      type: String,
      enum: ESTADOS_TAREA,
      default: "pendiente",
    },
    fechaCreacion: { type: Date, default: Date.now },
    fechaActualizacion: { type: Date, default: Date.now },
  },
  { collection: "tareas" }
);

tareaSchema.pre("save", function (next) {
  this.fechaActualizacion = new Date();
  next();
});

const Tarea = mongoose.model("Tarea", tareaSchema);
Tarea.ESTADOS_TAREA = ESTADOS_TAREA;
module.exports = Tarea;
