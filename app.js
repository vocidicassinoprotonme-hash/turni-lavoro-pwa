// Chiave per il localStorage
const STORAGE_KEY = "turni_lavoro_lista_v1";

let shifts = [];

// Elementi del DOM
const form = document.getElementById("shift-form");
const inputId = document.getElementById("shift-id");
const inputDate = document.getElementById("date");
const inputStart = document.getElementById("start");
const inputEnd = document.getElementById("end");
const selectType = document.getElementById("type");
const inputNotes = document.getElementById("notes");
const listEl = document.getElementById("shifts-list");
const emptyMessageEl = document.getElementById("empty-message");
const resetBtn = document.getElementById("reset-btn");
const clearAllBtn = document.getElementById("clear-all");

// Inizializza
document.addEventListener("DOMContentLoaded", () => {
  // Data di oggi nel form
  const today = new Date();
  inputDate.value = formatDateForInput(today);

  loadShifts();
  renderShifts();

  // Registra service worker (PWA)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((err) => console.error("SW registration failed:", err));
  }
});

// Gestione invio form
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const date = inputDate.value;
  const start = inputStart.value;
  const end = inputEnd.value;
  const type = selectType.value;
  const notes = inputNotes.value.trim();
  const id = inputId.value || null;

  if (!date || !start || !end) {
    alert("Compila almeno data, ora inizio e ora fine.");
    return;
  }

  const shiftData = {
    id: id || crypto.randomUUID(),
    date,
    start,
    end,
    type,
    notes,
  };

  if (id) {
    // Modifica esistente
    const index = shifts.findIndex((s) => s.id === id);
    if (index !== -1) {
      shifts[index] = shiftData;
    }
  } else {
    // Nuovo turno
    shifts.push(shiftData);
  }

  saveShifts();
  renderShifts();
  clearForm();
});

// Tasto "Pulisci"
resetBtn.addEventListener("click", () => {
  clearForm();
});

// Tasto "Cancella tutti"
clearAllBtn.addEventListener("click", () => {
  if (shifts.length === 0) return;
  const conferma = confirm(
    "Vuoi davvero cancellare tutti i turni salvati su questo dispositivo?"
  );
  if (!conferma) return;

  shifts = [];
  saveShifts();
  renderShifts();
  clearForm();
});

// Funzioni principali
function loadShifts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      shifts = [];
      return;
    }
    shifts = JSON.parse(raw) || [];
  } catch (err) {
    console.error("Errore nel caricamento dei turni:", err);
    shifts = [];
  }
}

function saveShifts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts));
  } catch (err) {
    console.error("Errore nel salvataggio dei turni:", err);
  }
}

function renderShifts() {
  listEl.innerHTML = "";

  if (!shifts || shifts.length === 0) {
    emptyMessageEl.style.display = "block";
    return;
  }

  emptyMessageEl.style.display = "none";

  // Ordina per data e ora
  const sorted = [...shifts].sort((a, b) => {
    const dA = new Date(a.date + "T" + a.start);
    const dB = new Date(b.date + "T" + b.start);
    return dA - dB;
  });

  sorted.forEach((shift) => {
    const li = document.createElement("li");
    li.className = "shift-item";

    const header = document.createElement("div");
    header.className = "shift-header";

    const headerLeft = document.createElement("div");
    headerLeft.className = "shift-header-left";

    const dateEl = document.createElement("div");
    dateEl.className = "shift-date";
    dateEl.textContent = formatDateReadable(shift.date);

    const typeEl = document.createElement("div");
    typeEl.className = "shift-type";
    typeEl.textContent = shift.type;

    headerLeft.appendChild(dateEl);
    headerLeft.appendChild(typeEl);

    const timeEl = document.createElement("div");
    timeEl.className = "shift-time";
    timeEl.textContent = `${shift.start} - ${shift.end}`;

    header.appendChild(headerLeft);
    header.appendChild(timeEl);

    const notesEl = document.createElement("div");
    notesEl.className = "shift-notes";
    notesEl.textContent =
      shift.notes && shift.notes.length > 0
        ? shift.notes
        : "Nessuna nota";

    const actions = document.createElement("div");
    actions.className = "shift-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn secondary small";
    editBtn.textContent = "Modifica";
    editBtn.addEventListener("click", () => {
      fillFormForEdit(shift);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn danger small";
    deleteBtn.textContent = "Elimina";
    deleteBtn.addEventListener("click", () => {
      const conferma = confirm(
        "Vuoi eliminare questo turno?"
      );
      if (!conferma) return;

      shifts = shifts.filter((s) => s.id !== shift.id);
      saveShifts();
      renderShifts();
      clearForm();
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(header);
    li.appendChild(notesEl);
    li.appendChild(actions);

    listEl.appendChild(li);
  });
}

function clearForm() {
  inputId.value = "";
  inputStart.value = "";
  inputEnd.value = "";
  selectType.value = "Mattina";
  inputNotes.value = "";

  // Rimetti la data di oggi
  const today = new Date();
  inputDate.value = formatDateForInput(today);
}

function fillFormForEdit(shift) {
  inputId.value = shift.id;
  inputDate.value = shift.date;
  inputStart.value = shift.start;
  inputEnd.value = shift.end;
  selectType.value = shift.type;
  inputNotes.value = shift.notes || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Helper formati data
function formatDateForInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateReadable(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
