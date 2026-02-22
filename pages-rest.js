// ============================================================
// pages-rest.js — Funcionários, Planilhas, OC, Lançamentos, Config
// ============================================================

// ─── PLANILHAS ────────────────────────────────────────────────
async function renderPlanilhas() {
  const { planilhas, lancamentos, obras } = await loadAllData();
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">📋 Planilhas</h1>
      </div>
      ${obras.map(o => {
        const obraPls = planilhas.filter(p => p.obra_id === o.id);
        if (obraPls.length === 0) return '';
        return `
        <div class="section-label">${o.nome}</div>
        ${obraPls.map(p => {
          const s = calcSaldoPlanilha(p, lancamentos);
          const pct = p.saldo_inicial > 0 ? Math.max(0, Math.min(100, (s/p.saldo_inicial)*100)) : 0;
          return `
          <div class="card mb10 ${s < 0 ? 'card-danger' : ''}">
            <div class="card-header">
              <div>
                <div class="planilha-nome-lg">${p.nome}</div>
                <div class="planilha-sub">${o.empresa_contratante || ''} · ${o.numero_acao || ''}</div>
              </div>
              <div class="planilha-saldo-lg ${s < 0 ? 'negative' : 'positive'}">${fmt(s)}</div>
            </div>
            ${s < 0 ? '<div class="alert danger sm"><span>⚠ Saldo negativo!</span></div>' : ''}
            <div class="progress-bar-wrap">
              <div class="progress-bar ${s < 0 ? 'danger' : pct < 25 ? 'low' : ''}" style="width:${s < 0 ? 100 : pct}%"></div>
            </div>
            <div style="font-size:11px;color:var(--text3);margin-top:4px">Inicial: ${fmt(p.saldo_inicial)}</div>
          </div>`;
        }).join('')}`;
      }).join('')}
    </div>`;
}

async function showNovaPlanilha(obraId) {
  showModal(`
    <h2 class="modal-title">Nova Planilha</h2>
    <div class="form-group">
      <label class="form-label">Nome</label>
      <input id="pl-nome" class="form-input" placeholder="Ex: Estrutura, Acabamento...">
    </div>
    <div class="form-group">
      <label class="form-label">Saldo Inicial (R$)</label>
      <input id="pl-saldo" class="form-input" type="number" placeholder="0.00">
    </div>
    <div class="btn-row">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="salvarPlanilha('${obraId}')">Salvar</button>
    </div>`);
}

async function salvarPlanilha(obraId) {
  const nome = document.getElementById('pl-nome').value.trim();
  const saldo = parseFloat(document.getElementById('pl-saldo').value) || 0;
  if (!nome) return App.toast('Informe o nome', 'error');
  App.setLoading(true);
  try {
    await addDoc('planilhas', { obra_id: obraId, nome, saldo_inicial: saldo, status: 'ativa' });
    closeModal();
    App.toast('Planilha criada!');
    App.navigate('obra_detail', { id: obraId });
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.setLoading(false); }
}

// ─── FUNCIONÁRIOS ─────────────────────────────────────────────
async function renderFuncionarios() {
  const { funcionarios, alocacoes, obras, lancamentos } = await loadAllData();
  const main = document.getElementById('main-content');
  const { mes, ano } = mesAtual();

  // Detectar mensalistas sem folha
  const mensalistas = funcionarios.filter(f => f.ativo && f.tipo_contrato === 'mensalista');
  const semFolha = [];
  for (const f of mensalistas) {
    const aloc = alocacoes.find(a => a.funcionario_id === f.id && !a.data_fim);
    if (!aloc) continue;
    const jaTemFolha = lancamentos.some(l =>
      l.origem === 'funcionarios' && l.origem_ref_id === f.id &&
      l.competencia_mes === mes && l.competencia_ano === ano && l.status === 'ativo');
    if (!jaTemFolha) semFolha.push({ ...f, alocacao: aloc });
  }

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">👷 Funcionários</h1>
        <button class="btn-primary btn-sm" onclick="showNovoFuncionario()">+ Novo</button>
      </div>

      ${semFolha.length > 0 ? `
      <div class="alert warning" onclick="showFolhaSugerida()">
        <span>📋 Folha sugerida para ${mes.toString().padStart(2,'0')}/${ano} — ${semFolha.length} funcionário${semFolha.length > 1 ? 's' : ''} — toque para confirmar</span>
      </div>` : ''}

      <div class="card">
        <div class="card-header"><span class="card-title">Equipe Ativa</span></div>
        ${funcionarios.filter(f => f.ativo).length === 0 ? '<div class="empty">Nenhum funcionário ativo</div>' :
          funcionarios.filter(f => f.ativo).map(f => {
            const aloc = alocacoes.find(a => a.funcionario_id === f.id && !a.data_fim);
            const obra = obras.find(o => o.id === aloc?.obra_id);
            const initials = f.nome.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
            return `
            <div class="func-row">
              <div class="func-avatar">${initials}</div>
              <div class="func-info">
                <div class="func-nome">${f.nome}</div>
                <div class="func-meta">${f.funcao || ''} · ${obra?.nome || '⚠ Sem alocação'}</div>
                <div style="margin-top:4px">
                  <span class="badge ${f.tipo_contrato}">${f.tipo_contrato}</span>
                </div>
              </div>
              <div>
                <div class="func-val">${fmt(f.valor_base)}${f.tipo_contrato === 'diarista' ? '/dia' : '/mês'}</div>
                <button class="btn-link xs" onclick="showPagamentoFunc('${f.id}')">+ Pagar</button>
              </div>
            </div>`;
          }).join('')}
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Inativos</span></div>
        ${funcionarios.filter(f => !f.ativo).length === 0 ? '<div class="empty">Nenhum</div>' :
          funcionarios.filter(f => !f.ativo).map(f => `
          <div class="func-row inactive">
            <div class="func-avatar">${f.nome.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}</div>
            <div class="func-info">
              <div class="func-nome">${f.nome}</div>
              <div class="func-meta">${f.funcao || ''}</div>
            </div>
            <button class="btn-link xs" onclick="reativarFunc('${f.id}')">Reativar</button>
          </div>`).join('')}
      </div>
    </div>`;
}

