// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCOVy3L_TD3JSWBsM7BuqGooaBE74-HG7Y",
  authDomain: "reluz-producao.firebaseapp.com",
  databaseURL: "https://reluz-producao-default-rtdb.firebaseio.com",
  projectId: "reluz-producao",
  storageBucket: "reluz-producao.firebasestorage.app",
  messagingSenderId: "910724669287",
  appId: "1:910724669287:web:e2ff572555c8cabafd59c2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const $ = id => document.getElementById(id);
const kg = n => `${Number(n || 0).toLocaleString("pt-BR",{maximumFractionDigits:3})} kg`;
const pct = n => `${Number(n || 0).toLocaleString("pt-BR",{maximumFractionDigits:1})}%`;
const today = () => new Date().toISOString().slice(0,10);
const dateBR = d => d ? d.split("-").reverse().join("/") : "—";

function escapeHtml(s=""){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

function dateRange(from,to){
  return allLots.filter(l => (!from || l.programDate >= from) && (!to || l.programDate <= to));
}

function roleIsAdmin(){ return currentProfile?.role === "admin"; }

auth.onAuthStateChanged(async user=>{
  if(!user){ showLogin(); return; }
  currentUser = user;
  try{
    const snap = await db.collection("users").doc(user.uid).get();
    if(!snap.exists){
      await auth.signOut();
      throw new Error("Usuário sem perfil cadastrado.");
    }
    currentProfile = {uid:user.uid,...snap.data()};
    showApp();
    await loadData();
  }catch(e){
    $("loginError").textContent = e.message;
    await auth.signOut();
  }
});

function showLogin(){
  $("loginScreen").classList.remove("hidden");
  $("app").classList.add("hidden");
}
function showApp(){
  $("loginScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("userName").textContent = currentProfile.name || currentUser.email;
  $("userRole").textContent = roleIsAdmin() ? "Administrador" : "Colaborador";
  document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",!roleIsAdmin()));
  $("todayLabel").textContent = new Date().toLocaleDateString("pt-BR",{dateStyle:"full"});
  const t=today();
  ["dashFrom","kanbanFrom","mineFrom","reportFrom"].forEach(id=>$(id).value=t);
  ["dashTo","kanbanTo","mineTo","reportTo"].forEach(id=>$(id).value=t);
}

$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  $("loginError").textContent="";
  try{ await auth.signInWithEmailAndPassword($("loginEmail").value,$("loginPassword").value); }
  catch(err){ $("loginError").textContent="E-mail ou senha inválidos."; }
});
$("logoutBtn").onclick=()=>auth.signOut();
$("refreshBtn").onclick=()=>loadData();

document.querySelectorAll(".nav-btn").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
    $("view-"+btn.dataset.view).classList.remove("hidden");
    $("pageTitle").textContent = btn.textContent;
    if(btn.dataset.view==="dashboard") renderDashboard();
    if(btn.dataset.view==="kanban") renderKanban();
    if(btn.dataset.view==="meus-lotes") renderMine();
    if(btn.dataset.view==="relatorio") renderReport();
    if(btn.dataset.view==="colaboradores") renderUsers();
  };
});

async function loadData(){
  const [lotsSnap, usersSnap] = await Promise.all([
    db.collection("lots").get(),
    db.collection("users").get()
  ]);
  allLots=lotsSnap.docs.map(d=>({id:d.id,...d.data()}));
  allUsers=usersSnap.docs.map(d=>({id:d.id,...d.data()}));
  fillUserSelects();
  renderDashboard();
  renderKanban();
  renderMine();
  renderReport();
  renderUsers();
}

function fillUserSelects(){
  const active=allUsers.filter(u=>u.active!==false);
  $("kanbanCollaborator").innerHTML='<option value="">Todos</option>'+active.map(u=>`<option value="${u.id}">${escapeHtml(u.name)}</option>`).join("");
  $("reportUser").innerHTML='<option value="">Todos os colaboradores</option>'+active.map(u=>`<option value="${u.id}">${escapeHtml(u.name)}</option>`).join("");
}

