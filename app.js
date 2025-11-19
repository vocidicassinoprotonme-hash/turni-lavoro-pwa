// ==================== CHIAVI DI SALVATAGGIO ====================

const STORAGE_KEY_SHIFTS = "turni_calendar_v3";
const STORAGE_KEY_TYPES = "turni_shift_types_v2";

// Mappa turni per giorno: { "YYYY-MM-DD": "ID_TURNO" }
let shifts = {};

// Elenco tipi di turno: [{ id, short, name, hours, color }]
let shiftTypes = [];

// ordine di rotazione nel calendario (viene ricostruito)
let SHIFT_ORDER = [""];

// ==================== ELEMENTI DOM ====================

// TAB / PAGINE
const tabButtons = document.querySelectorAll(".tab-btn");
const pageCalendar = document.getElementById("page-calendar");
const pageSettings = document.getElementById("page-settings");

// Calendario
const monthNameEl = document.getElementById("month-name");
const yearNumberEl = document.getElementById("year-number");
const calendarGridEl = document.getElementById("calendar-grid");
const monthSummaryEl = document.getElementById("month-summary");

// Turni disponibili
const shiftTypesListEl = document.getElementById("shift-types-list");
const shiftTypeForm = document.getElementById("shift-type-form");
const shiftShortEl = document.getElementById("shift-short");
const shiftNameEl = document.getElementById("shift-name");
const shiftHoursEl = document.getElementById("shift-hours");
const shiftColorEl = document.getElementById("shift-color");

// Inserimento settimanale
const weekForm = document.getElementById("week-form");
const weekStartEl = document.getElementById("week-start");
const weekShiftEl = document.getElementById("week-shift");

// Backup & PDF
const exportJsonBtn = document.getElementById("export-json");
const importJsonBtn = document.getElementById("import-json-btn");
const importJsonFile = document.getElementById("import-json-file");
const printPdfBtn = document.getElementById("print-pdf");

// Riepilogo & grafico
const hoursSummaryEl = document.getElementById("hours-summary");
const chartCanvas = document.getElementById("month-chart");

// Pulsanti cambio mese
document.getElementById("prev-month").addEventListener("click", () => {
  changeMonth(-1);
});
document.getElementById("next-month").addEventListener("click", () => {
  changeMonth(1);
});

// Stato mese corrente
let currentYear;
let currentMonth; // 0-11

// ==================== INIZIALIZZAZIONE ====================

document.addEventListener("DOMContentLoaded", () => {
  // Tab navigation
  setupTabs();

  loadShiftTypes();
  buildShiftOrder();
  loadShifts();

  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();

  if (weekStartEl) {
    weekStartEl.value = formatDateKey(today);
  }

  if (shiftTypeForm) {
    shiftTypeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      addNewShiftType();
    });
  }

  if (weekForm) {
    weekForm.addEventListener("submit", (e) => {
      e.preventDefault();
      applyWeekShifts();
    });
  }

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener("click", exportBackup);
  }

  if (importJsonBtn && importJsonFile) {
    importJsonBtn.addEventListener("click", () => importJsonFile.click());
    importJsonFile.addEventListener("change", importBackup);
  }

  if (printPdfBtn) {
    printPdfBtn.addEventListener("click", printPdf);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }

  renderShiftTypes();
  populateWeekSelect();
  renderCalendar();
});

// ==================== TABS ====================

function setupTabs() {
  function showPage(name) {
    // pulsanti
    tabButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.page === name);
    });
    // pagine
    pageCalendar.classList.toggle("active", name === "calendar");
    pageSettings.classList.toggle("active", name === "settings");
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      showPage(page);
    });
  });

  // pagina di default
  showPage("calendar");
}

// ==================== TIPI DI TURNO ====================

function loadShiftTypes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TYPES);
    if (!raw) {
      shiftTypes = getDefaultShiftTypes();
      saveShiftTypes();
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      shiftTypes = parsed;
    } else {
      shiftTypes = getDefaultShiftTypes();
      saveShiftTypes();
    }
  } catch (err) {
    console.error("Errore caricamento tipi di turno:", err);
    shiftTypes = getDefaultShiftTypes();
    saveShiftTypes();
  }
}

