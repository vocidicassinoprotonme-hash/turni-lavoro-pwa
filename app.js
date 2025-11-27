// =========================
// Turni di lavoro - app.js
// =========================

// ---- Costanti storage ----
const STORAGE_SHIFTS          = "turni_calendar_v1";
const STORAGE_TYPES           = "turni_shift_types_v1";
const STORAGE_NOTES           = "turni_notes_v1";
const STORAGE_RATE            = "turni_hourly_rate_v1";
const STORAGE_CONTRACT_HOURS  = "turni_contract_hours_v1";

// ---- Stato ----
let shifts = {};         // { "YYYY-MM-DD": "ID_TURNO" }
let notes = {};          // { "YYYY-MM-DD": { title, text } }
let shiftTypes = [];     // [{id, short, name, hours, color}]
let SHIFT_ORDER = [""];  // primo elemento = nessun turno

let currentYear;
let currentMonth;
let currentNoteDate = null;
let currentCalendarHours = 0;

// Iconcine per i turni
const SHIFT_ICONS = {
    MATT: "🌅",
    POME: "🌇",
    NOTTE: "🌃",
    LIB: "🛋️",
    FER: "🏖️",
    MUT: "💊",
    PAR: "📘",
    PS: "⚕️",
    CIGO: "🏭"
};

function getShiftIcon(id) {
    return SHIFT_ICONS[id] || "";
}

// ---- Riferimenti DOM ----
const tabCalBtn          = document.getElementById("tab-cal");
const tabSetBtn          = document.getElementById("tab-settings");
const pageCal            = document.getElementById("page-calendario");
const pageSettings       = document.getElementById("page-settings");

const monthNameEl        = document.getElementById("month-name");
const yearNumberEl       = document.getElementById("year-number");
const calendarGridEl     = document.getElementById("calendar-grid");
const prevMonthBtn       = document.getElementById("prev-month");
const nextMonthBtn       = document.getElementById("next-month");

const weekForm           = document.getElementById("week-form");
const weekStartEl        = document.getElementById("week-start");
const weekEndEl          = document.getElementById("week-end");
const weekShiftEl        = document.getElementById("week-shift");

const hoursSummaryEl     = document.getElementById("hours-summary");
const chartCanvas        = document.getElementById("month-chart");

const shiftTypesListEl   = document.getElementById("shift-types-list");
const shiftTypeForm      = document.getElementById("shift-type-form");
const shiftShortEl       = document.getElementById("shift-short");
const shiftNameEl        = document.getElementById("shift-name");
const shiftHoursEl       = document.getElementById("shift-hours");
const shiftColorEl       = document.getElementById("shift-color");

const exportBtn          = document.getElementById("export-json");
const importBtn          = document.getElementById("import-json-btn");
const importFileInput    = document.getElementById("import-json-file");
const printPdfBtn        = document.getElementById("print-pdf");

const hourlyRateEl       = document.getElementById("hourly-rate");
const contractHoursEl    = document.getElementById("contract-hours");
const bonusSecondEl      = document.getElementById("bonus-second");
const bonusThirdEl       = document.getElementById("bonus-third");
const deductionsEl       = document.getElementById("deductions-perc");
const manualHoursEl      = document.getElementById("manual-hours");
const calendarHoursInfoEl= document.getElementById("calendar-hours-info");
const calcPayBtn         = document.getElementById("calc-pay");
const payResultEl        = document.getElementById("pay-result");

// Popup note
const notePopup          = document.getElementById("note-popup");
const noteTitleEl        = document.getElementById("note-title");
const noteTextEl         = document.getElementById("note-text");
const popupCancelBtn     = document.getElementById("popup-cancel");
const popupDeleteBtn     = document.getElementById("popup-delete");
const popupSaveBtn       = document.getElementById("popup-save");

