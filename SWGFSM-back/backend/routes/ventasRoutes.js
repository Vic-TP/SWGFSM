// backend/routes/ventasRoutes.js - VERSIÓN CORREGIDA
//
// Al confirmar una venta (caja u online) solo se actualiza stock en la colección `producto`.
// La colección `Inventario` (registros de compras a proveedor) no se modifica aquí.

const express = require('express');
const PDFDocument = require('pdfkit');
const Venta = require('../models/Venta');
const Producto = require('../models/Producto');
const nodemailer = require('nodemailer');

const router = express.Router();

/** Stock vendible (kg): suma madura/verde/sazón; si todo es 0, legacy `stockSemanal` */
const stockDisponibleProducto = (p) => {
  if (!p) return 0;
  const sum =
    Number(p.stockPaltaMadura || 0) +
    Number(p.stockPaltaVerde || 0) +
    Number(p.stockPaltaSazon || 0);
  if (Number.isFinite(sum) && sum > 0) return Math.max(0, Math.floor(sum));
  const leg = Number(p.stockSemanal);
  if (Number.isFinite(leg) && leg > 0) return Math.floor(leg);
  return 0;
};

/**
 * Descuenta stock en el documento Producto (madura → verde → sazón; si no hay, legacy stockSemanal).
 * No usa ni altera el modelo Inventario.
 * Devuelve objeto para rollback o null si falla.
 */
/** Estados en los que el inventario (producto) debe reflejar un descuento de stock */
const ESTADOS_CON_DESCUENTO_STOCK = ['Pendiente', 'Enviado', 'Entregado'];

const estadoDescuentaInventario = (estado) =>
  ESTADOS_CON_DESCUENTO_STOCK.includes(String(estado || ''));

/**
 * Revierte un movimiento devuelto por aplicarDescuentoStockProducto
 */
const revertirDescuentoStockProducto = async (mov) => {
  if (!mov || !mov.productoId) return;
  const id = String(mov.productoId);
  if (mov.tipo === 'palta') {
    await Producto.updateOne(
      { _id: id },
      {
        $inc: {
          stockPaltaMadura: Number(mov.dm) || 0,
          stockPaltaVerde: Number(mov.dv) || 0,
          stockPaltaSazon: Number(mov.ds) || 0
        }
      }
    );
  } else if (mov.tipo === 'semanal') {
    await Producto.updateOne(
      { _id: id },
      { $inc: { stockSemanal: Number(mov.cantidad) || 0 } }
    );
  }
};

/** Ventas antiguas sin stockMovimientos: devuelve kg (palta → madura; solo semanal → semanal) */
const revertirPorLineasProductosLegacy = async (venta) => {
  const lineas = Array.isArray(venta.productos) ? venta.productos : [];
  for (const item of lineas) {
    if (!item.productoId) continue;
    const cant = Math.floor(Number(item.cantidad));
    if (!Number.isFinite(cant) || cant < 1) continue;
    const id = String(item.productoId);
    const p = await Producto.findById(id).lean();
    if (!p) continue;
    const m0 = Math.max(0, Number(p.stockPaltaMadura) || 0);
    const v0 = Math.max(0, Number(p.stockPaltaVerde) || 0);
    const s0 = Math.max(0, Number(p.stockPaltaSazon) || 0);
    const paltaSum = m0 + v0 + s0;
    if (paltaSum > 0) {
      await Producto.updateOne({ _id: id }, { $inc: { stockPaltaMadura: cant } });
    } else {
      await Producto.updateOne({ _id: id }, { $inc: { stockSemanal: cant } });
    }
  }
};

/**
 * ¿Hay que devolver stock al cancelar o al borrar?
 * Importante: no usar solo stockDescontado===false (en BD a veces queda false aunque sí se descontó en producto).
 */
const debeRevertirStock = (venta) => {
  if (venta.stockDescontado === true) return true;
  const movs = venta.stockMovimientos;
  if (Array.isArray(movs) && movs.length > 0) return true;
  if (venta.stockDescontado !== true && estadoDescuentaInventario(venta.estado)) {
    return true;
  }
  return false;
};

