// ==================== COSTANTI & STORAGE ====================

const STORAGE_KEY_SHIFTS = "turni_calendar_v3";
const STORAGE_KEY_TYPES = "turni_shift_types_v2";
const STORAGE_KEY_NOTES = "turni_notes_v1";
const STORAGE_KEY_EARNINGS = "turni_earnings_v1";

// Iconcine per i turni
const SHIFT_ICONS = {
  MATT: "🌅",
  POME: "🌇",
  NOTTE: "🌃",
  LIB: "🛋️",
  FER: "🏖️",
  MUT: "🩺",
  PAR: "📄",
  PS: "🏥"
};

// Mappa turni per giorno: { "YYYY-MM-DD": "ID_TURNO" }
let shifts = {};

// Elenco tipi di turno: [{ id, short, name, hours, color }]
let shiftTypes = [];

// Note per giorno: { "YYYY-MM-DD": { title, text } }
let notes = {};

// Stato guadagni
let earningsState = {
  hourlyRate: 0,
  oreRetribuite: null,
  oreEccedenza: null
};

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

// Backup & PDF calendario
const exportJsonBtn = document.getElementById("export-json");
const importJsonBtn = document.getElementById("import-json-btn");
const importJsonFile = document.getElementById("import-json-file");
const printPdfBtn = document.getElementById("print-pdf");

// Riepilogo & grafico
const hoursSummaryEl = document.getElementById("hours-summary");
const chartCanvas = document.getElementById("month-chart");

// Guadagni
const hourlyPayInput = document.getElementById("hourly-pay");
const payrollPdfInput = document.getElementById("payroll-pdf");
const earningsSummaryEl = document.getElementById("earnings-summary");

// Modale giorno
const dayModal = document.getElementById("day-modal");
const dayModalDateLabel = document.getElementById("day-modal-date");
const dayModalShiftSelect = document.getElementById("day-modal-shift");
const dayModalTitleInput = document.getElementById("day-modal-title");
const dayModalTextInput = document.getElementById("day-modal-text");
const dayModalSaveBtn = document.getElementById("day-modal-save");
const dayModalCancelBtn = document.getElementById("day-modal-cancel");

let modalDateKey = null;

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
  setupTabs();

  loadShiftTypes();
  buildShiftOrder();
  loadShifts();
  loadNotes();
  loadEarningsState();

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

  if (hourlyPayInput) {
    if (earningsState.hourlyRate) {
      hourlyPayInput.value = earningsState.hourlyRate.toString().replace(".", ",");
    }
    hourlyPayInput.addEventListener("input", () => {
      const v = parseFloat((hourlyPayInput.value || "").replace(",", "."));
      earningsState.hourlyRate = Number.isFinite(v) ? v : 0;
      saveEarningsState();
      updateEarningsSummary();
    });
  }

  if (payrollPdfInput) {
    payrollPdfInput.addEventListener("change", handlePayrollPdf);
  }

  if (dayModalSaveBtn) {
    dayModalSaveBtn.addEventListener("click", () => {
      saveDayModal();
    });
  }
  if (dayModalCancelBtn) {
    dayModalCancelBtn.addEventListener("click", () => {
      closeDayModal();
    });
  }
  if (dayModal) {
    // chiudi se clicchi fuori dalla card
    dayModal.addEventListener("click", (e) => {
      if (e.target === dayModal) closeDayModal();
    });
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }

  renderShiftTypes();
  populateWeekSelect();
  populateModalShiftSelect();
  renderCalendar();
  updateEarningsSummary();
});

// ==================== TABS ====================

function setupTabs() {
  function showPage(name) {
    tabButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.page === name);
    });
    pageCalendar.classList.toggle("active", name === "calendar");
    pageSettings.classList.toggle("active", name === "settings");
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      showPage(page);
    });
  });

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
  populateModalShiftSelect();
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
    const badgeIcon = SHIFT_ICONS[t.id] || "";
    badge.textContent = badgeIcon || t.short || t.id;
    badge.style.background = t.color || "#e5e7eb";

    const info = document.createElement("div");
    info.className = "shift-type-info";

    const nameEl = document.createElement("div");
    nameEl.className = "shift-type-name";
    const icon = SHIFT_ICONS[t.id] || "";
    nameEl.textContent = icon ? icon + " " + t.name : t.name;

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

