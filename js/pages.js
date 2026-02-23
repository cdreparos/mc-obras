// ================================================================
// pages.js — Funcionários, Presença, OC, Lançamentos
// ================================================================

// ── FUNCIONÁRIOS ─────────────────────────────────────────────
async function renderFuncionarios() {
  const { funcionarios, alocacoes, obras, lancamentos } = await loadAll();
  const main = document.getElementById('main-content');
  const { mes: m, ano: a } = mes();

  const semFolha = funcionarios.filter(f => f.ativo && f.tipo_contrato==='mensalista').filter(f => {
    const aloc = alocacoes.find(al => al.funcionario_id===f.id && !al.data_fim);
    if (!aloc) return false;
    return !lancamentos.some(l =>
      l.origem==='funcionarios' && l.origem_ref_id===f.id &&
      l.competencia_mes===m && l.competencia_ano===a && l.status==='ativo');
  });

  main.innerHTML = `
  <div class="page">
    <div class="page-header">
      <h1 class="page-title"><div class="page-title-icon">👷</div>Funcionários</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="App.navigate('presenca')">📅 Presença</button>
        <button class="btn btn-primary" onclick="showNovoFuncionario()">+ Novo</button>
      </div>
    </div>

    ${semFolha.length>0 ? `
    <div class="alert warning" onclick="showFolhaSugerida()">
      <span class="alert-icon">📋</span>
      <span><strong>Folha sugerida para ${String(m).padStart(2,'0')}/${a}</strong> — ${semFolha.length} mensalista${semFolha.length>1?'s':''} aguardando confirmação. Clique para processar.</span>
    </div>` : ''}

    <div class="dash-grid">
      <div class="card">
        <div class="card-header"><span class="card-title-lg">Equipe Ativa (${funcionarios.filter(f=>f.ativo).length})</span></div>
        <div class="card-body">
          ${funcionarios.filter(f=>f.ativo).length===0 ? '<div class="empty">Nenhum funcionário ativo</div>' :
            funcionarios.filter(f=>f.ativo).map(f => {
              const aloc = alocacoes.find(al=>al.funcionario_id===f.id && !al.data_fim);
              const obra = obras.find(o=>o.id===aloc?.obra_id);
              const ini  = f.nome.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
              return `
              <div class="func-row">
                <div class="func-avatar">${ini}</div>
                <div class="func-info">
                  <div class="func-name">${f.nome}</div>
                  <div class="func-meta">${f.funcao||''} · ${obra?.nome||'<span style="color:var(--warning)">⚠ Sem alocação</span>'}</div>
                  <span class="badge ${f.tipo_contrato}">${f.tipo_contrato}</span>
                </div>
                <div>
                  <div class="func-value">${fmt(f.valor_base)}${f.tipo_contrato==='diarista'?'/dia':'/mês'}</div>
                  <div style="text-align:right;margin-top:6px;display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
                    <button class="btn-link" onclick="showPagamento('${f.id}')">Pagar</button>
                    <span style="color:var(--border2)">|</span>
                    <button class="btn-link" onclick="showEditarAloc('${f.id}')">Alocar</button>
                    <span style="color:var(--border2)">|</span>
                    <button class="btn-link" onclick="showEditarFuncionario('${f.id}')">Editar</button>
                    <span style="color:var(--border2)">|</span>
                    <button class="btn-link danger" onclick="inativarFuncionario('${f.id}','${f.nome.replace(/'/g,"\\'")}')">Inativar</button>
                  </div>
                </div>
              </div>`;
            }).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title-lg">Inativos (${funcionarios.filter(f=>!f.ativo).length})</span></div>
        <div class="card-body">
          ${funcionarios.filter(f=>!f.ativo).length===0 ? '<div class="empty">Nenhum</div>' :
            funcionarios.filter(f=>!f.ativo).map(f => `
            <div class="func-row inactive">
              <div class="func-avatar">${f.nome.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
              <div class="func-info">
                <div class="func-name">${f.nome}</div>
                <div class="func-meta">${f.funcao||''}</div>
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                <button class="btn btn-secondary btn-sm" onclick="reativarFunc('${f.id}')">Reativar</button>
                <button class="btn btn-danger btn-sm" onclick="excluirFuncionario('${f.id}','${f.nome.replace(/'/g,"\\'")}')">Excluir</button>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

async function showNovoFuncionario() {
  const { obras } = await loadAll();
  showModal({
    title: 'Novo Funcionário',
    body: `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nome Completo *</label>
          <input id="fn-nome" class="form-input" placeholder="Nome do funcionário">
        </div>
        <div class="form-group">
          <label class="form-label">Função</label>
          <input id="fn-func" class="form-input" placeholder="Ex: Pedreiro, Encarregado">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipo de Contrato</label>
          <select id="fn-tipo" class="form-input" onchange="atualizarLabelValor()">
            <option value="mensalista">Mensalista</option>
            <option value="diarista">Diarista</option>
            <option value="empreita">Empreita</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" id="fn-valor-lbl">Salário Mensal (R$)</label>
          <input id="fn-valor" class="form-input" type="number" step="0.01" placeholder="0,00">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Alocar na Obra</label>
        <select id="fn-obra" class="form-input">
          <option value="">— Sem alocação inicial —</option>
          ${obras.filter(o=>o.status==='ativa').map(o=>`<option value="${o.id}">${o.nome}</option>`).join('')}
        </select>
      </div>`,
    footer: `
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarFuncionario()">Cadastrar</button>`
  });
}

function atualizarLabelValor() {
  const t = document.getElementById('fn-tipo')?.value;
  const lbl = document.getElementById('fn-valor-lbl');
  if (lbl) lbl.textContent = t==='diarista' ? 'Valor por Dia (R$)' : t==='empreita' ? 'Valor Padrão (R$)' : 'Salário Mensal (R$)';
}

async function salvarFuncionario() {
  const nome  = document.getElementById('fn-nome').value.trim();
  const func  = document.getElementById('fn-func').value.trim();
  const tipo  = document.getElementById('fn-tipo').value;
  const valor = parseFloat(document.getElementById('fn-valor').value) || 0;
  const obraId= document.getElementById('fn-obra').value;
  if (!nome) return App.toast('Informe o nome', 'error');
  App.loading(true);
  try {
    const fnId = await addDoc2('funcionarios', { nome, funcao: func, tipo_contrato: tipo, valor_base: valor, ativo: true });
    if (obraId) {
      await addDoc2('alocacoes', { funcionario_id: fnId, obra_id: obraId, data_inicio: today(), data_fim: null });
    }
    closeModal();
    App.toast(`${nome} cadastrado!`);
    App.navigate('funcionarios');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.loading(false); }
}

