import { useState } from 'react'
import { BarChart3, Calendar, Users, PlayCircle, Phone, TrendingUp, Bot, Instagram, Mail } from 'lucide-react'
import SalesForm from '../components/SalesForm'

export default function Site() {
  const [showSalesForm, setShowSalesForm] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">AutoFood</span>
            <span className="text-xs bg-purple-500/20 px-2 py-1 rounded-full">Premium CRM Platform</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#dashboard" className="text-gray-300 hover:text-white transition-colors">Dashboard</a>
            <a href="#chat" className="text-gray-300 hover:text-white transition-colors">Chat</a>
            <a href="#leads" className="text-gray-300 hover:text-white transition-colors">Leads</a>
            <button className="text-gray-300 hover:text-white transition-colors">Entrar</button>
            <button 
              onClick={() => setShowSalesForm(true)}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-4 py-2 rounded-lg font-medium transition-all"
            >
              Fale com vendedor
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2">
                <Bot className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">Powered by AI</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                <span className="text-white">AutoFood</span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Automação de
                </span>
                <br />
                <span className="text-white">Reservas</span>
                <br />
                <span className="text-white">Inteligente</span>
              </h1>
              
              <p className="text-xl text-gray-300 leading-relaxed max-w-lg">
                Sistema completo para gerenciar reservas, clientes e brindes do seu restaurante com automação inteligente.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowSalesForm(true)}
                  className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-2xl"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Fale com vendedor
                </button>
                <button 
                  onClick={() => setShowSalesForm(true)}
                  className="inline-flex items-center justify-center px-8 py-4 border border-gray-600 hover:border-gray-500 rounded-xl font-semibold text-lg transition-all backdrop-blur-sm"
                >
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Agendar demonstração
                </button>
              </div>
              
              <div className="flex items-center space-x-8 text-sm text-gray-400">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Reservas automatizadas</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Gestão de clientes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>Sistema de brindes</span>
                </div>
              </div>
            </div>
            
            {/* Dashboard Preview */}
            <div className="relative">
              <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Dashboard Live</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-400">Atualizando em tempo real</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      <span className="text-xs text-green-400">+23%</span>
                    </div>
                    <div className="text-2xl font-bold text-white">847</div>
                    <div className="text-sm text-gray-400">Reservas Totais</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Users className="w-5 h-5 text-green-400" />
                      <span className="text-xs text-green-400">+16%</span>
                    </div>
                    <div className="text-2xl font-bold text-white">324</div>
                    <div className="text-sm text-gray-400">Clientes Ativos</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Calendar className="w-5 h-5 text-purple-400" />
                      <span className="text-xs text-green-400">+8%</span>
                    </div>
                    <div className="text-2xl font-bold text-white">23</div>
                    <div className="text-sm text-gray-400">Reservas Hoje</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <TrendingUp className="w-5 h-5 text-orange-400" />
                      <span className="text-xs text-green-400">+12%</span>
                    </div>
                    <div className="text-2xl font-bold text-white">156</div>
                    <div className="text-sm text-gray-400">Brindes Ativos</div>
                  </div>
                </div>
                
                {/* Mini Chart */}
                <div className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">Performance Mensal</span>
                    <span className="text-xs text-green-400">+31%</span>
                  </div>
                  <div className="flex items-end space-x-1 h-16">
                    {[40, 65, 45, 80, 60, 90, 75, 95, 70, 85, 100, 90].map((height, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-t from-purple-500 to-blue-500 rounded-sm flex-1 opacity-80"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-3 shadow-xl">
                <div className="text-xs text-white font-medium">IA Ativa</div>
                <div className="text-lg font-bold text-white">Movendo leads automaticamente</div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-3 shadow-xl">
                <div className="text-xs text-white font-medium">Novos Leads</div>
                <div className="text-lg font-bold text-white">23</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Funcionalidades Principais
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Sistema completo para gerenciar seu restaurante com automação inteligente de reservas, controle de clientes e programa de fidelidade.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-2xl p-8 backdrop-blur-sm">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Gestão de Reservas</h3>
              <p className="text-gray-300 mb-4">
                Controle completo das reservas com status automático e calendário semanal inteligente.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Calendário semanal interativo</li>
                <li>• Status automático (Pendente, Confirmada, Finalizada)</li>
                <li>• Relatórios de performance por período</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-2xl p-8 backdrop-blur-sm">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Controle de Clientes</h3>
              <p className="text-gray-300 mb-4">
                Gerencie sua base de clientes com sistema de leads e acompanhamento inteligente.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Sistema de leads (Novo, Interessado, Ativo)</li>
                <li>• Histórico completo de reservas</li>
                <li>• Acompanhamento de brindes por cliente</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-sm">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Sistema de Brindes</h3>
              <p className="text-gray-300 mb-4">
                Programa de fidelidade com QR codes para aumentar o retorno dos clientes.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• QR codes automáticos para brindes</li>
                <li>• Status de controle (Pendente, Resgatado, Vencido)</li>
                <li>• Relatórios de engajamento</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-12 shadow-2xl">
            <div className="inline-flex items-center space-x-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-2 mb-8">
              <Calendar className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-orange-300">Sistema Completo</span>
            </div>

            <h2 className="text-4xl font-bold text-white mb-6">
              Tudo que seu Restaurante Precisa
            </h2>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Dashboard Completo</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Métricas em tempo real</li>
                  <li>• Gráficos de performance</li>
                  <li>• Relatórios automáticos</li>
                  <li>• KPIs do seu restaurante</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Automação de Reservas</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Calendário semanal inteligente</li>
                  <li>• Status automático das reservas</li>
                  <li>• Controle de disponibilidade</li>
                  <li>• Histórico completo</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Programa de Fidelidade</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Sistema de brindes com QR codes</li>
                  <li>• Controle de resgates</li>
                  <li>• Aumento do retorno de clientes</li>
                  <li>• Relatórios de engajamento</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowSalesForm(true)}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl text-lg transition-all transform hover:scale-105 shadow-2xl"
            >
              Solicite uma demonstração
            </button>

            <div className="flex items-center justify-center space-x-8 mt-8 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Setup rápido</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Suporte completo</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>Resultados garantidos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-gray-900/50 backdrop-blur-xl border-t border-gray-700/50 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">AutoFood</span>
              </div>
              <p className="text-gray-400 mb-4">
                Sistema completo para automação de reservas e gestão de restaurantes
              </p>
              <div className="flex space-x-4">
                <Instagram className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                <Mail className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                <Phone className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Funcionalidades</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Dashboard</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Reservas</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Clientes</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Brindes</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Sobre o AutoFood</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Como Funciona</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Casos de Sucesso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Guia de Uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Suporte Técnico</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700/50 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AutoFood. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Sales Form Modal */}
      <SalesForm isOpen={showSalesForm} onClose={() => setShowSalesForm(false)} />
    </div>
  )
}
