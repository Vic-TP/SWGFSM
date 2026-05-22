const tf = require("@tensorflow/tfjs");
const Producto     = require("../models/Producto");
const PrediccionML = require("../models/PrediccionML");

// ═══════════════════════════════════════════════════════════════════════════════
//  MAPAS DE NORMALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════
const TAMANO_MAP = { pequeño: 0, pequeno: 0, mediano: 1, grande: 2, "": 1 };

// tipIdx: 0 = Fuerte/Exportación  |  1 = Hass/Local  |  2 = Hall/Orgánico
const TIPO_MAP = {
  exportacion: 0, exportación: 0, fuerte: 0,
  local: 1, hass: 1,
  organico: 2, orgánico: 2, hall: 2,
};

const ESTADO_LABELS = ["verde", "sazon", "maduro", "punto_negro"];
const ACCIONES_MAP  = ["En proceso", "Almacenar", "Vender hoy", "Venta urgente"];

const norm = (s = "") =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ═══════════════════════════════════════════════════════════════════════════════
//  UMBRALES DE MADURACIÓN — basados en datos reales (imagen de referencia)
//
//  Todo el stock entra como VERDE. Los umbrales marcan cuándo transiciona:
//    verde → sazón   : t.verde  días
//    sazón → maduro  : t.sazon  días
//    maduro→ p.negro : t.maduro días
//
//  Se usa el PROMEDIO de cada rango como umbral de transición:
//    Hass  : verde→sazón  3-5d  → 4.0d  |  sazón→maduro  2-3d → 6.5d  |  maduro→pn 2-3d → 9.0d
//    Fuerte: verde→sazón  2-4d  → 3.0d  |  sazón→maduro  1-2d → 4.5d  |  maduro→pn 1-2d → 6.0d
//    Hall  : verde→sazón  4-6d  → 5.0d  |  sazón→maduro  2-3d → 7.5d  |  maduro→pn 2-4d → 10.5d
// ═══════════════════════════════════════════════════════════════════════════════
const TIPO_THRESHOLDS = {
  fuerte: { verde: 3.0, sazon: 4.5, maduro: 6.0  },
  hass:   { verde: 4.0, sazon: 6.5, maduro: 9.0  },
  hall:   { verde: 5.0, sazon: 7.5, maduro: 10.5 },
};

// Rangos reales de cada transición (min, max) en días — para generar datos de entrenamiento
const TIPO_RANGES = {
  fuerte: {
    verdeMin: 0,   verdeMax: 3.0,
    sazonMin: 3.0, sazonMax: 4.5,
    maduroMin: 4.5, maduroMax: 6.0,
    pnMin: 6.0,    pnMax: 8.0,
  },
  hass: {
    verdeMin: 0,   verdeMax: 4.0,
    sazonMin: 4.0, sazonMax: 6.5,
    maduroMin: 6.5, maduroMax: 9.0,
    pnMin: 9.0,    pnMax: 12.0,
  },
  hall: {
    verdeMin: 0,   verdeMax: 5.0,
    sazonMin: 5.0, sazonMax: 7.5,
    maduroMin: 7.5, maduroMax: 10.5,
    pnMin: 10.5,   pnMax: 14.0,
  },
};

// Alias tipo → clave canónica
const tipoCanon = (tipo) => {
  const n = norm(tipo);
  if (["fuerte", "exportacion", "exportación"].includes(n)) return "fuerte";
  if (["hall", "organico", "orgánico"].includes(n))         return "hall";
  return "hass"; // hass, local, vacío → default
};

const getThresholds = (tipo) =>
  TIPO_THRESHOLDS[tipoCanon(tipo)] ?? TIPO_THRESHOLDS.hass;

