// ============================================================
// RELUZ PRODUÇÃO - APP.JS
// ============================================================


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


if (!firebase.apps.length) {

    firebase.initializeApp(
        firebaseConfig
    );

}


const auth =
    firebase.auth();


const db =
    firebase.firestore();


// ============================================================
// ADMINISTRADOR PRINCIPAL
// ============================================================

const MASTER_ADMIN_UID =
    "3QlkmlndAXaGxErEpCL17Mun35E3";


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

    return String(value)
        .replace(
            /[&<>"']/g,
            character => {

                const map = {

                    "&": "&amp;",

                    "<": "&lt;",

                    ">": "&gt;",

                    '"': "&quot;",

                    "'": "&#039;"

                };

                return map[character];

            }
        );

}


function dateRange(from, to) {

    return allLots.filter(lot => {

        return (
            (!from ||
                lot.programDate >= from)
            &&
            (!to ||
                lot.programDate <= to)
        );

    });

}


// ============================================================
// ADMINISTRADOR
// ============================================================

function roleIsAdmin() {

    if (!currentUser) {

        return false;

    }

    return (
        currentUser.uid ===
        MASTER_ADMIN_UID
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

    return role === "colaborador";

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

            const snap =
                await db
                    .collection("users")
                    .doc(user.uid)
                    .get();


            // ==================================================
            // MASTER ADMIN
            // ==================================================

            if (
                user.uid ===
                MASTER_ADMIN_UID
            ) {

                if (snap.exists) {

                    currentProfile = {

                        uid:
                            user.uid,

                        ...snap.data()

                    };

                } else {

                    // Mesmo que o perfil não exista,
                    // o UID principal continua sendo admin.

                    currentProfile = {

                        uid:
                            user.uid,

                        name:
                            user.email ||
                            "Administrador",

                        email:
                            user.email,

                        role:
                            "admin",

                        active:
                            true

                    };

                }

            }

            // ==================================================
            // OUTROS USUÁRIOS
            // ==================================================

            else {

                if (!snap.exists) {

                    await auth.signOut();

                    throw new Error(
                        "Usuário sem perfil cadastrado no Firestore."
                    );

                }


                currentProfile = {

                    uid:
                        user.uid,

                    ...snap.data()

                };


                if (
                    currentProfile.active === false
                ) {

                    await auth.signOut();

                    throw new Error(
                        "Este usuário está inativo."
                    );

                }

            }


            console.log(
                "PERFIL ATUAL:",
                currentProfile
            );


            console.log(
                "UID:",
                currentUser.uid
            );


            console.log(
                "É ADMIN:",
                roleIsAdmin()
            );


            console.log(
                "É COLABORADOR:",
                roleIsCollaborator()
            );


            showApp();


            await loadData();


        } catch (error) {

            console.error(
                "Erro de autenticação:",
                error
            );


            if ($("loginError")) {

                $("loginError")
                    .textContent =
                    error.message ||
                    "Erro ao carregar perfil.";

            }


            await auth.signOut();

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

        $("userName")
            .textContent =
            currentProfile?.name ||
            currentUser?.email ||
            "Usuário";

    }


    if ($("userRole")) {

        $("userRole")
            .textContent =
            roleIsAdmin()
                ? "Administrador"
                : "Colaborador";

    }


    document
        .querySelectorAll(".admin-only")
        .forEach(element => {

            element.classList.toggle(
                "hidden",
                !roleIsAdmin()
            );

        });


    if ($("todayLabel")) {

        $("todayLabel")
            .textContent =
            new Date()
                .toLocaleDateString(
                    "pt-BR",
                    {
                        dateStyle:
                            "full"
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

function initLogin() {

    if (!$("loginForm")) {

        return;

    }


    $("loginForm")
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                if ($("loginError")) {

                    $("loginError")
                        .textContent = "";

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

                    console.error(
                        error
                    );


                    if ($("loginError")) {

                        $("loginError")
                            .textContent =
                            "E-mail ou senha inválidos.";

                    }

                }

            }
        );

}


// ============================================================
// LOGOUT
// ============================================================

function initLogout() {

    if (!$("logoutBtn")) {

        return;

    }


    $("logoutBtn")
        .onclick =
        () => auth.signOut();

}


// ============================================================
// ATUALIZAR
// ============================================================

function initRefresh() {

    if (!$("refreshBtn")) {

        return;

    }


    $("refreshBtn")
        .onclick =
        () => loadData();

}


// ============================================================
// NAVEGAÇÃO
// ============================================================

function initNavigation() {

    document
        .querySelectorAll(".nav-btn")
        .forEach(button => {

            button.onclick = () => {

                // ------------------------------------------
                // PROTEGER ÁREAS ADMINISTRATIVAS
                // ------------------------------------------

                if (
                    button.classList
                        .contains("admin-only")
                    &&
                    !roleIsAdmin()
                ) {

                    return;

                }


                document
                    .querySelectorAll(".nav-btn")
                    .forEach(btn => {

                        btn.classList
                            .remove("active");

                    });


                button.classList
                    .add("active");


                document
                    .querySelectorAll(".view")
                    .forEach(view => {

                        view.classList
                            .add("hidden");

                    });


                const view =
                    $("view-" +
                        button.dataset.view);


                if (view) {

                    view.classList
                        .remove("hidden");

                }


                if ($("pageTitle")) {

                    $("pageTitle")
                        .textContent =
                        button
                            .textContent
                            .trim();

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

}


// ============================================================
// CARREGAR DADOS
// ============================================================

async function loadData() {

    if (!currentUser) {

        return;

    }


    try {

        // ====================================================
        // ADMIN
        // ====================================================

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

                        id:
                            doc.id,

                        ...doc.data()

                    })
                );


            allUsers =
                usersSnap.docs.map(
                    doc => ({

                        id:
                            doc.id,

                        ...doc.data()

                    })
                );

        }

        // ====================================================
        // COLABORADOR
        // ====================================================

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

                        id:
                            doc.id,

                        ...doc.data()

                    })
                );


            allUsers = [

                {

                    id:
                        currentUser.uid,

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
            "Erro ao carregar dados:",
            error
        );


        const message =
            error.message ||
            "Permissão insuficiente.";


        if ($("loginError")) {

            $("loginError")
                .textContent =
                "Erro ao carregar dados: " +
                message;

        }


        alert(
            "Erro ao carregar dados do Firebase:\n\n" +
            message
        );

    }

}


