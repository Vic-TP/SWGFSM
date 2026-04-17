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
  }
});

// Generar número de venta automático - VERSIÓN CORREGIDA
ventaSchema.pre('save', async function(next) {
  try {
    if (!this.numeroVenta) {
      const count = await mongoose.model('Venta').countDocuments();
      const numero = (count + 1).toString().padStart(6, '0');
      this.numeroVenta = `V-${numero}`;
      console.log(`📝 Generado número de venta: ${this.numeroVenta}`);
    }
    next();
  } catch (error) {
    console.error("Error al generar número de venta:", error);
    // Si falla, asignar uno basado en timestamp
    this.numeroVenta = `V-${Date.now()}`;
    next();
  }
});

module.exports = mongoose.model('Venta', ventaSchema);