// ======================
// Inizializzazione
// ======================
document.addEventListener("DOMContentLoaded", () => {
    // Tabs
    if (tabCalBtn && tabSetBtn && pageCal && pageSettings) {
        tabCalBtn.addEventListener("click", () => switchPage("cal"));
        tabSetBtn.addEventListener("click", () => switchPage("settings"));
    }

    // Pulsanti mese
    if (prevMonthBtn) prevMonthBtn.addEventListener("click", () => changeMonth(-1));
    if (nextMonthBtn) nextMonthBtn.addEventListener("click", () => changeMonth(1));

    // Carica dati da localStorage
    loadShiftTypes();
    buildShiftOrder();
    loadShifts();
    loadNotes();
    loadRate();
    loadContractHours();

    // Data iniziale = oggi
    const today = new Date();
    currentYear  = today.getFullYear();
    currentMonth = today.getMonth();

    if (weekStartEl) {
        weekStartEl.value = formatDateKey(today);
    }
    if (weekEndEl) {
        const end = new Date(today);
        end.setDate(today.getDate() + 6);
        weekEndEl.value = formatDateKey(end);
    }

    if (weekForm) {
        weekForm.addEventListener("submit", (e) => {
            e.preventDefault();
            applyWeekShifts();
        });
    }

    if (shiftTypeForm) {
        shiftTypeForm.addEventListener("submit", (e) => {
            e.preventDefault();
            addNewShiftType();
        });
    }

    if (exportBtn)  exportBtn.addEventListener("click", exportBackup);
    if (importBtn)  importBtn.addEventListener("click", () => importFileInput && importFileInput.click());
    if (importFileInput) importFileInput.addEventListener("change", importBackup);
    if (printPdfBtn) printPdfBtn.addEventListener("click", printPdf);

    if (calcPayBtn) calcPayBtn.addEventListener("click", calcPay);

    if (popupCancelBtn) popupCancelBtn.addEventListener("click", closeNotePopup);
    if (popupDeleteBtn) popupDeleteBtn.addEventListener("click", deleteNoteFromPopup);
    if (popupSaveBtn)   popupSaveBtn.addEventListener("click", saveNoteFromPopup);

    renderShiftTypes();
    populateWeekShiftSelect();
    renderCalendar();
});

// ======================
// Tabs
// ======================
function switchPage(which) {
    if (!pageCal || !pageSettings || !tabCalBtn || !tabSetBtn) return;

    if (which === "cal") {
        pageCal.style.display = "";
        pageSettings.style.display = "none";
        tabCalBtn.classList.add("active");
        tabSetBtn.classList.remove("active");
    } else {
        pageCal.style.display = "none";
        pageSettings.style.display = "";
        tabSetBtn.classList.add("active");
        tabCalBtn.classList.remove("active");
    }
}

// ======================
// Turni disponibili
// ======================
function getDefaultShiftTypes() {
    return [
        { id: "MATT",  short: "Matt",   name: "Mattina",    hours: "06:00-14:00", color: "#f97373" },
        { id: "POME",  short: "Pome",   name: "Pomeriggio", hours: "14:00-22:00", color: "#fb923c" },
        { id: "NOTTE", short: "Notte",  name: "Notte",      hours: "22:00-06:00", color: "#6366f1" },
        { id: "LIB",   short: "Libero", name: "Riposo",     hours: "",            color: "#22c55e" },
        { id: "FER",   short: "Ferie",  name: "Ferie",      hours: "",            color: "#e879f9" },
        { id: "MUT",   short: "Mutua",  name: "Mutua",      hours: "",            color: "#38bdf8" },
        { id: "PAR",   short: "PAR",    name: "PAR",        hours: "",            color: "#a5b4fc" },
        { id: "PS",    short: "P.S.",   name: "P.S.",       hours: "",            color: "#4ade80" },
        { id: "CIGO",  short: "Cigo",   name: "Cigo",       hours: "08:00-16:00", color: "#1d4ed8" }
    ];
}

function loadShiftTypes() {
    try {
        const raw = localStorage.getItem(STORAGE_TYPES);
        if (!raw) {
            shiftTypes = getDefaultShiftTypes();
            saveShiftTypes();
        } else {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr.length > 0) {
                shiftTypes = arr;
            } else {
                shiftTypes = getDefaultShiftTypes();
                saveShiftTypes();
            }
        }
    } catch {
        shiftTypes = getDefaultShiftTypes();
        saveShiftTypes();
    }
}

