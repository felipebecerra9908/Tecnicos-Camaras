// ---------- Storage ----------
const STORAGE_KEY = 'bitacora_servicios_v2';
const OLD_STORAGE_KEY = 'bitacora_servicios_v1';
const TECNICO_KEY = 'bitacora_tecnico_nombre';

function loadEntries() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // migrate from previous version if present, so nobody loses history
      const old = localStorage.getItem(OLD_STORAGE_KEY);
      if (old) {
        raw = old;
        localStorage.setItem(STORAGE_KEY, old);
      }
    }
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

let chartInstance = null;
let pendingGeo = null; // { lat, lng } captured for the entry being created

// ---------- Helpers ----------
const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

const TYPE_META = [
  { match: /an[aá]log/i, cls: 'ticket__badge--camara', color: '#2dd4bf',
    icon: '<path d="M4 8h11l3-3h2v14h-2l-3-3H4z"/>' },
  { match: /ip/i, cls: 'ticket__badge--camara', color: '#38bdf8',
    icon: '<path d="M4 8h11l3-3h2v14h-2l-3-3H4z"/>' },
  { match: /alarma/i, cls: 'ticket__badge--alarma', color: '#ff6b35',
    icon: '<path d="M12 2a7 7 0 0 0-7 7c0 4-1.5 5.5-1.5 6.5h17C19.5 14.5 19 13 19 9a7 7 0 0 0-7-7zM9.5 18a2.5 2.5 0 0 0 5 0z"/>' },
  { match: /revisi[oó]n/i, cls: 'ticket__badge--revision', color: '#a78bfa',
    icon: '<path d="M10 4a6 6 0 1 0 3.8 10.6l4.8 4.8 1.4-1.4-4.8-4.8A6 6 0 0 0 10 4zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/>' }
];
const DEFAULT_META = { cls: '', color: '#8b909a', icon: '<path d="M12 2 2 22h20z"/>' };

