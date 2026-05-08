const mongoose = require("mongoose");

const PrediccionMLSchema = new mongoose.Schema({
  // ── Referencia al Producto (antes apuntaba a Inventario) ───────────────────
  inventarioId: { type: String }, // clave compuesta: "{productoId}-{subLote}"
  productoId:   { type: mongoose.Schema.Types.ObjectId, ref: "Producto" },

  // ── Sub-lote: qué stock representa esta predicción ─────────────────────────
  subLote: {
    type: String,
    enum: ["verde", "sazon", "maduro"],
    required: true,
  },

  // ── Datos del producto ─────────────────────────────────────────────────────
  fecha:    { type: Date,   default: Date.now },
  producto: { type: String },   // ej: "Palta Fuerte"
  tipo:     { type: String },   // Fuerte | Hass | Hall
  tamano:   { type: String },   // grande | mediano | pequeño
  cantidad: { type: Number },   // kg del sub-lote (stockPaltaVerde, etc.)

  // ── Campos de trazabilidad (opcionales, pueden venir del Producto) ─────────
  proveedor: { type: String },

  // ── Resultado del modelo ML ────────────────────────────────────────────────
  diasAlmacen: { type: Number },
  phEstimado:  { type: Number },
  estadoML: {
    type: String,
    enum: ["verde", "sazon", "maduro", "punto_negro"],
    required: true,
  },
  confianza: { type: Number },
  accion:    { type: String },
  probs:     { type: [Number] },
});

// Índice único: un registro por sub-lote de producto
PrediccionMLSchema.index({ inventarioId: 1 }, { unique: true });

// Índices de consulta frecuente
PrediccionMLSchema.index({ productoId: 1 });
PrediccionMLSchema.index({ estadoML: 1 });
PrediccionMLSchema.index({ fecha: -1 });

module.exports = mongoose.model("PrediccionML", PrediccionMLSchema);