function saveShiftTypes() {
  try {
    localStorage.setItem(STORAGE_KEY_TYPES, JSON.stringify(shiftTypes));
  } catch (err) {
    console.error("Errore salvataggio tipi di turno:", err);
  }
}

function getDefaultShiftTypes() {
  return [
    {
      id: "MATT",
      short: "Matt",
      name: "Mattina",
      hours: "06:00-14:00",
      color: "#f9c5d9"
    },
    {
      id: "POME",
      short: "Pome",
      name: "Pomeriggio",
      hours: "14:00-22:00",
      color: "#fdc9a8"
    },
    {
      id: "NOTTE",
      short: "Notte",
      name: "Notte",
      hours: "22:00-06:00",
      color: "#e0c8ff"
    },
    {
      id: "LIB",
      short: "Libero",
      name: "Riposo",
      hours: "",
      color: "#cdecc4"
    },
    {
      id: "FER",
      short: "Ferie",
      name: "Ferie",
      hours: "",
      color: "#e5c0ff"
    },
    {
      id: "MUT",
      short: "Mutua",
      name: "Mutua",
      hours: "",
      color: "#bae6fd"
    },
    {
      id: "PAR",
      short: "PAR",
      name: "PAR",
      hours: "",
      color: "#c7d2fe"
    },
    {
      id: "PS",
      short: "P.S.",
      name: "P.S.",
      hours: "",
      color: "#bbf7d0"
    }
  ];
}

function buildShiftOrder() {
  SHIFT_ORDER = [""].concat(shiftTypes.map((t) => t.id));
}

function findShiftType(id) {
  return shiftTypes.find((t) => t.id === id);
}

function addNewShiftType() {
  const short = (shiftShortEl.value || "").trim();
  const name = (shiftNameEl.value || "").trim();
  const hours = (shiftHoursEl.value || "").trim();
  const color = shiftColorEl.value || "#f97373";

  if (!short || !name) {
    alert("Inserisci almeno sigla e nome turno.");
    return;
  }

  let idBase = short.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!idBase) {
    idBase =
      "T" +
      Math.random()
        .toString(16)
        .slice(2, 6)
        .toUpperCase();
  }

  if (shiftTypes.some((t) => t.id === idBase)) {
    alert("Esiste già un turno con questa sigla. Scegline un'altra.");
    return;
  }

  const newType = { id: idBase, short, name, hours, color };
  shiftTypes.push(newType);
  saveShiftTypes();
  buildShiftOrder();
  renderShiftTypes();
  populateWeekSelect();
  renderCalendar();

  shiftShortEl.value = "";
  shiftNameEl.value = "";
  shiftHoursEl.value = "";
  shiftColorEl.value = "#f97373";
}

function renderShiftTypes() {
  if (!shiftTypesListEl) return;
  shiftTypesListEl.innerHTML = "";

  shiftTypes.forEach((t) => {
    const item = document.createElement("div");
    item.className = "shift-type-item";

    const badge = document.createElement("div");
    badge.className = "shift-type-badge";
    badge.textContent = t.short || t.id;
    badge.style.background = t.color || "#e5e7eb";

    const info = document.createElement("div");
    info.className = "shift-type-info";

    const nameEl = document.createElement("div");
    nameEl.className = "shift-type-name";
    nameEl.textContent = t.name;

    const hoursEl = document.createElement("div");
    hoursEl.className = "shift-type-hours";
    hoursEl.textContent = t.hours || "";

    info.appendChild(nameEl);
    if (t.hours) info.appendChild(hoursEl);

    item.appendChild(badge);
    item.appendChild(info);

    shiftTypesListEl.appendChild(item);
  });
}

function populateWeekSelect() {
  if (!weekShiftEl) return;
  weekShiftEl.innerHTML = "";
  shiftTypes.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = `${t.short} – ${t.name}`;
    weekShiftEl.appendChild(opt);
  });
}

// ==================== TURNI PER GIORNO ====================

function loadShifts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHIFTS);
    if (!raw) {
      shifts = {};
      return;
    }
    shifts = JSON.parse(raw) || {};
  } catch (err) {
    console.error("Errore caricamento turni calendario:", err);
    shifts = {};
  }
}

function saveShifts() {
  try {
    localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
  } catch (err) {
    console.error("Errore salvataggio turni calendario:", err);
  }
}

// ==================== CALENDARIO ====================

function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
}

