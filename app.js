/* =========================================================
   FIREBASE
========================================================= */

const firebaseConfig = {

  apiKey: "AIzaSyCOVy3L_TD3JSWBsM7BuqGooaBE74-HG7Y",

  authDomain:
    "reluz-producao.firebaseapp.com",

  databaseURL:
    "https://reluz-producao-default-rtdb.firebaseio.com",

  projectId:
    "reluz-producao",

  storageBucket:
    "reluz-producao.firebasestorage.app",

  messagingSenderId:
    "910724669287",

  appId:
    "1:910724669287:web:e2ff572555c8cabafd59c2"

};


/* Inicializa Firebase */

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();


/* =========================================================
   VARIÁVEIS
========================================================= */

let currentUser = null;
let currentProfile = null;

let allLots = [];
let allUsers = [];


/* =========================================================
   HELPERS
========================================================= */

const $ = id => document.getElementById(id);


function kg(n) {

  return `${Number(n || 0).toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    }
  )} kg`;

}


function pct(n) {

  return `${Number(n || 0).toLocaleString(
    "pt-BR",
    {
      maximumFractionDigits: 1
    }
  )}%`;

}


function today() {

  return new Date().toISOString().slice(0, 10);

}


function dateBR(d) {

  if (!d) return "—";

  if (typeof d !== "string") return "—";

  return d.split("-").reverse().join("/");

}


function escapeHtml(value = "") {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function dateRange(from, to) {

  return allLots.filter(l => {

    return (
      (!from || l.programDate >= from) &&
      (!to || l.programDate <= to)
    );

  });

}


function roleIsAdmin() {

  return currentProfile?.role === "admin";

}


/* =========================================================
   LOTES
========================================================= */

function lotProduced(l) {

  return Number(l.producedWeight || 0);

}


function lotRemaining(l) {

  return Math.max(
    0,
    Number(l.weight || 0) - lotProduced(l)
  );

}


function lotPercent(l) {

  const weight = Number(l.weight || 0);

  if (weight <= 0) return 0;

  return Math.min(
    100,
    (lotProduced(l) / weight) * 100
  );

}


function lotStatus(l) {

  if (l.status === "cancelado") {
    return "cancelado";
  }

  if (lotRemaining(l) <= 0.0001) {
    return "finalizado";
  }

  if (lotProduced(l) > 0) {
    return "producao";
  }

  return "pendente";

}


function statusLabel(status) {

  const labels = {

    pendente: "Pendente",

    producao: "Em produção",

    finalizado: "Finalizado",

    cancelado: "Cancelado"

  };

  return labels[status] || status;

}


/* =========================================================
   AUTH
========================================================= */

auth.onAuthStateChanged(async user => {

  if (!user) {

    showLogin();

    return;

  }

  currentUser = user;

  try {

    const snap =
      await db.collection("users")
        .doc(user.uid)
        .get();

    if (!snap.exists) {

      await auth.signOut();

      throw new Error(
        "Usuário sem perfil cadastrado no Firestore."
      );

    }

    currentProfile = {
      uid: user.uid,
      ...snap.data()
    };

    showApp();

    await loadData();

  } catch (error) {

    console.error(error);

    $("loginError").textContent =
      error.message || "Erro ao carregar usuário.";

    await auth.signOut();

  }

});


/* =========================================================
   LOGIN / APP
========================================================= */

function showLogin() {

  $("loginScreen").classList.remove("hidden");

  $("app").classList.add("hidden");

}


function showApp() {

  $("loginScreen").classList.add("hidden");

  $("app").classList.remove("hidden");

  $("userName").textContent =
    currentProfile.name ||
    currentUser.email;

  $("userRole").textContent =
    roleIsAdmin()
      ? "Administrador"
      : "Colaborador";

  document
    .querySelectorAll(".admin-only")
    .forEach(element => {

      element.classList.toggle(
        "hidden",
        !roleIsAdmin()
      );

    });

  $("todayLabel").textContent =
    new Date().toLocaleDateString(
      "pt-BR",
      {
        dateStyle: "full"
      }
    );

  const t = today();

  [
    "dashFrom",
    "kanbanFrom",
    "mineFrom",
    "reportFrom"
  ].forEach(id => {

    if ($(id)) {
      $(id).value = t;
    }

  });

  [
    "dashTo",
    "kanbanTo",
    "mineTo",
    "reportTo"
  ].forEach(id => {

    if ($(id)) {
      $(id).value = t;
    }

  });

}


/* LOGIN */

$("loginForm").addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    $("loginError").textContent = "";

    const email =
      $("loginEmail").value.trim();

    const password =
      $("loginPassword").value;

    try {

      await auth.signInWithEmailAndPassword(
        email,
        password
      );

    } catch (error) {

      console.error(error);

      $("loginError").textContent =
        "E-mail ou senha inválidos.";

    }

  }
);


/* LOGOUT */

$("logoutBtn").onclick = () => {

  auth.signOut();

};


/* ATUALIZAR */

$("refreshBtn").onclick = () => {

  loadData();

};


/* =========================================================
   NAVEGAÇÃO
========================================================= */

document
  .querySelectorAll(".nav-btn")
  .forEach(button => {

    button.onclick = () => {

      document
        .querySelectorAll(".nav-btn")
        .forEach(btn =>
          btn.classList.remove("active")
        );

      button.classList.add("active");

      document
        .querySelectorAll(".view")
        .forEach(view =>
          view.classList.add("hidden")
        );

      const view =
        $("view-" + button.dataset.view);

      if (view) {
        view.classList.remove("hidden");
      }

      $("pageTitle").textContent =
        button.textContent.trim();

      switch (button.dataset.view) {

        case "dashboard":
          renderDashboard();
          break;

        case "kanban":
          renderKanban();
          break;

        case "meus-lotes":
          renderMine();
          break;

        case "colaboradores":
          renderUsers();
          break;

        case "relatorio":
          renderReport();
          break;

      }

    };

  });


/* =========================================================
   CARREGAR DADOS
========================================================= */

async function loadData() {

  try {

    const [
      lotsSnap,
      usersSnap
    ] = await Promise.all([

      db.collection("lots").get(),

      db.collection("users").get()

    ]);

    allLots =
      lotsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    allUsers =
      usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    fillUserSelects();

    renderDashboard();

    renderKanban();

    renderMine();

    renderReport();

    renderUsers();

  } catch (error) {

    console.error(
      "Erro ao carregar dados:",
      error
    );

    alert(
      "Erro ao carregar dados do Firebase: " +
      error.message
    );

  }

}


/* =========================================================
   SELECTS
========================================================= */