// ============================================================
// SELECTS
// ============================================================

function fillUserSelects() {

    const activeUsers =
        allUsers.filter(
            user =>
                user.active !== false
        );


    if ($("kanbanCollaborator")) {

        $("kanbanCollaborator")
            .innerHTML =

            `<option value="">
                Todos
            </option>` +

            activeUsers
                .map(
                    user => `

                        <option value="${escapeHtml(
                            user.id
                        )}">

                            ${escapeHtml(
                                user.name ||
                                user.email ||
                                "Sem nome"
                            )}

                        </option>

                    `
                )
                .join("");

    }


    if ($("reportUser")) {

        $("reportUser")
            .innerHTML =

            `<option value="">
                Todos os colaboradores
            </option>` +

            activeUsers
                .map(
                    user => `

                        <option value="${escapeHtml(
                            user.id
                        )}">

                            ${escapeHtml(
                                user.name ||
                                user.email ||
                                "Sem nome"
                            )}

                        </option>

                    `
                )
                .join("");

    }

}


// ============================================================
// FUNÇÕES DOS LOTES
// ============================================================

function lotProduced(lot) {

    return Number(
        lot?.producedWeight || 0
    );

}


function lotRemaining(lot) {

    return Math.max(

        0,

        Number(
            lot?.weight || 0
        )
        -
        lotProduced(lot)

    );

}


