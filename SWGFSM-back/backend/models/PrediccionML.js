const mongoose = require("mongoose");

const PrediccionMLSchema = new mongoose.Schema({
  // ── Referencia al Producto ─────────────────────────────────────────────────
  inventarioId: { type: String },          // clave compuesta: "{productoId}-{subLote}"
  productoId:   { type: mongoose.Schema.Types.ObjectId, ref: "Producto" },

  // ── Sub-lote: qué stock representa esta predicción ─────────────────────────
  subLote: {
    type:     String,
    enum:     ["verde", "sazon", "maduro"],
    required: true,
  },

  // ── Datos del producto ─────────────────────────────────────────────────────
  fecha:         { type: Date,   default: Date.now },
  producto:      { type: String },   // ej: "Palta Fuerte"
  tipo:          { type: String },   // Fuerte | Hass | Hall
  tamano:        { type: String },   // grande | mediano | pequeño
  cantidad:      { type: Number },   // kg del sub-lote (stockPaltaVerde/Sazon/Madura)
  stockSemanal:  { type: Number },   // referencia de rotación semanal del producto

  // ── Trazabilidad ──────────────────────────────────────────────────────────
  proveedor: { type: String },        // categoriaId del Producto

  // ── Resultado del modelo ML ────────────────────────────────────────────────
  // diasAlmacen = días representativos estimados según la etapa del sub-lote
  // y la variedad (todo entra como verde; el modelo estima en qué punto está)
  diasAlmacen: { type: Number },
  phEstimado:  { type: Number },

  estadoML: {
    type:     String,
    enum:     ["verde", "sazon", "maduro", "punto_negro"],
    required: true,
  },
  confianza: { type: Number },        // 0-1 (probabilidad de la clase ganadora)
  accion:    { type: String },        // "En proceso" | "Almacenar" | "Vender hoy" | "Venta urgente"
  probs:     { type: [Number] },      // [p_verde, p_sazon, p_maduro, p_punto_negro]

  // ── Métricas del modelo ────────────────────────────────────────────────────
  accuracy: { type: Number, default: null }, // % de precisión en test set (0-100)
});

// Índice único: un documento por sub-lote de producto
PrediccionMLSchema.index({ inventarioId: 1 }, { unique: true });

// Índices de consulta frecuente
PrediccionMLSchema.index({ productoId: 1 });
PrediccionMLSchema.index({ estadoML:   1 });
PrediccionMLSchema.index({ fecha:      -1 });
PrediccionMLSchema.index({ tipo:       1 });   // filtros por variedad

module.exports = mongoose.model("PrediccionML", PrediccionMLSchema);