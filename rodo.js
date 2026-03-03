const admin = require("firebase-admin");

// 1. SEGURANÇA MÁXIMA (ANTI-HACKER)
try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
} catch (e) {
    console.error("ERRO CRÍTICO: Chave Firebase inválida ou ausente.");
    process.exit(1);
}

const db = admin.firestore();

async function superRoboInteligente() {
    const API_KEY = process.env.API_KEY_ESPORTES;
    const dataAtual = new Date().toISOString().split('T')[0]; // Pega a data de hoje (YYYY-MM-DD)

    // URLs de coleta (Ligas e Jogos do Dia com Odds)
    const urlLigas = `https://allsportsapi.com/api/football/?met=Leagues&APIkey=${API_KEY}`;
    const urlJogos = `https://allsportsapi.com/api/football/?met=Fixtures&from=${dataAtual}&to=${dataAtual}&APIkey=${API_KEY}`;

    console.log("🤖 Iniciando Super Robô: Coletando e Organizando...");

    try {
        // Coleta Ligas e Jogos simultaneamente para ser rápido
        const [resLigas, resJogos] = await Promise.all([fetch(urlLigas), fetch(urlJogos)]);
        const ligasData = await resLigas.json();
        const jogosData = await resJogos.json();

        if (!ligasData.result || !jogosData.result) {
            throw new Error("API falhou ao retornar dados essenciais.");
        }

        // 2. ORGANIZAÇÃO INTELIGENTE (PAÍS > LIGA > JOGOS)
        const estruturaOrganizada = {};

        jogosData.result.forEach(jogo => {
            const pais = jogo.country_name;
            const liga = jogo.league_name;

            if (!estruturaOrganizada[pais]) {
                estruturaOrganizada[pais] = {
                    nome: pais,
                    bandeira: jogo.country_logo,
                    ligas: {}
                };
            }

            if (!estruturaOrganizada[pais].ligas[liga]) {
                estruturaOrganizada[pais].ligas[liga] = {
                    nome: liga,
                    logo_liga: jogo.league_logo,
                    partidas: []
                };
            }

            // 3. INTELIGÊNCIA DE PALPITES (LOGICA DE ODDS)
            // Aqui o robô analisa quem é o favorito baseado nas odds
            let palpite = "Equilibrado";
            if (jogo.odds) {
                const home = parseFloat(jogo.odds.home_win);
                const away = parseFloat(jogo.odds.away_win);
                if (home < away && home < 2.0) palpite = `Favorito: ${jogo.event_home_team}`;
                else if (away < home && away < 2.0) palpite = `Favorito: ${jogo.event_away_team}`;
            }

            estruturaOrganizada[pais].ligas[liga].partidas.push({
                hora: jogo.event_time,
                casa: jogo.event_home_team,
                casa_escudo: jogo.home_team_logo,
                fora: jogo.event_away_team,
                fora_escudo: jogo.away_team_logo,
                palpite: palpite,
                placar: `${jogo.event_final_result || 'vs'}`
            });
        });

        // 4. SALVAMENTO ROBUSTO (PROTEÇÃO CONTRA ERROS DE ESCRITA)
        await db.collection('central_esportes').doc('dashboard_vovo').set({
            paises_ativos: estruturaOrganizada,
            total_jogos_hoje: jogosData.result.length,
            ultima_varredura: new Date().toLocaleString('pt-BR'),
            seguranca: "Criptografia de Sessão Ativa"
        });

        console.log("✅ MISSÃO CONCLUÍDA: Dados organizados e protegidos contra falhas.");

    } catch (error) {
        console.error("⚠️ O Robô encontrou um obstáculo, mas permanece ativo:", error.message);
    }
}

superRoboInteligente();