function saveShiftTypes() {
    localStorage.setItem(STORAGE_TYPES, JSON.stringify(shiftTypes));
}

function buildShiftOrder() {
    SHIFT_ORDER = [""].concat(shiftTypes.map(t => t.id));
}

function findShiftType(id) {
    return shiftTypes.find(t => t.id === id);
}

function renderShiftTypes() {
    if (!shiftTypesListEl) return;
    shiftTypesListEl.innerHTML = "";
    shiftTypes.forEach(t => {
        const row = document.createElement("div");
        row.className = "shift-type-row";

        const badge = document.createElement("span");
        badge.className = "shift-badge";
        badge.style.backgroundColor = t.color || "#888";
        badge.textContent = (getShiftIcon(t.id) + " " + (t.short || t.id)).trim();

        const txt = document.createElement("span");
        txt.textContent = t.name + (t.hours ? " (" + t.hours + ")" : "");

        row.appendChild(badge);
        row.appendChild(txt);
        shiftTypesListEl.appendChild(row);
    });
}

function addNewShiftType() {
    if (!shiftShortEl || !shiftNameEl || !shiftHoursEl || !shiftColorEl) return;

    const short = (shiftShortEl.value || "").trim();
    const name  = (shiftNameEl.value  || "").trim();
    const hours = (shiftHoursEl.value || "").trim();
    const color = shiftColorEl.value || "#f97373";

    if (!short || !name) {
        alert("Inserisci almeno sigla e nome del turno.");
        return;
    }

    let id = short.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!id) id = "T" + Math.random().toString(16).slice(2, 6).toUpperCase();
    if (shiftTypes.some(t => t.id === id)) {
        alert("Esiste già un turno con questa sigla.");
        return;
    }

    shiftTypes.push({ id, short, name, hours, color });
    saveShiftTypes();
    buildShiftOrder();
    renderShiftTypes();
    populateWeekShiftSelect();
    renderCalendar();

    shiftShortEl.value = "";
    shiftNameEl.value  = "";
    shiftHoursEl.value = "";
    shiftColorEl.value = "#f97373";
}

function populateWeekShiftSelect() {
    if (!weekShiftEl) return;
    weekShiftEl.innerHTML = "";
    shiftTypes.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = `${t.short} – ${t.name}`;
        weekShiftEl.appendChild(opt);
    });
}

// ======================
// Shifts & Notes storage
// ======================
function loadShifts() {
    try {
        const raw = localStorage.getItem(STORAGE_SHIFTS);
        shifts = raw ? JSON.parse(raw) || {} : {};
    } catch {
        shifts = {};
    }
}

function saveShifts() {
    localStorage.setItem(STORAGE_SHIFTS, JSON.stringify(shifts));
}

function loadNotes() {
    try {
        const raw = localStorage.getItem(STORAGE_NOTES);
        notes = raw ? JSON.parse(raw) || {} : {};
    } catch {
        notes = {};
    }
}

function saveNotes() {
    localStorage.setItem(STORAGE_NOTES, JSON.stringify(notes));
}