function fillUserSelects() {

  const activeUsers =
    allUsers.filter(
      user => user.active !== false
    );

  $("kanbanCollaborator").innerHTML =
    `<option value="">Todos</option>` +
    activeUsers
      .map(user =>
        `<option value="${escapeHtml(user.id)}">
          ${escapeHtml(user.name || "Sem nome")}
        </option>`
      )
      .join("");

  $("reportUser").innerHTML =
    `<option value="">
      Todos os colaboradores
    </option>` +
    activeUsers
      .map(user =>
        `<option value="${escapeHtml(user.id)}">
          ${escapeHtml(user.name || "Sem nome")}
        </option>`
      )
      .join("");

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

  const lots =
    dateRange(
      $("dashFrom").value,
      $("dashTo").value
    );

  const visible =
    roleIsAdmin()
      ? lots
      : lots.filter(
          lot =>
            lot.assignedTo === currentUser.uid
        );

  const planned =
    visible.reduce(
      (total, lot) =>
        total + Number(lot.weight || 0),
      0
    );

  const produced =
    visible.reduce(
      (total, lot) =>
        total + lotProduced(lot),
      0
    );

  const remaining =
    visible.reduce(
      (total, lot) =>
        total + lotRemaining(lot),
      0
    );

  const done =
    visible.filter(
      lot =>
        lotStatus(lot) === "finalizado"
    ).length;


  $("dashboardCards").innerHTML = [

    [
      "Peso programado",
      kg(planned)
    ],

    [
      "Peso produzido",
      kg(produced)
    ],

    [
      "Saldo",
      kg(remaining)
    ],

    [
      "Lotes finalizados",
      done
    ]

  ].map(item => `

    <div class="card">

      <small>${item[0]}</small>

      <strong>${item[1]}</strong>

    </div>

  `).join("");


  const by = {};


  visible.forEach(lot => {

    const user =
      allUsers.find(
        x => x.id === lot.assignedTo
      );

    const name =
      user?.name ||
      "Não atribuído";

    const key =
      `${lot.programDate}|${name}`;

    if (!by[key]) {

      by[key] = {

        date: lot.programDate,

        name,

        weight: 0,

        clients: new Set(),

        lots: 0

      };

    }

    by[key].weight +=
      lotProduced(lot);

    by[key].clients.add(
      lot.clientName ||
      lot.name ||
      "Sem cliente"
    );

    by[key].lots++;

  });


  const rows =
    Object.values(by)
      .sort((a, b) => {

        return (
          a.date.localeCompare(b.date) ||
          a.name.localeCompare(b.name)
        );

      });


  $("dailyCollaboratorTable").innerHTML = `

    <div class="table-wrap">

      <table class="data-table">

        <thead>

          <tr>

            <th>Data</th>
            <th>Colaborador</th>
            <th>Peso do dia</th>
            <th>Clientes</th>
            <th>Lotes</th>

          </tr>

        </thead>

        <tbody>

          ${
            rows.length

              ? rows.map(row => `

                  <tr>

                    <td>
                      ${dateBR(row.date)}
                    </td>

                    <td>
                      ${escapeHtml(row.name)}
                    </td>

                    <td>
                      ${kg(row.weight)}
                    </td>

                    <td>
                      ${escapeHtml(
                        [...row.clients].join(", ")
                      )}
                    </td>

                    <td>
                      ${row.lots}
                    </td>

                  </tr>

                `).join("")

              : `
                <tr>
                  <td colspan="5">
                    Sem dados.
                  </td>
                </tr>
              `
          }

        </tbody>

      </table>

    </div>

  `;


  const statuses = [
    "pendente",
    "producao",
    "finalizado"
  ];


  $("statusSummary").innerHTML = `

    <div class="status-table">

      ${
        statuses.map(status => `

          <div class="status-item">

            <span>
              ${statusLabel(status)}
            </span>

            <strong>
              ${
                visible.filter(
                  lot =>
                    lotStatus(lot) === status
                ).length
              }
            </strong>

          </div>

        `).join("")
      }

    </div>

  `;

}


$("dashFilterBtn").onclick =
  renderDashboard;


/* =========================================================
   KANBAN
========================================================= */

function lotCard(lot) {

  const user =
    allUsers.find(
      x => x.id === lot.assignedTo
    );

  const status =
    lotStatus(lot);

  const percent =
    lotPercent(lot);

  return `

    <div
      class="lot-card"
      onclick="openLot('${lot.id}')">

      <span class="lot-status">
        ${statusLabel(status)}
      </span>

      <h4>
        ${escapeHtml(lot.name || "Sem nome")}
      </h4>

      <div class="lot-info">

        <strong>
          OS:
        </strong>

        ${escapeHtml(lot.os || "—")}

        <br>

        <strong>
          Peso:
        </strong>

        ${kg(lot.weight)}

        <br>

        <strong>
          Programação:
        </strong>

        ${dateBR(lot.programDate)}

        <br>

        <strong>
          Responsável:
        </strong>

        ${escapeHtml(
          user?.name || "—"
        )}

      </div>

      <div class="progress">

        <div
          class="progress-bar"
          style="width:${percent}%">
        </div>

      </div>

      <div class="lot-info">

        ${kg(lotProduced(lot))}
        produzido

        • ${pct(percent)}

      </div>

    </div>

  `;

}


function renderKanban() {

  let lots =
    dateRange(
      $("kanbanFrom").value,
      $("kanbanTo").value
    );

  const uid =
    $("kanbanCollaborator").value;

  if (uid) {

    lots =
      lots.filter(
        lot =>
          lot.assignedTo === uid
      );

  }

  if (!roleIsAdmin()) {

    lots =
      lots.filter(
        lot =>
          lot.assignedTo ===
          currentUser.uid
      );

  }

  renderKanbanInto(
    "kanban",
    lots
  );

}


function renderMine() {

  const lots =
    dateRange(
      $("mineFrom").value,
      $("mineTo").value
    ).filter(
      lot =>
        lot.assignedTo ===
        currentUser.uid
    );

  renderKanbanInto(
    "mineKanban",
    lots
  );

}


function renderKanbanInto(
  elementId,
  lots
) {

  const columns = [

    [
      "pendente",
      "A FAZER"
    ],

    [
      "producao",
      "EM PRODUÇÃO"
    ],

    [
      "finalizado",
      "FINALIZADO"
    ],

    [
      "cancelado",
      "CANCELADOS"
    ]

  ];


  $(elementId).innerHTML =
    columns.map(
      ([status, title]) => {

        const list =
          lots.filter(
            lot =>
              lotStatus(lot) ===
              status
          );

        return `

          <div class="kanban-column">

            <h3>

              <span>
                ${title}
              </span>

              <span class="badge">
                ${list.length}
              </span>

            </h3>

            ${
              list.length
                ? list.map(lotCard).join("")
                : `
                  <div
                    style="
                      text-align:center;
                      color:#9ca3af;
                      font-size:12px;
                      padding:30px 10px;
                    ">
                    Nenhum lote
                  </div>
                `
            }

          </div>

        `;

      }
    ).join("");

}


$("kanbanFilterBtn").onclick =
  renderKanban;

$("mineFilterBtn").onclick =
  renderMine;


/* =========================================================
   MODAL LOTE
========================================================= */

