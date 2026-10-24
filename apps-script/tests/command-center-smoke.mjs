// Deterministic, synthetic-data regression tests for RV Command Center.
// No real patient names, spreadsheet IDs, personal finances or OAuth secrets.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script, runInNewContext } from "node:vm";

const server = readFileSync(new URL("../Code.gs", import.meta.url), "utf8");
const ui = readFileSync(new URL("../Index.html", import.meta.url), "utf8");
new Script(server);
const uiMatch = ui.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(uiMatch, "Private dashboard JS not found");
new Script(uiMatch[1]);

const elements = new Set([...ui.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
const references = [...uiMatch[1].matchAll(/\$\('([a-z0-9-]+)'\)/g)].map(x=>x[1]);
for(const id of references)assert.ok(elements.has(id), "Missing UI element "+id);

const sheetIds = {
 MATRIX_SHEET_ID:"MATRIX_SYNTHETIC_SHEET",
 TRAINING_SHEET_ID:"TRAINING_SYNTHETIC_SHEET",
 CLINICAL_SHEET_ID:"CLINICAL_SYNTHETIC_SHEET",
 FINANCE_SHEET_ID:"FINANCE_SYNTHETIC_SHEET",
 FINANCE_BUDGET_TAB:"Pre Oct"
};
const tabs = {
 MATRIX_SYNTHETIC_SHEET:["19/10","26/10"],
 TRAINING_SYNTHETIC_SHEET:["Daily log","drg"],
 CLINICAL_SYNTHETIC_SHEET:["26/10","Objetivos/Paciente"],
 FINANCE_SYNTHETIC_SHEET:["Pre Oct"]
};
const sheets = {
 "MATRIX_SYNTHETIC_SHEET|19/10":[["9:00","","","","","","",""]],
 "MATRIX_SYNTHETIC_SHEET|26/10":[["17:00","","","","","","",""],["18:00","psicopro: PersonaSoloMatrix","","","","","",""]],
 "TRAINING_SYNTHETIC_SHEET|Daily log":[["M9","25/10/2026 — Sunday","🏋️ SUN 25/10 · PUSH + Z2","not done ill"]],
 "TRAINING_SYNTHETIC_SHEET|drg":[["M9","Sat","24/10/2026",1,1,1,1,1,0,1,"YES","ABORT"]],
 "CLINICAL_SYNTHETIC_SHEET|Objetivos/Paciente":[["cupos","Nivel","Faltan"],["13","🔵 Clasificados semanales","—"],["15","🟠 Objetivo habitual","2"]],
 "CLINICAL_SYNTHETIC_SHEET|26/10":[["17:00","PersonaPrueba","","","",""]],
 "FINANCE_SYNTHETIC_SHEET|Pre Oct":[
  ["💰 Presupuesto mensual"],
  ["Mes activo","October 2026","Gasto real del mes"],
  ["Categoría","Presupuesto","Gasto real mes (CLP)"],
  ["🎉 Ocio","$60,000","$210,675"],
  ["⛽ Combustible","$80,000","$165,200"],
  ["🍽️ Alimentación","-","$56,540"],
  ["📌 Total presupuesto","$140,000","$432,415"]
 ]
};
const formatDate = (date, tz, fmt)=>{
 const d=new Date(date);
 if(fmt==="u"){const label=new Intl.DateTimeFormat("en-US",{timeZone:tz,weekday:"short"}).format(d);return String(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(label)+1);}
 if(fmt==="dd/MM")return new Intl.DateTimeFormat("en-GB",{timeZone:tz,day:"2-digit",month:"2-digit"}).format(d);
 return new Intl.DateTimeFormat("sv-SE",{timeZone:tz,year:"numeric",month:"2-digit",...(fmt==="yyyy-MM-dd"?{day:"2-digit"}:{})}).format(d);
};
class FixedDate extends Date {
 constructor(...args){super(...(args.length?args:["2026-10-24T15:00:00Z"]));}
 static now(){return new Date("2026-10-24T15:00:00Z").getTime();}
}
const context = {
 Date:FixedDate, Utilities:{formatDate},
 PropertiesService:{getScriptProperties:()=>({getProperty:key=>sheetIds[key]||null})},
 Sheets:{Spreadsheets:{
  get:(id)=>({sheets:(tabs[id]||[]).map(title=>({properties:{title}}))}),
  Values:{get:(id,a1)=>({values:sheets[id+"|"+(a1.match(/^'([^']+)'!/)||[])[1]]||[]})}
 }},
 CalendarApp:{getDefaultCalendar:()=>({getEvents:()=>[]})},
 HtmlService:{createHtmlOutputFromFile:()=>({setTitle(){return this},addMetaTag(){return this}})},
 Intl, Set, Math, Number, String, Object, RegExp, Array, JSON
};
const result=runInNewContext(server+"\ngetDashboard();",context);
assert.equal(result.clinical.weekly,13);
assert.equal(result.clinical.gap,-2);
assert.equal(result.training.drgToday.output,"ABORT");
assert.equal(result.comparisons.training.state,"no_plan");
assert.equal(result.comparisons.training.total,null);
assert.equal(result.comparisons.clinical.matrixOnly,1);
assert.equal(result.finance.categoryReconciled,true);
assert.equal(result.finance.over,292415);
assert.equal(result.finance.topOverages[0].over,150675);
assert.equal(result.finance.unbudgetedAmount,56540);
assert.equal(result.nextAction.level,"critical");
assert.equal(result.recommendations.length,3);
assert.equal(new Set(result.recommendations.map(x=>x.domain)).size,3);
assert.equal(JSON.stringify(result).includes("PersonaPrueba"),false);
assert.equal(JSON.stringify(result).includes("PersonaSoloMatrix"),false);
console.log("RV Command Center: security, DOM integrity and KPI regression tests PASSED.");
