// ============================================================
// RELUZ PRODUÇÃO - APP.JS
// ============================================================

// ============================================================
// FIREBASE
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyCOVy3L_TD3JSWBsM7BuqGooaBE74-HG7Y",
    authDomain: "reluz-producao.firebaseapp.com",
    databaseURL: "https://reluz-producao-default-rtdb.firebaseio.com",
    projectId: "reluz-producao",
    storageBucket: "reluz-producao.firebasestorage.app",
    messagingSenderId: "910724669287",
    appId: "1:910724669287:web:e2ff572555c8cabafd59c2"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();


// ============================================================
// CONFIGURAÇÃO DO ADMINISTRADOR PRINCIPAL
// ============================================================

// COLOQUE AQUI O UID DO SEU LOGIN.
//
// Firebase Console
// → Authentication
// → Users
// → clique no seu usuário
// → copie User UID
//
// Exemplo:
// const MASTER_ADMIN_UID = "abc123...";
//
// SOMENTE ESTE UID terá acesso administrativo completo.

const MASTER_ADMIN_UID = "SEU_UID_AQUI";


// ============================================================
// VARIÁVEIS GLOBAIS
// ============================================================

let currentUser = null;
let currentProfile = null;

let allLots = [];
let allUsers = [];


// ============================================================
// HELPERS
// ============================================================

const $ = id => document.getElementById(id);

const kg = n =>
    `${Number(n || 0).toLocaleString("pt-BR", {
        maximumFractionDigits: 3
    })} kg`;

const pct = n =>
    `${Number(n || 0).toLocaleString("pt-BR", {
        maximumFractionDigits: 1
    })}%`;

const today = () =>
    new Date().toISOString().slice(0, 10);

const dateBR = d =>
    d
        ? String(d).split("-").reverse().join("/")
        : "—";