function lotProduced(l){ return Number(l.producedWeight||0); }
function lotRemaining(l){ return Math.max(0,Number(l.weight||0)-lotProduced(l)); }
function lotPercent(l){ return Math.min(100,(lotProduced(l)/Math.max(0.0001,Number(l.weight||0)))*100); }
function lotStatus(l){
  if(l.status==="cancelado") return "cancelado";
  if(lotRemaining(l)<=0.0001) return "finalizado";
  if(lotProduced(l)>0) return "producao";
  return "pendente";
}
function statusLabel(s){ return ({pendente:"Pendente",producao:"Em produção",finalizado:"Finalizado",cancelado:"Cancelado"})[s]||s; }

function renderDashboard(){
  const lots=dateRange($("dashFrom").value,$("dashTo").value);
  const visible=roleIsAdmin()?lots:lots.filter(l=>l.assignedTo===currentUser.uid);
  const planned=visible.reduce((a,l)=>a+Number(l.weight||0),0);
  const produced=visible.reduce((a,l)=>a+lotProduced(l),0);
  const remaining=visible.reduce((a,l)=>a+lotRemaining(l),0);
  const done=visible.filter(l=>lotStatus(l)==="finalizado").length;
  $("dashboardCards").innerHTML=[
    ["Peso programado",kg(planned)],["Peso produzido",kg(produced)],
    ["Saldo",kg(remaining)],["Lotes finalizados",done]
  ].map(x=>`<div class="card"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join("");

  const by={};
  visible.forEach(l=>{
    const u=allUsers.find(x=>x.id===l.assignedTo);
    const name=u?.name||"Não atribuído";
    const key=`${l.programDate}|${name}`;
    by[key] ||= {date:l.programDate,name,weight:0,clients:new Set(),lots:0};
    by[key].weight += lotProduced(l);
    by[key].clients.add(l.clientName || l.name || "Sem cliente");
    by[key].lots++;
  });
  const rows=Object.values(by).sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
  $("dailyCollaboratorTable").innerHTML=`<div class="table-wrap"><table class="data-table"><thead><tr><th>Data</th><th>Colaborador</th><th>Peso do dia</th><th>Clientes</th><th>Lotes</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${dateBR(r.date)}</td><td>${escapeHtml(r.name)}</td><td>${kg(r.weight)}</td><td>${escapeHtml([...r.clients].join(", "))}</td><td>${r.lots}</td></tr>`).join("")||"<tr><td colspan='5'>Sem dados.</td></tr>"}</tbody></table></div>`;

  const statuses=["pendente","producao","finalizado"];
  $("statusSummary").innerHTML=`<div class="status-table">${statuses.map(s=>`<div class="status-row"><span>${statusLabel(s)}</span><strong>${visible.filter(l=>lotStatus(l)===s).length}</strong></div>`).join("")}</div>`;
}

$("dashFilterBtn").onclick=renderDashboard;

function lotCard(l){
  const u=allUsers.find(x=>x.id===l.assignedTo);
  const st=lotStatus(l);
  return `<div class="lot-card" onclick="openLot('${l.id}')">
    <span class="badge">${statusLabel(st)}</span>
    <strong>${escapeHtml(l.name)}</strong>
    <div class="lot-meta">OS ${escapeHtml(l.os)} • ${kg(l.weight)}</div>
    <div class="lot-meta">Programação: ${dateBR(l.programDate)}</div>
    <div class="lot-meta">Responsável: ${escapeHtml(u?.name||"—")}</div>
    <div class="progress"><i style="width:${lotPercent(l)}%"></i></div>
    <div class="lot-meta">${kg(lotProduced(l))} produzido • ${pct(lotPercent(l))}</div>
  </div>`;
}

function renderKanban(){
  let lots=dateRange($("kanbanFrom").value,$("kanbanTo").value);
  const uid=$("kanbanCollaborator").value;
  if(uid) lots=lots.filter(l=>l.assignedTo===uid);
  if(!roleIsAdmin()) lots=lots.filter(l=>l.assignedTo===currentUser.uid);
  renderKanbanInto("kanban",lots);
}
function renderMine(){
  const lots=dateRange($("mineFrom").value,$("mineTo").value).filter(l=>l.assignedTo===currentUser.uid);
  renderKanbanInto("mineKanban",lots);
}
function renderKanbanInto(id,lots){
  const cols=[["pendente","A FAZER"],["producao","EM PRODUÇÃO"],["finalizado","FINALIZADO"],["cancelado","CANCELADOS"]];
  $(id).innerHTML=cols.map(([s,title])=>{
    const list=lots.filter(l=>lotStatus(l)===s);
    return `<div class="kanban-column"><h3>${title} <span class="badge">${list.length}</span></h3>${list.map(lotCard).join("")}</div>`;
  }).join("");
}
$("kanbanFilterBtn").onclick=renderKanban;
$("mineFilterBtn").onclick=renderMine;

window.openLot=async function(id){
  const l=allLots.find(x=>x.id===id);
  if(!l) return;
  const u=allUsers.find(x=>x.id===l.assignedTo);
  const mine=l.assignedTo===currentUser.uid;
  const canEdit=roleIsAdmin()||mine;
  $("lotModalContent").innerHTML=`
    <h2>${escapeHtml(l.name)}</h2>
    <div class="modal-grid">
      <div><small>OS</small><strong>${escapeHtml(l.os)}</strong></div>
      <div><small>Cliente</small><strong>${escapeHtml(l.clientName||l.name||"—")}</strong></div>
      <div><small>Peso do lote</small><strong>${kg(l.weight)}</strong></div>
      <div><small>Produzido</small><strong>${kg(lotProduced(l))}</strong></div>
      <div><small>Data entrada</small><strong>${dateBR(l.entryDate)}</strong></div>
      <div><small>Programação</small><strong>${dateBR(l.programDate)}</strong></div>
      <div><small>Responsável</small><strong>${escapeHtml(u?.name||"—")}</strong></div>
      <div><small>Status</small><strong>${statusLabel(lotStatus(l))}</strong></div>
    </div>
    ${canEdit?`
    <div class="notice">O colaborador informa o peso produzido. O saldo e o percentual são calculados automaticamente.</div>
    <form id="productionForm" class="form-grid" style="margin-top:14px">
      <label>Peso produzido agora (kg)<input id="productionInput" type="number" step="0.001" min="0"></label>
      <label>Observação<input id="productionObs" maxlength="500"></label>
      <div class="full"><button class="primary" type="submit">Registrar produção</button></div>
    </form>`:""}
    <div class="modal-actions">${roleIsAdmin()?`<button class="secondary" onclick="redistributeLot('${l.id}')">Redistribuir lote</button>`:""}<button class="secondary" onclick="closeLotModal()">Fechar</button></div>
    <div id="modalMessage"></div>`;
  $("lotModal").classList.remove("hidden");
  if(canEdit) $("productionForm").onsubmit=e=>registerProduction(e,l);
};
window.closeLotModal=()=> $("lotModal").classList.add("hidden");

async function registerProduction(e,l){
  e.preventDefault();
  const amount=Number($("productionInput").value||0);
  if(amount<=0){$("modalMessage").textContent="Informe um peso maior que zero.";return;}
  if(lotProduced(l)+amount>Number(l.weight)+0.0001){$("modalMessage").textContent="O peso produzido ultrapassa o peso do lote.";return;}
  const now=firebase.firestore.FieldValue.serverTimestamp();
  const log={weight:amount,obs:$("productionObs").value||"",userId:currentUser.uid,at:now};
  try{
    await db.runTransaction(async tx=>{
      const ref=db.collection("lots").doc(l.id);
      const snap=await tx.get(ref);
      if(!snap.exists) throw new Error("Lote não encontrado.");
      const data=snap.data();
      const next=Number(data.producedWeight||0)+amount;
      tx.update(ref,{
        producedWeight:next,
        status:next>=Number(data.weight)-0.0001?"finalizado":"producao",
        updatedAt:now,
        lastObservation:log.obs,
        productionLogs:firebase.firestore.FieldValue.arrayUnion({...log,at:new Date()})
      });
    });
    closeLotModal(); await loadData();
  }catch(err){$("modalMessage").textContent=err.message;}
}

$("lotForm").addEventListener("submit",async e=>{
  e.preventDefault();
  $("lotFormMessage").textContent="";
  const weight=Number($("lotWeight").value);
  if(weight<=0)return;
  try{
    const active=allUsers.filter(u=>u.active!==false && u.role==="colaborador");
    if(!active.length) throw new Error("Não existem colaboradores ativos para distribuição.");
    const loads={};
    allLots.forEach(l=>{
      if(["pendente","producao"].includes(lotStatus(l))) loads[l.assignedTo]=(loads[l.assignedTo]||0)+lotRemaining(l);
    });
    active.sort((a,b)=>(loads[a.id]||0)-(loads[b.id]||0));
    const chosen=active[0];
    const ref=db.collection("lots").doc();
    const data={
      name:$("lotName").value.trim(),
      os:$("lotOs").value.trim(),
      weight,
      entryDate:$("lotEntry").value,
      programDate:$("lotProgram").value,
      assignedTo:chosen.id,
      producedWeight:0,
      status:"pendente",
      clientName:$("lotName").value.trim(),
      createdBy:currentUser.uid,
      createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    };
    await ref.set(data);
    $("lotFormMessage").className="success";
    $("lotFormMessage").textContent=`Lote distribuído para ${chosen.name}, atualmente com ${kg(loads[chosen.id]||0)} em carga pendente.`;
    e.target.reset(); await loadData();
  }catch(err){$("lotFormMessage").className="error";$("lotFormMessage").textContent=err.message;}
});

window.redistributeLot=async function(id){
  if(!roleIsAdmin())return;
  const active=allUsers.filter(u=>u.active!==false && u.role==="colaborador");
  const l=allLots.find(x=>x.id===id);
  if(!l||!active.length)return;
  const loads={};
  allLots.forEach(x=>{
    if(x.id!==id && ["pendente","producao"].includes(lotStatus(x))) loads[x.assignedTo]=(loads[x.assignedTo]||0)+lotRemaining(x);
  });
  active.sort((a,b)=>(loads[a.id]||0)-(loads[b.id]||0));
  const chosen=active[0];
  await db.collection("lots").doc(id).update({assignedTo:chosen.id,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
  closeLotModal(); await loadData();
};

function renderReport(){
  let lots=dateRange($("reportFrom").value,$("reportTo").value);
  const uid=$("reportUser").value;
  if(uid) lots=lots.filter(l=>l.assignedTo===uid);
  if(!roleIsAdmin()) lots=lots.filter(l=>l.assignedTo===currentUser.uid);
  const planned=lots.reduce((a,l)=>a+Number(l.weight||0),0);
  const produced=lots.reduce((a,l)=>a+lotProduced(l),0);
  const clients=new Set(lots.map(l=>l.clientName||l.name).filter(Boolean));
  $("reportSummary").innerHTML=[
    ["Programado",kg(planned)],["Produzido",kg(produced)],["Saldo",kg(planned-produced)],
    ["Realização",pct(planned?produced/planned*100:0)],["Clientes",clients.size]
  ].map(x=>`<div class="card"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join("");

  const by={};
  lots.forEach(l=>{
    const u=allUsers.find(x=>x.id===l.assignedTo);
    const key=`${l.programDate}|${l.assignedTo}`;
    by[key] ||= {date:l.programDate,user:u?.name||"—",produced:0,planned:0,clients:new Set(),lots:0};
    by[key].planned+=Number(l.weight||0); by[key].produced+=lotProduced(l); by[key].clients.add(l.clientName||l.name); by[key].lots++;
  });
  const rows=Object.values(by).sort((a,b)=>a.date.localeCompare(b.date)||a.user.localeCompare(b.user));
  $("reportByCollaborator").innerHTML=`<h3>Produção por colaborador e por dia</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Data</th><th>Colaborador</th><th>Peso do dia</th><th>Programado</th><th>Clientes</th><th>Lotes</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${dateBR(r.date)}</td><td>${escapeHtml(r.user)}</td><td>${kg(r.produced)}</td><td>${kg(r.planned)}</td><td>${escapeHtml([...r.clients].join(", "))}</td><td>${r.lots}</td></tr>`).join("")||"<tr><td colspan='6'>Sem dados.</td></tr>"}</tbody></table></div>`;

  $("reportDetails").innerHTML=`<h3>Detalhamento dos lotes</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Programação</th><th>OS</th><th>Lote</th><th>Colaborador</th><th>Peso</th><th>Produzido</th><th>Saldo</th><th>Status</th></tr></thead><tbody>${lots.sort((a,b)=>a.programDate.localeCompare(b.programDate)).map(l=>{const u=allUsers.find(x=>x.id===l.assignedTo);return `<tr><td>${dateBR(l.programDate)}</td><td>${escapeHtml(l.os)}</td><td>${escapeHtml(l.name)}</td><td>${escapeHtml(u?.name||"—")}</td><td>${kg(l.weight)}</td><td>${kg(lotProduced(l))}</td><td>${kg(lotRemaining(l))}</td><td>${statusLabel(lotStatus(l))}</td></tr>`}).join("")||"<tr><td colspan='8'>Sem dados.</td></tr>"}</tbody></table></div>`;
}
$("reportFilterBtn").onclick=renderReport;

function pdfBase(title,from,to){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:"landscape"});
  doc.setFontSize(18);doc.text(title,14,16);
  doc.setFontSize(9);doc.text(`Programação: ${dateBR(from)} a ${dateBR(to)}`,14,23);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`,200,23);
  return doc;
}
function pdfRows(lots){
  return lots.map(l=>{
    const u=allUsers.find(x=>x.id===l.assignedTo);
    return [dateBR(l.programDate),l.os,l.name,u?.name||"—",kg(l.weight),kg(lotProduced(l)),kg(lotRemaining(l)),statusLabel(lotStatus(l))];
  });
}
function savePdf(doc,name){doc.save(name.replace(/\s+/g,"_")+".pdf");}

$("pdfGeneralBtn").onclick=()=>{
  if(!roleIsAdmin())return;
  const from=$("reportFrom").value,to=$("reportTo").value;
  let lots=dateRange(from,to);
  const doc=pdfBase("RELATÓRIO GERAL DE PRODUÇÃO",from,to);
  const planned=lots.reduce((a,l)=>a+Number(l.weight||0),0), produced=lots.reduce((a,l)=>a+lotProduced(l),0);
  doc.setFontSize(11);doc.text(`Programado: ${kg(planned)}   Produzido: ${kg(produced)}   Saldo: ${kg(planned-produced)}   Realização: ${pct(planned?produced/planned*100:0)}`,14,31);
  const by={}; lots.forEach(l=>{const u=allUsers.find(x=>x.id===l.assignedTo);const k=`${l.programDate}|${l.assignedTo}`;by[k] ||= {d:l.programDate,n:u?.name||"—",p:0,c:new Set(),q:0};by[k].p+=lotProduced(l);by[k].c.add(l.clientName||l.name);by[k].q++;});
  doc.autoTable({startY:38,head:[["Data","Colaborador","Peso do dia","Clientes","Lotes"]],body:Object.values(by).sort((a,b)=>a.d.localeCompare(b.d)).map(r=>[dateBR(r.d),r.n,kg(r.p),[...r.c].join(", "),r.q])});
  doc.addPage();doc.setFontSize(14);doc.text("DETALHAMENTO DOS LOTES",14,16);
  doc.autoTable({startY:22,head:[["Programação","OS","Lote","Colaborador","Peso","Produzido","Saldo","Status"]],body:pdfRows(lots)});
  savePdf(doc,`Relatorio_Geral_${from}_${to}`);
};

$("pdfIndividualBtn").onclick=()=>{
  const uid=$("reportUser").value;
  if(!uid){alert("Selecione um colaborador para o PDF individual.");return;}
  const from=$("reportFrom").value,to=$("reportTo").value;
  const user=allUsers.find(u=>u.id===uid);
  const lots=dateRange(from,to).filter(l=>l.assignedTo===uid);
  const doc=pdfBase(`RELATÓRIO INDIVIDUAL - ${user?.name||"Colaborador"}`,from,to);
  const planned=lots.reduce((a,l)=>a+Number(l.weight||0),0), produced=lots.reduce((a,l)=>a+lotProduced(l),0);
  const clients=new Set(lots.map(l=>l.clientName||l.name));
  doc.setFontSize(11);doc.text(`Programado: ${kg(planned)}   Produzido: ${kg(produced)}   Saldo: ${kg(planned-produced)}   Realização: ${pct(planned?produced/planned*100:0)}   Clientes: ${clients.size}`,14,31);
  const by={};lots.forEach(l=>{const k=l.programDate;by[k] ||= {p:0,c:new Set(),q:0};by[k].p+=lotProduced(l);by[k].c.add(l.clientName||l.name);by[k].q++;});
  doc.autoTable({startY:38,head:[["Data","Peso do dia","Clientes","Lotes"]],body:Object.entries(by).sort((a,b)=>a[0].localeCompare(b[0])).map(([d,r])=>[dateBR(d),kg(r.p),[...r.c].join(", "),r.q])});
  doc.addPage();doc.setFontSize(14);doc.text("DETALHAMENTO DOS LOTES",14,16);
  doc.autoTable({startY:22,head:[["Programação","OS","Lote","Peso","Produzido","Saldo","Status"]],body:lots.map(l=>{return [dateBR(l.programDate),l.os,l.name,kg(l.weight),kg(lotProduced(l)),kg(lotRemaining(l)),statusLabel(lotStatus(l))]})});
  savePdf(doc,`Relatorio_${user?.name||"Colaborador"}_${from}_${to}`);
};

async function renderUsers(){
  if(!roleIsAdmin())return;
  $("usersTable").innerHTML=`<div class="table-wrap"><table class="data-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Ativo</th><th>Carga pendente</th></tr></thead><tbody>${allUsers.map(u=>{const load=allLots.filter(l=>l.assignedTo===u.id&&["pendente","producao"].includes(lotStatus(l))).reduce((a,l)=>a+lotRemaining(l),0);return `<tr><td>${escapeHtml(u.name||"—")}</td><td>${escapeHtml(u.email||"—")}</td><td>${u.role}</td><td>${u.active!==false?"Sim":"Não"}</td><td>${kg(load)}</td></tr>`}).join("")}</tbody></table></div>`;
}

$("userForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!roleIsAdmin())return;
  const name=$("newUserName").value.trim(),email=$("newUserEmail").value.trim(),password=$("newUserPassword").value;
  try{
    // App secundário evita deslogar o administrador.
    const secondaryName="secondary-"+Date.now();
    const secondary=firebase.initializeApp(firebaseConfig,secondaryName);
    const cred=await secondary.auth().createUserWithEmailAndPassword(email,password);
    await db.collection("users").doc(cred.user.uid).set({name,email,role:"colaborador",active:true,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    await secondary.delete();
    $("userFormMessage").className="success";$("userFormMessage").textContent="Colaborador criado com sucesso.";
    e.target.reset();await loadData();
  }catch(err){$("userFormMessage").className="error";$("userFormMessage").textContent=err.message;}
});
