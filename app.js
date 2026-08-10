// ===============================
// RELUZ PRODUÇÃO - APP
// ===============================

// ===============================
// FIREBASE
// ===============================

const firebaseConfig = {
    apiKey: "AIzaSyCOVy3L_TD3JSWBsM7BuqGooaBE74-HG7Y",
    authDomain: "reluz-producao.firebaseapp.com",
    databaseURL: "https://reluz-producao-default-rtdb.firebaseio.com",
    projectId: "reluz-producao",
    storageBucket: "reluz-producao.firebasestorage.app",
    messagingSenderId: "910724669287",
    appId: "1:910724669287:web:e2ff572555c8cabafd59c2"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// ===============================
// VARIÁVEIS GLOBAIS
// ===============================

let currentUser = null;
let currentProfile = null;
let allLots = [];
let allUsers = [];

// ===============================
// HELPERS
// ===============================

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
    d ? d.split("-").reverse().join("/") : "—";

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

// ===============================
// VERIFICAÇÃO DE ADMINISTRADOR
// ===============================

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

    return [
        "admin",
        "administrador",
        "administrator"
    ].includes(role);
}

// ===============================
// AUTENTICAÇÃO
// ===============================

auth.onAuthStateChanged(async user => {

    if (!user) {
        currentUser = null;
        currentProfile = null;
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
            "É ADMIN?",
            roleIsAdmin()
        );

        showApp();

        await loadData();

    } catch (e) {

        console.error(e);

        if ($("loginError")) {
            $("loginError").textContent =
                e.message;
        }

        await auth.signOut();
    }
});

// ===============================
// LOGIN / APP
// ===============================

function showLogin() {

    $("loginScreen")
        ?.classList
        .remove("hidden");

    $("app")
        ?.classList
        .add("hidden");
}

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

// ===============================
// LOGIN
// ===============================

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

// ===============================
// LOGOUT
// ===============================

if ($("logoutBtn")) {

    $("logoutBtn").onclick =
        () => auth.signOut();
}

// ===============================
// ATUALIZAR
// ===============================

if ($("refreshBtn")) {

    $("refreshBtn").onclick =
        () => loadData();
}

// ===============================
// NAVEGAÇÃO
// ===============================

