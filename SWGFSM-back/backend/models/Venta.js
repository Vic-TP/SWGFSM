// backend/models/Venta.js - VERSIÓN CORREGIDA

const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    default: Date.now
  },
  numeroVenta: {
    type: String,
    unique: true
  },
  cliente: {
    type: String,
    required: true,
    trim: true
  },
  clienteEmail: {
    type: String,
    required: false,
    trim: true
  },
  clienteTelefono: {
    type: String,
    required: false,
    trim: true
  },
  clienteDocumento: {
    type: String,
    required: false,
    trim: true
  },
  productos: [{
    productoId: { type: String, required: false },
    nombre: { type: String, required: true },
    cantidad: { type: Number, required: true, min: 1 },
    precioUnitario: { type: Number, required: true, min: 0 },
    medida: { type: String, required: false, default: "1kg" },
    subtotal: { type: Number, required: true }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  metodoPago: {
    type: String,
    enum: ['tarjeta', 'yape', 'plin', 'transferencia', 'efectivo'],
    required: true
  },
  estado: {
    type: String,
    enum: ['Pendiente', 'Enviado', 'Entregado', 'Cancelado'],
    default: 'Pendiente'
  },
  /**
   * Origen: CAJA = trabajador en caja registradora; ONLINE = cliente compró en la web.
   * Sin valor = datos antiguos o no indicado (no asumir "online").
   */
  origen: {
    type: String,
    enum: ['CAJA', 'ONLINE'],
    required: false
  },
  comprobante: {
    type: String,
    enum: ['Boleta', 'Factura'],
    default: 'Boleta'
  },
  comprobanteEnviado: {
    type: Boolean,
    default: false
  },
  creadoEn: {
    type: Date,
    default: Date.now
  },
  /**
   * Si ya se descontó stock en producto para esta venta (Pendiente/Enviado/Entregado).
   * Cancelado implica stock no descontado (o se revirtió).
   */
  stockDescontado: {
    type: Boolean,
    default: false
  },
  /** Detalle del descuento por línea (para revertir igual al aplicar) */
  stockMovimientos: {
    type: [
      {
        tipo: { type: String, enum: ['palta', 'semanal'] },
        productoId: String,
        dm: { type: Number, default: 0 },
        dv: { type: Number, default: 0 },
        ds: { type: Number, default: 0 },
        cantidad: { type: Number }
      }
    ],
    default: undefined
  }
}, {
  // Misma colección que en Atlas: test.ventas
  collection: 'ventas'
});

// Generar número de venta automático - VERSIÓN CORREGIDA
ventaSchema.pre('save', async function(next) {
  try {
    if (!this.numeroVenta) {
      const count = await mongoose.model('Venta').countDocuments();
      const numero = (count + 1).toString().padStart(6, '0');
      this.numeroVenta = `V-${numero}`;
      console.log(`Generado número de venta: ${this.numeroVenta}`);
    }
    next();
  } catch (error) {
    console.error("Error al generar número de venta:", error);
    // Si falla, asignar uno basado en timestamp
    this.numeroVenta = `V-${Date.now()}`;
    next();
  }
});

module.exports = mongoose.model('Venta', ventaSchema, 'ventas');