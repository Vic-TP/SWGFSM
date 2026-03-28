const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { 
    type: String, 
    required: true 
  },
  categoriaId: { 
    type: String, 
    required: false 
  },
  unidadMedida: { 
    type: String, 
    required: false 
  },
  precioCompra: { 
    type: Number, 
    required: true 
  },
  precioVenta: { 
    type: Number, 
    required: true 
  },
  stockMinimo: { 
    type: Number, 
    default: 0 
  },
  stockSemanal: { 
    type: Number, 
    required: true // Este sería tu stock actual
  },
  descripcion: { 
    type: String, 
    required: false 
  },
  estado: { 
    type: String, 
    default: 'ACTIVO' 
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Producto', productoSchema);