async function showEditarFuncionario(funcId) {
  const func = App.cache.funcionarios.find(f=>f.id===funcId);
  if (!func) return;
  showModal({
    title: `Editar Funcionário`,
    body: `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nome Completo *</label>
          <input id="ef-nome" class="form-input" value="${func.nome}">
        </div>
        <div class="form-group">
          <label class="form-label">Função</label>
          <input id="ef-func" class="form-input" value="${func.funcao||''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipo de Contrato</label>
          <select id="ef-tipo" class="form-input" onchange="atualizarLabelValorEd()">
            <option value="mensalista" ${func.tipo_contrato==='mensalista'?'selected':''}>Mensalista</option>
            <option value="diarista"   ${func.tipo_contrato==='diarista'?'selected':''}>Diarista</option>
            <option value="empreita"   ${func.tipo_contrato==='empreita'?'selected':''}>Empreita</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" id="ef-valor-lbl">${func.tipo_contrato==='diarista'?'Valor por Dia':'Salário Mensal'} (R$)</label>
          <input id="ef-valor" class="form-input" type="number" step="0.01" value="${func.valor_base||0}">
        </div>
      </div>`,
    footer: `
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarEdicaoFuncionario('${funcId}')">Salvar</button>`
  });
}

function atualizarLabelValorEd() {
  const t = document.getElementById('ef-tipo')?.value;
  const lbl = document.getElementById('ef-valor-lbl');
  if (lbl) lbl.textContent = t==='diarista' ? 'Valor por Dia (R$)' : t==='empreita' ? 'Valor Padrão (R$)' : 'Salário Mensal (R$)';
}

async function salvarEdicaoFuncionario(funcId) {
  const nome  = document.getElementById('ef-nome').value.trim();
  const func  = document.getElementById('ef-func').value.trim();
  const tipo  = document.getElementById('ef-tipo').value;
  const valor = parseFloat(document.getElementById('ef-valor').value) || 0;
  if (!nome) return App.toast('Informe o nome', 'error');
  App.loading(true);
  try {
    await updateDoc2('funcionarios', funcId, { nome, funcao: func, tipo_contrato: tipo, valor_base: valor });
    closeModal();
    App.toast('Funcionário atualizado!');
    App.navigate('funcionarios');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.loading(false); }
}

async function inativarFuncionario(funcId, nome) {
  if (!confirm(`Inativar "${nome}"? Ele aparecerá na lista de inativos e poderá ser reativado.`)) return;
  App.loading(true);
  try {
    await updateDoc2('funcionarios', funcId, { ativo: false });
    // Encerrar alocações ativas
    const alocs = App.cache.alocacoes.filter(a=>a.funcionario_id===funcId && !a.data_fim);
    for (const a of alocs) await updateDoc2('alocacoes', a.id, { data_fim: today() });
    App.toast(`${nome} inativado.`);
    App.navigate('funcionarios');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.loading(false); }
}

async function excluirFuncionario(funcId, nome) {
  if (!confirm(`Excluir permanentemente "${nome}"?\n\nATENÇÃO: Esta ação não pode ser desfeita. Os lançamentos de pagamento anteriores serão mantidos.`)) return;
  App.loading(true);
  try {
    await deleteDoc2('funcionarios', funcId);
    App.toast(`${nome} excluído.`);
    App.navigate('funcionarios');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.loading(false); }
}

async function showEditarAloc(funcId) {
  const { obras, alocacoes } = await loadAll();
  const func = App.cache.funcionarios.find(f=>f.id===funcId);
  const alocAtual = alocacoes.find(a=>a.funcionario_id===funcId && !a.data_fim);
  showModal({
    title: `Alocação · ${func?.nome||''}`,
    body: `
      <div class="form-group">
        <label class="form-label">Obra Atual</label>
        <select id="aloc-obra" class="form-input">
          <option value="">— Sem alocação —</option>
          ${obras.filter(o=>o.status==='ativa').map(o=>`<option value="${o.id}" ${o.id===alocAtual?.obra_id?'selected':''}>${o.nome}</option>`).join('')}
        </select>
      </div>`,
    footer: `
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarAloc('${funcId}','${alocAtual?.id||''}')">Salvar</button>`
  });
}

async function salvarAloc(funcId, alocAtualId) {
  const obraId = document.getElementById('aloc-obra').value;
  App.loading(true);
  try {
    if (alocAtualId) await updateDoc2('alocacoes', alocAtualId, { data_fim: today() });
    if (obraId) await addDoc2('alocacoes', { funcionario_id: funcId, obra_id: obraId, data_inicio: today(), data_fim: null });
    closeModal();
    App.toast('Alocação atualizada!');
    App.navigate('funcionarios');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.loading(false); }
}

async function showPagamento(funcId) {
  const { obras, alocacoes } = await loadAll();
  const func = App.cache.funcionarios.find(f=>f.id===funcId);
  if (!func) return App.toast('Funcionário não encontrado','error');

  const aloc = alocacoes.find(a => a.funcionario_id===funcId && !a.data_fim);
  const obra = obras.find(o=>o.id===aloc?.obra_id);
  const { mes: m, ano: a } = mes();

  showModal({
    title: `Pagamento · ${func.nome}`,
    body: `
      ${!aloc ? '<div class="alert danger no-click"><span>⚠ Funcionário sem alocação ativa. Aloque-o em uma obra antes de registrar pagamento.</span></div>' : ''}
      ${obra ? `<div class="info-box">🏗 Obra: <strong>${obra.nome}</strong></div>` : ''}
      ${func.tipo_contrato==='diarista' ? `
      <div class="form-group">
        <label class="form-label">Número de Dias Trabalhados</label>
        <input id="pg-dias" class="form-input" type="number" min="1" placeholder="0" oninput="calcDiaria(${func.valor_base})">
        <div id="pg-calc" class="form-hint"></div>
      </div>` : ''}
      <div class="form-group">
        <label class="form-label">${func.tipo_contrato==='diarista'?'Valor Total (R$)':func.tipo_contrato==='empreita'?'Valor da Empreita (R$)':'Valor (R$)'}</label>
        <input id="pg-valor" class="form-input" type="number" step="0.01" value="${func.tipo_contrato==='mensalista'?func.valor_base:''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select id="pg-tipo" class="form-input">
            <option value="salario">Salário</option>
            <option value="adiantamento">Adiantamento</option>
            <option value="va">Vale Alimentação</option>
            <option value="vt">Vale Transporte</option>
            <option value="bonus">Bônus/Extra</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Forma</label>
          <select id="pg-forma" class="form-input">
            <option value="pix">PIX</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="transferencia">Transferência</option>
          </select>
        </div>
      </div>
      <input type="hidden" id="pg-obra-id" value="${aloc?.obra_id||''}">
      <input type="hidden" id="pg-func-id" value="${funcId}">`,
    footer: `
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="confirmarPagamento()" ${!aloc?'disabled':''}>✓ Confirmar</button>`
  });
}

function calcDiaria(valorDia) {
  const dias = parseInt(document.getElementById('pg-dias')?.value)||0;
  const total = dias * valorDia;
  const el = document.getElementById('pg-valor');
  if (el) el.value = total;
  const calc = document.getElementById('pg-calc');
  if (calc) calc.textContent = `${dias} dias × ${fmt(valorDia)} = ${fmt(total)}`;
}

