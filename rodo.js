const admin = require('firebase-admin');

// Configuração via Secret do GitHub
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

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