function renderCalendar() {
  const monthNames = [
    "GENNAIO",
    "FEBBRAIO",
    "MARZO",
    "APRILE",
    "MAGGIO",
    "GIUGNO",
    "LUGLIO",
    "AGOSTO",
    "SETTEMBRE",
    "OTTOBRE",
    "NOVEMBRE",
    "DICEMBRE"
  ];

  monthNameEl.textContent = monthNames[currentMonth];
  yearNumberEl.textContent = currentYear;

  calendarGridEl.innerHTML = "";

  const firstDay = new Date(currentYear, currentMonth, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7; // Lun=0 ... Dom=6
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const totalCells = 42;

  const today = new Date();
  const todayStr = formatDateKey(today);

  // Per riepilogo mese (solo conteggio giorni)
  const dayCounts = {};

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement("div");
    cell.className = "day-cell";

    const dayNumberEl = document.createElement("div");
    dayNumberEl.className = "day-number";

    const labelEl = document.createElement("div");
    labelEl.className = "day-label";

    let dateObj;
    let inCurrentMonth = false;

    if (i < firstWeekday) {
      const day = prevMonthDays - (firstWeekday - 1 - i);
      dateObj = new Date(currentYear, currentMonth - 1, day);
      cell.classList.add("outside-month");
    } else if (i >= firstWeekday && i < firstWeekday + daysInMonth) {
      const day = i - firstWeekday + 1;
      dateObj = new Date(currentYear, currentMonth, day);
      inCurrentMonth = true;
    } else {
      const day = i - (firstWeekday + daysInMonth) + 1;
      dateObj = new Date(currentYear, currentMonth + 1, day);
      cell.classList.add("outside-month");
    }

    const dateKey = formatDateKey(dateObj);
    const dayNum = dateObj.getDate();
    dayNumberEl.textContent = dayNum;

    const shiftId = shifts[dateKey];
    const type = shiftId ? findShiftType(shiftId) : null;

    if (type) {
      labelEl.textContent = type.short || "";
      if (type.color) {
        cell.style.background = type.color;
      }

      if (inCurrentMonth) {
        if (!dayCounts[shiftId]) dayCounts[shiftId] = 0;
        dayCounts[shiftId]++;
      }
    }

    if (dateKey === todayStr && inCurrentMonth) {
      cell.classList.add("today");
    }

    cell.addEventListener("click", () => {
      cycleShift(dateKey);
    });

    cell.appendChild(dayNumberEl);
    cell.appendChild(labelEl);
    calendarGridEl.appendChild(cell);
  }

  // Riepilogo mese (giorni per turno)
  const parts = Object.keys(dayCounts).map((id) => {
    const t = findShiftType(id);
    const label = t ? t.short || t.name : id;
    return `${label} ${dayCounts[id]} gg`;
  });
  monthSummaryEl.textContent =
    parts.length > 0
      ? "Riepilogo giorni: " + parts.join(" • ")
      : "Nessun turno assegnato per questo mese.";

  updateHoursSummary();
  drawMonthChart();
}

// Ruota turno sulle celle del calendario
function cycleShift(dateKey) {
  const currentId = shifts[dateKey] || "";
  const index = SHIFT_ORDER.indexOf(currentId);
  const nextId = SHIFT_ORDER[(index + 1) % SHIFT_ORDER.length];

  if (!nextId) {
    delete shifts[dateKey];
  } else {
    shifts[dateKey] = nextId;
  }

  saveShifts();
  renderCalendar();
}

// ==================== SETTIMANA ====================

function applyWeekShifts() {
  const startStr = weekStartEl.value;
  const shiftId = weekShiftEl.value;

  if (!startStr || !shiftId) {
    alert("Seleziona una data di inizio e un tipo di turno.");
    return;
  }

  const startDate = new Date(startStr);

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const key = formatDateKey(d);
    shifts[key] = shiftId;
  }

  saveShifts();
  renderCalendar();
}

// ==================== BACKUP / IMPORT / PDF ====================

function exportBackup() {
  const data = {
    shifts,
    shiftTypes
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "turni-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importBackup() {
  const file = importJsonFile.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.shiftTypes && Array.isArray(data.shiftTypes)) {
        shiftTypes = data.shiftTypes;
      }
      if (data.shifts && typeof data.shifts === "object") {
        shifts = data.shifts;
      }
      saveShiftTypes();
      saveShifts();
      buildShiftOrder();
      renderShiftTypes();
      populateWeekSelect();
      renderCalendar();
      alert("Backup importato correttamente.");
    } catch (err) {
      console.error(err);
      alert("File di backup non valido.");
    }
  };
  reader.readAsText(file);
}