window.openLot = async function(id) {

  const lot = allLots.find(item => item.id === id);

  if (!lot) {
    alert("Lote não encontrado.");
    return;
  }

  const user = allUsers.find(item => item.id === lot.assignedTo);
  const mine = lot.assignedTo === currentUser.uid;
  const canEditProduction = roleIsAdmin() || mine;

  const collaborators = allUsers.filter(
    u => u.role === "colaborador" && u.active !== false
  );

  $("lotModalContent").innerHTML = `

    ${
      roleIsAdmin()
        ? `
          <form id="adminLotEditForm" class="form-grid">

            <h2 class="full">
              ✏️ Editar lote
            </h2>

            <label>
              Nome do lote
              <input
                id="adminEditName"
                type="text"
                value="${escapeHtml(lot.name || "")}"
                required>
            </label>

            <label>
              Número da OS
              <input
                id="adminEditOs"
                type="text"
                value="${escapeHtml(lot.os || "")}"
                required>
            </label>

            <label>
              Cliente
              <input
                id="adminEditClient"
                type="text"
                value="${escapeHtml(lot.clientName || "")}"
                required>
            </label>

            <label>
              Peso do lote (kg)
              <input
                id="adminEditWeight"
                type="number"
                min="0.001"
                step="0.001"
                value="${Number(lot.weight || 0)}"
                required>
            </label>

            <label>
              Data de entrada
              <input
                id="adminEditEntry"
                type="date"
                value="${escapeHtml(lot.entryDate || "")}"
                required>
            </label>

            <label>
              Data de programação
              <input
                id="adminEditProgram"
                type="date"
                value="${escapeHtml(lot.programDate || "")}"
                required>
            </label>

            <label>
              Colaborador responsável
              <select id="adminEditAssigned" required>
                <option value="">Selecione</option>
                ${
                  collaborators.map(u => `
                    <option
                      value="${escapeHtml(u.id)}"
                      ${u.id === lot.assignedTo ? "selected" : ""}>
                      ${escapeHtml(u.name || u.email || "Sem nome")}
                    </option>
                  `).join("")
                }
              </select>
            </label>

            <label>
              Status
              <select id="adminEditStatus">
                <option value="pendente"
                  ${lotStatus(lot) === "pendente" ? "selected" : ""}>
                  Pendente
                </option>
                <option value="producao"
                  ${lotStatus(lot) === "producao" ? "selected" : ""}>
                  Em produção
                </option>
                <option value="finalizado"
                  ${lotStatus(lot) === "finalizado" ? "selected" : ""}>
                  Finalizado
                </option>
                <option value="cancelado"
                  ${lotStatus(lot) === "cancelado" ? "selected" : ""}>
                  Cancelado
                </option>
              </select>
            </label>

            <div class="full" style="
              padding:12px;
              border:1px solid #d1d5db;
              border-radius:8px;
              margin-top:4px;
            ">
              <strong>Produzido:</strong> ${kg(lotProduced(lot))}
              &nbsp; | &nbsp;
              <strong>Saldo:</strong> ${kg(lotRemaining(lot))}
              &nbsp; | &nbsp;
              <strong>Realização:</strong> ${pct(lotPercent(lot))}
            </div>

            <div class="full">
              <button
                id="adminSaveLot"
                type="submit"
                class="primary">
                💾 SALVAR ALTERAÇÕES
              </button>

              <div
                id="adminEditMessage"
                style="margin-top:10px;font-weight:600;">
              </div>
            </div>

          </form>
        `
        : `
          <h2>${escapeHtml(lot.name || "Lote")}</h2>

          <div class="modal-grid">

            <div>
              <small>OS</small>
              <strong>${escapeHtml(lot.os || "—")}</strong>
            </div>

            <div>
              <small>Cliente</small>
              <strong>${escapeHtml(lot.clientName || "—")}</strong>
            </div>

            <div>
              <small>Peso do lote</small>
              <strong>${kg(lot.weight)}</strong>
            </div>

            <div>
              <small>Produzido</small>
              <strong>${kg(lotProduced(lot))}</strong>
            </div>

            <div>
              <small>Saldo</small>
              <strong>${kg(lotRemaining(lot))}</strong>
            </div>

            <div>
              <small>Data entrada</small>
              <strong>${dateBR(lot.entryDate)}</strong>
            </div>

            <div>
              <small>Programação</small>
              <strong>${dateBR(lot.programDate)}</strong>
            </div>

            <div>
              <small>Responsável</small>
              <strong>${escapeHtml(user?.name || "—")}</strong>
            </div>

            <div>
              <small>Status</small>
              <strong>${statusLabel(lotStatus(lot))}</strong>
            </div>

            <div>
              <small>Percentual</small>
              <strong>${pct(lotPercent(lot))}</strong>
            </div>

          </div>
        `
    }

    ${
      canEditProduction
        ? `
          <form id="productionForm" class="production-form">

            <strong>Registrar produção</strong>

            <label>
              Peso produzido agora (kg)
              <input
                id="productionInput"
                type="number"
                step="0.001"
                min="0.001"
                required>
            </label>

            <label>
              Observação
              <textarea
                id="productionObs"
                rows="3"
                placeholder="Observação opcional"></textarea>
            </label>

            <button
              type="submit"
              class="primary">
              Registrar produção
            </button>

          </form>
        `
        : ""
    }

    <div class="modal-actions">

      ${
        roleIsAdmin()
          ? `
            <button
              type="button"
              class="secondary"
              onclick="redistributeLot('${lot.id}')">
              Redistribuir lote
            </button>
          `
          : ""
      }

      <button
        type="button"
        class="secondary"
        onclick="closeLotModal()">
        Fechar
      </button>

    </div>

    <div id="modalMessage"></div>
  `;

  $("lotModal").classList.remove("hidden");

  // ============================================================
  // SALVAR EDIÇÃO COMPLETA DO LOTE
  // ============================================================
  if (roleIsAdmin() && $("adminLotEditForm")) {

    $("adminLotEditForm").onsubmit = async function(event) {

      event.preventDefault();

      const save = $("adminSaveLot");
      const msg = $("adminEditMessage");

      save.disabled = true;
      save.textContent = "Salvando...";
      msg.textContent = "";

      try {

        const name = $("adminEditName").value.trim();
        const os = $("adminEditOs").value.trim();
        const clientName = $("adminEditClient").value.trim();
        const weight = Number($("adminEditWeight").value);
        const entryDate = $("adminEditEntry").value;
        const programDate = $("adminEditProgram").value;
        const assignedTo = $("adminEditAssigned").value;
        const status = $("adminEditStatus").value;

        if (!name) throw new Error("Informe o nome do lote.");
        if (!os) throw new Error("Informe o número da OS.");
        if (!clientName) throw new Error("Informe o cliente.");
        if (!Number.isFinite(weight) || weight <= 0) {
          throw new Error("Informe um peso válido.");
        }
        if (!entryDate) throw new Error("Informe a data de entrada.");
        if (!programDate) {
          throw new Error("Informe a data de programação.");
        }
        if (!assignedTo) {
          throw new Error("Selecione o colaborador.");
        }

        const produced = lotProduced(lot);

        if (weight < produced) {
          throw new Error(
            "O peso do lote não pode ser menor que o já produzido: " +
            kg(produced)
          );
        }

        const updateData = {
          name,
          os,
          clientName,
          weight,
          entryDate,
          programDate,
          assignedTo,
          status,
          updatedAt:
            firebase.firestore.FieldValue.serverTimestamp()
        };

        // Grava DIRETAMENTE no documento do lote que foi aberto.
        await db.collection("lots").doc(lot.id).update(updateData);

        // Atualiza a cópia local imediatamente.
        Object.assign(lot, updateData);

        msg.textContent = "✓ Lote atualizado com sucesso.";
        save.textContent = "✓ SALVO";

        // Recarrega do Firestore para confirmar o valor persistido.
        await loadData();

        const savedLot = allLots.find(item => item.id === lot.id);

        if (savedLot) {
          // Reabre o mesmo documento usando os dados recém-lidos.
          window.openLot(savedLot.id);
        }

      } catch (error) {

        console.error("Erro ao editar lote:", error);

        msg.textContent =
          "❌ " + (error?.message || "Não foi possível salvar.");

        save.disabled = false;
        save.textContent = "💾 SALVAR ALTERAÇÕES";
      }
    };
  }

  if (canEditProduction && $("productionForm")) {
    $("productionForm").onsubmit =
      event => registerProduction(event, lot);
  }
};


