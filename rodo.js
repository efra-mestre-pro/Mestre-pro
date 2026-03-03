const admin = require('firebase-admin');

// Tenta ler a configuração com segurança
let serviceAccount;
try {
    const config = process.env.FIREBASE_CONFIG;
    if (!config) throw new Error("A variável FIREBASE_CONFIG está vazia!");
    serviceAccount = JSON.parse(config);
} catch (e) {
    console.error("❌ ERRO NA CHAVE FIREBASE:");
    console.error("O texto que você colou no GitHub Secrets não é um JSON válido.");
    console.error("Dica: Certifique-se de que colou o conteúdo do arquivo .json INTEIRO.");
    process.exit(1); // Para o robô aqui porque sem chave não há como salvar
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function coletarDados() {
  const apiKey = process.env.API_KEY_ESPORTES;
  const url = `https://allsportsapi.com/api/football/?met=Leagues&APIkey=${apiKey}`;

  console.log("Iniciando coleta...");

  try {
    const response = await fetch(url); // O Node 18 já tem fetch nativo
    const data = await response.json();

    await db.collection('dados_api').doc('ligas_futebol').set({
      conteudo: data,
      ultima_atualizacao: new Date().toISOString()
    });

    console.log("Sucesso! Dados salvos no Firebase.");
  } catch (error) {
    console.error("Erro na missão:", error);
    process.exit(1);
  }
}

coletarDados();