const aplicarDescuentoStockProducto = async (productoId, cantidad) => {
  const id = String(productoId);
  const needTotal = Math.floor(Number(cantidad));
  if (!Number.isFinite(needTotal) || needTotal < 1) return null;

  const p = await Producto.findById(id).lean();
  if (!p) return null;

  const m0 = Math.max(0, Number(p.stockPaltaMadura) || 0);
  const v0 = Math.max(0, Number(p.stockPaltaVerde) || 0);
  const s0 = Math.max(0, Number(p.stockPaltaSazon) || 0);
  const paltaSum = m0 + v0 + s0;

  if (paltaSum > 0) {
    let need = needTotal;
    const dm = Math.min(need, m0);
    need -= dm;
    const dv = Math.min(need, v0);
    need -= dv;
    const ds = Math.min(need, s0);
    need -= ds;
    if (need > 0) return null;
    await Producto.updateOne(
      { _id: id },
      {
        $inc: {
          stockPaltaMadura: -dm,
          stockPaltaVerde: -dv,
          stockPaltaSazon: -ds
        }
      }
    );
    return { tipo: 'palta', productoId: id, dm, dv, ds };
  }

  const leg = Math.max(0, Number(p.stockSemanal) || 0);
  if (leg < needTotal) return null;
  await Producto.updateOne({ _id: id }, { $inc: { stockSemanal: -needTotal } });
  return { tipo: 'semanal', productoId: id, cantidad: needTotal };
};

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatMoney = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(2) : '0.00';
};

const numOr = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Texto para comprobantes */
const textoOrigenVenta = (venta) => {
  if (venta?.origen === 'CAJA') return 'Caja registradora (trabajador)';
  if (venta?.origen === 'ONLINE') return 'Pedido web (cliente en tienda)';
  return 'No indicado';
};

const getBusinessConfig = () => ({
  logoUrl: process.env.BUSINESS_LOGO_URL || '',
  nombre: process.env.BUSINESS_NAME || 'COMERCIALIZADORA DE FRUTAS SEÑOR DE MURUHUAY',
  ruc: process.env.BUSINESS_RUC || '12345678901',
  direccion: process.env.BUSINESS_ADDRESS || 'Av. Mercado Caqueta N° 800, RIMAC',
  telefono: process.env.BUSINESS_PHONE || '966 142 980',
  email: process.env.BUSINESS_EMAIL || 'comercializadoradepaltas@gmail.com',
  web: process.env.BUSINESS_WEBSITE || '',
  taxRate: Math.max(0, numOr(process.env.TAX_RATE, 0.18))
});