window.closeLotModal = function() {

  $("lotModal")
    .classList
    .add("hidden");

};


/* Fechar clicando fora */

$("lotModal").addEventListener(
  "click",
  event => {

    if (
      event.target ===
      $("lotModal")
    ) {

      closeLotModal();

    }

  }
);


/* =========================================================
   REGISTRAR PRODUÇÃO
========================================================= */

async function registerProduction(
  event,
  lot
) {

  event.preventDefault();

  const amount =
    Number(
      $("productionInput").value || 0
    );

  if (amount <= 0) {

    $("modalMessage").textContent =
      "Informe um peso maior que zero.";

    return;

  }


  if (
    lotProduced(lot) +
    amount >
    Number(lot.weight) +
    0.0001
  ) {

    $("modalMessage").textContent =
      "O peso produzido ultrapassa o peso do lote.";

    return;

  }


  const now =
    firebase.firestore
      .FieldValue
      .serverTimestamp();


  const observation =
    $("productionObs")
      .value
      .trim();


  try {

    await db.runTransaction(
      async transaction => {

        const ref =
          db.collection("lots")
            .doc(lot.id);

        const snap =
          await transaction.get(ref);

        if (!snap.exists) {

          throw new Error(
            "Lote não encontrado."
          );

        }


        const data =
          snap.data();


        const current =
          Number(
            data.producedWeight || 0
          );


        const weight =
          Number(
            data.weight || 0
          );


        const next =
          current + amount;


        const newStatus =
          next >= weight - 0.0001
            ? "finalizado"
            : "producao";


        const productionLog = {

          weight: amount,

          obs: observation,

          userId:
            currentUser.uid,

          at:
            new Date()

        };


        transaction.update(
          ref,
          {

            producedWeight:
              next,

            status:
              newStatus,

            updatedAt:
              now,

            lastObservation:
              observation,

            productionLogs:
              firebase.firestore
                .FieldValue
                .arrayUnion(
                  productionLog
                )

          }
        );

      }
    );


    closeLotModal();

    await loadData();


  } catch (error) {

    console.error(error);

    $("modalMessage").textContent =
      error.message ||
      "Erro ao registrar produção.";

  }

}


/* =========================================================
   CADASTRAR LOTE
========================================================= */

$("lotForm").addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    $("lotFormMessage").textContent = "";

    const weight =
      Number(
        $("lotWeight").value
      );

    if (weight <= 0) {

      $("lotFormMessage")
        .className = "error";

      $("lotFormMessage")
        .textContent =
        "Informe um peso válido.";

      return;

    }


    try {

      const activeUsers =
        allUsers.filter(
          user =>
            user.active !== false &&
            user.role ===
              "colaborador"
        );


      if (!activeUsers.length) {

        throw new Error(
          "Não existem colaboradores ativos para distribuição."
        );

      }


      const loads = {};


      allLots.forEach(lot => {

        if (
          [
            "pendente",
            "producao"
          ].includes(
            lotStatus(lot)
          )
        ) {

          loads[lot.assignedTo] =
            (
              loads[lot.assignedTo] ||
              0
            ) +
            lotRemaining(lot);

        }

      });


      activeUsers.sort(
        (a, b) =>
          (
            loads[a.id] || 0
          ) -
          (
            loads[b.id] || 0
          )
      );


      const chosen =
        activeUsers[0];


      const ref =
        db.collection("lots").doc();


      const data = {

        name:
          $("lotName")
            .value
            .trim(),

        os:
          $("lotOs")
            .value
            .trim(),

        weight,

        entryDate:
          $("lotEntry").value,

        programDate:
          $("lotProgram").value,

        assignedTo:
          chosen.id,

        producedWeight:
          0,

        status:
          "pendente",

        clientName:
          $("lotName")
            .value
            .trim(),

        createdBy:
          currentUser.uid,

        createdAt:
          firebase.firestore
            .FieldValue
            .serverTimestamp(),

        updatedAt:
          firebase.firestore
            .FieldValue
            .serverTimestamp()

      };


      await ref.set(data);


      $("lotFormMessage")
        .className = "success";


      $("lotFormMessage")
        .textContent =
        `Lote distribuído para ${chosen.name}. ` +
        `Carga pendente atual: ${
          kg(loads[chosen.id] || 0)
        }.`;

      event.target.reset();

      await loadData();


    } catch (error) {

      console.error(error);

      $("lotFormMessage")
        .className = "error";

      $("lotFormMessage")
        .textContent =
        error.message ||
        "Erro ao cadastrar lote.";

    }

  }
);


/* =========================================================
   REDISTRIBUIR LOTE
========================================================= */

window.redistributeLot =
  async function(id) {

    if (!roleIsAdmin()) {

      return;

    }


    const activeUsers =
      allUsers.filter(
        user =>
          user.active !== false &&
          user.role ===
            "colaborador"
      );


    const lot =
      allLots.find(
        item => item.id === id
      );


    if (
      !lot ||
      !activeUsers.length
    ) {

      return;

    }


    const loads = {};


    allLots.forEach(item => {

      if (
        item.id !== id &&
        [
          "pendente",
          "producao"
        ].includes(
          lotStatus(item)
        )
      ) {

        loads[item.assignedTo] =
          (
            loads[item.assignedTo] ||
            0
          ) +
          lotRemaining(item);

      }

    });


    activeUsers.sort(
      (a, b) =>
        (
          loads[a.id] || 0
        ) -
        (
          loads[b.id] || 0
        )
    );


    const chosen =
      activeUsers[0];


    await db
      .collection("lots")
      .doc(id)
      .update({

        assignedTo:
          chosen.id,

        updatedAt:
          firebase.firestore
            .FieldValue
            .serverTimestamp()

      });


    closeLotModal();

    await loadData();

  };


/* =========================================================
   RELATÓRIO
========================================================= */