// ======================
// Calendario
// ======================
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
    if (!calendarGridEl || !monthNameEl || !yearNumberEl) return;

    const monthNames = [
        "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
        "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
    ];

    monthNameEl.textContent  = monthNames[currentMonth];
    yearNumberEl.textContent = currentYear;

    calendarGridEl.innerHTML = "";

    const firstDay      = new Date(currentYear, currentMonth, 1);
    const firstWeekday  = (firstDay.getDay() + 6) % 7; // lun=0
    const daysInMonth   = new Date(currentYear, currentMonth + 1, 0).getDate();
    const todayStr      = formatDateKey(new Date());
    const totalCells    = firstWeekday + daysInMonth;

    for (let i = 0; i < totalCells; i++) {
        if (i < firstWeekday) {
            const empty = document.createElement("div");
            empty.className = "day";
            empty.style.visibility = "hidden";
            calendarGridEl.appendChild(empty);
            continue;
        }

        const dayNum = i - firstWeekday + 1;
        const dateObj = new Date(currentYear, currentMonth, dayNum);
        const dateKey = formatDateKey(dateObj);

        const cell = document.createElement("div");
        cell.className = "day";

        const numberEl = document.createElement("div");
        numberEl.className = "number";
        numberEl.textContent = dayNum;

        if (dateKey === todayStr) {
            numberEl.style.border = "1px solid #1b77e6";
            numberEl.style.borderRadius = "8px";
            numberEl.style.padding = "0 4px";
        }

        const shiftId = shifts[dateKey];
        const type    = shiftId ? findShiftType(shiftId) : null;

        if (type) {
            const badge = document.createElement("div");
            badge.className = "shift-badge";
            badge.style.backgroundColor = type.color || "#888";
            badge.textContent = `${getShiftIcon(type.id)} ${type.short || type.id}`;
            cell.appendChild(badge);
        }

        const noteInfo = notes[dateKey];
        if (noteInfo && noteInfo.title) {
            const tEl = document.createElement("div");
            tEl.className = "title";
            tEl.textContent = noteInfo.title;
            cell.appendChild(tEl);
        }

        const noteBtn = document.createElement("div");
            noteBtn.className = "note-btn";
            noteBtn.textContent = "📝";
            noteBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                openNotePopup(dateKey);
            });

        cell.addEventListener("click", () => {
            cycleShift(dateKey);
        });

        cell.appendChild(numberEl);
        cell.appendChild(noteBtn);
        calendarGridEl.appendChild(cell);
    }

    // ---- riepilogo & grafico ----
    const stats = getMonthStats(currentYear, currentMonth);

    if (!hoursSummaryEl) return;

    if (!stats.entries.length) {
        hoursSummaryEl.textContent = "Nessun turno assegnato per questo mese.";
        drawMonthChart({ entries: [], totalHours: 0, perId: {} });
        updateHoursForPay(0);
    } else {
        let workingDays = 0;
        let restDays    = 0;
        for (const id in stats.perId) {
            const item = stats.perId[id];
            if (!item) continue;
            if (item.hours > 0) workingDays += item.days;
            else restDays += item.days;
        }

        const rate       = parseFloat((hourlyRateEl && hourlyRateEl.value || "").replace(",", ".")) || 0;
        const totalHours = stats.totalHours;
        const basePay    = rate > 0 ? totalHours * rate : 0;

        const line1 =
            `Totale mese: ${totalHours.toFixed(1)} h • ` +
            `${workingDays} gg lavorati, ${restDays} gg riposo` +
            (rate > 0 ? ` • Stima compenso base: € ${basePay.toFixed(2)}` : "");

        const dettaglio = stats.entries.map(e => {
            const icon = getShiftIcon(e.id);
            return `${icon ? icon + " " : ""}${e.label}: ${e.hours.toFixed(1)} h (${e.days} gg)`;
        }).join("\n");

        hoursSummaryEl.textContent = line1 + "\n" + dettaglio;

        drawMonthChart(stats);
        updateHoursForPay(totalHours);
    }
}

function cycleShift(dateKey) {
    const current = shifts[dateKey] || "";
    const idx     = SHIFT_ORDER.indexOf(current);
    const nextId  = SHIFT_ORDER[(idx + 1) % SHIFT_ORDER.length];

    if (!nextId) delete shifts[dateKey];
    else shifts[dateKey] = nextId;

    saveShifts();
    renderCalendar();
}

// ======================
// Note - popup
// ======================
function openNotePopup(dateKey) {
    if (!notePopup || !noteTitleEl || !noteTextEl) return;
    currentNoteDate = dateKey;
    const info = notes[dateKey];

    noteTitleEl.value = info && info.title ? info.title : "";
    noteTextEl.value  = info && info.text  ? info.text  : "";

    notePopup.classList.remove("hidden");
}

function closeNotePopup() {
    if (!notePopup) return;
    notePopup.classList.add("hidden");
    currentNoteDate = null;
}