// ═══════════════════════════════════════════════════════════════════════════════
//  DÍAS REPRESENTATIVOS POR SUB-LOTE
//
//  Como todo entra como VERDE, cada sub-lote físico (stockPaltaVerde,
//  stockPaltaSazon, stockPaltaMadura) representa paltas que ya llevaron
//  N días en almacén. Se asigna el punto medio del rango correspondiente.
// ═══════════════════════════════════════════════════════════════════════════════
const diasParaSublote = (subLote, tipo) => {
  const canon = tipoCanon(tipo);
  const r = TIPO_RANGES[canon] ?? TIPO_RANGES.hass;

  const rangos = {
    verde:  { min: r.verdeMin,  max: r.verdeMax  },
    sazon:  { min: r.sazonMin,  max: r.sazonMax  },
    maduro: { min: r.maduroMin, max: r.maduroMax },
  };

  const rango = rangos[subLote] ?? rangos.verde;
  // Punto medio + pequeño jitter (±10 % del rango) para variabilidad realista
  const mid    = (rango.min + rango.max) / 2;
  const jitter = (rango.max - rango.min) * 0.1 * (Math.random() - 0.5);
  return parseFloat(Math.max(rango.min, Math.min(rango.max, mid + jitter)).toFixed(2));
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ESTIMACIÓN DE pH
//  pH inicial ~7.8 (verde), cae hasta ~4.5 (punto negro)
//  La tasa se ajusta al ciclo total de cada variedad
// ═══════════════════════════════════════════════════════════════════════════════
const estimatePh = (dias, tamano, tipo) => {
  const t      = getThresholds(tipo);
  const tamOff = [0.1, 0.0, -0.05][TAMANO_MAP[norm(tamano)] ?? 1] ?? 0;
  const totalDias = t.maduro + 2;          // ciclo completo estimado
  const tasa      = 3.3 / totalDias;       // pH cae ~3.3 unidades en el ciclo
  return Math.max(4.5, parseFloat((7.8 - dias * tasa + tamOff).toFixed(2)));
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CLASIFICADOR DETERMINISTA (regla de negocio como guardia)
// ═══════════════════════════════════════════════════════════════════════════════
const classByDias = (dias, tipo) => {
  const t = getThresholds(tipo);
  if (dias < t.verde)  return 0; // verde
  if (dias < t.sazon)  return 1; // sazon
  if (dias < t.maduro) return 2; // maduro
  return 3;                       // punto_negro
};

const ruleProbsByDias = (dias, tipo) => {
  const idx = classByDias(dias, tipo);
  const t   = getThresholds(tipo);
  const boundaries = [t.verde, t.sazon, t.maduro];
  const dist = Math.min(...boundaries.map((b) => Math.abs(dias - b)));
  const main  = dist >= 0.6 ? 0.94 : 0.82;
  const other = (1 - main) / 3;
  const probs = [other, other, other, other];
  probs[idx] = main;
  return probs;
};

const blendProbs = (mlProbs, ruleProbs, mlWeight = 0.35) =>
  mlProbs.map((p, i) =>
    parseFloat((p * mlWeight + ruleProbs[i] * (1 - mlWeight)).toFixed(6))
  );

// ═══════════════════════════════════════════════════════════════════════════════
//  RNG REPRODUCIBLE
// ═══════════════════════════════════════════════════════════════════════════════
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
    [labels[i],   labels[j]]   = [labels[j],   labels[i]];
  }
};

