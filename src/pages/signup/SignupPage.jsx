import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authState";

function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "" });

  const handleSignup = async (event) => {
    event.preventDefault();
    setStatus({ type: "loading", message: "Creating account..." });

    const { error } = await signUp(email, password);

    if (error) {
      setStatus({ type: "error", message: error.message || "Signup failed." });
      return;
    }

    setStatus({
      type: "success",
      message: "Account created. Check your email if confirmation is required.",
    });
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="auth-page">
      <h1>Create Account</h1>

      <form onSubmit={handleSignup}>
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
          {status.type === "loading" ? "Creating..." : "Sign Up"}
        </button>
      </form>

      {status.message ? <p className={`status-message ${status.type}`}>{status.message}</p> : null}

      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

export default SignupPage;
