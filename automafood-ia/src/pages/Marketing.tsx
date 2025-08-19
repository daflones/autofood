import { Link } from 'react-router-dom'

export default function Marketing() {
  return (
    <div className="min-h-screen bg-white text-[var(--af-text-primary)]">
      {/* Floating navbar */}
      <header className="sticky top-4 z-40 flex w-full justify-center px-4">
        <div className="af-topbar relative flex w-full max-w-6xl items-center justify-between rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]" />
            <div className="text-sm leading-tight">
              <div className="font-extrabold tracking-tight">AutomaFood</div>
              <div className="text-[11px] af-text-muted">Light CRM Platform</div>
            </div>
          </div>
          <nav className="hidden gap-6 md:flex text-sm">
            <a href="#features" className="af-text-dim hover:text-[var(--af-text-primary)]">Plataforma</a>
            <a href="#pipeline" className="af-text-dim hover:text-[var(--af-text-primary)]">Pipeline</a>
            <a href="#metrics" className="af-text-dim hover:text-[var(--af-text-primary)]">Resultados</a>
            <a href="#faq" className="af-text-dim hover:text-[var(--af-text-primary)]">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden text-sm md:block af-text-dim hover:text-[var(--af-text-primary)]">Entrar</Link>
            <Link to="/register" className="hidden text-sm md:block af-btn">Criar conta</Link>
            <a href="#contato" className="af-cta-pill">Fale com vendedor</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate mt-10 px-4">
        <div className="af-hero-gradient pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl grid gap-8 md:grid-cols-2 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              CRM inteligente para seu restaurante
            </h1>
            <p className="mt-3 text-base af-text-dim">
              Organize reservas, leads e fidelização com automações e métricas em tempo real.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href="#demo" className="af-cta-pill">Agendar demonstração</a>
              <Link to="/login" className="af-btn">Entrar no painel</Link>
              <div className="text-xs af-text-muted">✔ Sem cartão • ✔ Cancelamento a qualquer momento</div>
            </div>
          </div>
          <div className="relative">
            <div className="af-card-elev af-shadow-soft rounded-2xl p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="af-card rounded-xl p-4">
                  <div className="text-xs af-text-dim">Reservas (30d)</div>
                  <div className="mt-1 text-2xl font-bold">1.284</div>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+18% vs mês</div>
                </div>
                <div className="af-card rounded-xl p-4">
                  <div className="text-xs af-text-dim">Taxa de show-up</div>
                  <div className="mt-1 text-2xl font-bold">92%</div>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs text-sky-700 bg-sky-50 px-2 py-1 rounded-full">+6 pts</div>
                </div>
                <div className="af-card rounded-xl p-4">
                  <div className="text-xs af-text-dim">Leads</div>
                  <div className="mt-1 text-2xl font-bold">3.452</div>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs text-fuchsia-700 bg-fuchsia-50 px-2 py-1 rounded-full">+31%</div>
                </div>
                <div className="af-card rounded-xl p-4">
                  <div className="text-xs af-text-dim">Fidelização</div>
                  <div className="mt-1 text-2xl font-bold">+156</div>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full">brindes/mês</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto mt-16 max-w-6xl px-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="af-feature">
            <div className="af-feature-icon bg-sky-100 text-sky-600">💬</div>
            <div>
              <h3 className="af-feature-title">Chat & automações</h3>
              <p className="af-feature-desc">Respostas automáticas, follow-ups e campanhas segmentadas.</p>
            </div>
          </div>
          <div className="af-feature">
            <div className="af-feature-icon bg-indigo-100 text-indigo-600">📊</div>
            <div>
              <h3 className="af-feature-title">Pipeline visual</h3>
              <p className="af-feature-desc">Kanban por estágio, prioridade e probabilidade de conversão.</p>
            </div>
          </div>
          <div className="af-feature">
            <div className="af-feature-icon bg-fuchsia-100 text-fuchsia-600">🤖</div>
            <div>
              <h3 className="af-feature-title">IA aplicada</h3>
              <p className="af-feature-desc">Detecção de interesse, previsão de fechamento e sugestões.</p>
            </div>
          </div>
          <div className="af-feature">
            <div className="af-feature-icon bg-emerald-100 text-emerald-600">🔐</div>
            <div>
              <h3 className="af-feature-title">Seguro e escalável</h3>
              <p className="af-feature-desc">Multi-contas, permissões, auditoria e alta disponibilidade.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline preview */}
      <section id="pipeline" className="mx-auto mt-16 max-w-6xl px-4">
        <div className="grid gap-6 md:grid-cols-3">
          {['Novos Leads', 'Qualificados', 'Fechados'].map((title, idx) => (
            <div key={title} className={`rounded-2xl border bg-white p-3 ${idx===1 ? 'ring-1 ring-sky-200' : ''}`} style={{borderColor: 'var(--af-border)'}}>
              <div className="flex items-center justify-between px-1 py-1">
                <div className="text-sm font-semibold">{title}</div>
                <div className="af-badge">{idx===0?23:idx===1?8:12}</div>
              </div>
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="af-card rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Cliente {i}</div>
                        <div className="text-xs af-text-muted">Ticket médio</div>
                      </div>
                      <div className="text-sm font-bold text-emerald-600">R$ {(i*8).toFixed(3)}</div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <span className="af-tag af-tag-blue">ALTA</span>
                      <span className="af-tag af-tag-gray">IG</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section id="metrics" className="mx-auto mt-16 max-w-6xl px-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="af-metric">
            <div className="af-metric-value text-emerald-600">+387%</div>
            <div className="af-metric-caption">Conversão média</div>
          </div>
          <div className="af-metric">
            <div className="af-metric-value text-sky-700">-12 dias</div>
            <div className="af-metric-caption">Ciclo de vendas</div>
          </div>
          <div className="af-metric">
            <div className="af-metric-value text-fuchsia-700">+156</div>
            <div className="af-metric-caption">Leads este mês</div>
          </div>
        </div>
        <div className="mt-8 flex items-center justify-center">
          <a href="#contato" className="af-cta-pill">Converse com vendedor</a>
        </div>
        <p className="mt-3 text-center text-xs af-text-muted">Sem cartão de crédito • Cancelamento a qualquer momento • Suporte incluído</p>
      </section>

      {/* Footer */}
      <footer className="mx-auto mt-20 max-w-6xl px-4 pb-12">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="font-bold">AutomaFood</div>
            <div className="text-sm af-text-dim">Plataforma de CRM com IA para restaurantes.</div>
          </div>
          <div className="text-sm af-text-muted">Política de Privacidade • Termos de Uso • Status</div>
          <div className="text-right text-sm af-text-muted">© {new Date().getFullYear()} AutomaFood</div>
        </div>
      </footer>
    </div>
  )
}
