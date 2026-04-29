'use client';
import { useState } from "react";

const MATRIX_SYSTEM_PROMPT = `Tu es un expert en stratégie éditoriale pour L'Équipe. Tu dois appliquer strictement la matrice de décision gratuit/payant ci-dessous pour arbitrer la publication d'un article.

## MATRICE DE DÉCISION

### Objectifs
- Gratuit : maximiser le revenu publicitaire (pages vues)
- Payant : maximiser le revenu abonné (conversion, fidélisation)

### Logique décisionnelle

**ÉTAPE 1 — Type de sport**
Top sports (foot, rugby, tennis, NBA, F1, cyclisme) → aller à l'étape 2A
Autres sports → aller à l'étape 2B
Respire → aller à l'étape 2C

**ÉTAPE 2A — Top sport : exclusivité ?**
→ SI OUI : PAYANT
→ SI NON : GRATUIT

**ÉTAPE 2B — Autre sport : exclusivité + transversalité ?**
→ SI exclusivité ET transversalité : PAYANT
→ SINON : GRATUIT

**ÉTAPE 2C — Respire : exclusivité + transversalité + notoriété ?**
→ SI les trois : PAYANT
→ SINON : GRATUIT

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "verdict": "PAYANT" | "GRATUIT" | "CAS LIMITE",
  "confidence": "haute" | "moyenne" | "faible",
  "etapes": [{ "label": "...", "reponse": "...", "explication": "..." }],
  "raisonnement": "...",
  "cas_limite": "..." | null,
  "recommandation_redac": "..."
}`;

const SPORT_TYPES = [
  { value: "top", label: "⚽ Top sport", sub: "Foot, rugby, tennis, NBA, F1, cyclisme" },
  { value: "other", label: "🏅 Autre sport", sub: "Tous les autres sports" },
  { value: "respire", label: "🌿 Respire", sub: "Contenu lifestyle / bien-être" },
];

const verdictConfig = {
  PAYANT: { bg: "#fff0f2", accent: "#c8102e", border: "#c8102e", icon: "🔒" },
  GRATUIT: { bg: "#f0faf4", accent: "#1a7a3f", border: "#1a7a3f", icon: "🌐" },
  "CAS LIMITE": { bg: "#fffbf0", accent: "#b45000", border: "#f4a100", icon: "⚠️" },
};

const S = {
  input: { width: "100%", background: "#fff", border: "1px solid #d0d0d0", borderRadius: 8, color: "#111", fontSize: 14, padding: "12px 14px", outline: "none", fontFamily: "Georgia, serif", boxSizing: "border-box" },
  chip: { borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "10px 16px", fontFamily: "Georgia, serif" },
};

