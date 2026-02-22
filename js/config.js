// ================================================================
// config.js — Configurações
// ================================================================

async function renderConfig() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
  <div class="page">
    <div class="page-header">
      <h1 class="page-title"><div class="page-title-icon">⚙</div>Configurações</h1>
    </div>

    <div class="dash-grid">
      <!-- Conta -->
      <div class="card">
        <div class="card-header"><span class="card-title-lg">👤 Conta</span></div>
        <div class="card-body">
          <div class="info-box" style="margin-bottom:14px">
            <strong>Email:</strong> ${App.user?.email||''}
          </div>
          <button class="btn btn-danger btn-sm" onclick="doLogout()">Sair da conta</button>
        </div>
      </div>

      <!-- Empresas Contratantes -->
      <div class="card">
        <div class="card-header">
          <span class="card-title-lg">🏢 Empresas Contratantes</span>
          <button class="btn btn-primary btn-sm" onclick="showNovaContratante()">+ Adicionar</button>
        </div>
        <div class="card-body" id="conts-list">
          <div class="page-loading"><div class="spinner"></div></div>
        </div>
      </div>
    </div>

    <!-- Sobre -->
    <div class="card" style="margin-top:4px">
      <div class="card-header"><span class="card-title-lg">ℹ Sobre o Sistema</span></div>
      <div class="card-body">
        <div style="font-size:13px;color:var(--text2);line-height:1.8">
          <strong>Marques Caetano · Gestão de Obras v2.0</strong><br>
          Firebase Firestore · GitHub Pages · SaaS ready<br><br>
          <strong>Regras de negócio ativas:</strong><br>
          ✓ Registros financeiros nunca deletados (estorno)<br>
          ✓ Saldo calculado dinamicamente<br>
          ✓ Planilha nova soma ao saldo da obra<br>
          ✓ Repasse = saída de recursos<br>
          ✓ OC impacta saldo imediatamente<br>
          ✓ Detecção de OC duplicada<br>
          ✓ Controle de presença com suporte a diaristas
        </div>
      </div>
    </div>

    <!-- Futuro: Controle de Usuários -->
    <div class="card" style="margin-top:12px;border:2px dashed var(--border2)">
      <div class="card-header"><span class="card-title-lg">🔒 Controle de Acesso <span class="tag" style="margin-left:8px">Em desenvolvimento</span></span></div>
      <div class="card-body">
        <div class="alert info no-click">
          <span class="alert-icon">🗺</span>
          <span><strong>Roadmap de permissões:</strong><br>
          • <strong>Administrador</strong> — acesso total<br>
          • <strong>Encarregado</strong> — acesso apenas às obras atribuídas; pode lançar despesas, presença e OC; não vê dashboard geral<br>
          • <strong>Visualizador</strong> — somente leitura, sem lançamentos<br><br>
          A estrutura de dados já está preparada com <code>empresa_id</code> em todas as coleções para suporte multiusuário.</span>
        </div>
      </div>
    </div>
  </div>`;

  // Carregar contratantes
  try {
    const snap = await empresaCol('empresas_contratantes').get();
    const conts = snap.docs.map(d=>({id:d.id,...d.data()}));
    document.getElementById('conts-list').innerHTML = conts.length===0
      ? '<div class="empty">Nenhuma cadastrada</div>'
      : conts.map(c=>`
        <div class="func-row">
          <div class="func-avatar" style="background:var(--blue-100);color:var(--blue-700)">🏢</div>
          <div class="func-info">
            <div class="func-name">${c.nome}</div>
            <div class="func-meta">${c.cnpj||'CNPJ não informado'}</div>
          </div>
        </div>`).join('');
  } catch(e) {
    document.getElementById('conts-list').innerHTML = '<div class="empty">Erro ao carregar</div>';
  }
}

async function showNovaContratante() {
  showModal({
    title: 'Nova Empresa Contratante',
    body: `
      <div class="form-group">
        <label class="form-label">Nome *</label>
        <input id="ct-nome" class="form-input" placeholder="Ex: ENGIX Construções">
      </div>
      <div class="form-group">
        <label class="form-label">CNPJ</label>
        <input id="ct-cnpj" class="form-input" placeholder="00.000.000/0000-00">
      </div>`,
    footer: `
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarContratante()">Salvar</button>`
  });
}

async function salvarContratante() {
  const nome = document.getElementById('ct-nome')?.value.trim();
  const cnpj = document.getElementById('ct-cnpj')?.value.trim();
  if (!nome) return App.toast('Informe o nome','error');
  App.loading(true);
  try {
    await addDoc2('empresas_contratantes', { nome, cnpj });
    closeModal();
    App.toast('Empresa contratante salva!');
    App.navigate('configuracoes');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.loading(false); }
}

window.renderConfig        = renderConfig;
window.showNovaContratante = showNovaContratante;
window.salvarContratante   = salvarContratante;
