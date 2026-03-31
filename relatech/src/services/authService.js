const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export async function register(name, email, password) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) throw new Error("Erro ao cadastrar");
    return res.json();
}

export async function login(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Email ou senha inválidos");
    return res.json();
}

export function saveAuth(token, name, email) {
    localStorage.setItem("relatech:token", token);
    localStorage.setItem("relatech:user", JSON.stringify({ name, email }));
}

export function getUser() {
    try {
        return JSON.parse(localStorage.getItem("relatech:user"));
    } catch { return null; }
}

export function isAuthenticated() {
    return !!localStorage.getItem("relatech:token");
}

export function logout() {
    localStorage.removeItem("relatech:token");
    localStorage.removeItem("relatech:user");
}