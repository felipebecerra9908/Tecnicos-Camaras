// ---------- Storage ----------
const STORAGE_KEY = 'bitacora_servicios_v1';

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('No se pudo leer el historial guardado:', e);
    return [];
  }
}

function saveEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch (e) {
    console.error('No se pudo guardar el historial:', e);
    return false;
  }
}

let entries = loadEntries();

// current viewed month (first-of-month Date, local time)
const today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth(); // 0-11

// ---------- Helpers ----------
const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function fmtMoney(n) {
  return 'Q ' + n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toDateInputValue(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseLocalDate(isoDateStr) {
  // isoDateStr = 'YYYY-MM-DD' -> local Date at midnight, avoids UTC off-by-one
  const [y, m, d] = isoDateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function entriesForMonth(year, month) {
  return entries.filter(e => {
    const d = parseLocalDate(e.fecha);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

function uid() {
  return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.hidden = true; }, 2600);
}

// ---------- Rendering ----------
function render() {
  renderReportHeader();
  renderStats();
  renderBreakdown();
  renderEntriesList();
}

function renderReportHeader() {
  document.getElementById('reportTitle').textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
}

function renderStats() {
  const monthEntries = entriesForMonth(viewYear, viewMonth);
  const total = monthEntries.reduce((sum, e) => sum + e.monto, 0);
  const count = monthEntries.length;
  const days = new Set(monthEntries.map(e => e.fecha)).size;
  const avg = count ? total / count : 0;

  document.getElementById('statTotal').textContent = fmtMoney(total);
  document.getElementById('statCount').textContent = count;
  document.getElementById('statDays').textContent = days;
  document.getElementById('statAvg').textContent = fmtMoney(avg);
}

function renderBreakdown() {
  const monthEntries = entriesForMonth(viewYear, viewMonth);
  const byType = {};
  monthEntries.forEach(e => {
    byType[e.tipo] = (byType[e.tipo] || 0) + e.monto;
  });
  const maxVal = Math.max(1, ...Object.values(byType));
  const container = document.getElementById('breakdown');
  container.innerHTML = '';

  Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tipo, monto]) => {
      const row = document.createElement('div');
      row.className = 'breakdown__row';
      row.innerHTML = `
        <span class="breakdown__label">${escapeHtml(tipo)}</span>
        <span class="breakdown__bar-wrap"><span class="breakdown__bar" style="width:${(monto / maxVal) * 100}%"></span></span>
        <span class="breakdown__amount">${fmtMoney(monto)}</span>
      `;
      container.appendChild(row);
    });
}

function renderEntriesList() {
  const monthEntries = entriesForMonth(viewYear, viewMonth)
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.creadoEn - a.creadoEn));

  const list = document.getElementById('entriesList');
  const empty = document.getElementById('emptyState');
  list.innerHTML = '';

  if (monthEntries.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  monthEntries.forEach(e => {
    const d = parseLocalDate(e.fecha);
    const dateLabel = d.toLocaleDateString('es-GT', { weekday: 'short', day: '2-digit', month: 'short' });

    const el = document.createElement('article');
    el.className = 'ticket';
    el.innerHTML = `
      <div class="ticket__main">
        <div class="ticket__row1">
          <span class="ticket__date">${dateLabel}</span>
          <span class="ticket__type">${escapeHtml(e.tipo)}</span>
        </div>
        <div class="ticket__point">${escapeHtml(e.punto)}</div>
        ${e.notas ? `<div class="ticket__notes">${escapeHtml(e.notas)}</div>` : ''}
      </div>
      <div class="ticket__side">
        <span class="ticket__amount">${fmtMoney(e.monto)}</span>
        <button class="ticket__del" data-id="${e.id}">Eliminar</button>
      </div>
    `;
    list.appendChild(el);
  });

  list.querySelectorAll('.ticket__del').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (confirm('¿Eliminar este servicio del historial? Esta acción no se puede deshacer.')) {
        entries = entries.filter(e => e.id !== id);
        saveEntries(entries);
        render();
        showToast('Servicio eliminado.');
      }
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Form ----------
const form = document.getElementById('entryForm');
const tipoSelect = document.getElementById('tipo');
const otroField = document.getElementById('otroField');
const tipoOtroInput = document.getElementById('tipoOtro');

document.getElementById('fecha').value = toDateInputValue(today);

tipoSelect.addEventListener('change', () => {
  otroField.hidden = tipoSelect.value !== 'Otro';
  if (!otroField.hidden) tipoOtroInput.focus();
});

form.addEventListener('submit', (ev) => {
  ev.preventDefault();

  const fecha = document.getElementById('fecha').value;
  let tipo = tipoSelect.value;
  const punto = document.getElementById('punto').value.trim();
  const monto = parseFloat(document.getElementById('monto').value);
  const notas = document.getElementById('notas').value.trim();

  if (!fecha || !tipo || !punto || isNaN(monto)) {
    showToast('Completa fecha, tipo, punto y monto.');
    return;
  }
  if (tipo === 'Otro') {
    const custom = tipoOtroInput.value.trim();
    if (!custom) {
      showToast('Especifica el tipo de servicio.');
      return;
    }
    tipo = custom;
  }

  const entry = {
    id: uid(),
    fecha,
    tipo,
    punto,
    monto,
    notas,
    creadoEn: Date.now()
  };

  entries.push(entry);
  saveEntries(entries);

  // jump view to the month of the new entry so the user sees it land
  const d = parseLocalDate(fecha);
  viewYear = d.getFullYear();
  viewMonth = d.getMonth();

  render();
  showToast('Servicio agregado.');

  form.reset();
  document.getElementById('fecha').value = toDateInputValue(today);
  otroField.hidden = true;
});

// ---------- Month navigation ----------
document.getElementById('prevMonth').addEventListener('click', () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  render();
});
document.getElementById('nextMonth').addEventListener('click', () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  render();
});

// ---------- Export: full backup (JSON) ----------
document.getElementById('btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `respaldo-bitacora-${toDateInputValue(new Date())}.json`);
  showToast('Respaldo descargado.');
});

// ---------- Export: month CSV ----------
document.getElementById('btnCSV').addEventListener('click', () => {
  const monthEntries = entriesForMonth(viewYear, viewMonth)
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

  if (monthEntries.length === 0) {
    showToast('No hay servicios este mes para exportar.');
    return;
  }

  const rows = [['Fecha', 'Tipo de servicio', 'Punto/Cliente', 'Monto', 'Notas']];
  monthEntries.forEach(e => {
    rows.push([e.fecha, e.tipo, e.punto, e.monto.toFixed(2), e.notas || '']);
  });
  const total = monthEntries.reduce((s, e) => s + e.monto, 0);
  rows.push(['', '', 'TOTAL', total.toFixed(2), '']);

  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `reporte-${MONTH_NAMES[viewMonth]}-${viewYear}.csv`);
  showToast('Reporte del mes descargado.');
});

function csvEscape(val) {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Init ----------
render();
