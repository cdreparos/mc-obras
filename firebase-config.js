// ============================================================
// firebase-config.js — Configure suas credenciais aqui
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyArH4B84JxGLVoVqIzHSMqdmakbLIlaWTA",
  authDomain: "marques-caetano-obras.firebaseapp.com",
  projectId: "marques-caetano-obras",
  storageBucket: "marques-caetano-obras.firebasestorage.app",
  messagingSenderId: "953286188179",
  appId: "1:953286188179:web:397348af439807970a8166"
};

firebase.initializeApp(firebaseConfig);

const db      = firebase.firestore();
const auth    = firebase.auth();
const storage = firebase.storage();

const EMPRESA_ID = "marques-caetano";

// ============================================================
// CHAVE MISTRAL AI — Leitura automática de OC por IA
// 1. Acesse https://console.mistral.ai e crie conta (sem cartão)
// 2. Vá em "API Keys" → "Create new key"
// 3. Cole a chave abaixo entre as aspas
// ============================================================
window.MISTRAL_API_KEY = "77zXtTFrsX7xqv1Zs74mftMKBoSmU0D9";  // ← Cole sua chave aqui
