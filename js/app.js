// ============================================================
// app.js — Core: estado, roteamento, helpers globais
// ============================================================

// ─── Estado global ───────────────────────────────────────────
const App = {
  user: null,
  empresaId: EMPRESA_ID,
  currentPage: 'dashboard',
  cache: {
    obras: [], planilhas: [], funcionarios: [],
    lancamentos: [], ordens_compra: [], alocacoes: []
  },

  // Navegar entre páginas
  navigate(page, params = {}) {
    this.currentPage = page;
    this.params = params;
    renderPage(page, params);
    updateNav(page);
    window.scrollTo(0, 0);
  },

  // Toast notifications
  toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : '!'}</span>${msg}`;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
  },

  // Loading
  setLoading(v) {
    document.getElementById('loading-overlay').style.display = v ? 'flex' : 'none';
  }
};

// ─── Helpers financeiros ──────────────────────────────────────
const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = d => {
  if (!d) return '-';
  const dt = d.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString('pt-BR');
};
const today = () => new Date().toISOString().split('T')[0];
const mesAtual = () => { const n = new Date(); return { mes: n.getMonth() + 1, ano: n.getFullYear() }; };

function calcSaldoPlanilha(planilha, lancamentos) {
  const gastos = lancamentos
    .filter(l => l.planilha_id === planilha.id && l.status === 'ativo' && l.tipo === 'despesa')
    .reduce((s, l) => s + (l.valor || 0), 0);
  const receitas = lancamentos
    .filter(l => l.planilha_id === planilha.id && l.status === 'ativo' && l.tipo === 'receita')
    .reduce((s, l) => s + (l.valor || 0), 0);
  return (planilha.saldo_inicial || 0) - gastos + receitas;
}

function calcSaldoObra(obra, lancamentos) {
  const gastos = lancamentos
    .filter(l => l.obra_id === obra.id && l.status === 'ativo' && l.tipo === 'despesa')
    .reduce((s, l) => s + (l.valor || 0), 0);
  const receitas = lancamentos
    .filter(l => l.obra_id === obra.id && l.status === 'ativo' && l.tipo === 'receita')
    .reduce((s, l) => s + (l.valor || 0), 0);
  return (obra.saldo_inicial || 0) - gastos + receitas;
}

// ─── Roteamento ───────────────────────────────────────────────
function renderPage(page, params = {}) {
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  const pages = {
    dashboard:    renderDashboard,
    obras:        renderObras,
    obra_detail:  renderObraDetail,
    planilhas:    renderPlanilhas,
    funcionarios: renderFuncionarios,
    ordens_compra: renderOC,
    lancamentos:  renderLancamentos,
    configuracoes: renderConfiguracoes,
  };

  const fn = pages[page];
  if (fn) fn(params).catch(e => {
    main.innerHTML = `<div class="error-box">Erro ao carregar: ${e.message}</div>`;
    console.error(e);
  });
}

function updateNav(page) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page || 
      (page === 'obra_detail' && el.dataset.page === 'obras'));
  });
}

// ─── Auth ─────────────────────────────────────────────────────
auth.onAuthStateChanged(user => {
  if (user) {
    App.user = user;
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';
    App.navigate('dashboard');
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-shell').style.display = 'none';
  }
});

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) return App.toast('Preencha email e senha', 'error');
  try {
    App.setLoading(true);
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    App.toast('Login inválido: ' + e.message, 'error');
  } finally {
    App.setLoading(false);
  }
}

async function doLogout() {
  await auth.signOut();
}

// ─── Firestore helpers ────────────────────────────────────────
const col = path => db.collection(path);
const empresaCol = sub => col(`empresas/${App.empresaId}/${sub}`);

async function getAll(colName) {
  const snap = await empresaCol(colName).orderBy('created_at', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addDoc(colName, data) {
  const ref = await empresaCol(colName).add({
    ...data,
    empresa_id: App.empresaId,
    created_at: firebase.firestore.FieldValue.serverTimestamp(),
    updated_at: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function updateDoc(colName, id, data) {
  await empresaCol(colName).doc(id).update({
    ...data,
    updated_at: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

// NUNCA deletar — apenas cancelar com estorno
async function cancelarLancamento(id) {
  const doc = await empresaCol('lancamentos').doc(id).get();
  if (!doc.exists) return;
  const l = doc.data();
  // Estornar
  await empresaCol('lancamentos').doc(id).update({ status: 'estornado' });
  // Lançamento inverso
  await addDoc('lancamentos', {
    obra_id: l.obra_id,
    planilha_id: l.planilha_id || null,
    tipo: l.tipo === 'despesa' ? 'receita' : 'despesa',
    categoria: l.categoria,
    valor: l.valor,
    descricao: `[ESTORNO] ${l.descricao}`,
    origem: l.origem,
    origem_ref_id: id,
    status: 'ativo',
  });
  App.toast('Lançamento estornado com sucesso');
}

// ─── Data loader ──────────────────────────────────────────────
async function loadAllData() {
  const [obras, planilhas, funcionarios, lancamentos, ordens_compra, alocacoes] = await Promise.all([
    getAll('obras'),
    getAll('planilhas'),
    getAll('funcionarios'),
    getAll('lancamentos'),
    getAll('ordens_compra'),
    getAll('alocacoes'),
  ]);
  App.cache = { obras, planilhas, funcionarios, lancamentos, ordens_compra, alocacoes };
  return App.cache;
}

// ─── Modal helper ─────────────────────────────────────────────
function showModal(html, onShow) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      ${html}
    </div>`;
  overlay.style.display = 'flex';
  overlay.onclick = () => closeModal();
  if (onShow) onShow();
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

// Expor globalmente
window.App = App;
window.closeModal = closeModal;
window.showModal = showModal;
window.fmt = fmt;
window.fmtDate = fmtDate;