function lotPercent(lot) {

    const weight =
        Number(
            lot?.weight || 0
        );


    if (weight <= 0) {

        return 0;

    }


    return Math.min(

        100,

        (
            lotProduced(lot) /
            weight
        ) *
        100

    );

}


function lotStatus(lot) {

    if (!lot) {

        return "pendente";

    }


    if (
        lot.status ===
        "cancelado"
    ) {

        return "cancelado";

    }


    if (
        lot.status ===
        "finalizado"
    ) {

        return "finalizado";

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

    }[status] || status || "—";

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

        $("dashboardCards")
            .innerHTML = [

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
                .map(
                    item => `

                        <div class="card">

                            <small>
                                ${item[0]}
                            </small>

                            <strong>
                                ${item[1]}
                            </strong>

                        </div>

                    `
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
                    (
                        a.date || ""
                    ).localeCompare(
                        b.date || ""
                    )
                    ||
                    a.name.localeCompare(
                        b.name
                    )
            );


    if ($("dailyCollaboratorTable")) {

        $("dailyCollaboratorTable")
            .innerHTML = `

                <div class="table-wrap">

                    <table class="data-table">

                        <thead>

                            <tr>

                                <th>
                                    Data
                                </th>

                                <th>
                                    Colaborador
                                </th>

                                <th>
                                    Peso do dia
                                </th>

                                <th>
                                    Clientes
                                </th>

                                <th>
                                    Lotes
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            ${
                                rows.length

                                    ? rows
                                        .map(
                                            row => `

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

                                            `
                                        )
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

        "finalizado",

        "cancelado"

    ];


    if ($("statusSummary")) {

        $("statusSummary")
            .innerHTML = `

                <div class="status-table">

                    ${statuses
                        .map(
                            status => `

                                <div
                                    class="status-row"
                                >

                                    <span>
                                        ${statusLabel(
                                            status
                                        )}
                                    </span>

                                    <strong>
                                        ${
                                            lots.filter(
                                                lot =>
                                                    lotStatus(
                                                        lot
                                                    ) ===
                                                    status
                                            ).length
                                        }
                                    </strong>

                                </div>

                            `
                        )
                        .join("")}

                </div>

            `;

    }

}


// ============================================================
// CARD DO KANBAN
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
            onclick="window.openLot('${lot.id}')"
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
                Produzido:
                ${kg(
                    lotProduced(lot)
                )}
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


    const uid =
        $("kanbanCollaborator")
            ?.value;


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


    renderKanbanInto(
        "kanban",
        lots
    );

}


function renderMine() {

    if (!$("mineKanban")) {

        return;

    }


    const lots =
        dateRange(
            $("mineFrom").value,
            $("mineTo").value
        )
            .filter(
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


    $(id)
        .innerHTML =
        columns
            .map(
                ([status, title]) => {

                    const list =
                        lots.filter(
                            lot =>
                                lotStatus(
                                    lot
                                ) ===
                                status
                        );


                    return `

                        <div
                            class="kanban-column"
                        >

                            <h3>

                                ${title}

                                <span class="badge">
                                    ${list.length}
                                </span>

                            </h3>


                            ${
                                list.length

                                    ? list
                                        .map(
                                            lotCard
                                        )
                                        .join("")

                                    : `

                                        <div
                                            class="empty-state"
                                        >
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


// ============================================================
// FILTROS KANBAN
// ============================================================

function initFilters() {

    if ($("kanbanFilterBtn")) {

        $("kanbanFilterBtn")
            .onclick =
            renderKanban;

    }


    if ($("mineFilterBtn")) {

        $("mineFilterBtn")
            .onclick =
            renderMine;

    }


    if ($("dashFilterBtn")) {

        $("dashFilterBtn")
            .onclick =
            renderDashboard;

    }


    if ($("reportFilterBtn")) {

        $("reportFilterBtn")
            .onclick =
            renderReport;

    }

}


// ============================================================
// MODAL
// ============================================================

window.openLot =
async function(id) {

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


    const user =
        allUsers.find(
            item =>
                item.id ===
                lot.assignedTo
        );


    const mine =
        lot.assignedTo ===
        currentUser?.uid;


    const canEditProduction =
        roleIsAdmin() ||
        mine;


    if (!$("lotModalContent")) {

        return;

    }


    $("lotModalContent")
        .innerHTML = `

            <h2>
                ${escapeHtml(
                    lot.name ||
                    "Lote"
                )}
            </h2>


            <div class="modal-grid">

                <div>

                    <small>
                        OS
                    </small>

                    <strong>
                        ${escapeHtml(
                            lot.os ||
                            "—"
                        )}
                    </strong>

                </div>


                <div>

                    <small>
                        Cliente
                    </small>

                    <strong>
                        ${escapeHtml(
                            lot.clientName ||
                            lot.name ||
                            "—"
                        )}
                    </strong>

                </div>


                <div>

                    <small>
                        Peso do lote
                    </small>

                    <strong>
                        ${kg(
                            lot.weight
                        )}
                    </strong>

                </div>


                <div>

                    <small>
                        Produzido
                    </small>

                    <strong>
                        ${kg(
                            lotProduced(lot)
                        )}
                    </strong>

                </div>


                <div>

                    <small>
                        Saldo
                    </small>

                    <strong>
                        ${kg(
                            lotRemaining(lot)
                        )}
                    </strong>

                </div>


                <div>

                    <small>
                        Data entrada
                    </small>

                    <strong>
                        ${dateBR(
                            lot.entryDate
                        )}
                    </strong>

                </div>


                <div>

                    <small>
                        Programação
                    </small>

                    <strong>
                        ${dateBR(
                            lot.programDate
                        )}
                    </strong>

                </div>


                <div>

                    <small>
                        Responsável
                    </small>

                    <strong>
                        ${escapeHtml(
                            user?.name ||
                            "—"
                        )}
                    </strong>

                </div>


                <div>

                    <small>
                        Status
                    </small>

                    <strong>
                        ${statusLabel(
                            lotStatus(lot)
                        )}
                    </strong>

                </div>


                <div>

                    <small>
                        Percentual
                    </small>

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

                            <h3>
                                Registrar produção
                            </h3>


                            <p>
                                Informe o peso
                                produzido nesta
                                operação.
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


            <div
                class="modal-actions"
                style="
                    display:flex;
                    gap:8px;
                    justify-content:flex-end;
                    margin-top:15px;
                "
            >

                ${
                    roleIsAdmin()

                        ? `

                            <button
                                type="button"
                                class="secondary"
                                onclick="
                                    window.redistributeLot('${lot.id}')
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
                    onclick="
                        window.closeLotModal()
                    "
                >

                    Fechar

                </button>

            </div>


            <div
                id="modalMessage"
            ></div>

        `;


    $("lotModal")
        ?.classList
        .remove("hidden");


    if (canEditProduction) {

        if ($("productionForm")) {

            $("productionForm")
                .onsubmit =
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

};


// ============================================================
// FECHAR CLICANDO FORA
// ============================================================

function initModal() {

    if (!$("lotModal")) {

        return;

    }


    $("lotModal")
        .addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    $("lotModal")
                ) {

                    window.closeLotModal();

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


    if (!currentUser) {

        return;

    }


    const input =
        $("productionInput");


    const obsInput =
        $("productionObs");


    const amount =
        Number(
            input?.value || 0
        );


    if (amount <= 0) {

        if ($("modalMessage")) {

            $("modalMessage")
                .textContent =
                "Informe um peso maior que zero.";

        }

        return;

    }


    if (
        lotProduced(lot) +
        amount >
        Number(lot.weight) +
        0.0001
    ) {

        if ($("modalMessage")) {

            $("modalMessage")
                .textContent =
                "O peso produzido ultrapassa o peso do lote.";

        }

        return;

    }


    const observation =
        obsInput?.value
            ?.trim() ||
        "";


    try {

        await db.runTransaction(
            async transaction => {

                const ref =
                    db
                        .collection("lots")
                        .doc(lot.id);


                const snap =
                    await transaction
                        .get(ref);


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
                        "A produção ultrapassa o peso do lote."
                    );

                }


                const newStatus =
                    next >=
                    weight -
                    0.0001

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


        window.closeLotModal();


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
// EDITAR LOTE
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


    if (!$("lotModalContent")) {

        return;

    }


    // ========================================================
    // COLABORADORES DISPONÍVEIS
    // ========================================================

    const collaborators =
        allUsers.filter(
            user => {

                const isAssigned =
                    user.id ===
                    lot.assignedTo;


                const isCollaborator =
                    String(
                        user.role ||
                        ""
                    )
                        .toLowerCase() ===
                    "colaborador";


                const isActive =
                    user.active !== false;


                return (
                    isAssigned ||
                    (
                        isCollaborator &&
                        isActive
                    )
                );

            }
        );


    $("lotModalContent")
        .innerHTML = `

            <h2>
                ✏️ Editar lote
            </h2>


            <form
                id="editLotForm"
                class="form-grid"
                style="
                    margin-top:20px;
                "
            >

                <label>

                    Nome do lote

                    <input
                        id="editLotName"
                        value="${escapeHtml(
                            lot.name ||
                            ""
                        )}"
                        required
                    >

                </label>


                <label>

                    OS

                    <input
                        id="editLotOs"
                        value="${escapeHtml(
                            lot.os ||
                            ""
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
                            lot.weight ||
                            0
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
                            lot.entryDate ||
                            ""
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
                            lot.programDate ||
                            ""
                        )}"
                        required
                    >

                </label>


                <label>

                    Colaborador responsável

                    <select
                        id="editLotAssignedTo"
                        required
                    >

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


                <label>

                    Status

                    <select
                        id="editLotStatus"
                        required
                    >

                        <option
                            value="pendente"
                            ${
                                lot.status ===
                                "pendente"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Pendente
                        </option>


                        <option
                            value="producao"
                            ${
                                lot.status ===
                                "producao"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Em produção
                        </option>


                        <option
                            value="finalizado"
                            ${
                                lot.status ===
                                "finalizado"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Finalizado
                        </option>


                        <option
                            value="cancelado"
                            ${
                                lot.status ===
                                "cancelado"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Cancelado
                        </option>

                    </select>

                </label>


                <div
                    class="full"
                    style="
                        display:flex;
                        gap:10px;
                        margin-top:15px;
                    "
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
                        onclick="
                            window.openLot('${lot.id}')
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


    if (!$("editLotForm")) {

        return;

    }


    $("editLotForm")
        .onsubmit =
        async event => {

            event.preventDefault();


            const message =
                $("editLotMessage");


            if (message) {

                message.className = "";

                message.textContent =
                    "Salvando alterações...";

            }


            try {

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
                    $("editLotAssignedTo")
                        .value;


                const status =
                    $("editLotStatus")
                        .value;


                if (!name) {

                    throw new Error(
                        "Informe o nome do lote."
                    );

                }


                if (!os) {

                    throw new Error(
                        "Informe a OS."
                    );

                }


                if (!clientName) {

                    throw new Error(
                        "Informe o cliente."
                    );

                }


                if (
                    !weight ||
                    weight <= 0
                ) {

                    throw new Error(
                        "Informe um peso válido."
                    );

                }


                if (!entryDate) {

                    throw new Error(
                        "Informe a data de entrada."
                    );

                }


                if (!programDate) {

                    throw new Error(
                        "Informe a data de programação."
                    );

                }


                if (!assignedTo) {

                    throw new Error(
                        "Selecione um colaborador."
                    );

                }


                // ------------------------------------------
                // NÃO DEIXAR PESO MENOR QUE PRODUZIDO
                // ------------------------------------------

                const produced =
                    lotProduced(lot);


                if (
                    weight <
                    produced
                ) {

                    throw new Error(
                        `O peso do lote não pode ser menor que o já produzido (${kg(produced)}).`
                    );

                }


                // ------------------------------------------
                // ATUALIZAR FIRESTORE
                // ------------------------------------------

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

                        status,

                        updatedAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp()

                    });


                if (message) {

                    message.className =
                        "success";

                    message.textContent =
                        "Lote alterado com sucesso.";

                }


                // ------------------------------------------
                // ATUALIZAR MEMÓRIA LOCAL
                // ------------------------------------------

                const index =
                    allLots.findIndex(
                        item =>
                            item.id ===
                            lot.id
                    );


                if (index >= 0) {

                    allLots[index] = {

                        ...allLots[index],

                        name,

                        os,

                        clientName,

                        weight,

                        entryDate,

                        programDate,

                        assignedTo,

                        status

                    };

                }


                // ------------------------------------------
                // RENDERIZAR
                // ------------------------------------------

                renderDashboard();

                renderKanban();

                renderMine();

                renderReport();


                // ------------------------------------------
                // REABRIR LOTE
                // ------------------------------------------

                setTimeout(
                    () => {

                        window.openLot(
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


                if (message) {

                    message.className =
                        "error";

                    message.textContent =
                        error.message ||
                        "Erro ao alterar lote.";

                }

            }

        };

};


// ============================================================
// REDISTRIBUIR LOTE
// ============================================================

window.redistributeLot =
async function(id) {

    if (!roleIsAdmin()) {

        alert(
            "Somente o administrador pode redistribuir lotes."
        );

        return;

    }


    const lot =
        allLots.find(
            item =>
                item.id === id
        );


    if (!lot) {

        return;

    }


    const activeUsers =
        allUsers.filter(
            user =>
                user.active !== false &&
                String(
                    user.role ||
                    ""
                )
                    .toLowerCase() ===
                "colaborador"
        );


    if (!activeUsers.length) {

        alert(
            "Não existem colaboradores ativos."
        );

        return;

    }


    const loads = {};


    allLots.forEach(item => {

        if (
            item.id !== id
            &&
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
                )
                +
                lotRemaining(item);

        }

    });


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


        await loadData();


        window.openLot(id);


    } catch (error) {

        console.error(
            "Erro ao redistribuir:",
            error
        );


        alert(
            error.message ||
            "Erro ao redistribuir lote."
        );

    }

};


// ============================================================
// CADASTRAR LOTE
// ============================================================

function initLotForm() {

    if (!$("lotForm")) {

        return;

    }


    $("lotForm")
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                if (!roleIsAdmin()) {

                    return;

                }


                if ($("lotFormMessage")) {

                    $("lotFormMessage")
                        .textContent = "";

                }


                try {

                    const weight =
                        Number(
                            $("lotWeight")
                                .value
                        );


                    if (
                        !weight ||
                        weight <= 0
                    ) {

                        throw new Error(
                            "Informe um peso válido."
                        );

                    }


                    const activeUsers =
                        allUsers.filter(
                            user =>
                                user.active !== false &&
                                String(
                                    user.role ||
                                    ""
                                )
                                    .toLowerCase() ===
                                "colaborador"
                        );


                    if (
                        !activeUsers.length
                    ) {

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
                                ].includes(
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


                    const lotOs =
                        $("lotOs")
                            .value
                            .trim();


                    const data = {

                        name:
                            lotName,

                        os:
                            lotOs,

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


                    await ref.set(
                        data
                    );


                    if ($("lotFormMessage")) {

                        $("lotFormMessage")
                            .className =
                            "success";


                        $("lotFormMessage")
                            .textContent =
                            `Lote distribuído para ${chosen.name}. Carga pendente atual: ${kg(loads[chosen.id] || 0)}.`;

                    }


                    event.target.reset();


                    await loadData();


                } catch (error) {

                    console.error(
                        "Erro ao cadastrar lote:",
                        error
                    );


                    if ($("lotFormMessage")) {

                        $("lotFormMessage")
                            .className =
                            "error";


                        $("lotFormMessage")
                            .textContent =
                            error.message ||
                            "Erro ao cadastrar lote.";

                    }

                }

            }
        );

}


// ============================================================
// RELATÓRIO
// ============================================================

function renderReport() {

    if (!$("reportSummary")) {

        return;

    }


    let lots =
        dateRange(
            $("reportFrom")
                ?.value || "",

            $("reportTo")
                ?.value || ""
        );


    const uid =
        $("reportUser")
            ?.value || "";


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
                    lot.weight ||
                    0
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
                        ? produced /
                          planned *
                          100
                        : 0
                )
            ],

            [
                "Clientes",
                clients.size
            ]

        ]
            .map(
                item => `

                    <div class="card">

                        <small>
                            ${item[0]}
                        </small>

                        <strong>
                            ${item[1]}
                        </strong>

                    </div>

                `
            )
            .join("");


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
                lot.weight ||
                0
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
                    (
                        a.date ||
                        ""
                    ).localeCompare(
                        b.date ||
                        ""
                    )
                    ||
                    a.user.localeCompare(
                        b.user
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

                                <th>
                                    Data
                                </th>

                                <th>
                                    Colaborador
                                </th>

                                <th>
                                    Peso do dia
                                </th>

                                <th>
                                    Programado
                                </th>

                                <th>
                                    Clientes
                                </th>

                                <th>
                                    Lotes
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            ${
                                rows.length

                                    ? rows
                                        .map(
                                            row => `

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

                                            `
                                        )
                                        .join("")

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

                                <th>
                                    Programação
                                </th>

                                <th>
                                    OS
                                </th>

                                <th>
                                    Lote
                                </th>

                                <th>
                                    Colaborador
                                </th>

                                <th>
                                    Peso
                                </th>

                                <th>
                                    Produzido
                                </th>

                                <th>
                                    Saldo
                                </th>

                                <th>
                                    Status
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            ${
                                lots.length

                                    ? [...lots]
                                        .sort(
                                            (a, b) =>
                                                (
                                                    a.programDate ||
                                                    ""
                                                ).localeCompare(
                                                    b.programDate ||
                                                    ""
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


// ============================================================
// PDF
// ============================================================

function pdfBase(
    title,
    from,
    to
) {

    const jsPDF =
        window.jspdf?.jsPDF;


    if (!jsPDF) {

        throw new Error(
            "Biblioteca jsPDF não carregada."
        );

    }


    const doc =
        new jsPDF({

            orientation:
                "landscape"

        });


    doc.setFontSize(
        18
    );


    doc.text(
        title,
        14,
        16
    );


    doc.setFontSize(
        9
    );


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

function initPdfButtons() {

    if ($("pdfGeneralBtn")) {

        $("pdfGeneralBtn")
            .onclick =
            () => {

                if (!roleIsAdmin()) {

                    alert(
                        "Somente o administrador pode gerar o PDF geral."
                    );

                    return;

                }


                try {

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
                                    lot.weight ||
                                    0
                                ),
                            0
                        );


                    const produced =
                        lots.reduce(
                            (total, lot) =>
                                total +
                                lotProduced(
                                    lot
                                ),
                            0
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
                                    ? produced /
                                      planned *
                                      100
                                    : 0
                            )
                        }`,

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
                                lotProduced(
                                    lot
                                );


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
                            Object.values(
                                by
                            )
                                .sort(
                                    (a, b) =>
                                        (
                                            a.date ||
                                            ""
                                        ).localeCompare(
                                            b.date ||
                                            ""
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


                } catch (error) {

                    console.error(
                        error
                    );


                    alert(
                        error.message ||
                        "Erro ao gerar PDF."
                    );

                }

            };

    }


    // ========================================================
    // PDF INDIVIDUAL
    // ========================================================

    if ($("pdfIndividualBtn")) {

        $("pdfIndividualBtn")
            .onclick =
            () => {

                try {

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
                                item.id ===
                                uid
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
                                    lot.weight ||
                                    0
                                ),
                            0
                        );


                    const produced =
                        lots.reduce(
                            (total, lot) =>
                                total +
                                lotProduced(
                                    lot
                                ),
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
                                    ? produced /
                                      planned *
                                      100
                                    : 0
                            )
                        }   ` +

                        `Clientes: ${clients.size}`,

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
                                lotProduced(
                                    lot
                                );


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
                            Object.entries(
                                by
                            )
                                .sort(
                                    (a, b) =>
                                        a[0].localeCompare(
                                            b[0]
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


                } catch (error) {

                    console.error(
                        error
                    );


                    alert(
                        error.message ||
                        "Erro ao gerar PDF."
                    );

                }

            };

    }

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

                            <th>
                                Nome
                            </th>

                            <th>
                                E-mail
                            </th>

                            <th>
                                Perfil
                            </th>

                            <th>
                                Ativo
                            </th>

                            <th>
                                Carga pendente
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${
                            allUsers.length

                                ? allUsers
                                    .map(
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
                                                            ].includes(
                                                                lotStatus(
                                                                    lot
                                                                )
                                                            )
                                                    )
                                                    .reduce(
                                                        (total, lot) =>
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
                                                        ${kg(
                                                            load
                                                        )}
                                                    </td>

                                                </tr>

                                            `;

                                        }
                                    )
                                    .join("")

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

function initUserForm() {

    if (!$("userForm")) {

        return;

    }


    $("userForm")
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                if (!roleIsAdmin()) {

                    alert(
                        "Somente o administrador pode criar colaboradores."
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


                if ($("userFormMessage")) {

                    $("userFormMessage")
                        .textContent = "";

                }


                if (
                    password.length <
                    6
                ) {

                    if ($("userFormMessage")) {

                        $("userFormMessage")
                            .className =
                            "error";

                        $("userFormMessage")
                            .textContent =
                            "A senha precisa ter pelo menos 6 caracteres.";

                    }

                    return;

                }


                let secondary = null;


                try {

                    // ======================================
                    // APP SECUNDÁRIO
                    // ======================================

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


                    const credential =
                        await secondaryAuth
                            .createUserWithEmailAndPassword(
                                email,
                                password
                            );


                    // ======================================
                    // CRIAR PERFIL
                    // ======================================

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


                    if ($("userFormMessage")) {

                        $("userFormMessage")
                            .className =
                            "success";


                        $("userFormMessage")
                            .textContent =
                            "Colaborador criado com sucesso.";

                    }


                    event.target.reset();


                    await loadData();


                } catch (error) {

                    console.error(
                        "Erro ao criar colaborador:",
                        error
                    );


                    if ($("userFormMessage")) {

                        $("userFormMessage")
                            .className =
                            "error";


                        $("userFormMessage")
                            .textContent =
                            error.message ||
                            "Erro ao criar colaborador.";

                    }

                } finally {

                    // ======================================
                    // ENCERRAR APP SECUNDÁRIO
                    // ======================================

                    if (secondary) {

                        try {

                            await secondary.delete();

                        } catch (error) {

                            console.warn(
                                "Não foi possível excluir o app secundário:",
                                error
                            );

                        }

                    }

                }

            }
        );

}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

function initializeAppUI() {

    console.log(
        "Reluz Produção carregado."
    );


    console.log(
        "MASTER ADMIN UID:",
        MASTER_ADMIN_UID
    );


    initLogin();

    initLogout();

    initRefresh();

    initNavigation();

    initFilters();

    initModal();

    initLotForm();

    initUserForm();

    initPdfButtons();

}


// ============================================================
// DOM READY
// ============================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeAppUI
    );

} else {

    initializeAppUI();

}
