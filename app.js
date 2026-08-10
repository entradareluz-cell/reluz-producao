// ============================================================
// RELUZ PRODUÇÃO - APP.JS
// ============================================================

// ============================================================
// CONFIGURAÇÃO DO ADMINISTRADOR PRINCIPAL
// ============================================================

const MASTER_ADMIN_UID =
    "3QlkmlndAXaGxErEpCL17Mun35E3";


// ============================================================
// FIREBASE
// ============================================================

const firebaseConfig = {

    apiKey:
        "AIzaSyCOVy3L_TD3JSWBsM7BuqGooaBE74-HG7Y",

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


// ============================================================
// INICIALIZAÇÃO FIREBASE
// ============================================================

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth =
    firebase.auth();

const db =
    firebase.firestore();


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

const $ = id =>
    document.getElementById(id);


function kg(n) {

    return `${Number(n || 0).toLocaleString(
        "pt-BR",
        {
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

    return new Date()
        .toISOString()
        .slice(0, 10);

}


function dateBR(d) {

    return d
        ? String(d)
            .split("-")
            .reverse()
            .join("/")
        : "—";

}


function escapeHtml(value = "") {

    return String(value).replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char])
    );

}


function dateRange(from, to) {

    return allLots.filter(lot =>

        (!from ||
            lot.programDate >= from)

        &&

        (!to ||
            lot.programDate <= to)

    );

}


// ============================================================
// ADMINISTRADOR PRINCIPAL
// ============================================================

function roleIsAdmin() {

    if (!currentUser) {
        return false;
    }

    // O perfil "admin" passa a ser a fonte principal de autorização
    // no aplicativo. O UID antigo continua como fallback.
    const role =
        String(
            currentProfile?.role ||
            currentProfile?.perfil ||
            currentProfile?.type ||
            ""
        )
        .trim()
        .toLowerCase();

    return (
        currentUser.uid === MASTER_ADMIN_UID
        || role === "admin"
        || role === "administrador"
    );

}


// ============================================================
// COLABORADOR
// ============================================================

function roleIsCollaborator() {

    if (!currentProfile) {
        return false;
    }

    const role =
        String(
            currentProfile.role ||
            currentProfile.perfil ||
            currentProfile.type ||
            ""
        )
        .trim()
        .toLowerCase();

    return (
        role === "colaborador"
        &&
        currentProfile.active !== false
    );

}


// ============================================================
// AUTENTICAÇÃO
// ============================================================

auth.onAuthStateChanged(
    async user => {

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

            // =================================================
            // PERFIL
            // =================================================

            const profileRef =
                db
                    .collection("users")
                    .doc(user.uid);

            const snap =
                await profileRef.get();

            // =================================================
            // ADMIN PRINCIPAL
            // =================================================
            //
            // Se o seu usuário ainda não tiver perfil,
            // criamos automaticamente o perfil do administrador.
            //
            // Isso evita o erro de login sem perfil.
            //
            // =================================================

            if (!snap.exists) {

                if (user.uid === MASTER_ADMIN_UID) {

                    await profileRef.set({

                        name:
                            user.displayName ||
                            "Administrador",

                        email:
                            user.email ||
                            "",

                        role:
                            "admin",

                        active:
                            true,

                        createdAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp()

                    });

                    const newSnap =
                        await profileRef.get();

                    currentProfile = {

                        uid: user.uid,
                        ...newSnap.data()

                    };

                } else {

                    await auth.signOut();

                    throw new Error(
                        "Usuário sem perfil cadastrado no Firestore."
                    );
                }

            } else {

                currentProfile = {

                    uid: user.uid,
                    ...snap.data()

                };

            }


            console.log(
                "USUÁRIO:",
                currentUser.uid
            );

            console.log(
                "PERFIL:",
                currentProfile
            );

            console.log(
                "ADMIN PRINCIPAL:",
                roleIsAdmin()
            );


            // =================================================
            // MOSTRAR APP
            // =================================================

            showApp();

            await loadData();

        } catch (error) {

            console.error(
                "Erro de autenticação:",
                error
            );

            if ($("loginError")) {

                $("loginError").textContent =
                    error.message ||
                    "Erro ao carregar perfil.";

            }

            if (currentUser) {
                await auth.signOut();
            }

        }

    }
);


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
            currentProfile?.name ||
            currentUser?.email ||
            "Usuário";

    }


    if ($("userRole")) {

        $("userRole").textContent =
            roleIsAdmin()
                ? "Administrador"
                : "Colaborador";

    }


    // =========================================================
    // MOSTRAR / ESCONDER ÁREAS DE ADMIN
    // =========================================================

    document
        .querySelectorAll(".admin-only")
        .forEach(element => {

            element.classList.toggle(
                "hidden",
                !roleIsAdmin()
            );

        });


    if ($("todayLabel")) {

        $("todayLabel").textContent =
            new Date().toLocaleDateString(
                "pt-BR",
                {
                    dateStyle: "full"
                }
            );

    }


    const t =
        today();


    [
        "dashFrom",
        "kanbanFrom",
        "mineFrom",
        "reportFrom"
    ]
    .forEach(id => {

        if ($(id)) {
            $(id).value = t;
        }

    });


    [
        "dashTo",
        "kanbanTo",
        "mineTo",
        "reportTo"
    ]
    .forEach(id => {

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
        async event => {

            event.preventDefault();

            if ($("loginError")) {
                $("loginError").textContent = "";
            }

            try {

                await auth
                    .signInWithEmailAndPassword(

                        $("loginEmail")
                            .value
                            .trim(),

                        $("loginPassword")
                            .value

                    );

            } catch (error) {

                console.error(error);

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
        async () => {

            try {

                await loadData();

            } catch (error) {

                console.error(error);

            }

        };

}


// ============================================================
// NAVEGAÇÃO
// ============================================================

document
    .querySelectorAll(".nav-btn")
    .forEach(button => {

        button.onclick = () => {

            // Segurança visual:
            // não permite abrir tela admin por botão
            // caso não seja o UID principal.

            if (
                button.classList.contains("admin-only")
                &&
                !roleIsAdmin()
            ) {

                return;

            }


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


            if ($("pageTitle")) {

                $("pageTitle").textContent =
                    button.textContent.trim();

            }


            switch (
                button.dataset.view
            ) {

                case "dashboard":
                    renderDashboard();
                    break;

                case "kanban":
                    renderKanban();
                    break;

                case "meus-lotes":
                    renderMine();
                    break;

                case "relatorio":
                    renderReport();
                    break;

                case "colaboradores":
                    renderUsers();
                    break;

            }

        };

    });


// ============================================================
// CARREGAR DADOS
// ============================================================

async function loadData() {

    if (!currentUser) {
        return;
    }


    try {

        // =====================================================
        // ADMIN PRINCIPAL
        // =====================================================

        if (roleIsAdmin()) {

            const result =
                await Promise.all([

                    db
                        .collection("lots")
                        .get(),

                    db
                        .collection("users")
                        .get()

                ]);


            const lotsSnap =
                result[0];

            const usersSnap =
                result[1];


            allLots =
                lotsSnap.docs.map(
                    doc => ({

                        id: doc.id,
                        ...doc.data()

                    })
                );


            allUsers =
                usersSnap.docs.map(
                    doc => ({

                        id: doc.id,
                        ...doc.data()

                    })
                );

        }

        // =====================================================
        // COLABORADOR
        // =====================================================

        else {

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
                lotsSnap.docs.map(
                    doc => ({

                        id: doc.id,
                        ...doc.data()

                    })
                );


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


    } catch (error) {

        console.error(
            "Erro ao carregar dados do Firebase:",
            error
        );


        const message =
            error?.code ===
            "permission-denied"

                ? (
                    "Permissão negada pelo Firestore. " +
                    "Confirme se existe users/{UID} com role admin ou " +
                    "colaborador e active=true, e publique o firestore.rules atualizado."
                )

                : (
                    error.message ||
                    "Erro ao carregar dados."
                );


        if ($("loginError")) {
            $("loginError").textContent =
                message;
        }


        alert(
            message
        );

    }

}


// ============================================================
// SELECTS DE USUÁRIOS
// ============================================================

function fillUserSelects() {

    const activeUsers =
        allUsers.filter(
            user =>
                user.active !== false
        );


    if ($("kanbanCollaborator")) {

        $("kanbanCollaborator").innerHTML =
            `<option value="">Todos</option>` +

            activeUsers
                .map(user =>
                    `<option value="${escapeHtml(user.id)}">
                        ${escapeHtml(
                            user.name ||
                            user.email ||
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

            activeUsers
                .map(user =>
                    `<option value="${escapeHtml(user.id)}">
                        ${escapeHtml(
                            user.name ||
                            user.email ||
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

function lotProduced(lot) {

    return Number(
        lot.producedWeight || 0
    );

}


function lotRemaining(lot) {

    return Math.max(
        0,
        Number(lot.weight || 0) -
        lotProduced(lot)
    );

}


function lotPercent(lot) {

    const weight =
        Number(lot.weight || 0);

    if (weight <= 0) {
        return 0;
    }

    return Math.min(
        100,
        (
            lotProduced(lot) /
            weight
        ) * 100
    );

}


function lotStatus(lot) {

    if (
        lot.status ===
        "cancelado"
    ) {

        return "cancelado";

    }


    if (
        lotRemaining(lot) <=
        0.0001
    ) {

        return "finalizado";

    }


    if (
        lotProduced(lot) > 0
    ) {

        return "producao";

    }


    return "pendente";

}


function statusLabel(status) {

    return {

        pendente:
            "Pendente",

        producao:
            "Em produção",

        finalizado:
            "Finalizado",

        cancelado:
            "Cancelado"

    }[status] || status;

}


// ============================================================
// DASHBOARD
// ============================================================

function renderDashboard() {

    if (!$("dashFrom")) {
        return;
    }


    let lots =
        dateRange(
            $("dashFrom").value,
            $("dashTo").value
        );


    if (!roleIsAdmin()) {

        lots =
            lots.filter(
                lot =>
                    lot.assignedTo ===
                    currentUser.uid
            );

    }


    renderPerformance(
        lots,
        $("reportFrom").value,
        $("reportTo").value
    );


    const planned =
        lots.reduce(
            (total, lot) =>
                total +
                Number(
                    lot.weight || 0
                ),
            0
        );


    const produced =
        lots.reduce(
            (total, lot) =>
                total +
                lotProduced(lot),
            0
        );


    const remaining =
        lots.reduce(
            (total, lot) =>
                total +
                lotRemaining(lot),
            0
        );


    const done =
        lots.filter(
            lot =>
                lotStatus(lot) ===
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
        .map(item =>
            `<div class="card">

                <small>
                    ${item[0]}
                </small>

                <strong>
                    ${item[1]}
                </strong>

            </div>`
        )
        .join("");

    }


    const by = {};


    lots.forEach(lot => {

        const user =
            allUsers.find(
                item =>
                    item.id ===
                    lot.assignedTo
            );


        const name =
            user?.name ||
            "Não atribuído";


        const key =
            `${lot.programDate}|${name}`;


        if (!by[key]) {

            by[key] = {

                date:
                    lot.programDate,

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
            .sort(
                (a, b) =>
                    String(a.date || "")
                        .localeCompare(
                            String(b.date || "")
                        )
                    ||
                    String(a.name || "")
                        .localeCompare(
                            String(b.name || "")
                        )
            );


    if ($("dailyCollaboratorTable")) {

        $("dailyCollaboratorTable")
            .innerHTML = `

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

                                ? rows
                                    .map(row => `

                                        <tr>

                                            <td>
                                                ${dateBR(
                                                    row.date
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    row.name
                                                )}
                                            </td>

                                            <td>
                                                ${kg(
                                                    row.weight
                                                )}
                                            </td>

                                            <td>
                                                ${escapeHtml(
                                                    [
                                                        ...row.clients
                                                    ].join(", ")
                                                )}
                                            </td>

                                            <td>
                                                ${row.lots}
                                            </td>

                                        </tr>

                                    `)
                                    .join("")

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

        $("statusSummary")
            .innerHTML = `

            <div class="status-table">

                ${statuses.map(status => `

                    <div class="status-row">

                        <span>
                            ${statusLabel(status)}
                        </span>

                        <strong>

                            ${
                                lots.filter(
                                    lot =>
                                        lotStatus(lot) ===
                                        status
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
// CARD DO LOTE
// ============================================================

function lotCard(lot) {

    const user =
        allUsers.find(
            item =>
                item.id ===
                lot.assignedTo
        );


    const status =
        lotStatus(lot);


    return `

        <div
            class="lot-card"
            onclick="openLot('${lot.id}')"
        >

            <div class="lot-status">
                ${statusLabel(status)}
            </div>


            <h4>
                ${escapeHtml(
                    lot.name ||
                    "Lote"
                )}
            </h4>


            <div>
                OS:
                ${escapeHtml(
                    lot.os ||
                    "—"
                )}
            </div>


            <div>
                Cliente:
                ${escapeHtml(
                    lot.clientName ||
                    lot.name ||
                    "—"
                )}
            </div>


            <div>
                Peso:
                ${kg(lot.weight)}
            </div>


            <div>
                Programação:
                ${dateBR(
                    lot.programDate
                )}
            </div>


            <div>
                Responsável:
                ${escapeHtml(
                    user?.name ||
                    "—"
                )}
            </div>


            <div class="lot-progress">

                <div class="progress-bar">

                    <div
                        class="progress-fill"
                        style="
                            width:${lotPercent(lot)}%
                        "
                    ></div>

                </div>


                <small>

                    ${kg(
                        lotProduced(lot)
                    )}

                    produzido

                    •

                    ${pct(
                        lotPercent(lot)
                    )}

                </small>

            </div>


            ${
                roleIsAdmin()

                    ? `

                        <button
                            type="button"
                            onclick="
                                event.stopPropagation();
                                window.editLot('${lot.id}');
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

    if (!$("kanban")) {
        return;
    }


    let lots =
        dateRange(
            $("kanbanFrom").value,
            $("kanbanTo").value
        );


    const collaborator =
        $("kanbanCollaborator")?.value;


    if (collaborator) {

        lots =
            lots.filter(
                lot =>
                    lot.assignedTo ===
                    collaborator
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

    if (!$("mineKanban")) {
        return;
    }


    let lots =
        dateRange(
            $("mineFrom").value,
            $("mineTo").value
        );


    lots =
        lots.filter(
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
    id,
    lots
) {

    if (!$(id)) {
        return;
    }


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


    $(id).innerHTML =
        columns
            .map(
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
            )
            .join("");

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
// ABRIR LOTE
// ============================================================

window.openLot =
async function(id) {

    const lot =
        allLots.find(
            item =>
                item.id === id
        );


    if (!lot) {
        return;
    }

    // Guarda exatamente o lote que está aberto no modal.
    // Isso permite que o botão "Editar lote" saiba qual registro editar.
    window.currentLot = lot;
    window.currentSelectedLot = lot;

    // Fonte oficial para o botão de edição: o próprio modal aberto.
    const openedLotModal = $("lotModal");
    if (openedLotModal) {
        openedLotModal.dataset.lotId = id;
    }


    const user =
        allUsers.find(
            item =>
                item.id ===
                lot.assignedTo
        );


    const mine =
        lot.assignedTo ===
        currentUser.uid;


    const canEditProduction =
        roleIsAdmin() ||
        mine;


    if (!$("lotModalContent")) {
        return;
    }


    $("lotModalContent").innerHTML = `

        <h2>
            ${escapeHtml(
                lot.name ||
                "Lote"
            )}
        </h2>


        <div class="modal-grid">

            <div>

                <small>OS</small>

                <strong>
                    ${escapeHtml(
                        lot.os ||
                        "—"
                    )}
                </strong>

            </div>


            <div>

                <small>Cliente</small>

                <strong>
                    ${escapeHtml(
                        lot.clientName ||
                        lot.name ||
                        "—"
                    )}
                </strong>

            </div>


            <div>

                <small>Peso do lote</small>

                <strong>
                    ${kg(lot.weight)}
                </strong>

            </div>


            <div>

                <small>Produzido</small>

                <strong>
                    ${kg(
                        lotProduced(lot)
                    )}
                </strong>

            </div>


            <div>

                <small>Saldo</small>

                <strong>
                    ${kg(
                        lotRemaining(lot)
                    )}
                </strong>

            </div>


            <div>

                <small>Data entrada</small>

                <strong>
                    ${dateBR(
                        lot.entryDate
                    )}
                </strong>

            </div>


            <div>

                <small>Programação</small>

                <strong>
                    ${dateBR(
                        lot.programDate
                    )}
                </strong>

            </div>


            <div>

                <small>Responsável</small>

                <strong>
                    ${escapeHtml(
                        user?.name ||
                        "—"
                    )}
                </strong>

            </div>


            <div>

                <small>Status</small>

                <strong>
                    ${statusLabel(
                        lotStatus(lot)
                    )}
                </strong>

            </div>


            <div>

                <small>Percentual</small>

                <strong>
                    ${pct(
                        lotPercent(lot)
                    )}
                </strong>

            </div>

        </div>


        ${
            roleIsAdmin()

                ? `

                    <div
                        class="modal-actions"
                        style="
                            margin-top:20px;
                        "
                    >

                        <button
                            type="button"
                            class="primary"
                            onclick="
                                window.editLot('${lot.id}')
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
                                max="${lotRemaining(lot)}"
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
                                redistributeLot('${lot.id}')
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


    $("lotModal")
        ?.classList
        .remove("hidden");


    if (canEditProduction) {

        if ($("productionForm")) {

            $("productionForm").onsubmit =
                event =>
                    registerProduction(
                        event,
                        lot
                    );

        }

    }

};


// ============================================================
// FECHAR MODAL
// ============================================================

window.closeLotModal =
function() {

    $("lotModal")
        ?.classList
        .add("hidden");

    window.currentLot = null;
    window.currentSelectedLot = null;

    const openedLotModal = $("lotModal");
    if (openedLotModal) {
        delete openedLotModal.dataset.lotId;
    }

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
// EDITAR LOTE
// ============================================================
//
// SOMENTE ADMIN PRINCIPAL.
//
// Campos editáveis:
// - Nome
// - OS
// - Cliente
// - Peso
// - Data de entrada
// - Data de programação
// - Colaborador
//
// Produção NÃO é alterada aqui.
// Isso evita quebrar o histórico de produção.
//
// ============================================================

window.editLot =
function(id) {

    if (!roleIsAdmin()) {

        alert(
            "Somente o administrador principal pode editar lotes."
        );

        return;

    }


    const lot =
        allLots.find(
            item =>
                item.id === id
        );


    if (!lot) {

        alert(
            "Lote não encontrado."
        );

        return;

    }


    const collaborators =
        allUsers.filter(
            user =>
                user.role ===
                "colaborador"
        );


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
                    value="${escapeHtml(
                        lot.name || ""
                    )}"
                    required
                >

            </label>


            <label>

                OS

                <input
                    id="editLotOs"
                    value="${escapeHtml(
                        lot.os || ""
                    )}"
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
                    required
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
                        lot.weight || 0
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
                        lot.entryDate || ""
                    )}"
                    required
                >

            </label>


            <label>

                Data de programação

                <input
                    id="editLotProgram"
                    type="date"
                    value="${escapeHtml(
                        lot.programDate || ""
                    )}"
                    required
                >

            </label>


            <label>

                Colaborador responsável

                <select
                    id="editLotAssigned"
                    required
                >

                    <option value="">
                        Selecione
                    </option>

                    ${
                        collaborators
                            .map(
                                user => `

                                    <option
                                        value="${escapeHtml(
                                            user.id
                                        )}"
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
                                            "Sem nome"
                                        )}
                                    </option>

                                `
                            )
                            .join("")
                    }

                </select>

            </label>


            <div class="full">

                <div
                    style="
                        padding:12px;
                        border-radius:8px;
                        background:#f3f4f6;
                        margin-bottom:15px;
                    "
                >

                    <strong>
                        Produzido:
                    </strong>

                    ${kg(
                        lotProduced(lot)
                    )}

                    <br>

                    <strong>
                        Saldo atual:
                    </strong>

                    ${kg(
                        lotRemaining(lot)
                    )}

                </div>


                <button
                    type="submit"
                    class="primary"
                >
                    💾 SALVAR ALTERAÇÕES
                </button>


                <button
                    type="button"
                    class="secondary"
                    style="
                        margin-top:10px;
                    "
                    onclick="
                        openLot('${lot.id}')
                    "
                >
                    Cancelar
                </button>

            </div>

        </form>


        <div
            id="editLotMessage"
            style="
                margin-top:15px;
            "
        ></div>

    `;


    $("lotModal")
        ?.classList
        .remove("hidden");


    $("editLotForm").onsubmit =
        async event => {

            event.preventDefault();


            const message =
                $("editLotMessage");


            message.textContent =
                "";


            const name =
                $("editLotName")
                    .value
                    .trim();


            const os =
                $("editLotOs")
                    .value
                    .trim();


            const clientName =
                $("editLotClient")
                    .value
                    .trim();


            const weight =
                Number(
                    $("editLotWeight")
                        .value
                );


            const entryDate =
                $("editLotEntry")
                    .value;


            const programDate =
                $("editLotProgram")
                    .value;


            const assignedTo =
                $("editLotAssigned")
                    .value;


            if (!name) {

                message.textContent =
                    "Informe o nome do lote.";

                return;

            }


            if (!os) {

                message.textContent =
                    "Informe a OS.";

                return;

            }


            if (!clientName) {

                message.textContent =
                    "Informe o cliente.";

                return;

            }


            if (
                !weight ||
                weight <= 0
            ) {

                message.textContent =
                    "Informe um peso válido.";

                return;

            }


            if (!entryDate) {

                message.textContent =
                    "Informe a data de entrada.";

                return;

            }


            if (!programDate) {

                message.textContent =
                    "Informe a data de programação.";

                return;

            }


            if (!assignedTo) {

                message.textContent =
                    "Selecione o colaborador.";

                return;

            }


            const produced =
                lotProduced(lot);


            if (
                weight <
                produced
            ) {

                message.textContent =
                    `O peso do lote não pode ser menor que o já produzido (${kg(produced)}).`;

                return;

            }


            let newStatus =
                "pendente";


            if (
                lot.status ===
                "cancelado"
            ) {

                newStatus =
                    "cancelado";

            } else if (
                produced >=
                weight - 0.0001
            ) {

                newStatus =
                    "finalizado";

            } else if (
                produced > 0
            ) {

                newStatus =
                    "producao";

            }


            try {

                await db
                    .collection("lots")
                    .doc(lot.id)
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
                                .serverTimestamp()

                    });


                message.className =
                    "success";


                message.textContent =
                    "Lote alterado com sucesso.";


                await loadData();


                setTimeout(
                    () => {

                        openLot(
                            lot.id
                        );

                    },
                    500
                );


            } catch (error) {

                console.error(
                    "Erro ao editar lote:",
                    error
                );


                message.className =
                    "error";


                message.textContent =
                    error?.code ===
                    "permission-denied"

                        ? "Permissão negada pelo Firestore. Publique as novas Rules."

                        : (
                            error.message ||
                            "Erro ao alterar lote."
                        );

            }

        };

};


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
            $("productionInput")
                ?.value || 0
        );


    if (amount <= 0) {

        $("modalMessage").textContent =
            "Informe um peso maior que zero.";

        return;

    }


    const remaining =
        lotRemaining(lot);


    if (
        amount >
        remaining + 0.0001
    ) {

        $("modalMessage").textContent =
            "O peso produzido ultrapassa o saldo do lote.";

        return;

    }


    const observation =
        $("productionObs")
            ?.value
            .trim() || "";


    try {

        await db.runTransaction(
            async transaction => {

                const ref =
                    db
                        .collection("lots")
                        .doc(lot.id);


                const snap =
                    await transaction.get(
                        ref
                    );


                if (!snap.exists) {

                    throw new Error(
                        "Lote não encontrado."
                    );

                }


                const data =
                    snap.data();


                const current =
                    Number(
                        data.producedWeight ||
                        0
                    );


                const weight =
                    Number(
                        data.weight ||
                        0
                    );


                const next =
                    current +
                    amount;


                if (
                    next >
                    weight +
                    0.0001
                ) {

                    throw new Error(
                        "O peso produzido ultrapassa o peso do lote."
                    );

                }


                let newStatus =
                    "pendente";


                if (
                    data.status ===
                    "cancelado"
                ) {

                    newStatus =
                        "cancelado";

                } else if (
                    next >=
                    weight - 0.0001
                ) {

                    newStatus =
                        "finalizado";

                } else if (
                    next > 0
                ) {

                    newStatus =
                        "producao";

                }


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
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp(),

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

        console.error(
            "Erro ao registrar produção:",
            error
        );


        if ($("modalMessage")) {

            $("modalMessage")
                .textContent =
                error.message ||
                "Erro ao registrar produção.";

        }

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

                return;

            }


            $("lotFormMessage")
                .textContent = "";


            const weight =
                Number(
                    $("lotWeight")
                        .value
                );


            if (
                !weight ||
                weight <= 0
            ) {

                $("lotFormMessage")
                    .className =
                    "error";


                $("lotFormMessage")
                    .textContent =
                    "Informe um peso válido.";

                return;

            }


            try {

                const activeUsers =
                    allUsers.filter(
                        user =>
                            user.active !== false
                            &&
                            user.role ===
                            "colaborador"
                    );


                if (!activeUsers.length) {

                    throw new Error(
                        "Não existem colaboradores ativos para distribuição."
                    );

                }


                const loads = {};


                allLots.forEach(
                    lot => {

                        if (
                            [
                                "pendente",
                                "producao"
                            ]
                            .includes(
                                lotStatus(lot)
                            )
                        ) {

                            loads[
                                lot.assignedTo
                            ] =
                                (
                                    loads[
                                        lot.assignedTo
                                    ] ||
                                    0
                                )
                                +
                                lotRemaining(
                                    lot
                                );

                        }

                    }
                );


                activeUsers.sort(
                    (a, b) =>
                        (
                            loads[a.id] ||
                            0
                        )
                        -
                        (
                            loads[b.id] ||
                            0
                        )
                );


                const chosen =
                    activeUsers[0];


                const ref =
                    db
                        .collection("lots")
                        .doc();


                const lotName =
                    $("lotName")
                        .value
                        .trim();


                const data = {

                    name:
                        lotName,

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


                $("lotFormMessage")
                    .className =
                    "success";


                $("lotFormMessage")
                    .textContent =
                    `Lote distribuído para ${chosen.name}. Carga pendente atual: ${kg(loads[chosen.id] || 0)}.`;


                event.target.reset();


                await loadData();


            } catch (error) {

                console.error(
                    "Erro ao cadastrar lote:",
                    error
                );


                $("lotFormMessage")
                    .className =
                    "error";


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
                user.active !== false
                &&
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


    allLots.forEach(
        item => {

            if (
                item.id !== id
                &&
                [
                    "pendente",
                    "producao"
                ]
                .includes(
                    lotStatus(item)
                )
            ) {

                loads[
                    item.assignedTo
                ] =
                    (
                        loads[
                            item.assignedTo
                        ] ||
                        0
                    )
                    +
                    lotRemaining(
                        item
                    );

            }

        }
    );


    activeUsers.sort(
        (a, b) =>
            (
                loads[a.id] ||
                0
            )
            -
            (
                loads[b.id] ||
                0
            )
    );


    const chosen =
        activeUsers[0];


    try {

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


    } catch (error) {

        console.error(
            error
        );

        alert(
            error.message ||
            "Erro ao redistribuir lote."
        );

    }

};


// ============================================================
// ANÁLISE DE DESEMPENHO
// ============================================================

function inclusiveDays(from, to) {

    if (!from || !to) {
        return 0;
    }

    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);

    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end < start
    ) {
        return 0;
    }

    return Math.floor(
        (end - start) / 86400000
    ) + 1;
}


function buildPerformance(lots, from, to) {

    const periodDays = inclusiveDays(from, to);

    const totalProduced = lots.reduce(
        (sum, lot) => sum + lotProduced(lot),
        0
    );

    const by = {};

    lots.forEach(lot => {

        const uid = lot.assignedTo || "sem-colaborador";

        const user = allUsers.find(
            item => item.id === uid
        );

        if (!by[uid]) {
            by[uid] = {
                uid,
                name: user?.name || "Sem colaborador",
                produced: 0,
                planned: 0,
                lots: 0,
                days: new Set()
            };
        }

        by[uid].produced += lotProduced(lot);
        by[uid].planned += Number(lot.weight || 0);
        by[uid].lots++;

        if (lot.programDate) {
            by[uid].days.add(lot.programDate);
        }
    });

    const collaborators = Object.values(by)
        .map(item => {

            const daysWorked = item.days.size;

            return {
                ...item,
                daysWorked,
                averagePerWorkedDay:
                    daysWorked
                        ? item.produced / daysWorked
                        : 0,
                averagePerPeriodDay:
                    periodDays
                        ? item.produced / periodDays
                        : 0,
                realization:
                    item.planned
                        ? (item.produced / item.planned) * 100
                        : 0
            };
        })
        .sort((a, b) => b.produced - a.produced);

    return {
        periodDays,
        totalProduced,
        periodAverage:
            periodDays
                ? totalProduced / periodDays
                : 0,
        collaborators
    };
}


function renderPerformance(lots, from, to) {

    const performance =
        buildPerformance(lots, from, to);

    if ($("performanceSummary")) {

        $("performanceSummary").innerHTML = [
            ["Dias no período", performance.periodDays],
            ["Produção total", kg(performance.totalProduced)],
            ["Média por dia do período", kg(performance.periodAverage)],
            ["Colaboradores", performance.collaborators.length]
        ]
        .map(item => `
            <div class="card">
                <small>${item[0]}</small>
                <strong>${item[1]}</strong>
            </div>
        `)
        .join("");
    }

    if ($("performanceByCollaborator")) {

        $("performanceByCollaborator").innerHTML = `

            <p class="performance-note">
                Média/dia trabalhado = produção dividida pelos dias em que
                o colaborador teve lote. Média/dia do período = produção
                dividida por todos os dias entre as datas selecionadas.
            </p>

            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Colaborador</th>
                            <th>Produzido</th>
                            <th>Dias trabalhados</th>
                            <th>Média/dia trabalhado</th>
                            <th>Média/dia do período</th>
                            <th>Programado</th>
                            <th>Realização</th>
                            <th>Lotes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${
                            performance.collaborators.length
                                ? performance.collaborators.map(row => `
                                    <tr>
                                        <td>${escapeHtml(row.name)}</td>
                                        <td>${kg(row.produced)}</td>
                                        <td>${row.daysWorked}</td>
                                        <td>${kg(row.averagePerWorkedDay)}</td>
                                        <td>${kg(row.averagePerPeriodDay)}</td>
                                        <td>${kg(row.planned)}</td>
                                        <td>${pct(row.realization)}</td>
                                        <td>${row.lots}</td>
                                    </tr>
                                `).join("")
                                : `
                                    <tr>
                                        <td colspan="8">
                                            Sem dados de desempenho no período.
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


// ============================================================
// RELATÓRIO
// ============================================================

function renderReport() {

    if (
        !$("reportFrom") ||
        !$("reportTo")
    ) {

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
                lot =>
                    lot.assignedTo ===
                    uid
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
                Number(
                    lot.weight || 0
                ),
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


    if ($("reportSummary")) {

        $("reportSummary")
            .innerHTML = [

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
                    kg(
                        planned -
                        produced
                    )
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
            .map(item => `

                <div class="card">

                    <small>
                        ${item[0]}
                    </small>

                    <strong>
                        ${item[1]}
                    </strong>

                </div>

            `)
            .join("");

    }


    const by = {};


    lots.forEach(lot => {

        const user =
            allUsers.find(
                item =>
                    item.id ===
                    lot.assignedTo
            );


        const key =
            `${lot.programDate}|${lot.assignedTo}`;


        if (!by[key]) {

            by[key] = {

                date:
                    lot.programDate,

                user:
                    user?.name ||
                    "—",

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
            Number(
                lot.weight || 0
            );


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
            .sort(
                (a, b) =>
                    String(a.date || "")
                        .localeCompare(
                            String(b.date || "")
                        )
                    ||
                    String(a.user || "")
                        .localeCompare(
                            String(b.user || "")
                        )
            );


    if ($("reportByCollaborator")) {

        $("reportByCollaborator")
            .innerHTML = `

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
                                            ${dateBR(
                                                row.date
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                row.user
                                            )}
                                        </td>

                                        <td>
                                            ${kg(
                                                row.produced
                                            )}
                                        </td>

                                        <td>
                                            ${kg(
                                                row.planned
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHtml(
                                                [
                                                    ...row.clients
                                                ].join(", ")
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

    }


    if ($("reportDetails")) {

        $("reportDetails")
            .innerHTML = `

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
                                            String(
                                                a.programDate ||
                                                ""
                                            ).localeCompare(
                                                String(
                                                    b.programDate ||
                                                    ""
                                                )
                                            )
                                    )
                                    .map(
                                        lot => {

                                            const user =
                                                allUsers.find(
                                                    item =>
                                                        item.id ===
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
                                                            lot.os ||
                                                            "—"
                                                        )}
                                                    </td>

                                                    <td>
                                                        ${escapeHtml(
                                                            lot.name ||
                                                            "—"
                                                        )}
                                                    </td>

                                                    <td>
                                                        ${escapeHtml(
                                                            user?.name ||
                                                            "—"
                                                        )}
                                                    </td>

                                                    <td>
                                                        ${kg(
                                                            lot.weight
                                                        )}
                                                    </td>

                                                    <td>
                                                        ${kg(
                                                            lotProduced(
                                                                lot
                                                            )
                                                        )}
                                                    </td>

                                                    <td>
                                                        ${kg(
                                                            lotRemaining(
                                                                lot
                                                            )
                                                        )}
                                                    </td>

                                                    <td>
                                                        ${statusLabel(
                                                            lotStatus(
                                                                lot
                                                            )
                                                        )}
                                                    </td>

                                                </tr>

                                            `;

                                        }
                                    )
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


// ============================================================
// PDF
// ============================================================

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

    return lots.map(
        lot => {

            const user =
                allUsers.find(
                    item =>
                        item.id ===
                        lot.assignedTo
                );


            return [

                dateBR(
                    lot.programDate
                ),

                lot.os ||
                    "—",

                lot.name ||
                    "—",

                user?.name ||
                    "—",

                kg(
                    lot.weight
                ),

                kg(
                    lotProduced(lot)
                ),

                kg(
                    lotRemaining(lot)
                ),

                statusLabel(
                    lotStatus(lot)
                )

            ];

        }
    );

}


function savePdf(
    doc,
    name
) {

    doc.save(
        name
            .replace(
                /\s+/g,
                "_"
            )
        +
        ".pdf"
    );

}


// ============================================================
// PDF GERAL
// ============================================================

if ($("pdfGeneralBtn")) {

    $("pdfGeneralBtn").onclick =
        () => {

            if (!roleIsAdmin()) {

                alert(
                    "Somente administradores podem gerar o PDF geral."
                );

                return;

            }


            const from =
                $("reportFrom")
                    .value;


            const to =
                $("reportTo")
                    .value;


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
                    (total, lot) =>
                        total +
                        Number(
                            lot.weight || 0
                        ),
                    0
                );


            const produced =
                lots.reduce(
                    (total, lot) =>
                        total +
                        lotProduced(lot),
                    0
                );

            const performance =
                buildPerformance(
                    lots,
                    from,
                    to
                );


            doc.setFontSize(
                11
            );


            doc.text(

                `Programado: ${kg(planned)}   ` +

                `Produzido: ${kg(produced)}   ` +

                `Saldo: ${kg(planned - produced)}   ` +

                `Realização: ${
                    pct(
                        planned
                            ? (
                                produced /
                                planned
                            ) * 100
                            : 0
                    )
                }   ` +

                `Média/dia período: ${kg(
                    performance.periodAverage
                )}`,

                14,
                31

            );


            const by = {};


            lots.forEach(
                lot => {

                    const user =
                        allUsers.find(
                            item =>
                                item.id ===
                                lot.assignedTo
                        );


                    const key =
                        `${lot.programDate}|${lot.assignedTo}`;


                    if (!by[key]) {

                        by[key] = {

                            date:
                                lot.programDate,

                            name:
                                user?.name ||
                                "—",

                            produced:
                                0,

                            clients:
                                new Set(),

                            lots:
                                0

                        };

                    }


                    by[key].produced +=
                        lotProduced(lot);


                    by[key].clients.add(
                        lot.clientName ||
                        lot.name ||
                        "Sem cliente"
                    );


                    by[key].lots++;

                }
            );


            doc.autoTable({

                startY:
                    38,

                head: [[

                    "Data",
                    "Colaborador",
                    "Peso do dia",
                    "Clientes",
                    "Lotes"

                ]],

                body:
                    Object
                        .values(by)
                        .sort(
                            (a, b) =>
                                String(
                                    a.date ||
                                    ""
                                ).localeCompare(
                                    String(
                                        b.date ||
                                        ""
                                    )
                                )
                        )
                        .map(
                            row => [

                                dateBR(
                                    row.date
                                ),

                                row.name,

                                kg(
                                    row.produced
                                ),

                                [
                                    ...row.clients
                                ].join(", "),

                                row.lots

                            ]
                        )

            });


            doc.addPage();

            doc.setFontSize(14);

            doc.text(
                "ANÁLISE DE DESEMPENHO",
                14,
                16
            );

            doc.setFontSize(9);

            doc.text(
                `Dias no período: ${performance.periodDays}   ` +
                `Média/dia do período: ${kg(performance.periodAverage)}`,
                14,
                23
            );

            doc.autoTable({

                startY: 28,

                head: [[
                    "Colaborador",
                    "Produzido",
                    "Dias trabalhados",
                    "Média/dia trabalhado",
                    "Média/dia período",
                    "Programado",
                    "Realização",
                    "Lotes"
                ]],

                body:
                    performance.collaborators.map(
                        row => [
                            row.name,
                            kg(row.produced),
                            row.daysWorked,
                            kg(row.averagePerWorkedDay),
                            kg(row.averagePerPeriodDay),
                            kg(row.planned),
                            pct(row.realization),
                            row.lots
                        ]
                    )

            });


            doc.addPage();


            doc.setFontSize(
                14
            );


            doc.text(
                "DETALHAMENTO DOS LOTES",
                14,
                16
            );


            doc.autoTable({

                startY:
                    22,

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
                    pdfRows(
                        lots
                    )

            });


            savePdf(
                doc,
                `Relatorio_Geral_${from}_${to}`
            );

        };

}


// ============================================================
// PDF INDIVIDUAL
// ============================================================

if ($("pdfIndividualBtn")) {

    $("pdfIndividualBtn").onclick =
        () => {

            const uid =
                $("reportUser")
                    .value;


            if (!uid) {

                alert(
                    "Selecione um colaborador para o PDF individual."
                );

                return;

            }


            const from =
                $("reportFrom")
                    .value;


            const to =
                $("reportTo")
                    .value;


            const user =
                allUsers.find(
                    item =>
                        item.id === uid
                );


            const lots =
                dateRange(
                    from,
                    to
                )
                .filter(
                    lot =>
                        lot.assignedTo ===
                        uid
                );


            const doc =
                pdfBase(
                    `RELATÓRIO INDIVIDUAL - ${
                        user?.name ||
                        "Colaborador"
                    }`,
                    from,
                    to
                );


            const planned =
                lots.reduce(
                    (total, lot) =>
                        total +
                        Number(
                            lot.weight || 0
                        ),
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
                    lots.map(
                        lot =>
                            lot.clientName ||
                            lot.name
                    )
                );

            const performance =
                buildPerformance(
                    lots,
                    from,
                    to
                );


            doc.setFontSize(
                11
            );


            doc.text(

                `Programado: ${kg(planned)}   ` +

                `Produzido: ${kg(produced)}   ` +

                `Saldo: ${kg(planned - produced)}   ` +

                `Realização: ${
                    pct(
                        planned
                            ? (
                                produced /
                                planned
                            ) * 100
                            : 0
                    )
                }   ` +

                `Clientes: ${clients.size}   ` +

                `Média/dia período: ${kg(
                    performance.periodAverage
                )}   ` +

                `Média/dia trabalhado: ${kg(
                    performance.collaborators[0]?.averagePerWorkedDay || 0
                )}`,

                14,
                31

            );


            const by = {};


            lots.forEach(
                lot => {

                    const date =
                        lot.programDate;


                    if (!by[date]) {

                        by[date] = {

                            produced:
                                0,

                            clients:
                                new Set(),

                            lots:
                                0

                        };

                    }


                    by[date].produced +=
                        lotProduced(lot);


                    by[date].clients.add(
                        lot.clientName ||
                        lot.name ||
                        "Sem cliente"
                    );


                    by[date].lots++;

                }
            );


            doc.autoTable({

                startY:
                    38,

                head: [[

                    "Data",
                    "Peso do dia",
                    "Clientes",
                    "Lotes"

                ]],

                body:
                    Object
                        .entries(by)
                        .sort(
                            (a, b) =>
                                String(
                                    a[0] ||
                                    ""
                                ).localeCompare(
                                    String(
                                        b[0] ||
                                        ""
                                    )
                                )
                        )
                        .map(
                            ([date, row]) => [

                                dateBR(
                                    date
                                ),

                                kg(
                                    row.produced
                                ),

                                [
                                    ...row.clients
                                ].join(", "),

                                row.lots

                            ]
                        )

            });


            doc.addPage();

            doc.setFontSize(14);

            doc.text(
                "ANÁLISE DE DESEMPENHO",
                14,
                16
            );

            doc.setFontSize(9);

            doc.text(
                `Dias no período: ${performance.periodDays}   ` +
                `Média/dia do período: ${kg(performance.periodAverage)}   ` +
                `Média/dia trabalhado: ${kg(performance.collaborators[0]?.averagePerWorkedDay || 0)}`,
                14,
                23
            );

            doc.autoTable({

                startY: 28,

                head: [[
                    "Colaborador",
                    "Produzido",
                    "Dias trabalhados",
                    "Média/dia trabalhado",
                    "Média/dia período",
                    "Programado",
                    "Realização",
                    "Lotes"
                ]],

                body:
                    performance.collaborators.map(
                        row => [
                            row.name,
                            kg(row.produced),
                            row.daysWorked,
                            kg(row.averagePerWorkedDay),
                            kg(row.averagePerPeriodDay),
                            kg(row.planned),
                            pct(row.realization),
                            row.lots
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

                startY:
                    22,

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
                        lot => [

                            dateBR(
                                lot.programDate
                            ),

                            lot.os ||
                                "—",

                            lot.name ||
                                "—",

                            kg(
                                lot.weight
                            ),

                            kg(
                                lotProduced(
                                    lot
                                )
                            ),

                            kg(
                                lotRemaining(
                                    lot
                                )
                            ),

                            statusLabel(
                                lotStatus(
                                    lot
                                )
                            )

                        ]
                    )

            });


            savePdf(
                doc,
                `Relatorio_${
                    user?.name ||
                    "Colaborador"
                }_${from}_${to}`
            );

        };

}


// ============================================================
// COLABORADORES
// ============================================================

function renderUsers() {

    if (!roleIsAdmin()) {

        return;

    }


    if (!$("usersTable")) {

        return;

    }


    $("usersTable")
        .innerHTML = `

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

                            ? allUsers.map(
                                user => {

                                    const load =
                                        allLots
                                            .filter(
                                                lot =>
                                                    lot.assignedTo ===
                                                        user.id
                                                    &&
                                                    [
                                                        "pendente",
                                                        "producao"
                                                    ]
                                                    .includes(
                                                        lotStatus(
                                                            lot
                                                        )
                                                    )
                                            )
                                            .reduce(
                                                (
                                                    total,
                                                    lot
                                                ) =>
                                                    total +
                                                    lotRemaining(
                                                        lot
                                                    ),
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

                                }
                            ).join("")

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
                .textContent =
                "";


            try {

                // =================================================
                // APP SECUNDÁRIO
                // =================================================

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


                $("userFormMessage")
                    .className =
                    "success";


                $("userFormMessage")
                    .textContent =
                    "Colaborador criado com sucesso.";


                event.target.reset();


                await loadData();


            } catch (error) {

                console.error(
                    "Erro ao criar colaborador:",
                    error
                );


                $("userFormMessage")
                    .className =
                    "error";


                $("userFormMessage")
                    .textContent =
                    error.message ||
                    "Erro ao criar colaborador.";

            } finally {

                // Encerra o app secundário mesmo se uma etapa falhar.
                try {
                    await secondary.delete();
                } catch (cleanupError) {
                    console.warn(
                        "Não foi possível encerrar o app secundário:",
                        cleanupError
                    );
                }

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


        console.log(
            "UID administrativo configurado:",
            MASTER_ADMIN_UID
        );

    }
);


/*
 * ============================================================
 * EDIÇÃO COMPLETA DO LOTE PELO ADMINISTRADOR
 * ============================================================
 *
 * A tela de edição pode chamar:
 *
 * await adminUpdateLot(lotId, {
 *   name: "Novo nome",
 *   osNumber: "12345",
 *   originalWeight: 1000,
 *   assignedTo: "UID_DO_COLABORADOR",
 *   startDate: "2026-08-10",
 *   endDate: "2026-08-11"
 * });
 *
 * A Firestore Rule garante que somente o administrador
 * consiga alterar todos esses campos.
 */
window.adminUpdateLot = async function adminUpdateLot(lotId, updates) {

    if (!currentUser || !roleIsAdmin()) {
        throw new Error(
            "Apenas o administrador pode editar todos os campos do lote."
        );
    }

    if (!lotId || !updates || typeof updates !== "object") {
        throw new Error("Dados inválidos para atualização do lote.");
    }

    const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(
            ([, value]) => value !== undefined
        )
    );

    cleanUpdates.updatedAt =
        firebase.firestore.FieldValue.serverTimestamp();

    await db
        .collection("lots")
        .doc(lotId)
        .update(cleanUpdates);

    return true;
};

/* ADMIN - editor visual */
window.openAdminLotEditor = function(lotId, lot) {
    if (!roleIsAdmin()) {
        alert("Apenas o administrador pode editar.");
        return;
    }

    const modal = document.createElement("div");
    modal.id = "adminLotEditModal";
    modal.style.cssText =
        "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;" +
        "display:flex;align-items:center;justify-content:center;padding:20px;";

    const box = document.createElement("div");
    box.style.cssText =
        "background:white;padding:24px;border-radius:12px;width:min(720px,95vw);" +
        "max-height:90vh;overflow:auto;";

    const fields = [
        ["name","Nome","text"],
        ["osNumber","Número da OS","text"],
        ["originalWeight","Peso","number"],
        ["client","Cliente","text"],
        ["assignedTo","Colaborador (UID)","text"],
        ["startDate","Data inicial","date"],
        ["endDate","Data final","date"],
        ["status","Status","text"],
        ["lastObservation","Observação","text"]
    ];

    box.innerHTML = "<h2>Editar lote</h2>";
    const form = document.createElement("div");
    form.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:12px;";

    const inputs = {};
    fields.forEach(([key,label,type]) => {
        const wrap = document.createElement("label");
        wrap.style.cssText = "display:flex;flex-direction:column;gap:5px;";
        const title = document.createElement("span");
        title.textContent = label;
        const input = document.createElement("input");
        input.type = type;
        input.value = lot && lot[key] != null ? String(lot[key]) : "";
        input.style.cssText = "padding:9px;border:1px solid #ccc;border-radius:6px;";
        inputs[key] = input;
        wrap.append(title,input);
        form.appendChild(wrap);
    });
    box.appendChild(form);

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;justify-content:flex-end;gap:10px;margin-top:18px;";
    const cancel = document.createElement("button");
    cancel.textContent = "Cancelar";
    cancel.onclick = () => modal.remove();

    const save = document.createElement("button");
    save.textContent = "Salvar alterações";
    save.onclick = async () => {
        save.disabled = true;
        try {
            const updates = {};
            for (const [key,input] of Object.entries(inputs)) {
                if (input.value !== "") {
                    updates[key] = input.type === "number" ? Number(input.value) : input.value;
                }
            }
            await adminUpdateLot(lotId, updates);
            modal.remove();
            alert("Lote atualizado com sucesso.");
            location.reload();
        } catch (e) {
            alert("Erro ao salvar: " + (e.message || e));
            save.disabled = false;
        }
    };

    actions.append(cancel,save);
    box.appendChild(actions);
    modal.appendChild(box);
    document.body.appendChild(modal);
};
