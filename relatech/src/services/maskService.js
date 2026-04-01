const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

// Pega o token salvo no localStorage
function getToken() {
    return localStorage.getItem("relatech:token");
}

// Headers padrão com token
function authHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`,
    };
}

export async function fetchMasks() {
    const res = await fetch(`${BASE_URL}/masks`, {
        headers: authHeaders(),
    });

    // Token expirado ou inválido — força logout
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("relatech:token");
        localStorage.removeItem("relatech:user");
        window.location.reload();
        return [];
    }

    if (!res.ok) throw new Error("Erro ao buscar máscaras");
    return res.json();
}
export async function createMask(mask) {
    const { id, fields, ...maskSemId } = mask;
    const fieldsSemId = (fields || []).map(({ id, ...field }) => field);

    const res = await fetch(`${BASE_URL}/masks`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ...maskSemId, fields: fieldsSemId }),
    });
    if (!res.ok) throw new Error("Erro ao criar máscara");
    return res.json();
}

export async function updateMask(id, mask) {
    const { id: _, fields, ...maskSemId } = mask;
    const fieldsSemId = (fields || []).map(({ id, ...field }) => field);

    const res = await fetch(`${BASE_URL}/masks/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ ...maskSemId, fields: fieldsSemId }),
    });
    if (!res.ok) throw new Error("Erro ao atualizar máscara");
    return res.json();
}

export async function deleteMask(id) {
    const res = await fetch(`${BASE_URL}/masks/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao deletar máscara");
}