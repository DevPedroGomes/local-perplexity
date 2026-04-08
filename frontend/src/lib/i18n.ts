export type Locale = 'en' | 'pt';

const translations = {
  en: {
    // Header
    'header.title': 'My Searcher',
    'header.github.aria': 'View source on GitHub',

    // Hero
    'hero.title': 'My Searcher',
    'hero.subtitle': 'like Perplexity... but mine',
    'hero.description': 'AI-powered research that searches the web and synthesizes citation-backed answers from multiple sources.',

    // Pipeline section
    'pipeline.heading': '5-Stage AI Pipeline',
    'pipeline.step1.label': 'Query Planning',
    'pipeline.step1.desc': 'Decomposes your question into diverse search queries',
    'pipeline.step2.label': 'Web Search',
    'pipeline.step2.desc': 'Parallel search across queries via Tavily API',
    'pipeline.step3.label': 'Grounded Synthesis',
    'pipeline.step3.desc': 'Citation-backed response with inline references',
    'pipeline.step4.label': 'Self-Reflection',
    'pipeline.step4.desc': 'Quality evaluation for completeness and accuracy',
    'pipeline.step5.label': 'Improvement',
    'pipeline.step5.desc': 'Conditional rewriting if issues are found',

    // Stats
    'stats.llmCalls.value': '3-5',
    'stats.llmCalls.label': 'LLM calls',
    'stats.sources.value': '~15',
    'stats.sources.label': 'sources',
    'stats.grounded.value': '100%',
    'stats.grounded.label': 'grounded',

    // Security badges
    'badge.xss': 'XSS Protection',
    'badge.rateLimit': 'Rate Limiting',
    'badge.failover': 'LLM Failover',

    // Demo limits
    'demo.title': 'Demo Limits',
    'demo.line1': '5 searches per session / 10s cooldown',
    'demo.line2': 'Session expires after 30 min / IP rate limiting',

    // Search bar placeholders
    'search.placeholder': 'Ask anything...',
    'search.quotaExceeded': 'Search quota exceeded',
    'search.waitCooldown': 'Wait {seconds}s...',

    // Search bar messages
    'search.allUsed': 'All 5 searches used. Refresh for a new session.',
    'search.waitMessage': 'Wait {seconds}s before next search.',

    // Error labels
    'error.rateLimited': 'Rate Limited',
    'error.quotaExceeded': 'Quota Exceeded',
    'error.generic': 'Error',
    'error.retry': 'Retry',

    // Empty results
    'results.empty': 'No results found. Try rephrasing your question.',

    // Footer
    'footer.builtWith': 'Built with Next.js, shadcn/ui, and LangGraph',
    'footer.brand': 'My Searcher - AI Research',
    'footer.portfolio': 'Portfolio',

    // Language toggle
    'lang.label': 'EN',
  },
  pt: {
    // Header
    'header.title': 'My Searcher',
    'header.github.aria': 'Ver codigo-fonte no GitHub',

    // Hero
    'hero.title': 'My Searcher',
    'hero.subtitle': 'tipo Perplexity... mas meu',
    'hero.description': 'Pesquisa com IA que busca na web e sintetiza respostas com citacoes a partir de multiplas fontes.',

    // Pipeline section
    'pipeline.heading': 'Pipeline de IA em 5 Etapas',
    'pipeline.step1.label': 'Planejamento de Queries',
    'pipeline.step1.desc': 'Decompoe sua pergunta em diversas consultas de busca',
    'pipeline.step2.label': 'Busca na Web',
    'pipeline.step2.desc': 'Busca paralela nas queries via API Tavily',
    'pipeline.step3.label': 'Sintese Fundamentada',
    'pipeline.step3.desc': 'Resposta com citacoes e referencias inline',
    'pipeline.step4.label': 'Auto-Reflexao',
    'pipeline.step4.desc': 'Avaliacao de qualidade para completude e precisao',
    'pipeline.step5.label': 'Melhoria',
    'pipeline.step5.desc': 'Reescrita condicional se problemas forem encontrados',

    // Stats
    'stats.llmCalls.value': '3-5',
    'stats.llmCalls.label': 'chamadas LLM',
    'stats.sources.value': '~15',
    'stats.sources.label': 'fontes',
    'stats.grounded.value': '100%',
    'stats.grounded.label': 'fundamentado',

    // Security badges
    'badge.xss': 'Protecao XSS',
    'badge.rateLimit': 'Rate Limiting',
    'badge.failover': 'Failover LLM',

    // Demo limits
    'demo.title': 'Limites da Demo',
    'demo.line1': '5 buscas por sessao / 10s de intervalo',
    'demo.line2': 'Sessao expira em 30 min / Limite por IP',

    // Search bar placeholders
    'search.placeholder': 'Pergunte qualquer coisa...',
    'search.quotaExceeded': 'Cota de buscas excedida',
    'search.waitCooldown': 'Aguarde {seconds}s...',

    // Search bar messages
    'search.allUsed': 'Todas as 5 buscas usadas. Atualize para nova sessao.',
    'search.waitMessage': 'Aguarde {seconds}s antes da proxima busca.',

    // Error labels
    'error.rateLimited': 'Limite Atingido',
    'error.quotaExceeded': 'Cota Excedida',
    'error.generic': 'Erro',
    'error.retry': 'Tentar novamente',

    // Empty results
    'results.empty': 'Nenhum resultado encontrado. Tente reformular sua pergunta.',

    // Footer
    'footer.builtWith': 'Feito com Next.js, shadcn/ui e LangGraph',
    'footer.brand': 'My Searcher - Pesquisa IA',
    'footer.portfolio': 'Portfolio',

    // Language toggle
    'lang.label': 'PT',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

/**
 * Returns a translator function for the given locale.
 * Supports interpolation: t('search.waitCooldown', { seconds: 5 })
 */
export function getTranslator(locale: Locale) {
  const dict = translations[locale];
  return function t(key: TranslationKey, params?: Record<string, string | number>): string {
    let text: string = (dict as Record<string, string>)[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  };
}
