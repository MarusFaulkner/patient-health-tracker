(() => {
"use strict";
const STORE = { patients:"pht_v2_patients", vitals:"pht_v2_vitals" };
const $ = id => document.getElementById(id);
const safeText = value => String(value ?? "");
const today = () => new Date().toISOString().slice(0,10);
const nowTime = () => new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});

const seedPatients = [
  {id:"p1",demoId:"DEMO-101",firstName:"Jordan",lastName:"Lee",dob:"1988-04-12",notes:"Synthetic demonstration record."},
  {id:"p2",demoId:"DEMO-102",firstName:"Taylor",lastName:"Morgan",dob:"1976-09-03",notes:"Synthetic demonstration record."},
  {id:"p3",demoId:"DEMO-103",firstName:"Casey",lastName:"Rivera",dob:"1994-01-22",notes:"Synthetic demonstration record."}
];
const seedVitals = [
  {id:"v1",patientId:"p1",date:"2026-10-05",time:"09:15",heartRate:76,systolic:118,diastolic:76,temperature:98.4,notes:"Routine synthetic observation.",flags:[]},
  {id:"v2",patientId:"p2",date:"2026-10-06",time:"11:30",heartRate:126,systolic:146,diastolic:92,temperature:99.1,notes:"Synthetic values to demonstrate flags.",flags:["Heart rate demo flag","Blood pressure demo flag"]},
  {id:"v3",patientId:"p3",date:"2026-10-07",time:"14:10",heartRate:68,systolic:122,diastolic:78,temperature:100.6,notes:"Synthetic values to demonstrate temperature flag.",flags:["Temperature demo flag"]},
  {id:"v4",patientId:"p1",date:"2026-10-08",time:"08:45",heartRate:72,systolic:116,diastolic:74,temperature:98.2,notes:"Routine synthetic observation.",flags:[]}
];

let patients = load(STORE.patients, seedPatients);
let vitals = load(STORE.vitals, seedVitals);
let chart;

