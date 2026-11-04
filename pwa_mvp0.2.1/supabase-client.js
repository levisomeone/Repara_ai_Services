/* =====================================================================
   supabase-client.js — integração do Repara Aí com o Supabase
   ---------------------------------------------------------------------
   COMO USAR NO HTML (antes de </body>, depois do script da página):

     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="supabase-client.js"></script>

   SEGURANÇA — A anon key é pública por natureza (fica no navegador).
   Quem protege os dados é o RLS. Rode isto no SQL Editor do Supabase:

     alter table prestadores enable row level security;
     alter table categorias  enable row level security;

     -- Visitantes (anon)
     create policy "publico le categorias" on categorias
       for select to anon, authenticated using (true);

     create policy "publico le aprovados" on prestadores
       for select to anon using (status_moderacao = 'APROVADO');

     create policy "publico cadastra pendente" on prestadores
       for insert to anon
       with check (status_moderacao = 'PENDENTE' and aceite_lgpd = true);

     -- Equipe (usuários logados no Supabase Auth)
     create policy "equipe le tudo" on prestadores
       for select to authenticated using (true);

     create policy "equipe atualiza" on prestadores
       for update to authenticated using (true) with check (true);

     create policy "equipe cadastra" on prestadores
       for insert to authenticated with check (true);

   IMPORTANTE (painel de moderação):
     1. Authentication > Sign In / Providers > Email: DESLIGUE "Allow new users
        to sign up". Senão qualquer pessoa cria conta e vira "equipe".
     2. Crie os usuários da equipe manualmente em Authentication > Users.
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
   1) CREDENCIAIS — cole as suas (Supabase > Project Settings > API)
   --------------------------------------------------------------------- */
const SUPABASE_URL      = 'https://nocfstzfvngiaosguztu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vY2ZzdHpmdm5naWFvc2d1enR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0Njc5NjQsImV4cCI6MjEwOTA0Mzk2NH0.GTIxlJ7vPPy00varkqK2O2-q61N8DPqCtfCB60jSMdM'; // chave "anon public" (NUNCA a service_role)

/* ---------------------------------------------------------------------
   2) AJUSTES — IDs do HTML, nomes de colunas e valores de status
   --------------------------------------------------------------------- */
const CFG = {
  tabelas: { prestadores: 'prestadores', categorias: 'categorias' },

  // Nomes REAIS das colunas da tabela prestadores (confirmados por você).
  // Qualquer nome diferente aqui causa erro 400 na API do Supabase.
  col: {
    id: 'id',                              // chave primária (não estava na sua lista: confira no Table Editor)
    nome: 'nome_completo',
    nomeSocial: 'nome_social_comercial',
    whatsapp: 'telefone_whatsapp',
    bairro: 'bairro_distrito',
    descricao: 'descricao_servico',
    categoriaId: 'categoria_id',
    status: 'status_moderacao',
    aceite: 'aceite_lgpd',
    dataAceite: 'data_aceite_lgpd',
    criadoEm: 'data_aceite_lgpd',          // "data de cadastro" do painel: usa o carimbo do aceite, que já existe

    // Campos OPCIONAIS da gaveta de perfil. Deixe null até criar a coluna no Supabase
    // (ex.: alter table prestadores add column bio text;) e então troque null pelo nome da coluna.
    servicos: null,    // ex.: 'servicos'  (text[] ou texto separado por vírgula)
    bio: null,         // ex.: 'bio'  (se null, usa descricao_servico)
    instagram: null,   // ex.: 'instagram'
    facebook: null,    // ex.: 'facebook'
    foto: null         // ex.: 'foto_url'  (link https)
  },
  colCategoria: { id: 'id', nome: 'nome' },

  // AJUSTE: valores aceitos pela sua coluna status_moderacao.
  // Se o banco só aceitar PENDENTE/APROVADO/REJEITADO, troque inativo por 'REJEITADO'.
  status: { pendente: 'PENDENTE', aprovado: 'APROVADO', rejeitado: 'REJEITADO', inativo: 'INATIVO' },

  // AJUSTE: seletores CSS dos elementos da página (padrões = index.html do projeto)
  sel: {
    container: '#lista',             // ID_DO_CONTAINER: onde os cards são desenhados
    formulario: '#f-cadastro',       // ID_DO_FORMULARIO: formulário de auto-cadastro
    selectCategoriaForm: '#c-cat',   // ID_DO_SELECT_CATEGORIA_FORM: <select> de categoria do formulário
    selectCategoriaFiltro: '#ID_DO_SELECT_FILTRO' // opcional; ignorado se não existir
  },

  // AJUSTE: atributo name="" dos campos do formulário
  campos: {
    nome: 'nome',
    nomeSocial: 'social',
    whatsapp: 'whats',
    categoria: 'cat',
    bairro: 'bairro',
    descricao: 'desc',
    consentimento: 'consent'         // checkbox LGPD
  },

  ddi: '55',
  chaveFavoritos: 'reparaai.fav',

  // Como mostrar avisos ao usuário. Padrão: alert(). A página pode trocar por um toast.
  avisar: msg => alert(msg)
};