function renderReport() {

  let lots =
    dateRange(
      $("reportFrom").value,
      $("reportTo").value
    );


  const uid =
    $("reportUser").value;


  if (uid) {

    lots =
      lots.filter(
        lot =>
          lot.assignedTo === uid
      );

  }


  if (!roleIsAdmin()) {

    lots =
      lots.filter(
        lot =>
          lot.assignedTo ===
          currentUser.uid
      );

  }


  const planned =
    lots.reduce(
      (total, lot) =>
        total +
        Number(lot.weight || 0),
      0
    );


  const produced =
    lots.reduce(
      (total, lot) =>
        total +
        lotProduced(lot),
      0
    );


  const clients =
    new Set(
      lots
        .map(
          lot =>
            lot.clientName ||
            lot.name
        )
        .filter(Boolean)
    );


  $("reportSummary").innerHTML = [

    [
      "Programado",
      kg(planned)
    ],

    [
      "Produzido",
      kg(produced)
    ],

    [
      "Saldo",
      kg(planned - produced)
    ],

    [
      "Realização",
      pct(
        planned
          ? produced / planned * 100
          : 0
      )
    ],

    [
      "Clientes",
      clients.size
    ]

  ].map(item => `

    <div class="card">

      <small>
        ${item[0]}
      </small>

      <strong>
        ${item[1]}
      </strong>

    </div>

  `).join("");


  const by = {};


  lots.forEach(lot => {

    const user =
      allUsers.find(
        x =>
          x.id ===
          lot.assignedTo
      );


    const key =
      `${lot.programDate}|${lot.assignedTo}`;


    if (!by[key]) {

      by[key] = {

        date:
          lot.programDate,

        user:
          user?.name || "—",

        produced:
          0,

        planned:
          0,

        clients:
          new Set(),

        lots:
          0

      };

    }


    by[key].planned +=
      Number(lot.weight || 0);


    by[key].produced +=
      lotProduced(lot);


    by[key].clients.add(
      lot.clientName ||
      lot.name ||
      "Sem cliente"
    );


    by[key].lots++;

  });


  const rows =
    Object.values(by)
      .sort((a, b) => {

        return (
          a.date.localeCompare(
            b.date
          ) ||
          a.user.localeCompare(
            b.user
          )
        );

      });


  $("reportByCollaborator").innerHTML = `

    <h3>
      Produção por colaborador e por dia
    </h3>

    <div class="table-wrap">

      <table class="data-table">

        <thead>

          <tr>

            <th>Data</th>

            <th>Colaborador</th>

            <th>Peso do dia</th>

            <th>Programado</th>

            <th>Clientes</th>

            <th>Lotes</th>

          </tr>

        </thead>

        <tbody>

          ${
            rows.length

              ? rows.map(row => `

                  <tr>

                    <td>
                      ${dateBR(row.date)}
                    </td>

                    <td>
                      ${escapeHtml(row.user)}
                    </td>

                    <td>
                      ${kg(row.produced)}
                    </td>

                    <td>
                      ${kg(row.planned)}
                    </td>

                    <td>
                      ${escapeHtml(
                        [...row.clients]
                          .join(", ")
                      )}
                    </td>

                    <td>
                      ${row.lots}
                    </td>

                  </tr>

                `).join("")

              : `

                <tr>

                  <td colspan="6">
                    Sem dados.
                  </td>

                </tr>

              `
          }

        </tbody>

      </table>

    </div>

  `;


  $("reportDetails").innerHTML = `

    <h3>
      Detalhamento dos lotes
    </h3>

    <div class="table-wrap">

      <table class="data-table">

        <thead>

          <tr>

            <th>Programação</th>

            <th>OS</th>

            <th>Lote</th>

            <th>Colaborador</th>

            <th>Peso</th>

            <th>Produzido</th>

            <th>Saldo</th>

            <th>Status</th>

          </tr>

        </thead>

        <tbody>

          ${
            lots.length

              ? [...lots]
                  .sort(
                    (a, b) =>
                      (
                        a.programDate || ""
                      ).localeCompare(
                        b.programDate || ""
                      )
                  )
                  .map(lot => {

                    const user =
                      allUsers.find(
                        x =>
                          x.id ===
                          lot.assignedTo
                      );

                    return `

                      <tr>

                        <td>
                          ${dateBR(
                            lot.programDate
                          )}
                        </td>

                        <td>
                          ${escapeHtml(
                            lot.os || "—"
                          )}
                        </td>

                        <td>
                          ${escapeHtml(
                            lot.name || "—"
                          )}
                        </td>

                        <td>
                          ${escapeHtml(
                            user?.name || "—"
                          )}
                        </td>

                        <td>
                          ${kg(lot.weight)}
                        </td>

                        <td>
                          ${kg(
                            lotProduced(lot)
                          )}
                        </td>

                        <td>
                          ${kg(
                            lotRemaining(lot)
                          )}
                        </td>

                        <td>
                          ${statusLabel(
                            lotStatus(lot)
                          )}
                        </td>

                      </tr>

                    `;

                  })
                  .join("")

              : `

                <tr>

                  <td colspan="8">
                    Sem dados.
                  </td>

                </tr>

              `
          }

        </tbody>

      </table>

    </div>

  `;

}


$("reportFilterBtn").onclick =
  renderReport;


/* =========================================================
   PDF
========================================================= */


/* =========================================================
   PDF PROFISSIONAL — VERSÃO REVISADA
   - carregamento robusto do jsPDF/AutoTable
   - médias por colaborador e por período
   - gráficos
   - detalhamento dos lotes
   - cabeçalho/rodapé
========================================================= */

function reportPeriodDays(from, to) {
  if (!from || !to) return 1;
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  const days = Math.floor((b - a) / 86400000) + 1;
  return Math.max(1, days);
}

function buildPerformance(lots, from, to) {
  const periodDays = reportPeriodDays(from, to);
  const byUser = {};
  const byDay = {};

  (lots || []).forEach(lot => {
    const produced = lotProduced(lot);
    const planned = Number(lot.weight || 0);
    const day = lot.programDate || lot.entryDate || "";
    const uid = lot.assignedTo || "sem-colaborador";
    const user = allUsers.find(u => u.id === uid);

    if (!byUser[uid]) {
      byUser[uid] = {
        name: user?.name || "Sem colaborador",
        planned: 0,
        produced: 0,
        lots: 0,
        days: new Set(),
        clients: new Set()
      };
    }

    byUser[uid].planned += planned;
    byUser[uid].produced += produced;
    byUser[uid].lots++;

    if (produced > 0 && day) {
      byUser[uid].days.add(day);
    }

    const client = lot.clientName || lot.name || "";
    if (client) byUser[uid].clients.add(client);

    if (day) {
      if (!byDay[day]) {
        byDay[day] = {
          planned: 0,
          produced: 0,
          lots: 0
        };
      }
      byDay[day].planned += planned;
      byDay[day].produced += produced;
      byDay[day].lots++;
    }
  });

  const users = Object.values(byUser)
    .map(row => ({
      ...row,
      workedDays: row.days.size,
      averagePerWorkedDay:
        row.days.size ? row.produced / row.days.size : 0,
      averagePerPeriodDay:
        row.produced / periodDays,
      realization:
        row.planned ? (row.produced / row.planned) * 100 : 0,
      clientCount: row.clients.size
    }))
    .sort((a, b) => b.produced - a.produced);

  const days = Object.keys(byDay)
    .sort()
    .map(date => ({
      date,
      planned: byDay[date].planned,
      produced: byDay[date].produced,
      lots: byDay[date].lots,
      average: byDay[date].produced,
      realization:
        byDay[date].planned
          ? (byDay[date].produced / byDay[date].planned) * 100
          : 0
    }));

  const totalPlanned = (lots || []).reduce(
    (sum, lot) => sum + Number(lot.weight || 0),
    0
  );

  const totalProduced = (lots || []).reduce(
    (sum, lot) => sum + lotProduced(lot),
    0
  );

  const collaboratorAverage =
    users.length ? totalProduced / users.length : 0;

  return {
    periodDays,
    users,
    days,
    totalPlanned,
    totalProduced,
    averagePerPeriodDay: totalProduced / periodDays,
    collaboratorAverage,
    realization:
      totalPlanned
        ? (totalProduced / totalPlanned) * 100
        : 0
  };
}