function populateModalShiftSelect() {
  if (!dayModalShiftSelect) return;
  const current = dayModalShiftSelect.value;
  dayModalShiftSelect.innerHTML = "";

  const optNone = document.createElement("option");
  optNone.value = "";
  optNone.textContent = "Nessun turno";
  dayModalShiftSelect.appendChild(optNone);

  shiftTypes.forEach((t) => {
    const opt = document.createElement("option");
    const icon = SHIFT_ICONS[t.id] || "";
    opt.value = t.id;
    opt.textContent = icon ? `${icon} ${t.name}` : t.name;
    dayModalShiftSelect.appendChild(opt);
  });

  if (current) {
    dayModalShiftSelect.value = current;
  }
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

// ==================== NOTE ====================

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTES);
    notes = raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("Errore caricamento note:", err);
    notes = {};
  }
}

function saveNotes() {
  try {
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
  } catch (err) {
    console.error("Errore salvataggio note:", err);
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
      const icon = SHIFT_ICONS[type.id] || "";
      const labelShort = type.short || "";
      labelEl.textContent = icon ? `${icon} ${labelShort}` : labelShort;
      if (type.color) {
        cell.style.background = type.color;
      }

      if (inCurrentMonth) {
        if (!dayCounts[shiftId]) dayCounts[shiftId] = 0;
        dayCounts[shiftId]++;
      }
    }

    const note = notes[dateKey];
    if (note && note.title) {
      const noteEl = document.createElement("div");
      noteEl.className = "day-note-title";
      noteEl.textContent = note.title;
      cell.appendChild(noteEl);
    }

    if (dateKey === todayStr && inCurrentMonth) {
      cell.classList.add("today");
    }

    cell.addEventListener("click", () => {
      openDayModal(dateKey);
    });

    cell.appendChild(dayNumberEl);
    cell.appendChild(labelEl);
    calendarGridEl.appendChild(cell);
  }

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

// MODALE GIORNO

function openDayModal(dateKey) {
  modalDateKey = dateKey;
  const d = new Date(dateKey);
  if (dayModalDateLabel) {
    dayModalDateLabel.textContent = d.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  populateModalShiftSelect();
  if (dayModalShiftSelect) {
    const currentShiftId = shifts[dateKey] || "";
    dayModalShiftSelect.value = currentShiftId;
  }

  const note = notes[dateKey] || {};
  if (dayModalTitleInput) dayModalTitleInput.value = note.title || "";
  if (dayModalTextInput) dayModalTextInput.value = note.text || "";

  if (dayModal) dayModal.classList.add("open");
}

function closeDayModal() {
  modalDateKey = null;
  if (dayModal) dayModal.classList.remove("open");
}

function saveDayModal() {
  if (!modalDateKey) return;

  const shiftId = dayModalShiftSelect ? dayModalShiftSelect.value : "";
  if (shiftId) shifts[modalDateKey] = shiftId;
  else delete shifts[modalDateKey];
  saveShifts();

  const title = dayModalTitleInput ? dayModalTitleInput.value.trim() : "";
  const text = dayModalTextInput ? dayModalTextInput.value.trim() : "";
  if (title || text) notes[modalDateKey] = { title, text };
  else delete notes[modalDateKey];
  saveNotes();

  closeDayModal();
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

// ==================== BACKUP / IMPORT / PDF CALENDARIO ====================

function exportBackup() {
  const data = {
    shifts,
    shiftTypes,
    notes
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
      if (data.notes && typeof data.notes === "object") {
        notes = data.notes;
      }
      saveShiftTypes();
      saveShifts();
      saveNotes();
      buildShiftOrder();
      renderShiftTypes();
      populateWeekSelect();
      populateModalShiftSelect();
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
    const note = notes[key];

    rowsHtml += `<tr>
      <td style="padding:4px 8px;border:1px solid #ddd;">${day}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;">${key}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;">${name}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;">${hours}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;">${note && note.title ? note.title : ""}</td>
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
              <th style="padding:4px 8px;border:1px solid #ddd;">Nota</th>
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

  for (let day = 1; day <= daysInMonth; day
