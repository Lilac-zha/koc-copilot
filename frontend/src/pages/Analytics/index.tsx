import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePersonaStore } from "../../store/personaStore";
import { getAnalytics } from "../../api";
import TrustBadge from "../../components/common/TrustBadge";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useCountUp } from "../../hooks/useCountUp";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";

interface Analytics {
  trust_score: number;
  trust_level: string;
  commercial_ratio: number;
  evergreen_ratio: number;
  warnings: Array<{ type: string; level: string; message: string }>;
  score_history: Array<{ date: string; score: number }>;
  engagement_trend: Array<{ date: string; rate: number }>;
  follower_trend: Array<{ date: string; count: number }>;
  content_breakdown: { evergreen: number; timely: number; commercial: number };
  persona_version: number;
  flywheel_status: string;
}

const ACTION_PATHS = [
  {
    from: 72,
    to: 81,
    action: "再发 2 篇常青内容",
    detail: "常青内容占比从 58% → 70%，触发健康阈值",
    effort: "低",
    effortColor: "var(--success)",
    icon: "📝",
    link: "/topics",
  },
  {
    from: 81,
    to: 88,
    action: "减少商业内容频率",
    detail: "商业占比控制在 15% 以下，互动率预计+1.2%",
    effort: "中",
    effortColor: "var(--amber)",
    icon: "🛡️",
    link: "/topics",
  },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "8px 12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <p style={{ color: "var(--text-secondary)", fontSize: 11, marginBottom: 4 }}>{label}</p>
      <p style={{ color: "var(--blue)", fontWeight: 700, fontSize: 15, margin: 0 }}>{payload[0].value}</p>
    </div>
  );
};

function AnimatedScore({ score }: { score: number }) {
  const v = useCountUp(score, 1400, 300);
  return <span>{Math.round(v)}</span>;
}

export default function Analytics() {
  const navigate = useNavigate();
  const { persona } = usePersonaStore();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = persona?.user_id || "demo_user_001";
    getAnalytics(uid)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [persona]);

  if (loading) return <LoadingSpinner text="加载信任健康度数据..." />;
  if (!data) return null;

  const total = Object.values(data.content_breakdown).reduce((a, b) => a + b, 0);

  return (
    <div style={{ padding: "24px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>信任健康度仪表盘</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            人设种子 v{data.persona_version} ·{" "}
            <span style={{ color: "var(--success)" }}>飞轮{data.flywheel_status === "active" ? "运转中" : "待激活"}</span>
          </p>
        </div>
        <TrustBadge score={data.trust_score} />
      </div>

      {/* Action path cards */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px" }}>
          AI 为你规划的提升路径
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ACTION_PATHS.map((path, i) => (
            <div
              key={i}
              className="card"
              onClick={() => navigate(path.link)}
              style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", cursor: "pointer" }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{path.icon}</span>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 3px" }}>
                  {path.action}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{path.detail}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--blue)" }}>
                    {path.from} → {path.to}
                  </span>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>健康度变化</p>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 20,
                    background: path.effort === "低" ? "#D1FAE5" : "#FEF3C7",
                    color: path.effortColor,
                    border: `1px solid ${path.effort === "低" ? "#A7F3D0" : "#FDE68A"}`,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  难度{path.effort}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
        {/* Trust score */}
        <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            信任健康度
          </p>
          <p style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, marginBottom: 8, color: "var(--blue)" }}>
            <AnimatedScore score={data.trust_score} />
          </p>
          <TrustBadge score={data.trust_score} />
        </div>

        {/* Content structure */}
        <div className="card" style={{ padding: 18 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
            内容结构
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <RatioRow label="常青内容" count={data.content_breakdown.evergreen} total={total} color="var(--success)" target={70} pct={Math.round((data.content_breakdown.evergreen / total) * 100)} />
            <RatioRow label="即时内容" count={data.content_breakdown.timely} total={total} color="var(--blue)" pct={Math.round((data.content_breakdown.timely / total) * 100)} />
            <RatioRow label="商业内容" count={data.content_breakdown.commercial} total={total} color={data.commercial_ratio > 0.2 ? "var(--danger)" : "var(--amber)"} warn={data.commercial_ratio > 0.2} pct={Math.round((data.content_breakdown.commercial / total) * 100)} />
          </div>
        </div>

        {/* Key metrics */}
        <div className="card" style={{ padding: 18 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
            关键指标
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <MetricRow label="商业内容占比" value={`${(data.commercial_ratio * 100).toFixed(0)}%`} warn={data.commercial_ratio > 0.2} threshold="上限 20%" tip="减少推广类内容频率" />
            <MetricRow label="常青内容占比" value={`${(data.evergreen_ratio * 100).toFixed(0)}%`} warn={data.evergreen_ratio < 0.7} threshold="目标 70%" tip="增加干货类常青内容" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <div className="card" style={{ padding: 18 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>信任健康度趋势</p>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={data.score_history}>
              <defs>
                <linearGradient id="trustGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 100]} tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" stroke="#0EA5E9" strokeWidth={2} fill="url(#trustGrad)" dot={{ r: 3, fill: "#0EA5E9" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>粉丝增长趋势</p>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={data.follower_trend}>
              <defs>
                <linearGradient id="followerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2} fill="url(#followerGrad)" dot={{ r: 3, fill: "#10B981" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function RatioRow({ label, count, total, color, warn = false, pct, target }: any) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: warn ? "var(--danger)" : "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontSize: 12, color: warn ? "var(--danger)" : "var(--text-secondary)" }}>
          {count}篇 · {pct}%{target ? ` / 目标${target}%` : ""}
        </span>
      </div>
      <div className="progress-bar">
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

function MetricRow({ label, value, warn, threshold, tip }: any) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        background: warn ? "#FEF2F2" : "var(--bg)",
        border: `1px solid ${warn ? "#FECACA" : "var(--border)"}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: warn ? 4 : 0 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>{label}</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{threshold}</p>
        </div>
        <p style={{ fontSize: 20, fontWeight: 700, color: warn ? "var(--danger)" : "var(--text-primary)", margin: 0 }}>{value}</p>
      </div>
      {warn && (
        <p style={{ fontSize: 11, color: "var(--danger)", margin: 0 }}>如何改善：{tip}</p>
      )}
    </div>
  );
}
