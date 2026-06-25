require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Venta = require("../models/Venta");
const { generarCodigoEntrega } = require("../utils/entregaHorario");

(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || "test",
  });
  const sin = await Venta.find({
    origen: "ONLINE",
    fechaEntrega: { $exists: true },
    $or: [
      { codigoEntrega: { $exists: false } },
      { codigoEntrega: "" },
      { codigoEntrega: null },
    ],
  });
  for (const v of sin) {
    v.codigoEntrega = generarCodigoEntrega();
    await v.save();
    console.log(`${v.numeroVenta} -> ${v.codigoEntrega}`);
  }
  if (!sin.length) console.log("Todos los pedidos online ya tienen codigo.");
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
