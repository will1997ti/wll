const STORAGE_KEY = 'desafio30dias.v2';
const todayISO = () => new Date().toISOString().slice(0, 10);

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

let state = loadState();
let deferredPrompt = null;

function byId(id) { return document.getElementById(id); }

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { participants: [], checkins: [] };
  } catch {
    return { participants: [], checkins: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function calculateScore(data) {
  let total = 0;
  Object.entries(scoreMap).forEach(([key, points]) => {
    if (data[key]) total += points;
  });

  if (!data.freeDay) {
    if (!data.noCommonSoda) total -= 3;
    if (!data.noSugaryDrink) total -= 3;
    if (!data.noSugarSweet) total -= 3;
  }

  return Math.max(total, 0);
}

function getFormData() {
  const fields = Object.keys(scoreMap).concat(['freeDay']);
  const data = {
    participantId: byId('participantSelect').value,
    date: byId('dateInput').value,
    notes: byId('notes').value.trim(),
  };
  fields.forEach(id => data[id] = byId(id).checked);
  data.score = calculateScore(data);
  return data;
}

function resetForm() {
  const participantId = byId('participantSelect').value || state.participants[0]?.id || '';
  byId('checkinForm').reset();
  byId('participantSelect').value = participantId;
  byId('dateInput').value = todayISO();
  byId('noCommonSoda').checked = true;
  byId('noSugaryDrink').checked = true;
  byId('noSugarSweet').checked = true;
}

function renderParticipants() {
  const select = byId('participantSelect');
  select.innerHTML = '';

  if (!state.participants.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Adicione um participante';
    select.appendChild(option);
    return;
  }

  state.participants.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.name;
    select.appendChild(option);
  });
}

function getRanking() {
  return state.participants.map(p => {
    const records = state.checkins.filter(c => c.participantId === p.id);
    return {
      ...p,
      total: records.reduce((sum, c) => sum + c.score, 0),
      checkins: records.length,
      trainings: records.filter(c => c.training).length,
      freeDays: records.filter(c => c.freeDay).length,
      perfectDays: records.filter(c => c.score >= 19).length,
    };
  }).sort((a, b) => b.total - a.total);
}

function renderRanking() {
  const box = byId('ranking');
  const ranked = getRanking();
  box.innerHTML = ranked.length ? '' : '<p class="meta">Cadastre participantes e salve check-ins para gerar o ranking.</p>';

  ranked.forEach((p, index) => {
    const div = document.createElement('div');
    div.className = 'rank-item';
    div.innerHTML = `
      <div class="rank-top">
        <div><strong>#${index + 1} ${escapeHtml(p.name)}</strong><p class="meta">${p.checkins} check-ins · ${p.trainings} treinos · ${p.freeDays}/2 dias livres</p></div>
        <div class="points">${p.total}</div>
      </div>
      <p class="meta">Dias fortes: ${p.perfectDays}</p>
    `;
    box.appendChild(div);
  });
}

function renderHistory() {
  const box = byId('history');
  const sorted = [...state.checkins].sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
  byId('totalCheckins').textContent = `${sorted.length} registro(s)`;
  box.innerHTML = sorted.length ? '' : '<p class="meta">Nenhum check-in salvo ainda.</p>';

  sorted.forEach(c => {
    const participant = state.participants.find(p => p.id === c.participantId);
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="rank-top"><strong>${escapeHtml(participant?.name || 'Participante')}</strong><span class="points">${c.score}</span></div>
      <p class="meta">${formatDate(c.date)}${c.freeDay ? ' · dia livre' : ''}</p>
      ${c.notes ? `<p>${escapeHtml(c.notes)}</p>` : ''}
      <div class="history-actions">
        <button class="ghost small" data-edit="${c.id}">Editar</button>
        <button class="ghost small danger" data-delete="${c.id}">Excluir</button>
      </div>
    `;
    box.appendChild(div);
  });
}

function renderAll() {
  const selected = byId('participantSelect').value;
  renderParticipants();
  if (selected) byId('participantSelect').value = selected;
  else if (state.participants[0]) byId('participantSelect').value = state.participants[0].id;
  renderRanking();
  renderHistory();
  byId('todayLabel').textContent = formatDate(todayISO());
}

function addParticipant() {
  byId('participantDialog').showModal();
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
  alert(`Check-in salvo: ${record.score} ponto(s).`);
}

function editCheckin(id) {
  const c = state.checkins.find(item => item.id === id);
  if (!c) return;
  byId('participantSelect').value = c.participantId;
  byId('dateInput').value = c.date;
  Object.keys(scoreMap).concat(['freeDay']).forEach(key => byId(key).checked = Boolean(c[key]));
  byId('notes').value = c.notes || '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteCheckin(id) {
  if (!confirm('Excluir este check-in?')) return;
  state.checkins = state.checkins.filter(c => c.id !== id);
  saveState();
  renderAll();
}

function clearAll() {
  if (!confirm('Isso apaga todos os participantes e check-ins deste navegador. Continuar?')) return;
  state = { participants: [], checkins: [] };
  saveState();
  resetForm();
  renderAll();
}

function exportCsv() {
  const headers = ['data','participante','pontos','agua_meta','agua_metade','sem_refri_comum','sem_bebida_acucar','sem_doce_acucar','refeicoes_equilibradas','fruta_legumes','treino','sono','dia_livre','observacao'];
  const rows = state.checkins.map(c => {
    const p = state.participants.find(x => x.id === c.participantId);
    return [c.date, p?.name || '', c.score, c.waterFull, c.waterHalf, c.noCommonSoda, c.noSugaryDrink, c.noSugarSweet, c.balancedMeals, c.fruitVeg, c.training, c.sleep, c.freeDay, c.notes || ''];
  });
  const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'desafio-30-dias.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(iso) {
  if (!iso || !iso.includes('-')) return iso || '';
  return iso.split('-').reverse().join('/');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
}

byId('dateInput').value = todayISO();
byId('addParticipantBtn').addEventListener('click', addParticipant);
byId('participantForm').addEventListener('submit', saveParticipant);
byId('checkinForm').addEventListener('submit', saveCheckin);
byId('resetBtn').addEventListener('click', clearAll);
byId('exportBtn').addEventListener('click', exportCsv);

byId('history').addEventListener('click', e => {
  const editId = e.target.dataset.edit;
  const deleteId = e.target.dataset.delete;
  if (editId) editCheckin(editId);
  if (deleteId) deleteCheckin(deleteId);
});

byId('waterFull').addEventListener('change', e => {
  if (e.target.checked) byId('waterHalf').checked = false;
});
byId('waterHalf').addEventListener('change', e => {
  if (e.target.checked) byId('waterFull').checked = false;
});

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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

resetForm();
renderAll();