function metaForType(tipo) {
  return TYPE_META.find(t => t.match.test(tipo)) || DEFAULT_META;
}

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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function mapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// ---------- Rendering ----------
function render() {
  renderReportHeader();
  renderStats();
  renderChart();
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

function getBreakdown(monthEntries) {
  const byType = {};
  monthEntries.forEach(e => {
    byType[e.tipo] = (byType[e.tipo] || 0) + e.monto;
  });
  return Object.entries(byType).sort((a, b) => b[1] - a[1]);
}

function renderChart() {
  const monthEntries = entriesForMonth(viewYear, viewMonth);
  const breakdown = getBreakdown(monthEntries);
  const canvas = document.getElementById('breakdownChart');
  const emptyMsg = document.getElementById('chartEmpty');

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  if (breakdown.length === 0) {
    canvas.style.visibility = 'hidden';
    emptyMsg.hidden = false;
    return;
  }
  canvas.style.visibility = 'visible';
  emptyMsg.hidden = true;

  const labels = breakdown.map(([tipo]) => tipo);
  const data = breakdown.map(([, monto]) => monto);
  const colors = breakdown.map(([tipo]) => metaForType(tipo).color);

  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Ingresos por tipo de servicio',
        data,
        backgroundColor: colors,
        borderRadius: 6,
        maxBarThickness: 46
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => fmtMoney(ctx.parsed.y)
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#8b909a', font: { size: 11 } },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#8b909a',
            font: { size: 11 },
            callback: (val) => 'Q ' + val
          },
          grid: { color: 'rgba(255,255,255,0.06)' }
        }
      }
    }
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
    const meta = metaForType(e.tipo);

    let locationHtml = '';
    const loc = e.ubicacion || {};
    if (loc.lat && loc.lng) {
      const texto = loc.texto ? escapeHtml(loc.texto) : 'Ver en mapa';
      locationHtml = `<div class="ticket__location">
        <svg class="icon" viewBox="0 0 24 24" style="color:var(--teal)"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>
        <a href="${mapsLink(loc.lat, loc.lng)}" target="_blank" rel="noopener">${texto}</a>
      </div>`;
    } else if (loc.texto) {
      locationHtml = `<div class="ticket__location">
        <svg class="icon" viewBox="0 0 24 24" style="color:var(--muted)"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>
        <span>${escapeHtml(loc.texto)}</span>
      </div>`;
    }

    const el = document.createElement('article');
    el.className = 'ticket';
    el.innerHTML = `
      <div class="ticket__main">
        <div class="ticket__row1">
          <span class="ticket__badge ${meta.cls}" style="color:${meta.color}">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">${meta.icon}</svg>
          </span>
          <span class="ticket__date">${dateLabel}</span>
          <span class="ticket__type">${escapeHtml(e.tipo)}</span>
        </div>
        <div class="ticket__point">${escapeHtml(e.punto)}</div>
        ${locationHtml}
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

// ---------- Technician name ----------
const tecnicoInput = document.getElementById('tecnicoNombre');
tecnicoInput.value = localStorage.getItem(TECNICO_KEY) || '';
tecnicoInput.addEventListener('change', () => {
  localStorage.setItem(TECNICO_KEY, tecnicoInput.value.trim());
});

// ---------- Form ----------
const form = document.getElementById('entryForm');
const tipoSelect = document.getElementById('tipo');
const otroField = document.getElementById('otroField');
const tipoOtroInput = document.getElementById('tipoOtro');
const ubicacionInput = document.getElementById('ubicacion');
const geoStatus = document.getElementById('geoStatus');
const btnGeo = document.getElementById('btnGeo');

document.getElementById('fecha').value = toDateInputValue(today);

tipoSelect.addEventListener('change', () => {
  otroField.hidden = tipoSelect.value !== 'Otro';
  if (!otroField.hidden) tipoOtroInput.focus();
});

btnGeo.addEventListener('click', () => {
  if (!navigator.geolocation) {
    geoStatus.textContent = 'Tu navegador no permite obtener ubicación.';
    geoStatus.classList.add('geo-status--error');
    return;
  }
  geoStatus.classList.remove('geo-status--error');
  geoStatus.textContent = 'Obteniendo ubicación…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      pendingGeo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      geoStatus.textContent = `Ubicación capturada ✓ (${pendingGeo.lat.toFixed(5)}, ${pendingGeo.lng.toFixed(5)})`;
    },
    (err) => {
      pendingGeo = null;
      geoStatus.classList.add('geo-status--error');
      geoStatus.textContent = 'No se pudo obtener la ubicación. Puedes escribir la dirección manualmente.';
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

form.addEventListener('submit', (ev) => {
  ev.preventDefault();

  const fecha = document.getElementById('fecha').value;
  let tipo = tipoSelect.value;
  const punto = document.getElementById('punto').value.trim();
  const monto = parseFloat(document.getElementById('monto').value);
  const notas = document.getElementById('notas').value.trim();
  const ubicacionTexto = ubicacionInput.value.trim();

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
    ubicacion: {
      texto: ubicacionTexto,
      lat: pendingGeo ? pendingGeo.lat : null,
      lng: pendingGeo ? pendingGeo.lng : null
    },
    creadoEn: Date.now()
  };

  entries.push(entry);
  saveEntries(entries);

  const d = parseLocalDate(fecha);
  viewYear = d.getFullYear();
  viewMonth = d.getMonth();

  render();
  showToast('Servicio agregado.');

  form.reset();
  document.getElementById('fecha').value = toDateInputValue(today);
  otroField.hidden = true;
  geoStatus.textContent = '';
  geoStatus.classList.remove('geo-status--error');
  pendingGeo = null;
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

  const rows = [['Fecha', 'Tipo de servicio', 'Punto/Cliente', 'Ubicación', 'Monto', 'Notas']];
  monthEntries.forEach(e => {
    const loc = e.ubicacion || {};
    const locStr = loc.lat && loc.lng ? `${loc.texto || ''} (${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)})` : (loc.texto || '');
    rows.push([e.fecha, e.tipo, e.punto, locStr, e.monto.toFixed(2), e.notas || '']);
  });
  const total = monthEntries.reduce((s, e) => s + e.monto, 0);
  rows.push(['', '', '', 'TOTAL', total.toFixed(2), '']);

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

// ---------- Export: month PDF (with chart) ----------
document.getElementById('btnPDF').addEventListener('click', () => {
  const monthEntries = entriesForMonth(viewYear, viewMonth)
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

  if (monthEntries.length === 0) {
    showToast('No hay servicios este mes para generar el informe.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 50;

  // ---- Header ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 23, 28);
  doc.text('Informe de Servicios', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(90, 95, 105);
  y += 20;
  doc.text(`${capitalize(MONTH_NAMES[viewMonth])} ${viewYear}`, margin, y);

  const tecnico = localStorage.getItem(TECNICO_KEY) || '';
  if (tecnico) {
    doc.text(`Técnico: ${tecnico}`, pageWidth - margin, y, { align: 'right' });
  }

  y += 14;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  // ---- Summary stats ----
  const total = monthEntries.reduce((s, e) => s + e.monto, 0);
  const count = monthEntries.length;
  const days = new Set(monthEntries.map(e => e.fecha)).size;
  const avg = total / count;

  const statBoxes = [
    { label: 'Total del mes', value: fmtMoney(total) },
    { label: 'Servicios', value: String(count) },
    { label: 'Días trabajados', value: String(days) },
    { label: 'Promedio / servicio', value: fmtMoney(avg) }
  ];
  const boxW = (pageWidth - margin * 2 - 3 * 10) / 4;
  statBoxes.forEach((s, i) => {
    const x = margin + i * (boxW + 10);
    doc.setFillColor(245, 246, 248);
    doc.roundedRect(x, y, boxW, 46, 4, 4, 'F');
    doc.setFontSize(8);
    doc.setTextColor(120, 125, 135);
    doc.text(s.label, x + 8, y + 16);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 33, 38);
    doc.text(s.value, x + 8, y + 34);
    doc.setFont('helvetica', 'normal');
  });
  y += 46 + 26;

  // ---- Chart image ----
  if (chartInstance) {
    const chartImg = document.getElementById('breakdownChart').toDataURL('image/png', 1.0);
    const chartW = pageWidth - margin * 2;
    const chartH = 180;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 33, 38);
    doc.text('Ingresos por tipo de servicio', margin, y);
    y += 10;
    doc.addImage(chartImg, 'PNG', margin, y, chartW, chartH);
    y += chartH + 24;
  }

  // ---- Table ----
  const tableBody = monthEntries.map(e => {
    const loc = e.ubicacion || {};
    const locStr = loc.lat && loc.lng
      ? (loc.texto ? loc.texto : 'Coord. GPS')
      : (loc.texto || '—');
    return [
      formatShortDate(e.fecha),
      e.tipo,
      e.punto,
      locStr,
      fmtMoney(e.monto)
    ];
  });

  doc.autoTable({
    startY: y,
    head: [['Fecha', 'Servicio', 'Punto / Cliente', 'Ubicación', 'Monto']],
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, textColor: [40, 43, 48] },
    headStyles: { fillColor: [28, 33, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    columnStyles: {
      4: { halign: 'right', font: 'courier' }
    },
    foot: [['', '', '', 'TOTAL', fmtMoney(total)]],
    footStyles: { fillColor: [255, 107, 53], textColor: [26, 13, 5], fontStyle: 'bold' },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generado el ${new Date().toLocaleDateString('es-GT')} — página ${doc.internal.getCurrentPageInfo().pageNumber} de ${pageCount}`,
        margin,
        doc.internal.pageSize.getHeight() - 20
      );
    }
  });

  doc.save(`informe-${MONTH_NAMES[viewMonth]}-${viewYear}.pdf`);
  showToast('Informe PDF generado.');
});

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatShortDate(iso) {
  const d = parseLocalDate(iso);
  return d.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