async function showNovoFuncionario() {
  const { obras } = await loadAllData();
  showModal(`
    <h2 class="modal-title">Novo Funcionário</h2>
    <div class="form-group">
      <label class="form-label">Nome completo</label>
      <input id="fn-nome" class="form-input" placeholder="Nome do funcionário">
    </div>
    <div class="form-group">
      <label class="form-label">Função</label>
      <input id="fn-funcao" class="form-input" placeholder="Ex: Pedreiro, Encarregado...">
    </div>
    <div class="form-group">
      <label class="form-label">Tipo de Contrato</label>
      <select id="fn-tipo" class="form-input" onchange="toggleValorFunc()">
        <option value="mensalista">Mensalista</option>
        <option value="diarista">Diarista</option>
        <option value="empreita">Empreita</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label" id="fn-valor-label">Salário Mensal (R$)</label>
      <input id="fn-valor" class="form-input" type="number" placeholder="0.00">
    </div>
    <div class="form-group">
      <label class="form-label">Alocar na Obra</label>
      <select id="fn-obra" class="form-input">
        <option value="">— Sem alocação inicial —</option>
        ${obras.filter(o => o.status === 'ativa').map(o => `<option value="${o.id}">${o.nome}</option>`).join('')}
      </select>
    </div>
    <div class="btn-row">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="salvarFuncionario()">Salvar</button>
    </div>`);
}

function toggleValorFunc() {
  const tipo = document.getElementById('fn-tipo').value;
  const lbl = document.getElementById('fn-valor-label');
  lbl.textContent = tipo === 'diarista' ? 'Valor por Dia (R$)' : tipo === 'empreita' ? 'Valor da Empreita (R$)' : 'Salário Mensal (R$)';
}

async function salvarFuncionario() {
  const nome = document.getElementById('fn-nome').value.trim();
  const funcao = document.getElementById('fn-funcao').value.trim();
  const tipo = document.getElementById('fn-tipo').value;
  const valor = parseFloat(document.getElementById('fn-valor').value) || 0;
  const obraId = document.getElementById('fn-obra').value;
  if (!nome) return App.toast('Informe o nome', 'error');

  App.setLoading(true);
  try {
    const fnId = await addDoc('funcionarios', { nome, funcao, tipo_contrato: tipo, valor_base: valor, ativo: true });
    if (obraId) {
      await addDoc('alocacoes', {
        funcionario_id: fnId, obra_id: obraId,
        data_inicio: today(), data_fim: null
      });
    }
    closeModal();
    App.toast('Funcionário cadastrado!');
    App.navigate('funcionarios');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.setLoading(false); }
}

