const admin = require("firebase-admin");

// CONFIGURAÇÃO ROBUSTA: Lê a Secret que você colou no GitHub
try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} catch (e) {
    console.error("❌ Erro na Chave: Verifique o formato do JSON no GitHub Secrets.");
    process.exit(1);
}

const db = admin.firestore();

async function roboMestrePro() {
    const API_KEY = process.env.API_KEY_ESPORTES;
    const dataHoje = new Date().toISOString().split('T')[0];

    // URLs para capturar Ligas e os Jogos (que contêm escudos e odds)
    const urlJogos = `https://allsportsapi.com/api/football/?met=Fixtures&from=${dataHoje}&to=${dataHoje}&APIkey=${API_KEY}`;

    console.log("🤖 Robô Mestre-Pro: Iniciando organização inteligente...");

    try {
        const response = await fetch(urlJogos);
        const data = await response.json();

        if (!data.result) {
            console.log("ℹ️ Nenhum jogo encontrado para hoje.");
            return;
        }

        const estrutura = {};

        // ORGANIZAÇÃO: País > Liga > Jogo (Com Escudos e Palpites)
        data.result.forEach(jogo => {
            const pais = jogo.country_name;
            const liga = jogo.league_name;

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

            // INTELIGÊNCIA DE PALPITE: Baseado nas Odds da API
            let sugestao = "Análise Pendente";
            if (jogo.odds) {
                const casa = parseFloat(jogo.odds.home_win);
                const fora = parseFloat(jogo.odds.away_win);
                if (casa < fora && casa < 1.8) sugestao = `Vitória: ${jogo.event_home_team}`;
                else if (fora < casa && fora < 1.8) sugestao = `Vitória: ${jogo.event_away_team}`;
            }

            estrutura[pais].ligas[liga].jogos.push({
                time_casa: jogo.event_home_team,
                escudo_casa: jogo.home_team_logo,
                time_fora: jogo.event_away_team,
                escudo_fora: jogo.away_team_logo,
                horario: jogo.event_time,
                palpite: sugestao
            });
        });

        // SALVAMENTO AUTOMÁTICO (Substitui os dados antigos pelos novos)
        await db.collection('dados_esportivos').doc('hoje').set({
            paises: estrutura,
            ultima_atualizacao: new Date().toISOString(),
            status: "Online"
        });

        console.log("✅ Dados organizados com sucesso no Firebase!");

    } catch (error) {
        console.error("⚠️ Falha na coleta, mas o robô segue ativo:", error.message);
    }
}

roboMestrePro();
