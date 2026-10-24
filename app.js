"use strict";
const KEY = "rvcc.private.apps_script_url.v1";
const $ = id => document.getElementById(id);
let timer;
function isValidAppsScriptUrl(input) {
  try {
    const u = new URL(input);
    return u.protocol === "https:" &&
      u.hostname === "script.google.com" &&
      /^\/macros\/s\/[A-Za-z0-9_-]+\/exec\/?$/.test(u.pathname) &&
      !u.search && !u.hash && !u.username && !u.password;
  } catch { return false; }
}
function storedUrl() {
  try {
    const url = localStorage.getItem(KEY);
    return isValidAppsScriptUrl(url) ? url : "";
  } catch { return ""; }
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => { $("toast").hidden = true; }, 4500);
}
function render() {
  const linked = Boolean(storedUrl());
  $("open-private").disabled = !linked;
  $("portal-state").textContent = linked
    ? "Panel privado configurado en este navegador. Google comprobará tu sesión antes de mostrar datos."
    : "Solo falta configurar la URL /exec de tu aplicación privada de Google Apps Script.";
}
function toggleSetup(visible) {
  $("portal-setup").hidden = !visible;
  if(visible) {
    $("script-url").value = storedUrl();
    $("script-url").focus();
  }
}
function tick() {
  const now = new Date();
  const opts={timeZone:"America/Santiago"};
  $("current-date").textContent=new Intl.DateTimeFormat("es-CL",{...opts,weekday:"long",day:"numeric",month:"long"}).format(now);
  $("current-time").textContent=new Intl.DateTimeFormat("es-CL",{...opts,hour:"2-digit",minute:"2-digit"}).format(now);
}
$("edit-url").addEventListener("click",()=>toggleSetup($("portal-setup").hidden));
$("save-url").addEventListener("click",()=>{
  const value=$("script-url").value.trim();
  if(!isValidAppsScriptUrl(value)) {
    toast("Introduce el enlace /exec de tu aplicación Google Apps Script, sin parámetros.");
    return;
  }
  try { localStorage.setItem(KEY,value); }
  catch { toast("El navegador bloqueó el almacenamiento local."); return; }
  toggleSetup(false);
  render();
  toast("Acceso guardado solamente en este navegador.");
});
$("clear-url").addEventListener("click",()=>{
  try { localStorage.removeItem(KEY); }
  catch { toast("El navegador bloqueó el almacenamiento local."); return; }
  $("script-url").value="";
  render();
  toast("Enlace local eliminado.");
});
$("open-private").addEventListener("click",()=>{
  const url=storedUrl();
  if(!url) { render(); toast("Primero configura tu enlace /exec."); return; }
  window.location.assign(url);
});
tick();
setInterval(tick,30000);
render();