function escapeHtml(s = "") {
    return String(s).replace(/[&<>"']/g, m => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[m]));
}


function dateRange(from, to) {

    return allLots.filter(l =>
        (!from || l.programDate >= from) &&
        (!to || l.programDate <= to)
    );

}


// ============================================================
// ADMINISTRADOR PRINCIPAL
// ============================================================

function isMasterAdmin() {

    return !!(
        currentUser &&
        MASTER_ADMIN_UID !== "SEU_UID_AQUI" &&
        currentUser.uid === MASTER_ADMIN_UID
    );

}


// ============================================================
// ADMINISTRADOR
// ============================================================

function roleIsAdmin() {

    if (!currentProfile) {
        return false;
    }

    const role = String(
        currentProfile.role ||
        currentProfile.perfil ||
        currentProfile.type ||
        ""
    )
        .trim()
        .toLowerCase();

    return (
        isMasterAdmin() &&
        [
            "admin",
            "administrador",
            "administrator"
        ].includes(role)
    );
}


// ============================================================
// COLABORADOR
// ============================================================

function roleIsCollaborator() {

    if (!currentProfile) {
        return false;
    }

    const role = String(
        currentProfile.role ||
        currentProfile.perfil ||
        currentProfile.type ||
        ""
    )
        .trim()
        .toLowerCase();

    return role === "colaborador";
}


// ============================================================
// AUTENTICAÇÃO
// ============================================================

auth.onAuthStateChanged(async user => {

    if (!user) {

        currentUser = null;
        currentProfile = null;

        allLots = [];
        allUsers = [];

        showLogin();

        return;
    }

    currentUser = user;

    try {

        const snap = await db
            .collection("users")
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

        console.log(
            "PERFIL ATUAL:",
            currentProfile
        );

        console.log(
            "UID:",
            user.uid
        );

        console.log(
            "É ADMIN PRINCIPAL?",
            isMasterAdmin()
        );

        console.log(
            "É ADMIN?",
            roleIsAdmin()
        );

        showApp();

        await loadData();

    } catch (e) {

        console.error(
            "Erro de autenticação:",
            e
        );

        if ($("loginError")) {

            $("loginError").textContent =
                e.message ||
                "Erro ao carregar perfil.";
        }

        await auth.signOut();
    }

});


// ============================================================
// MOSTRAR LOGIN
// ============================================================

function showLogin() {

    $("loginScreen")
        ?.classList
        .remove("hidden");

    $("app")
        ?.classList
        .add("hidden");
}


// ============================================================
// MOSTRAR APP
// ============================================================

function showApp() {

    $("loginScreen")
        ?.classList
        .add("hidden");

    $("app")
        ?.classList
        .remove("hidden");

    if ($("userName")) {

        $("userName").textContent =
            currentProfile.name ||
            currentUser.email ||
            "Usuário";
    }

    if ($("userRole")) {

        $("userRole").textContent =
            roleIsAdmin()
                ? "Administrador"
                : "Colaborador";
    }

    document
        .querySelectorAll(".admin-only")
        .forEach(x =>
            x.classList.toggle(
                "hidden",
                !roleIsAdmin()
            )
        );

    if ($("todayLabel")) {

        $("todayLabel").textContent =
            new Date().toLocaleDateString(
                "pt-BR",
                {
                    dateStyle: "full"
                }
            );
    }

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


// ============================================================
// LOGIN
// ============================================================

if ($("loginForm")) {

    $("loginForm").addEventListener(
        "submit",
        async e => {

            e.preventDefault();

            if ($("loginError")) {
                $("loginError").textContent = "";
            }

            try {

                await auth.signInWithEmailAndPassword(
                    $("loginEmail").value.trim(),
                    $("loginPassword").value
                );

            } catch (err) {

                console.error(err);

                if ($("loginError")) {

                    $("loginError").textContent =
                        "E-mail ou senha inválidos.";
                }
            }

        }
    );

}


// ============================================================
// LOGOUT
// ============================================================

if ($("logoutBtn")) {

    $("logoutBtn").onclick =
        () => auth.signOut();

}


// ============================================================
// ATUALIZAR
// ============================================================

if ($("refreshBtn")) {

    $("refreshBtn").onclick =
        () => loadData();

}


// ============================================================
// NAVEGAÇÃO
// ============================================================

document
    .querySelectorAll(".nav-btn")
    .forEach(btn => {

        btn.onclick = () => {

            // Segurança visual
            if (
                btn.classList.contains("admin-only") &&
                !roleIsAdmin()
            ) {
                return;
            }

            document
                .querySelectorAll(".nav-btn")
                .forEach(b =>
                    b.classList.remove("active")
                );

            btn.classList.add("active");

            document
                .querySelectorAll(".view")
                .forEach(v =>
                    v.classList.add("hidden")
                );

            const view =
                $("view-" + btn.dataset.view);

            if (view) {
                view.classList.remove("hidden");
            }

            if ($("pageTitle")) {

                $("pageTitle").textContent =
                    btn.textContent.trim();
            }

            if (
                btn.dataset.view ===
                "dashboard"
            ) {
                renderDashboard();
            }

            if (
                btn.dataset.view ===
                "kanban"
            ) {
                renderKanban();
            }

            if (
                btn.dataset.view ===
                "meus-lotes"
            ) {
                renderMine();
            }

            if (
                btn.dataset.view ===
                "relatorio"
            ) {
                renderReport();
            }

            if (
                btn.dataset.view ===
                "colaboradores"
            ) {
                renderUsers();
            }

        };

    });


// ============================================================
// CARREGAR DADOS
// ============================================================

async function loadData() {

    try {

        if (roleIsAdmin()) {

            const [
                lotsSnap,
                usersSnap
            ] = await Promise.all([

                db
                    .collection("lots")
                    .get(),

                db
                    .collection("users")
                    .get()

            ]);

            allLots =
                lotsSnap.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                }));

            allUsers =
                usersSnap.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                }));

        } else {

            const lotsSnap =
                await db
                    .collection("lots")
                    .where(
                        "assignedTo",
                        "==",
                        currentUser.uid
                    )
                    .get();

            allLots =
                lotsSnap.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                }));

            allUsers = [
                {
                    id: currentUser.uid,
                    ...currentProfile
                }
            ];
        }

        console.log(
            "Lotes carregados:",
            allLots.length
        );

        console.log(
            "Usuários carregados:",
            allUsers.length
        );

        fillUserSelects();

        renderDashboard();
        renderKanban();
        renderMine();
        renderReport();
        renderUsers();

    } catch (err) {

        console.error(
            "Erro ao carregar dados do Firebase:",
            err
        );

        alert(
            "Erro ao carregar dados do Firebase:\n\n" +
            (
                err.message ||
                "Permissão insuficiente."
            )
        );
    }

}


