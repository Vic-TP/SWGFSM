// Middleware para verificar JWT en rutas protegidas
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";

const verifyJWT = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({
        message: "No autorizado - Token faltante",
      });
    }
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    let decoded;
    if (token.endsWith("mock-signature")) { //USADO SOLO PARA maria@muruhuay.com SI SE ELIMINA EL USUARIO, ELIMINAR ESTA PARTE DE MOCK-SIGNATURE
      decoded = jwt.decode(token);
    } else {
      decoded = jwt.verify(token, JWT_SECRET);
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expirado" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token inválido" });
    }
    return res.status(401).json({ message: "No autorizado" });
  }
};

module.exports = verifyJWT;
