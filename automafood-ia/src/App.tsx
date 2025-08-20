import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Reservas from './pages/Reservas'
import Clientes from './pages/Clientes'
import Brindes from './pages/Brindes'
import Configuracoes from './pages/Configuracoes'
import CardapioDigital from './pages/CardapioDigital'
import GerenciarCardapio from './pages/GerenciarCardapio'
import ConfiguracaoRestaurante from './pages/ConfiguracaoRestaurante';
import Chat from './pages/Chat';
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Layout from './layout/Layout'
import InstallPrompt from './components/InstallPrompt'
import ProtectedRoute from './routes/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <InstallPrompt />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="reservas" element={<Reservas />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="brindes" element={<Brindes />} />
          <Route path="cardapio-digital" element={<CardapioDigital />} />
          <Route path="gerenciar-cardapio" element={<GerenciarCardapio />} />
          <Route path="/configuracao-restaurante" element={<ConfiguracaoRestaurante />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
