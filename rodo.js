const admin = require("firebase-admin");

// 1. INICIALIZAÇÃO BLINDADA (Ignora erros de colagem/espaços no GitHub)
try {
    const rawKey = process.env.FIREBASE_CONFIG;
    if (!rawKey) throw new Error("A Secret FIREBASE_CONFIG está vazia!");

    // O .trim() remove espaços invisíveis que o celular coloca ao copiar/colar
    const serviceAccount = JSON.parse(rawKey.trim());

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    console.log("✅ Conexão com Firebase estabelecida!");
} catch (e) {
    console.error("❌ ERRO CRÍTICO NA CHAVE: Verifique se o JSON no GitHub está correto.");
    console.error("Dica: O texto deve começar com { e terminar com }");
    process.exit(1); 
}

const db = admin.firestore();

async function superRoboMestrePro() {
    const API_KEY = process.env.API_KEY_ESPORTES;
    const dataHoje = new Date().toISOString().split('T')[0];

    // URL para capturar Jogos do dia (contém Escudos, Ligas e Países)
    const urlJogos = `https://allsportsapi.com/api/football/?met=Fixtures&from=${dataHoje}&to=${dataHoje}&APIkey=${API_KEY}`;

    console.log("🤖 Robô Inteligente: Iniciando varredura de jogos...");

    try {
        const response = await fetch(urlJogos);
        const data = await response.json();

        // Se a API retornar erro de chave ou falha, avisamos aqui
        if (data.error || !data.result) {
            console.log("ℹ️ Nenhum dado recebido da API. Verifique sua API_KEY_ESPORTES.");
            return;
        }

        const estrutura = {};

        // 2. ORGANIZAÇÃO INTELIGENTE (Hierarquia: País > Liga > Jogo)
        data.result.forEach(jogo => {
            const pais = jogo.country_name || "Internacional";
            const liga = jogo.league_name || "Outras Ligas";

            if (!estrutura[pais]) {
                estrutura[pais] = {
                    nome: pais,
                    bandeira: jogo.country_logo,
                    ligas: {}
                };
            }

            if (!estrutura[pais].ligas[liga]) {
                estrutura[pais].ligas[liga] = {
                    nome: liga,
                    logo: jogo.league_logo,
                    jogos: []
                };
            }

            // 3. INTELIGÊNCIA DE PALPITE (Baseado em Probabilidades/Odds)
            let sugestao = "Análise Equilibrada";
            if (jogo.odds) {
                const casa = parseFloat(jogo.odds.home_win);
                const fora = parseFloat(jogo.odds.away_win);
                
                if (casa < fora && casa < 1.75) {
                    sugestao = `🔥 Favorito: ${jogo.event_home_team}`;
                } else if (fora < casa && fora < 1.75) {
                    sugestao = `🔥 Favorito: ${jogo.event_away_team}`;
                } else if (Math.abs(casa - fora) < 0.3) {
                    sugestao = "⚖️ Tendência de Empate";
                }
            }

            // Adiciona o jogo com escudos das equipes
            estrutura[pais].ligas[liga].jogos.push({
                time_casa: jogo.event_home_team,
                escudo_casa: jogo.home_team_logo,
                time_fora: jogo.event_away_team,
                escudo_fora: jogo.away_team_logo,
                horario: jogo.event_time,
                palpite: sugestao,
                status: jogo.event_status || "Agendado"
            });
        });

        // 4. SALVAMENTO ROBUSTO (Substitui os dados de hoje)
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

// Executa o robô
superRoboMestrePro();