function saveNoteFromPopup() {
    if (!currentNoteDate || !noteTitleEl || !noteTextEl) return;
    const title = (noteTitleEl.value || "").trim();
    const text  = (noteTextEl.value  || "").trim();

    if (!title && !text) delete notes[currentNoteDate];
    else notes[currentNoteDate] = { title, text };

    saveNotes();
    closeNotePopup();
    renderCalendar();
}

function deleteNoteFromPopup() {
    if (!currentNoteDate) return;
    delete notes[currentNoteDate];
    saveNotes();
    closeNotePopup();
    renderCalendar();
}

// ======================
// Inserimento multiplo
// ======================
function applyWeekShifts() {
    if (!weekStartEl || !weekShiftEl) return;

    const startStr = weekStartEl.value;
    let   endStr   = weekEndEl && weekEndEl.value;
    const shiftId  = weekShiftEl.value;

    if (!startStr || !shiftId) {
        alert("Seleziona data di inizio e tipo turno.");
        return;
    }

    const startDate = new Date(startStr);
    let endDate;

    if (endStr) {
        endDate = new Date(endStr);
    } else {
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        if (weekEndEl) weekEndEl.value = formatDateKey(endDate);
    }

    if (endDate < startDate) {
        alert("La data fine non può essere precedente alla data inizio.");
        return;
    }

    const diffMs   = endDate - startDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > 40) {
        alert("Il periodo è troppo lungo (max circa 40 giorni).");
        return;
    }

    const d = new Date(startDate);
    while (d <= endDate) {
        const key = formatDateKey(d);
        shifts[key] = shiftId;
        d.setDate(d.getDate() + 1);
    }

    saveShifts();
    renderCalendar();
}

// ======================
// Backup & PDF
// ======================
function exportBackup() {
    const data = { shifts, shiftTypes, notes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "turni-backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function importBackup() {
    if (!importFileInput || !importFileInput.files || !importFileInput.files[0]) return;
    const file = importFileInput.files[0];

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.shifts)     shifts     = data.shifts;
            if (data.shiftTypes) shiftTypes = data.shiftTypes;
            if (data.notes)      notes      = data.notes;

            saveShifts();
            saveShiftTypes();
            saveNotes();
            buildShiftOrder();
            renderShiftTypes();
            populateWeekShiftSelect();
            renderCalendar();
            alert("Backup importato correttamente.");
        } catch {
            alert("File di backup non valido.");
        }
    };
    reader.readAsText(file);
}

function printPdf() {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const mm          = String(currentMonth + 1).padStart(2, "0");
    const labelMese   = `${mm}/${currentYear}`;

    let rows = "";
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj  = new Date(currentYear, currentMonth, d);
        const key      = formatDateKey(dateObj);
        const shiftId  = shifts[key];
        const type     = shiftId ? findShiftType(shiftId) : null;
        const name     = type ? type.name : "";
        const hoursStr = type ? (type.hours || "") : "";
        const noteInfo = notes[key];
        const nota     = noteInfo && noteInfo.title ? noteInfo.title : "";

        rows += `
        <tr>
            <td style="border:1px solid #ccc;padding:4px;">${d}</td>
            <td style="border:1px solid #ccc;padding:4px;">${key}</td>
            <td style="border:1px solid #ccc;padding:4px;">${name}</td>
            <td style="border:1px solid #ccc;padding:4px;">${hoursStr}</td>
            <td style="border:1px solid #ccc;padding:4px;">${nota}</td>
        </tr>`;
    }

    const w = window.open("", "_blank");
    if (!w) return;

    w.document.write(`
        <html>
        <head><meta charset="UTF-8"><title>Turni ${labelMese}</title></head>
        <body>
            <h2>Turni di lavoro - ${labelMese}</h2>
            <table style="border-collapse:collapse;font-family:sans-serif;font-size:12px;">
                <thead>
                    <tr>
                        <th style="border:1px solid #ccc;padding:4px;">Giorno</th>
                        <th style="border:1px solid #ccc;padding:4px;">Data</th>
                        <th style="border:1px solid #ccc;padding:4px;">Turno</th>
                        <th style="border:1px solid #ccc;padding:4px;">Orario</th>
                        <th style="border:1px solid #ccc;padding:4px;">Nota</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <script>window.print();</script>
        </body>
        </html>
    `);
    w.document.close();
}

