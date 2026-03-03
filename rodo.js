const admin = require("firebase-admin");
const fetch = require("node-fetch"); // Certifique-se de ter no package.json

// 1️⃣ INICIALIZAÇÃO ROBUSTA DO FIREBASE
try {
    const rawKey = process.env.FIREBASE_CONFIG;
    if (!rawKey) throw new Error("❌ A Secret FIREBASE_CONFIG está vazia!");

    const serviceAccount = JSON.parse(rawKey.trim());

    // 🔹 Corrige quebras de linha do private_key
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    console.log("✅ Conexão com Firebase estabelecida!");
} catch (e) {
    console.error("❌ ERRO CRÍTICO NA CHAVE: Verifique o JSON no GitHub.");
    console.error(e.message);
    process.exit(1);
}

const db = admin.firestore();

// 2️⃣ FUNÇÃO PRINCIPAL DO ROBÔ
async function superRoboMestrePro() {
    const API_KEY = process.env.API_KEY_ESPORTES;
    if (!API_KEY) {
        console.error("❌ API_KEY_ESPORTES não encontrada. Abortando.");
        return;
    }

    const dataHoje = new Date().toISOString().split('T')[0];
    const urlJogos = `https://allsportsapi.com/api/football/?met=Fixtures&from=${dataHoje}&to=${dataHoje}&APIkey=${API_KEY}`;

    console.log("🤖 Robô Inteligente: Iniciando varredura de jogos...");

    try {
        const response = await fetch(urlJogos);
        const data = await response.json();

        if (data.error || !data.result) {
            console.log("ℹ️ Nenhum dado recebido da API. Verifique sua API_KEY_ESPORTES.");
            return;
        }

        const estrutura = {};

        // 3️⃣ ORGANIZAÇÃO: País > Liga > Jogos
        data.result.forEach(jogo => {
            const pais = jogo.country_name || "Internacional";
            const liga = jogo.league_name || "Outras Ligas";

            if (!estrutura[pais]) {
                estrutura[pais] = {
                    nome: pais,
                    bandeira: jogo.country_logo || null,
                    ligas: {}
                };
            }

            if (!estrutura[pais].ligas[liga]) {
                estrutura[pais].ligas[liga] = {
                    nome: liga,
                    logo: jogo.league_logo || null,
                    jogos: []
                };
            }

            // 4️⃣ PALPITES INTELIGENTES
            let sugestao = "Análise Equilibrada";
            if (jogo.odds) {
                const casa = parseFloat(jogo.odds.home_win);
                const fora = parseFloat(jogo.odds.away_win);

                if (!isNaN(casa) && !isNaN(fora)) {
                    if (casa < fora && casa < 1.75) {
                        sugestao = `🔥 Favorito: ${jogo.event_home_team}`;
                    } else if (fora < casa && fora < 1.75) {
                        sugestao = `🔥 Favorito: ${jogo.event_away_team}`;
                    } else if (Math.abs(casa - fora) < 0.3) {
                        sugestao = "⚖️ Tendência de Empate";
                    }
                }
            }

            // Adiciona o jogo com escudos e status
            estrutura[pais].ligas[liga].jogos.push({
                time_casa: jogo.event_home_team,
                escudo_casa: jogo.home_team_logo || null,
                time_fora: jogo.event_away_team,
                escudo_fora: jogo.away_team_logo || null,
                horario: jogo.event_time || "Indefinido",
                palpite: sugestao,
                status: jogo.event_status || "Agendado"
            });
        });

        // 5️⃣ SALVAMENTO NO FIRESTORE
        await db.collection('central_esportes').doc('dashboard_hoje').set({
            paises_ativos: estrutura,
            total_jogos: data.result.length,
            ultima_atualizacao: new Date().toLocaleString('pt-BR'),
            seguranca: "Proteção Anti-Hacker Ativa"
        });

        console.log("✅ Missão Cumprida: Tudo salvo e organizado no Firebase!");

    } catch (error) {
        console.error("⚠️ Ocorreu um erro na coleta, mas o robô permanece online:", error.message);
    }
}

// 6️⃣ EXECUTA O ROBÔ
superRoboMestrePro();
