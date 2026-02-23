// ================================================================
// app.js — Core: estado, roteamento, helpers, Firebase
// ================================================================

// ── Estado Global ─────────────────────────────────────────────
var App = {
  user: null,
  empresaId: EMPRESA_ID,
  page: 'dashboard',
  params: {},
  isAdmin: false,
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
  const basePlanilhas = planilhas
    .filter(p => p.obra_id === obra.id)
    .reduce((s, p) => s + (p.saldo_inicial || 0), 0);
  const base = (obra.saldo_inicial || 0) + basePlanilhas;
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

async function deleteDoc2(colName, id) {
  await empresaCol(colName).doc(id).delete();
}

async function loadAll() {
  const [obras, planilhas, funcionarios, lancamentos, ordens_compra, alocacoes] = await Promise.all([
    getAll('obras'), getAll('planilhas'), getAll('funcionarios'),
    getAll('lancamentos'), getAll('ordens_compra'), getAll('alocacoes', 'data_inicio'),
  ]);
  App.cache = { obras, planilhas, funcionarios, lancamentos, ordens_compra, alocacoes };
  return App.cache;
}

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

// ── Controle de Acesso ────────────────────────────────────────
async function checkAdmin(uid) {
  try {
    const snap = await empresaCol('usuarios').doc(uid).get();
    App.isAdmin = snap.exists && snap.data().admin === true;
  } catch(e) {
    App.isAdmin = false;
  }
}

// ── Auth ──────────────────────────────────────────────────────
auth.onAuthStateChanged(async user => {
  if (user) {
    App.user = user;
    await checkAdmin(user.uid);

    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';

    const email = user.email || '';
    const initials = email.substring(0, 2).toUpperCase();
    document.getElementById('sb-user-initials').textContent = initials;
    document.getElementById('sb-user-email').textContent    = email;

    // Mostrar/ocultar Configurações (só admin)
    document.querySelectorAll('[data-page="configuracoes"]').forEach(el => {
      el.style.display = App.isAdmin ? '' : 'none';
    });

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
    const erros = {
      'auth/user-not-found':'Usuário não encontrado.',
      'auth/wrong-password':'Senha incorreta.',
      'auth/invalid-email':'E-mail inválido.',
      'auth/user-disabled':'Conta desativada. Contate o administrador.',
      'auth/too-many-requests':'Muitas tentativas. Aguarde e tente novamente.',
      'auth/invalid-credential':'E-mail ou senha incorretos.',
      'auth/network-request-failed':'Erro de conexão. Verifique sua internet.'
    };
    App.toast(erros[e.code] || 'Erro ao entrar.', 'error');
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
  const overlay = document.getElementById('modal-overlay');

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

// ── Configurações (Admin) ─────────────────────────────────────
async function renderConfig(params = {}) {
  if (!App.isAdmin) {
    document.getElementById('main-content').innerHTML = `
      <div class="page"><div class="alert danger no-click"><span>⛔ Acesso restrito ao administrador.</span></div></div>`;
    return;
  }

  const main = document.getElementById('main-content');
  App.loading(true);
  try {
    const snap = await empresaCol('usuarios').get();
    const usuarios = snap.docs.map(d => ({ uid: d.id, ...d.data() }));

    main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title"><div class="page-title-icon">⚙️</div>Configurações</h1>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-header">
          <span class="card-title-lg">👥 Usuários do Sistema</span>
          <button class="btn btn-primary btn-sm" onclick="showNovoUsuario()">+ Adicionar</button>
        </div>
        <div class="card-body">
          ${usuarios.length === 0 ? '<div class="empty">Nenhum usuário cadastrado</div>' :
            usuarios.map(u => `
            <div class="func-row">
              <div class="func-avatar">${(u.email||'?').substring(0,2).toUpperCase()}</div>
              <div class="func-info">
                <div class="func-name">${u.nome || u.email || u.uid}</div>
                <div class="func-meta">${u.email || ''} · ${u.admin ? '<strong style="color:var(--blue-600)">Administrador</strong>' : 'Usuário comum'}</div>
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                ${u.uid !== App.user?.uid ? `
                  <button class="btn btn-secondary btn-sm" onclick="showEditarUsuario('${u.uid}','${(u.nome||'').replace(/'/g,'&apos;')}','${u.email||''}',${!!u.admin})">Editar</button>
                  <button class="btn btn-danger btn-sm" onclick="excluirUsuario('${u.uid}','${(u.nome||u.email||'').replace(/'/g,'&apos;')}')">Remover</button>
                ` : `<span class="tag blue">Você</span>`}
              </div>
            </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title-lg">ℹ️ Como adicionar usuários</span></div>
        <div class="card-body">
          <div style="font-size:13px;color:var(--text2);line-height:1.8">
            <p><strong>Passo 1:</strong> Acesse o <a href="https://console.firebase.google.com" target="_blank" style="color:var(--blue-600)">Firebase Console</a> → Authentication → Add user. Crie o e-mail e senha do novo usuário.</p>
            <p><strong>Passo 2:</strong> Copie o <strong>UID</strong> do usuário criado (coluna "User UID").</p>
            <p><strong>Passo 3:</strong> Clique em <strong>"+ Adicionar"</strong> aqui, cole o UID e defina o nível de acesso.</p>
            <p><strong>Usuário comum:</strong> acessa todas as telas operacionais (obras, lançamentos, funcionários, OCs).</p>
            <p><strong>Administrador:</strong> acesso total, incluindo gerenciamento de usuários.</p>
          </div>
        </div>
      </div>
    </div>`;
  } finally {
    App.loading(false);
  }
}

async function showNovoUsuario() {
  showModal({
    title: 'Adicionar Usuário',
    body: `
      <div class="alert info no-click">
        <span class="alert-icon">ℹ</span>
        <span>Crie o usuário primeiro no Firebase Authentication, depois registre-o aqui com o UID.</span>
      </div>
      <div class="form-group">
        <label class="form-label">Nome *</label>
        <input id="nu-nome" class="form-input" placeholder="Nome completo do usuário">
      </div>
      <div class="form-group">
        <label class="form-label">E-mail *</label>
        <input id="nu-email" class="form-input" type="email" placeholder="email@exemplo.com">
      </div>
      <div class="form-group">
        <label class="form-label">UID do Firebase Auth *</label>
        <input id="nu-uid" class="form-input" placeholder="Cole o UID do Firebase Console">
        <div class="form-hint">Firebase Console → Authentication → usuário → UID</div>
      </div>
      <div class="form-group">
        <label class="form-label">Nível de Acesso</label>
        <select id="nu-admin" class="form-input">
          <option value="false">Usuário comum</option>
          <option value="true">Administrador</option>
        </select>
      </div>`,
    footer: `
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarNovoUsuario()">Adicionar</button>`
  });
}

async function salvarNovoUsuario() {
  const nome  = document.getElementById('nu-nome').value.trim();
  const email = document.getElementById('nu-email').value.trim();
  const uid   = document.getElementById('nu-uid').value.trim();
  const admin = document.getElementById('nu-admin').value === 'true';
  if (!nome || !email || !uid) return App.toast('Preencha todos os campos', 'error');
  App.loading(true);
  try {
    await empresaCol('usuarios').doc(uid).set({
      nome, email, admin,
      empresa_id: App.empresaId,
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
    });
    closeModal();
    App.toast(`Usuário ${nome} adicionado!`);
    App.navigate('configuracoes');
  } catch(e) { App.toast('Erro: '+e.message, 'error'); }
  finally { App.loading(false); }
}

async function showEditarUsuario(uid, nome, email, isAdmin) {
  showModal({
    title: 'Editar Usuário',
    body: `
      <div class="form-group">
        <label class="form-label">Nome *</label>
        <input id="eu-nome" class="form-input" value="${nome}">
      </div>
      <div class="form-group">
        <label class="form-label">E-mail</label>
        <input class="form-input" value="${email}" disabled style="opacity:.6">
      </div>
      <div class="form-group">
        <label class="form-label">Nível de Acesso</label>
        <select id="eu-admin" class="form-input">
          <option value="false" ${!isAdmin?'selected':''}>Usuário comum</option>
          <option value="true"  ${isAdmin?'selected':''}>Administrador</option>
        </select>
      </div>`,
    footer: `
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarEdicaoUsuario('${uid}')">Salvar</button>`
  });
}

async function salvarEdicaoUsuario(uid) {
  const nome  = document.getElementById('eu-nome').value.trim();
  const admin = document.getElementById('eu-admin').value === 'true';
  if (!nome) return App.toast('Informe o nome', 'error');
  App.loading(true);
  try {
    await empresaCol('usuarios').doc(uid).update({ nome, admin, updated_at: firebase.firestore.FieldValue.serverTimestamp() });
    closeModal();
    App.toast('Usuário atualizado!');
    App.navigate('configuracoes');
  } catch(e) { App.toast('Erro: '+e.message, 'error'); }
  finally { App.loading(false); }
}

async function excluirUsuario(uid, nome) {
  if (!confirm(`Remover "${nome}" do sistema?\n(A conta no Firebase Auth permanece.)`) ) return;
  App.loading(true);
  try {
    await empresaCol('usuarios').doc(uid).delete();
    App.toast('Usuário removido.');
    App.navigate('configuracoes');
  } catch(e) { App.toast('Erro: '+e.message, 'error'); }
  finally { App.loading(false); }
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
window.deleteDoc2        = deleteDoc2;
window.loadAll           = loadAll;
window.estornarLancamento = estornarLancamento;
window.doLogin    = doLogin;
window.doLogout   = doLogout;
window.showModal  = showModal;
window.closeModal = closeModal;
window.renderConfig        = renderConfig;
window.showNovoUsuario     = showNovoUsuario;
window.salvarNovoUsuario   = salvarNovoUsuario;
window.showEditarUsuario   = showEditarUsuario;
window.salvarEdicaoUsuario = salvarEdicaoUsuario;
window.excluirUsuario      = excluirUsuario;
