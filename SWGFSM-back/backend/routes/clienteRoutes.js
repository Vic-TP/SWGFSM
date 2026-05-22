// backend/routes/clienteRoutes.js

const express = require('express');
const bcrypt = require('bcrypt');
const Cliente = require('../models/Cliente');

const router = express.Router();
const SALT_ROUNDS = 10;
const MIN_PASSWORD = 6;

const splitNombreCompleto = (full) => {
  const t = String(full || '').trim();
  if (!t) return { nombres: '', apellidos: '' };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { nombres: parts[0], apellidos: '' };
  return { nombres: parts[0], apellidos: parts.slice(1).join(' ') };
};

const toPublicCliente = (doc) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  delete o.passwordHash;
  return o;
};

router.post('/login', async (req, res) => {
  try {
    const correo = String((req.body || {}).correo || '')
      .trim()
      .toLowerCase();
    const password = String((req.body || {}).password || '');
    if (!correo || !password) {
      return res
        .status(400)
        .json({ message: 'Correo y contraseña son obligatorios.' });
    }
    const cliente = await Cliente.findOne({ correo }).select('+passwordHash');
    if (!cliente || !cliente.passwordHash) {
      return res
        .status(401)
        .json({ message: 'Correo o contraseña incorrectos.' });
    }
    if (String(cliente.estado || '').toUpperCase() !== 'ACTIVO') {
      return res.status(403).json({ message: 'Tu cuenta no está activa.' });
    }
    const ok = await bcrypt.compare(password, cliente.passwordHash);
    if (!ok) {
      return res
        .status(401)
        .json({ message: 'Correo o contraseña incorrectos.' });
    }
    res.json({ cliente: toPublicCliente(cliente) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
});

router.get('/', async (req, res) => {
  try {
    const list = await Cliente.find().sort({ fechaRegistro: -1 }).lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al listar clientes' });
  }
});

/**
 * Registro/actualización desde caja registradora tras una venta.
 * Actualiza si coincide correo o teléfono; si no, crea un cliente nuevo.
 */
router.post('/registro-caja', async (req, res) => {
  try {
    const { nombreCompleto, telefono, correo, documento } = req.body || {};
    const { nombres, apellidos } = splitNombreCompleto(nombreCompleto);
    if (!nombres) {
      return res.status(400).json({ message: 'El nombre del cliente es obligatorio.' });
    }

    const correoNorm = String(correo || '')
      .trim()
      .toLowerCase();
    const telNorm = String(telefono || '').trim();
    const docNorm = String(documento || '').trim();

    let doc = null;
    if (correoNorm) {
      doc = await Cliente.findOne({ correo: correoNorm });
    }
    if (!doc && telNorm) {
      doc = await Cliente.findOne({ telefono: telNorm });
    }

    if (doc) {
      doc.nombres = nombres;
      doc.apellidos = apellidos;
      if (docNorm) doc.documento = docNorm;
      if (correoNorm) doc.correo = correoNorm;
      if (telNorm) doc.telefono = telNorm;
      doc.ultimaCompra = new Date();
      await doc.save();
      return res.json(toPublicCliente(doc));
    }

    const nuevo = await Cliente.create({
      nombres,
      apellidos,
      telefono: telNorm,
      correo: correoNorm,
      documento: docNorm,
      tipoCliente: 'MINORISTA',
      estado: 'ACTIVO',
      ultimaCompra: new Date()
    });
    res.status(201).json(toPublicCliente(nuevo));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al registrar cliente' });
  }
});

/**
 * Alta de cliente. Si envía `password`, es registro web (contraseña obligatoria, correo único).
 * Sin contraseña: alta administrativa / legado (como antes).
 */
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const password = String(b.password || '');
    const correo = String(b.correo || '')
      .trim()
      .toLowerCase();

    const base = {
      nombres: String(b.nombres || '').trim(),
      apellidos: String(b.apellidos || '').trim(),
      tipoCliente: String(b.tipoCliente || 'MINORISTA').trim(),
      telefono: String(b.telefono || '').trim(),
      correo,
      direccion: String(b.direccion || '').trim(),
      documento: String(b.documento || '').trim(),
      estado: b.estado || 'ACTIVO'
    };

    if (password) {
      if (password.length < MIN_PASSWORD) {
        return res.status(400).json({
          message: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
        });
      }
      if (!correo) {
        return res.status(400).json({ message: 'El correo es obligatorio para registrarse.' });
      }
      const existe = await Cliente.findOne({ correo });
      if (existe) {
        return res.status(409).json({
          message: 'Ya existe un cliente con ese correo. Inicia sesión.'
        });
      }
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const nuevo = await Cliente.create({
        ...base,
        passwordHash
      });
      return res.status(201).json(toPublicCliente(nuevo));
    }

    const nuevo = await Cliente.create(base);
    res.status(201).json(toPublicCliente(nuevo));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear cliente' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const cliente = await Cliente.findById(id).select('+passwordHash');
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }

    if (b.nombres != null) cliente.nombres = String(b.nombres).trim();
    if (b.apellidos != null) cliente.apellidos = String(b.apellidos).trim();
    if (b.telefono != null) cliente.telefono = String(b.telefono).trim();
    if (b.documento != null) cliente.documento = String(b.documento).trim();
    if (b.direccion != null) cliente.direccion = String(b.direccion).trim();
    if (b.tipoCliente != null) cliente.tipoCliente = String(b.tipoCliente).trim();
    if (b.estado != null) cliente.estado = b.estado;

    if (b.correo != null) {
      const nuevoCorreo = String(b.correo).trim().toLowerCase();
      if (nuevoCorreo !== cliente.correo) {
        const otro = await Cliente.findOne({
          correo: nuevoCorreo,
          _id: { $ne: id }
        });
        if (otro) {
          return res.status(409).json({ message: 'Ese correo ya está en uso.' });
        }
        cliente.correo = nuevoCorreo;
      }
    }

    const newPass = b.newPassword != null ? String(b.newPassword) : '';
    if (newPass.length > 0) {
      if (newPass.length < MIN_PASSWORD) {
        return res.status(400).json({
          message: `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
        });
      }
      const actual = String(b.currentPassword || '');
      if (cliente.passwordHash) {
        const okActual = await bcrypt.compare(actual, cliente.passwordHash);
        if (!okActual) {
          return res
            .status(401)
            .json({ message: 'La contraseña actual no es correcta.' });
        }
      }
      cliente.passwordHash = await bcrypt.hash(newPass, SALT_ROUNDS);
    }

    await cliente.save();
    res.json(toPublicCliente(cliente));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar cliente' });
  }
});

module.exports = router;