async function showFolhaSugerida() {
  const { funcionarios, alocacoes, obras, lancamentos } = await loadAllData();
  const { mes, ano } = mesAtual();

  const lista = funcionarios.filter(f => f.ativo && f.tipo_contrato === 'mensalista').map(f => {
    const aloc = alocacoes.find(a => a.funcionario_id === f.id && !a.data_fim);
    if (!aloc) return null;
    const jaTemFolha = lancamentos.some(l =>
      l.origem === 'funcionarios' && l.origem_ref_id === f.id &&
      l.competencia_mes === mes && l.competencia_ano === ano && l.status === 'ativo');
    if (jaTemFolha) return null;
    const obra = obras.find(o => o.id === aloc.obra_id);
    return { ...f, alocacao: aloc, obra };
  }).filter(Boolean);

  if (lista.length === 0) { App.toast('Todos os mensalistas já têm folha este mês'); return; }

  showModal(`
    <h2 class="modal-title">Folha ${mes.toString().padStart(2,'0')}/${ano}</h2>
    <div class="alert success sm"><span>Confirme os pagamentos abaixo</span></div>
    ${lista.map(f => `
    <div class="folha-item">
      <div class="folha-item-check">
        <input type="checkbox" id="fc-${f.id}" checked class="checkbox">
        <div>
          <div class="func-nome">${f.nome}</div>
          <div class="func-meta">${f.obra?.nome || ''}</div>
        </div>
      </div>
      <div class="func-val">${fmt(f.valor_base)}</div>
    </div>`).join('')}
    <div class="divider"></div>
    <div class="folha-total">
      <span>Total</span>
      <span id="folha-total-val">${fmt(lista.reduce((s,f) => s+f.valor_base, 0))}</span>
    </div>
    <div class="btn-row" style="margin-top:16px">
      <button class="btn-secondary" onclick="closeModal()">Ignorar</button>
      <button class="btn-primary" onclick="confirmarFolha(${JSON.stringify(lista.map(f => ({ id: f.id, valor: f.valor_base, obraId: f.alocacao.obra_id })))})">✓ Confirmar</button>
    </div>`);
}

async function confirmarFolha(lista) {
  const { mes, ano } = mesAtual();
  const selecionados = lista.filter(f => document.getElementById('fc-'+f.id)?.checked);
  if (selecionados.length === 0) return App.toast('Selecione ao menos um', 'warning');
  App.setLoading(true);
  try {
    for (const f of selecionados) {
      await addDoc('lancamentos', {
        obra_id: f.obraId, planilha_id: null,
        tipo: 'despesa', categoria: 'Folha',
        valor: f.valor,
        descricao: `Salário ${mes.toString().padStart(2,'0')}/${ano}`,
        origem: 'funcionarios', origem_ref_id: f.id,
        competencia_mes: mes, competencia_ano: ano,
        status: 'ativo',
      });
    }
    closeModal();
    App.toast(`Folha de ${selecionados.length} funcionário(s) lançada!`);
    App.navigate('funcionarios');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.setLoading(false); }
}

async function showPagamentoFunc(funcId) {
  const { funcionarios, alocacoes, obras } = await loadAllData();
  const f = funcionarios.find(x => x.id === funcId);
  if (!f) return;
  const aloc = alocacoes.find(a => a.funcionario_id === funcId && !a.data_fim);
  const obra = obras.find(o => o.id === aloc?.obra_id);
  const { mes, ano } = mesAtual();

  showModal(`
    <h2 class="modal-title">Pagar · ${f.nome}</h2>
    ${f.tipo_contrato === 'diarista' ? `
    <div class="form-group">
      <label class="form-label">Número de dias</label>
      <input id="pg-dias" class="form-input" type="number" min="1" placeholder="0" onchange="calcDiaria(${f.valor_base})">
      <div id="pg-calc" style="font-size:12px;color:var(--text3);margin-top:4px"></div>
    </div>` : ''}
    <div class="form-group">
      <label class="form-label">${f.tipo_contrato === 'empreita' ? 'Valor da Empreita (R$)' : f.tipo_contrato === 'diarista' ? 'Valor Total (R$)' : 'Valor (R$)'}</label>
      <input id="pg-valor" class="form-input" type="number" value="${f.tipo_contrato === 'mensalista' ? f.valor_base : ''}">
    </div>
    <div class="form-group">
      <label class="form-label">Tipo de Pagamento</label>
      <select id="pg-tipo" class="form-input">
        <option value="salario">Salário</option>
        <option value="adiantamento">Adiantamento</option>
        <option value="va">Vale Alimentação</option>
        <option value="vt">Vale Transporte</option>
        <option value="bonus">Bônus/Extra</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Forma de Pagamento</label>
      <select id="pg-forma" class="form-input">
        <option value="pix">PIX</option>
        <option value="dinheiro">Dinheiro</option>
        <option value="transferência">Transferência</option>
      </select>
    </div>
    <div class="info-box">Obra: <strong>${obra?.nome || '⚠ Sem alocação'}</strong></div>
    ${!aloc ? '<div class="alert danger sm"><span>⚠ Funcionário sem alocação ativa. Aloque antes de pagar.</span></div>' : ''}
    <div class="btn-row">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="salvarPagamento('${funcId}','${aloc?.obra_id || ''}')" ${!aloc ? 'disabled' : ''}>Confirmar</button>
    </div>`);
}

function calcDiaria(valorDia) {
  const dias = parseInt(document.getElementById('pg-dias').value) || 0;
  const total = dias * valorDia;
  document.getElementById('pg-valor').value = total;
  document.getElementById('pg-calc').textContent = `${dias} dias × ${fmt(valorDia)} = ${fmt(total)}`;
}

