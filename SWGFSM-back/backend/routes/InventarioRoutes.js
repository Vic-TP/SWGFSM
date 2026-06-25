// backend/routes/inventarioRoutes.js
const express = require('express');
const PDFDocument = require('pdfkit');
const Inventario = require('../models/Inventario');

const router = express.Router();

const getBusinessConfig = () => ({
  nombre: process.env.BUSINESS_NAME || 'FRUTERIA SEÑOR DE MURUHUAY',
  ruc: process.env.BUSINESS_RUC || '101215641',
  direccion: process.env.BUSINESS_ADDRESS || 'AV. CAQUETA 800 INT. 15 TREBOL DE CAQUETA',
  telefono: process.env.BUSINESS_PHONE || '966142980',
  email: process.env.BUSINESS_EMAIL || 'paltasmuruhuay@gmail.com',
});

/** Documentos antiguos usaban precio / pago; exponemos siempre precioCompra / totalInvertido */
const normalizarRegistro = (r) => {
  if (!r) return r;
  const o = typeof r.toObject === 'function' ? r.toObject() : { ...r };
  return {
    ...o,
    precioCompra: o.precioCompra ?? o.precio,
    totalInvertido: o.totalInvertido ?? o.pago,
  };
};

const formatMoney = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(2) : '0.00';
};

const formatFecha = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isFinite(dt.getTime())
    ? dt.toLocaleDateString('es-PE')
    : '—';
};

const drawBusinessHeader = (doc, biz, left, width) => {
  let y = 36;
  doc.font('Helvetica-Bold').fontSize(14).text(biz.nombre, left, y);
  y = doc.y + 2;
  doc.font('Helvetica').fontSize(9);
  if (biz.direccion) {
    doc.text(biz.direccion, left, y);
    y = doc.y + 2;
  }
  if (biz.ruc) {
    doc.text(`R.U.C. ${biz.ruc}`, left, y);
    y = doc.y + 2;
  }
  const contact = [biz.telefono && `Tel: ${biz.telefono}`, biz.email]
    .filter(Boolean)
    .join(' · ');
  if (contact) {
    doc.text(contact, left, y);
    y = doc.y + 2;
  }
  return y + 4;
};

const generateNotaIngresoIndividualPDFBuffer = (registro) =>
  new Promise((resolve, reject) => {
    const biz = getBusinessConfig();
    const inv = normalizarRegistro(registro);
    const doc = new PDFDocument({
      size: 'A4',
      margin: 48,
      info: { Title: 'NOTA DE INGRESO', Author: biz.nombre },
    });
    const chunks = [];
    doc.on('data', (b) => chunks.push(b));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = 48;
    const width = 499;
    let y = drawBusinessHeader(doc, biz, left, width);

    doc.font('Helvetica-Bold').fontSize(18).text('NOTA DE INGRESO', left, y, {
      width,
      align: 'center',
    });
    y = doc.y + 16;

    const line = (label, value) => {
      doc.font('Helvetica-Bold').fontSize(10).text(`${label}:`, left, y, { continued: true });
      doc.font('Helvetica').text(` ${value ?? '—'}`);
      y = doc.y + 8;
    };

    line('Fecha de ingreso', formatFecha(inv.fecha));
    line('Proveedor', inv.proveedor);
    line('N.º de puesto', inv.numeroPuesto);
    line('Producto', inv.producto);
    line('Tipo', inv.tipo);
    line('Tamaño', inv.tamano);
    line('Detalle', inv.detalle);

    y += 8;
    doc.moveTo(left, y).lineTo(left + width, y).stroke('#1e3932');
    y += 14;

    line('Cantidad (kg)', formatMoney(inv.cantidad));
    line('Precio de compra (S/)', formatMoney(inv.precioCompra));
    doc.font('Helvetica-Bold').fontSize(12).text(
      `Total invertido: S/ ${formatMoney(inv.totalInvertido)}`,
      left,
      y + 4,
    );

    y = doc.y + 24;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#666666')
      .text(`Documento generado el ${new Date().toLocaleString('es-PE')}`, left, y, {
        width,
        align: 'center',
      });

    doc.end();
  });

