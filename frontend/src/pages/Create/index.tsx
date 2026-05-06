/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePersonaStore } from "../../store/personaStore";
import { generateContent, refineContent } from "../../api";

type Mode = "light" | "medium" | "deep";

const MODES: { key: Mode; label: string; desc: string; color: string; bg: string; icon: string }[] = [
  { key: "light", label: "轻模式", desc: "完整草稿，直接发布", color: "#16A34A", bg: "#F0FDF4", icon: "⚡" },
  { key: "medium", label: "中模式", desc: "结构+要点，你来主导", color: "#0EA5E9", bg: "#EFF6FF", icon: "✏️" },
  { key: "deep", label: "深模式", desc: "角度分析，打造爆款", color: "#D97706", bg: "#FFFBEB", icon: "🔬" },
];

const REFINE_BUBBLES = [
  "帮我展开成完整视频文案",
  "把这个改成小红书图文版",
  "语气改得更幽默一点",
  "帮我加一个数据支撑",
  "结尾的互动问题换一个",
  "按照深模式角度1继续生成完整内容",
];

function RegenButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 4, opacity: loading ? 0.5 : 1, whiteSpace: "nowrap" }}>
      {loading ? "..." : "↻ 重新生成"}
    </button>
  );
}

function FadeBlock({ visible, delay, children }: { visible: boolean; delay: number; children: React.ReactNode }) {
  return (
    <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(10px)", transition: `opacity 0.35s ease ${delay}ms, transform 0.35s ease ${delay}ms`, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function AssetPackCard({ assetPack, copiedTag, copyTag }: { assetPack: any; copiedTag: string | null; copyTag: (t: string) => void }) {
  if (!assetPack) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 6px", fontWeight: 600 }}>🖼️ 封面风格</p>
        <p style={{ fontSize: 13, color: "var(--text-primary)", margin: 0, lineHeight: 1.5 }}>{assetPack.cover_style}</p>
      </div>
      <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "12px 14px" }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 6px", fontWeight: 600 }}>⏰ 最佳发布时间</p>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#D97706", margin: 0 }}>{assetPack.best_publish_time}</p>
      </div>
      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 6px", fontWeight: 600 }}>🎵 BGM 情绪</p>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{assetPack.bgm_mood}</p>
      </div>
      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 8px", fontWeight: 600 }}># 话题标签</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {(assetPack.tags || []).map((tag: string) => (
            <button key={tag} onClick={() => copyTag(tag)} className="badge-blue" style={{ cursor: "pointer", background: copiedTag === tag ? "#D1FAE5" : undefined, color: copiedTag === tag ? "#059669" : undefined }}>
              {copiedTag === tag ? "✓ 已复制" : tag}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 5, marginBottom: 0 }}>点击标签复制</p>
      </div>
    </div>
  );
}

