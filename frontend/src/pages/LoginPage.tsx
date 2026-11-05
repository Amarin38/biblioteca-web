import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function LoginPage() {
  const { login, registrar } = useAuth();
  const navigate = useNavigate();
  const [crear, setCrear] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setEnviando(true);
    try {
      if (crear) await registrar(nombre.trim(), email.trim(), password);
      else await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ingresar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="acceso">
      <h1>{crear ? "Crear cuenta" : "Ingresar"}</h1>

      <div className="tabs" role="group" aria-label="Ingresar o crear cuenta">
        <button
          type="button"
          className={crear ? "tab" : "tab tab--activa"}
          aria-pressed={!crear}
          onClick={() => {
            setCrear(false);
            setError(undefined);
          }}
        >
          Ya tengo cuenta
        </button>
        <button
          type="button"
          className={crear ? "tab tab--activa" : "tab"}
          aria-pressed={crear}
          onClick={() => {
            setCrear(true);
            setError(undefined);
          }}
        >
          Crear cuenta
        </button>
      </div>

      <form className="ficha-acceso" onSubmit={enviar}>
        {crear && (
          <label>
            Nombre
            <input
              autoComplete="name"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            autoComplete={crear ? "new-password" : "current-password"}
            required
            minLength={crear ? 8 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {crear && <small>Mínimo 8 caracteres.</small>}
        </label>
        <button disabled={enviando}>
          {crear ? "Crear cuenta" : "Ingresar"}
        </button>
        {error && (
          <p role="alert" className="aviso">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