// GET nota de ingreso PDF de un registro — antes de PUT/DELETE /:id
router.get('/:id/nota-ingreso-pdf', async (req, res) => {
  try {
    const registro = await Inventario.findById(req.params.id).lean();
    if (!registro) {
      return res.status(404).json({ message: 'Registro no encontrado.' });
    }
    const buffer = await generateNotaIngresoIndividualPDFBuffer(registro);
    const fecha = registro.fecha
      ? new Date(registro.fecha).toISOString().slice(0, 10)
      : 'sin-fecha';
    const fname = `nota-de-ingreso-${fecha}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fname}"`);
    res.send(buffer);
  } catch (err) {
    console.error('[inventario] nota-ingreso-pdf', err);
    res.status(500).json({ message: 'Error al generar la Nota de ingreso PDF.' });
  }
});

// OBTENER todo el inventario → GET /api/inventario
router.get('/', async (req, res) => {
  try {
    const registros = await Inventario.find().sort({ fecha: -1 }).lean();
    res.json(registros.map(normalizarRegistro));
  } catch (err) {
    res.status(500).send('Error al obtener el Inventario');
  }
});

// AGREGAR nuevo registro de inventario → POST /api/inventario
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const precioCompra = Number(body.precioCompra ?? body.precio);
    const totalInvertido = Number(body.totalInvertido ?? body.pago);

    const doc = {
      proveedor: body.proveedor,
      producto: body.producto,
      cantidad: Number(body.cantidad),
      precioCompra,
      totalInvertido,
      numeroPuesto: body.numeroPuesto,
      tipo: body.tipo,
      tamano: body.tamano,
      detalle: body.detalle,
    };
    if (body.fecha) doc.fecha = new Date(body.fecha);

    if ([doc.cantidad, doc.precioCompra, doc.totalInvertido].some((n) => Number.isNaN(n))) {
      return res.status(400).json({
        message: 'Cantidad, precio de compra y total invertido deben ser números válidos.',
      });
    }

    const nuevoRegistro = new Inventario(doc);
    await nuevoRegistro.save();
    res.status(201).json(normalizarRegistro(nuevoRegistro));
  } catch (err) {
    if (err.name === 'ValidationError') {
      const first = Object.values(err.errors || {})[0];
      return res.status(400).json({ message: first?.message || err.message });
    }
    console.error(err);
    res.status(500).json({ message: 'Error al guardar el registro' });
  }
});

// EDITAR registro de inventario → PUT /api/inventario/:id
router.put('/:id', async (req, res) => {
  try {
    const body = req.body || {};
    const precioCompra = Number(body.precioCompra ?? body.precio);
    const totalInvertido = Number(body.totalInvertido ?? body.pago);

    const doc = {
      proveedor: body.proveedor,
      producto: body.producto,
      cantidad: Number(body.cantidad),
      precioCompra,
      totalInvertido,
      numeroPuesto: body.numeroPuesto,
      tipo: body.tipo,
      tamano: body.tamano,
      detalle: body.detalle,
    };
    if (body.fecha) doc.fecha = new Date(body.fecha);

    if ([doc.cantidad, doc.precioCompra, doc.totalInvertido].some((n) => Number.isNaN(n))) {
      return res.status(400).json({
        message: 'Cantidad, precio de compra y total invertido deben ser números válidos.',
      });
    }

    const actualizado = await Inventario.findByIdAndUpdate(req.params.id, doc, {
      new: true,
      runValidators: true,
    });
    if (!actualizado) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json(normalizarRegistro(actualizado));
  } catch (err) {
    if (err.name === 'ValidationError') {
      const first = Object.values(err.errors || {})[0];
      return res.status(400).json({ message: first?.message || err.message });
    }
    console.error(err);
    res.status(500).json({ message: err.message || 'Error al actualizar el registro' });
  }
});

// ELIMINAR registro de inventario → DELETE /api/inventario/:id
router.delete('/:id', async (req, res) => {
  try {
    const eliminado = await Inventario.findByIdAndDelete(req.params.id);
    if (!eliminado) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json({ message: 'Registro eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar el registro' });
  }
});

module.exports = router;
