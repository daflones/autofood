import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Reservas from './pages/Reservas'
import Clientes from './pages/Clientes'
import Brindes from './pages/Brindes'
import Configuracoes from './pages/Configuracoes'
import CardapioDigital from './pages/CardapioDigital'
import GerenciarCardapio from './pages/GerenciarCardapio'
import ConfiguracaoRestaurante from './pages/ConfiguracaoRestaurante'
import Site from './pages/Site'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Layout from './layout/Layout'
import InstallPrompt from './components/InstallPrompt'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './shared/useAuth'

function App() {
  const { loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
    </div>
  }

  return (
    <BrowserRouter>
      <InstallPrompt />
      <Routes>
        <Route path="/site" element={<Site />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="reservas" element={<Reservas />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="brindes" element={<Brindes />} />
          <Route path="cardapio-digital" element={<CardapioDigital />} />
          <Route path="gerenciar-cardapio" element={<GerenciarCardapio />} />
          <Route path="configuracao-restaurante" element={<ConfiguracaoRestaurante />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
