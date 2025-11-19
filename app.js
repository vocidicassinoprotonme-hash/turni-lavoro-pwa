// Chiave di salvataggio locale
const STORAGE_KEY = "turni_calendar_v1";

// Mappa: { "YYYY-MM-DD": "Mattina" | "Pomeriggio" | "Notte" | "Libero" | "Ferie" | "Mutua" | "PAR" | "P.S." }
let shifts = {};

// Stato mese corrente
let currentYear;
let currentMonth; // 0-11

// Ordine dei tipi di turno quando tocchi la casella
const SHIFT_ORDER = [
  "",
  "Mattina",
  "Pomeriggio",
  "Notte",
  "Libero",
  "Ferie",
  "Mutua",
  "PAR",
  "P.S."
];

// Elementi DOM calendario
const monthNameEl = document.getElementById("month-name");
const yearNumberEl = document.getElementById("year-number");
const calendarGridEl = document.getElementById("calendar-grid");
const monthSummaryEl = document.getElementById("month-summary");

// Elementi DOM inserimento settimanale
const weekForm = document.getElementById("week-form");
const weekStartEl = document.getElementById("week-start");
const weekShiftEl = document.getElementById("week-shift");

// Pulsanti mese
document.getElementById("prev-month").addEventListener("click", () => {
  changeMonth(-1);
});

document.getElementById("next-month").addEventListener("click", () => {
  changeMonth(1);
});

// Inizializzazione
document.addEventListener("DOMContentLoaded", () => {
  loadShifts();

  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();

  // Precompila la data inizio settimana con oggi
  if (weekStartEl) {
    weekStartEl.value = formatDateKey(today);
  }

  // Gestione invio form settimanale
  if (weekForm) {
    weekForm.addEventListener("submit", (e) => {
      e.preventDefault();
      applyWeekShifts();
    });
  }

  // Registra service worker se presente
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }

  renderCalendar();
});

// Carica / salva

function loadShifts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      shifts = {};
      return;
    }
    shifts = JSON.parse(raw) || {};
  } catch (err) {
    console.error("Errore nel caricamento turni:", err);
    shifts = {};
  }
}

function saveShifts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts));
  } catch (err) {
    console.error("Errore nel salvataggio turni:", err);
  }
}

// Cambio mese

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

// Rendering calendario

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

  const totalCells = 42; // 6 righe x 7 colonne

  const today = new Date();
  const todayStr = formatDateKey(today);

  // Riepilogo conteggio per mese (qualsiasi turno)
  const monthCounts = {};

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
      // giorni del mese precedente
      const day = prevMonthDays - (firstWeekday - 1 - i);
      dateObj = new Date(currentYear, currentMonth - 1, day);
      cell.classList.add("outside-month");
    } else if (i >= firstWeekday && i < firstWeekday + daysInMonth) {
      // giorni del mese corrente
      const day = i - firstWeekday + 1;
      dateObj = new Date(currentYear, currentMonth, day);
      inCurrentMonth = true;
    } else {
      // giorni del mese successivo
      const day = i - (firstWeekday + daysInMonth) + 1;
      dateObj = new Date(currentYear, currentMonth + 1, day);
      cell.classList.add("outside-month");
    }

    const dateKey = formatDateKey(dateObj);
    const dayNum = dateObj.getDate();
    dayNumberEl.textContent = dayNum;

    const shiftType = shifts[dateKey] || "";

    if (shiftType) {
      labelEl.textContent = shortLabel(shiftType);
      applyShiftClass(cell, shiftType);

      if (inCurrentMonth) {
        if (!monthCounts[shiftType]) monthCounts[shiftType] = 0;
        monthCounts[shiftType]++;
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

  // Riepilogo mese dinamico
  const keys = Object.keys(monthCounts);
  if (keys.length === 0) {
    monthSummaryEl.textContent = "Nessun turno assegnato per questo mese.";
  } else {
    const parts = keys.map(
      (k) => `${shortLabel(k)} ${monthCounts[k]}`
    );
    monthSummaryEl.textContent = "Riepilogo mese: " + parts.join(" • ");
  }
}

// Ruota i tipi di turno con il tocco singolo

function cycleShift(dateKey) {
  const currentType = shifts[dateKey] || "";
  const index = SHIFT_ORDER.indexOf(currentType);
  const nextType = SHIFT_ORDER[(index + 1) % SHIFT_ORDER.length];

  if (nextType === "") {
    delete shifts[dateKey];
  } else {
    shifts[dateKey] = nextType;
  }

  saveShifts();
  renderCalendar();
}

// Inserimento settimanale (7 giorni consecutivi)

function applyWeekShifts() {
  const startStr = weekStartEl.value;
  const shiftType = weekShiftEl.value;

  if (!startStr || !shiftType) {
    alert("Seleziona una data di inizio e un tipo di turno.");
    return;
  }

  const startDate = new Date(startStr);

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const key = formatDateKey(d);
    shifts[key] = shiftType;
  }

  saveShifts();
  renderCalendar();
}

// Utilità

function formatDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shortLabel(shiftType) {
  switch (shiftType) {
    case "Mattina":
      return "Matt";
    case "Pomeriggio":
      return "Pome";
    case "Notte":
      return "Notte";
    case "Libero":
      return "Libero";
    case "Ferie":
      return "Ferie";
    case "Mutua":
      return "Mutua";
    case "PAR":
      return "PAR";
    case "P.S.":
      return "P.S.";
    default:
      return shiftType || "";
  }
}

function applyShiftClass(cell, shiftType) {
  cell.classList.remove(
    "shift-mattina",
    "shift-pomeriggio",
    "shift-notte",
    "shift-libero",
    "shift-ferie",
    "shift-mutua",
    "shift-par",
    "shift-ps"
  );
  if (shiftType === "Mattina") cell.classList.add("shift-mattina");
  if (shiftType === "Pomeriggio") cell.classList.add("shift-pomeriggio");
  if (shiftType === "Notte") cell.classList.add("shift-notte");
  if (shiftType === "Libero") cell.classList.add("shift-libero");
  if (shiftType === "Ferie") cell.classList.add("shift-ferie");
  if (shiftType === "Mutua") cell.classList.add("shift-mutua");
  if (shiftType === "PAR") cell.classList.add("shift-par");
  if (shiftType === "P.S.") cell.classList.add("shift-ps");
}
