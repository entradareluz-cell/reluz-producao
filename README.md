# Reluz Produção — GitHub Pages + Firebase

Sistema web de acompanhamento de produção com:

- Login individual por colaborador.
- Perfil Administrador e Colaborador.
- Cadastro de lotes: nome, OS, peso, data de entrada e data de programação.
- Distribuição automática por menor carga de peso pendente.
- Kanban: A Fazer / Em Produção / Finalizado / Cancelados.
- Colaborador registra peso produzido e observações.
- Dashboard geral.
- Relatório filtrado pela DATA DE PROGRAMAÇÃO.
- Relatório geral com produção por colaborador e por dia.
- Coluna de clientes atendidos por colaborador.
- PDF geral.
- PDF individual por colaborador e período.
- Cadastro de colaboradores pelo administrador.

## 1. Criar Firebase

1. Entre no Firebase Console.
2. Crie um projeto.
3. Ative Authentication > Sign-in method > Email/Password.
4. Crie um Firestore Database.
5. Cadastre manualmente o primeiro usuário administrador no Authentication.
6. No Firestore, crie:
   `users/{UID_DO_ADMIN}`

   com:
   - name: "Administrador"
   - email: "seu@email.com"
   - role: "admin"
   - active: true

7. Copie as regras de `firestore.rules` para o Firestore Rules.
8. Em Project settings > Your apps, crie um Web App.
9. Copie o objeto `firebaseConfig` para o começo de `app.js`.

## 2. Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie:
   - index.html
   - styles.css
   - app.js
   - firestore.rules
   - README.md
3. GitHub > Settings > Pages.
4. Source: Deploy from branch.
5. Selecione `main` e `/root`.
6. Salve.
7. Acesse a URL do GitHub Pages.

## 3. Primeiro acesso

Use o usuário administrador criado no Firebase.

Dentro de "Colaboradores", o administrador pode criar os logins dos colaboradores.

## 4. Regra de distribuição

O sistema calcula a carga pendente atual de cada colaborador:

carga = soma do saldo dos lotes pendentes/em produção.

O novo lote é atribuído ao colaborador com menor carga.

Isto é uma regra inicial de balanceamento por peso. Para uma operação mais avançada, podem ser acrescentados:
- capacidade diária individual;
- média histórica;
- limite diário;
- prioridade de OS;
- prazo de programação;
- peso máximo por lote;
- balanceamento por quantidade de lotes;
- bloqueio de férias/folga;
- revezamento.

## 5. Observação importante sobre cliente

O cadastro solicitado originalmente possui:
- nome do lote
- OS
- peso
- data de entrada
- data de programação

Como o relatório também precisa mostrar "clientes", nesta versão o campo `clientName` recebe inicialmente o nome do lote. Recomenda-se adicionar um campo separado "Cliente" no cadastro de lote antes de colocar o sistema em produção.

## 6. Segurança

O documento `users/{UID}` define o perfil de autorização:
- `role: "admin"` + `active` diferente de `false` = administrador;
- `role: "colaborador"` + `active: true` = colaborador.

O Firestore Rules impede que um colaborador:
- leia lotes de outros colaboradores;
- redistribua lotes;
- altere peso original;
- altere OS;
- altere datas;
- altere o responsável;
- altere dados administrativos do lote.

O administrador possui acesso global.

### Importante após esta atualização

Publique novamente o conteúdo de `firestore.rules` no Firebase Console.

Para o administrador, confirme que existe:
`users/{UID_DO_ADMIN}`

com pelo menos:
- `role: "admin"`
- `active: true`

A versão atual não depende exclusivamente do UID fixo que estava no código. Isso evita o erro de `Missing or insufficient permissions` quando o UID configurado no JavaScript não corresponde ao usuário administrador real.

## 7. Produção parcial

Cada registro de produção soma ao `producedWeight` do lote.

Exemplo:
Lote = 2.500 kg

Registro 1 = 800 kg
Registro 2 = 700 kg
Registro 3 = 1.000 kg

Total produzido = 2.500 kg
Status = Finalizado

## 8. Relatórios

O filtro é pela data `programDate`, isto é, DATA DE PROGRAMAÇÃO DA PRODUÇÃO.

O relatório geral mostra:
- peso programado;
- peso produzido;
- saldo;
- realização;
- clientes;
- produção por colaborador;
- peso do dia;
- clientes do dia;
- quantidade de lotes;
- detalhamento dos lotes.

O PDF individual exige a seleção de um colaborador.

## Próxima evolução recomendada

Antes de usar oficialmente, recomendo evoluir o cadastro de lote para incluir:
- Cliente;
- prioridade;
- tipo de produção;
- capacidade estimada;
- prazo;
- observação da programação.

Também recomendo mover a distribuição automática para uma Cloud Function/servidor para que duas pessoas cadastrando lotes simultaneamente não possam selecionar o mesmo colaborador por uma condição de corrida.


## Edição completa de lotes pelo administrador

O administrador pode editar manualmente todos os campos existentes no documento do lote,
incluindo nome, número da OS, peso, datas, cliente, colaborador responsável, status e observações.

O colaborador continua limitado pelas Rules aos campos de produção do próprio lote.

### Perfil do administrador

Documento:

`users/{UID_DO_ADMIN}`

Campos:

`role: "admin"`
`active: true`

### Publicação

Copie o conteúdo de `firestore.rules` para o Firebase Console em:

Firestore Database → Rules

e clique em **Publicar**.

Depois faça logout/login no sistema.


## Análise de desempenho

O relatório agora possui uma seção de desempenho com:
- produção total no período;
- média por dia do período selecionado;
- média por colaborador;
- dias trabalhados por colaborador;
- média por dia trabalhado;
- média por dia considerando todo o período;
- produção programada;
- percentual de realização;
- quantidade de lotes.

Os PDFs geral e individual também incluem essas médias.