async function salvarPagamento(funcId, obraId) {
  const valor = parseFloat(document.getElementById('pg-valor').value) || 0;
  const tipo = document.getElementById('pg-tipo').value;
  const forma = document.getElementById('pg-forma').value;
  if (!valor) return App.toast('Informe o valor', 'error');
  if (!obraId) return App.toast('Funcionário sem alocação', 'error');
  const { mes, ano } = mesAtual();
  App.setLoading(true);
  try {
    const f = App.cache.funcionarios.find(x => x.id === funcId);
    await addDoc('lancamentos', {
      obra_id: obraId, planilha_id: null,
      tipo: 'despesa', categoria: 'Folha',
      valor, descricao: `${tipo} — ${f?.nome || ''}`,
      origem: 'funcionarios', origem_ref_id: funcId,
      competencia_mes: mes, competencia_ano: ano,
      forma_pagamento: forma, status: 'ativo',
    });
    closeModal();
    App.toast('Pagamento lançado!');
    App.navigate('funcionarios');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.setLoading(false); }
}

async function reativarFunc(id) {
  await updateDoc('funcionarios', id, { ativo: true });
  App.toast('Funcionário reativado');
  App.navigate('funcionarios');
}

// ─── ORDENS DE COMPRA ─────────────────────────────────────────
async function renderOC() {
  const { ordens_compra, obras, planilhas } = await loadAllData();
  const main = document.getElementById('main-content');

  const ativas = ordens_compra.filter(o => o.status === 'ativa');
  const canceladas = ordens_compra.filter(o => o.status === 'cancelada');

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">📄 Ordens de Compra</h1>
        <button class="btn-primary btn-sm" onclick="showImportarOC()">+ Importar</button>
      </div>

      <div class="card mb10">
        <div class="card-header"><span class="card-title">OCs Ativas (${ativas.length})</span></div>
        ${ativas.length === 0 ? '<div class="empty">Nenhuma OC ativa</div>' :
          ativas.map(oc => renderOCRow(oc, obras, planilhas, true)).join('')}
      </div>

      ${canceladas.length > 0 ? `
      <div class="card">
        <div class="card-header"><span class="card-title">Canceladas (${canceladas.length})</span></div>
        ${canceladas.map(oc => renderOCRow(oc, obras, planilhas, false)).join('')}
      </div>` : ''}
    </div>`;
}

function renderOCRow(oc, obras, planilhas, canCancel) {
  const obra = obras.find(o => o.id === oc.obra_id);
  const pl = planilhas.find(p => p.id === oc.planilha_id);
  return `
    <div class="oc-row ${oc.status === 'cancelada' ? 'cancelada' : ''}">
      <div class="oc-top">
        <span class="oc-num">${oc.numero_oc || '—'}</span>
        <span class="oc-data">${fmtDate(oc.data_emissao)}</span>
      </div>
      <div class="oc-forn">${oc.fornecedor || '—'}</div>
      <div class="oc-footer">
        <div class="tag-row">
          <span class="tag">${obra?.nome || '—'}</span>
          <span class="tag">${pl?.nome || '—'}</span>
        </div>
        <div class="oc-right">
          <span class="oc-val">${fmt(oc.valor_total)}</span>
          ${canCancel ? `<button class="btn-link danger xs" onclick="cancelarOC('${oc.id}', '${oc.obra_id}')">Cancelar</button>` : '<span class="badge encerrada">cancelada</span>'}
        </div>
      </div>
    </div>`;
}

async function showImportarOC() {
  const { obras } = await loadAllData();
  showModal(`
    <h2 class="modal-title">Importar OC</h2>
    <div class="upload-area" id="upload-area" onclick="document.getElementById('oc-pdf').click()">
      <div class="upload-icon">📄</div>
      <div class="upload-text">Toque para selecionar PDF</div>
      <div class="upload-sub">Extração automática de dados via OCR</div>
      <input type="file" id="oc-pdf" accept=".pdf" style="display:none" onchange="processarPDF(event)">
    </div>

    <div id="oc-manual-form" style="display:none;margin-top:16px">
      <div class="alert success sm"><span id="oc-parse-status">✓ Dados extraídos — confira e ajuste se necessário</span></div>
      <div class="form-group">
        <label class="form-label">Nº OC</label>
        <input id="oc-num" class="form-input" placeholder="OC-2025-0001" style="font-family:monospace">
      </div>
      <div class="form-group">
        <label class="form-label">Nº Ação</label>
        <input id="oc-acao" class="form-input" placeholder="AC-2025-001" style="font-family:monospace" onblur="buscarObraByAcao()">
      </div>
      <div class="form-group">
        <label class="form-label">Fornecedor</label>
        <input id="oc-forn" class="form-input">
      </div>
      <div class="form-group">
        <label class="form-label">CNPJ Fornecedor</label>
        <input id="oc-cnpj" class="form-input" placeholder="00.000.000/0000-00">
      </div>
      <div class="form-group">
        <label class="form-label">Valor Total (R$)</label>
        <input id="oc-valor" class="form-input" type="number">
      </div>
      <div class="form-group">
        <label class="form-label">Data de Emissão</label>
        <input id="oc-data" class="form-input" type="date">
      </div>
      <div class="form-group">
        <label class="form-label">Obra</label>
        <select id="oc-obra" class="form-input" onchange="carregarPlanilhasOC()">
          <option value="">— Selecione —</option>
          ${obras.filter(o => o.status === 'ativa').map(o => `<option value="${o.id}" data-acao="${o.numero_acao}">${o.nome} (${o.numero_acao})</option>`).join('')}
        </select>
      </div>
      <div class="form-group" id="oc-planilha-grp">
        <label class="form-label">Planilha (obrigatória)</label>
        <select id="oc-planilha" class="form-input">
          <option value="">— Selecione a obra primeiro —</option>
        </select>
      </div>
      <div class="btn-row">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="confirmarOC()">✓ Confirmar OC</button>
      </div>
    </div>

    <div style="margin-top:12px">
      <button class="btn-link" onclick="mostrarFormOCManual()">Preencher manualmente sem PDF</button>
    </div>`);
}

function mostrarFormOCManual() {
  document.getElementById('upload-area').style.display = 'none';
  document.getElementById('oc-manual-form').style.display = 'block';
  document.getElementById('oc-parse-status').textContent = 'Preenchimento manual';
  document.getElementById('oc-data').value = today();
}

async function processarPDF(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById('upload-area').innerHTML = `
    <div class="upload-icon">⏳</div>
    <div class="upload-text">Processando PDF...</div>`;

  // Tentar extrair texto do PDF via FileReader + heurística básica
  // Para OCR real, integrar Tesseract.js ou Google Document AI
  try {
    // Simular extração com dados do arquivo (em produção, usar pdf.js + regex)
    const reader = new FileReader();
    reader.onload = async function(e) {
      // Tentar ler como texto
      const raw = e.target.result;
      const extracted = parsePDFText(raw, file.name);

      document.getElementById('upload-area').style.display = 'none';
      document.getElementById('oc-manual-form').style.display = 'block';
      document.getElementById('oc-data').value = today();

      if (extracted.numero_oc) document.getElementById('oc-num').value = extracted.numero_oc;
      if (extracted.numero_acao) document.getElementById('oc-acao').value = extracted.numero_acao;
      if (extracted.fornecedor) document.getElementById('oc-forn').value = extracted.fornecedor;
      if (extracted.cnpj) document.getElementById('oc-cnpj').value = extracted.cnpj;
      if (extracted.valor) document.getElementById('oc-valor').value = extracted.valor;

      if (extracted.numero_acao) buscarObraByAcao();
    };
    reader.readAsText(file);
  } catch(e) {
    mostrarFormOCManual();
  }
}

function parsePDFText(text, filename) {
  const result = {};
  // Extrair número OC
  const ocMatch = text.match(/N[ºo°][:.]?\s*(OC[\-\s]?\d+[\-\s]?\d*)/i) ||
                   text.match(/OC[\-](\d{4}[\-]\d{4})/i);
  if (ocMatch) result.numero_oc = ocMatch[1].trim();

  // Extrair ação
  const acaoMatch = text.match(/A[çc][aã]o[:.]?\s*(AC[\-\s]?\d{4}[\-\s]?\d{3,})/i) ||
                     text.match(/A[çc][aã]o\s*N[ºo°][:.]?\s*(\d+)/i);
  if (acaoMatch) result.numero_acao = acaoMatch[1].trim();

  // Extrair CNPJ
  const cnpjMatch = text.match(/\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}/);
  if (cnpjMatch) result.cnpj = cnpjMatch[0].trim();

  // Extrair valor
  const valorMatch = text.match(/[Tt]otal[:.]?\s*R\$\s*([\d\.]+,\d{2})/i) ||
                      text.match(/[Tt]otal[:.]?\s*([\d\.]+,\d{2})/);
  if (valorMatch) result.valor = parseFloat(valorMatch[1].replace(/\./g,'').replace(',','.'));

  // Tentar fornecedor (linha próxima a CNPJ)
  const linhas = text.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].match(/\d{2}\.\d{3}\.\d{3}\/\d{4}/)) {
      const forn = linhas[Math.max(0, i-1)].trim();
      if (forn.length > 3) result.fornecedor = forn;
      break;
    }
  }

  return result;
}

async function buscarObraByAcao() {
  const acao = document.getElementById('oc-acao').value.trim();
  if (!acao) return;
  const sel = document.getElementById('oc-obra');
  const options = Array.from(sel.options);
  const match = options.find(o => o.dataset.acao?.toLowerCase() === acao.toLowerCase());
  if (match) {
    sel.value = match.value;
    await carregarPlanilhasOC();
    App.toast('Obra identificada automaticamente!', 'success');
  }
}

async function carregarPlanilhasOC() {
  const obraId = document.getElementById('oc-obra').value;
  const sel = document.getElementById('oc-planilha');
  sel.innerHTML = '<option value="">Carregando...</option>';
  if (!obraId) { sel.innerHTML = '<option value="">— Selecione a obra primeiro —</option>'; return; }
  const snap = await empresaCol('planilhas').where('obra_id', '==', obraId).get();
  const pls = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  sel.innerHTML = pls.length === 0
    ? '<option value="">Nenhuma planilha nesta obra</option>'
    : '<option value="">— Selecione —</option>' + pls.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  if (pls.length === 1) sel.value = pls[0].id;
}

async function confirmarOC() {
  const num = document.getElementById('oc-num').value.trim();
  const acao = document.getElementById('oc-acao').value.trim();
  const forn = document.getElementById('oc-forn').value.trim();
  const cnpj = document.getElementById('oc-cnpj').value.trim();
  const valor = parseFloat(document.getElementById('oc-valor').value) || 0;
  const data = document.getElementById('oc-data').value;
  const obraId = document.getElementById('oc-obra').value;
  const planId = document.getElementById('oc-planilha').value;

  if (!obraId) return App.toast('Selecione a obra', 'error');
  if (!planId) return App.toast('Selecione a planilha', 'error');
  if (!valor) return App.toast('Informe o valor', 'error');
  if (!num) return App.toast('Informe o número da OC', 'error');

  // Verificar duplicidade
  const dup = await empresaCol('ordens_compra')
    .where('numero_oc', '==', num)
    .where('obra_id', '==', obraId)
    .get();
  if (!dup.empty) return App.toast('OC já cadastrada nesta obra!', 'error');

  App.setLoading(true);
  try {
    const ocId = await addDoc('ordens_compra', {
      numero_oc: num, numero_acao: acao, fornecedor: forn,
      cnpj_fornecedor: cnpj, valor_total: valor,
      data_emissao: data, obra_id: obraId, planilha_id: planId, status: 'ativa'
    });
    await addDoc('lancamentos', {
      obra_id: obraId, planilha_id: planId,
      tipo: 'despesa', categoria: 'Material/OC',
      valor, descricao: `OC ${num} — ${forn}`,
      origem: 'ordem_compra', origem_ref_id: ocId, status: 'ativo'
    });
    closeModal();
    App.toast('OC importada com sucesso!');
    App.navigate('ordens_compra');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.setLoading(false); }
}

async function cancelarOC(ocId, obraId) {
  if (!confirm('Cancelar esta OC? Será gerado estorno automático.')) return;
  App.setLoading(true);
  try {
    const doc = await empresaCol('ordens_compra').doc(ocId).get();
    const oc = doc.data();
    await updateDoc('ordens_compra', ocId, { status: 'cancelada' });
    // Estornar lançamentos desta OC
    const lSnap = await empresaCol('lancamentos')
      .where('origem_ref_id', '==', ocId).where('status', '==', 'ativo').get();
    for (const l of lSnap.docs) {
      await cancelarLancamento(l.id);
    }
    closeModal();
    App.toast('OC cancelada e estorno gerado');
    App.navigate('ordens_compra');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.setLoading(false); }
}

// ─── LANÇAMENTOS ──────────────────────────────────────────────
async function renderLancamentos() {
  const { lancamentos, obras, planilhas } = await loadAllData();
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">📊 Lançamentos</h1>
        <button class="btn-primary btn-sm" onclick="showNovoLancamento()">+ Novo</button>
      </div>

      <div class="filter-row">
        <select id="f-obra" class="form-input sm" onchange="filtrarLancamentos()">
          <option value="">Todas as obras</option>
          ${obras.map(o => `<option value="${o.id}">${o.nome}</option>`).join('')}
        </select>
        <select id="f-origem" class="form-input sm" onchange="filtrarLancamentos()">
          <option value="">Todas origens</option>
          <option value="ordem_compra">OC</option>
          <option value="funcionarios">Funcionários</option>
          <option value="manual">Manual</option>
          <option value="repasse">Repasse</option>
        </select>
        <select id="f-tipo" class="form-input sm" onchange="filtrarLancamentos()">
          <option value="">Todos tipos</option>
          <option value="despesa">Despesas</option>
          <option value="receita">Receitas</option>
        </select>
      </div>

      <div id="lanc-list" class="card">
        ${renderLancList(lancamentos, obras, planilhas)}
      </div>
    </div>`;

  window._allLancs = lancamentos;
  window._allObras = obras;
  window._allPlanilhas = planilhas;
}