// ======================
// Statistiche & grafico
// ======================
function parseHoursToDecimal(str) {
    if (!str) return 0;
    const m = str.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!m) return 0;
    const start = parseInt(m[1]) * 60 + parseInt(m[2]);
    let   end   = parseInt(m[3]) * 60 + parseInt(m[4]);
    if (end <= start) end += 24 * 60; // passa mezzanotte
    return (end - start) / 60;
}

function getMonthStats(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const perType = {};
    let totalHours = 0;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const key     = formatDateKey(dateObj);
        const shiftId = shifts[key];
        if (!shiftId) continue;
        const type = findShiftType(shiftId);
        if (!type) continue;

        const h = parseHoursToDecimal(type.hours);
        if (!perType[shiftId]) perType[shiftId] = { type, days: 0, hours: 0 };
        perType[shiftId].days++;
        perType[shiftId].hours += h;
        totalHours += h;
    }

    const entries = Object.values(perType).map(e => ({
        id:    e.type.id,
        label: e.type.short || e.type.name,
        color: e.type.color || "#888",
        days:  e.days,
        hours: e.hours
    }));

    return { entries, totalHours, perId: perType };
}

function drawMonthChart(stats) {
    if (!chartCanvas || !chartCanvas.getContext) return;

    const parentWidth = chartCanvas.parentElement ?
        chartCanvas.parentElement.clientWidth : 360;

    chartCanvas.width  = parentWidth;
    chartCanvas.height = 180;

    const ctx = chartCanvas.getContext("2d");
    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

    const entries = stats.entries || [];
    if (!entries.length) return;

    const w = chartCanvas.width;
    const h = chartCanvas.height;
    const padding = 24;
    const barWidth = (w - padding * 2) / entries.length;
    const maxHours = Math.max(...entries.map(e => e.hours), 1);
    const usableH  = h - padding * 2 - 10;

    entries.forEach((e, i) => {
        const bw = barWidth * 0.8;
        const x  = padding + i * barWidth + barWidth * 0.1;
        let barH = (e.hours / maxHours) * usableH;
        if (e.hours === 0) barH = 4; // piccolo segno per riposo
        const y  = h - padding - barH;

        ctx.fillStyle = e.color;
        ctx.beginPath();
        const radius = 6;
        ctx.moveTo(x, y + barH);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.lineTo(x + bw - radius, y);
        ctx.quadraticCurveTo(x + bw, y, x + bw, y + radius);
        ctx.lineTo(x + bw, y + barH);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#111827";
        ctx.font = "10px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(e.label, x + bw / 2, h - 6);
    });
}

// ======================
// Calcolo paga
// ======================
function loadRate() {
    if (!hourlyRateEl) return;
    const saved = localStorage.getItem(STORAGE_RATE);
    hourlyRateEl.value = (saved !== null && saved !== "") ? saved : "12,99";
}

function saveRate() {
    if (!hourlyRateEl) return;
    localStorage.setItem(STORAGE_RATE, hourlyRateEl.value || "");
}

function loadContractHours() {
    if (!contractHoursEl) return;
    const saved = localStorage.getItem(STORAGE_CONTRACT_HOURS);
    contractHoursEl.value = (saved !== null && saved !== "") ? saved : "173";
}

function saveContractHours() {
    if (!contractHoursEl) return;
    localStorage.setItem(STORAGE_CONTRACT_HOURS, contractHoursEl.value || "");
}

function updateHoursForPay(hours) {
    currentCalendarHours = hours || 0;
    if (calendarHoursInfoEl) {
        calendarHoursInfoEl.textContent =
            `Ore mese dal calendario: ${currentCalendarHours.toFixed(1)} h`;
    }
}

