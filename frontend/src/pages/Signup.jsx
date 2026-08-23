import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      // Self-signup always creates a "student" role account.
      // Admin accounts should be created directly in the database or by an existing admin.
      const user = await signup({ ...form, role: "student" });
      navigate(user.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: 60 }}>
      <div className="card">
        <h2>Sign Up</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-row" style={{ flexDirection: "column" }}>
            <input name="name" placeholder="Full name" value={form.name} onChange={handleChange} required />
            <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
            <button type="submit">Create account</button>
          </div>
        </form>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
