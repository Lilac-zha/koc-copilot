import { useEffect, useState, useRef } from "react";
import { usePersonaStore } from "../../store/personaStore";
import { getTopicRecommendations, analyzeTopic } from "../../api";
import BlueOceanBadge from "../../components/common/BlueOceanBadge";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ZAxis, Cell,
} from "recharts";

interface ContentAsset {
  structure_template: string;
  cover_style: string;
  bgm_mood: string;
  hashtags: string[];
  best_publish_time: string;
}

interface Topic {
  id: string;
  title: string;
  category: string;
  type: "evergreen" | "timely";
  heat_score: number;
  competition_score: number;
  growth_trend: string;
  blue_ocean_score: number;
  differentiation_reason: string;
  content_asset: ContentAsset;
}

const BubbleTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", maxWidth: 200 }}>
      <p style={{ color: "var(--blue)", fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{d.name}</p>
      <p style={{ color: "var(--text-secondary)", fontSize: 11, margin: 0 }}>蓝海分：<span style={{ color: "var(--blue)", fontWeight: 700 }}>{d.score}</span></p>
      <p style={{ color: "var(--text-secondary)", fontSize: 11, margin: 0 }}>热度：{d.heat} · 竞争：{(d.comp * 100).toFixed(0)}%</p>
    </div>
  );
};

