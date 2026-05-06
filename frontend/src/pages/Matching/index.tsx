import { useEffect, useState } from "react";
import { usePersonaStore } from "../../store/personaStore";
import { getBrandMatches } from "../../api";
import TrustBadge from "../../components/common/TrustBadge";
import LoadingSpinner from "../../components/common/LoadingSpinner";

interface Category {
  id: string;
  category: string;
  description: string;
  why_fits: string;
  trust_impact: string;
  trust_advice: string;
  budget_range: string;
  collaboration_style: string;
  match_dimensions: { audience_overlap: number; content_fit: number; style_match: number; trust_safety: number };
  match_score: number;
  match_tags: string[];
  ai_persona_note: string;
  contact_status: string;
}

const STATUS: Record<string, { bg: string; border: string; text: string }> = {
  可接触:  { bg: "#D1FAE5", border: "#A7F3D0", text: "#059669" },
  可考虑:  { bg: "#DBEAFE", border: "#BFDBFE", text: "#1D4ED8" },
  建议等待: { bg: "#FEF3C7", border: "#FDE68A", text: "#D97706" },
};

const SCORE_DIMS: { key: keyof Category["match_dimensions"]; label: string }[] = [
  { key: "audience_overlap", label: "受众重合度" },
  { key: "content_fit", label: "内容契合度" },
  { key: "style_match", label: "风格一致性" },
  { key: "trust_safety", label: "信任安全性" },
];

function DimScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? "var(--success)" : score >= 60 ? "var(--blue)" : score >= 40 ? "var(--amber)" : "var(--danger)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{score}%</span>
      </div>
      <div className="progress-bar">
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 2, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

export default function Matching() {
  const { persona } = usePersonaStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");

  const load = (uid: string) => {
    setLoading(true);
    getBrandMatches(uid)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const uid = persona?.user_id || "demo_user_001";
    load(uid);
  }, [persona]);

  if (loading) return <LoadingSpinner text="AI 正在基于你的人设分析最适合的品牌品类..." />;
  if (!data) return null;

  const categories: Category[] = (data.categories || []).filter((c: Category) => !dismissed.has(c.id));
  const notRec: any[] = data.not_recommended || [];
  const capacity = data.commercial_capacity || {};

  return (
    <div style={{ padding: "24px 20px" }}>
      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: "var(--text-primary)", color: "#fff", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 500, zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>品牌匹配</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>KOC ↔ 品牌双向筛选，平台守护你的信任资产</p>
        </div>
        {persona && <TrustBadge score={persona.trust_score} />}
      </div>

      {/* Commercial capacity banner */}
      <div className="card-blue" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <span>💡</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{data.recommendation}</span>
          {capacity.remaining_space > 0 && (
            <span style={{ color: "var(--blue)", fontSize: 13, marginLeft: 8 }}>
              （还剩 {Math.round(capacity.remaining_space * 100)}% 商业空间）
            </span>
          )}
        </div>
        {capacity.remaining_space !== undefined && (
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>商业内容空间</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="progress-bar" style={{ width: 80 }}>
                <div style={{ height: "100%", width: `${Math.round(capacity.remaining_space * 500)}%`, maxWidth: "100%", background: capacity.remaining_space > 0.1 ? "var(--success)" : "var(--amber)", borderRadius: 2, transition: "width 0.8s ease" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: capacity.remaining_space > 0.1 ? "var(--success)" : "var(--amber)" }}>
                {Math.round(capacity.remaining_space * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Category cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
        {categories.map((cat) => {
          const st = STATUS[cat.contact_status] || STATUS["建议等待"];
          const trustColor = cat.trust_impact === "low" ? "var(--success)" : cat.trust_impact === "medium" ? "var(--amber)" : "var(--danger)";
          return (
            <div key={cat.id} className="card hover-lift" style={{ padding: "20px 22px" }}>
              {/* Top row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{cat.category}</h3>
                    <span style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>
                      {cat.collaboration_style}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{cat.description}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 26, fontWeight: 800, color: "var(--blue)", margin: 0, lineHeight: 1 }}>{cat.match_score}%</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>综合匹配</p>
                  </div>
                  <span style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.text, borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {cat.contact_status}
                  </span>
                </div>
              </div>

              {/* 4-dim breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
                {SCORE_DIMS.map((dim) => (
                  <DimScoreBar key={dim.key} label={dim.label} score={cat.match_dimensions[dim.key]} />
                ))}
              </div>

              {/* Match tags */}
              {cat.match_tags.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {cat.match_tags.map((tag, i) => <span key={i} className="badge-blue">{tag}</span>)}
                </div>
              )}

              {/* Why fits */}
              <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 10, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--text-primary)" }}>AI 人设适配：</strong>{cat.ai_persona_note}
                <br />
                <span style={{ color: "var(--text-muted)" }}>匹配理由：</span>{cat.why_fits}
              </div>

              {/* Trust advice */}
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, lineHeight: 1.6 }}>
                <span style={{ color: trustColor, fontWeight: 600 }}>🛡️ 信任保护建议：</span>
                <span style={{ color: "#15803D" }}>{cat.trust_advice}</span>
              </div>

              {/* Bottom row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>💰 参考预算：{cat.budget_range}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      const n = new Set(dismissed); n.add(cat.id); setDismissed(n);
                      setToast("已记录偏好，AI 将推荐其他品类 ✓");
                      setTimeout(() => setToast(""), 3000);
                    }}
                    style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}
                  >
                    不适合我
                  </button>
                  {cat.contact_status === "可接触" && (
                    <button className="btn-primary" style={{ padding: "6px 16px", fontSize: 13 }}>
                      了解合作方向 →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Not recommended */}
      {notRec.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>不建议接触</p>
          {notRec.map((item, i) => (
            <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 8, opacity: 0.65, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)", margin: "0 0 3px" }}>{item.category}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{item.reason}</p>
              </div>
              <span style={{ background: "#FEE2E2", border: "1px solid #FECACA", color: "#DC2626", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>不推荐</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