/* Carrega as bibliotecas novamente se algum CDN falhar. */
function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-reluz-pdf="${src}"]`
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(
        new Error(`Falha ao carregar ${src}`)
      ), { once: true });

      if (
        (src.includes("jspdf.umd") && window.jspdf?.jsPDF) ||
        (src.includes("autotable") && window.jspdf?.jsPDF?.prototype?.autoTable)
      ) {
        resolve();
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.reluzPdf = src;

    script.onload = () => resolve();
    script.onerror = () => reject(
      new Error(`Falha ao carregar a biblioteca do PDF.`)
    );

    document.head.appendChild(script);
  });
}

async function ensurePdfLibraries() {
  if (!window.jspdf?.jsPDF) {
    const jsPdfUrls = [
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js"
    ];

    let loaded = false;

    for (const url of jsPdfUrls) {
      try {
        await loadExternalScript(url);
        if (window.jspdf?.jsPDF) {
          loaded = true;
          break;
        }
      } catch (error) {
        console.warn(error);
      }
    }

    if (!loaded) {
      throw new Error(
        "A biblioteca jsPDF não carregou. Verifique a internet e recarregue a página."
      );
    }
  }

  let test = new window.jspdf.jsPDF();

  if (typeof test.autoTable !== "function") {
    const tableUrls = [
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
      "https://unpkg.com/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js"
    ];

    let loaded = false;

    for (const url of tableUrls) {
      try {
        await loadExternalScript(url);
        test = new window.jspdf.jsPDF();

        if (typeof test.autoTable === "function") {
          loaded = true;
          break;
        }
      } catch (error) {
        console.warn(error);
      }
    }

    if (!loaded) {
      throw new Error(
        "A biblioteca de tabelas do PDF não carregou. Recarregue a página."
      );
    }
  }

  return true;
}


function pdfBase(title, from, to) {
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true
  });

  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(247, 250, 253);
  doc.rect(0, 0, W, 210, "F");

  doc.setFillColor(7, 25, 42);
  doc.rect(0, 0, W, 29, "F");

  doc.setFillColor(42, 194, 229);
  doc.rect(0, 28.2, W, 0.8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text(String(title).slice(0, 70), 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(191, 222, 236);
  doc.text(
    `Período: ${dateBR(from)} a ${dateBR(to)}`,
    14,
    20
  );

  doc.setTextColor(132, 226, 249);
  doc.setFont("helvetica", "bold");
  doc.text(
    `RELÜZ • PRODUÇÃO`,
    W - 14,
    20,
    { align: "right" }
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(115, 140, 156);
  doc.text(
    `Gerado em ${new Date().toLocaleString("pt-BR")}`,
    W - 14,
    25,
    { align: "right" }
  );

  return doc;
}


function pdfPageHeader(doc, title) {
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(7, 25, 42);
  doc.rect(0, 0, W, 20, "F");

  doc.setFillColor(42, 194, 229);
  doc.rect(0, 19.2, W, 0.8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(String(title).slice(0, 80), 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(160, 205, 221);
  doc.text("RELÜZ • PRODUÇÃO", W - 14, 12, { align: "right" });
}


function pdfFooter(doc) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  doc.setFillColor(7, 25, 42);
  doc.rect(0, H - 10, W, 10, "F");

  doc.setDrawColor(42, 194, 229);
  doc.setLineWidth(0.25);
  doc.line(12, H - 10, W - 12, H - 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(185, 210, 222);
  doc.text(
    "RELÜZ PRODUÇÃO • RELATÓRIO DE DESEMPENHO",
    12,
    H - 4
  );

  doc.text(
    `Página ${doc.internal.getCurrentPageInfo().pageNumber}`,
    W - 12,
    H - 4,
    { align: "right" }
  );
}


function pdfCard(doc, x, y, w, title, value, accent = [23, 157, 198]) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(201, 216, 226);
  doc.roundedRect(x, y, w, 21, 3, 3, "FD");

  doc.setFillColor(...accent);
  doc.roundedRect(x + 3, y + 3, 1.6, 15, 0.7, 0.7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(79, 105, 123);
  doc.text(String(title).toUpperCase(), x + 8, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(10, 37, 58);
  doc.text(String(value), x + 8, y + 16.5);
}


function pdfBarChart(doc, title, labels, values, y = 55, height = 58) {
  const x = 14;
  const W = 269;
  const left = x + 61;
  const chartW = W - 82;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(17, 48, 68);
  doc.text(title, x, y - 7);

  if (!labels.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(105, 128, 145);
    doc.text("Sem dados no período.", x, y + 10);
    return;
  }

  const max = Math.max(...values.map(v => Number(v) || 0), 1);
  const rowH = Math.min(11.5, height / labels.length);

  labels.forEach((label, i) => {
    const yy = y + i * rowH;
    const value = Number(values[i]) || 0;

    let text = String(label || "Sem nome");
    if (text.length > 31) text = text.slice(0, 30) + "…";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);
    doc.setTextColor(64, 88, 106);
    doc.text(text, x, yy + 5);

    doc.setFillColor(225, 235, 242);
    doc.roundedRect(left, yy + 1, chartW, 5.5, 1.3, 1.3, "F");

    doc.setFillColor(24, 166, 205);
    doc.roundedRect(
      left,
      yy + 1,
      Math.max(0.8, (value / max) * chartW),
      5.5,
      1.3,
      1.3,
      "F"
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.3);
    doc.setTextColor(17, 48, 68);
    doc.text(
      kg(value),
      left + chartW + 2,
      yy + 5.2
    );
  });
}


function pdfLineChart(doc, title, labels, values, y = 42, height = 67) {
  const x = 14;
  const W = 269;
  const left = x + 30;
  const chartW = W - 44;
  const top = y;
  const chartH = height;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(17, 48, 68);
  doc.text(title, x, y - 7);

  if (!labels.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(105, 128, 145);
    doc.text("Sem dados no período.", x, y + 10);
    return;
  }

  const max = Math.max(...values.map(v => Number(v) || 0), 1);

  doc.setDrawColor(201, 216, 226);
  doc.line(left, top, left, top + chartH);
  doc.line(left, top + chartH, left + chartW, top + chartH);

  for (let i = 0; i <= 4; i++) {
    const gy = top + chartH - (i / 4) * chartH;

    doc.setDrawColor(226, 235, 241);
    doc.line(left, gy, left + chartW, gy);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.3);
    doc.setTextColor(104, 128, 145);
    doc.text(
      kg(max * i / 4),
      x,
      gy + 2
    );
  }

  const points = values.map((value, i) => {
    const px =
      labels.length === 1
        ? left + chartW / 2
        : left + (i / (labels.length - 1)) * chartW;

    const py =
      top +
      chartH -
      ((Number(value) || 0) / max) * chartH;

    return [px, py];
  });

  doc.setDrawColor(20, 155, 198);
  doc.setLineWidth(1);

  for (let i = 1; i < points.length; i++) {
    doc.line(
      points[i - 1][0],
      points[i - 1][1],
      points[i][0],
      points[i][1]
    );
  }

  points.forEach((point, i) => {
    doc.setFillColor(20, 155, 198);
    doc.circle(point[0], point[1], 1.4, "F");

    const step = Math.max(1, Math.ceil(labels.length / 10));

    if (
      labels.length <= 14 ||
      i === 0 ||
      i === labels.length - 1 ||
      i % step === 0
    ) {
      doc.setFontSize(5.2);
      doc.setTextColor(91, 115, 132);
      doc.text(
        dateBR(labels[i]),
        point[0] - 6,
        top + chartH + 7
      );
    }
  });
}


function pdfPercentChart(doc, title, labels, values, y = 42, height = 67) {
  const x = 14;
  const W = 269;
  const left = x + 63;
  const chartW = W - 83;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(17, 48, 68);
  doc.text(title, x, y - 7);

  if (!labels.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(105, 128, 145);
    doc.text("Sem dados no período.", x, y + 10);
    return;
  }

  const rowH = Math.min(11.5, height / labels.length);

  labels.forEach((label, i) => {
    const yy = y + i * rowH;
    const value = Math.max(
      0,
      Math.min(100, Number(values[i]) || 0)
    );

    let text = String(label || "Sem nome");
    if (text.length > 32) text = text.slice(0, 31) + "…";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);
    doc.setTextColor(64, 88, 106);
    doc.text(text, x, yy + 5);

    doc.setFillColor(225, 235, 242);
    doc.roundedRect(
      left,
      yy + 1,
      chartW,
      5.5,
      1.3,
      1.3,
      "F"
    );

    doc.setFillColor(89, 112, 222);
    doc.roundedRect(
      left,
      yy + 1,
      (value / 100) * chartW,
      5.5,
      1.3,
      1.3,
      "F"
    );

    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 48, 68);
    doc.text(
      pct(value),
      left + chartW + 2,
      yy + 5.2
    );
  });
}


function pdfTableTheme(options = {}) {
  return {
    styles: {
      fontSize: 6.7,
      cellPadding: 2.4,
      textColor: [35, 55, 70],
      fillColor: [255, 255, 255],
      lineColor: [205, 217, 226],
      lineWidth: 0.22,
      overflow: "linebreak",
      ...options.styles
    },

    headStyles: {
      fillColor: [8, 60, 82],
      textColor: [240, 250, 255],
      fontStyle: "bold",
      lineColor: [8, 60, 82],
      lineWidth: 0.3,
      ...options.headStyles
    },

    alternateRowStyles: {
      fillColor: [243, 248, 251]
    },

    margin: {
      left: 10,
      right: 10,
      top: 25,
      bottom: 14
    },

    didDrawPage: data => {
      pdfFooter(data.doc);
      if (options.didDrawPage) {
        options.didDrawPage(data);
      }
    },

    ...options
  };
}


function pdfRows(lots) {
  return (lots || []).map(lot => [
    dateBR(lot.programDate || lot.entryDate || ""),
    lot.os || "—",
    lot.name || "—",
    allUsers.find(u => u.id === lot.assignedTo)?.name || "—",
    kg(lot.weight || 0),
    kg(lotProduced(lot) || 0),
    kg(lotRemaining(lot) || 0),
    statusLabel(lotStatus(lot))
  ]);
}


function savePdf(doc, name) {
  const pages = doc.getNumberOfPages();

  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    pdfFooter(doc);
  }

  const safeName = String(name || "Relatorio")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_");

  doc.save(`${safeName}.pdf`);
}


function setPdfButtonBusy(button, busy) {
  if (!button) return;

  button.disabled = busy;

  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = "Gerando PDF...";
  } else if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
  }
}


/* =========================================================
   PDF GERAL
========================================================= */

if ($("pdfGeneralBtn")) {
  $("pdfGeneralBtn").onclick = async () => {
    const button = $("pdfGeneralBtn");
    setPdfButtonBusy(button, true);

    try {
      await ensurePdfLibraries();

      if (!roleIsAdmin()) {
        alert("Somente administradores podem gerar o PDF geral.");
        return;
      }

      const from = $("reportFrom").value;
      const to = $("reportTo").value;

      if (!from || !to) {
        alert("Informe a data inicial e a data final.");
        return;
      }

      if (from > to) {
        alert("A data inicial não pode ser maior que a data final.");
        return;
      }

      const lots = dateRange(from, to);
      const performance = buildPerformance(lots, from, to);

      const doc = pdfBase(
        "RELATÓRIO GERAL DE PRODUÇÃO",
        from,
        to
      );

      const W = doc.internal.pageSize.getWidth();

      pdfCard(
        doc, 14, 33, 58,
        "Produção total",
        kg(performance.totalProduced)
      );

      pdfCard(
        doc, 76, 33, 58,
        "Programado",
        kg(performance.totalPlanned)
      );

      pdfCard(
        doc, 138, 33, 58,
        "Média/dia período",
        kg(performance.averagePerPeriodDay)
      );

      pdfCard(
        doc, 200, 33, 42,
        "Média/colab.",
        kg(performance.collaboratorAverage)
      );

      pdfCard(
        doc, 246, 33, 37,
        "Realização",
        pct(performance.realization)
      );

      pdfBarChart(
        doc,
        "Produção por colaborador",
        performance.users.map(r => r.name),
        performance.users.map(r => r.produced),
        61,
        56
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(17, 48, 68);
      doc.text(
        `Período: ${performance.periodDays} dias • ${lots.length} lotes • ${performance.users.length} colaboradores`,
        14,
        122
      );

      doc.autoTable({
        startY: 126,
        head: [[
          "Colaborador",
          "Lotes",
          "Programado",
          "Produzido",
          "Dias trab.",
          "Média/dia trab.",
          "Média/dia período",
          "Realização"
        ]],

        body: performance.users.map(row => [
          row.name,
          row.lots,
          kg(row.planned),
          kg(row.produced),
          row.workedDays,
          kg(row.averagePerWorkedDay),
          kg(row.averagePerPeriodDay),
          pct(row.realization)
        ]),

        ...pdfTableTheme({
          styles: {
            fontSize: 6.3
          }
        })
      });

      doc.addPage();
      pdfPageHeader(doc, "ANÁLISE DE DESEMPENHO");

      pdfLineChart(
        doc,
        "Produção diária",
        performance.days.map(r => r.date),
        performance.days.map(r => r.produced),
        34,
        70
      );

      pdfPercentChart(
        doc,
        "Realização por colaborador",
        performance.users.map(r => r.name),
        performance.users.map(r => r.realization),
        120,
        58
      );

      doc.autoTable({
        startY: 184,
        head: [[
          "Data",
          "Programado",
          "Produzido",
          "Média do dia",
          "Realização",
          "Lotes"
        ]],

        body: performance.days.map(row => [
          dateBR(row.date),
          kg(row.planned),
          kg(row.produced),
          kg(row.average),
          pct(row.realization),
          row.lots
        ]),

        ...pdfTableTheme({
          styles: {
            fontSize: 6.5
          }
        })
      });

      doc.addPage();
      pdfPageHeader(doc, "DETALHAMENTO DOS LOTES");

      doc.autoTable({
        startY: 26,
        head: [[
          "Programação",
          "OS",
          "Lote",
          "Colaborador",
          "Peso",
          "Produzido",
          "Saldo",
          "Status"
        ]],

        body: pdfRows(lots),

        columnStyles: {
          0: { cellWidth: 23 },
          1: { cellWidth: 20 },
          2: { cellWidth: 51 },
          3: { cellWidth: 48 },
          4: { cellWidth: 27 },
          5: { cellWidth: 27 },
          6: { cellWidth: 27 },
          7: { cellWidth: 30 }
        },

        ...pdfTableTheme({
          styles: {
            fontSize: 6.4
          }
        })
      });

      savePdf(
        doc,
        `Relatorio_Geral_${from}_${to}`
      );

    } catch (error) {
      console.error("Erro ao gerar PDF geral:", error);
      alert(
        "Não foi possível gerar o PDF geral.\n\n" +
        (error?.message || "Erro desconhecido.")
      );
    } finally {
      setPdfButtonBusy(button, false);
    }
  };
}


/* =========================================================
   PDF INDIVIDUAL
========================================================= */

if ($("pdfIndividualBtn")) {
  $("pdfIndividualBtn").onclick = async () => {
    const button = $("pdfIndividualBtn");
    setPdfButtonBusy(button, true);

    try {
      await ensurePdfLibraries();

      const uid = $("reportUser").value;

      if (!uid) {
        alert("Selecione um colaborador para o PDF individual.");
        return;
      }

      const from = $("reportFrom").value;
      const to = $("reportTo").value;

      if (!from || !to) {
        alert("Informe a data inicial e a data final.");
        return;
      }

      if (from > to) {
        alert("A data inicial não pode ser maior que a data final.");
        return;
      }

      const user =
        allUsers.find(item => item.id === uid);

      const lots =
        dateRange(from, to)
          .filter(lot => lot.assignedTo === uid);

      const performance =
        buildPerformance(lots, from, to);

      const row =
        performance.users[0] || {
          name: user?.name || "Colaborador",
          planned: 0,
          produced: 0,
          workedDays: 0,
          averagePerWorkedDay: 0,
          averagePerPeriodDay: 0,
          realization: 0,
          lots: 0
        };

      const doc = pdfBase(
        `RELATÓRIO INDIVIDUAL - ${user?.name || "COLABORADOR"}`,
        from,
        to
      );

      pdfCard(
        doc, 14, 33, 50,
        "Produção",
        kg(row.produced)
      );

      pdfCard(
        doc, 68, 33, 50,
        "Programado",
        kg(row.planned)
      );

      pdfCard(
        doc, 122, 33, 50,
        "Média/dia trab.",
        kg(row.averagePerWorkedDay)
      );

      pdfCard(
        doc, 176, 33, 50,
        "Média/dia período",
        kg(row.averagePerPeriodDay)
      );

      pdfCard(
        doc, 230, 33, 53,
        "Realização",
        pct(row.realization)
      );

      pdfLineChart(
        doc,
        "Produção diária do colaborador",
        performance.days.map(r => r.date),
        performance.days.map(r => r.produced),
        61,
        67
      );

      doc.autoTable({
        startY: 136,

        head: [[
          "Indicador",
          "Resultado"
        ]],

        body: [
          ["Colaborador", user?.name || "—"],
          ["Lotes", row.lots],
          ["Programado", kg(row.planned)],
          ["Produzido", kg(row.produced)],
          ["Saldo", kg(row.planned - row.produced)],
          ["Dias no período", performance.periodDays],
          ["Dias trabalhados", row.workedDays],
          ["Média por dia trabalhado", kg(row.averagePerWorkedDay)],
          ["Média por dia do período", kg(row.averagePerPeriodDay)],
          ["Realização", pct(row.realization)]
        ],

        ...pdfTableTheme({
          styles: {
            fontSize: 7.5
          }
        })
      });

      doc.addPage();
      pdfPageHeader(doc, "ANÁLISE INDIVIDUAL");

      pdfPercentChart(
        doc,
        "Realização por dia",
        performance.days.map(r => r.date),
        performance.days.map(r => r.realization),
        34,
        75
      );

      doc.autoTable({
        startY: 125,

        head: [[
          "Data",
          "Programado",
          "Produzido",
          "Média do dia",
          "Realização",
          "Lotes"
        ]],

        body: performance.days.map(row => [
          dateBR(row.date),
          kg(row.planned),
          kg(row.produced),
          kg(row.average),
          pct(row.realization),
          row.lots
        ]),

        ...pdfTableTheme({
          styles: {
            fontSize: 7
          }
        })
      });

      doc.addPage();
      pdfPageHeader(doc, "DETALHAMENTO DOS LOTES");

      doc.autoTable({
        startY: 26,

        head: [[
          "Programação",
          "OS",
          "Lote",
          "Peso",
          "Produzido",
          "Saldo",
          "Status"
        ]],

        body: lots.map(lot => [
          dateBR(lot.programDate || lot.entryDate),
          lot.os || "—",
          lot.name || "—",
          kg(lot.weight),
          kg(lotProduced(lot)),
          kg(lotRemaining(lot)),
          statusLabel(lotStatus(lot))
        ]),

        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 25 },
          2: { cellWidth: 67 },
          3: { cellWidth: 35 },
          4: { cellWidth: 35 },
          5: { cellWidth: 35 },
          6: { cellWidth: 35 }
        },

        ...pdfTableTheme({
          styles: {
            fontSize: 6.7
          }
        })
      });

      savePdf(
        doc,
        `Relatorio_${user?.name || "Colaborador"}_${from}_${to}`
      );

    } catch (error) {
      console.error("Erro ao gerar PDF individual:", error);
      alert(
        "Não foi possível gerar o PDF individual.\n\n" +
        (error?.message || "Erro desconhecido.")
      );
    } finally {
      setPdfButtonBusy(button, false);
    }
  };
}

/* =========================================================
   COLABORADORES
========================================================= */

function renderUsers() {

  if (!roleIsAdmin()) {

    return;

  }


  $("usersTable").innerHTML = `

    <div class="table-wrap">

      <table class="data-table">

        <thead>

          <tr>

            <th>Nome</th>

            <th>E-mail</th>

            <th>Perfil</th>

            <th>Ativo</th>

            <th>Carga pendente</th>

          </tr>

        </thead>

        <tbody>

          ${
            allUsers.length

              ? allUsers.map(user => {

                  const load =
                    allLots
                      .filter(
                        lot =>
                          lot.assignedTo ===
                            user.id &&
                          [
                            "pendente",
                            "producao"
                          ].includes(
                            lotStatus(lot)
                          )
                      )
                      .reduce(
                        (total, lot) =>
                          total +
                          lotRemaining(lot),
                        0
                      );


                  return `

                    <tr>

                      <td>
                        ${escapeHtml(
                          user.name ||
                          "—"
                        )}
                      </td>

                      <td>
                        ${escapeHtml(
                          user.email ||
                          "—"
                        )}
                      </td>

                      <td>
                        ${escapeHtml(
                          user.role ||
                          "—"
                        )}
                      </td>

                      <td>
                        ${
                          user.active !== false
                            ? "Sim"
                            : "Não"
                        }
                      </td>

                      <td>
                        ${kg(load)}
                      </td>

                    </tr>

                  `;

                }).join("")

              : `

                <tr>

                  <td colspan="5">
                    Nenhum colaborador cadastrado.
                  </td>

                </tr>

              `
          }

        </tbody>

      </table>

    </div>

  `;

}


/* =========================================================
   CRIAR COLABORADOR
========================================================= */

$("userForm").addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if (!roleIsAdmin()) {

      return;

    }


    const name =
      $("newUserName")
        .value
        .trim();


    const email =
      $("newUserEmail")
        .value
        .trim();


    const password =
      $("newUserPassword")
        .value;


    $("userFormMessage")
      .textContent = "";


    try {

      /*
       * App secundário.
       * Isso evita deslogar o administrador.
       */

      const secondaryName =
        "secondary-" +
        Date.now();


      const secondary =
        firebase.initializeApp(
          firebaseConfig,
          secondaryName
        );


      const secondaryAuth =
        secondary.auth();


      const credential =
        await secondaryAuth
          .createUserWithEmailAndPassword(
            email,
            password
          );


      await db
        .collection("users")
        .doc(
          credential.user.uid
        )
        .set({

          name,

          email,

          role:
            "colaborador",

          active:
            true,

          createdAt:
            firebase.firestore
              .FieldValue
              .serverTimestamp()

        });


      await secondary.delete();


      $("userFormMessage")
        .className =
        "success";


      $("userFormMessage")
        .textContent =
        "Colaborador criado com sucesso.";


      event.target.reset();


      await loadData();


    } catch (error) {

      console.error(error);


      $("userFormMessage")
        .className =
        "error";


      $("userFormMessage")
        .textContent =
        error.message ||
        "Erro ao criar colaborador.";

    }

  }
);


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "Reluz Produção carregado."
    );

  }
);
