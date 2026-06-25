const express = require('express');
const EstacionMetropolitano = require('../models/EstacionMetropolitano');
const ESTACIONES_SEED = require('../data/estacionesMetropolitanoSeed');

const router = express.Router();

const DIRECCION_TIENDA_DEFAULT =
  process.env.BUSINESS_ADDRESS || 'AV. CAQUETA 800 INT. 15 TREBOL DE CAQUETA';

let seedPromise = null;

const asegurarEstacionesSemilla = async () => {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const codigosOficiales = ESTACIONES_SEED.map((e) => e.codigo);

    for (const e of ESTACIONES_SEED) {
      await EstacionMetropolitano.findOneAndUpdate(
        { codigo: e.codigo },
        {
          $set: {
            nombre: e.nombre,
            linea: e.linea,
            referencia: e.referencia || '',
            activa: true,
            orden: e.orden ?? 0,
          },
        },  
        { upsert: true, new: true }
      );
    }

    await EstacionMetropolitano.updateMany(
      { codigo: { $nin: codigosOficiales } },
      { $set: { activa: false } }
    );

    console.log(`[entrega] Catálogo Metropolitano sincronizado (${ESTACIONES_SEED.length} puntos activos)`);
  })().catch((err) => {
    seedPromise = null;
    throw err;
  });
  return seedPromise;
};

/** GET /api/entrega/config — tienda + estaciones activas para checkout web */
router.get('/config', async (_req, res) => {
  try {
    await asegurarEstacionesSemilla();
    const estaciones = await EstacionMetropolitano.find({ activa: true })
      .sort({ orden: 1, nombre: 1 })
      .lean();
    res.json({
      tienda: {
        nombre: process.env.BUSINESS_NAME || 'FRUTERIA SEÑOR DE MURUHUAY',
        direccion: DIRECCION_TIENDA_DEFAULT,
        horario: process.env.BUSINESS_HORARIO || 'Consultar horario en tienda',
      },
      estacionesMetropolitano: estaciones.map((e) => ({
        _id: String(e._id),
        codigo: e.codigo,
        nombre: e.nombre,
        linea: e.linea,
        referencia: e.referencia || '',
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al cargar opciones de entrega' });
  }
});

/** GET /api/entrega/estaciones-metropolitano — solo activas (compatibilidad) */
router.get('/estaciones-metropolitano', async (_req, res) => {
  try {
    await asegurarEstacionesSemilla();
    const estaciones = await EstacionMetropolitano.find({ activa: true })
      .sort({ orden: 1, nombre: 1 })
      .lean();
    res.json(estaciones);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al listar estaciones' });
  }
});

module.exports = router;
