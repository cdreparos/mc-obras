// ============================================================
// pages/dashboard.js + obras.js
// ============================================================

// ─── DASHBOARD ───────────────────────────────────────────────
async function renderDashboard() {
  const { obras, planilhas, lancamentos, funcionarios } = await loadAllData();
  const main = document.getElementById('main-content');

  const saldoTotal = obras.reduce((s, o) => s + calcSaldoObra(o, lancamentos), 0);
  const totalInicial = obras.reduce((s, o) => s + (o.saldo_inicial || 0), 0);
  const pctTotal = totalInicial > 0 ? Math.max(0, Math.min(100, (saldoTotal / totalInicial) * 100)) : 0;

  const folhaMes = lancamentos
    .filter(l => l.origem === 'funcionarios' && l.status === 'ativo')
    .reduce((s, l) => s + (l.valor || 0), 0);

  const totalDespesas = lancamentos
    .filter(l => l.tipo === 'despesa' && l.status === 'ativo')
    .reduce((s, l) => s + (l.valor || 0), 0);

  const negativos = planilhas.filter(p => calcSaldoPlanilha(p, lancamentos) < 0);
  const obrasAtivas = obras.filter(o => o.status === 'ativa').length;

  const ultimos = [...lancamentos]
    .filter(l => l.status === 'ativo')
    .sort((a, b) => {
      const da = a.created_at?.toDate?.() || new Date(0);
      const db2 = b.created_at?.toDate?.() || new Date(0);
      return db2 - da;
    }).slice(0, 8);

  // Barras semanais simuladas a partir dos lançamentos reais
  const now = new Date();
  const weekBars = Array.from({ length: 8 }, (_, i) => {
    const wEnd = new Date(now); wEnd.setDate(now.getDate() - i * 7);
    const wStart = new Date(wEnd); wStart.setDate(wEnd.getDate() - 7);
    return lancamentos
      .filter(l => {
        const d = l.created_at?.toDate?.() || new Date(0);
        return d >= wStart && d <= wEnd && l.tipo === 'despesa' && l.status === 'ativo';
      })
      .reduce((s, l) => s + (l.valor || 0), 0);
  }).reverse();
  const maxBar = Math.max(...weekBars, 1);

  // Categorias top
  const catMap = {};
  lancamentos.filter(l => l.tipo === 'despesa' && l.status === 'ativo').forEach(l => {
    catMap[l.categoria] = (catMap[l.categoria] || 0) + (l.valor || 0);
  });
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  main.innerHTML = `
    <div class="page">
      <!-- Saldo hero -->
      <div class="hero-card">
        <div class="hero-label">Saldo Total · ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div>
        <div class="hero-value ${saldoTotal < 0 ? 'negative' : ''}">${fmt(saldoTotal)}</div>
        <div class="hero-sub">${fmt(totalInicial)} inicial</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar ${pctTotal < 25 ? 'low' : ''}" style="width:${pctTotal}%"></div>
        </div>
        <div class="hero-pct">${pctTotal.toFixed(1)}% disponível</div>
      </div>

      ${negativos.length > 0 ? `
      <div class="alert danger" onclick="App.navigate('planilhas')">
        <span class="alert-icon">⚠</span>
        <span>${negativos.length} planilha${negativos.length > 1 ? 's' : ''} com saldo negativo — toque para ver</span>
      </div>` : ''}

      <!-- KPIs -->
      <div class="stat-grid">
        <div class="stat-card" onclick="App.navigate('obras')">
          <div class="stat-icon green">🏗</div>
          <div class="stat-val">${obrasAtivas}</div>
          <div class="stat-lbl">Obras ativas</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon accent">💰</div>
          <div class="stat-val sm">${fmt(folhaMes)}</div>
          <div class="stat-lbl">Folha do mês</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">📉</div>
          <div class="stat-val sm">${fmt(totalDespesas)}</div>
          <div class="stat-lbl">Total despesas</div>
        </div>
        <div class="stat-card" onclick="App.navigate('funcionarios')">
          <div class="stat-icon blue">👷</div>
          <div class="stat-val">${funcionarios.filter(f => f.ativo).length}</div>
          <div class="stat-lbl">Funcionários</div>
        </div>
      </div>

      <!-- Gráfico semanal -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Gastos · Últimas 8 semanas</span>
        </div>
        <div class="mini-bars">
          ${weekBars.map((v, i) => `
            <div class="mini-bar-wrap" title="${fmt(v)}">
              <div class="mini-bar ${i === 7 ? 'current' : ''}" style="height:${Math.max(4, (v/maxBar)*60)}px"></div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Saldo por obra -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Saldo por Obra</span>
          <button class="btn-link" onclick="App.navigate('obras')">Ver todas →</button>
        </div>
        ${obras.length === 0 ? '<div class="empty">Nenhuma obra cadastrada</div>' :
          obras.slice(0, 4).map(o => {
            const s = calcSaldoObra(o, lancamentos);
            const pct = o.saldo_inicial > 0 ? Math.max(0, Math.min(100, (s/o.saldo_inicial)*100)) : 0;
            return `
            <div class="obra-mini" onclick="App.navigate('obra_detail', { id: '${o.id}' })">
              <div class="obra-mini-info">
                <div class="obra-mini-nome">${o.nome}</div>
                <div class="obra-mini-sub">${o.empresa_contratante || ''}</div>
              </div>
              <div class="obra-mini-saldo ${s < 0 ? 'negative' : 'positive'}">${fmt(s)}</div>
            </div>
            <div class="progress-bar-wrap sm">
              <div class="progress-bar ${s < 0 ? 'danger' : pct < 25 ? 'low' : ''}" style="width:${s < 0 ? 100 : pct}%"></div>
            </div>`;
          }).join('')}
      </div>

      ${topCat.length > 0 ? `
      <!-- Top categorias -->
      <div class="card">
        <div class="card-header"><span class="card-title">Top Categorias</span></div>
        ${topCat.map(([cat, val]) => `
          <div class="cat-row">
            <span class="cat-nome">${cat}</span>
            <span class="cat-val">${fmt(val)}</span>
          </div>
          <div class="progress-bar-wrap sm" style="margin-bottom:10px">
            <div class="progress-bar accent" style="width:${(val/topCat[0][1]*100).toFixed(0)}%"></div>
          </div>`).join('')}
      </div>` : ''}

      <!-- Últimos lançamentos -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Últimos lançamentos</span>
          <button class="btn-link" onclick="App.navigate('lancamentos')">Ver todos →</button>
        </div>
        ${ultimos.length === 0 ? '<div class="empty">Nenhum lançamento</div>' :
          ultimos.map(l => {
            const obra = App.cache.obras.find(o => o.id === l.obra_id);
            const origemIcon = l.origem === 'ordem_compra' ? '📄' : l.origem === 'funcionarios' ? '👷' : '✏️';
            return `
            <div class="lanc-row">
              <div class="lanc-icon ${l.origem === 'ordem_compra' ? 'oc' : l.origem === 'funcionarios' ? 'func' : 'manual'}">${origemIcon}</div>
              <div class="lanc-info">
                <div class="lanc-desc">${l.descricao || ''}</div>
                <div class="lanc-meta">${obra?.nome || ''} · ${fmtDate(l.created_at)}</div>
              </div>
              <div class="lanc-val ${l.tipo === 'receita' ? 'receita' : ''}">${l.tipo === 'despesa' ? '-' : '+'}${fmt(l.valor)}</div>
            </div>`;
          }).join('')}
      </div>
    </div>`;
}

// ─── OBRAS ───────────────────────────────────────────────────
async function renderObras(params = {}) {
  const { obras, lancamentos, planilhas } = await loadAllData();
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">🏗 Obras</h1>
        <button class="btn-primary btn-sm" onclick="showNovaObra()">+ Nova</button>
      </div>

      ${obras.length === 0 ? '<div class="empty-state"><div class="empty-icon">🏗</div><p>Nenhuma obra cadastrada</p><button class="btn-primary" onclick="showNovaObra()">Cadastrar primeira obra</button></div>' :
        obras.map(o => {
          const s = calcSaldoObra(o, lancamentos);
          const pct = o.saldo_inicial > 0 ? Math.max(0, Math.min(100, (s/o.saldo_inicial)*100)) : 0;
          const planQtd = planilhas.filter(p => p.obra_id === o.id).length;
          return `
          <div class="obra-card" onclick="App.navigate('obra_detail', { id: '${o.id}' })">
            <div class="obra-card-top">
              <div>
                <div class="obra-card-nome">${o.nome}</div>
                <div class="obra-card-acao">${o.numero_acao || ''}</div>
              </div>
              <span class="badge ${o.status}">${o.status}</span>
            </div>
            <div class="tag-row">
              <span class="tag">${o.empresa_contratante || 'Sem contratante'}</span>
              <span class="tag">${planQtd} planilha${planQtd !== 1 ? 's' : ''}</span>
            </div>
            <div class="saldo-display ${s < 0 ? 'negative' : 'positive'}">${fmt(s)}</div>
            <div class="saldo-inicial">de ${fmt(o.saldo_inicial)}</div>
            <div class="progress-bar-wrap">
              <div class="progress-bar ${s < 0 ? 'danger' : pct < 25 ? 'low' : ''}" style="width:${s < 0 ? 100 : pct}%"></div>
            </div>
          </div>`;
        }).join('')}
    </div>`;
}

