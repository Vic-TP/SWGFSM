// backend/routes/empleadoRoutes.js

const express = require('express');
const bcrypt = require('bcrypt');
const Empleado = require('../models/Empleado');

const router = express.Router();
const SALT_ROUNDS = 10;
const MIN_PASSWORD = 6;

const rolesPermitidos = () => Empleado.ROLES_EMPLEADO || [];

const toPublicEmpleado = (doc) => {
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
    const empleado = await Empleado.findOne({ correo }).select('+passwordHash');
    if (!empleado || !empleado.passwordHash) {
      return res
        .status(401)
        .json({ message: 'Correo o contraseña incorrectos.' });
    }
    if (String(empleado.estado || '').toUpperCase() !== 'ACTIVO') {
      return res.status(403).json({ message: 'Tu cuenta no está activa.' });
    }
    const ok = await bcrypt.compare(password, empleado.passwordHash);
    if (!ok) {
      return res
        .status(401)
        .json({ message: 'Correo o contraseña incorrectos.' });
    }
    res.json({ empleado: toPublicEmpleado(empleado) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
});

router.get('/', async (req, res) => {
  try {
    const list = await Empleado.find().sort({ fechaRegistro: -1 }).lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al listar empleados' });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const correo = String(b.correo || '')
      .trim()
      .toLowerCase();
    const password = String(b.password || '');
    if (!correo) {
      return res.status(400).json({ message: 'El correo es obligatorio.' });
    }
    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({
        message: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
      });
    }
    const existe = await Empleado.findOne({ correo });
    if (existe) {
      return res.status(409).json({ message: 'Ya existe un empleado con ese correo.' });
    }
    const roles = rolesPermitidos();
    const rolRaw = String(b.rol || 'Vendedor').trim();
    if (!roles.includes(rolRaw)) {
      return res.status(400).json({
        message: `Rol no válido. Use uno de: ${roles.join(', ')}.`
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const nuevo = await Empleado.create({
      nombres: String(b.nombres || '').trim(),
      apellidos: String(b.apellidos || '').trim(),
      correo,
      telefono: String(b.telefono || '').trim(),
      rol: rolRaw,
      estado: b.estado || 'ACTIVO',
      passwordHash
    });
    res.status(201).json(toPublicEmpleado(nuevo));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear empleado' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const empleado = await Empleado.findById(id).select('+passwordHash');
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado.' });
    }

    const roles = rolesPermitidos();
    const rolRaw = b.rol != null ? String(b.rol).trim() : empleado.rol;
    if (!roles.includes(rolRaw)) {
      return res.status(400).json({
        message: `Rol no válido. Use uno de: ${roles.join(', ')}.`
      });
    }

    const correo = String(b.correo != null ? b.correo : empleado.correo)
      .trim()
      .toLowerCase();
    if (correo !== empleado.correo) {
      const otro = await Empleado.findOne({ correo, _id: { $ne: id } });
      if (otro) {
        return res.status(409).json({ message: 'Ya existe otro empleado con ese correo.' });
      }
    }

    empleado.nombres = String(b.nombres != null ? b.nombres : empleado.nombres).trim();
    empleado.apellidos = String(
      b.apellidos != null ? b.apellidos : empleado.apellidos
    ).trim();
    empleado.correo = correo;
    empleado.telefono = String(
      b.telefono != null ? b.telefono : empleado.telefono
    ).trim();
    empleado.rol = rolRaw;
    if (b.estado != null) empleado.estado = b.estado;

    const password = b.password != null ? String(b.password) : '';
    if (password.length > 0) {
      if (password.length < MIN_PASSWORD) {
        return res.status(400).json({
          message: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
        });
      }
      empleado.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    }

    await empleado.save();
    res.json(toPublicEmpleado(empleado));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar empleado' });
  }
});

module.exports = router;
