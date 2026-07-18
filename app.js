// app.js
import { saveData, loadData, listenToData } from './firebase-config.js';

const DIAS = ["SEXTA-FEIRA", "SÁBADO", "DOMINGO"];
const TURNOS = [
  { id: 1, titulo: "TURNO 1", desc: "De 08:30 até o início da seção manhã" },
  { id: 2, titulo: "TURNO 2", desc: "Cântico final da Manhã até a metade do intervalo" },
  { id: 3, titulo: "TURNO 3", desc: "Metade do intervalo até o cântico inicial da tarde" },
  { id: 4, titulo: "TURNO 4", desc: "Cântico final da seção da tarde até a maioria das pessoas tenham saído" }
];
const NUM_VAGAS = 4;

// Estado inicial
let state = {};
let activeDia = DIAS[0];
let saveTimers = {};
let isSyncing = false;

function emptyDia() {
  const d = {};
  TURNOS.forEach(t => {
    d[t.id] = Array.from({ length: NUM_VAGAS }, () => ({ 
      nome: "", 
      telefone: "", 
      congregacao: "" 
    }));
  });
  return d;
}

// Inicializar estado
DIAS.forEach(d => state[d] = emptyDia());

// Referências DOM
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

function setStatus(mode, message) {
  if (mode === 'saving') {
    statusDot.className = 'status-dot saving';
    statusText.textContent = message || 'Salvando...';
  } else if (mode === 'saved') {
    statusDot.className = 'status-dot saved';
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    statusText.textContent = message || `Salvo às ${hh}:${mm}`;
  } else if (mode === 'loading') {
    statusDot.className = 'status-dot saving';
    statusText.textContent = message || 'Carregando...';
  } else if (mode === 'error') {
    statusDot.className = 'status-dot';
    statusText.textContent = message || 'Erro ao salvar — tentando novamente';
  } else if (mode === 'syncing') {
    statusDot.className = 'status-dot saving';
    statusText.textContent = message || 'Sincronizando...';
  }
}

// Carregar dados do Firebase
async function loadAllFromFirebase() {
  setStatus('loading', 'Carregando dados...');
  try {
    for (const dia of DIAS) {
      const data = await loadData(`dia:${dia}`);
      if (data) {
        TURNOS.forEach(t => {
          if (data[t.id] && Array.isArray(data[t.id])) {
            for (let i = 0; i < NUM_VAGAS; i++) {
              if (data[t.id][i]) {
                state[dia][t.id][i] = {
                  nome: data[t.id][i].nome || "",
                  telefone: data[t.id][i].telefone || "",
                  congregacao: data[t.id][i].congregacao || ""
                };
              }
            }
          }
        });
      }
    }
    setStatus('saved', 'Dados carregados');
    renderTabs();
    renderPanels();
  } catch (error) {
    console.error("Erro ao carregar:", error);
    setStatus('error', 'Erro ao carregar dados');
  }
}

// Configurar sincronização em tempo real
function setupRealtimeSync() {
  setStatus('syncing', 'Conectando...');
  
  DIAS.forEach(dia => {
    listenToData(`dia:${dia}`, (data) => {
      if (data && !isSyncing) {
        isSyncing = true;
        // Atualizar estado local com dados do servidor
        TURNOS.forEach(t => {
          if (data[t.id] && Array.isArray(data[t.id])) {
            for (let i = 0; i < NUM_VAGAS; i++) {
              if (data[t.id][i]) {
                state[dia][t.id][i] = {
                  nome: data[t.id][i].nome || "",
                  telefone: data[t.id][i].telefone || "",
                  congregacao: data[t.id][i].congregacao || ""
                };
              }
            }
          }
        });
        renderTabs();
        renderPanels();
        setStatus('saved', 'Sincronizado');
        isSyncing = false;
      }
    });
  });
}