function filtrarLancamentos() {
  const obraF = document.getElementById('f-obra').value;
  const origemF = document.getElementById('f-origem').value;
  const tipoF = document.getElementById('f-tipo').value;

  const filtered = window._allLancs.filter(l => {
    if (obraF && l.obra_id !== obraF) return false;
    if (origemF && l.origem !== origemF) return false;
    if (tipoF && l.tipo !== tipoF) return false;
    return l.status === 'ativo';
  });

  document.getElementById('lanc-list').innerHTML = renderLancList(filtered, window._allObras, window._allPlanilhas);
}

function renderLancList(lancs, obras, planilhas) {
  const sorted = [...lancs].filter(l => l.status === 'ativo')
    .sort((a, b) => (b.created_at?.toDate?.() || 0) - (a.created_at?.toDate?.() || 0));
  if (sorted.length === 0) return '<div class="empty">Nenhum lançamento</div>';
  return sorted.map(l => {
    const obra = obras.find(o => o.id === l.obra_id);
    const pl = planilhas.find(p => p.id === l.planilha_id);
    const icon = l.origem === 'ordem_compra' ? '📄' : l.origem === 'funcionarios' ? '👷' : l.origem === 'repasse' ? '↩' : '✏️';
    const cls = l.origem === 'ordem_compra' ? 'oc' : l.origem === 'funcionarios' ? 'func' : 'manual';
    return `
    <div class="lanc-row">
      <div class="lanc-icon ${cls}">${icon}</div>
      <div class="lanc-info">
        <div class="lanc-desc">${l.descricao || ''}</div>
        <div class="lanc-meta">${obra?.nome || ''} ${pl ? '· ' + pl.nome : ''}</div>
        <div style="margin-top:3px"><span class="tag">${l.categoria || ''}</span> <span style="font-size:10px;color:var(--text3)">${fmtDate(l.created_at)}</span></div>
      </div>
      <div class="lanc-right">
        <div class="lanc-val ${l.tipo === 'receita' ? 'receita' : ''}">${l.tipo === 'despesa' ? '-' : '+'}${fmt(l.valor)}</div>
        <button class="btn-link danger xs" onclick="cancelarLancamentoUI('${l.id}','${l.obra_id}')">estornar</button>
      </div>
    </div>`;
  }).join('');
}

