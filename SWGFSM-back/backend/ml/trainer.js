const tf = require("@tensorflow/tfjs");
const Producto = require("../models/Producto");
const PrediccionML = require("../models/PrediccionML");

// ── Mapas ──────────────────────────────────────────────────────────────────────
const TAMANO_MAP = { pequeño: 0, pequeno: 0, mediano: 1, grande: 2, "": 1 };
const TIPO_MAP = {
  exportacion: 0,
  exportación: 0,
  fuerte: 0,
  local: 1,
  hass: 1,
  organico: 2,
  orgánico: 2,
  hall: 2,
};

const ESTADO_LABELS = ["verde", "sazon", "maduro", "punto_negro"];
const ACCIONES_MAP = ["En proceso", "Almacenar", "Vender hoy", "Venta urgente"];

const norm = (s = "") =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const estimatePh = (dias, tamano, tipo) => {
  const tamOff = [0.1, 0.0, -0.05][TAMANO_MAP[norm(tamano)] ?? 1] ?? 0;
  const tipOff = [0.0, -0.1, 0.15][TIPO_MAP[norm(tipo)] ?? 0] ?? 0;
  return Math.max(4.5, parseFloat((7.8 - dias * 0.24 + tamOff + tipOff).toFixed(2)));
};

// ── RNG reproducible ───────────────────────────────────────────────────────────
const createRng = (seed = 42) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffleInPlace = (features, labels, rng) => {
  for (let i = features.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [features[i], features[j]] = [features[j], features[i]];
    [labels[i], labels[j]] = [labels[j], labels[i]];
  }
};

const getMetric = (logs, ...keys) => {
  for (const key of keys) {
    const val = logs?.[key];
    if (typeof val === "number" && Number.isFinite(val)) return val;
  }
  return null;
};

// ── Días por sub-lote ──────────────────────────────────────────────────────────
const DIAS_POR_SUBLOTE = {
  verde: { base: 1.5, jitter: 0.4 },
  sazon: { base: 4.5, jitter: 0.5 },
  maduro: { base: 6.5, jitter: 0.4 },
};

const diasParaSublote = (subLote) => {
  const cfg = DIAS_POR_SUBLOTE[subLote] ?? DIAS_POR_SUBLOTE.verde;
  return parseFloat((cfg.base + (Math.random() - 0.5) * cfg.jitter).toFixed(2));
};

// ── Clasificador base por días ────────────────────────────────────────────────
const classByDias = (dias) => {
  if (dias < 2.5) return 0;       // verde
  if (dias < 5.5) return 1;       // sazon
  if (dias < 7.5) return 2;       // maduro
  return 3;                       // punto_negro
};

const ruleProbsByDias = (dias) => {
  const idx = classByDias(dias);
  const thresholds = [2.5, 5.5, 7.5];
  const dist = Math.min(...thresholds.map((t) => Math.abs(dias - t)));
  const main = dist >= 0.5 ? 0.94 : 0.84;
  const other = (1 - main) / 3;
  const probs = [other, other, other, other];
  probs[idx] = main;
  return probs;
};

const blendProbs = (mlProbs, ruleProbs, mlWeight = 0.35) =>
  mlProbs.map((p, i) =>
    parseFloat((p * mlWeight + ruleProbs[i] * (1 - mlWeight)).toFixed(6))
  );

// ── Training data reproducible ────────────────────────────────────────────────
const buildTrainingData = (seed = 42) => {
  const rng = createRng(seed);
  const features = [];
  const labels = [];

  const j = (value, mag) => value + (rng() - 0.5) * mag;

  const pushSample = (diasMin, diasRange, label, magDias = 0.06, magPh = 0.04) => {
    const dias = j(diasMin + rng() * diasRange, magDias);
    const tamIdx = Math.floor(rng() * 3);
    const tipIdx = Math.floor(rng() * 3);

    const tamOff = [0.1, 0.0, -0.05][tamIdx] ?? 0;
    const tipOff = [0.0, -0.1, 0.15][tipIdx] ?? 0;

    const ph = Math.max(
      4.5,
      parseFloat((7.8 - dias * 0.24 + tamOff + tipOff + (rng() - 0.5) * magPh).toFixed(2))
    );

    features.push([dias, ph, tamIdx, tipIdx, dias / 10]);
    labels.push(label);
  };

  for (let i = 0; i < 500; i++) pushSample(0.2, 2.1, 0);   // verde
  for (let i = 0; i < 500; i++) pushSample(2.8, 2.3, 1);   // sazon
  for (let i = 0; i < 500; i++) pushSample(5.7, 1.5, 2);   // maduro
  for (let i = 0; i < 500; i++) pushSample(7.8, 6.0, 3);   // punto negro

  shuffleInPlace(features, labels, rng);
  return { features, labels };
};