export default function App() {
  const [view, setView] = useState("form");
  const [form, setForm] = useState({ titre: "", texte: "", sport_type: "", exclusivite: "", transversalite: "", notoriete: "" });
  const [result, setResult] = useState(null);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackDecision, setFeedbackDecision] = useState("");
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [history, setHistory] = useState([]);

  const showTransversalite = form.sport_type === "other" || form.sport_type === "respire";
  const showNotoriete = form.sport_type === "respire";
  const canSubmit = form.texte.trim().length > 20 && form.sport_type && form.exclusivite &&
    (form.sport_type === "top" || form.transversalite) &&
    (form.sport_type !== "respire" || form.notoriete);

  async function handleSubmit() {
    setView("loading"); setError(null); setFeedback(null); setFeedbackSaved(false); setFeedbackComment(""); setFeedbackDecision("");
    const userPrompt = `Arbitre cet article.\nTITRE : ${form.titre || "(non renseigné)"}\nTYPE : ${form.sport_type === "top" ? "Top sport" : form.sport_type === "respire" ? "Respire" : "Autre sport"}\nEXCLUSIVITÉ : ${form.exclusivite === "oui" ? "Oui" : form.exclusivite === "non" ? "Non" : "Partielle"}${showTransversalite ? `\nTRANSVERSALITÉ : ${form.transversalite === "oui" ? "Oui" : form.transversalite === "non" ? "Non" : "Difficile à dire"}` : ""}${showNotoriete ? `\nNOTORIÉTÉ : ${form.notoriete === "oui" ? "Oui" : "Non"}` : ""}\nTEXTE : ${form.texte}`;
    try {
      const response = await fetch("/api/arbitrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: MATRIX_SYSTEM_PROMPT, messages: [{ role: "user", content: userPrompt }] }),
      });
      const data = await response.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setResult(parsed);
      setCurrentEntry({ id: Date.now(), date: new Date().toISOString(), titre: form.titre || "(sans titre)", sport_type: form.sport_type, verdict_outil: parsed.verdict, confidence: parsed.confidence });
      setView("result");
    } catch(e) { setError("Erreur lors de l'analyse. Réessaie."); setView("form"); }
  }

  function submitFeedback() {
    const entry = { ...currentEntry, feedback, decision_reelle: feedback === "different" ? feedbackDecision : currentEntry.verdict_outil, commentaire: feedbackComment || null };
    setHistory(h => [entry, ...h]);
    setFeedbackSaved(true);
  }

  function reset() {
    setView("form"); setResult(null); setCurrentEntry(null); setFeedback(null); setFeedbackSaved(false); setFeedbackComment(""); setFeedbackDecision("");
    setForm({ titre: "", texte: "", sport_type: "", exclusivite: "", transversalite: "", notoriete: "" });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <div style={{ borderBottom: "2px solid #c8102e", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "Impact, Arial Black, sans-serif", fontSize: 24, color: "#c8102e", letterSpacing: 3 }}>L&apos;ÉQUIPE</span>
          <span style={{ color: "#ccc", fontSize: 18 }}>|</span>
          <span style={{ color: "#888", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Arbitrage éditorial</span>
        </div>
        <button onClick={view === "history" ? reset : () => setView("history")}
          style={{ background: "#fff", border: "1px solid #ddd", color: "#555", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>
          {view === "history" ? "← Retour" : "📊 Historique"}
        </button>
      </div>

      <div style={{ maxWidth: 660, margin: "0 auto", padding: "40px 24px" }}>

        {view === "form" && <div>
          <h1 style={{ color: "#111", fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Gratuit ou payant ?</h1>
          <p style={{ color: "#777", fontSize: 14, marginBottom: 36, lineHeight: 1.6 }}>Renseigne les infos et colle le texte. L&apos;outil applique la matrice et motive son verdict.</p>
          {error && <div style={{ background: "#fff0f0", border: "1px solid #c8102e", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#c8102e", fontSize: 13 }}>{error}</div>}

          <div style={{ marginBottom: 24 }}>
            <label style={{ color: "#111", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 8 }}>Titre <span style={{ color: "#aaa", fontSize: 12, fontWeight: 400 }}>optionnel</span></label>
            <input style={S.input} placeholder="ex : Eric Perrot sur son statut post-JO" value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ color: "#111", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 8 }}>Type de contenu</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SPORT_TYPES.map(s => (
                <button key={s.value} onClick={() => setForm({...form, sport_type: s.value, transversalite: "", notoriete: ""})}
                  style={{ ...S.chip, background: form.sport_type === s.value ? "#111" : "#fff", color: form.sport_type === s.value ? "#fff" : "#333", border: form.sport_type === s.value ? "1px solid #111" : "1px solid #ddd", textAlign: "left", padding: "12px 16px" }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{s.label}</span>
                  <span style={{ display: "block", fontSize: 12, opacity: 0.6, marginTop: 2 }}>{s.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {form.sport_type && <div style={{ marginBottom: 24 }}>
            <label style={{ color: "#111", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 4 }}>Le contenu est-il exclusif ?</label>
            <p style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Terrain sans concurrence, interview en 1er, analyse propre à L&apos;Équipe</p>
            <div style={{ display: "flex", gap: 8 }}>
              {[{v:"oui",l:"Oui"},{v:"non",l:"Non"},{v:"partiel",l:"Partiel / incertain"}].map(o => (
                <button key={o.v} onClick={() => setForm({...form, exclusivite: o.v})}
                  style={{ ...S.chip, flex: 1, background: form.exclusivite === o.v ? "#111" : "#fff", color: form.exclusivite === o.v ? "#fff" : "#333", border: form.exclusivite === o.v ? "1px solid #111" : "1px solid #ddd" }}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>}

          {showTransversalite && form.exclusivite && <div style={{ marginBottom: 24 }}>
            <label style={{ color: "#111", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 4 }}>L&apos;angle est-il transversal ?</label>
            <p style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Dépasse les fans — société, lifestyle, judiciaire, parcours de vie</p>
            <div style={{ display: "flex", gap: 8 }}>
              {[{v:"oui",l:"Oui"},{v:"non",l:"Non"},{v:"partiel",l:"Difficile à dire"}].map(o => (
                <button key={o.v} onClick={() => setForm({...form, transversalite: o.v})}
                  style={{ ...S.chip, flex: 1, background: form.transversalite === o.v ? "#111" : "#fff", color: form.transversalite === o.v ? "#fff" : "#333", border: form.transversalite === o.v ? "1px solid #111" : "1px solid #ddd" }}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>}

          {showNotoriete && form.transversalite && <div style={{ marginBottom: 24 }}>
            <label style={{ color: "#111", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 8 }}>Notoriété de l&apos;intervenant ?</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[{v:"oui",l:"Oui — ex-athlète connu, figure publique"},{v:"non",l:"Non — intervenant anonyme"}].map(o => (
                <button key={o.v} onClick={() => setForm({...form, notoriete: o.v})}
                  style={{ ...S.chip, background: form.notoriete === o.v ? "#111" : "#fff", color: form.notoriete === o.v ? "#fff" : "#333", border: form.notoriete === o.v ? "1px solid #111" : "1px solid #ddd", textAlign: "left", padding: "12px 16px" }}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>}

          <div style={{ marginBottom: 28 }}>
            <label style={{ color: "#111", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 4 }}>Texte de l&apos;article</label>
            <p style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Colle le texte complet ou un extrait représentatif</p>
            <textarea style={{ ...S.input, minHeight: 160, resize: "vertical", lineHeight: 1.6 }} placeholder="Colle ici le texte..." value={form.texte} onChange={e => setForm({...form, texte: e.target.value})} />
          </div>

          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{ width: "100%", padding: "16px", background: canSubmit ? "#c8102e" : "#eee", color: canSubmit ? "#fff" : "#aaa", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed" }}>
            Analyser l&apos;article →
          </button>
        </div>}

        {view === "loading" && <div style={{ textAlign: "center", paddingTop: 80 }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>⏳</div>
          <p style={{ color: "#888", fontSize: 15 }}>Application de la matrice en cours…</p>
        </div>}

        {view === "result" && result && (() => {
          const cfg = verdictConfig[result.verdict] || verdictConfig["CAS LIMITE"];
          return <div>
            <div style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 12, padding: "28px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>{cfg.icon}</span>
                <span style={{ fontSize: 32, fontWeight: 900, color: cfg.accent, fontFamily: "Impact, Arial Black, sans-serif", letterSpacing: 2 }}>{result.verdict}</span>
              </div>
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: "#888", textTransform: "uppercase" }}>Confiance : </span>
                <span style={{ fontSize: 12, color: cfg.accent, fontWeight: 700, textTransform: "uppercase" }}>{result.confidence}</span>
              </div>
              <p style={{ color: "#333", fontSize: 14, lineHeight: 1.8, margin: 0 }}>{result.raisonnement}</p>
              {result.cas_limite && <div style={{ marginTop: 16, background: "#fff8e0", border: "1px solid #f4a100", borderRadius: 8, padding: "12px 14px" }}>
                <span style={{ color: "#b45000", fontSize: 13, fontWeight: 600 }}>⚠️ Point d&apos;attention : </span>
                <span style={{ color: "#555", fontSize: 13 }}>{result.cas_limite}</span>
              </div>}
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Raisonnement étape par étape</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.etapes?.map((e, i) => (
                  <div key={i} style={{ background: "#f9f9f9", border: "1px solid #eee", borderRadius: 8, padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ color: "#bbb", fontSize: 12, minWidth: 18 }}>{i+1}.</span>
                      <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <span style={{ color: "#333", fontSize: 13, fontWeight: 600 }}>{e.label}</span>
                          <span style={{ fontSize: 12, color: e.reponse?.toLowerCase().includes("oui") ? "#1a7a3f" : e.reponse?.toLowerCase().includes("non") ? "#c8102e" : "#b45000", fontWeight: 700 }}>→ {e.reponse}</span>
                        </div>
                        <p style={{ color: "#666", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{e.explication}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {result.recommandation_redac && <div style={{ background: "#f9f9f9", border: "1px solid #eee", borderRadius: 8, padding: "16px", marginBottom: 24 }}>
              <h3 style={{ color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Recommandation rédac</h3>
              <p style={{ color: "#333", fontSize: 14, margin: 0, lineHeight: 1.7 }}>{result.recommandation_redac}</p>
            </div>}

            <div style={{ background: "#f9f9f9", border: "1px solid #eee", borderRadius: 12, padding: "20px", marginBottom: 20 }}>
              <h3 style={{ color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Votre décision finale</h3>
              <p style={{ color: "#aaa", fontSize: 12, marginBottom: 16 }}>Votre retour améliore la matrice au fil du temps.</p>
              {!feedbackSaved ? <>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <button onClick={() => setFeedback("suivi")} style={{ flex: 1, padding: "12px", background: feedback === "suivi" ? "#f0faf4" : "#fff", border: feedback === "suivi" ? "1px solid #1a7a3f" : "1px solid #ddd", borderRadius: 8, color: feedback === "suivi" ? "#1a7a3f" : "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✅ Verdict suivi</button>
                  <button onClick={() => setFeedback("different")} style={{ flex: 1, padding: "12px", background: feedback === "different" ? "#fff0f2" : "#fff", border: feedback === "different" ? "1px solid #c8102e" : "1px solid #ddd", borderRadius: 8, color: feedback === "different" ? "#c8102e" : "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>❌ Décision différente</button>
                </div>
                {feedback === "different" && <div style={{ marginBottom: 12 }}>
                  <p style={{ color: "#666", fontSize: 12, marginBottom: 8 }}>Décision finale ?</p>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    {["PAYANT","GRATUIT","CAS LIMITE"].map(v => (
                      <button key={v} onClick={() => setFeedbackDecision(v)} style={{ flex: 1, padding: "8px", background: feedbackDecision === v ? "#111" : "#fff", border: feedbackDecision === v ? "1px solid #111" : "1px solid #ddd", borderRadius: 6, color: feedbackDecision === v ? "#fff" : "#555", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{v}</button>
                    ))}
                  </div>
                </div>}
                {feedback && <>
                  <textarea style={{ ...S.input, minHeight: 70, resize: "none", fontSize: 13, marginBottom: 10 }} placeholder="Commentaire optionnel — pourquoi cette décision ?" value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} />
                  <button onClick={submitFeedback} disabled={feedback === "different" && !feedbackDecision}
                    style={{ width: "100%", padding: "10px", background: (feedback === "suivi" || feedbackDecision) ? "#c8102e" : "#eee", color: (feedback === "suivi" || feedbackDecision) ? "#fff" : "#aaa", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Enregistrer mon retour →
                  </button>
                </>}
              </> : <div style={{ textAlign: "center", padding: "12px 0" }}>
                <span style={{ fontSize: 22 }}>✓</span>
                <p style={{ color: "#1a7a3f", fontSize: 13, margin: "6px 0 0" }}>Retour enregistré — merci !</p>
              </div>}
            </div>

            <button onClick={reset} style={{ width: "100%", padding: "14px", background: "#fff", color: "#888", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>← Nouvel article</button>
          </div>;
        })()}

        {view === "history" && <div>
          <h1 style={{ color: "#111", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Historique des arbitrages</h1>
          <p style={{ color: "#888", fontSize: 13, marginBottom: 28 }}>Session en cours uniquement.</p>
          {history.length === 0
            ? <p style={{ color: "#bbb", fontSize: 14, textAlign: "center", paddingTop: 60 }}>Aucun arbitrage enregistré pour l&apos;instant.</p>
            : <>
              <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
                {[
                  { label: "Total", value: history.length, color: "#111" },
                  { label: "Suivis", value: history.filter(h => h.feedback === "suivi").length, color: "#1a7a3f" },
                  { label: "Divergences", value: history.filter(h => h.feedback === "different").length, color: "#c8102e" },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, background: "#f9f9f9", border: "1px solid #eee", borderRadius: 8, padding: "12px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {history.map(entry => {
                  const cfg = verdictConfig[entry.verdict_outil] || verdictConfig["CAS LIMITE"];
                  const realCfg = entry.decision_reelle ? verdictConfig[entry.decision_reelle] : null;
                  return <div key={entry.id} style={{ background: "#f9f9f9", border: "1px solid #eee", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "#111", fontSize: 13, fontWeight: 600, margin: "0 0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.titre}</p>
                        <p style={{ color: "#aaa", fontSize: 11, margin: 0 }}>{new Date(entry.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: cfg.accent, fontWeight: 700, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 4, padding: "2px 8px" }}>{entry.verdict_outil}</span>
                        {entry.feedback === "different" && realCfg && <>
                          <span style={{ color: "#ccc" }}>→</span>
                          <span style={{ fontSize: 11, color: realCfg.accent, fontWeight: 700, background: realCfg.bg, border: `1px solid ${realCfg.border}`, borderRadius: 4, padding: "2px 8px" }}>{entry.decision_reelle}</span>
                        </>}
                        {entry.feedback === "suivi" && <span style={{ color: "#1a7a3f" }}>✓</span>}
                      </div>
                    </div>
                    {entry.commentaire && <p style={{ color: "#888", fontSize: 12, margin: "10px 0 0", fontStyle: "italic", borderTop: "1px solid #eee", paddingTop: 8 }}>"{entry.commentaire}"</p>}
                  </div>;
                })}
              </div>
            </>
          }
        </div>}
      </div>
    </div>
  );
}
