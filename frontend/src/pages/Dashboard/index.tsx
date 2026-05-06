import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePersonaStore } from "../../store/personaStore";
import { getDemo, getTopicRecommendations } from "../../api";
import TrustBadge from "../../components/common/TrustBadge";
import { useCountUp } from "../../hooks/useCountUp";

const GROWTH_LABEL: Record<string, string> = {
  growth: "成长期", plateau: "停滞期", declining: "下滑期",
};

// ── A区：AI决策卡 ────────────────────────────────────────
function AIDecisionCard({ persona, topTopic, onStart, onViewAll }: { persona: any; topTopic: any; onStart: () => void; onViewAll: () => void }) {
  const urgency = persona.evergreen_ratio < 0.7
    ? `你已连续多日未发常青内容，账号搜索流量增长放缓，常青占比仅 ${Math.round(persona.evergreen_ratio * 100)}%（目标 70%）`
    : persona.commercial_ratio > 0.15
    ? `商业内容占比 ${Math.round(persona.commercial_ratio * 100)}%，接近 20% 预警线，信任资产开始折旧`
    : `账号处于${GROWTH_LABEL[persona.growth_stage]}，互动率 ${(persona.avg_engagement_rate * 100).toFixed(1)}% 有提升空间`;

  const projectedScore = Math.min(100, Math.round(persona.trust_score + 8.5));
  const recommendedTitle = topTopic?.title || "加载推荐选题中...";

  return (
    <div
      className="card-blue"
      style={{ padding: "22px 24px", marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap" }}
    >
      {/* Left content */}
      <div style={{ flex: 1, minWidth: 240 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px" }}>
          AI 为你制定了本周策略
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* 现状判断 */}
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>📌</span>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 2px" }}>现状判断</p>
              <p style={{ fontSize: 13, color: "var(--text-primary)", margin: 0, lineHeight: 1.5 }}>{urgency}</p>
            </div>
          </div>

          {/* 本周行动 */}
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🎯</span>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 2px" }}>本周行动</p>
              <p style={{ fontSize: 13, color: "var(--text-primary)", margin: "0 0 4px", lineHeight: 1.5 }}>
                建议发布：<strong>2篇常青 + 1篇热点</strong>
              </p>
              <p style={{ fontSize: 12, color: "var(--blue)", margin: 0 }}>
                优先选题：「{recommendedTitle}」
              </p>
            </div>
          </div>

          {/* 预期收益 */}
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>📈</span>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 2px" }}>预期收益</p>
              <p style={{ fontSize: 13, color: "var(--text-primary)", margin: 0 }}>
                完成后预计：信任健康度{" "}
                <strong style={{ color: "var(--blue)" }}>{Math.round(persona.trust_score)} → {projectedScore}</strong>
                ，搜索曝光 +35%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right CTA */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <button
          className="btn-amber"
          onClick={onStart}
          style={{ padding: "12px 24px", fontSize: 14, whiteSpace: "nowrap" }}
        >
          开始这个选题 →
        </button>
        <button
          onClick={onViewAll}
          style={{
            background: "none",
            border: "none",
            color: "var(--blue)",
            fontSize: 12,
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          查看全部推荐 →
        </button>
      </div>
    </div>
  );
}

// ── B区：数据快照 ────────────────────────────────────────
function DataSnapshot({ persona }: { persona: any }) {
  const follower = useCountUp(persona.follower_count, 1200, 200);
  const engRate  = useCountUp(persona.avg_engagement_rate * 100, 1200, 250);
  const trust    = useCountUp(persona.trust_score, 1200, 300);
  const evergreen= useCountUp(persona.evergreen_ratio * 100, 1200, 350);

  const metrics = [
    {
      label: "粉丝数",
      value: Math.round(follower).toLocaleString(),
      unit: "",
      trend: "↑12",
      trendColor: "var(--success)",
      note: "较上周增加12位新粉丝",
    },
    {
      label: "互动率",
      value: engRate.toFixed(1),
      unit: "%",
      trend: "→ 持平",
      trendColor: "var(--text-muted)",
      note: "行业均值约3.2%，当前表现良好",
    },
    {
      label: "健康度",
      value: trust,
      unit: "",
      isScore: true,
      score: persona.trust_score,
      trend: persona.trust_score >= 80 ? "↑" : "⚠",
      trendColor: persona.trust_score >= 60 ? "var(--warning)" : "var(--danger)",
      note: persona.trust_score < 80 ? "低于健康线，建议增加常青内容" : "账号状态健康",
    },
    {
      label: "常青占比",
      value: Math.round(evergreen),
      unit: "%",
      trend: "↓ 低于目标",
      trendColor: "var(--danger)",
      note: `当前${Math.round(persona.evergreen_ratio * 100)}%，目标70%，差距${70 - Math.round(persona.evergreen_ratio * 100)}%`,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
        marginBottom: 16,
      }}
    >
      {metrics.map((m) => (
        <div
          key={m.label}
          className="card hover-lift"
          style={{ padding: "16px 18px" }}
        >
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 6px", fontWeight: 500 }}>
            {m.label}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
            {m.isScore ? (
              <TrustBadge score={m.score} showLabel={false} />
            ) : (
              <span style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                {m.value}
                <span style={{ fontSize: 14, fontWeight: 500 }}>{m.unit}</span>
              </span>
            )}
            <span style={{ fontSize: 12, fontWeight: 600, color: m.trendColor }}>
              {m.trend}
            </span>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
            {m.note}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── C区：可折叠人设档案 ──────────────────────────────────
function PersonaCard({ persona }: { persona: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            你的人设档案
          </span>
          <span
            style={{
              fontSize: 11,
              background: "var(--blue-light)",
              color: "var(--blue-dark)",
              border: "1px solid #BAE6FD",
              borderRadius: 20,
              padding: "1px 8px",
              fontWeight: 600,
            }}
          >
            人设种子 v{persona.version}
          </span>
          <span
            style={{
              fontSize: 11,
              background: "#F0FDF4",
              color: "#15803D",
              border: "1px solid #BBF7D0",
              borderRadius: 20,
              padding: "1px 8px",
            }}
          >
            {persona.platform} · {GROWTH_LABEL[persona.growth_stage]}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={(e) => { e.stopPropagation(); }}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              borderRadius: 6,
              padding: "3px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            编辑
          </button>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {expanded ? "收起 ∧" : "展开 ∨"}
          </span>
        </div>
      </div>

      {/* Expanded content */}
      <div
        style={{
          maxHeight: expanded ? 400 : 0,
          overflow: "hidden",
          transition: "max-height 0.3s ease",
        }}
      >
        <div
          style={{
            padding: "0 18px 18px",
            borderTop: "1px solid var(--border)",
            paddingTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          {persona.analysis_summary && (
            <div style={{ gridColumn: "1 / -1", background: "var(--blue-light)", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 14px" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--blue)", margin: "0 0 4px" }}>AI 眼中的你</p>
              <p style={{ fontSize: 13, color: "var(--text-primary)", margin: 0, lineHeight: 1.6 }}>{persona.analysis_summary}</p>
            </div>
          )}
          <InfoItem label="内容垂类" value={persona.niche} />
          <InfoItem label="语言风格" value={persona.tone} />
          <InfoItem label="目标受众" value={persona.target_audience} />
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>
              核心价值观
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {persona.values.map((v: string) => (
                <span key={v} className="badge-blue">{v}</span>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>
              内容优势
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {persona.content_strengths.map((s: string) => (
                <span key={s} className="badge-gray">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 4px" }}>
        {label}
      </p>
      <p style={{ fontSize: 13, color: "var(--text-primary)", margin: 0, lineHeight: 1.5 }}>{value}</p>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { persona, setPersona } = usePersonaStore();
  const [loading, setLoading] = useState(!persona);
  const [topTopic, setTopTopic] = useState<any>(null);

  useEffect(() => {
    if (!persona) {
      getDemo()
        .then((r) => setPersona(r.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [persona, setPersona]);

  useEffect(() => {
    if (!persona) return;
    const uid = persona.user_id || "demo_user_001";
    getTopicRecommendations(uid, 3)
      .then((r) => {
        const topics = r.data?.topics || [];
        if (topics.length > 0) setTopTopic(topics[0]);
      })
      .catch(() => {});
  }, [persona]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!persona) return null;

  const handleStart = () => {
    const topic = topTopic || {
      title: "入职3年，我终于搞明白为什么同事升职比我快",
      blue_ocean_score: 72.8,
      content_asset: {
        hashtags: ["#职场成长", "#职场思维", "#升职", "#打工人"],
        best_publish_time: "周日晚 21:00-22:00",
      },
    };
    navigate("/create", { state: { topic } });
  };

  return (
    <div style={{ padding: "24px 20px" }}>
      {/* A区 */}
      <AIDecisionCard
        persona={persona}
        topTopic={topTopic}
        onViewAll={() => navigate("/topics")}
        onStart={handleStart}
      />

      {/* B区 */}
      <DataSnapshot persona={persona} />

      {/* C区 */}
      <PersonaCard persona={persona} />
    </div>
  );
}
