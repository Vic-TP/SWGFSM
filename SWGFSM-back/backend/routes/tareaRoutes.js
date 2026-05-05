// backend/routes/tareaRoutes.js

const express = require("express");
const mongoose = require("mongoose");
const Tarea = require("../models/Tarea");
const Empleado = require("../models/Empleado");

const router = express.Router();

const populateEmpleado = { path: "empleadoAsignado", select: "nombres apellidos correo rol" };

router.get("/", async (req, res) => {
  try {
    const list = await Tarea.find().sort({ fechaCreacion: -1 }).populate(populateEmpleado).lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al listar tareas" });
  }
});

router.get("/empleado/:empleadoId", async (req, res) => {
  try {
    const { empleadoId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(empleadoId)) {
      return res.status(400).json({ message: "ID de empleado inválido." });
    }
    const existe = await Empleado.findById(empleadoId).lean();
    if (!existe) {
      return res.status(404).json({ message: "Empleado no encontrado." });
    }
    const list = await Tarea.find({ empleadoAsignado: empleadoId })
      .sort({ estado: -1, fechaCreacion: -1 })
      .lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al listar tareas del empleado" });
  }
});

router.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    const titulo = String(b.titulo || "").trim();
    const descripcion = String(b.descripcion || "").trim();
    const empleadoAsignado = b.empleadoAsignado;

    if (!titulo) {
      return res.status(400).json({ message: "El título es obligatorio." });
    }
    if (!empleadoAsignado || !mongoose.Types.ObjectId.isValid(String(empleadoAsignado))) {
      return res.status(400).json({ message: "Debe indicar un empleado válido." });
    }
    const emp = await Empleado.findById(empleadoAsignado);
    if (!emp) {
      return res.status(404).json({ message: "Empleado no encontrado." });
    }

    const estadoRaw = String(b.estado || "pendiente").trim();
    const estados = Tarea.ESTADOS_TAREA || ["pendiente", "completada"];
    const estado = estados.includes(estadoRaw) ? estadoRaw : "pendiente";

    const nueva = await Tarea.create({
      titulo,
      descripcion,
      empleadoAsignado,
      estado,
    });
    const doc = await Tarea.findById(nueva._id).populate(populateEmpleado);
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al crear la tarea" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de tarea inválido." });
    }
    const tarea = await Tarea.findById(id);
    if (!tarea) {
      return res.status(404).json({ message: "Tarea no encontrada." });
    }

    const b = req.body || {};
    if (b.titulo != null) tarea.titulo = String(b.titulo).trim();
    if (b.descripcion != null) tarea.descripcion = String(b.descripcion).trim();

    if (b.empleadoAsignado != null) {
      const eid = String(b.empleadoAsignado);
      if (!mongoose.Types.ObjectId.isValid(eid)) {
        return res.status(400).json({ message: "Empleado asignado inválido." });
      }
      const emp = await Empleado.findById(eid);
      if (!emp) {
        return res.status(404).json({ message: "Empleado no encontrado." });
      }
      tarea.empleadoAsignado = eid;
    }

    if (b.estado != null) {
      const estados = Tarea.ESTADOS_TAREA || ["pendiente", "completada"];
      const st = String(b.estado).trim();
      if (!estados.includes(st)) {
        return res.status(400).json({ message: `Estado no válido. Use: ${estados.join(", ")}.` });
      }
      tarea.estado = st;
    }

    await tarea.save();
    const doc = await Tarea.findById(tarea._id).populate(populateEmpleado);
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al actualizar la tarea" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }
    const del = await Tarea.findByIdAndDelete(id);
    if (!del) {
      return res.status(404).json({ message: "Tarea no encontrada." });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al eliminar la tarea" });
  }
});

module.exports = router;
