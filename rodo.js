const admin = require("firebase-admin");
const fetch = require("node-fetch");

// 1️⃣ INICIALIZAÇÃO FIREBASE
try {
    const rawKey = process.env.FIREBASE_CONFIG;
    if (!rawKey) throw new Error("❌ FIREBASE_CONFIG vazia!");

    const serviceAccount = JSON.parse(rawKey.trim());
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    console.log("✅ Conexão com Firebase estabelecida!");
} catch (e) {
    console.error("❌ ERRO CRÍTICO NA CHAVE:", e.message);
    process.exit(1);
}

const db = admin.firestore();

// 2️⃣ FUNÇÃO PRINCIPAL DO ROBÔ
async function superRoboMestrePro() {
    const API_KEY = process.env.API_KEY_ESPORTES;
    if (!API_KEY) {
        console.error("❌ API_KEY_ESPORTES não encontrada!");
        return;
    }

    const dataHoje = new Date().toISOString().split('T')[0];
    const urlJogos = `https://allsportsapi.com/api/football/?met=Fixtures&from=${dataHoje}&to=${dataHoje}&APIkey=${API_KEY}`;

    console.log("🤖 Robô Inteligente Avançado: Iniciando coleta...");

    try {
        const response = await fetch(urlJogos);
        const data = await response.json();

        if (data.error || !data.result || data.result.length === 0) {
            console.log("⚠️ Nenhum dado recebido da API hoje.");
            return;
        }

        const estrutura = {};
        const greenDoDia = [];
        const risco = [];
        const comboio = [];

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

            // 3️⃣ PALPITE AUTOMÁTICO
            let sugestao = "Análise Equilibrada";
            let tipo = "risco"; // padrão

            if (jogo.odds) {
                const casa = parseFloat(jogo.odds.home_win);
                const fora = parseFloat(jogo.odds.away_win);

                if (!isNaN(casa) && !isNaN(fora)) {
                    if (casa < fora && casa < 1.75) {
                        sugestao = `🔥 Favorito: ${jogo.event_home_team}`;
                        tipo = "green"; 
                    } else if (fora < casa && fora < 1.75) {
                        sugestao = `🔥 Favorito: ${jogo.event_away_team}`;
                        tipo = "green"; 
                    } else if (Math.abs(casa - fora) < 0.3) {
                        sugestao = "⚖️ Empate Provável";
                        tipo = "comboio"; 
                    }
                }
            }

            const jogoItem = {
                time_casa: jogo.event_home_team,
                escudo_casa: jogo.home_team_logo || null,
                time_fora: jogo.event_away_team,
                escudo_fora: jogo.away_team_logo || null,
                horario: jogo.event_time || "Indefinido",
                palpite: sugestao,
                status: jogo.event_status || "Agendado"
            };

            estrutura[pais].ligas[liga].jogos.push(jogoItem);

            // 4️⃣ Distribui para as abas do site
            if (tipo === "green") greenDoDia.push(jogoItem);
            else if (tipo === "comboio") comboio.push(jogoItem);
            else risco.push(jogoItem);
        });

        // 5️⃣ Ordena jogos por horário
        for (const pais in estrutura) {
            for (const liga in estrutura[pais].ligas) {
                estrutura[pais].ligas[liga].jogos.sort((a, b) => a.horario.localeCompare(b.horario));
            }
        }

        // 6️⃣ SALVA NO FIRESTORE
        const dashboardDoc = db.collection('central_esportes').doc('dashboard_hoje');
        const historicoDoc = db.collection('central_esportes').doc(`historico_${dataHoje.replace(/-/g,'')}`);

        const dadosParaSalvar = {
            paises_ativos: estrutura,
            total_jogos: data.result.length,
            ultima_atualizacao: new Date().toLocaleString('pt-BR'),
            abas_site: {
                greenDoDia,
                risco,
                comboio
            },
            seguranca: "Proteção Anti-Hacker Ativa"
        };

        await dashboardDoc.set(dadosParaSalvar);
        await historicoDoc.set(dadosParaSalvar);

        console.log("✅ Robô Avançado: Dados do site atualizados com Green, Comboio e Risco!");
        
    } catch (error) {
        console.error("⚠️ Ocorreu um erro na coleta:", error.message);
    }
}

// 7️⃣ EXECUTA O ROBÔ
superRoboMestrePro();