async function confirmarPagamento() {
  const valor  = parseFloat(document.getElementById('pg-valor')?.value)||0;
  const tipo   = document.getElementById('pg-tipo')?.value;
  const forma  = document.getElementById('pg-forma')?.value;
  const obraId = document.getElementById('pg-obra-id')?.value;
  const funcId = document.getElementById('pg-func-id')?.value;

  if (!valor || valor <= 0) return App.toast('Informe um valor válido', 'error');
  if (!obraId) return App.toast('Funcionário sem alocação ativa', 'error');

  const func = App.cache.funcionarios.find(f=>f.id===funcId);
  const { mes: m, ano: a } = mes();

  App.loading(true);
  try {
    await addDoc2('lancamentos', {
      obra_id: obraId, planilha_id: null,
      tipo: 'despesa', categoria: 'Folha', valor,
      descricao: `${tipo==='salario'?'Salário':tipo==='adiantamento'?'Adiantamento':tipo==='va'?'Vale Alimentação':tipo==='vt'?'Vale Transporte':'Bônus'} — ${func?.nome||''}`,
      origem: 'funcionarios', origem_ref_id: funcId,
      competencia_mes: m, competencia_ano: a,
      forma_pagamento: forma, status: 'ativo',
    });
    closeModal();
    App.toast(`Pagamento de ${fmt(valor)} lançado!`);
    App.navigate('funcionarios');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.loading(false); }
}

async function showFolhaSugerida() {
  const { funcionarios, alocacoes, obras, lancamentos } = await loadAll();
  const { mes: m, ano: a } = mes();

  const lista = funcionarios.filter(f=>f.ativo&&f.tipo_contrato==='mensalista').map(f => {
    const aloc = alocacoes.find(al=>al.funcionario_id===f.id && !al.data_fim);
    if (!aloc) return null;
    const jaLancado = lancamentos.some(l=>l.origem==='funcionarios'&&l.origem_ref_id===f.id&&l.competencia_mes===m&&l.competencia_ano===a&&l.status==='ativo');
    if (jaLancado) return null;
    const obra = obras.find(o=>o.id===aloc.obra_id);
    return {...f, alocacao:aloc, obra};
  }).filter(Boolean);

  if (lista.length===0) return App.toast('Todos os mensalistas já têm folha deste mês!','info');

  showModal({
    title: `Folha ${String(m).padStart(2,'0')}/${a}`,
    body: `
      <div class="alert success no-click"><span>Confirme os pagamentos de salário abaixo</span></div>
      ${lista.map(f=>`
      <div class="folha-item">
        <div class="folha-check">
          <input type="checkbox" id="fc-${f.id}" class="checkbox" checked>
          <div>
            <div style="font-size:14px;font-weight:600">${f.nome}</div>
            <div style="font-size:11px;color:var(--text3)">${f.obra?.nome||'—'}</div>
          </div>
        </div>
        <div style="font-size:14px;font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--blue-600)">${fmt(f.valor_base)}</div>
      </div>`).join('')}
      <div class="divider"></div>
      <div class="folha-total">
        <span>Total</span>
        <span style="font-family:'JetBrains Mono',monospace;color:var(--blue-700)">${fmt(lista.reduce((s,f)=>s+f.valor_base,0))}</span>
      </div>`,
    footer: `
      <button class="btn btn-secondary" onclick="closeModal()">Ignorar por agora</button>
      <button class="btn btn-primary" onclick="confirmarFolha(${JSON.stringify(lista.map(f=>({id:f.id,valor:f.valor_base,obraId:f.alocacao.obra_id,nome:f.nome})))})">✓ Confirmar Selecionados</button>`
  });
}

async function confirmarFolha(lista) {
  const { mes: m, ano: a } = mes();
  const selecionados = lista.filter(f => document.getElementById('fc-'+f.id)?.checked);
  if (selecionados.length===0) return App.toast('Selecione ao menos um funcionário','warning');
  App.loading(true);
  try {
    for (const f of selecionados) {
      await addDoc2('lancamentos', {
        obra_id: f.obraId, planilha_id: null,
        tipo: 'despesa', categoria: 'Folha', valor: f.valor,
        descricao: `Salário ${String(m).padStart(2,'0')}/${a} — ${f.nome}`,
        origem: 'funcionarios', origem_ref_id: f.id,
        competencia_mes: m, competencia_ano: a, status: 'ativo',
      });
    }
    closeModal();
    App.toast(`Folha de ${selecionados.length} funcionário(s) lançada!`);
    App.navigate('funcionarios');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.loading(false); }
}

async function reativarFunc(id) {
  await updateDoc2('funcionarios', id, { ativo: true });
  App.toast('Funcionário reativado!');
  App.navigate('funcionarios');
}