export default function TopicMap() {
  const navigate = useNavigate();
  const { persona } = usePersonaStore();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandHeights, setExpandHeights] = useState<Record<string, number>>({});
  const detailRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Custom topic input
  const [customInput, setCustomInput] = useState("");
  const [customLoading, setCustomLoading] = useState(false);
  const [customResult, setCustomResult] = useState<any>(null);

  useEffect(() => {
    const uid = persona?.user_id || "demo_user_001";
    getTopicRecommendations(uid, 5)
      .then((res) => {
        setTopics(res.data.topics || []);
        setSummary(res.data.summary);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [persona]);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setTimeout(() => {
        const el = detailRefs.current[id];
        if (el) setExpandHeights((h) => ({ ...h, [id]: el.scrollHeight }));
      }, 16);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAnalyzeCustom = async () => {
    if (!customInput.trim()) return;
    setCustomLoading(true);
    setCustomResult(null);
    try {
      const uid = persona?.user_id || "demo_user_001";
      const res = await analyzeTopic(uid, { title: customInput }, "light");
      setCustomResult(res.data);
    } catch {
      setCustomResult({ error: true });
    } finally {
      setCustomLoading(false);
    }
  };

  const handleBatchCreate = () => {
    const firstId = Array.from(selectedIds)[0];
    const firstTopic = topics.find((t) => t.id === firstId);
    if (firstTopic) navigate("/create", { state: { topic: firstTopic } });
  };

  if (loading) return <LoadingSpinner text="AI 正在扫描蓝海选题..." />;

  const topRecommended = topics[0] || null;
  const chartData = topics.map((t) => ({
    x: t.heat_score,
    y: Math.round((1 - t.competition_score) * 100),
    z: Math.max(t.blue_ocean_score * 9, 80),
    score: t.blue_ocean_score,
    name: t.title.slice(0, 16) + (t.title.length > 16 ? "…" : ""),
    id: t.id,
    heat: t.heat_score,
    comp: t.competition_score,
    isBlue: t.blue_ocean_score > 15,
  }));

  return (
    <div style={{ padding: "24px 20px" }}>
      {/* AI推荐做这个 */}
      {topRecommended && (
        <div className="card-blue" style={{ padding: "18px 22px", marginBottom: 16, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 6px" }}>AI 推荐做这个</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px", lineHeight: 1.4 }}>{topRecommended.title}</p>
            <p style={{ fontSize: 12, color: "var(--blue)", margin: "0 0 10px", fontStyle: "italic" }}>{topRecommended.differentiation_reason}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <BlueOceanBadge score={topRecommended.blue_ocean_score} />
              <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>+28% 预估表现提升</span>
            </div>
          </div>
          <button className="btn-amber" onClick={() => navigate("/create", { state: { topic: topRecommended } })} style={{ padding: "11px 22px", fontSize: 14, whiteSpace: "nowrap" }}>
            开始创作 →
          </button>
        </div>
      )}

      {/* Custom topic input */}
      <div className="card" style={{ padding: "14px 18px", marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 0.8 }}>自定义选题分析</p>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="input"
            placeholder="输入你自己的选题想法..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyzeCustom()}
            style={{ flex: 1 }}
          />
          <button
            className="btn-primary"
            onClick={handleAnalyzeCustom}
            disabled={customLoading || !customInput.trim()}
            style={{ padding: "0 18px", fontSize: 13, whiteSpace: "nowrap" }}
          >
            {customLoading ? "分析中..." : "AI 分析这个选题"}
          </button>
        </div>

        {customResult && !customResult.error && (
          <div style={{ marginTop: 14, padding: "14px 16px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>{customInput}</p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{customResult.cover_style}</p>
              </div>
              <button className="btn-primary" onClick={() => navigate("/create", { state: { topic: { title: customInput, content_asset: { hashtags: customResult.hashtags, bgm_mood: customResult.bgm_mood, best_publish_time: customResult.best_publish_time, cover_style: customResult.cover_style } } } })} style={{ padding: "7px 16px", fontSize: 12, whiteSpace: "nowrap" }}>
                用这个选题创作 →
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {(customResult.hashtags || []).map((t: string) => (
                <span key={t} className="badge-blue">{t}</span>
              ))}
              {customResult.best_publish_time && (
                <span className="badge-amber" style={{ background: "#FFFBEB", color: "var(--amber)", border: "1px solid #FDE68A", padding: "2px 8px", borderRadius: 20, fontSize: 11 }}>
                  ⏰ {customResult.best_publish_time}
                </span>
              )}
            </div>
          </div>
        )}
        {customResult?.error && (
          <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 8, marginBottom: 0 }}>分析失败，请检查后端是否运行</p>
        )}
      </div>

      {/* Strategy banner */}
      {summary && (
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>💡</span>
          <span><strong style={{ color: "var(--blue)" }}>本期策略：</strong>{summary.recommended_mix}</span>
          <span style={{ background: "#D1FAE5", border: "1px solid #A7F3D0", color: "#059669", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, marginLeft: "auto", whiteSpace: "nowrap" }}>
            蓝海选题 {summary.total_blue_ocean} 个
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
        {/* Bubble chart */}
        <div className="card" style={{ padding: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>蓝海分析图</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 14px" }}>气泡大=蓝海分高</p>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="x" name="热度" domain={[0, 100]} label={{ value: "热度", position: "bottom", fill: "#94A3B8", fontSize: 11 }} tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
              <YAxis dataKey="y" name="低竞争" domain={[0, 100]} label={{ value: "低竞争", angle: -90, position: "insideLeft", fill: "#94A3B8", fontSize: 11 }} tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
              <ZAxis dataKey="z" range={[80, 700]} />
              <Tooltip content={<BubbleTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "#BFDBFE" }} />
              <Scatter data={chartData} onClick={(d: any) => toggleExpand(d.id)}>
                {chartData.map((entry) => (
                  <Cell key={entry.id} fill={entry.isBlue ? "rgba(14,165,233,0.3)" : "rgba(148,163,184,0.2)"} stroke={entry.isBlue ? "#0EA5E9" : "#94A3B8"} strokeWidth={entry.isBlue ? 1.5 : 1} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 6 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-secondary)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(14,165,233,0.4)", border: "1.5px solid #0EA5E9", display: "inline-block" }} />蓝海机会
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-secondary)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(148,163,184,0.4)", border: "1px solid #94A3B8", display: "inline-block" }} />红海竞争
            </span>
          </div>
        </div>

        {/* Topic list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 520, overflowY: "auto" }}>
          {topics.map((topic, idx) => {
            const isExpanded = expandedId === topic.id;
            const isSelected = selectedIds.has(topic.id);
            const isTop = idx === 0;
            return (
              <div
                key={topic.id}
                className="card"
                style={{ borderRadius: 12, overflow: "hidden", transition: "all 0.2s ease", border: isSelected ? "2px solid #0EA5E9" : isExpanded ? "1.5px solid var(--blue)" : isTop ? "1.5px solid #BFDBFE" : "1px solid var(--border)", boxShadow: isSelected ? "0 0 0 3px rgba(14,165,233,0.1)" : "none" }}
              >
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {/* Checkbox */}
                  <div
                    onClick={(e) => toggleSelect(topic.id, e)}
                    style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${isSelected ? "#0EA5E9" : "#D1D5DB"}`, background: isSelected ? "#0EA5E9" : "transparent", flexShrink: 0, marginTop: 2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", transition: "all 0.15s" }}
                  >
                    {isSelected && "✓"}
                  </div>

                  {/* Card content */}
                  <button
                    onClick={() => toggleExpand(topic.id)}
                    style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        {isTop && <span style={{ fontSize: 10, background: "var(--blue)", color: "#fff", padding: "1px 7px", borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>AI强推</span>}
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0, lineHeight: 1.4 }}>{topic.title}</p>
                      </div>
                      <p style={{ fontSize: 11, color: "var(--blue)", margin: 0, fontStyle: "italic" }}>{topic.differentiation_reason}</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                      <BlueOceanBadge score={topic.blue_ocean_score} />
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: topic.type === "evergreen" ? "#D1FAE5" : "#FEF3C7", color: topic.type === "evergreen" ? "#059669" : "#D97706", border: `1px solid ${topic.type === "evergreen" ? "#A7F3D0" : "#FDE68A"}` }}>
                        {topic.type === "evergreen" ? "常青" : "即时"}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Expanded detail */}
                <div ref={(el) => { detailRefs.current[topic.id] = el; }} style={{ maxHeight: isExpanded ? (expandHeights[topic.id] || 500) : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}>
                  <div style={{ padding: "0 16px 16px 46px", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <DetailItem icon="①" label="内容结构" value={topic.content_asset.structure_template} />
                      <DetailItem icon="②" label="发布时间" value={topic.content_asset.best_publish_time} />
                    </div>
                    <DetailItem icon="③" label="封面风格" value={topic.content_asset.cover_style} />
                    <div style={{ marginTop: 10, marginBottom: 12 }}>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 5px" }}>④ 话题标签</p>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {topic.content_asset.hashtags.map((tag) => <span key={tag} className="badge-blue">{tag}</span>)}
                      </div>
                    </div>
                    <button className="btn-primary" onClick={() => navigate("/create", { state: { topic } })} style={{ width: "100%", padding: "9px 0", fontSize: 13 }}>
                      用这个选题开始创作 →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom multi-select action bar */}
      {selectedIds.size > 0 && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--text-primary)", color: "#fff", borderRadius: 14, padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", zIndex: 100, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>已选 <strong>{selectedIds.size}</strong> 个选题</span>
          <button onClick={handleBatchCreate} style={{ background: "var(--amber)", border: "none", color: "#fff", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            批量加入创作计划 →
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}>
            取消
          </button>
        </div>
      )}
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 3px" }}>{icon} {label}</p>
      <p style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.5, margin: 0 }}>{value}</p>
    </div>
  );
}
