const STORAGE_KEY = 'desafio30dias.v4';
const LEGACY_KEYS = ['desafio30dias.v3', 'desafio30dias.v2'];
const todayISO = () => new Date().toISOString().slice(0, 10);
const byId = id => document.getElementById(id);

const scoreMap = {
  waterFull: 3,
  waterHalf: 1,
  noCommonSoda: 2,
  noSugaryDrink: 2,
  noSugarSweet: 2,
  balancedMeals: 2,
  fruitVeg: 1,
  training: 5,
  sleep: 2,
};

const booleanFields = Object.keys(scoreMap).concat(['freeDay']);
const textFields = [
  'wakeTime','sleepTime','breakfast','breakfastQuality','lunch','lunchQuality','dinner','dinnerQuality','snacks','snacksQuality','trainingText','waterAmount','evidenceText','notes'
];

let state = loadState();
let deferredPrompt = null;
let pendingPhoto = '';

function loadState() {
  const keys = [STORAGE_KEY, ...LEGACY_KEYS];
  for (const key of keys) {
    try {
      const raw = JSON.parse(localStorage.getItem(key));
      if (raw) return normalizeState(raw);
    } catch {}
  }
  return { participants: [], checkins: [] };
}

function normalizeState(raw) {
  return {
    participants: Array.isArray(raw.participants) ? raw.participants : [],
    checkins: Array.isArray(raw.checkins) ? raw.checkins : [],
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function mealQualityCount(data, quality) {
  return ['breakfastQuality','lunchQuality','dinnerQuality','snacksQuality'].filter(k => data[k] === quality).length;
}

function calculateScore(data) {
  let total = 0;
  Object.entries(scoreMap).forEach(([key, points]) => { if (data[key]) total += points; });

  const goodMeals = mealQualityCount(data, 'boa');
  const normalMeals = mealQualityCount(data, 'normal');
  const badMeals = mealQualityCount(data, 'fora');

  total += goodMeals;
  if (goodMeals >= 2) total += 2;
  if (normalMeals >= 2) total += 1;

  if (!data.freeDay) {
    if (!data.noCommonSoda) total -= 3;
    if (!data.noSugaryDrink) total -= 3;
    if (!data.noSugarSweet) total -= 3;
    total -= badMeals * 2;
  }

  if (data.wakeTime) total += 1;
  if (data.evidenceText || data.evidencePhoto) total += 1;
  return Math.max(total, 0);
}

function getFormData() {
  const data = {
    participantId: byId('participantSelect').value,
    date: byId('dateInput').value,
  };
  booleanFields.forEach(id => data[id] = Boolean(byId(id)?.checked));
  textFields.forEach(id => data[id] = byId(id)?.value?.trim?.() || '');
  data.evidencePhoto = pendingPhoto;
  data.score = calculateScore(data);
  data.diagnosis = buildDiagnosis(data);
  return data;
}

function setFormDefaults() {
  byId('dateInput').value = todayISO();
  byId('noCommonSoda').checked = true;
  byId('noSugaryDrink').checked = true;
  byId('noSugarSweet').checked = true;
}

function resetForm(keepParticipant = true) {
  const participantId = keepParticipant ? (byId('participantSelect').value || state.participants[0]?.id || '') : '';
  byId('checkinForm').reset();
  pendingPhoto = '';
  byId('evidencePreview').innerHTML = '';
  renderParticipants();
  if (participantId) byId('participantSelect').value = participantId;
  setFormDefaults();
}

function renderParticipants() {
  const select = byId('participantSelect');
  const previous = select.value;
  select.innerHTML = '';

  if (!state.participants.length) {
    select.innerHTML = '<option value="">Adicione um participante</option>';
    return;
  }

  state.participants.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.name;
    select.appendChild(option);
  });
  if (previous) select.value = previous;
}

function recordsForParticipant(id) {
  return state.checkins.filter(c => c.participantId === id);
}

function selectedParticipantId() {
  return byId('participantSelect').value || state.participants[0]?.id || '';
}

function getRanking() {
  return state.participants.map(p => {
    const records = recordsForParticipant(p.id);
    const meals = records.flatMap(r => [r.breakfastQuality, r.lunchQuality, r.dinnerQuality, r.snacksQuality]).filter(Boolean);
    const good = meals.filter(m => m === 'boa').length;
    const bad = meals.filter(m => m === 'fora').length;
    return {
      ...p,
      total: records.reduce((sum, c) => sum + Number(c.score || 0), 0),
      checkins: records.length,
      trainings: records.filter(c => c.training).length,
      freeDays: records.filter(c => c.freeDay).length,
      perfectDays: records.filter(c => c.score >= 22).length,
      goodMealRate: meals.length ? Math.round((good / meals.length) * 100) : 0,
      badMeals: bad,
    };
  }).sort((a, b) => b.total - a.total);
}

