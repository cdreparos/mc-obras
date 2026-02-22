// ================================================================
// app.js — Core: estado, roteamento, helpers, Firebase
// ================================================================

// ── Estado Global ─────────────────────────────────────────────
const App = {
  user: null,
  empresaId: EMPRESA_ID,
  page: 'dashboard',
  params: {},
  cache: { obras:[], planilhas:[], funcionarios:[], lancamentos:[], ordens_compra:[], alocacoes:[] },

  navigate(page, params = {}) {
    this.page   = page;
    this.params = params;
    updateNav(page);
    renderPage(page, params);
    window.scrollTo(0, 0);
  },

  toast(msg, type = 'success') {
    const wrap = document.getElementById('toast-wrap');
    const icons = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type]||'•'}</span><span class="toast-msg">${msg}</span>`;
    wrap.appendChild(el);
    requestAnimationFrame(() => { requestAnimationFrame(() => el.classList.add('show')); });
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3500);
  },

  loading(v) {
    document.getElementById('loading-overlay').style.display = v ? 'flex' : 'none';
  }
};

// ── Formatters ────────────────────────────────────────────────
const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v || 0);
const fmtDate = d => {
  if (!d) return '-';
  try { const dt = d?.toDate ? d.toDate() : new Date(d); return dt.toLocaleDateString('pt-BR'); }
  catch { return d; }
};
const today = () => new Date().toISOString().split('T')[0];
const mes = () => ({ mes: new Date().getMonth()+1, ano: new Date().getFullYear() });

// ── Cálculo de Saldos ─────────────────────────────────────────
// REGRA: saldo_obra = saldo_inicial_obra + SUM(saldo_inicial_planilhas) - despesas + receitas
// Cada planilha criada ADICIONA ao saldo da obra.
// Despesas: se tem planilha_id → saem do saldo da planilha (e consequentemente da obra)
//           se não tem planilha_id → saem direto da obra

function calcSaldoPlanilha(planilha, lancamentos) {
  const despesas = lancamentos
    .filter(l => l.planilha_id === planilha.id && l.status === 'ativo' && l.tipo === 'despesa')
    .reduce((s, l) => s + (l.valor || 0), 0);
  const receitas = lancamentos
    .filter(l => l.planilha_id === planilha.id && l.status === 'ativo' && l.tipo === 'receita')
    .reduce((s, l) => s + (l.valor || 0), 0);
  return (planilha.saldo_inicial || 0) - despesas + receitas;
}

function calcSaldoObra(obra, planilhas, lancamentos) {
  // Saldo base = obra + todas planilhas
  const basePlanilhas = planilhas
    .filter(p => p.obra_id === obra.id)
    .reduce((s, p) => s + (p.saldo_inicial || 0), 0);
  const base = (obra.saldo_inicial || 0) + basePlanilhas;

  // Todas as despesas e receitas da obra
  const despesas = lancamentos
    .filter(l => l.obra_id === obra.id && l.status === 'ativo' && l.tipo === 'despesa')
    .reduce((s, l) => s + (l.valor || 0), 0);
  const receitas = lancamentos
    .filter(l => l.obra_id === obra.id && l.status === 'ativo' && l.tipo === 'receita')
    .reduce((s, l) => s + (l.valor || 0), 0);

  return base - despesas + receitas;
}

// ── Firebase Helpers ──────────────────────────────────────────
const empresaCol = sub => db.collection(`empresas/${App.empresaId}/${sub}`);

async function getAll(colName, orderField = 'created_at') {
  try {
    const snap = await empresaCol(colName).orderBy(orderField, 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {
    const snap = await empresaCol(colName).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
}

async function addDoc2(colName, data) {
  const ref = await empresaCol(colName).add({
    ...data,
    empresa_id: App.empresaId,
    created_at: firebase.firestore.FieldValue.serverTimestamp(),
    updated_at: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function updateDoc2(colName, id, data) {
  await empresaCol(colName).doc(id).update({
    ...data,
    updated_at: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function loadAll() {
  const [obras, planilhas, funcionarios, lancamentos, ordens_compra, alocacoes] = await Promise.all([
    getAll('obras'), getAll('planilhas'), getAll('funcionarios'),
    getAll('lancamentos'), getAll('ordens_compra'), getAll('alocacoes', 'data_inicio'),
  ]);
  App.cache = { obras, planilhas, funcionarios, lancamentos, ordens_compra, alocacoes };
  return App.cache;
}

// REGRA: nunca deletar — apenas estornar
async function estornarLancamento(lancId) {
  const docRef = empresaCol('lancamentos').doc(lancId);
  const snap   = await docRef.get();
  if (!snap.exists) return;
  const l = snap.data();

  await docRef.update({ status: 'estornado' });
  await addDoc2('lancamentos', {
    obra_id:    l.obra_id,
    planilha_id: l.planilha_id || null,
    tipo:       l.tipo === 'despesa' ? 'receita' : 'despesa',
    categoria:  l.categoria,
    valor:      l.valor,
    descricao:  `[ESTORNO] ${l.descricao}`,
    origem:     l.origem,
    origem_ref_id: lancId,
    status:     'ativo',
  });
}

// ── Auth ──────────────────────────────────────────────────────
auth.onAuthStateChanged(user => {
  if (user) {
    App.user = user;
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';
    // Preencher info do usuário
    const email = user.email || '';
    const initials = email.substring(0, 2).toUpperCase();
    document.getElementById('sb-user-initials').textContent = initials;
    document.getElementById('sb-user-email').textContent    = email;
    App.navigate('dashboard');
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-shell').style.display    = 'none';
  }
});

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) return App.toast('Preencha e-mail e senha', 'error');
  App.loading(true);
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch(e) {
    const erros = {'auth/user-not-found':'Usuário não encontrado.','auth/wrong-password':'Senha incorreta.','auth/invalid-email':'E-mail inválido.','auth/user-disabled':'Conta desativada. Contate o administrador.','auth/too-many-requests':'Muitas tentativas. Aguarde e tente novamente.','auth/invalid-credential':'E-mail ou senha incorretos.','auth/network-request-failed':'Erro de conexão. Verifique sua internet.'};
    const msg = erros[e.code] || 'Erro ao entrar. Verifique seus dados.';
    App.toast(msg, 'error');
    document.getElementById('login-error').textContent = erros[e.code] || e.message;
  } finally {
    App.loading(false);
  }
}

async function doLogout() {
  if (confirm('Sair da conta?')) await auth.signOut();
}

// ── Roteamento ────────────────────────────────────────────────
function renderPage(page, params = {}) {
  const main = document.getElementById('main-content');
  main.innerHTML = `<div class="page-loading"><div class="spinner"></div><span>Carregando...</span></div>`;

  // Atualizar topbar title
  const titles = {
    dashboard:'Dashboard', obras:'Obras', obra_detail:'Detalhe da Obra',
    planilhas:'Planilhas', funcionarios:'Funcionários', presenca:'Controle de Presença',
    ordens_compra:'Ordens de Compra', lancamentos:'Lançamentos', configuracoes:'Configurações'
  };
  document.getElementById('topbar-title').textContent = titles[page] || page;

  const map = {
    dashboard:     renderDashboard,
    obras:         renderObras,
    obra_detail:   renderObraDetail,
    planilhas:     renderPlanilhas,
    funcionarios:  renderFuncionarios,
    presenca:      renderPresenca,
    ordens_compra: renderOC,
    lancamentos:   renderLancamentos,
    configuracoes: renderConfig,
  };

  const fn = map[page];
  if (fn) fn(params).catch(e => {
    main.innerHTML = `<div class="alert danger no-click" style="margin:20px"><span>Erro: ${e.message}</span></div>`;
    console.error(e);
  });
}

function updateNav(page) {
  const allItems = document.querySelectorAll('[data-page]');
  allItems.forEach(el => {
    const p = el.dataset.page;
    el.classList.toggle('active', p === page || (page === 'obra_detail' && p === 'obras'));
  });
}

// ── Modal Helpers ─────────────────────────────────────────────
function showModal(opts = {}) {
  // opts: { title, body, footer, centered, wide }
  const overlay = document.getElementById('modal-overlay');
  if (opts.centered) overlay.classList.add('centered');
  else overlay.classList.remove('centered');

  overlay.innerHTML = `
    <div class="modal${opts.wide ? ' modal-wide' : ''}" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title">${opts.title || ''}</div>
        <button class="btn btn-ghost btn-sm" onclick="closeModal()" style="padding:6px;border-radius:8px">✕</button>
      </div>
      <div class="modal-body">${opts.body || ''}</div>
      ${opts.footer ? `<div class="modal-footer">${opts.footer}</div>` : ''}
    </div>`;

  overlay.style.display = 'flex';
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

// Expor globalmente
window.App        = App;
window.fmt        = fmt;
window.fmtDate    = fmtDate;
window.today      = today;
window.mes        = mes;
window.calcSaldoPlanilha = calcSaldoPlanilha;
window.calcSaldoObra     = calcSaldoObra;
window.empresaCol        = empresaCol;
window.getAll            = getAll;
window.addDoc2           = addDoc2;
window.updateDoc2        = updateDoc2;
window.loadAll           = loadAll;
window.estornarLancamento = estornarLancamento;
window.doLogin    = doLogin;
window.doLogout   = doLogout;
window.showModal  = showModal;
window.closeModal = closeModal;