function ConsistencyPanel({ personaCheck }: { personaCheck: any }) {
  if (!personaCheck) return null;
  const score = personaCheck.consistency_score || 87;
  const color = score >= 80 ? "#16A34A" : score >= 60 ? "#D97706" : "#DC2626";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>与你账号定位契合度</span>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>{score}%</span>
      </div>
      <div className="progress-bar" style={{ marginBottom: 10 }}>
        <div className="progress-fill" style={{ width: `${score}%`, background: color, transition: "width 1s ease" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(personaCheck.match_points || []).map((p: string, i: number) => (
          <div key={i} style={{ display: "flex", gap: 8, padding: "6px 10px", borderRadius: 6, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <span style={{ fontSize: 12, color: "#15803D" }}>✓</span>
            <span style={{ fontSize: 12, color: "#15803D" }}>{p}</span>
          </div>
        ))}
        {personaCheck.risk_note && (
          <div style={{ display: "flex", gap: 8, padding: "6px 10px", borderRadius: 6, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <span style={{ fontSize: 12, color: "#92400E" }}>⚠</span>
            <span style={{ fontSize: 12, color: "#92400E" }}>{personaCheck.risk_note}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Light Mode ──────────────────────────────────────────────────────────────
function LightOutput({ result, onRegen, loading, copiedTag, copyTag }: any) {
  const [selIdx, setSelIdx] = useState(0);
  const titleOptions: any[] = result.title_options || [];
  const blocks = result.content_blocks || {};
  const [hook, setHook] = useState(blocks.hook || "");
  const [body, setBody] = useState(blocks.body || "");
  const [ending, setEnding] = useState(blocks.ending || "");

  // Sync state when result changes (e.g., after refine or regen)
  useEffect(() => {
    const b = result.content_blocks || {};
    setHook(b.hook || "");
    setBody(b.body || "");
    setEnding(b.ending || "");
    setSelIdx(0);
  }, [result]);

  const fullText = `${titleOptions[selIdx]?.title || ""}\n\n${hook}\n\n${body}\n\n${ending}`;

  return (
    <>
      <div className="card" style={{ padding: "20px 22px", border: "1.5px solid #BBF7D0", background: "#F0FDF4", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", textTransform: "uppercase", letterSpacing: 1 }}>✅ 内容草稿 — 可直接发布</span>
          <RegenButton onClick={onRegen} loading={loading} />
        </div>

        {/* Title selector */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#15803D", margin: "0 0 8px" }}>选择标题</p>
          {titleOptions.map((t: any, i: number) => (
            <div key={i} onClick={() => setSelIdx(i)} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${selIdx === i ? "#16A34A" : "#D1D5DB"}`, background: selIdx === i ? "#DCFCE7" : "#fff", cursor: "pointer", marginBottom: 6, transition: "all 0.15s" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${selIdx === i ? "#16A34A" : "#9CA3AF"}`, background: selIdx === i ? "#16A34A" : "transparent", flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: selIdx === i ? "#15803D" : "var(--text-primary)", margin: 0, fontWeight: selIdx === i ? 600 : 400 }}>{t.title}</p>
                <p style={{ fontSize: 11, color: "#6B7280", margin: "2px 0 0" }}>{t.style} · {t.reason}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Unified editable draft */}
        <div style={{ background: "#fff", border: "1px solid #BBF7D0", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#15803D", margin: "0 0 10px" }}>📄 正文全文（可直接编辑）</p>
          {[
            { label: "开场钩子", val: hook, set: setHook, rows: 3 },
            { label: "核心内容", val: body, set: setBody, rows: 7 },
            { label: "结尾引导", val: ending, set: setEnding, rows: 2 },
          ].map(({ label, val, set, rows }) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: "#6B7280", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</p>
              <textarea className="textarea" value={val} onChange={(e) => set(e.target.value)} rows={rows} style={{ width: "100%", resize: "vertical", fontSize: 13, lineHeight: 1.7, background: "#F9FAFB" }} />
            </div>
          ))}
        </div>
        <button className="btn-primary" onClick={() => navigator.clipboard.writeText(fullText)} style={{ width: "100%", padding: "12px 0", fontSize: 14, background: "#16A34A", borderColor: "#16A34A" }}>
          一键复制全文 →
        </button>
      </div>

      {/* Asset + consistency */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div className="card" style={{ padding: "14px 16px" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 10px" }}>📦 发布资产包</p>
          <AssetPackCard assetPack={result.asset_pack} copiedTag={copiedTag} copyTag={copyTag} />
        </div>
        <div className="card" style={{ padding: "14px 16px" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 10px" }}>🛡️ 内容契合度</p>
          <ConsistencyPanel personaCheck={result.persona_check} />
          {result.asset_pack?.interaction_guide && (
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>💬 {result.asset_pack.interaction_guide}</p>
          )}
        </div>
      </div>
    </>
  );
}

// ── Medium Mode ─────────────────────────────────────────────────────────────
function MediumOutput({ result, onRegen, loading, copiedTag, copyTag }: any) {
  const [selIdx, setSelIdx] = useState(0);
  const titleOptions: any[] = result.title_options || [];
  const fw = result.content_framework || {};

  useEffect(() => { setSelIdx(0); }, [result]);

  return (
    <>
      {/* Title block */}
      <div className="card" style={{ padding: "18px 20px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>① 选择标题方向</span>
          <RegenButton onClick={onRegen} loading={loading} />
        </div>
        {titleOptions.map((t: any, i: number) => (
          <div key={i} onClick={() => setSelIdx(i)} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${selIdx === i ? "#0EA5E9" : "var(--border)"}`, background: selIdx === i ? "#EFF6FF" : "var(--bg)", cursor: "pointer", marginBottom: 8, transition: "all 0.15s", boxShadow: selIdx === i ? "0 0 0 3px rgba(14,165,233,0.08)" : "none" }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selIdx === i ? "#0EA5E9" : "var(--border)"}`, background: selIdx === i ? "#0EA5E9" : "transparent", flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: selIdx === i ? "#0284C7" : "var(--text-primary)", margin: 0, fontWeight: selIdx === i ? 600 : 400 }}>{t.title}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "3px 0 0", lineHeight: 1.4 }}>角度：{t.angle} · {t.click_reason}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Structure block */}
      <div className="card" style={{ padding: "18px 20px", marginBottom: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>② 内容框架（AI 给方向，你来填充）</p>

        {fw.recommended_structure && (
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#0EA5E9", margin: "0 0 4px" }}>推荐结构：{fw.recommended_structure}</p>
            <p style={{ fontSize: 12, color: "#1E40AF", margin: 0, lineHeight: 1.6 }}>{fw.structure_reason}</p>
          </div>
        )}

        {fw.opening_options?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 8px" }}>🪝 开场方式</p>
            {fw.opening_options.map((o: any, i: number) => (
              <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 3px" }}>{o.option} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>({o.emotion})</span></p>
                <p style={{ fontSize: 12, color: "#0EA5E9", margin: 0, fontStyle: "italic" }}>示例：「{o.example}」</p>
              </div>
            ))}
            <textarea className="textarea" placeholder="根据上面的方向，写下你的开场..." rows={3} style={{ width: "100%", resize: "vertical", fontSize: 13, lineHeight: 1.7, marginTop: 4 }} />
          </div>
        )}

        {fw.key_points?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 8px" }}>⚡ 核心论点</p>
            {fw.key_points.map((kp: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: 10, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0EA5E9", flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>{kp.point}</p>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 4px" }}>切入角度：{kp.support_angle}</p>
                  <p style={{ fontSize: 11, color: "#0EA5E9", margin: 0 }}>💡 {kp.tip}</p>
                </div>
              </div>
            ))}
            <textarea className="textarea" placeholder="用你的语言和真实经历，展开以上论点..." rows={5} style={{ width: "100%", resize: "vertical", fontSize: 13, lineHeight: 1.7, marginTop: 4 }} />
          </div>
        )}

        {fw.ending_design?.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 8px" }}>🔄 结尾设计</p>
            {fw.ending_design.map((e: any, i: number) => (
              <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 3px" }}>{e.option}</p>
                <p style={{ fontSize: 12, color: "#0EA5E9", margin: 0 }}>💬 互动问题：「{e.interaction_question}」</p>
              </div>
            ))}
            <textarea className="textarea" placeholder="写下你的结尾和互动引导..." rows={2} style={{ width: "100%", resize: "vertical", fontSize: 13, lineHeight: 1.7, marginTop: 4 }} />
          </div>
        )}
      </div>

      <div className="card" style={{ padding: "18px 20px", marginBottom: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 14px" }}>③ 发布资产包</p>
        <AssetPackCard assetPack={result.asset_pack} copiedTag={copiedTag} copyTag={copyTag} />
      </div>

      <div className="card" style={{ padding: "18px 20px", marginBottom: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 14px" }}>④ 内容一致性检查</p>
        <ConsistencyPanel personaCheck={result.persona_check} />
      </div>
    </>
  );
}

// ── Deep Mode ───────────────────────────────────────────────────────────────
function DeepOutput({ result, onRegen, loading, copiedTag, copyTag }: any) {
  const ma = result.market_analysis || {};
  const angles: any[] = result.differentiation_angles || [];
  const rec = result.recommended_angle || {};

  const viralColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    high: { bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C", badge: "#EA580C" },
    medium: { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", badge: "#D97706" },
    stable: { bg: "#FEF9C3", border: "#FEF08A", text: "#713F12", badge: "#CA8A04" },
  };
  const viralLabel: Record<string, string> = { high: "高 🔥", medium: "中 ✨", stable: "稳定 📈" };

  return (
    <>
      {ma.mainstream_content && (
        <FadeBlock visible delay={0}>
          <div className="card" style={{ padding: "18px 20px", border: "1.5px solid #FDE68A", background: "#FFFBEB" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#D97706", textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>🔬 市场分析 — 同类内容盲区</p>
              <RegenButton onClick={onRegen} loading={loading} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#92400E", margin: "0 0 6px" }}>市场主流内容</p>
                {ma.mainstream_content.map((s: string, i: number) => (
                  <p key={i} style={{ fontSize: 12, color: "#92400E", margin: "0 0 4px", paddingLeft: 12, borderLeft: "2px solid #FDE68A", lineHeight: 1.5 }}>{s}</p>
                ))}
              </div>
              {ma.audience_real_need && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#92400E", margin: "0 0 6px" }}>受众真实需求</p>
                  {[
                    ["表面需求", ma.audience_real_need.surface_need],
                    ["深层需求", ma.audience_real_need.deep_need],
                    ["情绪诉求", ma.audience_real_need.emotional_need],
                  ].map(([label, val]) => (
                    <div key={label} style={{ marginBottom: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#D97706" }}>{label}：</span>
                      <span style={{ fontSize: 11, color: "#92400E" }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {ma.homogenization_problem && (
              <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#92400E", margin: "0 0 4px" }}>同质化核心问题</p>
                <p style={{ fontSize: 12, color: "#92400E", margin: 0, lineHeight: 1.6 }}>{ma.homogenization_problem}</p>
              </div>
            )}
          </div>
        </FadeBlock>
      )}

      {angles.map((angle: any, i: number) => {
        const c = viralColors[angle.viral_potential] || viralColors.stable;
        const isRec = rec.choice === angle.rank;
        return (
          <FadeBlock key={i} visible delay={100 + i * 100}>
            <div style={{ background: c.bg, border: `${isRec ? "2px" : "1.5px"} solid ${isRec ? c.badge : c.border}`, borderRadius: 14, padding: "18px 20px", boxShadow: isRec ? `0 0 0 3px ${c.badge}20` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ background: c.badge, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>角度 {angle.rank}</span>
                <span style={{ fontSize: 11, background: "#fff", border: `1px solid ${c.border}`, color: c.badge, padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>爆款概率：{viralLabel[angle.viral_potential] || "—"}</span>
                {isRec && <span style={{ fontSize: 11, background: c.badge, color: "#fff", padding: "2px 8px", borderRadius: 12, fontWeight: 700 }}>★ AI 推荐</span>}
              </div>

              <p style={{ fontSize: 14, fontWeight: 700, color: c.text, margin: "0 0 6px" }}>{angle.angle_name}</p>
              <p style={{ fontSize: 12, color: c.text, margin: "0 0 12px", lineHeight: 1.6, opacity: 0.85 }}>{angle.core_idea}</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  ["差异化原因", angle.why_different],
                  ["与账号定位匹配", angle.why_fits_persona],
                  ["爆款概率依据", angle.viral_reason],
                  ["潜在风险", angle.risk],
                ].map(([label, val]) => val && (
                  <div key={label} style={{ background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "8px 10px" }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: c.badge, margin: "0 0 3px" }}>{label}</p>
                    <p style={{ fontSize: 11, color: c.text, margin: 0, lineHeight: 1.5 }}>{val}</p>
                  </div>
                ))}
              </div>

              {angle.opening_example && (
                <div style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: c.badge, margin: "0 0 4px" }}>💡 开场示例句（可直接用）</p>
                  <p style={{ fontSize: 13, color: c.text, margin: 0, lineHeight: 1.7, fontStyle: "italic" }}>「{angle.opening_example}」</p>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 11, background: "#fff", border: `1px solid ${c.border}`, color: c.text, padding: "3px 10px", borderRadius: 20 }}>📐 {angle.content_structure}</span>
                <span style={{ fontSize: 11, background: "#fff", border: `1px solid ${c.border}`, color: c.text, padding: "3px 10px", borderRadius: 20 }}>📱 {angle.best_format}</span>
                <button onClick={() => navigator.clipboard.writeText(`角度${angle.rank}: ${angle.angle_name}\n${angle.core_idea}\n开场: ${angle.opening_example}`)} style={{ marginLeft: "auto", background: "none", border: `1px solid ${c.border}`, color: c.badge, borderRadius: 8, padding: "5px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                  复制此角度 →
                </button>
              </div>
            </div>
          </FadeBlock>
        );
      })}

      {rec.reason && (
        <FadeBlock visible delay={500}>
          <div className="card" style={{ padding: "16px 20px", border: "1.5px solid #FDE68A", marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#D97706", margin: "0 0 8px" }}>⭐ AI 综合推荐：选择角度 {rec.choice}</p>
            <p style={{ fontSize: 12, color: "#92400E", margin: "0 0 8px", lineHeight: 1.6 }}>{rec.reason}</p>
            {rec.execution_tip && (
              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 12px" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#92400E", margin: "0 0 4px" }}>执行注意事项</p>
                <p style={{ fontSize: 12, color: "#92400E", margin: 0, lineHeight: 1.6 }}>{rec.execution_tip}</p>
              </div>
            )}
          </div>
        </FadeBlock>
      )}

      <FadeBlock visible delay={600}>
        <div className="card" style={{ padding: "16px 20px", marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>📦 发布资产包（基于推荐角度）</p>
          <AssetPackCard assetPack={result.asset_pack} copiedTag={copiedTag} copyTag={copyTag} />
        </div>
      </FadeBlock>
    </>
  );
}

// ── Refine Video Script Output ───────────────────────────────────────────────
function VideoScriptOutput({ script }: { script: any }) {
  if (!script) return null;
  return (
    <div style={{ background: "#F5F3FF", border: "1.5px solid #C4B5FD", borderRadius: 12, padding: "18px 20px", marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: 1 }}>🎬 视频文案脚本</span>
        <span style={{ fontSize: 11, background: "#EDE9FE", color: "#7C3AED", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>预计 {script.duration_estimate}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {(script.scenes || []).map((scene: any) => (
          <div key={scene.scene_no} style={{ background: "#fff", border: "1px solid #C4B5FD", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, background: "#7C3AED", color: "#fff", padding: "2px 8px", borderRadius: 10 }}>Scene {scene.scene_no}</span>
              <span style={{ fontSize: 11, color: "#7C3AED" }}>{scene.duration}</span>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 3px" }}>🖼️ 画面：{scene.visual}</p>
            <p style={{ fontSize: 12, color: "var(--text-primary)", margin: "0 0 3px", lineHeight: 1.6 }}>🎙️ 口播：{scene.narration}</p>
            {scene.subtitle && <p style={{ fontSize: 11, color: "#7C3AED", margin: 0 }}>字幕：{scene.subtitle}</p>}
          </div>
        ))}
      </div>
      {script.bgm_suggestion && <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 4px" }}>🎵 配乐：{script.bgm_suggestion}</p>}
      {script.shooting_tips && <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>📷 拍摄建议：{script.shooting_tips}</p>}
    </div>
  );
}

// ── Refine Panel ─────────────────────────────────────────────────────────────
function RefinePanel({
  mode,
  topicTitle,
  currentResult,
  uid,
  versions,
  currentVersionIdx,
  onVersionSelect,
  onNewVersion,
}: {
  mode: Mode;
  topicTitle: string;
  currentResult: any;
  uid: string;
  versions: any[];
  currentVersionIdx: number;
  onVersionSelect: (idx: number) => void;
  onNewVersion: (refined: any) => void;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doRefine = async (instruction: string) => {
    if (!instruction.trim() || loading) return;
    setLoading(true);
    setError("");
    setInput("");
    try {
      const res = await refineContent(uid, topicTitle, currentResult, instruction, mode);
      onNewVersion(res.data);
    } catch {
      setError("追加指令执行失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: "18px 20px", marginBottom: 12, border: "1.5px solid #E0E7FF", background: "#F5F3FF20" }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#6D28D9", margin: "0 0 12px" }}>✨ 追加指令 — 迭代优化内容</p>

      {/* Version tabs */}
      {versions.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {versions.map((_, i) => (
            <button key={i} onClick={() => onVersionSelect(i)} style={{ padding: "4px 12px", borderRadius: 16, border: `1.5px solid ${i === currentVersionIdx ? "#7C3AED" : "var(--border)"}`, background: i === currentVersionIdx ? "#EDE9FE" : "var(--bg)", color: i === currentVersionIdx ? "#7C3AED" : "var(--text-secondary)", fontSize: 11, fontWeight: i === currentVersionIdx ? 700 : 400, cursor: "pointer" }}>
              {i === 0 ? "原始版本" : `迭代 ${i}`}
              {i === currentVersionIdx && " ●"}
            </button>
          ))}
          <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center" }}>（最多保留3个版本）</span>
        </div>
      )}

      {/* Version change summary */}
      {versions[currentVersionIdx]?.change_summary && currentVersionIdx > 0 && (
        <div style={{ background: "#EDE9FE", border: "1px solid #C4B5FD", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: "#7C3AED", fontWeight: 600 }}>本次改动：</span>
          <span style={{ fontSize: 11, color: "#6D28D9" }}>{versions[currentVersionIdx].change_summary}</span>
        </div>
      )}

      {/* Quick bubbles */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {REFINE_BUBBLES.map((b) => (
          <button key={b} onClick={() => doRefine(b)} disabled={loading} style={{ background: "#fff", border: "1px solid #C4B5FD", color: "#7C3AED", borderRadius: 16, padding: "5px 12px", fontSize: 11, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s", opacity: loading ? 0.5 : 1, whiteSpace: "nowrap" }}>
            {b}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doRefine(input)}
          placeholder="告诉AI你想调整的方向..."
          disabled={loading}
          style={{ flex: 1, border: "1px solid #C4B5FD", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", color: "var(--text-primary)", background: "#fff" }}
        />
        <button onClick={() => doRefine(input)} disabled={loading || !input.trim()} style={{ background: loading || !input.trim() ? "#E5E7EB" : "#7C3AED", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: loading || !input.trim() ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
          {loading ? "AI处理中..." : "发送"}
        </button>
      </div>
      {error && <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 6, marginBottom: 0 }}>{error}</p>}
    </div>
  );
}

// ── Render result by version ─────────────────────────────────────────────────
function VersionResult({ version, mode, copiedTag, copyTag, onRegen, regenLoading }: any) {
  // A refined version stores its content in refined_result
  const result = version.refined_result || version;
  const videoScript = result.video_script;

  return (
    <>
      {videoScript && <VideoScriptOutput script={videoScript} />}
      {mode === "light" && <LightOutput result={result} onRegen={onRegen} loading={regenLoading} copiedTag={copiedTag} copyTag={copyTag} />}
      {mode === "medium" && <MediumOutput result={result} onRegen={onRegen} loading={regenLoading} copiedTag={copiedTag} copyTag={copyTag} />}
      {mode === "deep" && <DeepOutput result={result} onRegen={onRegen} loading={regenLoading} copiedTag={copiedTag} copyTag={copyTag} />}
    </>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Create() {
  const location = useLocation();
  const navigate = useNavigate();
  const { persona } = usePersonaStore();
  const passedTopic = (location.state as any)?.topic || null;

  const [mode, setMode] = useState<Mode>("medium");
  const [topicTitle, setTopicTitle] = useState(passedTopic?.title || "");
  const [loading, setLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [error, setError] = useState("");
  // Version history: index 0 = original, higher = newer iterations
  const [versions, setVersions] = useState<any[]>([]);
  const [currentVersionIdx, setCurrentVersionIdx] = useState(0);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const uid = persona?.user_id || "demo_user_001";

  const doGenerate = async (m: Mode = mode) => {
    if (!topicTitle.trim()) { setError("请先填写选题标题"); return; }
    setError("");
    setLoading(true);
    setVersions([]);
    setCurrentVersionIdx(0);
    try {
      const topic = passedTopic || { title: topicTitle };
      const res = await generateContent(uid, topic, m);
      setVersions([res.data]);
    } catch {
      setError("AI 生成失败，请检查后端是否运行");
    } finally {
      setLoading(false);
    }
  };

  const handleRegen = async () => {
    if (!topicTitle.trim()) return;
    setRegenLoading(true);
    try {
      const topic = passedTopic || { title: topicTitle };
      const res = await generateContent(uid, topic, mode);
      setVersions([res.data]);
      setCurrentVersionIdx(0);
    } catch { /* keep existing */ } finally {
      setRegenLoading(false);
    }
  };

  const handleNewVersion = (refined: any) => {
    setVersions((prev) => {
      const next = [...prev, refined];
      // Keep max 3 versions (index 0 = original always kept)
      if (next.length > 3) {
        return [next[0], ...next.slice(-2)];
      }
      return next;
    });
    setCurrentVersionIdx((prev) => Math.min(prev + 1, 2));
  };

  const copyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  const activeMode = MODES.find((m) => m.key === mode)!;

  return (
    <div style={{ padding: "24px 20px", maxWidth: 820, margin: "0 auto" }}>

      {/* Block 0: Topic + Mode */}
      <div className="card" style={{ padding: "18px 20px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>📌</span>
          <input
            className="input"
            placeholder="输入选题标题，或前往选题地图选择..."
            value={topicTitle}
            onChange={(e) => { setTopicTitle(e.target.value); if (versions.length) { setVersions([]); setCurrentVersionIdx(0); } }}
            onKeyDown={(e) => e.key === "Enter" && doGenerate()}
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", padding: 0, fontSize: 14, color: "var(--text-primary)", fontWeight: topicTitle ? 500 : 400 }}
          />
          {topicTitle && (
            <button onClick={() => { setTopicTitle(""); setVersions([]); setCurrentVersionIdx(0); }} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
          )}
          <button onClick={() => navigate("/topics")} style={{ background: "none", border: "1px solid var(--border)", color: "var(--blue)", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", padding: "3px 10px", borderRadius: 6 }}>
            去选题地图
          </button>
        </div>

        {/* Mode selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <button key={m.key} onClick={() => { setMode(m.key); setVersions([]); setCurrentVersionIdx(0); }} style={{ flex: 1, padding: "10px 8px", border: `1.5px solid ${active ? m.color : "var(--border)"}`, borderRadius: 10, background: active ? m.bg : "var(--bg)", cursor: "pointer", textAlign: "center", transition: "all 0.15s", boxShadow: active ? `0 0 0 3px ${m.color}18` : "none" }}>
                <p style={{ fontSize: 16, margin: "0 0 2px" }}>{m.icon}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: active ? m.color : "var(--text-secondary)", margin: 0 }}>{m.label}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>{m.desc}</p>
              </button>
            );
          })}
        </div>

        {mode === "light" && <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#15803D" }}>⚡ 轻模式：AI 完全模仿你的语言风格，生成可直接发布的完整草稿，稍作调整即可发出。</div>}
        {mode === "medium" && <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#1E40AF" }}>✏️ 中模式：AI 给出精准框架和论点方向，你用自己的真实经历和语言填充，兼顾效率和个人风格。</div>}
        {mode === "deep" && <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#92400E" }}>🔬 深模式：AI 深度分析同类内容盲区，给出 3 个基于你账号定位的差异化切入角度，每个角度含爆款概率分析。</div>}

        {persona && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10, marginBottom: 0 }}>账号定位：{persona.niche} · {persona.tone}</p>}
        {error && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 8, marginBottom: 0 }}>{error}</p>}
      </div>

      {/* Generate button */}
      {versions.length === 0 && (
        <button className="btn-primary" onClick={() => doGenerate()} disabled={loading || !topicTitle.trim()} style={{ width: "100%", padding: "13px 0", fontSize: 14, marginBottom: 24, background: activeMode.color, borderColor: activeMode.color }}>
          {loading ? "AI 生成中..." : `${activeMode.icon} 开始${activeMode.label}创作 →`}
        </button>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            {mode === "deep" ? "AI 正在深度分析差异化角度..." : mode === "light" ? "AI 正在用你的风格生成完整草稿..." : "AI 正在构建内容框架..."}
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>预计需要 15-30 秒</p>
        </div>
      )}

      {/* Result */}
      {versions.length > 0 && !loading && (
        <>
          <VersionResult
            version={versions[currentVersionIdx]}
            mode={mode}
            copiedTag={copiedTag}
            copyTag={copyTag}
            onRegen={handleRegen}
            regenLoading={regenLoading}
          />

          {/* Refine panel */}
          <RefinePanel
            mode={mode}
            topicTitle={topicTitle}
            currentResult={versions[currentVersionIdx]?.refined_result || versions[currentVersionIdx]}
            uid={uid}
            versions={versions}
            currentVersionIdx={currentVersionIdx}
            onVersionSelect={setCurrentVersionIdx}
            onNewVersion={handleNewVersion}
          />

          {/* Action row */}
          <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
            <button className="btn-ghost" onClick={handleRegen} disabled={regenLoading} style={{ flex: 1, padding: "12px 0", fontSize: 14 }}>
              {regenLoading ? "重新生成中..." : "↻ 重新生成"}
            </button>
            <button className="btn-ghost" onClick={() => navigate("/topics")} style={{ padding: "12px 20px", fontSize: 14 }}>
              换个选题
            </button>
          </div>
        </>
      )}
    </div>
  );
}
