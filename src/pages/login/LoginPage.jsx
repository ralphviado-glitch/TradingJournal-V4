import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authState";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "" });

  const handleLogin = async (event) => {
    event.preventDefault();
    setStatus({ type: "loading", message: "Logging in..." });

    const { error } = await signIn(email, password);

    if (error) {
      setStatus({ type: "error", message: error.message || "Login failed." });
      return;
    }

    setStatus({ type: "success", message: "Login successful." });
    navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
  };

  return (
    <div className="auth-page">
      <h1>Login</h1>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          disabled={status.type === "loading"}
          required
          onChange={(event) => setEmail(event.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          disabled={status.type === "loading"}
          required
          onChange={(event) => setPassword(event.target.value)}
        />

        <button type="submit" disabled={status.type === "loading"}>
          {status.type === "loading" ? "Logging in..." : "Login"}
        </button>
      </form>

      {status.message ? <p className={`status-message ${status.type}`}>{status.message}</p> : null}

      <p>
        No account yet? <Link to="/signup">Create one</Link>
      </p>
    </div>
  );
}

export default LoginPage;