const generateComprobanteHTML = (venta) => {
  const biz = getBusinessConfig();
  const productos = Array.isArray(venta?.productos) ? venta.productos : [];
  const comprobante = String(venta?.comprobante || 'BOLETA').toUpperCase();
  const numero = String(venta?.numeroVenta || '').toUpperCase();

  const total = numOr(venta?.total, 0);
  const subtotal = numOr(venta?.subtotal, total);
  // No mostramos IGV en la boleta (por requerimiento).

  const rows = productos
    .map((p) => {
      const nombre = escapeHtml(p?.nombre);
      const cant = Number(p?.cantidad);
      const unidad = escapeHtml(p?.medida || '');
      const precio = Number(p?.precioUnitario);
      const sub = Number(p?.subtotal);
      return `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${nombre}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${Number.isFinite(cant) ? cant : ''}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${unidad || '—'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMoney(precio)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;">${formatMoney(sub)}</td>
        </tr>
      `;
    })
    .join('');

  const fecha = venta?.fecha ? new Date(venta.fecha) : new Date();
  const fechaStr = Number.isFinite(fecha.getTime()) ? fecha.toLocaleDateString() : '';
  const horaStr = Number.isFinite(fecha.getTime()) ? fecha.toLocaleTimeString() : '';

  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(comprobante)} ${escapeHtml(numero)}</title>
    </head>
    <body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <div style="max-width:860px;margin:16px auto;padding:0 16px;">
        <div style="border:2px solid #111827;padding:14px 14px 10px 14px;">
          <div style="display:flex;align-items:stretch;gap:12px;">
            <div style="width:120px;display:flex;align-items:center;justify-content:center;border:1px solid #111827;">
              ${biz.logoUrl ? `<img alt="logo" src="${escapeHtml(biz.logoUrl)}" style="max-width:110px;max-height:70px;object-fit:contain;" />` : `<div style="font-weight:800;font-size:12px;text-align:center;padding:8px;">LOGO</div>`}
            </div>
            <div style="flex:1;border:1px solid #111827;padding:8px 10px;">
              <div style="font-size:22px;font-weight:800;letter-spacing:.3px;">${escapeHtml(biz.nombre)}</div>
              ${biz.direccion ? `<div style="margin-top:4px;font-size:12px;">${escapeHtml(biz.direccion)}</div>` : ''}
              <div style="margin-top:2px;font-size:12px;">
                ${biz.telefono ? `Tel: ${escapeHtml(biz.telefono)}` : ''}
                ${biz.email ? `${biz.telefono ? ' · ' : ''}Email: ${escapeHtml(biz.email)}` : ''}
                ${biz.web ? `${(biz.telefono || biz.email) ? ' · ' : ''}${escapeHtml(biz.web)}` : ''}
              </div>
            </div>
            <div style="width:250px;border:1px solid #111827;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:8px 10px;">
              ${biz.ruc ? `<div style="font-weight:800;">R.U.C. ${escapeHtml(biz.ruc)}</div>` : ''}
              <div style="margin-top:6px;font-weight:900;font-size:14px;text-transform:uppercase;">${escapeHtml(comprobante)} DE VENTA</div>
              <div style="margin-top:6px;font-weight:900;font-size:14px;">N° ${escapeHtml(numero)}</div>
            </div>
          </div>

          <div style="margin-top:10px;border:1px solid #111827;padding:8px 10px;font-size:12px;">
            <div style="display:flex;gap:16px;flex-wrap:wrap;">
              <div style="flex:1;min-width:240px;">
                <div><strong>Cliente:</strong> ${escapeHtml(venta?.cliente || '')}</div>
                ${venta?.clienteDocumento ? `<div><strong>DNI/RUC:</strong> ${escapeHtml(venta.clienteDocumento)}</div>` : ''}
                ${venta?.clienteEmail ? `<div><strong>Email:</strong> ${escapeHtml(venta.clienteEmail)}</div>` : ''}
                ${venta?.clienteTelefono ? `<div><strong>Tel:</strong> ${escapeHtml(venta.clienteTelefono)}</div>` : ''}
              </div>
              <div style="flex:1;min-width:240px;">
                <div><strong>Fecha emisión:</strong> ${escapeHtml(fechaStr)}</div>
                <div><strong>Hora:</strong> ${escapeHtml(horaStr)}</div>
                <div><strong>Cond. de pago:</strong> ${escapeHtml(venta?.metodoPago || '')}</div>
                <div><strong>Origen:</strong> ${escapeHtml(textoOrigenVenta(venta))}</div>
              </div>
            </div>
          </div>

          <div style="margin-top:10px;border:1px solid #111827;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr>
                  <th style="border-bottom:1px solid #111827;padding:8px 10px;text-align:left;">DESCRIPCIÓN</th>
                  <th style="border-bottom:1px solid #111827;padding:8px 10px;text-align:center;width:70px;">CANT.</th>
                  <th style="border-bottom:1px solid #111827;padding:8px 10px;text-align:center;width:80px;">UNID.</th>
                  <th style="border-bottom:1px solid #111827;padding:8px 10px;text-align:right;width:110px;">P. UNIT.</th>
                  <th style="border-bottom:1px solid #111827;padding:8px 10px;text-align:right;width:120px;">IMPORTE</th>
                </tr>
              </thead>
              <tbody>
                ${rows || `<tr><td colspan="5" style="padding:10px;">(Sin productos)</td></tr>`}
              </tbody>
            </table>
          </div>

          <div style="display:flex;justify-content:flex-end;margin-top:10px;">
            <div style="width:320px;border:1px solid #111827;padding:8px 10px;font-size:12px;">
              <div style="display:flex;justify-content:space-between;"><span>SUBTOTAL (S/)</span><span>${formatMoney(subtotal)}</span></div>
              <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:14px;font-weight:900;">
                <span>IMPORTE TOTAL (S/)</span><span>${formatMoney(total)}</span>
              </div>
            </div>
          </div>

          <div style="margin-top:10px;font-size:11px;">
            <strong>Observaciones:</strong> Gracias por su compra.
          </div>
        </div>
      </div>
    </body>
  </html>`;
};

/** Boleta en PDF (para imprimir / ver como archivo PDF en el navegador) */
const generateComprobantePDFBuffer = (venta) =>
  new Promise((resolve, reject) => {
    const biz = getBusinessConfig();
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `Boleta ${venta?.numeroVenta || ''}`,
        Author: biz.nombre
      }
    });
    const chunks = [];
    doc.on('data', (b) => chunks.push(b));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const productos = Array.isArray(venta?.productos) ? venta.productos : [];
    const total = numOr(venta?.total, 0);
    const subtotal = numOr(venta?.subtotal, total);
    const comprobante = String(venta?.comprobante || 'BOLETA').toUpperCase();
    const numero = String(venta?.numeroVenta || '');
    const fecha = venta?.fecha ? new Date(venta.fecha) : new Date();
    const fechaStr = Number.isFinite(fecha.getTime()) ? fecha.toLocaleDateString('es-PE') : '';
    const horaStr = Number.isFinite(fecha.getTime()) ? fecha.toLocaleTimeString('es-PE') : '';

    const left = 40;
    const width = 515;
    const headerTop = 40;
    let y = headerTop;

    doc.font('Helvetica-Bold').fontSize(13).text(biz.nombre, left, y, { width: width - 185 });
    y = doc.y + 4;
    doc.font('Helvetica').fontSize(9);
    if (biz.direccion) {
      doc.text(biz.direccion, left, y, { width: width - 185 });
      y = doc.y + 2;
    }
    const contactLine = [biz.telefono && `Tel: ${biz.telefono}`, biz.email && `Email: ${biz.email}`, biz.web]
      .filter(Boolean)
      .join(' · ');
    if (contactLine) {
      doc.text(contactLine, left, y, { width: width - 185 });
      y = doc.y + 4;
    }

    const boxR = left + width - 180;
    doc.rect(boxR, headerTop, 178, 72).stroke();
    doc.font('Helvetica-Bold').fontSize(9);
    if (biz.ruc) doc.text(`R.U.C. ${biz.ruc}`, boxR + 6, headerTop + 8, { width: 166, align: 'center' });
    doc.fontSize(10).text(`${comprobante} DE VENTA`, boxR + 6, headerTop + 30, { width: 166, align: 'center' });
    doc.fontSize(11).text(`N° ${numero}`, boxR + 6, headerTop + 50, { width: 166, align: 'center' });

    y = Math.max(y, headerTop + 82);
    doc.rect(left, y, width, 70).stroke();
    let iy = y + 8;
    doc.font('Helvetica').fontSize(9);
    doc.text(`Cliente: ${venta?.cliente || '—'}`, left + 8, iy);
    iy += 12;
    if (venta?.clienteDocumento) {
      doc.text(`DNI/RUC: ${venta.clienteDocumento}`, left + 8, iy);
      iy += 12;
    }
    if (venta?.clienteEmail) {
      doc.text(`Email: ${venta.clienteEmail}`, left + 8, iy);
      iy += 12;
    }
    if (venta?.clienteTelefono) {
      doc.text(`Tel: ${venta.clienteTelefono}`, left + 8, iy);
      iy += 12;
    }
    const col2 = left + 300;
    iy = y + 8;
    doc.text(`Fecha emisión: ${fechaStr}`, col2, iy);
    iy += 12;
    doc.text(`Hora: ${horaStr}`, col2, iy);
    iy += 12;
    doc.text(`Cond. de pago: ${venta?.metodoPago || '—'}`, col2, iy);
    iy += 12;
    doc.text(`Origen: ${textoOrigenVenta(venta)}`, col2, iy);

    y += 74;
    doc.rect(left, y, width, 16).stroke();
    doc.font('Helvetica-Bold').fontSize(8);
    const c1 = left + 6;
    const c2 = left + 248;
    const c3 = left + 298;
    const c4 = left + 348;
    const c5 = left + 418;
    doc.text('DESCRIPCIÓN', c1, y + 4, { width: 230 });
    doc.text('CANT.', c2, y + 4, { width: 36, align: 'center' });
    doc.text('UNID.', c3, y + 4, { width: 36, align: 'center' });
    doc.text('P. UNIT.', c4, y + 4, { width: 62, align: 'right' });
    doc.text('IMPORTE', c5, y + 4, { width: 72, align: 'right' });
    y += 16;

    doc.font('Helvetica').fontSize(8);
    if (productos.length === 0) {
      doc.rect(left, y, width, 18).stroke();
      doc.text('(Sin productos)', c1, y + 4);
      y += 18;
    } else {
      productos.forEach((p) => {
        const nombre = String(p?.nombre || '');
        const hName = doc.heightOfString(nombre, { width: 228 });
        const rowH = Math.max(18, hName + 8);
        doc.rect(left, y, width, rowH).stroke();
        doc.text(nombre, c1, y + 4, { width: 228 });
        doc.text(String(p?.cantidad ?? ''), c2, y + 4, { width: 36, align: 'center' });
        doc.text(String(p?.medida || '—'), c3, y + 4, { width: 36, align: 'center' });
        doc.text(formatMoney(p?.precioUnitario), c4, y + 4, { width: 62, align: 'right' });
        doc.text(formatMoney(p?.subtotal), c5, y + 4, { width: 72, align: 'right' });
        y += rowH;
      });
    }

    y += 10;
    const totW = 185;
    const totX = left + width - totW;
    doc.rect(totX, y, totW, 40).stroke();
    doc.font('Helvetica').fontSize(9);
    doc.text('SUBTOTAL (S/)', totX + 8, y + 6);
    doc.text(formatMoney(subtotal), totX + totW - 78, y + 6, { width: 70, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('IMPORTE TOTAL (S/)', totX + 8, y + 22);
    doc.text(formatMoney(total), totX + totW - 78, y + 22, { width: 70, align: 'right' });

    doc.font('Helvetica').fontSize(8).text('Observaciones: Gracias por su compra.', left, y + 48);

    doc.end();
  });

const buildWhatsappUrl = ({ phone, text }) => {
  const raw = String(phone ?? '').trim();
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return null;

  let to = digits;
  if (to.startsWith('+')) {
    to = to.replace(/[^\d]/g, '');
  } else {
    to = to.replace(/[^\d]/g, '');
    if (to.length === 9) to = `51${to}`; // Perú por defecto si viene solo celular
  }
  if (!to) return null;
  return `https://wa.me/${to}?text=${encodeURIComponent(String(text ?? ''))}`;
};