function renderDashboard() {
  const pid = selectedParticipantId();
  const records = pid ? recordsForParticipant(pid) : [];
  const today = records.find(r => r.date === byId('dateInput').value);
  const weekRecords = records.filter(r => daysBetween(r.date, todayISO()) <= 6);
  const trainingsWeek = weekRecords.filter(r => r.training).length;
  const freeDays = records.filter(r => r.freeDay).length;
  const meals = weekRecords.flatMap(r => [r.breakfastQuality, r.lunchQuality, r.dinnerQuality, r.snacksQuality]).filter(Boolean);
  const goodRate = meals.length ? Math.round(meals.filter(m => m === 'boa').length / meals.length * 100) : 0;

  byId('dashboard').innerHTML = `
    <article class="metric ${today ? 'good' : 'warn'}"><span>Hoje</span><strong>${today ? today.score + ' pts' : 'pendente'}</strong><span>${today ? 'diário salvo' : 'preencha hoje'}</span></article>
    <article class="metric ${trainingsWeek >= 2 ? 'good' : 'warn'}"><span>Treinos semana</span><strong>${trainingsWeek}/2</strong><span>${trainingsWeek >= 2 ? 'meta batida' : 'faltam ' + Math.max(2-trainingsWeek,0)}</span></article>
    <article class="metric ${freeDays <= 2 ? 'good' : 'bad'}"><span>Dias livres</span><strong>${freeDays}/2</strong><span>${freeDays <= 2 ? 'dentro da regra' : 'passou'}</span></article>
    <article class="metric ${goodRate >= 60 ? 'good' : goodRate ? 'warn' : ''}"><span>Comida boa 7d</span><strong>${goodRate}%</strong><span>${meals.length ? meals.length + ' refeições' : 'sem dados'}</span></article>
  `;
}

function renderRanking() {
  const box = byId('ranking');
  const ranked = getRanking();
  box.innerHTML = ranked.length ? '' : '<p class="meta">Cadastre participantes e salve diários para gerar o ranking.</p>';

  ranked.forEach((p, index) => {
    const div = document.createElement('div');
    div.className = 'rank-item';
    div.innerHTML = `
      <div class="rank-top">
        <div><strong>#${index + 1} ${escapeHtml(p.name)}</strong><p class="meta">${p.checkins} diários · ${p.trainings} treinos · ${p.freeDays}/2 dias livres</p></div>
        <div class="points">${p.total}</div>
      </div>
      <div class="badge-row">
        <span class="badge good">${p.goodMealRate}% comida boa</span>
        <span class="badge ${p.badMeals ? 'bad' : 'good'}">${p.badMeals} fora</span>
        <span class="badge">${p.perfectDays} dias fortes</span>
      </div>
    `;
    box.appendChild(div);
  });
}

function renderInsights() {
  const box = byId('insights');
  const pid = selectedParticipantId();
  const records = pid ? recordsForParticipant(pid) : [];
  if (!records.length) {
    box.innerHTML = '<div class="insight-item"><strong>Sem diagnóstico ainda</strong><p class="meta">Depois de salvar alguns dias, o app mostra padrões do que está funcionando e do que está atrapalhando.</p></div>';
    return;
  }

  const last7 = records.filter(r => daysBetween(r.date, todayISO()) <= 6);
  const base = last7.length ? last7 : records;
  const goodMeals = base.reduce((sum, r) => sum + mealQualityCount(r, 'boa'), 0);
  const badMeals = base.reduce((sum, r) => sum + mealQualityCount(r, 'fora'), 0);
  const missedWater = base.filter(r => !r.waterFull && !r.waterHalf).length;
  const sugarIssues = base.filter(r => !r.noSugarSweet || !r.noSugaryDrink || !r.noCommonSoda).length;
  const trainings = base.filter(r => r.training).length;

  box.innerHTML = [
    buildInsight('Alimentação', goodMeals >= badMeals ? `Mais refeições boas (${goodMeals}) do que fora (${badMeals}).` : `Atenção: refeições fora (${badMeals}) estão pesando mais que boas (${goodMeals}).`, goodMeals >= badMeals ? 'good' : 'bad'),
    buildInsight('Água', missedWater === 0 ? 'Água consistente nos registros recentes.' : `${missedWater} dia(s) sem bater nem metade da água.`, missedWater === 0 ? 'good' : 'warn'),
    buildInsight('Açúcar/bebidas', sugarIssues === 0 ? 'Sem deslizes registrados com açúcar, suco ou refri comum.' : `${sugarIssues} dia(s) com deslize em açúcar/bebida.`, sugarIssues === 0 ? 'good' : 'bad'),
    buildInsight('Treino', trainings >= 2 ? `Meta semanal batida: ${trainings} treino(s).` : `Faltam ${Math.max(2-trainings,0)} treino(s) para a meta semanal.`, trainings >= 2 ? 'good' : 'warn'),
  ].join('');
}

