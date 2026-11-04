
const SUPABASE_URL = 'URL';
const SUPABASE_ANON_KEY = 'code'; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function carregarCategorias() {
  const selectCategoria = document.getElementById('categoria_id');
  if (!selectCategoria) return;

  const { data, error } = await supabaseClient
    .from('categorias')
    .select('id, nome')
    .order('nome', { ascending: true });

  if (error) {
    console.error('[Repara Aí] Erro ao carregar categorias:', error);
    return;
  }

  selectCategoria.innerHTML = '<option value="">Todas as categorias</option>' +
    data.map(cat => `<option value="${cat.id}">${cat.nome}</option>`).join('');
}

async function carregarPrestadores(categoriaId = null) {
  const container = document.getElementById('lista-prestadores');
  if (!container) return;

  container.innerHTML = '<p class="text-center text-gray-500 py-8">Carregando serviços...</p>';

  let query = supabaseClient
    .from('prestadores')
    .select(`
      id,
      nome_completo,
      nome_social_comercial,
      telefone_whatsapp,
      bairro_distrito,
      descricao_servico,
      categoria_id,
      categorias ( nome )
    `)
    .eq('status_moderacao', 'APROVADO')
    .order('nome_completo', { ascending: true });

  if (categoriaId) {
    query = query.eq('categoria_id', categoriaId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Repara Aí] Erro ao listar prestadores:', error);
    container.innerHTML = '<p class="text-center text-red-500 py-4">Erro ao carregar os serviços.</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500 py-8 col-span-full">Nenhum prestador encontrado.</p>';
    return;
  }

  container.innerHTML = data.map(p => {
    const nomeExibicao = p.nome_social_comercial || p.nome_completo;
    const numWa = p.telefone_whatsapp ? p.telefone_whatsapp.replace(/\D/g, '') : '';

    return `
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
        <div>
          <span class="text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
            ${p.categorias?.nome || 'Geral'}
          </span>
          <h3 class="font-bold text-gray-800 text-lg mt-2">${nomeExibicao}</h3>
          <p class="text-sm text-gray-500 font-medium">📍 ${p.bairro_distrito}</p>
          <p class="text-sm text-gray-600 mt-2 line-clamp-3">${p.descricao_servico || 'Sem descrição.'}</p>
        </div>
        <a 
          href="https://wa.me/55${numWa}?text=Olá!%20Vi%20seu%20contato%20no%20Repara%20Aí." 
          target="_blank" 
          rel="noopener noreferrer"
          class="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm transition"
        >
          💬 Entrar em Contato
        </a>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  carregarCategorias();
  carregarPrestadores();
});