/* ---------------------------------------------------------------------
   3) CLIENTE SUPABASE
   O CDN cria o objeto global `window.supabase`; por isso o cliente se chama
   `supabaseClient` (const supabase = supabase.createClient(...) daria erro).
   --------------------------------------------------------------------- */
const credenciaisOk = !SUPABASE_URL.startsWith('COLE_') && !SUPABASE_ANON_KEY.startsWith('COLE_');
const supabaseClient = (window.supabase && credenciaisOk)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!window.supabase) console.error('[Repara Aí] Biblioteca supabase-js não carregou. Confira a tag <script> do CDN.');
if (!credenciaisOk) console.warn('[Repara Aí] Preencha SUPABASE_URL e SUPABASE_ANON_KEY em supabase-client.js.');

/* ---------------------------------------------------------------------
   Utilitários e estado
   --------------------------------------------------------------------- */
const $q = (s, r = document) => r.querySelector(s);
const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const normalizar = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const avisar = msg => CFG.avisar(msg);

let categorias = [];                 // linhas da tabela categorias
let categoriaPorId = {};             // id -> nome
let aprovados = [];                  // última lista APROVADO vinda do banco
let carregado = false;               // já buscou ao menos uma vez?
let ultimaBusca = 0;                 // descarta respostas antigas se o usuário filtrar rápido
const filtro = { categoriaId: null, busca: '', bairro: '', favoritos: false };

const favoritos = (() => {
  try { return new Set(JSON.parse(localStorage.getItem(CFG.chaveFavoritos) || '[]').map(String)); }
  catch (e) { return new Set(); }
})();
const salvarFavoritos = () => { try { localStorage.setItem(CFG.chaveFavoritos, JSON.stringify([...favoritos])); } catch (e) {} };

const nomeCategoria = id => categoriaPorId[id] || '';

/** Colunas lidas na listagem pública (as opcionais só entram se você configurou o nome em CFG.col). */
function colunasPublicas() {
  const c = CFG.col;
  return [c.id, c.nome, c.nomeSocial, c.whatsapp, c.bairro, c.descricao, c.categoriaId, c.servicos, c.bio, c.instagram, c.facebook, c.foto].filter(Boolean);
}

/** Deixa só números e garante o DDI: "(88) 99999-0001" -> "5588999990001" */
function formatarWhatsApp(valor) {
  const d = String(valor ?? '').replace(/\D/g, '');
  return d.startsWith(CFG.ddi) && d.length >= 12 ? d : CFG.ddi + d;
}

/** Link https://wa.me/55... com mensagem inicial pronta */
function linkWhatsApp(p) {
  const c = CFG.col;
  const nome = String(p[c.nomeSocial] || p[c.nome] || '').split(' ')[0];
  const servico = (nomeCategoria(p[c.categoriaId]) || 'serviço').toLowerCase();
  const msg = `Olá, ${nome}! Encontrei seu perfil no Repara Aí e gostaria de um orçamento de ${servico}.`;
  return `https://wa.me/${formatarWhatsApp(p[c.whatsapp])}?text=${encodeURIComponent(msg)}`;
}

function mensagemNoContainer(el, html) {
  el.innerHTML = `<li class="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-600">${html}</li>`;
}

