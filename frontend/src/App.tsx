import { Link, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PrestamosPage from "./pages/PrestamosPage";

import CatalogoPage from './pages/CatalogoPage';
import ReportesPage from './pages/ReportesPage';
export default function App() {
  const { usuario, logout } = useAuth();

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          Biblioteca Web
        </Link>
        <div className="topbar-right">
          <nav>
            <NavLink to="/">Inicio</NavLink>
            <NavLink to="/prestamos">Préstamos</NavLink>
            {usuario?.admin && (
              <>
                <NavLink to="/catalogo">Catálogo</NavLink>
                <NavLink to="/reportes">Reportes</NavLink>
              </>
            )}
          </nav>
          <div className="session">
            {usuario ? (
              <>
                <span>{usuario.nombre}</span>
                <button className="link" onClick={logout}>
                  Salir
                </button>
              </>
            ) : (
              <NavLink to="/login">Ingresar</NavLink>
            )}
          </div>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/prestamos" element={<PrestamosPage />} />
          <Route path="/catalogo" element={<CatalogoPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          {/* /libros, /libros/:isbn, /ejemplares, /usuarios, /usuarios/:idUsuario, /prestamos/:idPrestamo */}
        </Routes>
      </main>
    </>
  );
}