// ─── OBRA DETAIL ─────────────────────────────────────────────
async function renderObraDetail(params = {}) {
  const { obras, planilhas, lancamentos, ordens_compra } = await loadAllData();
  const main = document.getElementById('main-content');
  const obra = obras.find(o => o.id === params.id);
  if (!obra) { main.innerHTML = '<div class="error-box">Obra não encontrada</div>'; return; }

  const saldo = calcSaldoObra(obra, lancamentos);
  const pct = obra.saldo_inicial > 0 ? Math.max(0, Math.min(100, (saldo/obra.saldo_inicial)*100)) : 0;
  const obraPlans = planilhas.filter(p => p.obra_id === obra.id);
  const obraLancs = lancamentos.filter(l => l.obra_id === obra.id && l.status === 'ativo')
    .sort((a, b) => (b.created_at?.toDate?.() || 0) - (a.created_at?.toDate?.() || 0));
  const obraOCs = ordens_compra.filter(o => o.obra_id === obra.id);

  main.innerHTML = `
    <div class="page">
      <button class="back-btn" onclick="App.navigate('obras')">← Obras</button>

      <div class="hero-card">
        <div class="hero-label">${obra.empresa_contratante || ''} · ${obra.numero_acao || ''}</div>
        <div class="hero-title">${obra.nome}</div>
        <span class="badge ${obra.status}" style="margin-bottom:12px">${obra.status}</span>
        <div class="hero-value ${saldo < 0 ? 'negative' : ''}">${fmt(saldo)}</div>
        <div class="hero-sub">${fmt(obra.saldo_inicial)} inicial · ${pct.toFixed(1)}% disponível</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar ${saldo < 0 ? 'danger' : pct < 25 ? 'low' : ''}" style="width:${saldo < 0 ? 100 : pct}%"></div>
        </div>
      </div>

      <div class="action-row">
        <button class="btn-primary" onclick="showNovoLancamento('${obra.id}')">+ Lançamento</button>
        <button class="btn-secondary" onclick="showNovaOC('${obra.id}')">+ OC</button>
        ${obra.status === 'ativa' 
          ? `<button class="btn-danger btn-sm" onclick="encerrarObra('${obra.id}')">Encerrar</button>`
          : `<button class="btn-secondary btn-sm" onclick="reativarObra('${obra.id}')">Reativar</button>`}
      </div>

      <!-- Planilhas -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Planilhas (centros de custo)</span>
          <button class="btn-link" onclick="showNovaPlanilha('${obra.id}')">+ Nova</button>
        </div>
        ${obraPlans.length === 0 ? '<div class="empty">Nenhuma planilha</div>' :
          obraPlans.map(p => {
            const s = calcSaldoPlanilha(p, lancamentos);
            const pctP = p.saldo_inicial > 0 ? Math.max(0, Math.min(100, (s/p.saldo_inicial)*100)) : 0;
            return `
            <div class="planilha-row ${s < 0 ? 'negative' : ''}">
              <div class="planilha-info">
                <div class="planilha-nome">${p.nome}</div>
                <div class="planilha-sub">Inicial: ${fmt(p.saldo_inicial)}</div>
                <div class="progress-bar-wrap sm" style="margin-top:6px">
                  <div class="progress-bar ${s < 0 ? 'danger' : pctP < 25 ? 'low' : ''}" style="width:${s < 0 ? 100 : pctP}%"></div>
                </div>
              </div>
              <div class="planilha-saldo ${s < 0 ? 'negative' : 'positive'}">${fmt(s)}</div>
            </div>`;
          }).join('')}
      </div>

      <!-- OCs -->
      ${obraOCs.length > 0 ? `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Ordens de Compra</span>
          <span class="badge-count">${obraOCs.length}</span>
        </div>
        ${obraOCs.map(oc => {
          const pl = planilhas.find(p => p.id === oc.planilha_id);
          return `
          <div class="oc-row ${oc.status === 'cancelada' ? 'cancelada' : ''}">
            <div class="oc-num">${oc.numero_oc || ''}</div>
            <div class="oc-forn">${oc.fornecedor || ''}</div>
            <div class="oc-footer">
              <span class="tag">${pl?.nome || 'Sem planilha'}</span>
              <div class="oc-val-row">
                <span class="oc-val">${fmt(oc.valor_total)}</span>
                <span class="badge ${oc.status}">${oc.status}</span>
                ${oc.status === 'ativa' ? `<button class="btn-link danger" onclick="cancelarOC('${oc.id}', '${obra.id}')">Cancelar</button>` : ''}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>` : ''}

      <!-- Lançamentos -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Lançamentos</span>
          <span class="badge-count">${obraLancs.length}</span>
        </div>
        ${obraLancs.length === 0 ? '<div class="empty">Nenhum lançamento</div>' :
          obraLancs.map(l => {
            const pl = planilhas.find(p => p.id === l.planilha_id);
            const origemIcon = l.origem === 'ordem_compra' ? '📄' : l.origem === 'funcionarios' ? '👷' : '✏️';
            return `
            <div class="lanc-row">
              <div class="lanc-icon ${l.origem === 'ordem_compra' ? 'oc' : l.origem === 'funcionarios' ? 'func' : 'manual'}">${origemIcon}</div>
              <div class="lanc-info">
                <div class="lanc-desc">${l.descricao || ''}</div>
                <div class="lanc-meta">${pl ? pl.nome : 'Direto na obra'} · ${fmtDate(l.created_at)}</div>
                <span class="tag">${l.categoria || ''}</span>
              </div>
              <div class="lanc-right">
                <div class="lanc-val ${l.tipo === 'receita' ? 'receita' : ''}">${l.tipo === 'despesa' ? '-' : '+'}${fmt(l.valor)}</div>
                <button class="btn-link danger xs" onclick="cancelarLancamentoUI('${l.id}', '${obra.id}')">estornar</button>
              </div>
            </div>`;
          }).join('')}
      </div>
    </div>`;
}

// ─── AÇÕES OBRAS ──────────────────────────────────────────────
async function showNovaObra() {
  // Buscar contratantes
  const snap = await empresaCol('empresas_contratantes').get();
  const contratantes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  showModal(`
    <h2 class="modal-title">Nova Obra</h2>
    <div class="form-group">
      <label class="form-label">Nome da Obra</label>
      <input id="obra-nome" class="form-input" placeholder="Ex: Condomínio Alpha">
    </div>
    <div class="form-group">
      <label class="form-label">Número da Ação</label>
      <input id="obra-acao" class="form-input" placeholder="Ex: AC-2025-001" style="font-family:monospace">
    </div>
    <div class="form-group">
      <label class="form-label">Empresa Contratante</label>
      <input id="obra-contratante" class="form-input" placeholder="Ex: ENGIX, Murano..." list="contratantes-list">
      <datalist id="contratantes-list">
        ${contratantes.map(c => `<option value="${c.nome}">`).join('')}
      </datalist>
    </div>
    <div class="form-group">
      <label class="form-label">Saldo Inicial (R$)</label>
      <input id="obra-saldo" class="form-input" type="number" placeholder="0.00">
    </div>
    <div class="btn-row">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="salvarObra()">Salvar</button>
    </div>`);
}

async function salvarObra() {
  const nome = document.getElementById('obra-nome').value.trim();
  const acao = document.getElementById('obra-acao').value.trim();
  const contratante = document.getElementById('obra-contratante').value.trim();
  const saldo = parseFloat(document.getElementById('obra-saldo').value) || 0;
  if (!nome) return App.toast('Informe o nome da obra', 'error');

  App.setLoading(true);
  try {
    await addDoc('obras', { nome, numero_acao: acao, empresa_contratante: contratante, saldo_inicial: saldo, status: 'ativa' });
    closeModal();
    App.toast('Obra criada!');
    App.navigate('obras');
  } catch (e) {
    App.toast('Erro: ' + e.message, 'error');
  } finally { App.setLoading(false); }
}

async function encerrarObra(id) {
  if (!confirm('Encerrar esta obra?')) return;
  await updateDoc('obras', id, { status: 'encerrada' });
  App.toast('Obra encerrada');
  App.navigate('obra_detail', { id });
}

async function reativarObra(id) {
  await updateDoc('obras', id, { status: 'ativa' });
  App.toast('Obra reativada');
  App.navigate('obra_detail', { id });
}

async function cancelarLancamentoUI(lancId, obraId) {
  if (!confirm('Estornar este lançamento? A operação não pode ser desfeita.')) return;
  App.setLoading(true);
  try {
    await cancelarLancamento(lancId);
    App.navigate('obra_detail', { id: obraId });
  } catch (e) {
    App.toast('Erro: ' + e.message, 'error');
  } finally { App.setLoading(false); }
}

// Expor globalmente
window.renderDashboard = renderDashboard;
window.renderObras = renderObras;
window.renderObraDetail = renderObraDetail;
window.showNovaObra = showNovaObra;
window.salvarObra = salvarObra;
window.encerrarObra = encerrarObra;
window.reativarObra = reativarObra;
window.cancelarLancamentoUI = cancelarLancamentoUI;
