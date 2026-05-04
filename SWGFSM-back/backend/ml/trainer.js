const tf = require("@tensorflow/tfjs");
const Inventario   = require("../models/Inventario");
const PrediccionML = require("../models/PrediccionML");

// ── Mapas ──────────────────────────────────────────────────────────────────────
const TAMANO_MAP = { pequeño: 0, pequeno: 0, mediano: 1, grande: 2 };
const TIPO_MAP   = { exportacion: 0, exportación: 0, local: 1, organico: 2, orgánico: 2 };
const ESTADO_LABELS = ["verde", "sazon", "maduro", "punto_negro"];
const ACCIONES_MAP  = ["En proceso", "Almacenar", "Vender hoy", "Venta urgente"];

const norm = (s = "") => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

const computeDias = (fecha) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const entry = new Date(fecha); entry.setHours(0,0,0,0);
  return Math.max(0, Math.floor((today - entry) / 86400000));
};

const estimatePh = (dias, tamano, tipo) => {
  const tamOff = [0.1, 0.0, -0.05][TAMANO_MAP[norm(tamano)] ?? 1] ?? 0;
  const tipOff = [0.0, -0.1, 0.15][TIPO_MAP[norm(tipo)]   ?? 0] ?? 0;
  return Math.max(4.5, parseFloat((7.8 - dias * 0.24 + tamOff + tipOff).toFixed(2)));
};

// ── Training data mejorada ─────────────────────────────────────────────────────
// CAMBIO CLAVE: rangos bien separados, jitter pequeño, más muestras por clase
const buildTrainingData = () => {
  const features = [];
  const labels   = [];

  // jitter mínimo para no solapar clases
  const j = (v, mag = 0.03) => v + (Math.random() - 0.5) * mag;

  // Clase 0 — VERDE: días 0-2, pH 7.4-7.9
  for (let i = 0; i < 200; i++) {
    const dias = j(Math.random() * 2, 0.1);            // 0 – 2
    const ph   = j(7.9 - dias * 0.25, 0.03);           // 7.4 – 7.9
    const ta   = Math.floor(Math.random() * 3);
    const ti   = Math.floor(Math.random() * 3);
    features.push([dias, ph, ta, ti, dias / 10]);
    labels.push(0);
  }

  // Clase 1 — SAZÓN: días 3-5, pH 6.6-7.1
  for (let i = 0; i < 200; i++) {
    const dias = j(3 + Math.random() * 2, 0.1);        // 3 – 5
    const ph   = j(7.8 - dias * 0.24, 0.03);           // 6.6 – 7.1
    const ta   = Math.floor(Math.random() * 3);
    const ti   = Math.floor(Math.random() * 3);
    features.push([dias, ph, ta, ti, dias / 10]);
    labels.push(1);
  }

  // Clase 2 — MADURO: días 5.5-7, pH 5.8-6.4
  for (let i = 0; i < 200; i++) {
    const dias = j(5.5 + Math.random() * 1.5, 0.1);    // 5.5 – 7
    const ph   = j(7.8 - dias * 0.24, 0.03);           // 5.8 – 6.4
    const ta   = Math.floor(Math.random() * 3);
    const ti   = Math.floor(Math.random() * 3);
    features.push([dias, ph, ta, ti, dias / 10]);
    labels.push(2);
  }

  // Clase 3 — PUNTO NEGRO: días 8-14, pH 4.5-5.5
  for (let i = 0; i < 200; i++) {
    const dias = j(8 + Math.random() * 6, 0.15);       // 8 – 14
    const ph   = j(Math.max(4.5, 7.8 - dias * 0.24), 0.03);
    const ta   = Math.floor(Math.random() * 3);
    const ti   = Math.floor(Math.random() * 3);
    features.push([dias, ph, ta, ti, dias / 10]);
    labels.push(3);
  }

  return { features, labels };
};

// ── Construir modelo mejorado ──────────────────────────────────────────────────
// CAMBIO: arquitectura más simple para evitar sobreajuste con datos sintéticos
const buildModel = () => {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape:[5], units:32, activation:"relu",
    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }) }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.dense({ units:16, activation:"relu",
    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }) }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.dense({ units:4, activation:"softmax" }));

  // CAMBIO: learning rate más bajo → convergencia más estable
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"]
  });
  return model;
};