const createTransporterFromEnv = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
};

// GET todas las ventas (opcional: ?clienteEmail=... &origen=CAJA|ONLINE|SIN)
router.get('/', async (req, res) => {
  try {
    const { clienteEmail, origen } = req.query;
    const filtro = {};
    if (clienteEmail) filtro.clienteEmail = clienteEmail;
    if (origen === 'CAJA') {
      filtro.origen = 'CAJA';
    } else if (origen === 'ONLINE') {
      filtro.origen = 'ONLINE';
    } else if (origen === 'SIN' || origen === 'sin') {
      filtro.$or = [{ origen: { $exists: false } }, { origen: null }];
    }
    const ventas = await Venta.find(filtro).sort({ fecha: -1 });
    console.log('Ventas encontradas:', ventas.length);
    res.json(ventas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener ventas' });
  }
});
// POST nueva venta
router.post('/', async (req, res) => {
  try {
    console.log('📦 Datos recibidos:', JSON.stringify(req.body, null, 2));
    
    // Asegurar que productos sea un array (el frontend envía "productos")
    let productosArray = req.body.productos || req.body.producto || [];
    
    // Si es un objeto, convertirlo a array
    if (!Array.isArray(productosArray)) {
      productosArray = [productosArray];
    }

    const productosNormalizados = productosArray.map((p) => {
      const cantidad = Number(p.cantidad);
      const precioUnitario = Number(p.precioUnitario);
      const subtotal = Number(
        p.subtotal != null && p.subtotal !== ''
          ? p.subtotal
          : cantidad * precioUnitario
      );
      return {
        ...p,
        productoId: p.productoId != null ? String(p.productoId) : undefined,
        nombre: p.nombre,
        cantidad,
        precioUnitario,
        medida: p.medida || '1kg',
        subtotal
      };
    });

    const estadoInicial = req.body.estado || 'Pendiente';
    const esCanceladoInicial = String(estadoInicial) === 'Cancelado';

    for (const item of productosNormalizados) {
      if (!item.productoId || !Number.isFinite(item.cantidad) || item.cantidad < 1) {
        return res.status(400).json({ message: 'Cada ítem debe tener productoId y cantidad válidos.' });
      }
      const prod = await Producto.findById(item.productoId);
      if (!prod) {
        return res.status(400).json({ message: `Producto no encontrado (${item.productoId}).` });
      }
      if (!esCanceladoInicial) {
        const disp = stockDisponibleProducto(prod.toObject ? prod.toObject() : prod);
        if (disp < item.cantidad) {
          return res.status(400).json({
            message: `Stock insuficiente para "${prod.nombre}". Disponible: ${disp}, solicitado: ${item.cantidad}.`
          });
        }
      }
    }

    const subtotalNum = Number(req.body.subtotal);
    const totalNum = Number(req.body.total);

    const origenRaw = String(req.body.origen || req.body.canal || '').trim().toUpperCase();
    let origenVenta;
    if (origenRaw === 'CAJA') origenVenta = 'CAJA';
    else if (origenRaw === 'ONLINE') origenVenta = 'ONLINE';

    const ventaData = {
      cliente: req.body.cliente,
      clienteEmail: req.body.clienteEmail || '',
      clienteTelefono: req.body.clienteTelefono || '',
      clienteDocumento: req.body.clienteDocumento || '',
      productos: productosNormalizados,
      subtotal: Number.isFinite(subtotalNum) ? subtotalNum : productosNormalizados.reduce((s, x) => s + x.subtotal, 0),
      total: Number.isFinite(totalNum) ? totalNum : productosNormalizados.reduce((s, x) => s + x.subtotal, 0),
      metodoPago: req.body.metodoPago,
      comprobante: req.body.comprobante || 'Boleta',
      estado: estadoInicial,
      stockDescontado: false
    };
    if (origenVenta) ventaData.origen = origenVenta;
    
    console.log('📦 Venta a guardar:', JSON.stringify(ventaData, null, 2));
    
    const nuevaVenta = new Venta(ventaData);
    const guardada = await nuevaVenta.save();

    if (esCanceladoInicial) {
      guardada.stockDescontado = false;
      guardada.stockMovimientos = [];
      await guardada.save();
      console.log('✅ Venta cancelada al crear (sin descuento de stock):', guardada.numeroVenta);
      return res.status(201).json(guardada);
    }

    const aplicados = [];
    try {
      for (const item of productosNormalizados) {
        const r = await aplicarDescuentoStockProducto(item.productoId, item.cantidad);
        if (!r) {
          const actual = await Producto.findById(item.productoId).lean();
          const disp = stockDisponibleProducto(actual);
          throw new Error(
            `STOCK_FAIL|${item.nombre || item.productoId}|${disp}|${item.cantidad}`
          );
        }
        aplicados.push(r);
      }
    } catch (stockErr) {
      for (let i = aplicados.length - 1; i >= 0; i--) {
        const a = aplicados[i];
        if (a.tipo === 'palta') {
          await Producto.findByIdAndUpdate(a.productoId, {
            $inc: {
              stockPaltaMadura: a.dm,
              stockPaltaVerde: a.dv,
              stockPaltaSazon: a.ds
            }
          });
        } else {
          await Producto.findByIdAndUpdate(a.productoId, {
            $inc: { stockSemanal: a.cantidad }
          });
        }
      }
      await Venta.findByIdAndDelete(guardada._id);
      if (stockErr.message && stockErr.message.startsWith('STOCK_FAIL')) {
        const [, nom, disp, sol] = stockErr.message.split('|');
        return res.status(409).json({
          message: `Stock insuficiente para "${nom}". Disponible: ${disp}, solicitado: ${sol}.`
        });
      }
      throw stockErr;
    }

    guardada.stockMovimientos = aplicados;
    guardada.stockDescontado = true;
    await guardada.save();
    
    console.log('✅ Venta guardada exitosamente:', guardada.numeroVenta);
    res.status(201).json(guardada);
  } catch (err) {
    console.error('❌ Error al guardar venta:', err.message);
    console.error('❌ Detalle:', err);
    res.status(500).json({ 
      message: 'Error al crear venta', 
      error: err.message 
    });
  }
});

// PUT actualizar origen (caja vs web) — corrige ventas antiguas mal etiquetadas
router.put('/:id/origen', async (req, res) => {
  try {
    const raw = String(req.body?.origen || '').trim().toUpperCase();
    if (raw !== 'CAJA' && raw !== 'ONLINE') {
      return res.status(400).json({ message: 'origen debe ser CAJA u ONLINE' });
    }
    const venta = await Venta.findByIdAndUpdate(req.params.id, { origen: raw }, { new: true });
    if (!venta) return res.status(404).json({ message: 'Venta no encontrada' });
    res.json(venta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar origen' });
  }
});

// PUT actualizar estado de venta (sincroniza inventario en colección producto)
router.put('/:id/estado', async (req, res) => {
  try {
    const nuevo = String(req.body?.estado || '').trim();
    const validos = ['Pendiente', 'Enviado', 'Entregado', 'Cancelado'];
    if (!validos.includes(nuevo)) {
      return res.status(400).json({ message: 'Estado no válido.' });
    }

    const venta = await Venta.findById(req.params.id);
    if (!venta) return res.status(404).json({ message: 'Venta no encontrada' });

    const anterior = venta.estado;
    if (anterior === nuevo) {
      return res.json(venta);
    }

    const antesDescuenta = estadoDescuentaInventario(anterior);
    const nuevoDescuenta = estadoDescuentaInventario(nuevo);

    // Pasar a Cancelado: devolver stock al inventario (colección producto)
    if (antesDescuenta && !nuevoDescuenta) {
      if (debeRevertirStock(venta)) {
        const movs = Array.isArray(venta.stockMovimientos) ? venta.stockMovimientos : [];
        if (movs.length > 0) {
          for (const m of movs) {
            await revertirDescuentoStockProducto(m);
          }
        } else {
          await revertirPorLineasProductosLegacy(venta);
        }
        venta.stockDescontado = false;
        venta.stockMovimientos = [];
      }
    }

    // Salir de Cancelado hacia Pendiente / Enviado / Entregado: descontar stock
    if (!antesDescuenta && nuevoDescuenta) {
      if (!venta.stockDescontado) {
        const aplicados = [];
        const lineas = Array.isArray(venta.productos) ? venta.productos : [];
        for (const item of lineas) {
          if (!item.productoId) {
            return res.status(400).json({
              message: 'La venta tiene líneas sin productoId; no se puede descontar stock.'
            });
          }
          const r = await aplicarDescuentoStockProducto(item.productoId, item.cantidad);
          if (!r) {
            for (let i = aplicados.length - 1; i >= 0; i--) {
              await revertirDescuentoStockProducto(aplicados[i]);
            }
            const actual = await Producto.findById(item.productoId).lean();
            const disp = stockDisponibleProducto(actual);
            return res.status(409).json({
              message: `Stock insuficiente para "${item.nombre || 'producto'}". Disponible: ${disp}, solicitado: ${item.cantidad}.`
            });
          }
          aplicados.push(r);
        }
        venta.stockMovimientos = aplicados;
        venta.stockDescontado = true;
      }
    }

    venta.estado = nuevo;
    await venta.save();
    res.json(venta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar estado' });
  }
});

// DELETE eliminar venta (devuelve stock si estaba descontado)
router.delete('/:id', async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id);
    if (!venta) return res.status(404).json({ message: 'Venta no encontrada' });

    if (debeRevertirStock(venta)) {
      const movs = Array.isArray(venta.stockMovimientos) ? venta.stockMovimientos : [];
      if (movs.length > 0) {
        for (const m of movs) {
          await revertirDescuentoStockProducto(m);
        }
      } else {
        await revertirPorLineasProductosLegacy(venta);
      }
    }

    await Venta.findByIdAndDelete(req.params.id);
    res.json({ message: 'Venta eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar venta' });
  }
});