// Salvar no Firebase
async function saveToFirebase(dia) {
  clearTimeout(saveTimers[dia]);
  setStatus('saving', 'Salvando...');
  
  saveTimers[dia] = setTimeout(async () => {
    try {
      const success = await saveData(`dia:${dia}`, state[dia]);
      if (success) {
        setStatus('saved', `Salvo em ${new Date().toLocaleTimeString()}`);
      } else {
        setStatus('error', 'Falha ao salvar');
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      setStatus('error', 'Erro de conexão');
    }
  }, 500);
}

function countFilled(dia) {
  let filled = 0, total = 0;
  TURNOS.forEach(t => {
    state[dia][t.id].forEach(v => {
      total++;
      if (v.nome && v.nome.trim() !== "") filled++;
    });
  });
  return { filled, total };
}

function renderTabs() {
  const tabsEl = document.getElementById('tabs');
  tabsEl.innerHTML = "";
  DIAS.forEach(dia => {
    const { filled, total } = countFilled(dia);
    const btn = document.createElement('div');
    btn.className = 'tab' + (dia === activeDia ? ' active' : '');
    btn.innerHTML = dia + '<span class="count">' + filled + ' / ' + total + ' vagas</span>';
    btn.addEventListener('click', () => {
      activeDia = dia;
      renderTabs();
      renderPanels();
    });
    tabsEl.appendChild(btn);
  });
}

function renderPanels() {
  const panelsEl = document.getElementById('panels');
  panelsEl.innerHTML = "";

  const panel = document.createElement('div');
  panel.className = 'day-panel active';

  const { filled, total } = countFilled(activeDia);
  const heading = document.createElement('div');
  heading.className = 'day-heading';
  heading.innerHTML = `<span>${activeDia}</span><span class="fill">${filled} de ${total} vagas preenchidas</span>`;
  panel.appendChild(heading);

  TURNOS.forEach(turno => {
    const block = document.createElement('div');
    block.className = 'turno';

    const head = document.createElement('div');
    head.className = 'turno-head';
    head.innerHTML = `
      <div class="turno-num">${turno.id}</div>
      <div class="turno-titles">
        <p class="turno-title">${turno.titulo}</p>
        <p class="turno-desc">${turno.desc}</p>
      </div>
    `;
    block.appendChild(head);

    const table = document.createElement('table');
    table.className = 'vagas';
    table.innerHTML = `
      <thead><tr>
        <th class="col-num">Vaga</th>
        <th>Nome</th>
        <th>Telefone</th>
        <th>Congregação</th>
      </tr></thead>
    `;
    const tbody = document.createElement('tbody');

    for (let i = 0; i < NUM_VAGAS; i++) {
      const vaga = state[activeDia][turno.id][i];
      const tr = document.createElement('tr');
      if (vaga.nome && vaga.nome.trim() !== "") tr.classList.add('filled');

      const tdNum = document.createElement('td');
      tdNum.className = 'col-num';
      tdNum.textContent = (i + 1);
      tr.appendChild(tdNum);

      const fields = [
        { key: 'nome', placeholder: 'Seu nome' },
        { key: 'telefone', placeholder: '(00) 00000-0000' },
        { key: 'congregacao', placeholder: 'Congregação' }
      ];

      fields.forEach(f => {
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.className = 'cell-input';
        input.type = 'text';
        input.placeholder = f.placeholder;
        input.value = vaga[f.key];
        input.addEventListener('input', (e) => {
          state[activeDia][turno.id][i][f.key] = e.target.value;
          tr.classList.toggle('filled', state[activeDia][turno.id][i].nome.trim() !== "");
          saveToFirebase(activeDia);
        });
        input.addEventListener('blur', () => {
          renderTabs();
        });
        td.appendChild(input);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    block.appendChild(table);
    panel.appendChild(block);
  });

  panelsEl.appendChild(panel);
}

// Inicializar
async function init() {
  // Configurar escuta em tempo real primeiro
  setupRealtimeSync();
  
  // Carregar dados iniciais
  await loadAllFromFirebase();
}

// Iniciar aplicação
init();