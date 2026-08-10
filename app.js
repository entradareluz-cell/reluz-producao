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
    d ? String(d).split("-").reverse().join("/") : "—";

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
// VERIFICAÇÃO DE ADMINISTRADOR
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

    return [
        "admin",
        "administrador",
        "administrator"
    ].includes(role);
}

// ============================================================
// VERIFICAÇÃO DE COLABORADOR
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

        // ====================================================
        // BUSCAR O PERFIL DO USUÁRIO LOGADO
        // ====================================================

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

        console.log(
            "É COLABORADOR?",
            roleIsCollaborator()
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
// LOGIN / APP
// ============================================================

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

        // ====================================================
        // ADMINISTRADOR
        // ====================================================

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

        }

        // ====================================================
        // COLABORADOR
        // ====================================================

        else {

            // Busca somente os próprios lotes.
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

            // O colaborador precisa apenas do próprio
            // perfil para o funcionamento do aplicativo.
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

        if ($("loginError")) {

            $("loginError").textContent =
                "Erro ao carregar dados do Firebase: " +
                (
                    err.message ||
                    "Permissão insuficiente."
                );
        }

        alert(
            "Erro ao carregar dados do Firebase: " +
            (
                err.message ||
                "Missing or insufficient permissions."
            )
        );
    }
}

// ============================================================
// SELECTS DE USUÁRIOS
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
                Programação:
                ${dateBR(
                    l.programDate
                )}
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
                                display:block !important;
                                width:100% !important;
                                margin-top:15px !important;
                                padding:10px !important;
                                cursor:pointer !important;
                                opacity:1 !important;
                                visibility:visible !important;
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
                    l.assignedTo ===
                    uid
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
