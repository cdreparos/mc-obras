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
// CHAVE GEMINI — Leitura automática de OC por IA
// Obtenha GRATUITAMENTE em: https://aistudio.google.com/app/apikey
// Crie uma chave, copie e cole abaixo entre as aspas
// Plano gratuito: 1.500 leituras/dia
// ============================================================
window.GEMINI_API_KEY = "AIzaSyCrWSckPmD3vfZTi5Y02AEqBEq4R4Dw2XM";  // ← Cole sua chave aqui