const getMetric = (logs, ...keys) => {
  for (const key of keys) {
    const val = logs?.[key];
    if (typeof val === "number" && Number.isFinite(val)) return val;
  }
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DATOS DE ENTRENAMIENTO
//
//  Se generan ~6 120 muestras: 3 tipos × 3 tamaños × 4 clases × 170 muestras
//  Los rangos de días por clase usan TIPO_RANGES para que cada variedad tenga
//  su propio ciclo de maduración (reflejo exacto de la tabla de referencia).
// ═══════════════════════════════════════════════════════════════════════════════
const buildTrainingData = (seed = 42) => {
  const rng      = createRng(seed);
  const features = [];
  const labels   = [];

  const TIPOS_TRAIN = [
    { tipIdx: 0, canon: "fuerte" },
    { tipIdx: 1, canon: "hass"   },
    { tipIdx: 2, canon: "hall"   },
  ];

  const N = 170; // muestras por clase × tipo × tamaño

  for (const { tipIdx, canon } of TIPOS_TRAIN) {
    const r = TIPO_RANGES[canon];
    const t = TIPO_THRESHOLDS[canon];

    for (let tamIdx = 0; tamIdx < 3; tamIdx++) {
      const tamOff    = [0.1, 0.0, -0.05][tamIdx] ?? 0;
      const totalDias = t.maduro + 2;
      const tasa      = 3.3 / totalDias;

      const pushSample = (diasMin, diasMax, label) => {
        for (let i = 0; i < N; i++) {
          const dias = diasMin + rng() * (diasMax - diasMin);
          const ph   = Math.max(
            4.5,
            parseFloat(
              (7.8 - dias * tasa + tamOff + (rng() - 0.5) * 0.06).toFixed(2)
            )
          );
          features.push([dias, ph, tamIdx, tipIdx, dias / 14]); // normalizado sobre 14d
          labels.push(label);
        }
      };

      // Clases con rangos exactos por variedad
      pushSample(r.verdeMin,  r.verdeMax,  0); // verde
      pushSample(r.sazonMin,  r.sazonMax,  1); // sazon
      pushSample(r.maduroMin, r.maduroMax, 2); // maduro
      pushSample(r.pnMin,     r.pnMax,     3); // punto_negro
    }
  }

  shuffleInPlace(features, labels, rng);
  return { features, labels };
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ARQUITECTURA DEL MODELO
// ═══════════════════════════════════════════════════════════════════════════════
const buildModel = () => {
  const model = tf.sequential();

  model.add(tf.layers.dense({
    inputShape:        [5],
    units:             48,
    activation:        "relu",
    kernelInitializer: "heNormal",
    kernelRegularizer: tf.regularizers.l2({ l2: 0.0003 }),
  }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.dropout({ rate: 0.12 }));

  model.add(tf.layers.dense({
    units:             32,
    activation:        "relu",
    kernelInitializer: "heNormal",
    kernelRegularizer: tf.regularizers.l2({ l2: 0.0002 }),
  }));
  model.add(tf.layers.dropout({ rate: 0.08 }));

  model.add(tf.layers.dense({ units: 4, activation: "softmax" }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss:      "categoricalCrossentropy",
    metrics:   ["accuracy"],
  });

  return model;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════════════════════════
let modeloActual   = null;
let normParams     = null;
let _modeloListo   = false;
let ultimaAccuracy = null;

// ═══════════════════════════════════════════════════════════════════════════════
//  ENTRENAMIENTO
// ═══════════════════════════════════════════════════════════════════════════════
const entrenarModelo = async () => {
  console.log("[ML] Iniciando entrenamiento por variedad (rangos reales)…");
  try {
    const { features, labels } = buildTrainingData(42);

    const total    = features.length;
    const trainEnd = Math.floor(total * 0.70);
    const valEnd   = Math.floor(total * 0.85);

    const xTrain = tf.tensor2d(features.slice(0, trainEnd));
    const yTR    = tf.tensor1d(labels.slice(0, trainEnd), "int32");
    const yTrain = tf.oneHot(yTR, 4).toFloat();

    const xVal = tf.tensor2d(features.slice(trainEnd, valEnd));
    const yVR  = tf.tensor1d(labels.slice(trainEnd, valEnd), "int32");
    const yVal = tf.oneHot(yVR, 4).toFloat();

    const xTest = tf.tensor2d(features.slice(valEnd));
    const yTeR  = tf.tensor1d(labels.slice(valEnd), "int32");
    const yTest = tf.oneHot(yTeR, 4).toFloat();

    // Normalización z-score sobre el train set
    const mean = xTrain.mean(0);
    const std  = xTrain.sub(mean).square().mean(0).sqrt().add(1e-8);

    const xTrainN = xTrain.sub(mean).div(std);
    const xValN   = xVal.sub(mean).div(std);
    const xTestN  = xTest.sub(mean).div(std);

    const model      = buildModel();
    let bestValAcc   = 0;
    let bestValLoss  = Infinity;
    let patienceLeft = 20; // early stopping manual (patience=20)

    await model.fit(xTrainN, yTrain, {
      epochs:         200,
      batchSize:      32,
      shuffle:        true,
      validationData: [xValN, yVal],
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          const valAcc  = getMetric(logs, "val_accuracy", "val_acc");
          const valLoss = getMetric(logs, "val_loss");

          if (valAcc  != null && valAcc  > bestValAcc)  bestValAcc  = valAcc;

          // Early stopping manual sobre val_loss
          if (valLoss != null) {
            if (valLoss < bestValLoss - 1e-4) {
              bestValLoss  = valLoss;
              patienceLeft = 20;
            } else {
              patienceLeft--;
              if (patienceLeft <= 0) {
                model.stopTraining = true;
              }
            }
          }

          if (epoch % 25 === 0) {
            const acc = getMetric(logs, "accuracy", "acc");
            console.log(
              `[ML] Época ${epoch} — acc: ${acc ? (acc * 100).toFixed(1) : "—"}%` +
              ` | val_acc: ${valAcc ? (valAcc * 100).toFixed(1) : "—"}%`
            );
          }
        },
      },
    });

    const evalOut       = model.evaluate(xTestN, yTest);
    const testAccTensor = Array.isArray(evalOut) ? evalOut[1] : null;
    const testAcc       = testAccTensor ? testAccTensor.dataSync()[0] : bestValAcc;
    ultimaAccuracy      = Math.round((testAcc ?? bestValAcc ?? 0) * 100);

    // Reemplazar modelo anterior
    if (modeloActual)      modeloActual.dispose();
    if (normParams?.mean)  normParams.mean.dispose();
    if (normParams?.std)   normParams.std.dispose();

    modeloActual = model;
    normParams   = { mean, std };
    _modeloListo = true;

    // Liberar tensores
    [xTrain, yTR, yTrain, xVal, yVR, yVal,
     xTest, yTeR, yTest, xTrainN, xValN, xTestN].forEach((t) => t.dispose());

    console.log(`[ML] Modelo entrenado ✓  test_acc: ${ultimaAccuracy}%`);
    await predecirYGuardar();
  } catch (err) {
    console.error("[ML] Error en entrenamiento:", err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PREDICCIÓN DE UN SUB-LOTE
// ═══════════════════════════════════════════════════════════════════════════════
const predecirSubLote = (diasRef, tamano, tipo) => {
  if (!_modeloListo || !modeloActual || !normParams) return null;

  const ph     = estimatePh(diasRef, tamano, tipo);
  const tamIdx = TAMANO_MAP[norm(tamano)] ?? 1;
  const tipIdx = TIPO_MAP[norm(tipo)]    ?? 1;

  const mlProbs = tf.tidy(() => {
    const input  = tf.tensor2d([[diasRef, ph, tamIdx, tipIdx, diasRef / 14]]);
    const inputN = input.sub(normParams.mean).div(normParams.std);
    return Array.from(modeloActual.predict(inputN).dataSync());
  });

  const ruleProbs  = ruleProbsByDias(diasRef, tipo);
  const finalProbs = blendProbs(mlProbs, ruleProbs, 0.35);
  const classIdx   = finalProbs.indexOf(Math.max(...finalProbs));

  return {
    estadoML:   ESTADO_LABELS[classIdx],
    confianza:  finalProbs[classIdx],
    accion:     ACCIONES_MAP[classIdx],
    phEstimado: ph,
    probs:      finalProbs,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PREDECIR TODOS LOS SUB-LOTES Y GUARDAR EN MONGODB
//
//  Lógica: todo stock entra como VERDE. Los tres campos del Producto
//  (stockPaltaVerde, stockPaltaSazon, stockPaltaMadura) representan en qué
//  etapa del ciclo se encuentran esas paltas actualmente. El modelo predice
//  el estado real de madurez de cada sub-lote con días representativos
//  calculados según la variedad (TIPO_RANGES).
// ═══════════════════════════════════════════════════════════════════════════════
const predecirYGuardar = async () => {
  if (!_modeloListo) return;
  try {
    const productos  = await Producto.find({ estado: "ACTIVO" }).limit(100);
    const resultados = [];

    for (const prod of productos) {
      const tamano = prod.tamano ?? "";
      const tipo   = prod.tipo   ?? "";

      // Solo se procesan sub-lotes con stock > 0
      const subLotes = [
        { key: "verde",  stock: prod.stockPaltaVerde  ?? 0 },
        { key: "sazon",  stock: prod.stockPaltaSazon  ?? 0 },
        { key: "maduro", stock: prod.stockPaltaMadura ?? 0 },
      ].filter((sl) => sl.stock > 0);

      for (const sl of subLotes) {
        // diasRef = punto representativo del rango para esta etapa y variedad
        const diasRef = diasParaSublote(sl.key, tipo);
        const pred    = predecirSubLote(diasRef, tamano, tipo);
        if (!pred) continue;

        const docId = `${prod._id}-${sl.key}`;

        await PrediccionML.findOneAndUpdate(
          { inventarioId: docId },
          {
            inventarioId:  docId,
            productoId:    prod._id,
            subLote:       sl.key,
            fecha:         new Date(),
            producto:      `${prod.nombre} ${tipo}`.trim(),
            tipo,
            tamano,
            cantidad:      sl.stock,
            stockSemanal:  prod.stockSemanal ?? 0,
            proveedor:     prod.categoriaId  ?? "—",
            diasAlmacen:   diasRef,
            phEstimado:    pred.phEstimado,
            estadoML:      pred.estadoML,
            confianza:     pred.confianza,
            accion:        pred.accion,
            probs:         pred.probs,
            accuracy:      ultimaAccuracy,
          },
          { upsert: true, new: true }
        );

        resultados.push({
          producto:    `${prod.nombre} ${tipo}`.trim(),
          subLote:     sl.key,
          stock:       sl.stock,
          diasAlmacen: diasRef,
          accuracy:    ultimaAccuracy,
          ...pred,
        });
      }
    }

    console.log(`[ML] ${resultados.length} predicciones guardadas ✓`);
    return resultados;
  } catch (err) {
    console.error("[ML] Error al predecir y guardar:", err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
  entrenarModelo,
  predecirYGuardar,
  modeloListo:  () => _modeloListo,
  getAccuracy:  () => ultimaAccuracy,
  getThresholds,
};