// ============================================================
// SELECTS
// ============================================================

function fillUserSelects() {

    const active =
        allUsers.filter(
            u => u.active !== false
        );

    if ($("kanbanCollaborator")) {

        $("kanbanCollaborator").innerHTML =
            `<option value="">Todos</option>` +
            active
                .map(u =>
                    `<option value="${u.id}">
                        ${escapeHtml(
                            u.name ||
                            u.email ||
                            "Sem nome"
                        )}
                    </option>`
                )
                .join("");
    }

    if ($("reportUser")) {

        $("reportUser").innerHTML =
            `<option value="">
                Todos os colaboradores
            </option>` +
            active
                .map(u =>
                    `<option value="${u.id}">
                        ${escapeHtml(
                            u.name ||
                            u.email ||
                            "Sem nome"
                        )}
                    </option>`
                )
                .join("");
    }

}


// ============================================================
// FUNÇÕES DOS LOTES
// ============================================================

function lotProduced(l) {

    return Number(
        l.producedWeight || 0
    );

}


function lotRemaining(l) {

    return Math.max(
        0,
        Number(l.weight || 0) -
        lotProduced(l)
    );

}


function lotPercent(l) {

    return Math.min(
        100,
        (
            lotProduced(l) /
            Math.max(
                0.0001,
                Number(l.weight || 0)
            )
        ) * 100
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


function statusLabel(s) {

    return ({
        pendente: "Pendente",
        producao: "Em produção",
        finalizado: "Finalizado",
        cancelado: "Cancelado"
    })[s] || s;

}


// ============================================================
// DASHBOARD
// ============================================================

function renderDashboard() {

    if (!$("dashFrom")) return;

    const lots =
        dateRange(
            $("dashFrom").value,
            $("dashTo").value
        );

    const visible =
        roleIsAdmin()
            ? lots
            : lots.filter(
                l =>
                    l.assignedTo ===
                    currentUser.uid
            );

    const planned =
        visible.reduce(
            (a, l) =>
                a +
                Number(l.weight || 0),
            0
        );

    const produced =
        visible.reduce(
            (a, l) =>
                a +
                lotProduced(l),
            0
        );

    const remaining =
        visible.reduce(
            (a, l) =>
                a +
                lotRemaining(l),
            0
        );

    const done =
        visible.filter(
            l =>
                lotStatus(l) ===
                "finalizado"
        ).length;

    if ($("dashboardCards")) {

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

        ]
            .map(x =>
                `<div class="card">
                    <small>${x[0]}</small>
                    <strong>${x[1]}</strong>
                </div>`
            )
            .join("");
    }

    const by = {};

    visible.forEach(l => {

        const u =
            allUsers.find(
                x =>
                    x.id ===
                    l.assignedTo
            );

        const name =
            u?.name ||
            "Não atribuído";

        const key =
            `${l.programDate}|${name}`;

        if (!by[key]) {

            by[key] = {

                date:
                    l.programDate,

                name,

                weight:
                    0,

                clients:
                    new Set(),

                lots:
                    0
            };
        }

        by[key].weight +=
            lotProduced(l);

        by[key].clients.add(
            l.clientName ||
            l.name ||
            "Sem cliente"
        );

        by[key].lots++;
    });

    const rows =
        Object.values(by).sort(
            (a, b) =>
                a.date.localeCompare(b.date) ||
                a.name.localeCompare(b.name)
        );

    if ($("dailyCollaboratorTable")) {

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

                                ? rows.map(r => `

                                    <tr>

                                        <td>
                                            ${dateBR(r.date)}
                                        </td>

                                        <td>
                                            ${escapeHtml(r.name)}
                                        </td>

                                        <td>
                                            ${kg(r.weight)}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                [...r.clients].join(", ")
                                            )}
                                        </td>

                                        <td>
                                            ${r.lots}
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
    }

    const statuses = [
        "pendente",
        "producao",
        "finalizado"
    ];

    if ($("statusSummary")) {

        $("statusSummary").innerHTML = `

            <div class="status-table">

                ${statuses.map(s => `

                    <div class="status-row">

                        <span>
                            ${statusLabel(s)}
                        </span>

                        <strong>
                            ${
                                visible.filter(
                                    l =>
                                        lotStatus(l) === s
                                ).length
                            }
                        </strong>

                    </div>

                `).join("")}

            </div>
        `;
    }

}


if ($("dashFilterBtn")) {

    $("dashFilterBtn").onclick =
        renderDashboard;

}


// ============================================================
// CARD DO KANBAN
// ============================================================

function lotCard(l) {

    const u =
        allUsers.find(
            x =>
                x.id ===
                l.assignedTo
        );

    const st =
        lotStatus(l);

    return `

        <div
            class="lot-card"
            onclick="openLot('${l.id}')"
        >

            <div class="lot-status">
                ${statusLabel(st)}
            </div>

            <h4>
                ${escapeHtml(
                    l.name ||
                    "Lote"
                )}
            </h4>

            <div>
                OS:
                ${escapeHtml(
                    l.os ||
                    "—"
                )}
            </div>

            <div>
                Peso:
                ${kg(l.weight)}
            </div>

            <div>
                Entrada:
                ${dateBR(l.entryDate)}
            </div>

            <div>
                Programação:
                ${dateBR(l.programDate)}
            </div>

            <div>
                Responsável:
                ${escapeHtml(
                    u?.name ||
                    "—"
                )}
            </div>

            <div class="lot-progress">

                <div class="progress-bar">

                    <div
                        class="progress-fill"
                        style="width:${lotPercent(l)}%"
                    ></div>

                </div>

                <small>
                    ${kg(lotProduced(l))}
                    produzido
                    •
                    ${pct(lotPercent(l))}
                </small>

            </div>

            ${
                roleIsAdmin()
                    ? `
                        <button
                            type="button"
                            onclick="
                                event.stopPropagation();
                                window.editLot('${l.id}');
                            "
                            style="
                                display:block;
                                width:100%;
                                margin-top:15px;
                                padding:10px;
                                cursor:pointer;
                            "
                        >
                            ✏️ EDITAR LOTE
                        </button>
                    `
                    : ""
            }

        </div>
    `;
}


// ============================================================
// KANBAN
// ============================================================

function renderKanban() {

    if (!$("kanban")) return;

    let lots =
        dateRange(
            $("kanbanFrom").value,
            $("kanbanTo").value
        );

    const uid =
        $("kanbanCollaborator")?.value;

    if (uid) {

        lots =
            lots.filter(
                l =>
                    l.assignedTo === uid
            );
    }

    if (!roleIsAdmin()) {

        lots =
            lots.filter(
                l =>
                    l.assignedTo ===
                    currentUser.uid
            );
    }

    renderKanbanInto(
        "kanban",
        lots
    );
}


function renderMine() {

    if (!$("mineKanban")) return;

    const lots =
        dateRange(
            $("mineFrom").value,
            $("mineTo").value
        )
            .filter(
                l =>
                    l.assignedTo ===
                    currentUser.uid
            );

    renderKanbanInto(
        "mineKanban",
        lots
    );
}


function renderKanbanInto(id, lots) {

    if (!$(id)) return;

    const cols = [

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

    $(id).innerHTML =
        cols.map(
            ([s, title]) => {

                const list =
                    lots.filter(
                        l =>
                            lotStatus(l) === s
                    );

                return `

                    <div class="kanban-column">

                        <h3>

                            ${title}

                            <span class="badge">
                                ${list.length}
                            </span>

                        </h3>

                        ${
                            list.length
                                ? list
                                    .map(lotCard)
                                    .join("")
                                : `
                                    <div class="empty-state">
                                        Nenhum lote
                                    </div>
                                `
                        }

                    </div>
                `;
            }
        ).join("");
}


if ($("kanbanFilterBtn")) {

    $("kanbanFilterBtn").onclick =
        renderKanban;

}


if ($("mineFilterBtn")) {

    $("mineFilterBtn").onclick =
        renderMine;

}


// ============================================================
// MODAL DO LOTE
// ============================================================

window.openLot = async function(id) {

    const l =
        allLots.find(
            x =>
                x.id === id
        );

    if (!l) return;

    const u =
        allUsers.find(
            x =>
                x.id ===
                l.assignedTo
        );

    const mine =
        l.assignedTo ===
        currentUser.uid;

    const canEditProduction =
        roleIsAdmin() ||
        mine;

    if (!$("lotModalContent")) return;

    $("lotModalContent").innerHTML = `

        <h2>
            ${escapeHtml(
                l.name ||
                "Lote"
            )}
        </h2>

        <div class="modal-grid">

            <div>
                <small>OS</small>
                <strong>
                    ${escapeHtml(
                        l.os ||
                        "—"
                    )}
                </strong>
            </div>

            <div>
                <small>Cliente</small>
                <strong>
                    ${escapeHtml(
                        l.clientName ||
                        l.name ||
                        "—"
                    )}
                </strong>
            </div>

            <div>
                <small>Peso do lote</small>
                <strong>
                    ${kg(l.weight)}
                </strong>
            </div>

            <div>
                <small>Produzido</small>
                <strong>
                    ${kg(
                        lotProduced(l)
                    )}
                </strong>
            </div>

            <div>
                <small>Saldo</small>
                <strong>
                    ${kg(
                        lotRemaining(l)
                    )}
                </strong>
            </div>

            <div>
                <small>Data entrada</small>
                <strong>
                    ${dateBR(
                        l.entryDate
                    )}
                </strong>
            </div>

            <div>
                <small>Programação</small>
                <strong>
                    ${dateBR(
                        l.programDate
                    )}
                </strong>
            </div>

            <div>
                <small>Responsável</small>
                <strong>
                    ${escapeHtml(
                        u?.name ||
                        "—"
                    )}
                </strong>
            </div>

            <div>
                <small>Status</small>
                <strong>
                    ${statusLabel(
                        lotStatus(l)
                    )}
                </strong>
            </div>

        </div>

        ${
            roleIsAdmin()
                ? `

                    <div
                        class="modal-actions"
                        style="margin-top:20px;"
                    >

                        <button
                            type="button"
                            class="primary"
                            onclick="
                                editLot('${l.id}')
                            "
                        >
                            ✏️ EDITAR LOTE
                        </button>

                    </div>

                `
                : ""
        }

        ${
            canEditProduction
                ? `

                    <form
                        id="productionForm"
                        class="production-form"
                    >

                        <p>
                            O colaborador informa
                            o peso produzido.
                        </p>

                        <label>
                            Peso produzido agora (kg)

                            <input
                                id="productionInput"
                                type="number"
                                step="0.001"
                                min="0.001"
                                required
                            >
                        </label>

                        <label>
                            Observação

                            <textarea
                                id="productionObs"
                            ></textarea>
                        </label>

                        <button
                            type="submit"
                            class="primary"
                        >
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
                            onclick="
                                redistributeLot('${l.id}')
                            "
                        >
                            Redistribuir lote
                        </button>

                    `
                    : ""
            }

            <button
                type="button"
                class="secondary"
                onclick="closeLotModal()"
            >
                Fechar
            </button>

        </div>

        <div id="modalMessage"></div>
    `;

    if ($("lotModal")) {

        $("lotModal")
            .classList
            .remove("hidden");
    }

    if (canEditProduction) {

        if ($("productionForm")) {

            $("productionForm").onsubmit =
                e =>
                    registerProduction(
                        e,
                        l
                    );
        }
    }

};


// ============================================================
// EDITAR LOTE
// ============================================================

window.editLot = async function(id) {

    if (!roleIsAdmin()) {

        alert(
            "Você não possui permissão para editar lotes."
        );

        return;
    }

    const lot =
        allLots.find(
            x =>
                x.id === id
        );

    if (!lot) {

        alert("Lote não encontrado.");

        return;
    }

    const currentAssigned =
        allUsers.find(
            u =>
                u.id ===
                lot.assignedTo
        );

    const collaborators =
        allUsers.filter(
            u =>
                u.role === "colaborador" &&
                u.active !== false
        );

    if (!$("lotModalContent")) return;

    $("lotModalContent").innerHTML = `

        <h2>
            ✏️ Editar lote
        </h2>

        <form
            id="editLotForm"
            class="form-grid"
        >

            <label>
                Nome do lote

                <input
                    id="editLotName"
                    value="${escapeHtml(lot.name || "")}"
                    required
                >
            </label>

            <label>
                OS

                <input
                    id="editLotOs"
                    value="${escapeHtml(lot.os || "")}"
                    required
                >
            </label>

            <label>
                Cliente

                <input
                    id="editLotClient"
                    value="${escapeHtml(
                        lot.clientName ||
                        lot.name ||
                        ""
                    )}"
                >
            </label>

            <label>
                Peso (kg)

                <input
                    id="editLotWeight"
                    type="number"
                    step="0.001"
                    min="0.001"
                    value="${Number(lot.weight || 0)}"
                    required
                >
            </label>

            <label>
                Data de entrada

                <input
                    id="editLotEntry"
                    type="date"
                    value="${lot.entryDate || ""}"
                    required
                >
            </label>

            <label>
                Data de programação

                <input
                    id="editLotProgram"
                    type="date"
                    value="${lot.programDate || ""}"
                    required
                >
            </label>

            <label>
                Colaborador

                <select
                    id="editLotAssigned"
                    required
                >

                    ${
                        collaborators
                            .map(user => `
                                <option
                                    value="${user.id}"
                                    ${
                                        user.id ===
                                        lot.assignedTo
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ${escapeHtml(
                                        user.name ||
                                        user.email ||
                                        user.id
                                    )}
                                </option>
                            `)
                            .join("")
                    }

                </select>
            </label>

            <label>
                Status

                <select id="editLotStatus">

                    <option
                        value="pendente"
                        ${
                            lot.status === "pendente"
                                ? "selected"
                                : ""
                        }
                    >
                        Pendente
                    </option>

                    <option
                        value="producao"
                        ${
                            lot.status === "producao"
                                ? "selected"
                                : ""
                        }
                    >
                        Em produção
                    </option>

                    <option
                        value="finalizado"
                        ${
                            lot.status === "finalizado"
                                ? "selected"
                                : ""
                        }
                    >
                        Finalizado
                    </option>

                    <option
                        value="cancelado"
                        ${
                            lot.status === "cancelado"
                                ? "selected"
                                : ""
                        }
                    >
                        Cancelado
                    </option>

                </select>
            </label>

            <div class="full">

                <button
                    type="submit"
                    class="primary"
                >
                    💾 SALVAR ALTERAÇÕES
                </button>

            </div>

        </form>

        <div
            id="editLotMessage"
            style="margin-top:15px;"
        ></div>

        <div class="modal-actions">

            <button
                type="button"
                class="secondary"
                onclick="
                    openLot('${lot.id}')
                "
            >
                Voltar
            </button>

            <button
                type="button"
                class="secondary"
                onclick="closeLotModal()"
            >
                Fechar
            </button>

        </div>
    `;

    $("lotModal")
        ?.classList
        .remove("hidden");


    $("editLotForm").onsubmit =
        async event => {

            event.preventDefault();

            const message =
                $("editLotMessage");

            message.className = "";
            message.textContent =
                "Salvando...";

            const weight =
                Number(
                    $("editLotWeight").value
                );

            if (weight <= 0) {

                message.className =
                    "error";

                message.textContent =
                    "O peso deve ser maior que zero.";

                return;
            }

            const produced =
                lotProduced(lot);

            if (
                produced >
                weight + 0.0001
            ) {

                message.className =
                    "error";

                message.textContent =
                    "O novo peso não pode ser menor que o peso já produzido.";

                return;
            }

            try {

                await db
                    .collection("lots")
                    .doc(lot.id)
                    .update({

                        name:
                            $("editLotName")
                                .value
                                .trim(),

                        os:
                            $("editLotOs")
                                .value
                                .trim(),

                        clientName:
                            $("editLotClient")
                                .value
                                .trim(),

                        weight,

                        entryDate:
                            $("editLotEntry")
                                .value,

                        programDate:
                            $("editLotProgram")
                                .value,

                        assignedTo:
                            $("editLotAssigned")
                                .value,

                        status:
                            $("editLotStatus")
                                .value,

                        updatedAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp()

                    });

                message.className =
                    "success";

                message.textContent =
                    "Lote atualizado com sucesso.";

                await loadData();

                setTimeout(
                    () => {
                        closeLotModal();
                    },
                    500
                );

            } catch (error) {

                console.error(error);

                message.className =
                    "error";

                message.textContent =
                    error.message ||
                    "Erro ao atualizar lote.";
            }

        };

};


// ============================================================
// FECHAR MODAL
// ============================================================

window.closeLotModal = function() {

    $("lotModal")
        ?.classList
        .add("hidden");

};


// ============================================================
// FECHAR CLICANDO FORA
// ============================================================

if ($("lotModal")) {

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

}


// ============================================================
// REGISTRAR PRODUÇÃO
// ============================================================

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
                    next >=
                    weight - 0.0001
                        ? "finalizado"
                        : "producao";

                const productionLog = {

                    weight:
                        amount,

                    obs:
                        observation,

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


// ============================================================
// CADASTRAR LOTE
// ============================================================

if ($("lotForm")) {

    $("lotForm").addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            if (!roleIsAdmin()) {

                alert(
                    "Somente o administrador principal pode cadastrar lotes."
                );

                return;
            }

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
                    db.collection("lots")
                        .doc();

                const name =
                    $("lotName")
                        .value
                        .trim();

                const data = {

                    name,

                    os:
                        $("lotOs")
                            .value
                            .trim(),

                    weight,

                    entryDate:
                        $("lotEntry")
                            .value,

                    programDate:
                        $("lotProgram")
                            .value,

                    assignedTo:
                        chosen.id,

                    producedWeight:
                        0,

                    status:
                        "pendente",

                    clientName:
                        name,

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

}


// ============================================================
// REDISTRIBUIR LOTE
// ============================================================

window.redistributeLot =
    async function(id) {

        if (!roleIsAdmin()) {

            alert(
                "Somente o administrador principal pode redistribuir lotes."
            );

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
                item =>
                    item.id === id
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


// ============================================================
// RELATÓRIO
// ============================================================

function renderReport() {

    if (!$("reportSummary")) return;

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
            .sort((a, b) =>
                a.date.localeCompare(
                    b.date
                ) ||
                a.user.localeCompare(
                    b.user
                )
            );

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


if ($("reportFilterBtn")) {

    $("reportFilterBtn").onclick =
        renderReport;

}


// ============================================================
// COLABORADORES
// ============================================================

function renderUsers() {

    if (!roleIsAdmin()) {

        if ($("usersTable")) {
            $("usersTable").innerHTML = "";
        }

        return;
    }

    if (!$("usersTable")) return;

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


// ============================================================
// CRIAR COLABORADOR
// ============================================================

if ($("userForm")) {

    $("userForm").addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            if (!roleIsAdmin()) {

                alert(
                    "Somente o administrador principal pode criar colaboradores."
                );

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

}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Reluz Produção carregado."
        );

    }
);
