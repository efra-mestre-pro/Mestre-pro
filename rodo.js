const admin = require("firebase-admin");
const fetch = require("node-fetch");

// ============================
// 🌍 TIMEZONE MAPUTO
// ============================

const TIMEZONE = "Africa/Maputo";

function getMaputoDate() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: TIMEZONE })
  ).toISOString().split("T")[0];
}

// ============================
// 🔐 FIREBASE INIT
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
    console.error("Erro Firebase:", err.message);
    process.exit(1);
  }
}

initFirebase();
const db = admin.firestore();

// ============================
// 🔑 CONFIGURAÇÃO APIs
// ============================

const APIS = [
  { nome: "API_1", url: process.env.API_1_URL },
  { nome: "API_2", url: process.env.API_2_URL },
  { nome: "API_3", url: process.env.API_3_URL }
].filter(a => a.url && a.url.startsWith("http"));

// API 4 integrada: AllSports + RapidAPI
const API_4_URL = process.env.API_4_URL || "https://allsportsapi2.p.rapidapi.com/soccer/matches?date={DATA}";

const RAPID_KEYS = [
  { host: "allsportsapi2.p.rapidapi.com", key: process.env.ALLSPORTS_KEY },
  { host: "football-data.org", key: process.env.X_RAPIDAPI_KEY }
].filter(a => a.key);

// ============================
// 🔄 FETCH COM RETRY
// ============================

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.log(`Tentativa ${i} falhou:`, err.message);
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 4000));
    }
  }
}

// ============================
// 📡 COLETA DE DADOS
// ============================

async function coletarDados() {
  const hoje = getMaputoDate();
  console.log("Data Maputo:", hoje);

  // Primeiro APIs normais
  for (const api of APIS) {
    try {
      console.log("Tentando:", api.nome);
      const url = api.url.replace("{DATA}", hoje);
      const data = await fetchWithRetry(url);

      const jogos = data.result || data.matches || [];
      if (jogos.length > 0) {
        console.log("API ativa:", api.nome);
        return jogos;
      }
    } catch {
      console.log("Falhou API:", api.nome);
    }
  }

  // Depois RapidAPI / AllSports
  for (const api of RAPID_KEYS) {
    try {
      console.log("Tentando API:", api.host);
      const urlFinal = API_4_URL.replace("{DATA}", hoje);

      const data = await fetchWithRetry(urlFinal, {
        headers: {
          "X-RapidAPI-Key": api.key,
          "X-RapidAPI-Host": api.host
        }
      });

      const jogos = data.result || data.matches || [];
      if (jogos.length > 0) {
        console.log("API ativa:", api.host);
        return jogos;
      }
    } catch {
      console.log("Falhou API:", api.host);
    }
  }

  return null;
}

// ============================
// 🧠 CLASSIFICAÇÃO JOGOS
// ============================

function classificarJogo(j) {
  const status = j.event_status || j.status || "NS";
  const resultado = j.event_final_result || null;

  if (resultado) return "green";
  if (status === "NS" || status === "TIMED") return "comboio";
  return "risco";
}

// ============================
// 🚀 EXECUÇÃO
// ============================

async function executar() {
  const jogos = await coletarDados();

  if (!jogos) {
    console.log("Nenhum jogo encontrado.");
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

  const hoje = getMaputoDate();
  const payload = {
    sistema: "AnteSpan Enterprise",
    timezone: TIMEZONE,
    data: hoje,
    totalJogos: jogos.length,
    greenDoDia: green,
    risco,
    comboio,
    atualizadoEm: new Date().toISOString(),
  };

  await db.collection("central_esportes").doc("dashboard_hoje").set(payload);
  await db.collection("backup_diario").doc(hoje.replace(/-/g, "")).set(payload);

  console.log("Sistema atualizado com sucesso.");
}

executar();