// ── CONTROLE DE PRESENÇA ──────────────────────────────────────
async function renderPresenca() {
  const { funcionarios, obras } = await loadAll();
  const main = document.getElementById('main-content');

  const hoje = today();
  const diasSemana = [];
  for (let i=6; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    diasSemana.push(d.toISOString().split('T')[0]);
  }

  // Carregar presenças do Firestore para esta semana
  const initDate = diasSemana[0];
  let presencas = [];
  try {
    const snap = await empresaCol('presencas')
      .where('data', '>=', initDate).get();
    presencas = snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch(e) {}

  const ativos = funcionarios.filter(f=>f.ativo);

  function getStatus(funcId, dia) {
    const p = presencas.find(p=>p.funcionario_id===funcId && p.data===dia);
    return p?.status || null;
  }

  const statusCfg = {
    presente: { icon:'✓', label:'P', cls:'presente' },
    ausente:  { icon:'✕', label:'F', cls:'ausente' },
    atestado: { icon:'🏥', label:'A', cls:'atestado' },
    folga:    { icon:'🌙', label:'Fg', cls:'folga' },
  };

  const diasShort = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  main.innerHTML = `
  <div class="page">
    <div class="page-header">
      <div>
        <button class="back-btn" onclick="App.navigate('funcionarios')">← Funcionários</button>
        <h1 class="page-title"><div class="page-title-icon">📅</div>Controle de Presença</h1>
      </div>
      <div class="page-actions">
        <span style="font-size:12px;color:var(--text3)">Últimos 7 dias</span>
      </div>
    </div>

    <div class="alert info no-click" style="margin-bottom:16px">
      <span class="alert-icon">ℹ</span>
      <span>Clique nos botões para registrar: <strong>✓ Presente</strong> · <strong>✕ Falta</strong> · <strong>🏥 Atestado</strong> · <strong>🌙 Folga</strong>. Para diaristas, os dias presentes podem ser usados para calcular pagamento.</span>
    </div>

    <!-- Legenda -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      ${Object.entries(statusCfg).map(([k,v])=>`<span class="badge ${v.cls}">${v.icon} ${k.charAt(0).toUpperCase()+k.slice(1)}</span>`).join('')}
    </div>

    <div class="card" style="overflow-x:auto">
      <table class="presence-table">
        <thead>
          <tr>
            <th style="min-width:140px">Funcionário</th>
            ${diasSemana.map(d=>{
              const dt=new Date(d+'T12:00:00');
              return `<th style="min-width:52px">${diasShort[dt.getDay()]}<br><span style="font-size:9px;opacity:.6">${dt.getDate()}/${dt.getMonth()+1}</span></th>`;
            }).join('')}
            <th>Resumo</th>
          </tr>
        </thead>
        <tbody>
          ${ativos.map(f => {
            const diasP = diasSemana.filter(d => getStatus(f.id,d)==='presente').length;
            return `
            <tr>
              <td>
                <div style="font-size:13px;font-weight:700">${f.nome}</div>
                <div><span class="badge ${f.tipo_contrato}" style="margin-top:3px">${f.tipo_contrato}</span></div>
              </td>
              ${diasSemana.map(d => {
                const s = getStatus(f.id, d);
                const cfg = s ? statusCfg[s] : null;
                return `
                <td>
                  <div style="display:flex;flex-direction:column;gap:3px;align-items:center">
                    <button class="presence-btn ${s||''}" onclick="togglePresenca('${f.id}','${d}',this)"
                      title="${s||'Não registrado'}">
                      ${cfg ? cfg.icon : '—'}
                    </button>
                  </div>
                </td>`;
              }).join('')}
              <td>
                <div style="font-size:11px;font-weight:700;color:var(--blue-600)">${diasP} dias</div>
                ${f.tipo_contrato==='diarista' ? `
                <div style="font-size:10px;color:var(--text3)">${fmt(diasP*f.valor_base)}</div>
                <button class="btn-link" style="font-size:10px" onclick="pagarDiasPresenca('${f.id}',${diasP},${f.valor_base})">Gerar pgto</button>
                ` : ''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div style="margin-top:16px;font-size:12px;color:var(--text3);text-align:center">
      Os dados de presença ficam salvos e podem ser consultados a qualquer momento. Futuramente poderão ser integrados ao sistema de pagamentos.
    </div>
  </div>`;
}

async function togglePresenca(funcId, data, btn) {
  const statusCycle = [null, 'presente', 'ausente', 'atestado', 'folga'];
  const icons = { presente:'✓', ausente:'✕', atestado:'🏥', folga:'🌙', null:'—' };

  // Buscar status atual
  let snap;
  try {
    snap = await empresaCol('presencas')
      .where('funcionario_id','==',funcId).where('data','==',data).get();
  } catch(e) {}

  const atual = snap?.docs[0];
  const statusAtual = atual?.data()?.status || null;
  const idx = statusCycle.indexOf(statusAtual);
  const proximo = statusCycle[(idx+1) % statusCycle.length];

  try {
    if (atual) {
      if (proximo === null) {
        await empresaCol('presencas').doc(atual.id).delete();
      } else {
        await empresaCol('presencas').doc(atual.id).update({ status: proximo });
      }
    } else if (proximo !== null) {
      await addDoc2('presencas', { funcionario_id: funcId, data, status: proximo });
    }

    // Atualizar botão visualmente
    const cfgs = { presente:'presente', ausente:'ausente', atestado:'atestado', folga:'folga' };
    btn.className = `presence-btn ${proximo||''}`;
    btn.textContent = icons[proximo] || '—';
    btn.title = proximo || 'Não registrado';
  } catch(e) {
    App.toast('Erro ao salvar presença: '+e.message,'error');
  }
}

async function pagarDiasPresenca(funcId, dias, valorDia) {
  if (dias===0) return App.toast('Nenhum dia presente registrado','warning');
  const { obras, alocacoes } = await loadAll();
  const aloc = alocacoes.find(a=>a.funcionario_id===funcId && !a.data_fim);
  if (!aloc) return App.toast('Funcionário sem alocação ativa','error');
  const func = App.cache.funcionarios.find(f=>f.id===funcId);
  const total = dias * valorDia;
  const { mes: m, ano: a } = mes();

  if (!confirm(`Lançar pagamento de ${dias} dia(s) × ${fmt(valorDia)} = ${fmt(total)} para ${func?.nome}?`)) return;
  App.loading(true);
  try {
    await addDoc2('lancamentos', {
      obra_id: aloc.obra_id, planilha_id: null,
      tipo: 'despesa', categoria: 'Folha', valor: total,
      descricao: `Diárias (${dias} dias) — ${func?.nome||''}`,
      origem: 'funcionarios', origem_ref_id: funcId,
      competencia_mes: m, competencia_ano: a, status: 'ativo',
    });
    App.toast(`Pagamento de ${fmt(total)} lançado!`);
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.loading(false); }
}


// ── ORDENS DE COMPRA ──────────────────────────────────────────
// Parser baseado nos modelos reais Ferreira Santos / ENGIX
function parsearOC(texto) {
  const r = {};

  // Nº da OC: "Nº:\n12257" ou "Nº: 12257"
  const mNum = texto.match(/N[º°o][\s:\n\r]+(\d{4,6})/i);
  if (mNum) r.numero_oc = mNum[1].trim();

  // Nº Obra / Ação: "Nº Obra\n1671" ou linha com número após "Nº Obra"
  const mAcao = texto.match(/N[º°o]\s*Obra[\s\n\r]+(\d{3,6})/i)
    || texto.match(/A[çc][aã]o:?\s*(\d{3,6})/i)
    || texto.match(/A[ÇC][ÃA]O[\s:,]+(\d{3,6})/i);
  if (mAcao) r.numero_acao = mAcao[1].trim();

  // Fornecedor: linha após "Fornec.:" ou "Fornecedor:"
  const mForn = texto.match(/Fornec[.\s:]+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][^\n\r]{3,60})/i)
    || texto.match(/Fornecedor[\s:]+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][^\n\r]{3,60})/i);
  if (mForn) r.fornecedor = mForn[1].trim().replace(/\s+/g,' ');

  // CNPJ Fornecedor — pegar o último CNPJ encontrado (fornecedor, não empresa)
  const todosCNPJ = [...texto.matchAll(/(\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2})/g)].map(m=>m[1]);
  if (todosCNPJ.length > 0) r.cnpj_fornecedor = todosCNPJ[todosCNPJ.length-1];

  // Data: campo "DATA" seguido de data
  const mData = texto.match(/\bDATA\b[\s\n\r]+([\d]{2}\/[\d]{2}\/[\d]{4})/i)
    || texto.match(/Entrega[\s:]+([\d]{2}\/[\d]{2}\/[\d]{4})/i)
    || texto.match(/([\d]{2}\/[\d]{2}\/[\d]{4})/);
  if (mData) {
    const partes = mData[1].split('/');
    if (partes.length===3) r.data_emissao = `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  // Valor Total: "Total:\n615,20" ou "Total: 615,20"
  const mTotal = texto.match(/\bTotal[\s:]*\n\s*([\d\.]+,\d{2})/i)
    || texto.match(/\bTotal[\s:]*R?\$?\s*([\d\.]+,\d{2})/i);
  if (mTotal) r.valor_total = parseFloat(mTotal[1].replace(/\./g,'').replace(',','.'));

  // Nome da obra: campo "Obra" → linha longa de descrição
  const mObra = texto.match(/\bObra\b[\s\n\r]+(\d{1,6})\s*\n([^\n\r]{10,100})/i);
  if (mObra) r.nome_obra = mObra[2].trim();

  return r;
}

async function renderOC() {
  const { ordens_compra, obras, planilhas } = await loadAll();
  const main = document.getElementById('main-content');
  const ativas    = ordens_compra.filter(o=>o.status==='ativa');
  const canceladas= ordens_compra.filter(o=>o.status==='cancelada');

  main.innerHTML = `
  <div class="page">
    <div class="page-header">
      <h1 class="page-title"><div class="page-title-icon">📄</div>Ordens de Compra</h1>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="showImportarOC()">+ Importar OC</button>
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
      <div class="stat-card">
        <div class="stat-card-inner"><div><div class="stat-label">OCs Ativas</div><div class="stat-value">${ativas.length}</div></div><div class="stat-icon blue">📄</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-card-inner"><div><div class="stat-label">Total Comprometido</div><div class="stat-value sm">${fmt(ativas.reduce((s,o)=>s+(o.valor_total||0),0))}</div></div><div class="stat-icon red">💸</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-card-inner"><div><div class="stat-label">Canceladas</div><div class="stat-value">${canceladas.length}</div></div><div class="stat-icon yellow">🚫</div></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title-lg">OCs Ativas</span></div>
      <div class="card-body">
        ${ativas.length===0 ? '<div class="empty">Nenhuma OC ativa</div>' :
          ativas.map(oc=>ocRow(oc,obras,planilhas,true)).join('')}
      </div>
    </div>

    ${canceladas.length>0 ? `
    <div class="card">
      <div class="card-header"><span class="card-title-lg">OCs Canceladas</span></div>
      <div class="card-body">
        ${canceladas.map(oc=>ocRow(oc,obras,planilhas,false)).join('')}
      </div>
    </div>` : ''}
  </div>`;
}

function ocRow(oc, obras, planilhas, canCancel) {
  const obra = obras.find(o=>o.id===oc.obra_id);
  const pl   = planilhas.find(p=>p.id===oc.planilha_id);
  return `
  <div class="oc-row ${oc.status==='cancelada'?'cancelada':''}">
    <div class="oc-header">
      <span class="oc-num">OC ${oc.numero_oc||'—'} · Ação ${oc.numero_acao||'—'}</span>
      <span class="oc-date">${fmtDate(oc.data_emissao)}</span>
    </div>
    <div class="oc-forn">${oc.fornecedor||'—'}</div>
    <div class="oc-footer">
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        <span class="tag blue">${obra?.nome||'—'}</span>
        <span class="tag">${pl?.nome||'Sem planilha'}</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="oc-value">${fmt(oc.valor_total)}</span>
        ${canCancel
          ? `<button class="btn btn-danger btn-sm" onclick="cancelarOCGlobal('${oc.id}')">Cancelar</button>`
          : `<span class="badge cancelada">cancelada</span>`}
      </div>
    </div>
  </div>`;
}

async function cancelarOCGlobal(ocId) {
  const snap = await empresaCol('ordens_compra').doc(ocId).get();
  const oc = snap.data();
  await cancelarOC(ocId, oc.obra_id);
  App.navigate('ordens_compra');
}

async function showImportarOC(obraIdPre = '') {
  const { obras } = await loadAll();
  showModal({
    title: 'Importar Ordem de Compra',
    body: `
      <div id="oc-step1">
        <div class="upload-area" id="oc-drop" onclick="document.getElementById('oc-file').click()"
          ondragover="event.preventDefault();this.classList.add('drag')"
          ondragleave="this.classList.remove('drag')"
          ondrop="event.preventDefault();this.classList.remove('drag');processarArquivoOC(event.dataTransfer.files[0])">
          <div class="upload-icon">📄</div>
          <div class="upload-text">Arraste o PDF da OC aqui</div>
          <div class="upload-sub">ou clique para selecionar · Compatível com Ferreira Santos, ENGIX e outros</div>
          <input type="file" id="oc-file" accept=".pdf,.txt" style="display:none" onchange="processarArquivoOC(this.files[0])">
        </div>
        <div style="margin-top:12px;text-align:center">
          <button class="btn-link" onclick="mostrarFormOCManual('${obraIdPre}')">Preencher manualmente →</button>
        </div>
      </div>
      <div id="oc-step2" style="display:none"></div>`
  });
}

async function processarArquivoOC(file) {
  if (!file) return;
  document.getElementById('oc-drop').innerHTML = `<div class="upload-icon">⏳</div><div class="upload-text">Lendo PDF...</div>`;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const bytes = new Uint8Array(e.target.result);
      const raw = new TextDecoder('latin1').decode(bytes);

      // Método 1: Extrair strings de texto do PDF (BT...ET)
      const streams = [];
      const btRe = /BT([\s\S]*?)ET/g;
      let m;
      while ((m = btRe.exec(raw)) !== null) {
        const bloco = m[1];
        const strRe = /\(([^)]*)\)/g;
        let sm;
        while ((sm = strRe.exec(bloco)) !== null) {
          const s = sm[1]
            .replace(/\\n/g,'\n').replace(/\\r/g,'')
            .replace(/\\\(/g,'(').replace(/\\\)/g,')');
          if (s.trim()) streams.push(s.trim());
        }
      }
      let texto = streams.join('\n');

      // Método 2: fallback texto simples
      if (texto.length < 50) {
        texto = raw.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g,' ');
      }

      await exibirPreviewOC(texto, file.name);
    } catch(err) {
      mostrarFormOCManual('');
      App.toast('Não foi possível ler o PDF automaticamente. Preencha manualmente.','warning');
    }
  };
  reader.readAsArrayBuffer(file);
}