document
    .querySelectorAll(".nav-btn")
    .forEach(btn => {

        btn.onclick = () => {

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

// ===============================
// CARREGAR DADOS
// ===============================

async function loadData() {

    try {

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

        fillUserSelects();

        renderDashboard();
        renderKanban();
        renderMine();
        renderReport();
        renderUsers();

    } catch (err) {

        console.error(
            "Erro ao carregar dados:",
            err
        );
    }
}

// ===============================
// SELECTS DE USUÁRIOS
// ===============================

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
                        ${escapeHtml(u.name)}
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
                        ${escapeHtml(u.name)}
                    </option>`
                )
                .join("");
    }
}

// ===============================
// FUNÇÕES DOS LOTES
// ===============================

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

    if (
        l.status === "cancelado"
    ) {
        return "cancelado";
    }

    if (
        lotRemaining(l) <= 0.0001
    ) {
        return "finalizado";
    }

    if (
        lotProduced(l) > 0
    ) {
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

// ===============================
// DASHBOARD
// ===============================

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

// ===============================
// CARD DO KANBAN
// ===============================

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
                    l.name || "Lote"
                )}
            </h4>

            <div>
                OS:
                ${escapeHtml(
                    l.os || "—"
                )}
            </div>

            <div>
                ${kg(l.weight)}
            </div>

            <div>
                Programação:
                ${dateBR(l.programDate)}
            </div>

            <div>
                Responsável:
                ${escapeHtml(
                    u?.name || "—"
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

        </div>
    `;
}

// ===============================
// KANBAN
// ===============================

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

function renderKanbanInto(
    id,
    lots
) {

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

// ===============================
// MODAL DO LOTE
// ===============================

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
                l.name || "Lote"
            )}
        </h2>

        <div class="modal-grid">

            <div>
                <small>OS</small>
                <strong>
                    ${escapeHtml(
                        l.os || "—"
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
                    ${kg(lotProduced(l))}
                </strong>
            </div>

            <div>
                <small>Saldo</small>
                <strong>
                    ${kg(lotRemaining(l))}
                </strong>
            </div>

            <div>
                <small>Data entrada</small>
                <strong>
                    ${dateBR(l.entryDate)}
                </strong>
            </div>

            <div>
                <small>Programação</small>
                <strong>
                    ${dateBR(l.programDate)}
                </strong>
            </div>

            <div>
                <small>Responsável</small>
                <strong>
                    ${escapeHtml(
                        u?.name || "—"
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
                            onclick="editLot('${l.id}')"
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
                            O saldo e o percentual
                            são calculados
                            automaticamente.
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
                            onclick="redistributeLot('${l.id}')"
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

// ===============================
// EDITAR LOTE
// ===============================

window.editLot = function(id) {

    console.log(
        "Tentando editar lote:",
        id
    );

    console.log(
        "Perfil:",
        currentProfile
    );

    console.log(
        "Administrador:",
        roleIsAdmin()
    );

    if (!roleIsAdmin()) {

        alert(
            "Somente administradores podem editar lotes."
        );

        return;
    }

    const l =
        allLots.find(
            x =>
                x.id === id
        );

    if (!l) {

        alert(
            "Lote não encontrado."
        );

        return;
    }

    if (!$("lotModalContent")) {
        return;
    }

    const activeUsers =
        allUsers.filter(
            u =>
                u.active !== false &&
                (
                    u.role === "colaborador" ||
                    u.role === "admin"
                )
        );

    $("lotModalContent").innerHTML = `

        <h2>
            ✏️ EDITAR LOTE
        </h2>

        <form
            id="editLotForm"
            class="production-form"
        >

            <label>

                Nome do lote

                <input
                    id="editLotName"
                    type="text"
                    value="${escapeHtml(
                        l.name || ""
                    )}"
                    required
                >

            </label>

            <label>

                OS

                <input
                    id="editLotOs"
                    type="text"
                    value="${escapeHtml(
                        l.os || ""
                    )}"
                >

            </label>

            <label>

                Cliente

                <input
                    id="editLotClient"
                    type="text"
                    value="${escapeHtml(
                        l.clientName ||
                        l.name ||
                        ""
                    )}"
                >

            </label>

            <label>

                Peso do lote (kg)

                <input
                    id="editLotWeight"
                    type="number"
                    step="0.001"
                    min="0.001"
                    value="${Number(
                        l.weight || 0
                    )}"
                    required
                >

            </label>

            <label>

                Data de entrada

                <input
                    id="editLotEntry"
                    type="date"
                    value="${escapeHtml(
                        l.entryDate || ""
                    )}"
                >

            </label>

            <label>

                Data de programação

                <input
                    id="editLotProgram"
                    type="date"
                    value="${escapeHtml(
                        l.programDate || ""
                    )}"
                    required
                >

            </label>

            <label>

                Colaborador responsável

                <select
                    id="editLotCollaborator"
                    required
                >

                    <option value="">
                        Selecione o colaborador
                    </option>

                    ${
                        activeUsers
                            .map(u => `

                                <option
                                    value="${u.id}"
                                    ${
                                        l.assignedTo === u.id
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ${escapeHtml(
                                        u.name
                                    )}
                                </option>

                            `)
                            .join("")
                    }

                </select>

            </label>

            <div
                style="
                    padding:12px;
                    border-radius:8px;
                    background:#f5f5f5;
                    margin-top:10px;
                "
            >

                <strong>
                    Produzido atualmente:
                </strong>

                ${kg(lotProduced(l))}

            </div>

            <div
                id="editLotMessage"
                style="margin-top:10px;"
            ></div>

            <div
                class="modal-actions"
                style="margin-top:20px;"
            >

                <button
                    type="submit"
                    class="primary"
                >
                    💾 SALVAR ALTERAÇÕES
                </button>

                <button
                    type="button"
                    class="secondary"
                    onclick="openLot('${l.id}')"
                >
                    Cancelar
                </button>

            </div>

        </form>
    `;

    if ($("editLotForm")) {

        $("editLotForm").onsubmit =
            e =>
                saveLotEdit(
                    e,
                    l
                );
    }
};

// ===============================
// SALVAR EDIÇÃO
// ===============================

async function saveLotEdit(
    e,
    originalLot
) {

    e.preventDefault();

    if (!roleIsAdmin()) {

        alert(
            "Somente administradores podem editar lotes."
        );

        return;
    }

    const message =
        $("editLotMessage");

    if (message) {

        message.textContent = "";
        message.className = "";
    }

    const name =
        $("editLotName")
            ?.value
            .trim() || "";

    const os =
        $("editLotOs")
            ?.value
            .trim() || "";

    const clientName =
        $("editLotClient")
            ?.value
            .trim() || "";

    const weight =
        Number(
            $("editLotWeight")
                ?.value || 0
        );

    const entryDate =
        $("editLotEntry")
            ?.value || "";

    const programDate =
        $("editLotProgram")
            ?.value || "";

    const assignedTo =
        $("editLotCollaborator")
            ?.value || "";

    if (!name) {

        if (message) {

            message.className =
                "error";

            message.textContent =
                "Informe o nome do lote.";
        }

        return;
    }

    if (weight <= 0) {

        if (message) {

            message.className =
                "error";

            message.textContent =
                "O peso precisa ser maior que zero.";
        }

        return;
    }

    const produced =
        lotProduced(originalLot);

    if (
        weight <
        produced - 0.0001
    ) {

        if (message) {

            message.className =
                "error";

            message.textContent =
                `O peso do lote não pode ser menor que o peso já produzido (${kg(produced)}).`;
        }

        return;
    }

    if (!programDate) {

        if (message) {

            message.className =
                "error";

            message.textContent =
                "Informe a data de programação.";
        }

        return;
    }

    if (!assignedTo) {

        if (message) {

            message.className =
                "error";

            message.textContent =
                "Selecione o colaborador responsável.";
        }

        return;
    }

    const collaborator =
        allUsers.find(
            u =>
                u.id === assignedTo
        );

    if (!collaborator) {

        if (message) {

            message.className =
                "error";

            message.textContent =
                "Colaborador selecionado não encontrado.";
        }

        return;
    }

    try {

        const newStatus =
            originalLot.status ===
            "cancelado"

                ? "cancelado"

                : (
                    weight - produced <= 0.0001

                        ? "finalizado"

                        : produced > 0

                            ? "producao"

                            : "pendente"
                );

        await db
            .collection("lots")
            .doc(originalLot.id)
            .update({

                name,

                os,

                clientName,

                weight,

                entryDate,

                programDate,

                assignedTo,

                status:
                    newStatus,

                updatedAt:
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp(),

                lastEditedBy:
                    currentUser.uid,

                lastEditedAt:
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp()
            });

        if (message) {

            message.className =
                "success";

            message.textContent =
                "Lote atualizado com sucesso.";
        }

        await loadData();

        setTimeout(
            () => {

                openLot(
                    originalLot.id
                );

            },
            300
        );

    } catch (err) {

        console.error(
            "Erro ao editar lote:",
            err
        );

        if (message) {

            message.className =
                "error";

            message.textContent =
                err.message ||
                "Não foi possível salvar as alterações.";
        }
    }
}

// ===============================
// FECHAR MODAL
// ===============================

window.closeLotModal =
    function() {

        if ($("lotModal")) {

            $("lotModal")
                .classList
                .add("hidden");
        }
    };

// ===============================
// REGISTRAR PRODUÇÃO
// ===============================

async function registerProduction(
    e,
    l
) {

    e.preventDefault();

    const amount =
        Number(
            $("productionInput")
                ?.value || 0
        );

    if (amount <= 0) {

        $("modalMessage").textContent =
            "Informe um peso maior que zero.";

        return;
    }

    if (
        lotProduced(l) +
        amount >
        Number(l.weight) +
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

    try {

        await db.runTransaction(
            async tx => {

                const ref =
                    db
                        .collection("lots")
                        .doc(l.id);

                const snap =
                    await tx.get(ref);

                if (!snap.exists) {

                    throw new Error(
                        "Lote não encontrado."
                    );
                }

                const data =
                    snap.data();

                const next =
                    Number(
                        data.producedWeight || 0
                    ) +
                    amount;

                const newStatus =
                    next >=
                    Number(data.weight) -
                    0.0001

                        ? "finalizado"

                        : "producao";

                const log = {

                    weight:
                        amount,

                    obs:
                        $("productionObs")
                            ?.value || "",

                    userId:
                        currentUser.uid,

                    at:
                        new Date()
                };

                tx.update(
                    ref,
                    {

                        producedWeight:
                            next,

                        status:
                            newStatus,

                        updatedAt:
                            now,

                        lastObservation:
                            log.obs,

                        productionLogs:
                            firebase.firestore
                                .FieldValue
                                .arrayUnion(log)
                    }
                );
            }
        );

        closeLotModal();

        await loadData();

    } catch (err) {

        console.error(err);

        if ($("modalMessage")) {

            $("modalMessage").textContent =
                err.message;
        }
    }
}

// ===============================
// CADASTRAR NOVO LOTE
// ===============================

if ($("lotForm")) {

    $("lotForm").addEventListener(
        "submit",
        async e => {

            e.preventDefault();

            if (!roleIsAdmin()) {
                return;
            }

            if ($("lotFormMessage")) {

                $("lotFormMessage")
                    .textContent = "";

                $("lotFormMessage")
                    .className = "";
            }

            const weight =
                Number(
                    $("lotWeight")
                        ?.value || 0
                );

            if (weight <= 0) {

                $("lotFormMessage")
                    .textContent =
                    "Informe um peso maior que zero.";

                return;
            }

            try {

                const active =
                    allUsers.filter(
                        u =>
                            u.active !== false &&
                            u.role === "colaborador"
                    );

                if (!active.length) {

                    throw new Error(
                        "Não existem colaboradores ativos para distribuição."
                    );
                }

                const loads = {};

                allLots.forEach(l => {

                    if (
                        [
                            "pendente",
                            "producao"
                        ].includes(
                            lotStatus(l)
                        )
                    ) {

                        loads[l.assignedTo] =
                            (
                                loads[l.assignedTo] ||
                                0
                            ) +
                            lotRemaining(l);
                    }
                });

                active.sort(
                    (a, b) =>
                        (
                            loads[a.id] || 0
                        ) -
                        (
                            loads[b.id] || 0
                        )
                );

                const chosen =
                    active[0];

                const ref =
                    db
                        .collection("lots")
                        .doc();

                const lotName =
                    $("lotName")
                        ?.value
                        .trim() || "";

                const data = {

                    name:
                        lotName,

                    os:
                        $("lotOs")
                            ?.value
                            .trim() || "",

                    weight,

                    entryDate:
                        $("lotEntry")
                            ?.value || "",

                    programDate:
                        $("lotProgram")
                            ?.value || "",

                    assignedTo:
                        chosen.id,

                    producedWeight:
                        0,

                    status:
                        "pendente",

                    clientName:
                        lotName,

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

                if ($("lotFormMessage")) {

                    $("lotFormMessage")
                        .className =
                        "success";

                    $("lotFormMessage")
                        .textContent =
                        `Lote distribuído para ${chosen.name}. Carga pendente atual: ${kg(loads[chosen.id] || 0)}.`;
                }

                e.target.reset();

                await loadData();

            } catch (err) {

                console.error(err);

                if ($("lotFormMessage")) {

                    $("lotFormMessage")
                        .className =
                        "error";

                    $("lotFormMessage")
                        .textContent =
                        err.message;
                }
            }
        }
    );
}

// ===============================
// REDISTRIBUIR LOTE
// ===============================

window.redistributeLot =
    async function(id) {

        if (!roleIsAdmin()) {
            return;
        }

        const active =
            allUsers.filter(
                u =>
                    u.active !== false &&
                    u.role === "colaborador"
            );

        const l =
            allLots.find(
                x =>
                    x.id === id
            );

        if (
            !l ||
            !active.length
        ) {
            return;
        }

        const loads = {};

        allLots.forEach(x => {

            if (
                x.id !== id &&
                [
                    "pendente",
                    "producao"
                ].includes(
                    lotStatus(x)
                )
            ) {

                loads[x.assignedTo] =
                    (
                        loads[x.assignedTo] ||
                        0
                    ) +
                    lotRemaining(x);
            }
        });

        active.sort(
            (a, b) =>
                (
                    loads[a.id] || 0
                ) -
                (
                    loads[b.id] || 0
                )
        );

        const chosen =
            active[0];

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

// ===============================
// RELATÓRIO
// ===============================

function renderReport() {

    if (!$("reportFrom")) {
        return;
    }

    let lots =
        dateRange(
            $("reportFrom").value,
            $("reportTo").value
        );

    const uid =
        $("reportUser")?.value;

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

    const planned =
        lots.reduce(
            (a, l) =>
                a +
                Number(l.weight || 0),
            0
        );

    const produced =
        lots.reduce(
            (a, l) =>
                a +
                lotProduced(l),
            0
        );

    const clients =
        new Set(
            lots
                .map(
                    l =>
                        l.clientName ||
                        l.name
                )
                .filter(Boolean)
        );

    if ($("reportSummary")) {

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
                        ? (
                            produced /
                            planned
                        ) * 100
                        : 0
                )
            ],

            [
                "Clientes",
                clients.size
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

    lots.forEach(l => {

        const u =
            allUsers.find(
                x =>
                    x.id ===
                    l.assignedTo
            );

        const key =
            `${l.programDate}|${l.assignedTo}`;

        if (!by[key]) {

            by[key] = {

                date:
                    l.programDate,

                user:
                    u?.name || "—",

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
            Number(l.weight || 0);

        by[key].produced +=
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
                a.user.localeCompare(b.user)
        );

    if ($("reportByCollaborator")) {

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

                                ? rows.map(r => `

                                    <tr>

                                        <td>
                                            ${dateBR(r.date)}
                                        </td>

                                        <td>
                                            ${escapeHtml(r.user)}
                                        </td>

                                        <td>
                                            ${kg(r.produced)}
                                        </td>

                                        <td>
                                            ${kg(r.planned)}
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
    }

    if ($("reportDetails")) {

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
                                    .map(l => {

                                        const u =
                                            allUsers.find(
                                                x =>
                                                    x.id ===
                                                    l.assignedTo
                                            );

                                        return `

                                            <tr>

                                                <td>
                                                    ${dateBR(
                                                        l.programDate
                                                    )}
                                                </td>

                                                <td>
                                                    ${escapeHtml(
                                                        l.os || "—"
                                                    )}
                                                </td>

                                                <td>
                                                    ${escapeHtml(
                                                        l.name || "—"
                                                    )}
                                                </td>

                                                <td>
                                                    ${escapeHtml(
                                                        u?.name || "—"
                                                    )}
                                                </td>

                                                <td>
                                                    ${kg(l.weight)}
                                                </td>

                                                <td>
                                                    ${kg(
                                                        lotProduced(l)
                                                    )}
                                                </td>

                                                <td>
                                                    ${kg(
                                                        lotRemaining(l)
                                                    )}
                                                </td>

                                                <td>
                                                    ${statusLabel(
                                                        lotStatus(l)
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
}

if ($("reportFilterBtn")) {

    $("reportFilterBtn").onclick =
        renderReport;
}

// ===============================
// PDF
// ===============================

function pdfBase(
    title,
    from,
    to
) {

    const {
        jsPDF
    } = window.jspdf;

    const doc =
        new jsPDF({
            orientation:
                "landscape"
        });

    doc.setFontSize(18);

    doc.text(
        title,
        14,
        16
    );

    doc.setFontSize(9);

    doc.text(
        `Programação: ${dateBR(from)} a ${dateBR(to)}`,
        14,
        23
    );

    doc.text(
        `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
        200,
        23
    );

    return doc;
}

function pdfRows(lots) {

    return lots.map(l => {

        const u =
            allUsers.find(
                x =>
                    x.id ===
                    l.assignedTo
            );

        return [

            dateBR(l.programDate),

            l.os || "—",

            l.name || "—",

            u?.name || "—",

            kg(l.weight),

            kg(lotProduced(l)),

            kg(lotRemaining(l)),

            statusLabel(
                lotStatus(l)
            )
        ];
    });
}

function savePdf(
    doc,
    name
) {

    doc.save(
        name.replace(
            /\s+/g,
            "_"
        ) +
        ".pdf"
    );
}

// ===============================
// PDF GERAL
// ===============================

if ($("pdfGeneralBtn")) {

    $("pdfGeneralBtn").onclick =
        () => {

            if (!roleIsAdmin()) {
                return;
            }

            const from =
                $("reportFrom").value;

            const to =
                $("reportTo").value;

            const lots =
                dateRange(
                    from,
                    to
                );

            const doc =
                pdfBase(
                    "RELATÓRIO GERAL DE PRODUÇÃO",
                    from,
                    to
                );

            const planned =
                lots.reduce(
                    (a, l) =>
                        a +
                        Number(l.weight || 0),
                    0
                );

            const produced =
                lots.reduce(
                    (a, l) =>
                        a +
                        lotProduced(l),
                    0
                );

            doc.setFontSize(11);

            doc.text(
                `Programado: ${kg(planned)}   ` +
                `Produzido: ${kg(produced)}   ` +
                `Saldo: ${kg(planned - produced)}   ` +
                `Realização: ${pct(
                    planned
                        ? (
                            produced /
                            planned
                        ) * 100
                        : 0
                )}`,
                14,
                31
            );

            const by = {};

            lots.forEach(l => {

                const u =
                    allUsers.find(
                        x =>
                            x.id ===
                            l.assignedTo
                    );

                const k =
                    `${l.programDate}|${l.assignedTo}`;

                if (!by[k]) {

                    by[k] = {

                        d:
                            l.programDate,

                        n:
                            u?.name || "—",

                        p:
                            0,

                        c:
                            new Set(),

                        q:
                            0
                    };
                }

                by[k].p +=
                    lotProduced(l);

                by[k].c.add(
                    l.clientName ||
                    l.name ||
                    "Sem cliente"
                );

                by[k].q++;
            });

            doc.autoTable({

                startY: 38,

                head: [[
                    "Data",
                    "Colaborador",
                    "Peso do dia",
                    "Clientes",
                    "Lotes"
                ]],

                body:
                    Object.values(by)
                        .sort(
                            (a, b) =>
                                a.d.localeCompare(b.d)
                        )
                        .map(
                            r => [

                                dateBR(r.d),

                                r.n,

                                kg(r.p),

                                [...r.c].join(", "),

                                r.q
                            ]
                        )
            });

            doc.addPage();

            doc.setFontSize(14);

            doc.text(
                "DETALHAMENTO DOS LOTES",
                14,
                16
            );

            doc.autoTable({

                startY: 22,

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

                body:
                    pdfRows(lots)
            });

            savePdf(
                doc,
                `Relatorio_Geral_${from}_${to}`
            );
        };
}

// ===============================
// PDF INDIVIDUAL
// ===============================

if ($("pdfIndividualBtn")) {

    $("pdfIndividualBtn").onclick =
        () => {

            const uid =
                $("reportUser").value;

            if (!uid) {

                alert(
                    "Selecione um colaborador para o PDF individual."
                );

                return;
            }

            const from =
                $("reportFrom").value;

            const to =
                $("reportTo").value;

            const user =
                allUsers.find(
                    u =>
                        u.id === uid
                );

            const lots =
                dateRange(
                    from,
                    to
                )
                    .filter(
                        l =>
                            l.assignedTo === uid
                    );

            const doc =
                pdfBase(
                    `RELATÓRIO INDIVIDUAL - ${user?.name || "Colaborador"}`,
                    from,
                    to
                );

            const planned =
                lots.reduce(
                    (a, l) =>
                        a +
                        Number(l.weight || 0),
                    0
                );

            const produced =
                lots.reduce(
                    (a, l) =>
                        a +
                        lotProduced(l),
                    0
                );

            const clients =
                new Set(
                    lots
                        .map(
                            l =>
                                l.clientName ||
                                l.name
                        )
                        .filter(Boolean)
                );

            doc.setFontSize(11);

            doc.text(
                `Programado: ${kg(planned)}   ` +
                `Produzido: ${kg(produced)}   ` +
                `Saldo: ${kg(planned - produced)}   ` +
                `Realização: ${pct(
                    planned
                        ? (
                            produced /
                            planned
                        ) * 100
                        : 0
                )}   ` +
                `Clientes: ${clients.size}`,
                14,
                31
            );

            const by = {};

            lots.forEach(l => {

                const k =
                    l.programDate;

                if (!by[k]) {

                    by[k] = {

                        p: 0,

                        c:
                            new Set(),

                        q: 0
                    };
                }

                by[k].p +=
                    lotProduced(l);

                by[k].c.add(
                    l.clientName ||
                    l.name ||
                    "Sem cliente"
                );

                by[k].q++;
            });

            doc.autoTable({

                startY: 38,

                head: [[
                    "Data",
                    "Peso do dia",
                    "Clientes",
                    "Lotes"
                ]],

                body:
                    Object.entries(by)
                        .sort(
                            (a, b) =>
                                a[0].localeCompare(b[0])
                        )
                        .map(
                            ([d, r]) => [

                                dateBR(d),

                                kg(r.p),

                                [...r.c].join(", "),

                                r.q
                            ]
                        )
            });

            doc.addPage();

            doc.setFontSize(14);

            doc.text(
                "DETALHAMENTO DOS LOTES",
                14,
                16
            );

            doc.autoTable({

                startY: 22,

                head: [[
                    "Programação",
                    "OS",
                    "Lote",
                    "Peso",
                    "Produzido",
                    "Saldo",
                    "Status"
                ]],

                body:
                    lots.map(
                        l => [

                            dateBR(
                                l.programDate
                            ),

                            l.os || "—",

                            l.name || "—",

                            kg(l.weight),

                            kg(
                                lotProduced(l)
                            ),

                            kg(
                                lotRemaining(l)
                            ),

                            statusLabel(
                                lotStatus(l)
                            )
                        ]
                    )
            });

            savePdf(
                doc,
                `Relatorio_${user?.name || "Colaborador"}_${from}_${to}`
            );
        };
}

// ===============================
// COLABORADORES
// ===============================

function renderUsers() {

    if (!roleIsAdmin()) {
        return;
    }

    if (!$("usersTable")) {
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

                            ? allUsers.map(u => {

                                const load =
                                    allLots
                                        .filter(
                                            l =>
                                                l.assignedTo ===
                                                u.id &&
                                                [
                                                    "pendente",
                                                    "producao"
                                                ].includes(
                                                    lotStatus(l)
                                                )
                                        )
                                        .reduce(
                                            (a, l) =>
                                                a +
                                                lotRemaining(l),
                                            0
                                        );

                                return `

                                    <tr>

                                        <td>
                                            ${escapeHtml(
                                                u.name || "—"
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                u.email || "—"
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                u.role || "—"
                                            )}
                                        </td>

                                        <td>
                                            ${
                                                u.active !== false
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
                                        Nenhum usuário cadastrado.
                                    </td>
                                </tr>
                            `
                    }

                </tbody>

            </table>

        </div>
    `;
}

// ===============================
// CRIAR COLABORADOR
// ===============================

if ($("userForm")) {

    $("userForm").addEventListener(
        "submit",
        async e => {

            e.preventDefault();

            if (!roleIsAdmin()) {
                return;
            }

            const name =
                $("newUserName")
                    ?.value
                    .trim();

            const email =
                $("newUserEmail")
                    ?.value
                    .trim();

            const password =
                $("newUserPassword")
                    ?.value;

            if (
                !name ||
                !email ||
                !password
            ) {

                $("userFormMessage")
                    .className =
                    "error";

                $("userFormMessage")
                    .textContent =
                    "Preencha nome, e-mail e senha.";

                return;
            }

            if (
                password.length < 6
            ) {

                $("userFormMessage")
                    .className =
                    "error";

                $("userFormMessage")
                    .textContent =
                    "A senha precisa ter pelo menos 6 caracteres.";

                return;
            }

            let secondary = null;

            try {

                const secondaryName =
                    "secondary-" +
                    Date.now();

                secondary =
                    firebase.initializeApp(
                        firebaseConfig,
                        secondaryName
                    );

                const secondaryAuth =
                    secondary.auth();

                const cred =
                    await secondaryAuth
                        .createUserWithEmailAndPassword(
                            email,
                            password
                        );

                await db
                    .collection("users")
                    .doc(
                        cred.user.uid
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

                await secondaryAuth
                    .signOut();

                await secondary.delete();

                secondary = null;

                $("userFormMessage")
                    .className =
                    "success";

                $("userFormMessage")
                    .textContent =
                    "Colaborador criado com sucesso.";

                e.target.reset();

                await loadData();

            } catch (err) {

                console.error(err);

                if (secondary) {

                    try {

                        await secondary
                            .auth()
                            .signOut();

                        await secondary.delete();

                    } catch (ignore) {}
                }

                let message =
                    err.message;

                if (
                    err.code ===
                    "auth/email-already-in-use"
                ) {

                    message =
                        "Este e-mail já está cadastrado no Firebase Authentication.";

                } else if (
                    err.code ===
                    "auth/invalid-email"
                ) {

                    message =
                        "O e-mail informado é inválido.";

                } else if (
                    err.code ===
                    "auth/weak-password"
                ) {

                    message =
                        "A senha informada é muito fraca.";
                }

                $("userFormMessage")
                    .className =
                    "error";

                $("userFormMessage")
                    .textContent =
                    message;
            }
        }
    );
}

// ===============================
// FINALIZAÇÃO
// ===============================

console.log(
    "RELÚZ PRODUÇÃO iniciado."
);

console.log(
    "Firebase:",
    firebase.app().options.projectId
);
