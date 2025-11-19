const STORAGE_KEY = "turni_lavoro";

let shifts = [];

const form = document.getElementById("shift-form");
const idField = document.getElementById("shift-id");
const dateField = document.getElementById("date");
const startField = document.getElementById("start");
const endField = document.getElementById("end");
const typeField = document.getElementById("type");
const notesField = document.getElementById("notes");

const listEl = document.getElementById("shifts-list");
const emptyMsg = document.getElementById("empty-message");

document.addEventListener("DOMContentLoaded", () => {
  load();
  render();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js");
  }
});

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const shift = {
    id: idField.value || crypto.randomUUID(),
    date: dateField.value,
    start: startField.value,
    end: endField.value,
    type: typeField.value,
    notes: notesField.value.trim()
  };

  const existingIndex = shifts.findIndex(s => s.id === shift.id);

  if (existingIndex >= 0) shifts[existingIndex] = shift;
  else shifts.push(shift);

  save();
  render();
  clearForm();
});

document.getElementById("reset-btn").onclick = clearForm;

document.getElementById("clear-all").onclick = () => {
  if (confirm("Cancellare tutti i turni?")) {
    shifts = [];
    save();
    render();
  }
};

function clearForm() {
  idField.value = "";
  dateField.value = "";
  startField.value = "";
  endField.value = "";
  typeField.value = "Mattina";
  notesField.value = "";
}

function load() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) shifts = JSON.parse(data);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts));
}

function render() {
  listEl.innerHTML = "";

  if (shifts.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }

  emptyMsg.style.display = "none";

  shifts
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .forEach(shift => {
      const li = document.createElement("li");
      li.className = "shift-item";

      li.innerHTML = `
        <strong>${formatDate(shift.date)}</strong><br>
        ${shift.type} — ${shift.start} → ${shift.end}<br>
        <em>${shift.notes || "Nessuna nota"}</em>
        <div style="margin-top:0.5rem; display:flex; gap:0.5rem;">
          <button class="btn secondary small" onclick='edit("${shift.id}")'>Modifica</button>
          <button class="btn danger small" onclick='remove("${shift.id}")'>Elimina</button>
        </div>
      `;

      listEl.appendChild(li);
    });
}

function edit(id) {
  const shift = shifts.find(s => s.id === id);
  idField.value = shift.id;
  dateField.value = shift.date;
  startField.value = shift.start;
  endField.value = shift.end;
  typeField.value = shift.type;
  notesField.value = shift.notes;
  scrollTo({ top: 0, behavior: "smooth" });
}

function remove(id) {
  shifts = shifts.filter(s => s.id !== id);
  save();
  render();
}

function formatDate(str) {
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}