async function showNovoLancamento(obraIdPre = '') {
  const { obras, planilhas } = await loadAllData();
  showModal(`
    <h2 class="modal-title">Novo Lançamento</h2>
    <div class="form-group">
      <label class="form-label">Tipo</label>
      <div class="toggle-row">
        <button id="tog-despesa" class="toggle-btn active" onclick="setTipo('despesa')">Despesa</button>
        <button id="tog-receita" class="toggle-btn" onclick="setTipo('receita')">Receita</button>
        <button id="tog-repasse" class="toggle-btn" onclick="setTipo('repasse')">Repasse</button>
      </div>
      <input type="hidden" id="nl-tipo" value="despesa">
    </div>
    <div class="form-group">
      <label class="form-label">Obra</label>
      <select id="nl-obra" class="form-input" onchange="carregarPlanilhasNL()">
        <option value="">— Selecione —</option>
        ${obras.filter(o => o.status === 'ativa').map(o => `<option value="${o.id}" ${o.id === obraIdPre ? 'selected' : ''}>${o.nome}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Planilha (opcional — obrigatória para materiais)</label>
      <select id="nl-planilha" class="form-input">
        <option value="">Direto na obra (ex: folha, repasse)</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Categoria</label>
      <select id="nl-cat" class="form-input">
        ${['Material','Serviço','Equipamento','Transporte','Alimentação','Folha','Repasse','Outros'].map(c => `<option>${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Valor (R$)</label>
      <input id="nl-valor" class="form-input" type="number" placeholder="0.00">
    </div>
    <div class="form-group">
      <label class="form-label">Descrição</label>
      <input id="nl-desc" class="form-input" placeholder="Descreva o lançamento">
    </div>
    <div class="form-group">
      <label class="form-label">Forma de Pagamento</label>
      <select id="nl-forma" class="form-input">
        ${['pix','dinheiro','transferência','boleto','cartão','n/a'].map(c => `<option>${c}</option>`).join('')}
      </select>
    </div>
    <div class="btn-row">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="salvarLancamento()">✓ Salvar</button>
    </div>`);

  if (obraIdPre) carregarPlanilhasNL();
}

function setTipo(t) {
  document.getElementById('nl-tipo').value = t;
  ['despesa','receita','repasse'].forEach(x => {
    document.getElementById('tog-'+x).classList.toggle('active', x === t);
  });
}

async function carregarPlanilhasNL() {
  const obraId = document.getElementById('nl-obra').value;
  const sel = document.getElementById('nl-planilha');
  if (!obraId) { sel.innerHTML = '<option value="">Direto na obra</option>'; return; }
  const snap = await empresaCol('planilhas').where('obra_id', '==', obraId).get();
  const pls = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  sel.innerHTML = '<option value="">Direto na obra</option>' +
    pls.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
}

async function salvarLancamento() {
  const tipo = document.getElementById('nl-tipo').value;
  const obraId = document.getElementById('nl-obra').value;
  const planId = document.getElementById('nl-planilha').value;
  const cat = document.getElementById('nl-cat').value;
  const valor = parseFloat(document.getElementById('nl-valor').value) || 0;
  const desc = document.getElementById('nl-desc').value.trim();
  const forma = document.getElementById('nl-forma').value;

  if (!obraId) return App.toast('Selecione a obra', 'error');
  if (!valor) return App.toast('Informe o valor', 'error');
  if (!desc) return App.toast('Informe a descrição', 'error');

  App.setLoading(true);
  try {
    const realTipo = tipo === 'repasse' ? 'receita' : tipo;
    await addDoc('lancamentos', {
      obra_id: obraId,
      planilha_id: planId || null,
      tipo: realTipo,
      categoria: tipo === 'repasse' ? 'Repasse' : cat,
      valor, descricao: desc,
      forma_pagamento: forma,
      origem: tipo === 'repasse' ? 'repasse' : 'manual',
      status: 'ativo',
    });
    closeModal();
    App.toast('Lançamento salvo!');
    App.navigate('lancamentos');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.setLoading(false); }
}

// ─── CONFIGURAÇÕES ────────────────────────────────────────────
async function renderConfiguracoes() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page">
      <h1 class="page-title">⚙ Configurações</h1>

      <div class="card mb10">
        <div class="card-header"><span class="card-title">Conta</span></div>
        <div style="padding:8px 0;font-size:14px;color:var(--text2)">${App.user?.email || ''}</div>
        <button class="btn-danger btn-sm" onclick="doLogout()">Sair da conta</button>
      </div>

      <div class="card mb10">
        <div class="card-header"><span class="card-title">Empresas Contratantes</span></div>
        <button class="btn-secondary btn-sm" onclick="showNovaContratante()">+ Adicionar</button>
        <div id="contratantes-list-ui" style="margin-top:12px"></div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Sobre</span></div>
        <div style="font-size:13px;color:var(--text3);line-height:1.6">
          <strong>Marques Caetano · Gestão de Obras</strong><br>
          Versão 1.0 · Firebase Firestore<br>
          SaaS ready · Dados nunca apagados
        </div>
      </div>
    </div>`;

  // Carregar contratantes
  const snap = await empresaCol('empresas_contratantes').get();
  const cont = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  document.getElementById('contratantes-list-ui').innerHTML = cont.length === 0
    ? '<div class="empty">Nenhuma cadastrada</div>'
    : cont.map(c => `<div class="func-row"><div class="func-info"><div class="func-nome">${c.nome}</div><div class="func-meta">${c.cnpj || ''}</div></div></div>`).join('');
}

async function showNovaContratante() {
  showModal(`
    <h2 class="modal-title">Nova Contratante</h2>
    <div class="form-group">
      <label class="form-label">Nome</label>
      <input id="ct-nome" class="form-input" placeholder="Ex: ENGIX">
    </div>
    <div class="form-group">
      <label class="form-label">CNPJ</label>
      <input id="ct-cnpj" class="form-input" placeholder="00.000.000/0000-00">
    </div>
    <div class="btn-row">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="salvarContratante()">Salvar</button>
    </div>`);
}

async function salvarContratante() {
  const nome = document.getElementById('ct-nome').value.trim();
  const cnpj = document.getElementById('ct-cnpj').value.trim();
  if (!nome) return App.toast('Informe o nome', 'error');
  App.setLoading(true);
  try {
    await addDoc('empresas_contratantes', { nome, cnpj });
    closeModal();
    App.toast('Contratante salva!');
    App.navigate('configuracoes');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.setLoading(false); }
}

// Expor globalmente
window.renderPlanilhas = renderPlanilhas;
window.renderFuncionarios = renderFuncionarios;
window.renderOC = renderOC;
window.renderLancamentos = renderLancamentos;
window.renderConfiguracoes = renderConfiguracoes;
window.showNovaPlanilha = showNovaPlanilha;
window.salvarPlanilha = salvarPlanilha;
window.showNovoFuncionario = showNovoFuncionario;
window.showFolhaSugerida = showFolhaSugerida;
window.confirmarFolha = confirmarFolha;
window.showPagamentoFunc = showPagamentoFunc;
window.salvarPagamento = salvarPagamento;
window.reativarFunc = reativarFunc;
window.calcDiaria = calcDiaria;
window.toggleValorFunc = toggleValorFunc;
window.salvarFuncionario = salvarFuncionario;
window.showImportarOC = showImportarOC;
window.mostrarFormOCManual = mostrarFormOCManual;
window.processarPDF = processarPDF;
window.buscarObraByAcao = buscarObraByAcao;
window.carregarPlanilhasOC = carregarPlanilhasOC;
window.confirmarOC = confirmarOC;
window.cancelarOC = cancelarOC;
window.filtrarLancamentos = filtrarLancamentos;
window.showNovoLancamento = showNovoLancamento;
window.setTipo = setTipo;
window.carregarPlanilhasNL = carregarPlanilhasNL;
window.salvarLancamento = salvarLancamento;
window.showNovaContratante = showNovaContratante;
window.salvarContratante = salvarContratante;
window.doLogout = doLogout;
