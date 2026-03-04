const admin = require("firebase-admin");
const fetch = require("node-fetch");

// ============================
// 🔐 FIREBASE INIT SEGURO
// ============================

function initFirebase() {
  try {
    if (!process.env.FIREBASE_CONFIG) {
      throw new Error("FIREBASE_CONFIG não encontrada.");
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG.trim());
    serviceAccount.private_key =
      serviceAccount.private_key.replace(/\\n/g, "\n");

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    console.log("Firebase conectado com sucesso.");
  } catch (err) {
    console.error("Erro ao iniciar Firebase:", err.message);
    process.exit(1);
  }
}

initFirebase();
const db = admin.firestore();

// ============================
// 🛰 CONFIGURAÇÃO APIs
// ============================

const APIS = [
  { nome: "API_1", url: process.env.API_1_URL?.trim() },
  { nome: "API_2", url: process.env.API_2_URL?.trim() },
  { nome: "API_3", url: process.env.API_3_URL?.trim() },
  {
    nome: "API_4",
    url: process.env.API_4_URL?.trim(),
    headers: {
      "X-RapidAPI-Key": process.env.API_4_KEY,
      "X-RapidAPI-Host": "football-data.org",
    },
  },
].filter(api => api.url && api.url.startsWith("http"));

// ============================
// 🔄 RETRY INTERNO
// ============================

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      const res = await fetch(url, { ...options, timeout: 15000 });
      const text = await res.text();
      return JSON.parse(text);
    } catch (err) {
      console.log(`Tentativa ${i} falhou:`, err.message);
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// ============================
// 📡 COLETA MULTI API
// ============================

async function coletarDados() {
  const hoje = new Date().toISOString().split("T")[0];

  for (const api of APIS) {
    try {
      console.log("Tentando:", api.nome);

      const urlFinal = api.url.replace("{DATA}", hoje);
      const data = await fetchWithRetry(urlFinal, {
        headers: api.headers || {},
      });

      const jogos = data.result || data.matches || [];

      if (Array.isArray(jogos) && jogos.length > 0) {
        console.log("API ativa:", api.nome);
        return jogos;
      }
    } catch (err) {
      console.log("Erro na API:", api.nome);
    }
  }

  return null;
}

// ============================
// 🧠 CLASSIFICAÇÃO PROFISSIONAL
// ============================

function classificarJogo(j) {
  const status = j.event_status || j.status || "NS";
  const resultado = j.event_final_result || null;

  if (resultado) return "green";
  if (status === "NS" || status === "TIMED") return "comboio";
  return "risco";
}

// ============================
// 🚀 EXECUÇÃO PRINCIPAL
// ============================

async function executar() {
  const jogos = await coletarDados();

  if (!jogos) {
    console.log("Nenhuma API retornou dados.");
    return;
  }

  const green = [];
  const risco = [];
  const comboio = [];

  jogos.forEach(j => {
    const tipo = classificarJogo(j);

    const item = {
      casa: j.event_home_team || j.homeTeam?.name,
      fora: j.event_away_team || j.awayTeam?.name,
      horario: j.event_time || j.utcDate || null,
      status: j.event_status || j.status || null,
      resultado: j.event_final_result || null,
    };

    if (tipo === "green") green.push(item);
    else if (tipo === "comboio") comboio.push(item);
    else risco.push(item);
  });

  const hoje = new Date().toISOString().split("T")[0];

  const payload = {
    sistema: "AnteSpan Enterprise",
    data: hoje,
    totalJogos: jogos.length,
    greenDoDia: green,
    risco,
    comboio,
    atualizadoEm: new Date().toISOString(),
  };

  await db.collection("central_esportes")
    .doc("dashboard_hoje")
    .set(payload);

  await db.collection("backup_diario")
    .doc(hoje.replace(/-/g, ""))
    .set(payload);

  console.log("Sistema atualizado com sucesso.");
}

executar();
