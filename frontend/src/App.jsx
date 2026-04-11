import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import NuevaMedicion from './pages/NuevaMedicion'
import Reporte from './pages/Reporte'
import Configuracion from './pages/Configuracion'
import HistorialPersona from './pages/HistorialPersona'
import GestionPersonas from './pages/GestionPersonas'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/nueva" replace />} />
        <Route path="nueva"          element={<NuevaMedicion />} />
        <Route path="reporte"        element={<Reporte />} />
        <Route path="configuracion"  element={<Configuracion />} />
        <Route path="personas"       element={<GestionPersonas />} />
        <Route path="persona/:id"    element={<HistorialPersona />} />
      </Route>
    </Routes>
  )
}
