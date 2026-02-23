// ================================================================
// config.js — Configurações (Admin: usuários + contratantes)
// ================================================================

async function renderConfig() {
  if (App.perfil !== 'admin') {
    document.getElementById('main-content').innerHTML = `
      <div class="page"><div class="alert danger no-click"><span>⛔ Acesso restrito ao administrador.</span></div></div>`;
    return;
  }

  const main = document.getElementById('main-content');
  App.loading(true);
  try {
    const [usuariosSnap, contsSnap, todasObras] = await Promise.all([
      empresaCol('usuarios').get(),
      empresaCol('empresas_contratantes').get(),
      getAll('obras'),
    ]);

    const usuarios = usuariosSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
    const conts    = contsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const badgePerfil = p => ({
      admin:        '<span class="badge ativa" style="background:var(--blue-600);color:#fff">🔑 Admin</span>',
      encarregado:  '<span class="badge" style="background:var(--warning);color:#fff">🦺 Encarregado</span>',
      visualizador: '<span class="badge">👁 Visualizador</span>',
    }[p] || '<span class="badge">—</span>');

    main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title"><div class="page-title-icon">⚙️</div>Configurações</h1>
      </div>

      <!-- USUÁRIOS -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">
          <span class="card-title-lg">👥 Usuários do Sistema</span>
          <button class="btn btn-primary btn-sm" onclick="showNovoUsuario()">+ Adicionar</button>
        </div>
        <div class="card-body">
          ${usuarios.length === 0
            ? '<div class="empty">Nenhum usuário cadastrado</div>'
            : usuarios.map(u => {
                const perfil    = u.admin === true ? 'admin' : (u.perfil || 'visualizador');
                const obrasNomes = (u.obra_ids || [])
                  .map(id => todasObras.find(o => o.id === id)?.nome || id)
                  .join(', ');
                return `
                <div class="func-row" style="align-items:flex-start;flex-wrap:wrap;gap:10px">
                  <div class="func-avatar">${(u.email||'?').substring(0,2).toUpperCase()}</div>
                  <div class="func-info" style="flex:1;min-width:160px">
                    <div class="func-name">${u.nome || u.email || u.uid}</div>
                    <div class="func-meta">${u.email || ''}</div>
                    <div style="margin-top:4px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                      ${badgePerfil(perfil)}
                      ${perfil === 'encarregado' && obrasNomes
                        ? `<span class="tag blue" style="font-size:10px">📍 ${obrasNomes}</span>`
                        : ''}
                    </div>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
                    ${u.uid !== App.user?.uid
                      ? `<button class="btn btn-secondary btn-sm" onclick="showEditarUsuario('${u.uid}')">Editar</button>
                         <button class="btn btn-danger btn-sm" onclick="excluirUsuario('${u.uid}','${(u.nome||u.email||'').replace(/'/g,'&apos;')}')">Remover</button>`
                      : `<span class="tag blue">Você</span>`}
                  </div>
                </div>`;
              }).join('')}
        </div>
      </div>

      <!-- EMPRESAS CONTRATANTES -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">
          <span class="card-title-lg">🏢 Empresas Contratantes</span>
          <button class="btn btn-primary btn-sm" onclick="showNovaContratante()">+ Adicionar</button>
        </div>
        <div class="card-body">
          ${conts.length === 0
            ? '<div class="empty">Nenhuma cadastrada</div>'
            : conts.map(c => `
              <div class="func-row">
                <div class="func-avatar" style="background:var(--blue-100);color:var(--blue-700)">🏢</div>
                <div class="func-info">
                  <div class="func-name">${c.nome}</div>
                  <div class="func-meta">${c.cnpj || 'CNPJ não informado'}</div>
                </div>
              </div>`).join('')}
        </div>
      </div>

      <!-- PERFIS INFO -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><span class="card-title-lg">📖 Perfis de Acesso</span></div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:12px;font-size:13px;color:var(--text2)">
            <div style="padding:12px;background:var(--blue-50,#eff6ff);border-radius:10px;border-left:3px solid var(--blue-600)">
              <div style="font-weight:700;margin-bottom:4px">🔑 Administrador</div>
              <div>Acesso total — todas as telas, criação, edição, exclusão e configurações.</div>
            </div>
            <div style="padding:12px;background:#fffbeb;border-radius:10px;border-left:3px solid var(--warning)">
              <div style="font-weight:700;margin-bottom:4px">🦺 Encarregado</div>
              <div>Acessa <strong>Obras atribuídas, Funcionários, Presença e Lançamentos</strong>. Pode lançar despesas e OCs, criar funcionários e alocá-los. Não vê Dashboard geral nem dados de outras obras.</div>
            </div>
            <div style="padding:12px;background:#f0fdf4;border-radius:10px;border-left:3px solid var(--success)">
              <div style="font-weight:700;margin-bottom:4px">👁 Visualizador</div>
              <div>Acessa <strong>Dashboard, Obras e Planilhas</strong> somente para consulta. Não pode criar, editar ou lançar nada.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- COMO ADICIONAR -->
      <div class="card">
        <div class="card-header"><span class="card-title-lg">ℹ️ Como adicionar usuários</span></div>
        <div class="card-body">
          <div style="font-size:13px;color:var(--text2);line-height:1.9">
            <p><strong>Passo 1:</strong> Acesse o <a href="https://console.firebase.google.com" target="_blank" style="color:var(--blue-600)">Firebase Console</a> → Authentication → Add user. Crie o e-mail e senha do novo usuário.</p>
            <p><strong>Passo 2:</strong> Copie o <strong>UID</strong> gerado (clique no usuário → User UID).</p>
            <p><strong>Passo 3:</strong> Clique em <strong>"+ Adicionar"</strong> acima, cole o UID, defina o perfil e (se Encarregado) selecione as obras atribuídas.</p>
          </div>
        </div>
      </div>

      <!-- SOBRE -->
      <div class="card" style="margin-top:16px">
        <div class="card-header"><span class="card-title-lg">ℹ Sobre o Sistema</span></div>
        <div class="card-body">
          <div style="font-size:13px;color:var(--text2);line-height:1.8">
            <strong>Marques Caetano · Gestão de Obras v3.0</strong><br>
            Firebase Firestore · GitHub · Controle de Acesso por Perfil<br><br>
            <strong>Regras de negócio ativas:</strong><br>
            ✓ Registros financeiros nunca deletados (estorno)<br>
            ✓ Saldo calculado dinamicamente<br>
            ✓ Planilha nova soma ao saldo da obra<br>
            ✓ Repasse = saída de recursos<br>
            ✓ OC impacta saldo imediatamente<br>
            ✓ Detecção de OC duplicada<br>
            ✓ Controle de presença com suporte a diaristas<br>
            ✓ Controle de acesso por perfil (Admin / Encarregado / Visualizador)
          </div>
        </div>
      </div>
    </div>`;

  } finally {
    App.loading(false);
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
  if (!nome) return App.toast('Informe o nome', 'error');
  App.loading(true);
  try {
    await addDoc2('empresas_contratantes', { nome, cnpj });
    closeModal();
    App.toast('Empresa contratante salva!');
    App.navigate('configuracoes');
  } catch(e) { App.toast('Erro: '+e.message, 'error'); }
  finally { App.loading(false); }
}

window.renderConfig        = renderConfig;
window.showNovaContratante = showNovaContratante;
window.salvarContratante   = salvarContratante;
