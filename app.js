"use strict";

const KEY_SETTINGS = "rvcc.settings.v1";
const KEY_TASKS = "rvcc.tasks.v1";
const ZONE = "America/Santiago";
const SOURCE_KEYS = ["matrix", "training", "clinical", "finance"];
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email"
].join(" ");
const $ = (id) => document.getElementById(id);
const defaults = () => ({ clientId: "", allowedEmail: "", sources: Object.fromEntries(SOURCE_KEYS.map(k => [k, { url: "", range: "A1:T150" }])) });
const loadJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
let config = defaults();
let tasks = [];
let accessToken = null;
let email = "";
let events = [];
let calendarAvailable = null;
let sheetStats = {};
let oauthClient = null;
let lastUpdated = null;
let toastTimer;

function safeSettings(raw) {
  const result = defaults();
  if (!raw || typeof raw !== "object") return result;
  result.clientId = typeof raw.clientId === "string" ? raw.clientId : "";
  result.allowedEmail = typeof raw.allowedEmail === "string" ? raw.allowedEmail : "";
  for (const key of SOURCE_KEYS) {
    const source = raw.sources?.[key] || {};
    result.sources[key] = {
      url: typeof source.url === "string" ? source.url : "",
      range: typeof source.range === "string" ? source.range : "A1:T150"
    };
  }
  return result;
}
config = safeSettings(loadJson(KEY_SETTINGS, null));
const rawTasks = loadJson(KEY_TASKS, []);
tasks = Array.isArray(rawTasks) ? rawTasks.filter(x => x && typeof x.text === "string" && x.text.length <= 140).slice(0, 100).map(x => ({ id: String(x.id || ""), text: x.text, done: x.done === true })) : [];

function save(key, object) { try { localStorage.setItem(key, JSON.stringify(object)); return true; } catch { toast("El navegador no permitió guardar. Revisa el modo privado o el almacenamiento."); return false; } }
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 6500);
}
function formatDate(date, options) { return new Intl.DateTimeFormat("es-CL", { timeZone: ZONE, ...options }).format(date); }
function tick() {
  const now = new Date();
  $("current-date").textContent = formatDate(now, { weekday: "long", day: "numeric", month: "long" });
  $("current-time").textContent = formatDate(now, { hour: "2-digit", minute: "2-digit" });
}
tick();
setInterval(tick, 30000);

