// Chiave di salvataggio locale
const STORAGE_KEY = "turni_calendar_v1";

// Mappa: { "YYYY-MM-DD": "Mattina" | "Pomeriggio" | "Notte" | "Libero" }
let shifts = {};

// Stato mese corrente
let currentYear;
let currentMonth; // 0-11

// Tipi di turno in ciclo
const SHIFT_ORDER = ["", "Mattina", "Pomeriggio", "Notte", "Libero"];

// Elementi DOM
const monthNameEl = document.getElementById("month-name");
const yearNumberEl = document.getElementById("year-number");
const calendarGridEl = document.getElementById("calendar-grid");
const monthSummaryEl = document.getElementById("month-summary");

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
  const firstWeekday = (firstDay.getDay() + 6) % 7; // converti: Lun=0 ... Dom=6
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const totalCells = 42; // 6 righe x 7 colonne

  const today = new Date();
  const todayStr = formatDateKey(today);

  // Riepilogo conteggio per mese
  const monthCounts = {
    Mattina: 0,
    Pomeriggio: 0,
    Notte: 0,
    Libero: 0
  };

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

      if (inCurrentMonth && monthCounts[shiftType] != null) {
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

  // Riepilogo mese
  monthSummaryEl.textContent =
    `Riepilogo mese: ` +
    `Mattina ${monthCounts.Mattina} • ` +
    `Pome ${monthCounts.Pomeriggio} • ` +
    `Notte ${monthCounts.Notte} • ` +
    `Libero ${monthCounts.Libero}`;
}

// Ruota i tipi di turno con il tocco

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
    default:
      return "";
  }
}

function applyShiftClass(cell, shiftType) {
  cell.classList.remove(
    "shift-mattina",
    "shift-pomeriggio",
    "shift-notte",
    "shift-libero"
  );
  if (shiftType === "Mattina") cell.classList.add("shift-mattina");
  if (shiftType === "Pomeriggio") cell.classList.add("shift-pomeriggio");
  if (shiftType === "Notte") cell.classList.add("shift-notte");
  if (shiftType === "Libero") cell.classList.add("shift-libero");
}