function load(key, fallback){
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return Array.isArray(parsed) ? parsed : structuredClone(fallback);
  } catch { return structuredClone(fallback); }
}
function save(){
  localStorage.setItem(STORE.patients, JSON.stringify(patients));
  localStorage.setItem(STORE.vitals, JSON.stringify(vitals));
}
function node(tag, text, cls){
  const el=document.createElement(tag);
  if(text !== undefined) el.textContent=safeText(text);
  if(cls) el.className=cls;
  return el;
}
function latestVital(patientId){
  return vitals.filter(v=>v.patientId===patientId).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))[0];
}
function flagsFor(hr,sys,dia,temp){
  const flags=[];
  if(hr<50 || hr>120) flags.push("Heart rate demo flag");
  if(sys>=140 || dia>=90) flags.push("Blood pressure demo flag");
  if(temp<95 || temp>=100.4) flags.push("Temperature demo flag");
  return flags;
}
function setView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===id));
  window.scrollTo({top:0,behavior:"smooth"});
  if(id==="dashboard") renderDashboard();
  if(id==="patients") renderPatients();
  if(id==="record") renderPatientSelect();
}
function renderDashboard(){
  $("patientCount").textContent=patients.length;
  $("observationCount").textContent=vitals.length;
  $("flaggedCount").textContent=vitals.filter(v=>v.flags?.length).length;
  const latestDate=[...vitals].sort((a,b)=>b.date.localeCompare(a.date))[0]?.date;
  const latest=vitals.filter(v=>v.date===latestDate && Number.isFinite(v.heartRate));
  $("avgHeartRate").textContent=latest.length ? Math.round(latest.reduce((s,v)=>s+v.heartRate,0)/latest.length) : "—";
  $("lastUpdated").textContent="Updated "+new Date().toLocaleDateString();
  renderAlerts(); renderRecent(); renderChart();
}
function renderAlerts(){
  const box=$("alertsList"); box.replaceChildren();
  const flagged=[...vitals].filter(v=>v.flags?.length).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).slice(0,4);
  if(!flagged.length){ box.append(node("div","No flagged demo observations.","empty")); return; }
  flagged.forEach(v=>{
    const p=patients.find(p=>p.id===v.patientId);
    const item=node("div",undefined,"alert-item");
    item.append(node("strong",p ? `${p.firstName} ${p.lastName}` : "Unknown demo patient"));
    item.append(node("span",`${v.date} • ${v.flags.join(" • ")}`));
    box.append(item);
  });
}
function renderRecent(){
  const wrap=$("recentPatients"); wrap.replaceChildren();
  if(!patients.length){wrap.append(node("div","No synthetic patient records.","empty"));return;}
  const table=node("table"), head=node("thead"), hr=node("tr");
  ["Patient","Demo ID","Latest observation","Status"].forEach(x=>hr.append(node("th",x)));
  head.append(hr); table.append(head);
  const body=node("tbody");
  patients.slice(-5).reverse().forEach(p=>{
    const v=latestVital(p.id), tr=node("tr");
    tr.append(node("td",`${p.firstName} ${p.lastName}`));
    tr.append(node("td",p.demoId));
    tr.append(node("td",v ? `${v.date} • ${v.heartRate} bpm` : "None"));
    const td=node("td"), status=node("span",v?.flags?.length ? "Flagged" : "No active flag",`status ${v?.flags?.length ? "flag":"ok"}`);
    td.append(status); tr.append(td); body.append(tr);
  });
  table.append(body); wrap.append(table);
}
function renderChart(){
  if(typeof Chart==="undefined") return;
  const grouped={};
  vitals.forEach(v=>{ if(Number.isFinite(v.heartRate)){(grouped[v.date]??=[]).push(v.heartRate);} });
  const labels=Object.keys(grouped).sort();
  const data=labels.map(d=>Math.round(grouped[d].reduce((a,b)=>a+b,0)/grouped[d].length));
  if(chart) chart.destroy();
  chart=new Chart($("healthChart"),{type:"line",data:{labels,datasets:[{label:"Average heart rate",data,borderWidth:2,tension:.35,pointRadius:4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{suggestedMin:50,suggestedMax:130,grid:{color:"#edf1f5"}},x:{grid:{display:false}}}}});
}
function renderPatients(){
  const query=$("patientSearch").value.trim().toLowerCase();
  const filtered=patients.filter(p=>`${p.firstName} ${p.lastName} ${p.demoId}`.toLowerCase().includes(query));
  $("patientResultCount").textContent=`${filtered.length} record${filtered.length===1?"":"s"}`;
  const box=$("patientCards"); box.replaceChildren();
  if(!filtered.length){box.append(node("div","No matching synthetic records.","empty"));return;}
  filtered.forEach(p=>{
    const v=latestVital(p.id), card=node("article",undefined,"patient-card"), top=node("div",undefined,"patient-top");
    const left=node("div"), h=node("h3",`${p.firstName} ${p.lastName}`), meta=node("p",`${p.demoId} • DOB ${p.dob}`);
    left.append(h,meta); top.append(left,node("div",`${p.firstName[0]||""}${p.lastName[0]||""}`,"avatar")); card.append(top);
    const latest=node("div",undefined,"latest");
    [["Heart rate",v?`${v.heartRate} bpm`:"—"],["Blood pressure",v?`${v.systolic}/${v.diastolic}`:"—"],["Temperature",v?`${v.temperature.toFixed(1)}°F`:"—"],["Status",v?.flags?.length?"Flagged":"No active flag"]].forEach(([a,b])=>{const d=node("div");d.append(node("span",a),node("strong",b));latest.append(d);});
    card.append(latest); box.append(card);
  });
}
function renderPatientSelect(){
  const s=$("vitalPatient"); s.replaceChildren(); s.append(new Option("Choose a synthetic patient…",""));
  patients.forEach(p=>s.append(new Option(`${p.firstName} ${p.lastName} (${p.demoId})`,p.id)));
}
function message(id,text,type=""){
  const el=$(id); el.textContent=text; el.className=`form-message ${type}`;
}
function addPatient(e){
  e.preventDefault();
  const first=$("firstName").value.trim(), last=$("lastName").value.trim(), dob=$("dob").value, demoId=$("demoId").value.trim().toUpperCase(), notes=$("patientNotes").value.trim();
  if(!first||!last||!dob||!demoId){message("patientMessage","Complete all required fields.","error");return;}
  if(!/^[A-Z0-9-]+$/.test(demoId)){message("patientMessage","Demo ID may contain letters, numbers, and hyphens only.","error");return;}
  if(patients.some(p=>p.demoId.toUpperCase()===demoId)){message("patientMessage","That demo ID already exists.","error");return;}
  patients.push({id:crypto.randomUUID(),demoId,firstName:first,lastName:last,dob,notes}); save();
  e.target.reset(); $("patientDialog").close(); renderPatients(); renderPatientSelect(); renderDashboard();
}
function addVitals(e){
  e.preventDefault();
  const patientId=$("vitalPatient").value, hr=Number($("heartRate").value), temp=Number($("temperature").value), sys=Number($("systolic").value), dia=Number($("diastolic").value), notes=$("notes").value.trim();
  if(!patientId || ![hr,temp,sys,dia].every(Number.isFinite)){message("formMessage","Complete all required observation fields.","error");return;}
  if(hr<20||hr>250||temp<85||temp>115||sys<50||sys>260||dia<30||dia>180){message("formMessage","One or more values fall outside this demo application's accepted input range.","error");return;}
  const flags=flagsFor(hr,sys,dia,temp);
  vitals.push({id:crypto.randomUUID(),patientId,date:today(),time:nowTime(),heartRate:hr,systolic:sys,diastolic:dia,temperature:temp,notes,flags}); save();
  e.target.reset(); renderPatientSelect(); message("formMessage",flags.length?`Observation saved with ${flags.length} demo flag(s).`:"Observation saved. No demo flags generated.",flags.length?"error":"success"); renderDashboard();
}
function resetDemo(){
  if(!confirm("Reset this browser to the original synthetic demo data?")) return;
  patients=structuredClone(seedPatients); vitals=structuredClone(seedVitals); save(); renderDashboard(); renderPatients(); renderPatientSelect();
}
document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
  document.querySelectorAll("[data-jump]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.jump)));
  $("patientSearch").addEventListener("input",renderPatients);
  $("showAddPatient").addEventListener("click",()=>$("patientDialog").showModal());
  $("closeDialog").addEventListener("click",()=>$("patientDialog").close());
  $("cancelPatient").addEventListener("click",()=>$("patientDialog").close());
  $("patientForm").addEventListener("submit",addPatient);
  $("vitalsForm").addEventListener("submit",addVitals);
  $("resetDemo").addEventListener("click",resetDemo);
  save(); renderDashboard(); renderPatients(); renderPatientSelect();
});
})();