function buildInsight(title, text, type) {
  return `<div class="insight-item"><div class="badge ${type}">${title}</div><p>${escapeHtml(text)}</p></div>`;
}

function renderHistory() {
  const box = byId('history');
  const sorted = [...state.checkins].sort((a, b) => `${b.date}${b.createdAt || ''}`.localeCompare(`${a.date}${a.createdAt || ''}`));
  byId('totalCheckins').textContent = `${sorted.length} registro(s)`;
  box.innerHTML = sorted.length ? '' : '<p class="meta">Nenhum diário salvo ainda.</p>';

  sorted.forEach(c => {
    const participant = state.participants.find(p => p.id === c.participantId);
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="history-head">
        <div><strong>${escapeHtml(participant?.name || 'Participante')}</strong><p class="meta">${formatDate(c.date)}${c.freeDay ? ' · dia livre' : ''}${c.wakeTime ? ' · acordou ' + c.wakeTime : ''}</p></div>
        <span class="points">${c.score || 0}</span>
      </div>
      <div class="badge-row">${renderBadges(c)}</div>
      <div class="meal-summary">
        ${mealLine('Café', c.breakfast, c.breakfastQuality)}
        ${mealLine('Almoço', c.lunch, c.lunchQuality)}
        ${mealLine('Jantar', c.dinner, c.dinnerQuality)}
        ${mealLine('Lanches', c.snacks, c.snacksQuality)}
      </div>
      ${c.trainingText ? `<p class="meta"><strong>Treino:</strong> ${escapeHtml(c.trainingText)}</p>` : ''}
      ${c.waterAmount ? `<p class="meta"><strong>Água:</strong> ${escapeHtml(c.waterAmount)}</p>` : ''}
      ${c.evidenceText ? `<p class="meta"><strong>Evidência:</strong> ${escapeHtml(c.evidenceText)}</p>` : ''}
      ${c.evidencePhoto ? `<img class="history-photo" src="${c.evidencePhoto}" alt="Evidência do dia" loading="lazy" />` : ''}
      ${c.notes ? `<p>${escapeHtml(c.notes)}</p>` : ''}
      <p class="meta"><strong>Diagnóstico:</strong> ${escapeHtml(c.diagnosis || buildDiagnosis(c))}</p>
      <div class="history-actions">
        <button class="ghost small" data-edit="${c.id}">Editar</button>
        <button class="ghost small danger" data-delete="${c.id}">Excluir</button>
      </div>
    `;
    box.appendChild(div);
  });
}

function renderBadges(c) {
  return [
    `<span class="badge ${c.waterFull ? 'good' : c.waterHalf ? 'warn' : 'bad'}">Água</span>`,
    `<span class="badge ${c.training ? 'good' : ''}">Treino</span>`,
    `<span class="badge ${c.noSugarSweet && c.noSugaryDrink && c.noCommonSoda ? 'good' : 'bad'}">Açúcar</span>`,
    c.freeDay ? '<span class="badge warn">Dia livre</span>' : '',
  ].join('');
}

function mealLine(title, text, quality) {
  if (!text && !quality) return '';
  const cls = quality === 'boa' ? 'good' : quality === 'fora' ? 'bad' : 'warn';
  return `<p><strong>${title}:</strong> ${escapeHtml(text || 'não informado')} ${quality ? `<span class="badge ${cls}">${quality}</span>` : ''}</p>`;
}

function buildDiagnosis(data) {
  const goodMeals = mealQualityCount(data, 'boa');
  const badMeals = mealQualityCount(data, 'fora');
  const problems = [];
  const wins = [];
  if (data.waterFull) wins.push('água em dia');
  else if (!data.waterHalf) problems.push('faltou água');
  if (data.training) wins.push('treino feito');
  if (goodMeals >= 2 || data.balancedMeals) wins.push('boas refeições');
  if (badMeals) problems.push(`${badMeals} refeição(ões) fora`);
  if (!data.noCommonSoda) problems.push('refrigerante comum');
  if (!data.noSugaryDrink) problems.push('bebida/suco com açúcar');
  if (!data.noSugarSweet) problems.push('doce com açúcar');
  if (data.freeDay) wins.push('dia livre usado');
  if (!wins.length && !problems.length) return 'Dia registrado, mas com poucos detalhes.';
  if (!problems.length) return `Dia muito bom: ${wins.join(', ')}.`;
  if (!wins.length) return `Dia de atenção: ${problems.join(', ')}.`;
  return `Bom em ${wins.join(', ')}. Melhorar: ${problems.join(', ')}.`;
}

function renderAll() {
  renderParticipants();
  renderDashboard();
  renderRanking();
  renderInsights();
  renderHistory();
  byId('todayLabel').textContent = formatDate(todayISO());
}

function saveParticipant(e) {
  e.preventDefault();
  const name = byId('participantName').value.trim();
  if (!name) return;
  const participant = { id: uid(), name };
  state.participants.push(participant);
  saveState();
  byId('participantDialog').close();
  byId('participantName').value = '';
  renderAll();
  byId('participantSelect').value = participant.id;
  renderDashboard();
}

function saveCheckin(e) {
  e.preventDefault();
  const data = getFormData();
  if (!data.participantId) return alert('Adicione um participante primeiro.');
  if (!data.date) return alert('Escolha a data.');

  const existingIndex = state.checkins.findIndex(c => c.participantId === data.participantId && c.date === data.date);
  const record = { ...data, id: existingIndex >= 0 ? state.checkins[existingIndex].id : uid(), createdAt: new Date().toISOString() };
  if (existingIndex >= 0) state.checkins[existingIndex] = record;
  else state.checkins.push(record);

  saveState();
  renderAll();
  alert(`Diário salvo: ${record.score} ponto(s).`);
}

function applyPreset(type) {
  booleanFields.forEach(id => { if (byId(id)) byId(id).checked = false; });
  byId('noCommonSoda').checked = true;
  byId('noSugaryDrink').checked = true;
  byId('noSugarSweet').checked = true;

  if (type === 'strong') {
    ['waterFull','balancedMeals','fruitVeg','training','sleep'].forEach(id => byId(id).checked = true);
    ['breakfastQuality','lunchQuality','dinnerQuality'].forEach(id => byId(id).value = 'boa');
    byId('notes').value = byId('notes').value || 'Dia forte: cumpri o combinado.';
  }
  if (type === 'normal') {
    byId('waterHalf').checked = true;
    byId('balancedMeals').checked = true;
    ['lunchQuality','dinnerQuality'].forEach(id => byId(id).value = 'normal');
    byId('notes').value = byId('notes').value || 'Dia normal: dentro do possível, sem exageros.';
  }
  if (type === 'free') {
    byId('freeDay').checked = true;
    byId('waterHalf').checked = true;
    ['lunchQuality','dinnerQuality','snacksQuality'].forEach(id => byId(id).value = 'normal');
    byId('notes').value = byId('notes').value || 'Dia livre usado com registro.';
  }
  renderDashboard();
}

function quickCheckin() {
  applyPreset('strong');
}

function editCheckin(id) {
  const c = state.checkins.find(item => item.id === id);
  if (!c) return;
  byId('participantSelect').value = c.participantId;
  byId('dateInput').value = c.date;
  booleanFields.forEach(key => byId(key).checked = Boolean(c[key]));
  textFields.forEach(key => { if (byId(key)) byId(key).value = c[key] || ''; });
  pendingPhoto = c.evidencePhoto || '';
  byId('evidencePreview').innerHTML = pendingPhoto ? `<img src="${pendingPhoto}" alt="Prévia da evidência" />` : '';
  document.querySelectorAll('.accordion').forEach(details => details.open = true);
  activateTab('today');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteCheckin(id) {
  if (!confirm('Excluir este diário?')) return;
  state.checkins = state.checkins.filter(c => c.id !== id);
  saveState();
  renderAll();
}

function clearAll() {
  if (!confirm('Isso apaga todos os participantes e diários deste aparelho. Continuar?')) return;
  state = { participants: [], checkins: [] };
  pendingPhoto = '';
  saveState();
  resetForm(false);
  renderAll();
}

function exportCsv() {
  const headers = ['data','participante','pontos','acordou','dormiu','cafe','cafe_qualidade','almoco','almoco_qualidade','jantar','jantar_qualidade','lanches','lanches_qualidade','agua_meta','agua_metade','agua_qtd','sem_refri_comum','sem_bebida_acucar','sem_doce_acucar','treino','treino_texto','sono','dia_livre','evidencia','diagnostico','observacao'];
  const rows = state.checkins.map(c => {
    const p = state.participants.find(x => x.id === c.participantId);
    return [c.date, p?.name || '', c.score, c.wakeTime, c.sleepTime, c.breakfast, c.breakfastQuality, c.lunch, c.lunchQuality, c.dinner, c.dinnerQuality, c.snacks, c.snacksQuality, c.waterFull, c.waterHalf, c.waterAmount, c.noCommonSoda, c.noSugaryDrink, c.noSugarSweet, c.training, c.trainingText, c.sleep, c.freeDay, c.evidenceText, c.diagnosis || buildDiagnosis(c), c.notes || ''];
  });
  downloadText('desafio-30-dias-diario.csv', [headers, ...rows].map(row => row.map(value => `"${String(value ?? '').replaceAll('"','""')}"`).join(',')).join('\n'), 'text/csv;charset=utf-8');
}

function exportJson() {
  const payload = {
    app: 'desafio-30-dias',
    version: 4,
    exportedAt: new Date().toISOString(),
    ...state,
  };
  downloadText(`backup-desafio-30-dias-${todayISO()}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

function importJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.participants) || !Array.isArray(data.checkins)) throw new Error('Formato inválido');
      if (!confirm('Importar este backup e substituir os dados locais?')) return;
      state = normalizeState(data);
      saveState();
      resetForm(false);
      renderAll();
      alert('Backup importado com sucesso.');
    } catch {
      alert('Não consegui importar. Verifique se o arquivo é um backup válido.');
    }
  };
  reader.readAsText(file);
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function handlePhoto(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) return alert('Selecione uma imagem.');
  const reader = new FileReader();
  reader.onload = () => {
    pendingPhoto = reader.result;
    byId('evidencePreview').innerHTML = `<img src="${pendingPhoto}" alt="Prévia da evidência" />`;
  };
  reader.readAsDataURL(file);
}

function activateTab(tab) {
  document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === `tab-${tab}`));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function daysBetween(a, b) {
  if (!a || !b) return 999;
  return Math.abs(Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000));
}

function formatDate(iso) {
  if (!iso || !iso.includes('-')) return iso || '';
  return iso.split('-').reverse().join('/');
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
}

byId('dateInput').value = todayISO();
byId('addParticipantBtn').addEventListener('click', () => byId('participantDialog').showModal());
byId('participantForm').addEventListener('submit', saveParticipant);
byId('checkinForm').addEventListener('submit', saveCheckin);
byId('quickBtn').addEventListener('click', quickCheckin);
byId('resetBtn').addEventListener('click', clearAll);
byId('exportBtn').addEventListener('click', exportCsv);
byId('exportJsonBtn').addEventListener('click', exportJson);
byId('importJsonFile').addEventListener('change', e => importJson(e.target.files[0]));
byId('participantSelect').addEventListener('change', renderAll);
byId('dateInput').addEventListener('change', renderDashboard);
byId('evidenceFile').addEventListener('change', e => handlePhoto(e.target.files[0]));

document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => activateTab(btn.dataset.tab)));
document.querySelectorAll('.mood').forEach(btn => btn.addEventListener('click', () => applyPreset(btn.dataset.preset)));

byId('history').addEventListener('click', e => {
  const editId = e.target.dataset.edit;
  const deleteId = e.target.dataset.delete;
  if (editId) editCheckin(editId);
  if (deleteId) deleteCheckin(deleteId);
});

byId('waterFull').addEventListener('change', e => { if (e.target.checked) byId('waterHalf').checked = false; });
byId('waterHalf').addEventListener('change', e => { if (e.target.checked) byId('waterFull').checked = false; });

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredPrompt = event;
  byId('installBtn').classList.remove('hidden');
});
byId('installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  byId('installBtn').classList.add('hidden');
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

resetForm();
renderAll();