/* =====================================================================
   4) CATEGORIAS — carregarCategorias()
   Preenche o <select> do formulário e o <select> de filtro (se existir).
   Dispara o evento "repara:categorias" para a página desenhar os atalhos.
   ===================================================================== */
async function carregarCategorias() {
  const cc = CFG.colCategoria;
  categorias = [];

  if (supabaseClient) {
    const { data, error } = await supabaseClient
      .from(CFG.tabelas.categorias)
      .select(`${cc.id}, ${cc.nome}`)
      .order(cc.nome, { ascending: true });

    if (error) console.error('[Repara Aí] Erro ao carregar categorias:', error);
    else categorias = data;
  }

  categoriaPorId = Object.fromEntries(categorias.map(c => [c[cc.id], c[cc.nome]]));
  const opcoes = categorias.map(c => `<option value="${escapeHTML(c[cc.id])}">${escapeHTML(c[cc.nome])}</option>`).join('');

  // Todo <select name="cat"> (formulário de cadastro e de onboarding assistido)
  const alvos = new Set([...document.querySelectorAll(`select[name="${CFG.campos.categoria}"]`)]);
  const selForm = $q(CFG.sel.selectCategoriaForm);
  if (selForm) alvos.add(selForm);
  alvos.forEach(sel => { sel.innerHTML = `<option value="">Selecione uma categoria</option>${opcoes}`; });

  const selFiltro = $q(CFG.sel.selectCategoriaFiltro);
  if (selFiltro) selFiltro.innerHTML = `<option value="">Todas as categorias</option>${opcoes}`;

  document.dispatchEvent(new CustomEvent('repara:categorias', { detail: categorias }));
  return categorias;
}

/* =====================================================================
   5) LISTAGEM — carregarPrestadores(categoriaId?)
   Busca no banco só status_moderacao = APROVADO (e a categoria, se informada).
   - sem argumento: mantém a categoria atual;  '' ou null: remove o filtro.
   Busca por texto, bairro e favoritos são aplicados na tela (renderizarPrestadores).
   ===================================================================== */
async function carregarPrestadores(categoriaId) {
  const el = $q(CFG.sel.container);
  if (!el) return console.warn(`[Repara Aí] Contêiner não encontrado: ${CFG.sel.container}`);

  if (categoriaId !== undefined) filtro.categoriaId = categoriaId || null;

  if (!supabaseClient) {
    return mensagemNoContainer(el, 'Conexão com o banco ainda não configurada.');
  }

  const busca = ++ultimaBusca;
  const c = CFG.col;

  // Estado de carregamento
  el.setAttribute('aria-busy', 'true');
  mensagemNoContainer(el, 'Carregando profissionais...');

  // Seleciona só o necessário para exibir (não traz dados de consentimento)
  let consulta = supabaseClient
    .from(CFG.tabelas.prestadores)
    .select(colunasPublicas().join(', '))
    .eq(c.status, CFG.status.aprovado)
    .order(c.nome, { ascending: true });

  if (filtro.categoriaId) consulta = consulta.eq(c.categoriaId, filtro.categoriaId);

  const { data, error } = await consulta;
  if (busca !== ultimaBusca) return;           // chegou uma busca mais nova
  el.removeAttribute('aria-busy');

  // Estado de erro
  if (error) {
    console.error('[Repara Aí] Erro ao listar prestadores:', error);
    mensagemNoContainer(el, 'Não foi possível carregar os profissionais.<br><button type="button" data-repara-retry class="mt-2 font-semibold text-brand underline">Tentar de novo</button>');
    return;
  }

  aprovados = data;
  carregado = true;
  renderizarPrestadores();
}

