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
// CHAVE GROK (xAI) — Leitura automática de OC por IA
// 1. Acesse: https://console.x.ai
// 2. Crie uma conta e vá em "API Keys"
// 3. Clique em "Create API Key", copie e cole abaixo
// Plano gratuito: US$25 de crédito inicial (suficiente para centenas de OCs)
// ============================================================
window.GROK_API_KEY = "xai-adROKtbz9GBo0Z2nE24A59GZoDIHDHYekNq8p4xxczxp6tPMnDoOiY4PbVR0kHAVSIBnQSjnUf7m61K7";  // ← Cole sua chave xAI aqui

