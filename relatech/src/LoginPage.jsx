import { useState } from "react";
import { login, register, saveAuth } from "./services/authService";

export default function LoginPage({ onLogin }) {
    const [mode, setMode] = useState("login"); // "login" | "register"
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError("");
        setLoading(true);
        try {
            let data;
            if (mode === "login") {
                data = await login(email, password);
            } else {
                data = await register(name, email, password);
            }
            saveAuth(data.token, data.name, data.email);
            onLogin();
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const inp = {
        width: "100%", background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px",
        color: "#e2e8f0", padding: "12px 16px", fontSize: "14px",
        fontFamily: "'IBM Plex Mono', monospace", outline: "none",
        boxSizing: "border-box", marginBottom: "12px",
    };

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0f1e; }
      `}</style>

            <div style={{
                minHeight: "100vh", background: "#0a0f1e",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Space Grotesk', sans-serif", padding: "20px",
            }}>
                <div style={{
                    width: "100%", maxWidth: "400px",
                    background: "#131a2e", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "20px", padding: "36px",
                    boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
                }}>
                    {/* Logo */}
                    <div style={{ textAlign: "center", marginBottom: "28px" }}>
                        <div style={{
                            width: "52px", height: "52px", borderRadius: "14px",
                            background: "linear-gradient(135deg, #00c2ff, #a855f7)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "24px", margin: "0 auto 12px",
                        }}>🎫</div>
                        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#e2e8f0" }}>RelaTech</h1>
                        <p style={{ fontSize: "12px", color: "#4a5568", fontFamily: "'IBM Plex Mono', monospace", marginTop: "4px" }}>
                            {mode === "login" ? "Entre na sua conta" : "Crie sua conta"}
                        </p>
                    </div>

                    {/* Tabs */}
                    <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr",
                        background: "rgba(255,255,255,0.04)", borderRadius: "10px",
                        padding: "4px", marginBottom: "24px",
                    }}>
                        {["login", "register"].map(m => (
                            <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
                                padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer",
                                background: mode === m ? "#00c2ff" : "transparent",
                                color: mode === m ? "#000" : "#4a5568",
                                fontSize: "13px", fontWeight: "600",
                                fontFamily: "'Space Grotesk', sans-serif",
                                transition: "all 0.2s",
                            }}>{m === "login" ? "Entrar" : "Cadastrar"}</button>
                        ))}
                    </div>

                    {/* Fields */}
                    {mode === "register" && (
                        <input value={name} onChange={e => setName(e.target.value)}
                            placeholder="Seu nome" style={inp} />
                    )}
                    <input value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="Email" type="email" style={inp} />
                    <input value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="Senha" type="password" style={inp}
                        onKeyDown={e => e.key === "Enter" && handleSubmit()} />

                    {/* Error */}
                    {error && (
                        <div style={{
                            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                            borderRadius: "8px", padding: "10px 14px", marginBottom: "12px",
                            fontSize: "13px", color: "#ef4444", fontFamily: "'IBM Plex Mono', monospace",
                        }}>{error}</div>
                    )}

                    {/* Submit */}
                    <button onClick={handleSubmit} disabled={loading} style={{
                        width: "100%", padding: "13px", borderRadius: "10px", border: "none",
                        background: "linear-gradient(135deg, #00c2ff, #a855f7)",
                        color: "#000", fontSize: "14px", fontWeight: "700",
                        fontFamily: "'Space Grotesk', sans-serif", cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.7 : 1, transition: "all 0.2s",
                    }}>
                        {loading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar conta"}
                    </button>
                </div>
            </div>
        </>
    );
}