const admin = require("firebase-admin");
const fetch = require("node-fetch");

// 1️⃣ Inicialização Firebase
try {
  const rawKey = process.env.FIREBASE_CONFIG;
  if (!rawKey) throw new Error("❌ FIREBASE_CONFIG vazia!");
  const serviceAccount = JSON.parse(rawKey.trim());
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  console.log("✅ Conexão com Firebase estabelecida!");
} catch (e) {
  console.error("❌ ERRO CRÍTICO NA CHAVE:", e.message);
  process.exit(1);
}

const db = admin.firestore();

// 2️⃣ Lista de APIs diferentes
const APIS = [
  { nome: "APIfootballcom", url: process.env.API_1_URL },
  { nome: "AllSportsAPI", url: process.env.API_2_URL },
  { nome: "API Sports", url: process.env.API_3_URL },
  { nome: "Free API Live Football Data", url: process.env.API_4_URL, headers: { "X-RapidAPI-Key": process.env.API_4_KEY, "X-RapidAPI-Host": "football-data.org" } },
].filter(api => api.url);

// 3️⃣ Coleta de dados com fallback
async function coletarDados() {
  const dataHoje = new Date().toISOString().split("T")[0];
  for (let i = 0; i < APIS.length; i++) {
    const api = APIS[i];
    const url = api.url.replace("{DATA}", dataHoje);
    console.log(`🔎 Tentando ${api.nome}...`);
    try {
      const response = await fetch(url, api.headers ? { headers: api.headers } : {});
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { console.warn(`⚠️ ${api.nome} não retornou JSON válido.`); continue; }
      if (!data.result && !data.matches) { console.warn(`⚠️ ${api.nome} não trouxe resultados.`); continue; }
      const jogos = data.result || data.matches || [];
      console.log(`✅ ${api.nome} retornou ${jogos.length} jogos.`);
      return jogos;
    } catch (err) {
      console.warn(`⚠️ Falha na ${api.nome}: ${err.message}`);
    }
  }
  console.error("❌ Todas as APIs falharam ou não retornaram resultados!");
  return null;
}

// 4️⃣ Função principal
async function superRoboMestrePro() {
  const dataHoje = new Date().toISOString().split("T")[0];
  const jogos = await coletarDados();
  if (!jogos) return;

  const estrutura = {};
  const greenDoDia = [];
  const risco = [];
  const comboio = [];

  jogos.forEach(jogo => {
    const pais = jogo.country_name || "Internacional";
    const liga = jogo.league_name || "Outras Ligas";

    if (!estrutura[pais]) estrutura[pais] = { nome: pais, bandeira: jogo.country_logo || null, ligas: {} };
    if (!estrutura[pais].ligas[liga]) estrutura[pais].ligas[liga] = { nome: liga, logo: jogo.league_logo || null, jogos: [] };

    // Palpites inteligentes
    let sugestao = "Análise Equilibrada";
    let tipo = "risco";

    if (jogo.odds) {
      const casa = parseFloat(jogo.odds.home_win);
      const fora = parseFloat(jogo.odds.away_win);
      if (!isNaN(casa) && !isNaN(fora)) {
        if (casa < fora && casa < 1.75) { sugestao = `🔥 Favorito: ${jogo.event_home_team}`; tipo = "green"; }
        else if (fora < casa && fora < 1.75) { sugestao = `🔥 Favorito: ${jogo.event_away_team}`; tipo = "green"; }
        else if (Math.abs(casa - fora) < 0.3) { sugestao = "⚖️ Empate Provável"; tipo = "comboio"; }
      }
    }

    const jogoItem = {
      time_casa: jogo.event_home_team || jogo.homeTeam?.name,
      escudo_casa: jogo.home_team_logo || jogo.homeTeam?.logo || null,
      time_fora: jogo.event_away_team || jogo.awayTeam?.name,
      escudo_fora: jogo.away_team_logo || jogo.awayTeam?.logo || null,
      horario: jogo.event_time || jogo.utcDate || "Indefinido",
      palpite: sugestao,
      status: jogo.event_status || jogo.status || "Agendado",
      resultado: jogo.event_final_result || null,
    };

    estrutura[pais].ligas[liga].jogos.push(jogoItem);

    if (tipo === "green") greenDoDia.push(jogoItem);
    else if (tipo === "comboio") comboio.push(jogoItem);
    else risco.push(jogoItem);
  });

  // Ordena por horário
  for (const pais in estrutura) for (const liga in estrutura[pais].ligas) estrutura[pais].ligas[liga].jogos.sort((a,b)=>a.horario.localeCompare(b.horario));

  // Salva no Firestore
  const dashboardDoc = db.collection("central_esportes").doc("dashboard_hoje");
  const historicoDoc = db.collection("central_esportes").doc(`historico_${dataHoje.replace(/-/g,"")}`);

  const dadosParaSalvar = { paises_ativos: estrutura, total_jogos: jogos.length, ultima_atualizacao: new Date().toLocaleString("pt-BR"), abas_site: { greenDoDia, risco, comboio }, seguranca: "Proteção Anti-Hacker Ativa" };

  await dashboardDoc.set(dadosParaSalvar);
  await historicoDoc.set(dadosParaSalvar);

  console.log("✅ Robô Ante Span multi-API: Dashboard atualizado com Green, Comboio e Risco!");
}

superRoboMestrePro();
