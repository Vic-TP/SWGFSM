const mongoose = require("mongoose");

const PrediccionMLSchema = new mongoose.Schema({
  inventarioId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventario" },
  fecha:        { type: Date,   default: Date.now },
  proveedor:    { type: String },
  producto:     { type: String },
  tipo:         { type: String },
  tamano:       { type: String },
  cantidad:     { type: Number },
  diasAlmacen:  { type: Number },
  phEstimado:   { type: Number },
  estadoML:     { type: String, enum: ["verde","sazon","maduro","punto_negro"] },
  confianza:    { type: Number },
  accion:       { type: String },
  probs:        { type: [Number] },
});

module.exports = mongoose.model("PrediccionML", PrediccionMLSchema);