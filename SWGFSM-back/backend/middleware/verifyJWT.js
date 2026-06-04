// Middleware para verificar JWT en rutas protegidas
const jwt = require("jsonwebtoken");

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
