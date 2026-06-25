/** Roles de empleado — backend */

const ROL_REPARTIDOR = 'Repartidor';
const ROL_PERSONAL_DESPACHO = 'Personal de despacho';

const ROLES_SOLO_DESPACHO = [ROL_REPARTIDOR, ROL_PERSONAL_DESPACHO];

const esRepartidor = (req) =>
  ROLES_SOLO_DESPACHO.includes(String(req.user?.rol || '').trim());

/** Repartidor: solo lectura despacho y cambio de estado de entrega */
const authorizeRepartidorVentas = (req, res, next) => {
  if (!esRepartidor(req)) return next();

  const method = req.method.toUpperCase();
  const path = req.path || '';

  if (method === 'GET' && path === '/despacho') {
    return next();
  }

  if (method === 'PUT' && /^\/[^/]+\/estado$/.test(path)) {
    const estado = String(req.body?.estado || '').trim();
    const permitidos = ['Enviado', 'Entregado'];
    if (!permitidos.includes(estado)) {
      return res.status(403).json({
        message: 'Como repartidor solo puedes marcar Enviado o Entregado.',
      });
    }
    return next();
  }

  return res.status(403).json({
    message: 'No tienes permiso para esta acción. Usa el módulo Despacho.',
  });
};

module.exports = {
  esRepartidor,
  authorizeRepartidorVentas,
  ROLES_SOLO_DESPACHO,
};
