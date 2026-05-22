/**
 * Registro único de empleado administrador (ejecutar una vez).
 * Uso: node scripts/seedVictoriaTorres.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Empleado = require('../models/Empleado');

const SALT_ROUNDS = 10;

const DATA = {
  nombres: 'Victoria',
  apellidos: 'Torres',
  correo: 'vct15ed@gmail.com',
  password: '123456',
  telefono: '906608620',
  // Debe coincidir con models/Empleado.js (ROLES_EMPLEADO)
  rol: 'Administrador de sistemas',
  estado: 'ACTIVO',
};

async function main() {
  const mongoURI = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME || 'test';
  if (!mongoURI) {
    console.error('Falta MONGO_URI en .env');
    process.exit(1);
  }

  await mongoose.connect(mongoURI, { dbName });
  console.log(`Conectado a MongoDB (${dbName})`);

  const correo = DATA.correo.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(DATA.password, SALT_ROUNDS);

  const existing = await Empleado.findOne({ correo });
  if (existing) {
    existing.nombres = DATA.nombres;
    existing.apellidos = DATA.apellidos;
    existing.telefono = DATA.telefono;
    existing.rol = DATA.rol;
    existing.estado = DATA.estado;
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log('Empleado actualizado:', correo);
  } else {
    const { password: _p, ...rest } = DATA;
    await Empleado.create({
      ...rest,
      correo,
      passwordHash,
    });
    console.log('Empleado creado:', correo);
  }

  await mongoose.disconnect();
  console.log('Listo. Entra en /login-trabajador con ese correo y contraseña.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