function idFromUrl(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== "docs.google.com") return null;
    const match = url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/);
    return match?.[1] || null;
  } catch { return null; }
}
function isValidRange(value) {
  return /^(?:(?:'[^']+'|[A-Za-z0-9_. -]+)!)?[A-Za-z]{1,3}[1-9][0-9]*:[A-Za-z]{1,3}[1-9][0-9]*$/.test(value);
}
function renderLinks() {
  for (const key of SOURCE_KEYS) {
    const source = config.sources[key];
    const link = $(key + "-link");
    const valid = idFromUrl(source.url);
    link.href = valid ? source.url : "https://sheets.google.com/";
    link.textContent = valid ? "Abrir hoja privada ↗" : "Elegir hoja ↗";
    const stat = sheetStats[key];
    if (stat?.ok) {
      $(key + "-metric").textContent = stat.count + " filas";
      $(key + "-meta").textContent = "Leídas en rango · " + stat.range;
    } else if (stat?.error) {
      $(key + "-metric").textContent = "Sin lectura";
      $(key + "-meta").textContent = stat.error;
    } else {
      $(key + "-metric").textContent = valid ? "Enlace listo" : "Sin vincular";
      $(key + "-meta").textContent = valid ? "Autoriza Google para leer métricas" : "Configura la URL privada";
    }
  }
}
function renderTasks() {
  const list = $("tasks-list");
  list.replaceChildren();
  const open = tasks.filter(t => !t.done).length;
  $("task-count").textContent = open + (open === 1 ? " abierta" : " abiertas");
  if (!tasks.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Sin tareas registradas en este dispositivo.";
    list.appendChild(li);
  }
  for (const task of tasks) {
    const li = document.createElement("li");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = task.done;
    check.setAttribute("aria-label", "Marcar como completada: " + task.text);
    check.addEventListener("change", () => {
      task.done = check.checked;
      save(KEY_TASKS, tasks);
      renderTasks();
      renderPriority();
    });
    const span = document.createElement("span");
    span.className = "task-text" + (task.done ? " done" : "");
    span.textContent = task.text;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "✕";
    remove.title = "Eliminar";
    remove.setAttribute("aria-label", "Eliminar acción");
    remove.addEventListener("click", () => {
      tasks = tasks.filter(t => t !== task);
      save(KEY_TASKS, tasks);
      renderTasks();
      renderPriority();
    });
    li.append(check, span, remove);
    list.appendChild(li);
  }
}
function eventStart(item) {
  const value = item?.start?.dateTime || item?.start?.date;
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}
function renderPriority() {
  const now = Date.now();
  const next = events.filter(e => eventStart(e) && eventStart(e).getTime() >= now).sort((a, b) => eventStart(a) - eventStart(b))[0];
  const nextDate = next ? eventStart(next) : null;
  $("next-event").textContent = calendarAvailable === false && accessToken ? "Calendar no disponible" : nextDate ? formatDate(nextDate, { weekday: "short", hour: "2-digit", minute: "2-digit" }) : (accessToken ? "Sin eventos próximos" : "No verificado");
  $("event-detail").textContent = accessToken
    ? (calendarAvailable === false ? "No se pudo consultar Calendar. Verifica permisos de Google." : nextDate ? "Próximo bloque de agenda. Ocultamos los títulos por privacidad." : "Sin próximos eventos en la ventana de consulta.")
    : "Autoriza Google para consultar tu agenda sin mostrar nombres de pacientes.";
  const task = tasks.find(t => !t.done);
  let heading = "Abrir tus sistemas";
  let detail = "Tus enlaces privados están disponibles.";
  let action = "Ver mis sistemas ↓";
  let kind = "systems";
  const hours = nextDate ? (nextDate.getTime() - now) / 3600000 : Infinity;
  if (hours >= 0 && hours < 2) {
    heading = "Preparar próximo compromiso";
    detail = "Tienes un bloque de agenda en menos de dos horas. Confirma lo necesario directamente en Calendar.";
    action = "Abrir Calendar ↗";
    kind = "calendar";
  } else if (task) {
    heading = task.text;
    detail = "Primera acción pendiente registrada en este navegador.";
    action = "Ver acciones ↓";
    kind = "tasks";
  } else if (SOURCE_KEYS.some(k => !idFromUrl(config.sources[k].url))) {
    heading = "Vincular tus hojas";
    detail = "Añade las URL de tus cuatro sistemas. No necesitas hacer públicas las hojas.";
    action = "Configurar fuentes ↗";
    kind = "settings";
  } else if (!accessToken && config.clientId) {
    heading = "Autorizar lectura con Google";
    detail = "Los enlaces ya funcionan. Inicia sesión para consultar el estado de tus hojas.";
    action = "Conectar Google ↗";
    kind = "connect";
  }
  $("next-action").textContent = heading;
  $("next-detail").textContent = detail;
  $("action-button").textContent = action;
  $("action-button").dataset.action = kind;
  $("system-state").textContent = accessToken ? "Google conectado" : "Modo enlaces";
  $("system-detail").textContent = accessToken
    ? ("Cuenta: " + (email || "autorizada") + ". Permisos de solo lectura.")
    : "Sin conexión OAuth; tus hojas continúan protegidas por Google.";
  $("google-status").textContent = accessToken ? "● Google conectado" : "● Sin conexión Google";
  $("google-status").classList.toggle("connected", !!accessToken);
  $("connect").hidden = !!accessToken;
  $("refresh").hidden = !accessToken;
  $("disconnect").hidden = !accessToken;
  $("footer-state").textContent = accessToken ? "Google autorizado · lectura temporal" : "Modo enlaces · sin acceso a datos";
  $("last-update").textContent = lastUpdated ? "Última lectura: " + formatDate(lastUpdated, { hour: "2-digit", minute: "2-digit" }) : "Sin sincronización";
}
function fillSettings() {
  $("oauth-client-id").value = config.clientId;
  $("allowed-email").value = config.allowedEmail;
  for (const key of SOURCE_KEYS) {
    $(key + "-url").value = config.sources[key].url;
    $(key + "-range").value = config.sources[key].range;
  }
}
function openSettings() {
  fillSettings();
  const dialog = $("settings-dialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}
function closeSettings() {
  const dialog = $("settings-dialog");
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}
function collectSettings() {
  const fresh = defaults();
  fresh.clientId = $("oauth-client-id").value.trim();
  fresh.allowedEmail = $("allowed-email").value.trim().toLowerCase();
  if (fresh.clientId && !/^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(fresh.clientId))
    throw Error("Google OAuth Client ID no tiene el formato esperado.");
  for (const key of SOURCE_KEYS) {
    const url = $(key + "-url").value.trim();
    const range = $(key + "-range").value.trim() || "A1:T150";
    if (url && !idFromUrl(url)) throw Error("URL incorrecta en " + key + ". Pega un enlace de Google Sheets (docs.google.com/spreadsheets/d/...).");
    if (!isValidRange(range)) throw Error("Rango inválido en " + key + ". Usa A1:T150 o 'Nombre de pestaña'!A1:T150.");
    fresh.sources[key] = { url, range };
  }
  return fresh;
}
function loadGoogleLibrary() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => window.google?.accounts?.oauth2 ? resolve() : reject(Error("Google Identity Services no disponible"));
    script.onerror = () => reject(Error("No se pudo cargar Google Identity Services"));
    document.head.appendChild(script);
  });
}
async function googleFetch(url) {
  if (!accessToken) throw Error("Acceso no autorizado");
  const result = await fetch(url, {
    headers: { Authorization: "Bearer " + accessToken, Accept: "application/json" },
    cache: "no-store"
  });
  if (!result.ok) throw Error("Google API HTTP " + result.status);
  return result.json();
}
function connectGoogle() {
  if (!config.clientId) {
    openSettings();
    toast("Para conectar datos automáticos, añade tu Google OAuth Client ID. Puedes usar los enlaces sin configurarlo.");
    return;
  }
  $("connect").disabled = true;
  loadGoogleLibrary().then(() => {
    oauthClient = google.accounts.oauth2.initTokenClient({
      client_id: config.clientId,
      scope: GOOGLE_SCOPES,
      callback: async response => {
        $("connect").disabled = false;
        if (response.error || !response.access_token) {
          toast("Google no completó la autorización: " + (response.error || "sin token"));
          return;
        }
        accessToken = response.access_token;
        try {
          const identity = await googleFetch("https://www.googleapis.com/oauth2/v3/userinfo");
          if (!identity.email || identity.email_verified === false) throw Error("Google no confirmó el correo");
          if (config.allowedEmail && identity.email.toLowerCase() !== config.allowedEmail) {
            revokeAccess();
            toast("Esta cuenta no coincide con el correo esperado. Usa tu cuenta autorizada.");
            return;
          }
          email = identity.email;
          renderPriority();
          await refreshAll();
          toast("Google conectado. Los datos se leen directamente de tu cuenta.");
        } catch {
          revokeAccess();
          toast("No fue posible verificar tu cuenta de Google. Revisa permisos y OAuth.");
        }
      }
    });
    oauthClient.requestAccessToken({ prompt: "consent" });
  }).catch(() => {
    $("connect").disabled = false;
    toast("No se pudo iniciar Google OAuth. Revisa red o bloqueadores.");
  });
}
function revokeAccess() {
  const oldToken = accessToken;
  accessToken = null;
  email = "";
  events = [];
  calendarAvailable = null;
  sheetStats = {};
  lastUpdated = null;
  if (oldToken && window.google?.accounts?.oauth2?.revoke) {
    try { google.accounts.oauth2.revoke(oldToken, () => {}); } catch {}
  }
  renderLinks();
  renderPriority();
}
async function refreshAll() {
  if (!accessToken) {
    toast("Conecta Google para leer indicadores. Los enlaces privados ya funcionan.");
    return;
  }
  $("refresh").disabled = true;
  const now = new Date();
  const until = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  const calendarUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=50&timeMin=" + encodeURIComponent(now.toISOString()) + "&timeMax=" + encodeURIComponent(until.toISOString()) + "&fields=" + encodeURIComponent("items(start,end),timeZone");
  let expired = false;
  const promises = [googleFetch(calendarUrl).then(result => {
    calendarAvailable = true;
    events = Array.isArray(result.items) ? result.items : [];
    return true;
  }).catch(e => { calendarAvailable = false; events = []; if (e.message.includes("401")) expired = true; return false; })];
  for (const key of SOURCE_KEYS) {
    const source = config.sources[key];
    const id = idFromUrl(source.url);
    if (!id) { sheetStats[key] = null; continue; }
    const url = "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(id) + "/values/" + encodeURIComponent(source.range) + "?valueRenderOption=FORMATTED_VALUE";
    promises.push(googleFetch(url).then(result => {
      const rows = Array.isArray(result.values) ? result.values : [];
      const count = rows.filter(row => Array.isArray(row) && row.some(cell => String(cell ?? "").trim() !== "")).length;
      sheetStats[key] = { ok: true, count, range: source.range };
    }).catch(e => {
      if (e.message.includes("401")) expired = true;
      sheetStats[key] = { error: e.message.includes("403") ? "Sin permiso de lectura" : e.message.includes("400") ? "Revisa pestaña o rango" : "No se pudo leer esta hoja" };
    }));
  }
  await Promise.all(promises);
  if (expired) {
    revokeAccess();
    $("refresh").disabled = false;
    toast("La autorización de Google venció. Conéctate nuevamente.");
    return;
  }
  $("refresh").disabled = false;
  lastUpdated = new Date();
  renderLinks();
  renderPriority();
}
$("settings-open").addEventListener("click", openSettings);
$("settings-close").addEventListener("click", closeSettings);
$("settings-cancel").addEventListener("click", closeSettings);
$("settings-form").addEventListener("submit", event => {
  event.preventDefault();
  try {
    if (!$("settings-form").reportValidity()) return;
    const fresh = collectSettings();
    const changedClient = fresh.clientId !== config.clientId || fresh.allowedEmail !== config.allowedEmail;
    config = fresh;
    if (!save(KEY_SETTINGS, config)) return;
    if (changedClient && accessToken) revokeAccess();
    sheetStats = {};
    renderLinks();
    renderPriority();
    closeSettings();
    toast("Fuentes guardadas en este navegador. Los enlaces privados ya están listos.");
    if (accessToken) refreshAll();
  } catch (e) { toast(e.message); }
});
$("connect").addEventListener("click", connectGoogle);
$("disconnect").addEventListener("click", () => { revokeAccess(); toast("Sesión desconectada. Token revocado cuando es posible."); });
$("refresh").addEventListener("click", refreshAll);
$("action-button").addEventListener("click", () => {
  const action = $("action-button").dataset.action;
  if (action === "settings") openSettings();
  else if (action === "connect") connectGoogle();
  else if (action === "calendar") window.open("https://calendar.google.com/", "_blank", "noopener,noreferrer");
  else document.querySelector(action === "tasks" ? "#tasks-heading" : "#systems").scrollIntoView({ behavior: "smooth" });
});
$("task-form").addEventListener("submit", e => {
  e.preventDefault();
  const input = $("task-input");
  const text = input.value.trim();
  if (!text) return;
  tasks.unshift({ id: Date.now() + "-" + Math.random().toString(36).slice(2), text, done: false });
  tasks = tasks.slice(0, 100);
  save(KEY_TASKS, tasks);
  input.value = "";
  renderTasks();
  renderPriority();
});
renderLinks();
renderTasks();
renderPriority();