function printPdf() {
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthLabel = `${String(currentMonth + 1).padStart(2, "0")}/${currentYear}`;

  let rowsHtml = "";
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(currentYear, currentMonth, day);
    const key = formatDateKey(d);
    const shiftId = shifts[key];
    const type = shiftId ? findShiftType(shiftId) : null;
    const name = type ? type.name : "";
    const hours = type ? type.hours || "" : "";

    rowsHtml += `<tr>
      <td style="padding:4px 8px;border:1px solid #ddd;">${day}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;">${key}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;">${name}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;">${hours}</td>
    </tr>`;
  }

  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>Turni di lavoro - ${monthLabel}</title>
        <meta charset="UTF-8" />
      </head>
      <body>
        <h2 style="font-family:sans-serif;">Turni di lavoro - ${monthLabel}</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:12px;">
          <thead>
            <tr>
              <th style="padding:4px 8px;border:1px solid #ddd;">Giorno</th>
              <th style="padding:4px 8px;border:1px solid #ddd;">Data</th>
              <th style="padding:4px 8px;border:1px solid #ddd;">Turno</th>
              <th style="padding:4px 8px;border:1px solid #ddd;">Orario</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <script>
          window.print();
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

// ==================== RIEPILOGO ORE & GRAFICO ====================

function getMonthStats(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const perType = {};
  let totalHours = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const key = formatDateKey(d);
    const shiftId = shifts[key];
    if (!shiftId) continue;
    const type = findShiftType(shiftId);
    if (!type) continue;

    const hoursPerDay = parseHoursToDecimal(type.hours);
    if (!perType[shiftId]) {
      perType[shiftId] = {
        type,
        days: 0,
        hours: 0
      };
    }
    perType[shiftId].days += 1;
    perType[shiftId].hours += hoursPerDay;
    totalHours += hoursPerDay;
  }

  return { perType, totalHours };
}

function parseHoursToDecimal(hoursStr) {
  if (!hoursStr) return 0;
  const m = hoursStr.match(
    /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/
  );
  if (!m) return 0;
  const start =
    parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  let end = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
  if (end <= start) {
    end += 24 * 60; // passa la mezzanotte
  }
  return (end - start) / 60;
}

function updateHoursSummary() {
  if (!hoursSummaryEl) return;
  const { perType, totalHours } = getMonthStats(
    currentYear,
    currentMonth
  );
  const entries = Object.values(perType);
  if (!entries.length) {
    hoursSummaryEl.textContent =
      "Nessuna ora lavorata per questo mese.";
    return;
  }
  const parts = entries.map((e) => {
    const label = e.type.short || e.type.name;
    return `${label}: ${e.hours.toFixed(1)} h (${e.days} gg)`;
  });
  hoursSummaryEl.textContent =
    `Ore totali mese: ${totalHours.toFixed(1)} h — ` +
    parts.join(" • ");
}

function drawMonthChart() {
  if (!chartCanvas || !chartCanvas.getContext) return;
  const ctx = chartCanvas.getContext("2d");
  const { perType } = getMonthStats(currentYear, currentMonth);
  const entries = Object.values(perType);

  ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

  if (!entries.length) return;

  const padding = 20;
  const width = chartCanvas.width;
  const height = chartCanvas.height;
  const barWidth =
    (width - padding * 2) / Math.max(entries.length, 1);

  const maxHours = Math.max(...entries.map((e) => e.hours), 1);
  const usableHeight = height - padding * 2 - 16;

  entries.forEach((e, index) => {
    const x =
      padding + index * barWidth + barWidth * 0.1;
    const barH = (e.hours / maxHours) * usableHeight;
    const y = height - padding - barH;

    ctx.fillStyle = e.type.color || "#4b5563";
    ctx.fillRect(x, y, barWidth * 0.8, barH);

    ctx.fillStyle = "#111827";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(
      e.type.short || e.type.name,
      x + barWidth * 0.4,
      height - 6
    );
  });
}

// ==================== UTILITÀ ====================

function formatDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
