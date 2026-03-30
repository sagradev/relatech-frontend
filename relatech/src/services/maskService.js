const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

// Busca todas as máscaras do banco
export async function fetchMasks() {
    const res = await fetch(`${BASE_URL}/masks`);
    if (!res.ok) throw new Error("Erro ao buscar máscaras");
    return res.json();
}

// Cria uma nova máscara
export async function createMask(mask) {
    // Remove o id da máscara e dos campos — o banco gera os ids sozinho
    const { id, fields, ...maskSemId } = mask;

    const fieldsSemId = (fields || []).map(({ id, ...field }) => field);

    const res = await fetch(`${BASE_URL}/masks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...maskSemId, fields: fieldsSemId }),
    });
    if (!res.ok) throw new Error("Erro ao criar máscara");
    return res.json();
}

// Atualiza uma máscara existente
export async function updateMask(id, mask) {
    const { id: _, fields, ...maskSemId } = mask;

    const fieldsSemId = (fields || []).map(({ id, ...field }) => field);

    const res = await fetch(`${BASE_URL}/masks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...maskSemId, fields: fieldsSemId }),
    });
    if (!res.ok) throw new Error("Erro ao atualizar máscara");
    return res.json();
}

// Deleta uma máscara
export async function deleteMask(id) {
    const res = await fetch(`${BASE_URL}/masks/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Erro ao deletar máscara");
}