/*
 Stima:
 - base (Matt, Fer, Mut, Par, Ps, Cigo) = 100%
 - Pome = base + maggiorazione 2° turno
 - Notte = base + maggiorazione 3° turno
 - Libero = 0 €
*/
function calcPay() {
    // servono almeno retribuzione oraria e box di output
    if (!hourlyRateEl || !payResultEl) return;

    saveRate();
    if (contractHoursEl) saveContractHours();

    const rate = parseFloat((hourlyRateEl.value || "").replace(",", "."));
    if (isNaN(rate) || rate <= 0) {
        payResultEl.textContent = "Inserisci una retribuzione oraria valida.";
        return;
    }

    const manual = manualHoursEl
        ? parseFloat((manualHoursEl.value || "").replace(",", ".")) : NaN;

    let contractH = 0;
    if (contractHoursEl && contractHoursEl.value) {
        contractH = parseFloat((contractHoursEl.value || "").replace(",", "."));
    }

    const bonus2 = bonusSecondEl
        ? parseFloat((bonusSecondEl.value || "").replace(",", ".")) || 0 : 0;
    const bonus3 = bonusThirdEl
        ? parseFloat((bonusThirdEl.value || "").replace(",", ".")) || 0 : 0;
    const dedPerc = deductionsEl
        ? parseFloat((deductionsEl.value || "").replace(",", ".")) || 0 : 0;

    const calendarH = currentCalendarHours || 0;

    const stats = getMonthStats(currentYear, currentMonth);
    const perId = stats.perId || {};

    const hMatt  = perId.MATT  ? perId.MATT.hours  : 0;
    const hPome  = perId.POME  ? perId.POME.hours  : 0;
    const hNotte = perId.NOTTE ? perId.NOTTE.hours : 0;
    const hLib   = perId.LIB   ? perId.LIB.hours   : 0;
    const hFer   = perId.FER   ? perId.FER.hours   : 0;
    const hMut   = perId.MUT   ? perId.MUT.hours   : 0;
    const hPar   = perId.PAR   ? perId.PAR.hours   : 0;
    const hPs    = perId.PS    ? perId.PS.hours    : 0;
    const hCigo  = perId.CIGO  ? perId.CIGO.hours  : 0;

    const baseHours = hMatt + hFer + hMut + hPar + hPs + hCigo;
    const baseGross = baseHours * rate;
    const secondGross = hPome * rate * (1 + bonus2 / 100);
    const thirdGross  = hNotte * rate * (1 + bonus3 / 100);
    const restGross   = hLib * 0;

    const totalGrossCalendar = baseGross + secondGross + thirdGross + restGross;

    // ore di riferimento per il cedolino
    let baseHoursForCedolino;
    let descrHoursBase;

    if (!isNaN(manual) && manual > 0) {
        baseHoursForCedolino = manual;
        descrHoursBase = "Ore manuali inserite";
    } else if (!isNaN(contractH) && contractH > 0) {
        baseHoursForCedolino = contractH;
        descrHoursBase = "Ore contrattuali mese";
    } else {
        baseHoursForCedolino = calendarH;
        descrHoursBase = "Ore da calendario";
    }

    const grossCedolino = baseHoursForCedolino * rate;
    const netCedolino   = grossCedolino * (1 - dedPerc / 100);
    const netCalendar   = totalGrossCalendar * (1 - dedPerc / 100);
    const diffNet       = netCalendar - netCedolino;

    payResultEl.textContent =
        `${descrHoursBase}: ${baseHoursForCedolino.toFixed(1)} h • ` +
        `Lordo base: € ${grossCedolino.toFixed(2)} • Netto base (≈${(100 - dedPerc).toFixed(1)}%): € ${netCedolino.toFixed(2)}\n` +
        `Stima su turni del calendario: lordo ≈ € ${totalGrossCalendar.toFixed(2)} • netto ≈ € ${netCalendar.toFixed(2)} ` +
        `(differenza vs base: ${diffNet >= 0 ? "+" : ""}€${diffNet.toFixed(2)})\n` +
        `Dettaglio (lordo mese): Matt/Ferie/Mutua/Par/P.S./Cigo ≈ € ${baseGross.toFixed(2)} • 2° turno ≈ € ${secondGross.toFixed(2)} • 3° turno ≈ € ${thirdGross.toFixed(2)} • Riposi: € 0`;
}

// ======================
// Utility
// ======================
function formatDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