// ── Estado global del modelo ───────────────────────────────────────────────────
let modeloActual = null;
let normParams   = null;
let modeloListo  = false;

// ── Entrenar ───────────────────────────────────────────────────────────────────
const entrenarModelo = async () => {
  console.log("[ML] Iniciando entrenamiento…");
  try {
    const { features, labels } = buildTrainingData();
    const xs    = tf.tensor2d(features);
    const ysRaw = tf.tensor1d(labels, "int32");
    const ys    = tf.oneHot(ysRaw, 4).toFloat();

    // Normalización robusta (media/std por columna)
    const mean = xs.mean(0);
    const std  = xs.sub(mean).square().mean(0).sqrt().add(1e-8);
    const xsN  = xs.sub(mean).div(std);

    const model = buildModel();

    // CAMBIO: más épocas (300) para que BatchNorm converja bien
    await model.fit(xsN, ys, {
      epochs: 300,
      batchSize: 64,
      shuffle: true,
      validationSplit: 0.15,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 50 === 0)
            console.log(`[ML] Época ${epoch} — acc: ${(logs.acc*100).toFixed(1)}% | val_acc: ${(logs.val_acc*100).toFixed(1)}%`);
        }
      }
    });

    if (modeloActual) { modeloActual.dispose(); }
    modeloActual = model;
    normParams   = { mean, std };
    modeloListo  = true;

    xs.dispose(); ysRaw.dispose(); ys.dispose(); xsN.dispose();
    console.log("[ML] Modelo entrenado y listo ✓");

    await predecirYGuardar();

  } catch (err) {
    console.error("[ML] Error en entrenamiento:", err);
  }
};

// ── Predecir y guardar en MongoDB ──────────────────────────────────────────────
const predecirYGuardar = async () => {
  if (!modeloListo) return;
  try {
    const lotes = await Inventario.find({}).sort({ fecha: -1 }).limit(50);

    const porProducto = {};
    lotes.forEach(l => {
      const key = `${l.producto}-${norm(l.tipo)}-${norm(l.tamano)}`;
      if (!porProducto[key]) porProducto[key] = l;
    });

    const resultados = [];

    for (const lote of Object.values(porProducto)) {
      const dias = computeDias(lote.fecha);
      const ph   = estimatePh(dias, lote.tamano, lote.tipo);

      const tamIdx = TAMANO_MAP[norm(lote.tamano)] ?? 1;
      const tipIdx = TIPO_MAP[norm(lote.tipo)]     ?? 0;

      const input    = tf.tensor2d([[dias, ph, tamIdx, tipIdx, dias/10]]);
      const inputN   = input.sub(normParams.mean).div(normParams.std);
      const probsTensor = modeloActual.predict(inputN);
      const probsArr = Array.from(probsTensor.dataSync());
      const classIdx = probsArr.indexOf(Math.max(...probsArr));

      input.dispose(); inputN.dispose(); probsTensor.dispose();

      const estadoML = ESTADO_LABELS[classIdx];
      const confianza = probsArr[classIdx];
      const accion    = ACCIONES_MAP[classIdx];

      await PrediccionML.findOneAndUpdate(
        { inventarioId: lote._id },
        {
          inventarioId: lote._id,
          fecha:       new Date(),
          proveedor:   lote.proveedor,
          producto:    lote.producto,
          tipo:        lote.tipo,
          tamano:      lote.tamano,
          cantidad:    lote.cantidad,
          diasAlmacen: dias,
          phEstimado:  ph,
          estadoML,
          confianza,
          accion,
          probs: probsArr,
        },
        { upsert: true, new: true }
      );

      resultados.push({ lote, estadoML, confianza, accion, diasAlmacen: dias, phEstimado: ph, probs: probsArr });
    }

    console.log(`[ML] ${resultados.length} predicciones guardadas en MongoDB ✓`);
    return resultados;

  } catch (err) {
    console.error("[ML] Error al predecir:", err);
  }
};

module.exports = { entrenarModelo, predecirYGuardar, modeloListo: () => modeloListo };