// GET obtener comprobante HTML (para imprimir)
router.get('/:id/comprobante', async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id).lean();
    if (!venta) return res.status(404).send('Venta no encontrada.');
    const html = generateComprobanteHTML(venta);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (err) {
    console.error('Error al generar comprobante:', err);
    res.status(500).send('Error al generar el comprobante.');
  }
});

// GET boleta en PDF (visor del navegador / imprimir como PDF)
router.get('/:id/comprobante-pdf', async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id).lean();
    if (!venta) return res.status(404).send('Venta no encontrada.');
    const buf = await generateComprobantePDFBuffer(venta);
    const safeName = String(venta.numeroVenta || 'boleta').replace(/[^\w.-]+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Boleta-${safeName}.pdf"`);
    res.status(200).send(buf);
  } catch (err) {
    console.error('Error al generar PDF:', err);
    res.status(500).send('Error al generar el PDF.');
  }
});

// POST enviar comprobante por Email o WhatsApp
router.post('/:id/enviar-comprobante', async (req, res) => {
  try {
    const { tipo, destino } = req.body || {};
    const tipoNorm = String(tipo || '').toLowerCase();
    const destinoNorm = String(destino || '').trim();

    if (!['email', 'whatsapp', 'print'].includes(tipoNorm)) {
      return res.status(400).json({ message: 'Tipo inválido. Use "email", "whatsapp" o "print".' });
    }
    if (tipoNorm !== 'print' && !destinoNorm) {
      return res.status(400).json({ message: 'Destino requerido.' });
    }

    const venta = await Venta.findById(req.params.id).lean();
    if (!venta) return res.status(404).json({ message: 'Venta no encontrada.' });

    const comprobanteHTML = generateComprobanteHTML(venta);
    const asunto = `${venta.comprobante || 'Comprobante'} ${venta.numeroVenta || ''}`.trim();

    if (tipoNorm === 'print') {
      return res.json({
        message: 'Comprobante listo para imprimir.',
        comprobanteHTML
      });
    }

    if (tipoNorm === 'email') {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinoNorm);
      if (!emailOk) {
        return res.status(400).json({ message: 'Correo inválido.', comprobanteHTML });
      }

      const transporter = createTransporterFromEnv();
      if (!transporter) {
        // No bloquear la impresión si aún no hay SMTP configurado
        return res.json({
          message:
            'Correo no enviado: falta configurar SMTP en el servidor. Se generó la boleta para imprimir.',
          comprobanteHTML,
          sent: false
        });
      }

      const from = process.env.SMTP_FROM || process.env.SMTP_USER;
      await transporter.sendMail({
        from,
        to: destinoNorm,
        subject: asunto,
        html: comprobanteHTML
      });

      await Venta.findByIdAndUpdate(req.params.id, {
        $set: { comprobanteEnviado: true, estado: 'Enviado' }
      });

      return res.json({
        message: `Comprobante enviado al correo: ${destinoNorm}`,
        comprobanteHTML,
        sent: true
      });
    }

    const texto = [
      `🧾 ${venta.comprobante || 'Comprobante'} ${venta.numeroVenta || ''}`.trim(),
      `Cliente: ${venta.cliente || ''}`.trim(),
      `Total: S/ ${formatMoney(venta.total)}`,
      '',
      'Detalle:',
      ...(Array.isArray(venta.productos)
        ? venta.productos.map(
            (p) => `- ${p.nombre} × ${p.cantidad} = S/ ${formatMoney(p.subtotal)}`
          )
        : []),
      '',
      'Gracias por su compra.'
    ].join('\n');

    const whatsappUrl = buildWhatsappUrl({ phone: destinoNorm, text: texto });
    if (!whatsappUrl) {
      return res.status(400).json({ message: 'Número de WhatsApp inválido.', comprobanteHTML });
    }

    await Venta.findByIdAndUpdate(req.params.id, {
      $set: { comprobanteEnviado: true, estado: 'Enviado' }
    });

    return res.json({
      message: 'Listo: se abrirá WhatsApp con el mensaje preparado.',
      comprobanteHTML,
      whatsappUrl,
      sent: true
    });
  } catch (err) {
    console.error('Error al enviar comprobante:', err);
    res.status(500).json({ message: 'Error al enviar el comprobante', error: err.message });
  }
});

module.exports = router;