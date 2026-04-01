import { useState, useCallback, useEffect } from "react";
import { fetchMasks, createMask, updateMask, deleteMask } from "./services/maskService";


// ── Storage keys ──────────────────────────────────────────────────────────────
const SK_MASKS = "relatech:masks";
const SK_ACTIVE = "relatech:activeId";
const SK_HISTORY = "relatech:history";
const SK_COUNTER = "relatech:counter"; // { date: "YYYY-MM-DD", count: N }

// ── Helpers ───────────────────────────────────────────────────────────────────
const ls = {
  get: (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
  del: (k) => { try { localStorage.removeItem(k); } catch { } },
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const timeStr = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function loadCounter() {
  const s = ls.get(SK_COUNTER);
  return s && s.date === todayStr() ? s.count : 0;
}
function incrementCounter(c) {
  const n = c + 1;
  ls.set(SK_COUNTER, { date: todayStr(), count: n });
  return n;
}

// ── Máscaras padrão ───────────────────────────────────────────────────────────
const INITIAL_MASKS = [
  {
    id: 1, name: "Atendimento Geral", emoji: "📋", color: "#00c2ff",
    fields: [
      { id: "f1", label: "Nome do Cliente", type: "text", placeholder: "Ex: João Silva" },
      { id: "f2", label: "Empresa", type: "text", placeholder: "Ex: Acme Ltda" },
      { id: "f3", label: "Problema Relatado", type: "textarea", placeholder: "Descreva o problema…" },
      { id: "f4", label: "Solução Aplicada", type: "textarea", placeholder: "Descreva a solução…" },
      { id: "f5", label: "Status", type: "select", options: ["Resolvido", "Pendente", "Escalado", "Em andamento"] },
    ],
    template: "👤 CLIENTE: {Nome do Cliente}\n🏢 EMPRESA: {Empresa}\n\n❌ PROBLEMA:\n{Problema Relatado}\n\n✅ SOLUÇÃO:\n{Solução Aplicada}\n\n📌 STATUS: {Status}",
  },
  {
    id: 2, name: "Suporte de Rede", emoji: "🌐", color: "#a855f7",
    fields: [
      { id: "f1", label: "Nome do Cliente", type: "text", placeholder: "Ex: Maria Souza" },
      { id: "f2", label: "IP / Hostname", type: "text", placeholder: "Ex: 192.168.1.1" },
      { id: "f3", label: "Tipo de Falha", type: "select", options: ["Sem conexão", "Lentidão", "Instabilidade", "Configuração", "Outro"] },
      { id: "f4", label: "Diagnóstico", type: "textarea", placeholder: "Resultado do diagnóstico…" },
      { id: "f5", label: "Ação Tomada", type: "textarea", placeholder: "O que foi feito…" },
    ],
    template: "👤 CLIENTE: {Nome do Cliente}\n🖥️ IP/HOST: {IP / Hostname}\n🔴 TIPO DE FALHA: {Tipo de Falha}\n\n🔍 DIAGNÓSTICO:\n{Diagnóstico}\n\n🔧 AÇÃO TOMADA:\n{Ação Tomada}",
  },
  {
    id: 3, name: "Reset de Senha", emoji: "🔑", color: "#f59e0b",
    fields: [
      { id: "f1", label: "Nome do Usuário", type: "text", placeholder: "Ex: carlos.oliveira" },
      { id: "f2", label: "Sistema / Plataforma", type: "text", placeholder: "Ex: Active Directory" },
      { id: "f3", label: "Motivo do Reset", type: "select", options: ["Esqueceu a senha", "Conta bloqueada", "Troca periódica", "Suspeita de invasão"] },
      { id: "f4", label: "Verificação de Identidade", type: "select", options: ["Validado por ramal", "Validado por e-mail", "Validado por gestor", "Outro"] },
    ],
    template: "🔑 RESET DE SENHA\n\n👤 USUÁRIO: {Nome do Usuário}\n💻 SISTEMA: {Sistema / Plataforma}\n📝 MOTIVO: {Motivo do Reset}\n✔️ VERIFICAÇÃO: {Verificação de Identidade}",
  },
];

// ── buildOutput ───────────────────────────────────────────────────────────────
function buildOutput(mask, values) {
  let r = mask.template;
  mask.fields.forEach(f => { r = r.replaceAll(`{${f.label}}`, values[f.label] || `[${f.label}]`); });
  return r;
}

// ── FieldInput ────────────────────────────────────────────────────────────────
function FieldInput({ field, value, onChange }) {
  const base = {
    width: "100%", background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px",
    color: "#e2e8f0", padding: "10px 14px", fontSize: "14px",
    fontFamily: "'IBM Plex Mono', monospace", outline: "none",
    boxSizing: "border-box", transition: "border-color 0.2s",
  };
  const focus = e => (e.target.style.borderColor = "rgba(255,255,255,0.4)");
  const blur = e => (e.target.style.borderColor = "rgba(255,255,255,0.12)");

  if (field.type === "textarea")
    return <textarea value={value || ""} onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder} rows={3}
      style={{ ...base, resize: "vertical" }} onFocus={focus} onBlur={blur} />;

  if (field.type === "select")
    return (
      <select value={value || ""} onChange={e => onChange(e.target.value)}
        style={{ ...base, cursor: "pointer" }} onFocus={focus} onBlur={blur}>
        <option value="">Selecione…</option>
        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );

  return <input type="text" value={value || ""} onChange={e => onChange(e.target.value)}
    placeholder={field.placeholder} style={base} onFocus={focus} onBlur={blur} />;
}

// ── MaskModal ─────────────────────────────────────────────────────────────────
function MaskModal({ mask, onSave, onClose }) {
  const isNew = !mask.id;
  const [name, setName] = useState(mask.name || "");
  const [emoji, setEmoji] = useState(mask.emoji || "📄");
  const [color, setColor] = useState(mask.color || "#00c2ff");
  const [fields, setFields] = useState(mask.fields || []);
  const [template, setTemplate] = useState(mask.template || "");

  const addField = () => {
    const newLabel = "Novo Campo";
    setFields(p => [...p, { id: "f" + Date.now(), label: newLabel, type: "text", placeholder: "" }]);
    setTemplate(t => t + (t ? "\n" : "") + `{${newLabel}}`);
  };

  const updField = (i, k, v) => {
    if (k === "label") {
      const oldLabel = fields[i].label;
      setTemplate(t => t.replaceAll(`{${oldLabel}}`, `{${v}}`));
    }
    setFields(p => p.map((f, idx) => idx === i ? { ...f, [k]: v } : f));
  };

  const delField = i => {
    const label = fields[i].label;
    setTemplate(t => t.split("\n").filter(line => !line.includes(`{${label}}`)).join("\n"));
    setFields(p => p.filter((_, idx) => idx !== i));
  };

  const insertVar = (label) => {
    setTemplate(t => t + (t && !t.endsWith("\n") ? "\n" : "") + `{${label}}`);
  };

  const inp = {
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px", color: "#e2e8f0", padding: "8px 12px", fontSize: "13px",
    fontFamily: "'IBM Plex Mono',monospace", outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px"
    }}>
      <div style={{
        background: "#131a2e", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "580px",
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.6)"
      }}>

        <h2 style={{ color: "#e2e8f0", margin: "0 0 18px", fontFamily: "'Space Grotesk',sans-serif", fontSize: "17px" }}>
          {isNew ? "➕ Nova Máscara" : "✏️ Editar Máscara"}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "56px 1fr 72px", gap: "10px", marginBottom: "16px" }}>
          <input value={emoji} onChange={e => setEmoji(e.target.value)} style={inp} placeholder="Emoji" />
          <input value={name} onChange={e => setName(e.target.value)} style={inp} placeholder="Nome da máscara" />
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            style={{ ...inp, padding: "4px", cursor: "pointer", height: "38px" }} />
        </div>

        <p style={{
          color: "#64748b", fontSize: "11px", margin: "0 0 8px", fontFamily: "'IBM Plex Mono',monospace",
          textTransform: "uppercase", letterSpacing: "0.05em"
        }}>CAMPOS</p>

        {fields.map((f, i) => (
          <div key={f.id} style={{
            background: "rgba(255,255,255,0.04)", borderRadius: "10px",
            padding: "12px", marginBottom: "10px", border: "1px solid rgba(255,255,255,0.07)"
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 36px 36px", gap: "8px", marginBottom: "8px" }}>
              <input value={f.label} onChange={e => updField(i, "label", e.target.value)} style={inp} placeholder="Nome do campo" />
              <select value={f.type} onChange={e => updField(i, "type", e.target.value)} style={inp}>
                <option value="text">Texto</option>
                <option value="textarea">Área</option>
                <option value="select">Seleção</option>
              </select>
              <button onClick={() => insertVar(f.label)} title="Inserir no template"
                style={{
                  background: "rgba(99,179,237,0.15)", border: "1px solid rgba(99,179,237,0.3)",
                  color: "#63b3ed", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: "'IBM Plex Mono',monospace"
                }}>{"{ }"}</button>
              <button onClick={() => delField(i)} style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: "8px",
                cursor: "pointer", fontSize: "16px"
              }}>×</button>
            </div>
            <input value={f.placeholder || ""} onChange={e => updField(i, "placeholder", e.target.value)}
              style={inp} placeholder="Placeholder (dica)" />
            {f.type === "select" && (
              <input value={(f.options || []).join(", ")}
                onChange={e => updField(i, "options", e.target.value.split(",").map(s => s.trim()))}
                style={{ ...inp, marginTop: "8px" }} placeholder="Opções separadas por vírgula" />
            )}
          </div>
        ))}

        <button onClick={addField} style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px dashed rgba(255,255,255,0.2)", color: "#94a3b8", borderRadius: "8px",
          padding: "8px", cursor: "pointer", width: "100%", marginBottom: "16px",
          fontSize: "13px", fontFamily: "'IBM Plex Mono',monospace"
        }}>+ Adicionar Campo</button>

        <p style={{
          color: "#64748b", fontSize: "11px", margin: "0 0 8px", fontFamily: "'IBM Plex Mono',monospace",
          textTransform: "uppercase", letterSpacing: "0.05em"
        }}>TEMPLATE — use {"{Nome do Campo}"}</p>

        <textarea value={template} onChange={e => setTemplate(e.target.value)} rows={6}
          style={{ ...inp, resize: "vertical", marginBottom: "20px" }}
          placeholder={"Ex: CLIENTE: {Nome do Cliente}\nPROBLEMA: {Problema}"} />

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.15)", color: "#94a3b8",
            borderRadius: "8px", padding: "10px 18px", cursor: "pointer", fontSize: "13px"
          }}>Cancelar</button>
          <button onClick={() => onSave({ ...mask, name, emoji, color, fields, template })}
            style={{
              background: color, border: "none", color: "#000", borderRadius: "8px",
              padding: "10px 22px", cursor: "pointer", fontSize: "14px", fontWeight: "700",
              fontFamily: "'Space Grotesk',sans-serif"
            }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ── HistoryPanel ──────────────────────────────────────────────────────────────
function HistoryPanel({ history, masks, onCopy, onDelete }) {
  const [copiedIdx, setCopiedIdx] = useState(null);

  const handleCopy = async (item, idx) => {
    await onCopy(item.text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (history.length === 0)
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        flex: 1, gap: "10px", color: "#2d3748", padding: "40px 20px", textAlign: "center"
      }}>
        <span style={{ fontSize: "34px" }}>📭</span>
        <p style={{ fontSize: "13px", fontFamily: "'IBM Plex Mono',monospace" }}>Nenhum relato copiado ainda</p>
        <p style={{ fontSize: "12px", color: "#1e2535" }}>Os últimos 3 relatos aparecerão aqui</p>
      </div>
    );

  return (
    <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
      <p style={{
        color: "#64748b", fontSize: "11px", marginBottom: "14px",
        fontFamily: "'IBM Plex Mono',monospace", textTransform: "uppercase", letterSpacing: "0.05em"
      }}>
        ÚLTIMOS RELATOS COPIADOS
      </p>
      {history.map((item, idx) => {
        const mask = masks.find(m => m.id === item.maskId);
        return (
          <div key={item.id} style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "12px", padding: "14px", marginBottom: "12px",
            borderLeft: `3px solid ${mask?.color || "#4a5568"}`,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "10px", gap: "8px", flexWrap: "wrap"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0 }}>
                <span style={{
                  fontSize: "11px", fontFamily: "'IBM Plex Mono',monospace",
                  background: `${mask?.color || "#4a5568"}20`,
                  border: `1px solid ${mask?.color || "#4a5568"}40`,
                  color: mask?.color || "#94a3b8",
                  borderRadius: "6px", padding: "2px 8px", whiteSpace: "nowrap",
                }}>{mask?.emoji} {mask?.name || "Máscara removida"}</span>
                <span style={{ fontSize: "11px", color: "#374151", fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "nowrap" }}>
                  {item.time}
                </span>
              </div>
              <div style={{ display: "flex", gap: "5px", flexShrink: 0 }}>
                <button onClick={() => handleCopy(item, idx)} title="Copiar novamente" style={{
                  background: copiedIdx === idx ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                  border: copiedIdx === idx ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.1)",
                  color: copiedIdx === idx ? "#10b981" : "#94a3b8",
                  borderRadius: "7px", padding: "4px 10px", cursor: "pointer", fontSize: "13px", transition: "all 0.2s",
                }}>{copiedIdx === idx ? "✓" : "⎘"}</button>
                <button onClick={() => onDelete(item.id)} title="Apagar" style={{
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                  color: "#ef4444", borderRadius: "7px", padding: "4px 10px", cursor: "pointer", fontSize: "13px",
                }}>×</button>
              </div>
            </div>
            <pre style={{
              fontSize: "12px", lineHeight: "1.7", color: "#4a5568",
              fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "pre-wrap",
              wordBreak: "break-word", margin: 0, maxHeight: "110px", overflowY: "auto"
            }}>{item.text}</pre>
          </div>
        );
      })}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [masks, setMasks] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    fetchMasks()
      .then(data => {
        if (data.length > 0) {
          setMasks(data);
          setActiveId(data[0].id);
        } else {
          // Banco vazio — sobe as máscaras padrão
          Promise.all(INITIAL_MASKS.map(m => createMask(m)))
            .then(created => {
              setMasks(created);
              setActiveId(created[0].id);
            });
        }
      })
      .catch(err => console.error("Erro ao carregar máscaras:", err))
      .finally(() => setLoading(false));
  }, []);

  const [values, setValues] = useState({});
  const [copied, setCopied] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [history, setHistory] = useState(() => ls.get(SK_HISTORY) || []);
  const [counter, setCounter] = useState(() => loadCounter());
  const [rightTab, setRightTab] = useState("preview"); // "preview" | "history"
  const [mobileTab, setMobileTab] = useState("form");    // "form" | "preview" | "history"
  const [modalMask, setModalMask] = useState(null);

  useEffect(() => ls.set(SK_HISTORY, history), [history]);

  const activeMask = masks.find(m => m.id === activeId) || masks[0] || null;
  const output = activeMask ? buildOutput(activeMask, values) : "";

  const doCopy = useCallback(async (text) => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el);
      el.select(); document.execCommand("copy");
      document.body.removeChild(el);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    await doCopy(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setHistory(prev => {
      const entry = { id: Date.now(), maskId: activeMask.id, text: output, time: timeStr() };
      return [entry, ...prev].slice(0, 3);
    });
    setCounter(c => incrementCounter(c));
  }, [output, activeMask?.id, doCopy]);

  const handleSwitchMask = id => { setActiveId(id); setValues({}); };

  const handleSaveMask = async (mask) => {
    if (!mask.id) {
      const created = await createMask(mask);
      setMasks(prev => [...prev, created]);
      setActiveId(created.id);
    } else {
      const updated = await updateMask(mask.id, mask);
      setMasks(prev => prev.map(m => m.id === mask.id ? updated : m));
    }
    setModalMask(null);
    setValues({});
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleDeleteMask = async (id) => {
    if (masks.length <= 1) return;
    await deleteMask(id);
    const next = masks.filter(m => m.id !== id);
    setMasks(next);
    setActiveId(next[0].id);
    setValues({});
  };
  const handleReset = () => {
    if (!window.confirm("Resetar para as máscaras padrão? Isso apaga todas as suas máscaras.")) return;
    [SK_MASKS, SK_ACTIVE, SK_HISTORY, SK_COUNTER].forEach(k => ls.del(k));
    setMasks(INITIAL_MASKS); setActiveId(INITIAL_MASKS[0].id);
    setValues({}); setHistory([]); setCounter(0);
  };

  // shared button style for inner tabs
  const innerTabBtn = (active, color) => ({
    flex: 1, padding: "10px 8px", border: "none", cursor: "pointer",
    background: active ? "rgba(255,255,255,0.05)" : "transparent",
    color: active ? "#e2e8f0" : "#4a5568",
    fontWeight: active ? "600" : "400",
    fontFamily: "'Space Grotesk',sans-serif", fontSize: "13px",
    borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
    transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
  });

  const Badge = ({ count, color }) => count > 0 ? (
    <span style={{
      background: color, color: "#000", borderRadius: "10px",
      padding: "0 6px", fontSize: "10px", fontWeight: "700", lineHeight: "18px"
    }}>{count}</span>
  ) : null;


  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#4a5568", fontFamily: "'IBM Plex Mono',monospace" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>🎫</div>
        <p style={{ fontSize: "13px" }}>Carregando máscaras...</p>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body { background: #0a0f1e; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        select option { background: #1a2035; color: #e2e8f0; }
        .desktop-only { display: flex !important; }
        .mobile-only  { display: none  !important; }
        @media (max-width: 680px) {
          .desktop-only { display: none  !important; }
          .mobile-only  { display: flex  !important; }
          .mask-tabs    { padding: 8px 12px 0 !important; gap: 4px !important; }
          .mask-tabs button { padding: 6px 10px !important; font-size: 11px !important; }
          .app-header   { padding: 10px 14px  !important; }
          .main-grid    { grid-template-columns: 1fr !important; }
          .right-col    { display: none !important; }
        }
      `}</style>

      <div style={{
        minHeight: "100vh", background: "#0a0f1e",
        fontFamily: "'Space Grotesk',sans-serif", color: "#e2e8f0",
        display: "flex", flexDirection: "column"
      }}>

        {/* ── Header ── */}
        <div className="app-header" style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "13px 22px", display: "flex", alignItems: "center", gap: "10px",
          background: "rgba(255,255,255,0.02)", flexWrap: "wrap"
        }}>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "9px", flexShrink: 0,
              background: "linear-gradient(135deg,#00c2ff,#a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px"
            }}>🎫</div>
            <div>
              <h1 style={{ fontSize: "15px", fontWeight: "700", letterSpacing: "-0.3px" }}>RelaTech</h1>
              <p style={{ fontSize: "11px", color: "#374151", fontFamily: "'IBM Plex Mono',monospace" }}>Máscaras de Atendimento</p>
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* Contador do dia */}
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px", padding: "5px 11px"
            }}>
              <span style={{ fontSize: "10px", color: "#4a5568", fontFamily: "'IBM Plex Mono',monospace" }}>HOJE</span>
              <span style={{
                fontSize: "18px", fontWeight: "700", fontFamily: "'IBM Plex Mono',monospace",
                color: counter > 0 ? activeMask?.color : "#2d3748",
                textShadow: counter > 0 ? `0 0 10px ${activeMask?.color}88` : "none",
                transition: "all 0.3s", lineHeight: 1,
              }}>{counter}</span>
              <span style={{ fontSize: "10px", color: "#4a5568", fontFamily: "'IBM Plex Mono',monospace" }}>
                {counter === 1 ? "relato" : "relatos"}
              </span>
            </div>

            {/* Toast salvo */}
            <div style={{
              background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: "8px", padding: "5px 10px", fontSize: "12px", color: "#10b981",
              fontFamily: "'IBM Plex Mono',monospace",
              opacity: savedToast ? 1 : 0, transition: "opacity 0.3s", pointerEvents: "none",
              whiteSpace: "nowrap",
            }}>💾 Salvo</div>

            <button onClick={handleReset}
              style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                color: "#4a5568", borderRadius: "8px", padding: "5px 10px", cursor: "pointer",
                fontSize: "12px", fontFamily: "'IBM Plex Mono',monospace", transition: "all 0.15s", whiteSpace: "nowrap"
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)" }}
              onMouseLeave={e => { e.currentTarget.style.color = "#4a5568"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)" }}>
              ↺ Padrão
            </button>

            <button
              onClick={() => onLogout()}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#4a5568", borderRadius: "8px",
                padding: "6px 10px", cursor: "pointer",
                fontSize: "12px", fontFamily: "'IBM Plex Mono', monospace",
                transition: "all 0.15s", whiteSpace: "nowrap"
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#4a5568"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >⎋ Sair</button>
          </div>
        </div>


        {/* ── Mask tab bar ── */}
        <div className="mask-tabs" style={{
          display: "flex", gap: "5px", padding: "11px 22px 0",
          overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.01)"
        }}>
          {masks.map(m => (
            <button key={m.id} onClick={() => handleSwitchMask(m.id)} style={{
              display: "flex", alignItems: "center", gap: "5px", padding: "7px 13px",
              borderRadius: "10px 10px 0 0", border: "1px solid", cursor: "pointer",
              borderBottom: activeId === m.id ? "1px solid #0a0f1e" : "1px solid rgba(255,255,255,0.07)",
              background: activeId === m.id ? "#131a2e" : "transparent",
              borderColor: activeId === m.id ? "rgba(255,255,255,0.12)" : "transparent",
              color: activeId === m.id ? "#e2e8f0" : "#4a5568",
              fontSize: "13px", fontWeight: activeId === m.id ? "600" : "400",
              fontFamily: "'Space Grotesk',sans-serif", whiteSpace: "nowrap", transition: "all 0.15s",
            }}>
              <span style={{
                width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
                background: activeId === m.id ? m.color : "rgba(255,255,255,0.2)",
                boxShadow: activeId === m.id ? `0 0 7px ${m.color}` : "none", transition: "all 0.2s"
              }} />
              {m.emoji} {m.name}
            </button>
          ))}
          <button onClick={() => setModalMask({ name: "", emoji: "📄", color: "#00c2ff", fields: [], template: "" })}
            style={{
              padding: "7px 12px", borderRadius: "10px 10px 0 0", cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid transparent",
              background: "transparent", color: "#4a5568", fontSize: "18px", lineHeight: 1, transition: "color 0.15s"
            }}
            onMouseEnter={e => e.target.style.color = "#e2e8f0"}
            onMouseLeave={e => e.target.style.color = "#4a5568"}>+</button>
        </div>

        {/* ── Mobile inner nav ── */}
        <div className="mobile-only" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <button style={innerTabBtn(mobileTab === "form", activeMask?.color)} onClick={() => setMobileTab("form")}>
            📝 Formulário
          </button>
          <button style={innerTabBtn(mobileTab === "preview", activeMask?.color)} onClick={() => setMobileTab("preview")}>
            👁 Preview
          </button>
          <button style={innerTabBtn(mobileTab === "history", activeMask?.color)} onClick={() => setMobileTab("history")}>
            🕑 Histórico <Badge count={history.length} color={activeMask?.color} />
          </button>
        </div>

        {/* ── Main grid ── */}
        <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", flex: 1, minHeight: 0 }}>

          {/* LEFT — Fields */}
          <div style={{
            padding: "20px", borderRight: "1px solid rgba(255,255,255,0.07)",
            overflowY: "auto", background: "#131a2e",
            // mobile: hide when not on form tab
            display: mobileTab !== "form" ? undefined : undefined,
          }} className={mobileTab !== "form" ? "mobile-only" : ""}>
            {/* on desktop always show; on mobile only when mobileTab==="form" */}
            <div style={{ display: mobileTab !== "form" ? "none" : "block" }} className="mobile-only" />

            <div id="fields-inner" style={{
              display: "block",
            }}>
              {/* Mask label + actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    width: "8px", height: "8px", borderRadius: "50%", display: "inline-block",
                    background: activeMask?.color, boxShadow: `0 0 8px ${activeMask?.color}`
                  }} />
                  <h2 style={{ fontSize: "14px", fontWeight: "600" }}>{activeMask?.emoji} {activeMask?.name}</h2>
                </div>
                <div style={{ display: "flex", gap: "5px" }}>
                  <button onClick={() => setModalMask(activeMask)} title="Editar" style={{
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8", borderRadius: "7px", padding: "4px 8px", cursor: "pointer", fontSize: "12px"
                  }}>✏️</button>
                  {masks.length > 1 && (
                    <button onClick={() => handleDeleteMask(activeMask.id)} title="Excluir" style={{
                      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                      color: "#ef4444", borderRadius: "7px", padding: "4px 8px", cursor: "pointer", fontSize: "12px"
                    }}>🗑️</button>
                  )}
                </div>
              </div>

              {activeMask?.fields.map(field => (
                <div key={field.id} style={{ marginBottom: "14px" }}>
                  <label style={{
                    display: "block", fontSize: "10px", fontWeight: "600", color: "#64748b",
                    marginBottom: "5px", fontFamily: "'IBM Plex Mono',monospace",
                    textTransform: "uppercase", letterSpacing: "0.05em"
                  }}>{field.label}</label>
                  <FieldInput field={field} value={values[field.label]}
                    onChange={val => setValues(v => ({ ...v, [field.label]: val }))} />
                </div>
              ))}

              <button onClick={() => setValues({})} style={{
                marginTop: "4px", width: "100%",
                background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                color: "#4a5568", borderRadius: "8px", padding: "9px", cursor: "pointer",
                fontSize: "12px", fontFamily: "'IBM Plex Mono',monospace", transition: "all 0.15s"
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "#94a3b8" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#4a5568" }}>
                ↺ Limpar campos
              </button>
            </div>
          </div>

          {/* RIGHT — Preview + History (desktop) */}
          <div className="right-col" style={{
            display: "flex", flexDirection: "column",
            borderLeft: "1px solid rgba(255,255,255,0.07)", overflow: "hidden"
          }}>

            {/* right inner tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
              <button style={innerTabBtn(rightTab === "preview", activeMask?.color)}
                onClick={() => setRightTab("preview")}>👁 Preview</button>
              <button style={innerTabBtn(rightTab === "history", activeMask?.color)}
                onClick={() => setRightTab("history")}>
                🕑 Histórico <Badge count={history.length} color={activeMask?.color} />
              </button>
            </div>

            {/* Preview */}
            {rightTab === "preview" && (
              <div style={{
                flex: 1, padding: "20px", display: "flex", flexDirection: "column",
                background: "#0e1525", overflowY: "auto"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <p style={{
                    fontSize: "10px", fontWeight: "600", color: "#64748b",
                    fontFamily: "'IBM Plex Mono',monospace", textTransform: "uppercase", letterSpacing: "0.05em"
                  }}>Preview do Relato</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <div style={{
                      width: "5px", height: "5px", borderRadius: "50%",
                      background: activeMask?.color, boxShadow: `0 0 5px ${activeMask?.color}`
                    }} />
                    <span style={{ fontSize: "10px", color: "#4a5568", fontFamily: "'IBM Plex Mono',monospace" }}>ao vivo</span>
                  </div>
                </div>
                <pre style={{
                  flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px", padding: "16px", fontSize: "13px", lineHeight: "1.8", color: "#cbd5e1",
                  fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "pre-wrap", wordBreak: "break-word",
                  overflowY: "auto", minHeight: "140px"
                }}>{output}</pre>
                <button onClick={handleCopy} style={{
                  marginTop: "14px", padding: "13px", borderRadius: "10px",
                  border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "700", transition: "all 0.2s",
                  fontFamily: "'Space Grotesk',sans-serif",
                  background: copied ? "linear-gradient(135deg,#10b981,#059669)" : `linear-gradient(135deg,${activeMask?.color},${activeMask?.color}cc)`,
                  color: copied ? "#fff" : "#000",
                  boxShadow: copied ? "0 4px 18px rgba(16,185,129,0.4)" : `0 4px 18px ${activeMask?.color}40`,
                }}>{copied ? "✓ Copiado!" : "⎘ Copiar Relato"}</button>
              </div>
            )}

            {/* History */}
            {rightTab === "history" && (
              <div style={{ flex: 1, background: "#0e1525", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <HistoryPanel history={history} masks={masks} onCopy={doCopy}
                  onDelete={id => setHistory(h => h.filter(e => e.id !== id))} />
              </div>
            )}
          </div>

          {/* MOBILE — Preview panel */}
          {mobileTab === "preview" && (
            <div style={{
              padding: "16px", display: "flex", flexDirection: "column",
              background: "#0e1525", gridColumn: "1"
            }}>
              <pre style={{
                flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px", padding: "14px", fontSize: "13px", lineHeight: "1.8", color: "#cbd5e1",
                fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "pre-wrap", wordBreak: "break-word",
                overflowY: "auto", minHeight: "160px", marginBottom: "14px"
              }}>{output}</pre>
              <button onClick={handleCopy} style={{
                padding: "13px", borderRadius: "10px", border: "none",
                cursor: "pointer", fontSize: "14px", fontWeight: "700", fontFamily: "'Space Grotesk',sans-serif",
                transition: "all 0.2s",
                background: copied ? "linear-gradient(135deg,#10b981,#059669)" : `linear-gradient(135deg,${activeMask?.color},${activeMask?.color}cc)`,
                color: copied ? "#fff" : "#000",
              }}>{copied ? "✓ Copiado!" : "⎘ Copiar Relato"}</button>
            </div>
          )}

          {/* MOBILE — History panel */}
          {mobileTab === "history" && (
            <div style={{
              background: "#0e1525", display: "flex", flexDirection: "column",
              gridColumn: "1", minHeight: "300px"
            }}>
              <HistoryPanel history={history} masks={masks} onCopy={doCopy}
                onDelete={id => setHistory(h => h.filter(e => e.id !== id))} />
            </div>
          )}

        </div>
      </div>

      {modalMask && (
        <MaskModal mask={modalMask} onSave={handleSaveMask} onClose={() => setModalMask(null)} />
      )}
    </>
  );
};