async function exibirPreviewOC(texto, filename) {
  const { obras, planilhas } = await loadAll();
  const dados = parsearOC(texto + '\n' + filename);

  let obraEncontrada = null;
  if (dados.numero_acao) {
    obraEncontrada = obras.find(o => o.numero_acao === dados.numero_acao);
  }

  const pls = obraEncontrada ? planilhas.filter(p=>p.obra_id===obraEncontrada.id) : [];

  document.getElementById('oc-step1').style.display = 'none';
  document.getElementById('oc-step2').innerHTML = `
    <div class="alert success no-click"><span>✓ Dados extraídos — confira e ajuste se necessário</span></div>

    <div class="oc-preview">
      <div class="oc-preview-header">Dados Extraídos da OC</div>
      ${[
        ['Nº OC', dados.numero_oc||''],
        ['Nº Ação', dados.numero_acao||''],
        ['Fornecedor', dados.fornecedor||''],
        ['CNPJ Fornecedor', dados.cnpj_fornecedor||''],
        ['Data Emissão', dados.data_emissao ? fmtDate(new Date(dados.data_emissao+'T12:00')) : ''],
        ['Total', dados.valor_total ? fmt(dados.valor_total) : ''],
      ].map(([k,v])=>`
      <div class="oc-preview-row">
        <span class="oc-preview-key">${k}</span>
        <span class="oc-preview-val">${v||'<span style="color:var(--text3)">não identificado</span>'}</span>
      </div>`).join('')}
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Nº OC *</label>
        <input id="oi-num" class="form-input" value="${dados.numero_oc||''}" style="font-family:'JetBrains Mono',monospace">
      </div>
      <div class="form-group">
        <label class="form-label">Nº Ação</label>
        <input id="oi-acao" class="form-input" value="${dados.numero_acao||''}" style="font-family:'JetBrains Mono',monospace" oninput="buscarObraPorAcao()">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Fornecedor *</label>
      <input id="oi-forn" class="form-input" value="${dados.fornecedor||''}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">CNPJ Fornecedor</label>
        <input id="oi-cnpj" class="form-input" value="${dados.cnpj_fornecedor||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Valor Total (R$) *</label>
        <input id="oi-valor" class="form-input" type="number" step="0.01" value="${dados.valor_total||''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Data de Emissão</label>
        <input id="oi-data" class="form-input" type="date" value="${dados.data_emissao||today()}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Obra</label>
      <select id="oi-obra" class="form-input" onchange="carregarPlanilhasOI()">
        <option value="">— Selecione —</option>
        ${obras.filter(o=>o.status==='ativa').map(o=>`<option value="${o.id}" data-acao="${o.numero_acao||''}" ${obraEncontrada?.id===o.id?'selected':''}>${o.nome} (${o.numero_acao||'—'})</option>`).join('')}
      </select>
      ${obraEncontrada ? '<div class="form-hint" style="color:var(--success)">✓ Obra identificada automaticamente pelo número de ação</div>' : ''}
    </div>
    <div class="form-group" id="oi-plan-grp">
      <label class="form-label">Planilha (centro de custo) *</label>
      <select id="oi-plan" class="form-input">
        ${pls.length===0
          ? '<option value="">— Selecione a obra primeiro —</option>'
          : '<option value="">— Selecione —</option>'+pls.map(p=>`<option value="${p.id}">${p.nome}</option>`).join('')}
      </select>
    </div>`;

  if (pls.length===1) {
    setTimeout(()=>{ const s=document.getElementById('oi-plan'); if(s) s.value=pls[0].id; },50);
  }

  document.getElementById('oc-step2').style.display = 'block';

  const footer = document.querySelector('.modal-footer');
  if (footer) footer.innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="confirmarImportacaoOC()">✓ Confirmar e Lançar</button>`;
  else {
    // Adicionar footer se não existir
    const modal = document.querySelector('.modal');
    if (modal) {
      const f = document.createElement('div');
      f.className = 'modal-footer';
      f.innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="confirmarImportacaoOC()">✓ Confirmar e Lançar</button>`;
      modal.appendChild(f);
    }
  }
}