/** Desenha os cards aplicando busca, bairro e favoritos sobre a última lista carregada. */
function renderizarPrestadores() {
  const el = $q(CFG.sel.container);
  if (!el || !carregado) return;
  const c = CFG.col;
  const termo = normalizar(filtro.busca.trim());

  const lista = aprovados
    .filter(p => !filtro.bairro || p[c.bairro] === filtro.bairro)
    .filter(p => !filtro.favoritos || favoritos.has(String(p[c.id])))
    .filter(p => !termo || normalizar([p[c.nome], p[c.nomeSocial], p[c.bairro], p[c.descricao], nomeCategoria(p[c.categoriaId])].join(' ')).includes(termo));

  // Estado vazio
  if (!lista.length) {
    const temFiltro = filtro.busca || filtro.bairro || filtro.categoriaId;
    if (filtro.favoritos) {
      return mensagemNoContainer(el, 'Você ainda não salvou nenhum profissional.<br><a href="#/" class="mt-2 inline-block font-semibold text-brand underline">Ver profissionais</a>');
    }
    return mensagemNoContainer(el, temFiltro
      ? 'Nenhum profissional encontrado com esses filtros.<br><button type="button" data-repara-limpar class="mt-2 font-semibold text-brand underline">Limpar filtros</button>'
      : 'Nenhum profissional aprovado ainda. Seja o primeiro: toque em "Sou prestador".');
  }

  // Cards
  el.innerHTML = lista.map(p => {
    const id = String(p[c.id]);
    const nome = p[c.nomeSocial] || p[c.nome];
    const fav = favoritos.has(id);
    const coracao = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/></svg>`;
    return `
      <li data-id="${escapeHTML(id)}" class="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-neutral-300 hover:shadow-sm">
        <button type="button" data-act="perfil" data-id="${escapeHTML(id)}" aria-haspopup="dialog" class="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-500" aria-hidden="true">${escapeHTML(String(nome).charAt(0).toUpperCase())}</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold">${escapeHTML(nome)}</span>
            <span class="block truncate text-xs text-neutral-700">${escapeHTML(nomeCategoria(p[c.categoriaId]))}</span>
            <span class="block truncate text-[11px] text-neutral-500">${escapeHTML(p[c.bairro] || '')}</span>
          </span>
        </button>
        <button type="button" data-repara-fav="${escapeHTML(id)}" aria-pressed="${fav}" aria-label="${fav ? 'Remover' : 'Salvar'} ${escapeHTML(nome)} ${fav ? 'dos' : 'nos'} favoritos"
          class="grid h-9 w-9 place-items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${fav ? 'text-red-600' : 'text-neutral-400 hover:text-neutral-700'}">${coracao}</button>
        <a href="${linkWhatsApp(p)}" target="_blank" rel="noopener noreferrer"
           class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
           aria-label="Chamar ${escapeHTML(nome)} no WhatsApp">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/></svg>Contato
        </a>
      </li>`;
  }).join('');
}

/** Perfil de um prestador aprovado, no formato que a gaveta de perfil do index.html espera. */
function perfilPorId(id) {
  const c = CFG.col, p = aprovados.find(x => String(x[c.id]) === String(id));
  if (!p) return null;
  const bruto = c.servicos ? p[c.servicos] : null;
  const servicos = Array.isArray(bruto) ? bruto : String(bruto ?? '').split(',').map(x => x.trim()).filter(Boolean);
  return {
    id: String(p[c.id]),
    nome: p[c.nome],
    social: p[c.nomeSocial] || '',
    catRotulo: nomeCategoria(p[c.categoriaId]),
    bairro: p[c.bairro] || '',
    km: null,
    wa: linkWhatsApp(p),
    servicos,
    bio: (c.bio && p[c.bio]) || p[c.descricao] || '',
    instagram: c.instagram ? p[c.instagram] : '',
    facebook: c.facebook ? p[c.facebook] : '',
    foto: c.foto ? p[c.foto] : ''
  };
}

/** Atualiza filtros. Ex.: definirFiltros({ busca: 'pedreiro' }), ({ bairro: 'Centro' }), ({ favoritos: true }), ({ categoriaId: '3' }) */
function definirFiltros(parcial = {}) {
  const trocouCategoria = 'categoriaId' in parcial && (parcial.categoriaId || null) !== filtro.categoriaId;
  Object.assign(filtro, parcial);
  filtro.categoriaId = filtro.categoriaId || null;
  if (trocouCategoria) return carregarPrestadores(filtro.categoriaId || '');
  renderizarPrestadores();
}

function limparFiltros() {
  filtro.busca = ''; filtro.bairro = ''; filtro.categoriaId = null;
  document.dispatchEvent(new CustomEvent('repara:filtros-limpos'));
  return carregarPrestadores('');
}

function alternarFavorito(id) {
  id = String(id);
  favoritos.has(id) ? favoritos.delete(id) : favoritos.add(id);
  salvarFavoritos();
  renderizarPrestadores();
}

/* =====================================================================
   6) CADASTRO — cadastrarPrestador(evento)
   Ligado ao "submit" do formulário (em iniciarRepara). Entra como PENDENTE.
   Dispara "repara:cadastro-enviado" no formulário quando dá certo.
   ===================================================================== */
async function enviarFormulario(form, status, textoSucesso) {
  const f = CFG.campos, c = CFG.col;
  if (!supabaseClient) { avisar('A conexão com o banco ainda não foi configurada.'); return false; }

  const lerTexto = nome => String(form.elements[nome]?.value ?? '').trim();

  // --- Captura dos dados
  const nome = lerTexto(f.nome);
  const nomeSocial = lerTexto(f.nomeSocial);
  let whatsapp = lerTexto(f.whatsapp).replace(/\D/g, '');
  if (whatsapp.startsWith(CFG.ddi) && whatsapp.length >= 12) whatsapp = whatsapp.slice(CFG.ddi.length); // guarda sem o 55
  const categoriaId = lerTexto(f.categoria);
  const bairro = lerTexto(f.bairro);
  const descricao = lerTexto(f.descricao);
  const aceitou = !!form.elements[f.consentimento]?.checked;

  // --- Validações (LGPD primeiro: é obrigatória)
  if (!aceitou) {
    form.elements[f.consentimento]?.focus();
    avisar('Para enviar o cadastro, é preciso autorizar a exibição pública dos dados de contato (LGPD).');
    return false;
  }
  if (nome.length < 5 || !/\s/.test(nome)) { form.elements[f.nome]?.focus(); avisar('Informe nome e sobrenome.'); return false; }
  if (!/^\d{10,11}$/.test(whatsapp)) { form.elements[f.whatsapp]?.focus(); avisar('Informe o WhatsApp com DDD. Exemplo: (88) 99999-9999.'); return false; }
  if (!categoriaId) { form.elements[f.categoria]?.focus(); avisar('Escolha uma categoria de serviço.'); return false; }
  if (!bairro) { form.elements[f.bairro]?.focus(); avisar('Escolha o bairro ou distrito.'); return false; }

  // --- Monta o registro (nomes de colunas vêm de CFG.col)
  const registro = {
    [c.nome]: nome,
    [c.nomeSocial]: nomeSocial || null,
    [c.whatsapp]: whatsapp,
    [c.categoriaId]: categoriaId,
    [c.bairro]: bairro,
    [c.descricao]: descricao || null,
    [c.aceite]: true,
    // Carimbo gerado no navegador. Para mais confiança, defina também
    // DEFAULT now() na coluna ou use um trigger no banco.
    [c.dataAceite]: new Date().toISOString(),
    [c.status]: status
  };

  const botao = form.querySelector('[type="submit"]');
  if (botao) botao.disabled = true;

  // Sem .select() depois do insert: o visitante (anon) só lê perfis aprovados,
  // então pedir o registro de volta falharia pelo RLS.
  const { error } = await supabaseClient.from(CFG.tabelas.prestadores).insert(registro);

  if (botao) botao.disabled = false;

  if (error) {
    console.error('[Repara Aí] Erro ao cadastrar:', error);
    if (error.code === '23505') avisar('Este WhatsApp já está cadastrado.');
    else if (error.code === '42501') avisar('O cadastro foi bloqueado pelas regras de segurança do banco. Confira as políticas de RLS.');
    else avisar('Não foi possível enviar o cadastro agora. Tente novamente em instantes.');
    return false;
  }

  avisar(textoSucesso);
  form.reset();
  return true;
}

async function cadastrarPrestador(evento) {
  evento.preventDefault();
  const form = evento.currentTarget;
  const ok = await enviarFormulario(form, CFG.status.pendente,
    'Cadastro enviado! Nossa equipe vai conferir seus dados e, quando for aprovado, seu perfil aparece no catálogo.');
  if (ok) form.dispatchEvent(new CustomEvent('repara:cadastro-enviado', { bubbles: true }));
  return ok;
}

/** Onboarding assistido: só para equipe logada. Entra já como APROVADO. */
async function cadastrarAssistido(evento) {
  evento.preventDefault();
  const form = evento.currentTarget;
  if (!(await adminSessaoAtiva())) { avisar('Sua sessão de administrador expirou. Entre novamente.'); return false; }
  return enviarFormulario(form, CFG.status.aprovado, 'Profissional cadastrado e ativo no catálogo.');
}

/* =====================================================================
   7) ADMINISTRAÇÃO — login (Supabase Auth) e moderação
   Exige as políticas "equipe ..." do RLS (veja o topo do arquivo).
   ===================================================================== */
async function adminSessaoAtiva() {
  if (!supabaseClient) return false;
  const { data } = await supabaseClient.auth.getSession();
  return !!data?.session;
}

async function adminEntrar(email, senha) {
  if (!supabaseClient) return { ok: false, erro: 'Conexão com o banco ainda não configurada.' };
  const { error } = await supabaseClient.auth.signInWithPassword({ email: String(email).trim(), password: senha });
  if (error) {
    console.error('[Repara Aí] Erro no login:', error);
    return { ok: false, erro: 'E-mail ou senha incorretos.' };
  }
  return { ok: true };
}

async function adminSair() {
  if (supabaseClient) await supabaseClient.auth.signOut();
}

/** Lista cadastros por status (ex.: PENDENTE na fila, APROVADO nos ativos), mais antigos primeiro. */
async function listarParaModeracao(status) {
  if (!supabaseClient) return { data: [], erro: 'sem-conexao' };
  const c = CFG.col;
  const { data, error } = await supabaseClient
    .from(CFG.tabelas.prestadores)
    .select([c.id, c.nome, c.nomeSocial, c.whatsapp, c.bairro, c.descricao, c.categoriaId, c.status, c.criadoEm].join(', '))
    .eq(c.status, status)
    .order(c.criadoEm, { ascending: true });
  if (error) { console.error('[Repara Aí] Erro ao listar para moderação:', error); return { data: [], erro: error.message }; }
  return { data, erro: null };
}

/** Muda o status de um cadastro. Confere se alguma linha foi mesmo alterada (o RLS pode bloquear em silêncio). */
async function atualizarStatus(id, novoStatus) {
  if (!supabaseClient) return { ok: false };
  const c = CFG.col;
  const { data, error } = await supabaseClient
    .from(CFG.tabelas.prestadores)
    .update({ [c.status]: novoStatus })
    .eq(c.id, id)
    .select(c.id);
  if (error || !data?.length) {
    console.error('[Repara Aí] Erro ao atualizar status:', error || 'nenhuma linha alterada (RLS?)');
    return { ok: false };
  }
  return { ok: true };
}

/* =====================================================================
   8) INICIALIZAÇÃO
   ===================================================================== */
function aoClicarNoContainer(e) {
  const fav = e.target.closest('[data-repara-fav]');
  if (fav) return alternarFavorito(fav.dataset.reparaFav);
  if (e.target.closest('[data-repara-limpar]')) return limparFiltros();
  if (e.target.closest('[data-repara-retry]')) return carregarPrestadores();
}

async function iniciarRepara() {
  const form = $q(CFG.sel.formulario);
  if (form) form.addEventListener('submit', cadastrarPrestador);

  const selFiltro = $q(CFG.sel.selectCategoriaFiltro);
  if (selFiltro) selFiltro.addEventListener('change', e => definirFiltros({ categoriaId: e.target.value }));

  const container = $q(CFG.sel.container);
  if (container) container.addEventListener('click', aoClicarNoContainer);

  // Categorias primeiro (a listagem usa os nomes delas nos cards)
  await carregarCategorias();
  await carregarPrestadores();
}

document.addEventListener('DOMContentLoaded', iniciarRepara);

// Expõe tudo para a página e para o console
window.ReparaAi = {
  CFG,
  carregarCategorias, carregarPrestadores, renderizarPrestadores, definirFiltros, limparFiltros,
  cadastrarPrestador, cadastrarAssistido,
  adminSessaoAtiva, adminEntrar, adminSair, listarParaModeracao, atualizarStatus,
  nomeCategoria, formatarWhatsApp, perfilPorId,
  categorias: () => categorias,
  filtroAtual: () => ({ ...filtro })
};
