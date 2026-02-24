// ============================================================
// firebase-config.js
// Configure aqui suas credenciais do Firebase
// Obtenha em: https://console.firebase.google.com
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyArH4B84JxGLVoVqIzHSMqdmakbLIlaWTA",
  authDomain: "marques-caetano-obras.firebaseapp.com",
  projectId: "marques-caetano-obras",
  storageBucket: "marques-caetano-obras.firebasestorage.app",
  messagingSenderId: "953286188179",
  appId: "1:953286188179:web:397348af439807970a8166"
};

// Inicialização
firebase.initializeApp(firebaseConfig);

const db      = firebase.firestore();
const auth    = firebase.auth();
const storage = firebase.storage();

// Empresa padrão (multiempresa ready)
const EMPRESA_ID = "marques-caetano";

// ============================================================
// CHAVE OPENROUTER — Leitura automática de OC por IA (GRATUITO)
// 1. Acesse: https://openrouter.ai  e crie uma conta gratuita
// 2. Vá em: https://openrouter.ai/keys  e clique em "Create Key"
// 3. Copie a chave e cole abaixo entre as aspas
// Modelo usado: Llama 3.2 Vision (Meta) — 100% gratuito
// Limite: 20 req/min, sem custo — mais que suficiente para OCs
// ============================================================
window.OPENROUTER_API_KEY = "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";  // ← Cole sua chave aqui