function buscarObraPorAcao() {
  const acao = document.getElementById('oi-acao')?.value.trim();
  if (!acao) return;
  const sel = document.getElementById('oi-obra');
  if (!sel) return;
  const opt = Array.from(sel.options).find(o=>o.dataset.acao===acao);
  if (opt) { sel.value = opt.value; carregarPlanilhasOI(); App.toast('Obra identificada pelo número de ação!','info'); }
}

async function carregarPlanilhasOI() {
  const obraId = document.getElementById('oi-obra')?.value;
  const sel    = document.getElementById('oi-plan');
  if (!sel) return;
  if (!obraId) { sel.innerHTML='<option value="">— Selecione a obra primeiro —</option>'; return; }
  const snap = await empresaCol('planilhas').where('obra_id','==',obraId).get();
  const pls  = snap.docs.map(d=>({id:d.id,...d.data()}));
  sel.innerHTML = pls.length===0
    ? '<option value="">Sem planilhas nesta obra</option>'
    : '<option value="">— Selecione —</option>'+pls.map(p=>`<option value="${p.id}">${p.nome}</option>`).join('');
  if (pls.length===1) sel.value = pls[0].id;
}

async function mostrarFormOCManual(obraIdPre='') {
  const { obras, planilhas } = await loadAll();
  document.getElementById('oc-step1').style.display = 'none';
  document.getElementById('oc-step2').innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Nº OC *</label>
        <input id="oi-num" class="form-input" style="font-family:'JetBrains Mono',monospace" placeholder="12257">
      </div>
      <div class="form-group">
        <label class="form-label">Nº Ação</label>
        <input id="oi-acao" class="form-input" style="font-family:'JetBrains Mono',monospace" placeholder="1671" oninput="buscarObraPorAcao()">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Fornecedor *</label>
      <input id="oi-forn" class="form-input" placeholder="Nome do fornecedor">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">CNPJ Fornecedor</label>
        <input id="oi-cnpj" class="form-input" placeholder="00.000.000/0000-00">
      </div>
      <div class="form-group">
        <label class="form-label">Valor Total (R$) *</label>
        <input id="oi-valor" class="form-input" type="number" step="0.01" placeholder="0,00">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Data de Emissão</label>
      <input id="oi-data" class="form-input" type="date" value="${today()}">
    </div>
    <div class="form-group">
      <label class="form-label">Obra *</label>
      <select id="oi-obra" class="form-input" onchange="carregarPlanilhasOI()">
        <option value="">— Selecione —</option>
        ${obras.filter(o=>o.status==='ativa').map(o=>`<option value="${o.id}" data-acao="${o.numero_acao||''}" ${o.id===obraIdPre?'selected':''}>${o.nome} (${o.numero_acao||'—'})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Planilha *</label>
      <select id="oi-plan" class="form-input">
        <option value="">— Selecione a obra primeiro —</option>
      </select>
    </div>`;
  document.getElementById('oc-step2').style.display = 'block';
  if (obraIdPre) carregarPlanilhasOI();

  const footer = document.querySelector('.modal-footer');
  if (footer) footer.innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="confirmarImportacaoOC()">✓ Confirmar e Lançar</button>`;
}

async function confirmarImportacaoOC() {
  const num    = document.getElementById('oi-num')?.value.trim();
  const acao   = document.getElementById('oi-acao')?.value.trim();
  const forn   = document.getElementById('oi-forn')?.value.trim();
  const cnpj   = document.getElementById('oi-cnpj')?.value.trim();
  const valor  = parseFloat(document.getElementById('oi-valor')?.value)||0;
  const data   = document.getElementById('oi-data')?.value||today();
  const obraId = document.getElementById('oi-obra')?.value;
  const planId = document.getElementById('oi-plan')?.value;

  if (!num)    return App.toast('Informe o número da OC', 'error');
  if (!forn)   return App.toast('Informe o fornecedor', 'error');
  if (!obraId) return App.toast('Selecione a obra', 'error');
  if (!planId) return App.toast('Selecione a planilha', 'error');
  if (!valor)  return App.toast('Informe o valor total', 'error');

  App.loading(true);
  try {
    const dup = await empresaCol('ordens_compra')
      .where('numero_oc','==',num).where('obra_id','==',obraId).get();

    if (!dup.empty) {
      App.loading(false);
      const ocExist = dup.docs[0].data();
      showModal({
        title: '⚠ OC Duplicada Detectada',
        body: `
          <div class="alert warning no-click">
            <span>A OC <strong>${num}</strong> já existe nesta obra com valor <strong>${fmt(ocExist.valor_total)}</strong> — ${fmtDate(ocExist.data_emissao)}.</span>
          </div>
          <p style="font-size:14px;color:var(--text2);margin-bottom:16px">O que deseja fazer?</p>`,
        footer: `
          <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-danger btn-sm" onclick="closeModal()">Manter a original</button>
          <button class="btn btn-primary" onclick="forcarImportacaoOC('${num}','${acao}','${forn}','${cnpj}',${valor},'${data}','${obraId}','${planId}')">Substituir</button>`
      });
      return;
    }

    await gravarOC(num, acao, forn, cnpj, valor, data, obraId, planId);
  } catch(e) { App.toast('Erro: '+e.message,'error'); App.loading(false); }
}

async function forcarImportacaoOC(num,acao,forn,cnpj,valor,data,obraId,planId) {
  closeModal();
  App.loading(true);
  try {
    const dup = await empresaCol('ordens_compra').where('numero_oc','==',num).where('obra_id','==',obraId).get();
    for (const d of dup.docs) {
      await updateDoc2('ordens_compra', d.id, { status: 'cancelada' });
      const ls = await empresaCol('lancamentos').where('origem_ref_id','==',d.id).where('status','==','ativo').get();
      for (const l of ls.docs) await estornarLancamento(l.id);
    }
    await gravarOC(num,acao,forn,cnpj,parseFloat(valor),data,obraId,planId);
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.loading(false); }
}

async function gravarOC(num,acao,forn,cnpj,valor,data,obraId,planId) {
  const ocId = await addDoc2('ordens_compra', {
    numero_oc:num, numero_acao:acao, fornecedor:forn, cnpj_fornecedor:cnpj,
    valor_total:valor, data_emissao:data, obra_id:obraId, planilha_id:planId, status:'ativa'
  });
  await addDoc2('lancamentos', {
    obra_id:obraId, planilha_id:planId,
    tipo:'despesa', categoria:'Material/OC',
    valor, descricao:`OC ${num} — ${forn}`,
    origem:'ordem_compra', origem_ref_id:ocId, status:'ativo'
  });
  App.loading(false);
  closeModal();
  App.toast(`OC ${num} importada! ${fmt(valor)} debitado imediatamente.`);
  App.navigate('ordens_compra');
}


// ── LANÇAMENTOS ───────────────────────────────────────────────
async function renderLancamentos() {
  const { lancamentos, obras, planilhas } = await loadAll();
  const main = document.getElementById('main-content');

  main.innerHTML = `
  <div class="page">
    <div class="page-header">
      <h1 class="page-title"><div class="page-title-icon">📊</div>Lançamentos</h1>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="showNovoLancamento()">+ Novo</button>
      </div>
    </div>

    <div class="filter-row">
      <select id="fl-obra" class="form-input" onchange="filtrarLancs()">
        <option value="">Todas as obras</option>
        ${obras.map(o=>`<option value="${o.id}">${o.nome}</option>`).join('')}
      </select>
      <select id="fl-origem" class="form-input" onchange="filtrarLancs()">
        <option value="">Todas as origens</option>
        <option value="ordem_compra">Ordem de Compra</option>
        <option value="funcionarios">Funcionários</option>
        <option value="repasse">Repasse</option>
        <option value="manual">Manual</option>
      </select>
      <select id="fl-tipo" class="form-input" onchange="filtrarLancs()">
        <option value="">Todos os tipos</option>
        <option value="despesa">Despesas</option>
        <option value="receita">Receitas</option>
      </select>
    </div>

    <div class="card" id="lancs-container">
      <div class="card-body">${renderLancList(lancamentos.filter(l=>l.status==='ativo'), obras, planilhas)}</div>
    </div>
  </div>`;

  window._lancsData = { lancamentos, obras, planilhas };
}

function filtrarLancs() {
  const obraF   = document.getElementById('fl-obra')?.value;
  const origemF = document.getElementById('fl-origem')?.value;
  const tipoF   = document.getElementById('fl-tipo')?.value;
  const { lancamentos, obras, planilhas } = window._lancsData;

  const filtrados = lancamentos.filter(l => {
    if (l.status !== 'ativo') return false;
    if (obraF   && l.obra_id  !== obraF)   return false;
    if (origemF && l.origem   !== origemF)  return false;
    if (tipoF   && l.tipo     !== tipoF)    return false;
    return true;
  });

  document.querySelector('#lancs-container .card-body').innerHTML = renderLancList(filtrados, obras, planilhas);
}

function renderLancList(lancs, obras, planilhas) {
  const sorted = [...lancs].sort((a,b)=>(b.created_at?.toDate?.()||0)-(a.created_at?.toDate?.()||0));
  if (sorted.length===0) return '<div class="empty"><div class="empty-icon">📋</div>Nenhum lançamento encontrado</div>';
  return sorted.map(l => {
    const obra  = obras.find(o=>o.id===l.obra_id);
    const pl    = planilhas.find(p=>p.id===l.planilha_id);
    const icons = {ordem_compra:'📄', funcionarios:'👷', repasse:'↩', manual:'✏️'};
    const cls   = {ordem_compra:'oc', funcionarios:'func', repasse:'repasse', manual:'manual'};
    return `
    <div class="lanc-row">
      <div class="lanc-icon ${cls[l.origem]||'manual'}">${icons[l.origem]||'✏️'}</div>
      <div class="lanc-info">
        <div class="lanc-desc">${l.descricao||''}</div>
        <div class="lanc-meta">${obra?.nome||''} ${pl?'· '+pl.nome:''}</div>
        <div class="lanc-tags"><span class="tag">${l.categoria||''}</span> <span style="font-size:10px;color:var(--text3)">${fmtDate(l.created_at)}</span></div>
      </div>
      <div class="lanc-right">
        <div class="lanc-value ${l.tipo}">${l.tipo==='despesa'?'-':'+'}${fmt(l.valor)}</div>
        <button class="btn-link danger" onclick="estornarLancUI('${l.id}')">estornar</button>
      </div>
    </div>`;
  }).join('');
}

async function estornarLancUI(lancId) {
  if (!confirm('Estornar este lançamento? O valor será devolvido ao saldo.')) return;
  App.loading(true);
  try {
    await estornarLancamento(lancId);
    App.toast('Lançamento estornado!');
    App.navigate('lancamentos');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.loading(false); }
}

// NOVO LANÇAMENTO — Repasse = SAÍDA (despesa)
async function showNovoLancamento(obraIdPre = '') {
  const { obras, planilhas } = await loadAll();
  showModal({
    title: 'Novo Lançamento',
    body: `
      <div class="form-group">
        <label class="form-label">Tipo de Lançamento</label>
        <div class="toggle-group">
          <button id="tog-despesa" class="toggle-btn active" onclick="setTipoLanc('despesa')">💸 Despesa</button>
          <button id="tog-repasse" class="toggle-btn" onclick="setTipoLanc('repasse')">↩ Repasse</button>
          <button id="tog-receita" class="toggle-btn" onclick="setTipoLanc('receita')">📥 Receita</button>
        </div>
        <div id="tipo-hint" class="form-hint" style="color:var(--danger)">Saída de dinheiro da obra</div>
        <input type="hidden" id="nl-tipo" value="despesa">
      </div>
      <div class="form-group">
        <label class="form-label">Obra *</label>
        <select id="nl-obra" class="form-input" onchange="carregarPlanilhasNL()">
          <option value="">— Selecione —</option>
          ${obras.filter(o=>o.status==='ativa').map(o=>`<option value="${o.id}" ${o.id===obraIdPre?'selected':''}>${o.nome}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Planilha (centro de custo)</label>
        <select id="nl-planilha" class="form-input">
          <option value="">Direto na obra (sem planilha específica)</option>
        </select>
        <div class="form-hint">Selecione uma planilha para debitar de um centro de custo específico</div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <select id="nl-cat" class="form-input">
            ${['Material','Serviço','Equipamento','Transporte','Alimentação','Folha','Repasse','Outros'].map(c=>`<option>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Forma de Pagamento</label>
          <select id="nl-forma" class="form-input">
            ${['PIX','Dinheiro','Transferência','Boleto','Cartão','N/A'].map(c=>`<option>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Valor (R$) *</label>
        <input id="nl-valor" class="form-input" type="number" step="0.01" placeholder="0,00">
      </div>
      <div class="form-group">
        <label class="form-label">Descrição *</label>
        <input id="nl-desc" class="form-input" placeholder="Descreva o lançamento">
      </div>`,
    footer: `
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="confirmarNovoLanc()">✓ Salvar</button>`
  });

  if (obraIdPre) carregarPlanilhasNL();
}

function setTipoLanc(t) {
  document.getElementById('nl-tipo').value = t;
  ['despesa','repasse','receita'].forEach(x => {
    const el = document.getElementById('tog-'+x);
    if (el) el.classList.toggle('active', x===t);
  });
  const hint = document.getElementById('tipo-hint');
  if (hint) {
    if (t==='despesa') { hint.textContent='Saída de dinheiro da obra'; hint.style.color='var(--danger)'; }
    else if (t==='repasse') { hint.textContent='Repasse = saída de recursos (dinheiro repassado a terceiros)'; hint.style.color='var(--danger)'; }
    else { hint.textContent='Entrada de dinheiro na obra'; hint.style.color='var(--success)'; }
  }
}

async function carregarPlanilhasNL() {
  const obraId = document.getElementById('nl-obra')?.value;
  const sel    = document.getElementById('nl-planilha');
  if (!sel) return;
  if (!obraId) { sel.innerHTML='<option value="">Direto na obra</option>'; return; }
  const snap = await empresaCol('planilhas').where('obra_id','==',obraId).get();
  const pls  = snap.docs.map(d=>({id:d.id,...d.data()}));
  sel.innerHTML = '<option value="">Direto na obra (sem planilha específica)</option>'
    + pls.map(p=>`<option value="${p.id}">${p.nome}</option>`).join('');
}

async function confirmarNovoLanc() {
  const tipoLogico = document.getElementById('nl-tipo').value;
  const obraId  = document.getElementById('nl-obra')?.value;
  const planId  = document.getElementById('nl-planilha')?.value;
  const cat     = document.getElementById('nl-cat')?.value;
  const forma   = document.getElementById('nl-forma')?.value;
  const valor   = parseFloat(document.getElementById('nl-valor')?.value)||0;
  const desc    = document.getElementById('nl-desc')?.value.trim();

  if (!obraId) return App.toast('Selecione a obra','error');
  if (!valor)  return App.toast('Informe o valor','error');
  if (!desc)   return App.toast('Informe a descrição','error');

  // REGRA: repasse = saída (despesa), não entrada
  const tipoReal = tipoLogico === 'receita' ? 'receita' : 'despesa';

  App.loading(true);
  try {
    await addDoc2('lancamentos', {
      obra_id: obraId,
      planilha_id: planId || null,
      tipo: tipoReal,
      categoria: tipoLogico==='repasse' ? 'Repasse' : cat,
      valor, descricao: desc,
      forma_pagamento: forma,
      origem: tipoLogico==='repasse' ? 'repasse' : 'manual',
      status: 'ativo',
    });
    closeModal();
    App.toast('Lançamento salvo!');
    App.navigate('lancamentos');
  } catch(e) { App.toast('Erro: '+e.message,'error'); }
  finally { App.loading(false); }
}



// ── EXPOR GLOBALMENTE ─────────────────────────────────────────
window.renderFuncionarios    = renderFuncionarios;
window.renderPresenca        = renderPresenca;
window.renderOC              = renderOC;
window.renderLancamentos     = renderLancamentos;
window.showNovoFuncionario   = showNovoFuncionario;
window.atualizarLabelValor   = atualizarLabelValor;
window.salvarFuncionario     = salvarFuncionario;
window.showEditarFuncionario = showEditarFuncionario;
window.atualizarLabelValorEd = atualizarLabelValorEd;
window.salvarEdicaoFuncionario = salvarEdicaoFuncionario;
window.inativarFuncionario   = inativarFuncionario;
window.excluirFuncionario    = excluirFuncionario;
window.showEditarAloc        = showEditarAloc;
window.salvarAloc            = salvarAloc;
window.showPagamento         = showPagamento;
window.calcDiaria            = calcDiaria;
window.confirmarPagamento    = confirmarPagamento;
window.showFolhaSugerida     = showFolhaSugerida;
window.confirmarFolha        = confirmarFolha;
window.reativarFunc          = reativarFunc;
window.togglePresenca        = togglePresenca;
window.pagarDiasPresenca     = pagarDiasPresenca;
window.showImportarOC        = showImportarOC;
window.processarArquivoOC    = processarArquivoOC;
window.buscarObraPorAcao     = buscarObraPorAcao;
window.carregarPlanilhasOI   = carregarPlanilhasOI;
window.mostrarFormOCManual   = mostrarFormOCManual;
window.confirmarImportacaoOC = confirmarImportacaoOC;
window.forcarImportacaoOC    = forcarImportacaoOC;
window.cancelarOCGlobal      = cancelarOCGlobal;
window.filtrarLancs          = filtrarLancs;
window.estornarLancUI        = estornarLancUI;
window.showNovoLancamento    = showNovoLancamento;
window.setTipoLanc           = setTipoLanc;
window.carregarPlanilhasNL   = carregarPlanilhasNL;
window.confirmarNovoLanc     = confirmarNovoLanc;