// ── Modelo más estable ────────────────────────────────────────────────────────
const buildModel = () => {
  const model = tf.sequential();

  model.add(tf.layers.dense({
    inputShape: [5],
    units: 32,
    activation: "relu",
    kernelInitializer: "heNormal",
    kernelRegularizer: tf.regularizers.l2({ l2: 0.0003 }),
  }));

  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.dropout({ rate: 0.10 }));

  model.add(tf.layers.dense({
    units: 16,
    activation: "relu",
    kernelInitializer: "heNormal",
  }));

  model.add(tf.layers.dense({ units: 4, activation: "softmax" }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  return model;
};

// ── Estado global ─────────────────────────────────────────────────────────────
let modeloActual = null;
let normParams = null;
let modeloListo = false;
let ultimaAccuracy = null;

// ── Entrenar ──────────────────────────────────────────────────────────────────
const entrenarModelo = async () => {
  console.log("[ML] Iniciando entrenamiento...");
  try {
    const { features, labels } = buildTrainingData(42);

    const total = features.length;
    const trainEnd = Math.floor(total * 0.7);
    const valEnd = Math.floor(total * 0.85);

    const xTrain = tf.tensor2d(features.slice(0, trainEnd));
    const yTrainRaw = tf.tensor1d(labels.slice(0, trainEnd), "int32");
    const yTrain = tf.oneHot(yTrainRaw, 4).toFloat();

    const xVal = tf.tensor2d(features.slice(trainEnd, valEnd));
    const yValRaw = tf.tensor1d(labels.slice(trainEnd, valEnd), "int32");
    const yVal = tf.oneHot(yValRaw, 4).toFloat();

    const xTest = tf.tensor2d(features.slice(valEnd));
    const yTestRaw = tf.tensor1d(labels.slice(valEnd), "int32");
    const yTest = tf.oneHot(yTestRaw, 4).toFloat();

    const mean = xTrain.mean(0);
    const std = xTrain.sub(mean).square().mean(0).sqrt().add(1e-8);

    const xTrainN = xTrain.sub(mean).div(std);
    const xValN = xVal.sub(mean).div(std);
    const xTestN = xTest.sub(mean).div(std);

    const model = buildModel();

    let bestValAcc = 0;

    await model.fit(xTrainN, yTrain, {
      epochs: 180,
      batchSize: 32,
      shuffle: true,
      validationData: [xValN, yVal],
      callbacks: [
        tf.callbacks.earlyStopping({
          monitor: "val_loss",
          patience: 18,
          restoreBestWeight: true, // si tu versión no lo soporta, no rompe
        }),
        {
          onEpochEnd: async (epoch, logs) => {
            const acc = getMetric(logs, "accuracy", "acc");
            const valAcc = getMetric(logs, "val_accuracy", "val_acc");

            if (valAcc != null && valAcc > bestValAcc) {
              bestValAcc = valAcc;
            }

            if (epoch % 20 === 0) {
              console.log(
                `[ML] Época ${epoch} — acc: ${acc ? (acc * 100).toFixed(1) : "—"}%` +
                ` | val_acc: ${valAcc ? (valAcc * 100).toFixed(1) : "—"}%`
              );
            }
          },
        },
      ],
    });

    const evalOut = model.evaluate(xTestN, yTest);
    const testAccTensor = Array.isArray(evalOut) ? evalOut[1] : null;
    const testAcc = testAccTensor ? testAccTensor.dataSync()[0] : bestValAcc;

    ultimaAccuracy = Math.round((testAcc ?? bestValAcc ?? 0) * 100);

    if (modeloActual) modeloActual.dispose();
    if (normParams?.mean) normParams.mean.dispose();
    if (normParams?.std) normParams.std.dispose();

    modeloActual = model;
    normParams = { mean, std };
    modeloListo = true;

    xTrain.dispose();
    yTrainRaw.dispose();
    yTrain.dispose();
    xVal.dispose();
    yValRaw.dispose();
    yVal.dispose();
    xTest.dispose();
    yTestRaw.dispose();
    yTest.dispose();
    xTrainN.dispose();
    xValN.dispose();
    xTestN.dispose();

    console.log(`[ML] Modelo entrenado ✓ test_acc: ${ultimaAccuracy}%`);

    await predecirYGuardar();
  } catch (err) {
    console.error("[ML] Error en entrenamiento:", err);
  }
};

// ── Predicción de sub-lote ────────────────────────────────────────────────────
const predecirSubLote = (diasRef, tamano, tipo) => {
  if (!modeloListo || !modeloActual || !normParams) return null;

  const ph = estimatePh(diasRef, tamano, tipo);
  const tamIdx = TAMANO_MAP[norm(tamano)] ?? 1;
  const tipIdx = TIPO_MAP[norm(tipo)] ?? 0;

  const mlProbs = tf.tidy(() => {
    const input = tf.tensor2d([[diasRef, ph, tamIdx, tipIdx, diasRef / 10]]);
    const inputN = input.sub(normParams.mean).div(normParams.std);
    const probsTensor = modeloActual.predict(inputN);
    return Array.from(probsTensor.dataSync());
  });

  const ruleProbs = ruleProbsByDias(diasRef);
  const finalProbs = blendProbs(mlProbs, ruleProbs, 0.35);

  const classIdx = finalProbs.indexOf(Math.max(...finalProbs));

  return {
    estadoML: ESTADO_LABELS[classIdx],
    confianza: finalProbs[classIdx],
    accion: ACCIONES_MAP[classIdx],
    phEstimado: ph,
    probs: finalProbs,
  };
};

// ── Predecir y guardar ────────────────────────────────────────────────────────
const predecirYGuardar = async () => {
  if (!modeloListo) return;
  try {
    const productos = await Producto.find({ estado: "ACTIVO" }).limit(100);
    const resultados = [];

    for (const prod of productos) {
      const tamano = prod.tamano || "";
      const tipo = prod.tipo || "";

      const subLotes = [
        { key: "verde", stock: prod.stockPaltaVerde ?? 0 },
        { key: "sazon", stock: prod.stockPaltaSazon ?? 0 },
        { key: "maduro", stock: prod.stockPaltaMadura ?? 0 },
      ].filter((sl) => sl.stock > 0);

      for (const sl of subLotes) {
        const diasRef = diasParaSublote(sl.key);
        const pred = predecirSubLote(diasRef, tamano, tipo);
        if (!pred) continue;

        const docId = `${prod._id}-${sl.key}`;

        await PrediccionML.findOneAndUpdate(
          { inventarioId: docId },
          {
            inventarioId: docId,
            productoId: prod._id,
            subLote: sl.key,
            fecha: new Date(),
            producto: `${prod.nombre} ${tipo}`.trim(),
            tipo,
            tamano,
            cantidad: sl.stock,
            proveedor: prod.categoriaId ?? "—",
            diasAlmacen: diasRef,
            phEstimado: pred.phEstimado,
            estadoML: pred.estadoML,
            confianza: pred.confianza,
            accion: pred.accion,
            probs: pred.probs,
            accuracy: ultimaAccuracy,
          },
          { upsert: true, new: true }
        );

        resultados.push({
          producto: `${prod.nombre} ${tipo}`.trim(),
          subLote: sl.key,
          stock: sl.stock,
          diasAlmacen: diasRef,
          accuracy: ultimaAccuracy,
          ...pred,
        });
      }
    }

    console.log(`[ML] ${resultados.length} predicciones guardadas ✓`);
    return resultados;
  } catch (err) {
    console.error("[ML] Error al predecir:", err);
  }
};

module.exports = {
  entrenarModelo,
  predecirYGuardar,
  modeloListo: () => modeloListo,
  getAccuracy: () => ultimaAccuracy,
};
