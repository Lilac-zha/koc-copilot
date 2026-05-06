import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePersonaStore } from "../../store/personaStore";
import { buildFromContent, buildFromQuestionnaire, getDemo } from "../../api";
import { useTypingEffect } from "../../hooks/useTypingEffect";

type Screen = "home" | "import" | "questionnaire" | "loading";

// ── 问卷选项配置 ──────────────────────────────────────────────────────────────
const Q1_NICHES = [
  "美妆护肤", "穿搭时尚", "美食探店", "居家生活",
  "职场效率", "个人成长", "健身运动", "母婴育儿",
  "宠物日常", "数码科技", "旅行探索", "知识分享",
  "影视音乐", "创业副业", "情感生活",
];

const Q2_TONES = [
  { key: "幽默搞笑，自带喜感", emoji: "😄", desc: "用梗和玩笑拉近距离" },
  { key: "真诚温暖，像朋友聊天", emoji: "🤝", desc: "不加滤镜，讲真实经历" },
  { key: "干练理性，直接给干货", emoji: "💼", desc: "数据说话，逻辑清晰" },
  { key: "文艺感性，有自己的腔调", emoji: "🌸", desc: "有温度，有美感" },
  { key: "轻松日常，记录生活流水", emoji: "☕", desc: "随手记录，自然真实" },
];

const Q3_AUDIENCES = [
  "学生党（大学/高中）",
  "职场新人（1-3年）",
  "职场中坚（3年以上）",
  "全职在家（宝妈/宝爸）",
  "创业者/自由职业",
  "不确定，还在摸索",
];

const Q4_PAINS = [
  "不知道发什么内容，选题难",
  "发了很多但涨粉很慢",
  "互动率低，没什么评论",
  "内容同质化，和别人差不多",
  "想接广告但不知道怎么开始",
  "担心接广告影响粉丝信任",
  "没时间做内容，效率低",
  "不知道自己的账号定位是什么",
];

const Q5_FOLLOWERS = ["0粉", "100-500", "500-2000", "2000-5000", "5000-20000", "20000以上"];
const Q5_FREQUENCIES = ["每天", "每周3-5次", "每周1-2次", "不固定", "几乎没在发"];
const PLATFORMS = ["小红书", "抖音", "视频号", "微博", "B站"];

const Q6_GOALS = [
  "帮我找到差异化的内容方向",
  "帮我生成内容，提升发布效率",
  "帮我分析账号数据，找到问题",
  "帮我找到适合的品牌合作",
  "帮我建立稳定的内容节奏",
];

const LOADING_MSGS = [
  "正在分析你的内容方向...",
  "正在提炼账号定位特征...",
  "正在生成专属选题策略...",
  "账号定位构建完成",
];

const TOTAL_STEPS = 6;

// ── 通用组件 ──────────────────────────────────────────────────────────────────
function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? "#EFF6FF" : "#FFFFFF",
        border: selected ? "2px solid #0EA5E9" : "1px solid #E5E7EB",
        borderRadius: 8,
        padding: selected ? "9px 15px" : "10px 16px",
        fontSize: 13,
        color: selected ? "#0284C7" : "#374151",
        fontWeight: selected ? 500 : 400,
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: selected ? "0 0 0 3px rgba(14,165,233,0.1)" : "none",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      {selected && <span style={{ fontSize: 11, color: "#0EA5E9", fontWeight: 700 }}>✓</span>}
      {label}
    </button>
  );
}

function OtherInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus
      style={{
        width: "100%", border: "1.5px solid #0EA5E9", borderRadius: 8,
        padding: "10px 14px", fontSize: 13, outline: "none",
        color: "#374151", background: "#EFF6FF", marginTop: 8,
        boxSizing: "border-box",
      }}
    />
  );
}

function CheckItem({ label, selected, onClick, disabled }: {
  label: string; selected: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled && !selected}
      style={{
        background: selected ? "#EFF6FF" : "#FFFFFF",
        border: selected ? "2px solid #0EA5E9" : "1px solid #E5E7EB",
        borderRadius: 8, padding: selected ? "11px 15px" : "12px 16px",
        cursor: disabled && !selected ? "not-allowed" : "pointer",
        textAlign: "left", color: selected ? "#0284C7" : disabled ? "#9CA3AF" : "#374151",
        fontSize: 14, fontWeight: selected ? 500 : 400,
        display: "flex", alignItems: "center", gap: 10,
        transition: "all 0.15s ease",
        boxShadow: selected ? "0 0 0 3px rgba(14,165,233,0.1)" : "none",
        opacity: disabled && !selected ? 0.5 : 1,
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: 4,
        border: `1.5px solid ${selected ? "#0EA5E9" : "#D1D5DB"}`,
        background: selected ? "#0EA5E9" : "transparent",
        flexShrink: 0, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 11, color: "white",
        transition: "all 0.15s ease",
      }}>
        {selected && "✓"}
      </span>
      {label}
    </button>
  );
}

function QuestionBlock({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginBottom: sub ? 6 : 18 }}>{label}</h3>
      {sub && <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16, marginTop: 0 }}>{sub}</p>}
      {children}
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate();
  const setPersona = usePersonaStore((s) => s.setPersona);

  const [screen, setScreen] = useState<Screen>("home");
  const [platform, setPlatform] = useState("小红书");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [contentInput, setContentInput] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);

  const subtitle = useTypingEffect("以你的账号定位为种子，程序化推演最优内容策略", 50, 600);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLoadingAnimation = () => {
    setLoadingProgress(0);
    setLoadingMsgIdx(0);
    let p = 0;
    progressRef.current = setInterval(() => {
      p += 1.5;
      setLoadingProgress(Math.min(p, 95));
      setLoadingMsgIdx(Math.min(Math.floor(p / 28), 2));
    }, 45);
  };

  const finishLoading = (persona: any) => {
    if (progressRef.current) clearInterval(progressRef.current);
    setLoadingProgress(100);
    setLoadingMsgIdx(3);
    setTimeout(() => {
      setPersona(persona);
      navigate("/dashboard");
    }, 600);
  };

  const handleImportSubmit = async () => {
    if (!contentInput.trim()) return;
    setScreen("loading");
    startLoadingAnimation();
    try {
      const samples = contentInput.split(/\n-{3,}\n/).filter(Boolean);
      const res = await buildFromContent("user_001", platform, samples);
      finishLoading(res.data);
    } catch {
      const res = await getDemo();
      finishLoading(res.data);
    }
  };

  const handleQuestionnaireSubmit = async () => {
    setScreen("loading");
    startLoadingAnimation();

    // 构建发送给后端的 answers
    const niches = answers.niches || [];
    const nicheStr = answers.niche_other
      ? [...niches.filter((n: string) => n !== "其他"), answers.niche_other].join("、")
      : niches.join("、");

    const pains = answers.pain_points || [];
    const painStr = answers.pain_other
      ? [...pains.filter((p: string) => p !== "其他"), answers.pain_other].join("、")
      : pains.join("、");

    const goals = answers.ai_goals || [];
    const goalStr = answers.goals_other
      ? [...goals.filter((g: string) => g !== "其他"), answers.goals_other].join("、")
      : goals.join("、");

    const audienceStr = answers.audience === "其他"
      ? (answers.audience_other || "其他")
      : answers.audience || "";

    const toneStr = answers.tone === "其他"
      ? (answers.tone_other || "其他")
      : answers.tone || "";

    const followerLabel = Q5_FOLLOWERS[answers.follower_idx ?? 2] || "500-2000";

    const qa: Record<string, string> = {
      "内容方向": nicheStr,
      "表达风格": toneStr,
      "目标观众": audienceStr,
      "最大困扰": painStr,
      "粉丝量级": followerLabel,
      "发布频率": answers.post_frequency || "不固定",
      "AI助力重点": goalStr,
    };

    // 收集用户填写的"其他"选项（产品洞察数据）
    const otherInputs: Record<string, string> = {};
    if (answers.niche_other) otherInputs["Q1_内容方向_其他"] = answers.niche_other;
    if (answers.tone_other) otherInputs["Q2_表达风格_其他"] = answers.tone_other;
    if (answers.audience_other) otherInputs["Q3_目标观众_其他"] = answers.audience_other;
    if (answers.pain_other) otherInputs["Q4_最大困扰_其他"] = answers.pain_other;
    if (answers.goals_other) otherInputs["Q6_AI助力重点_其他"] = answers.goals_other;

    try {
      const res = await buildFromQuestionnaire("user_001", platform, qa, otherInputs);
      finishLoading(res.data);
    } catch {
      const res = await getDemo();
      finishLoading(res.data);
    }
  };

  const setAns = (key: string, val: any) => setAnswers((prev) => ({ ...prev, [key]: val }));

  const toggleMulti = (key: string, item: string, max?: number) => {
    const cur: string[] = answers[key] || [];
    if (cur.includes(item)) {
      setAns(key, cur.filter((x) => x !== item));
    } else {
      if (max && cur.length >= max) return; // at max, don't add
      setAns(key, [...cur, item]);
    }
  };

  const canProceed = () => {
    if (step === 0) return (answers.niches || []).length > 0;
    if (step === 1) return !!answers.tone;
    if (step === 2) return !!answers.audience;
    if (step === 3) return (answers.pain_points || []).length > 0;
    if (step === 4) return answers.follower_idx !== undefined && !!answers.post_frequency;
    if (step === 5) return (answers.ai_goals || []).length > 0;
    return true;
  };

  const nextStep = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else handleQuestionnaireSubmit();
  };

  useEffect(() => {
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, []);

  const cardStyle: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    padding: "32px 28px",
    width: "100%",
    maxWidth: 600,
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (screen === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: 24 }}>
        <div className="spinner" style={{ width: 56, height: 56 }} />
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            {LOADING_MSGS[loadingMsgIdx]}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>AI 正在深度分析你的创作基因</p>
        </div>
        <div style={{ width: 280 }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${loadingProgress}%` }} />
          </div>
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
            {Math.round(loadingProgress)}%
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: 38, fontWeight: 900, margin: "0 0 10px", letterSpacing: -1, color: "var(--text-primary)" }}>
          KOC <span style={{ color: "var(--blue)" }}>Copilot</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15, minHeight: 22, letterSpacing: 0.2, margin: 0 }}>
          {subtitle}
          <span style={{ opacity: subtitle.length < 20 ? 1 : 0, transition: "opacity 0.3s" }}>|</span>
        </p>
      </div>

      {/* ── Home screen ── */}
      {screen === "home" && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, textAlign: "center" }}>
            你好，让我先了解一下你
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", marginBottom: 24 }}>
            选择最适合你的方式，构建专属账号定位档案
          </p>

          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
              主平台
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PLATFORMS.map((p) => (
                <Chip key={p} label={p} selected={platform === p} onClick={() => setPlatform(p)} />
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { key: "import", emoji: "📎", label: "导入历史内容", desc: "粘贴你发过的内容，AI 逆向分析账号定位" },
              { key: "questionnaire", emoji: "📝", label: "填写问卷", desc: "回答6个问题，AI 正向构建内容方向" },
            ].map((path) => (
              <button
                key={path.key}
                onClick={() => setScreen(path.key as Screen)}
                onMouseEnter={() => setHovered(path.key)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: hovered === path.key ? "var(--blue-light)" : "var(--bg)",
                  border: `1.5px solid ${hovered === path.key ? "var(--blue)" : "var(--border)"}`,
                  borderRadius: 14, padding: "22px 16px", cursor: "pointer",
                  textAlign: "center", transition: "all 0.2s ease",
                  transform: hovered === path.key ? "translateY(-3px)" : "translateY(0)",
                  boxShadow: hovered === path.key ? "0 8px 24px rgba(14,165,233,0.12)" : "none",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                }}
              >
                <span style={{ fontSize: 32 }}>{path.emoji}</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{path.label}</p>
                <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>{path.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Import screen ── */}
      {screen === "import" && (
        <div style={cardStyle}>
          <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 20 }}>
            ← 返回
          </button>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>粘贴你的历史内容</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            可粘贴 1-5 篇，用{" "}
            <code style={{ background: "var(--bg)", border: "1px solid var(--border)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>---</code>
            {" "}分隔不同内容
          </p>
          <textarea
            className="textarea"
            rows={8}
            placeholder={"第一篇内容...\n---\n第二篇内容...\n---\n第三篇内容..."}
            value={contentInput}
            onChange={(e) => setContentInput(e.target.value)}
            style={{ width: "100%", resize: "vertical" }}
          />
          <button className="btn-primary" onClick={handleImportSubmit} disabled={!contentInput.trim()} style={{ width: "100%", padding: "13px 0", fontSize: 15, marginTop: 16 }}>
            AI 分析账号定位 →
          </button>
        </div>
      )}

      {/* ── Questionnaire screen ── */}
      {screen === "questionnaire" && (
        <div style={cardStyle}>
          {/* Progress bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <button
              onClick={() => (step === 0 ? setScreen("home") : setStep(step - 1))}
              style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 13, cursor: "pointer", padding: 0, flexShrink: 0 }}
            >
              ← {step === 0 ? "返回" : "上一题"}
            </button>
            <div style={{ flex: 1 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
              </div>
            </div>
            <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{step + 1} / {TOTAL_STEPS}</span>
          </div>

          {/* Q1: 内容方向（多选） */}
          {step === 0 && (
            <QuestionBlock label="Q1. 你主要分享什么内容方向？" sub="可多选">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {Q1_NICHES.map((n) => (
                  <Chip
                    key={n}
                    label={n}
                    selected={(answers.niches || []).includes(n)}
                    onClick={() => toggleMulti("niches", n)}
                  />
                ))}
                <Chip
                  label="其他（填写）"
                  selected={(answers.niches || []).includes("其他") || !!answers.niche_other}
                  onClick={() => {
                    if ((answers.niches || []).includes("其他")) {
                      setAnswers({ ...answers, niches: (answers.niches || []).filter((x: string) => x !== "其他"), niche_other: "" });
                    } else {
                      setAns("niches", [...(answers.niches || []), "其他"]);
                    }
                  }}
                />
              </div>
              {((answers.niches || []).includes("其他")) && (
                <OtherInput
                  placeholder="请填写你的内容方向..."
                  value={answers.niche_other || ""}
                  onChange={(v) => setAns("niche_other", v)}
                />
              )}
            </QuestionBlock>
          )}

          {/* Q2: 表达风格（单选） */}
          {step === 1 && (
            <QuestionBlock label="Q2. 你的表达风格更接近哪种？">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                {Q2_TONES.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setAnswers({ ...answers, tone: opt.key, tone_other: "" })}
                    style={{
                      padding: "16px 14px", cursor: "pointer", textAlign: "left",
                      transition: "all 0.15s ease", display: "flex", flexDirection: "column", gap: 6,
                      background: answers.tone === opt.key ? "#EFF6FF" : "#FFFFFF",
                      border: answers.tone === opt.key ? "2px solid #0EA5E9" : "1px solid #E5E7EB",
                      borderRadius: 12,
                      boxShadow: answers.tone === opt.key ? "0 0 0 3px rgba(14,165,233,0.1)" : "none",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                    <p style={{ fontSize: 13, fontWeight: answers.tone === opt.key ? 600 : 500, color: answers.tone === opt.key ? "#0284C7" : "#374151", margin: 0 }}>{opt.key}</p>
                    <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{opt.desc}</p>
                  </button>
                ))}
                <button
                  onClick={() => setAnswers({ ...answers, tone: "其他" })}
                  style={{
                    padding: "16px 14px", cursor: "pointer", textAlign: "left",
                    display: "flex", flexDirection: "column", gap: 6,
                    background: answers.tone === "其他" ? "#EFF6FF" : "#FFFFFF",
                    border: answers.tone === "其他" ? "2px solid #0EA5E9" : "1px solid #E5E7EB",
                    borderRadius: 12,
                    boxShadow: answers.tone === "其他" ? "0 0 0 3px rgba(14,165,233,0.1)" : "none",
                  }}
                >
                  <span style={{ fontSize: 22 }}>✏️</span>
                  <p style={{ fontSize: 13, fontWeight: 500, color: answers.tone === "其他" ? "#0284C7" : "#374151", margin: 0 }}>其他（填写）</p>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>用自己的话描述</p>
                </button>
              </div>
              {answers.tone === "其他" && (
                <OtherInput
                  placeholder="描述你的表达风格..."
                  value={answers.tone_other || ""}
                  onChange={(v) => setAns("tone_other", v)}
                />
              )}
            </QuestionBlock>
          )}

          {/* Q3: 目标观众（单选） */}
          {step === 2 && (
            <QuestionBlock label="Q3. 你的目标观众主要是？">
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                {Q3_AUDIENCES.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAnswers({ ...answers, audience: a, audience_other: "" })}
                    style={{
                      background: answers.audience === a ? "#EFF6FF" : "#FFFFFF",
                      border: answers.audience === a ? "2px solid #0EA5E9" : "1px solid #E5E7EB",
                      borderRadius: 8, padding: answers.audience === a ? "11px 15px" : "12px 16px",
                      cursor: "pointer", textAlign: "left",
                      color: answers.audience === a ? "#0284C7" : "#374151",
                      fontSize: 14, fontWeight: answers.audience === a ? 500 : 400,
                      display: "flex", alignItems: "center", gap: 10,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span style={{
                      width: 16, height: 16, borderRadius: "50%",
                      border: `2px solid ${answers.audience === a ? "#0EA5E9" : "#D1D5DB"}`,
                      background: answers.audience === a ? "#0EA5E9" : "transparent",
                      flexShrink: 0,
                    }} />
                    {a}
                  </button>
                ))}
                <button
                  onClick={() => setAnswers({ ...answers, audience: "其他" })}
                  style={{
                    background: answers.audience === "其他" ? "#EFF6FF" : "#FFFFFF",
                    border: answers.audience === "其他" ? "2px solid #0EA5E9" : "1px solid #E5E7EB",
                    borderRadius: 8, padding: answers.audience === "其他" ? "11px 15px" : "12px 16px",
                    cursor: "pointer", textAlign: "left",
                    color: answers.audience === "其他" ? "#0284C7" : "#374151",
                    fontSize: 14, fontWeight: answers.audience === "其他" ? 500 : 400,
                    display: "flex", alignItems: "center", gap: 10,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{
                    width: 16, height: 16, borderRadius: "50%",
                    border: `2px solid ${answers.audience === "其他" ? "#0EA5E9" : "#D1D5DB"}`,
                    background: answers.audience === "其他" ? "#0EA5E9" : "transparent",
                    flexShrink: 0,
                  }} />
                  其他（填写）
                </button>
              </div>
              {answers.audience === "其他" && (
                <OtherInput
                  placeholder="描述你的目标观众..."
                  value={answers.audience_other || ""}
                  onChange={(v) => setAns("audience_other", v)}
                />
              )}
            </QuestionBlock>
          )}

          {/* Q4: 最大困扰（多选，最多3个） */}
          {step === 3 && (
            <QuestionBlock label="Q4. 你现在最大的困扰是什么？" sub="可多选，最多3个">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Q4_PAINS.map((pain) => {
                  const selected = (answers.pain_points || []).includes(pain);
                  const atMax = (answers.pain_points || []).length >= 3;
                  return (
                    <CheckItem
                      key={pain}
                      label={pain}
                      selected={selected}
                      onClick={() => toggleMulti("pain_points", pain, 3)}
                      disabled={atMax}
                    />
                  );
                })}
                {/* 其他 */}
                <CheckItem
                  label="其他（填写）"
                  selected={(answers.pain_points || []).includes("其他")}
                  onClick={() => toggleMulti("pain_points", "其他", 3)}
                  disabled={(answers.pain_points || []).length >= 3}
                />
              </div>
              {(answers.pain_points || []).includes("其他") && (
                <OtherInput
                  placeholder="描述你的困扰..."
                  value={answers.pain_other || ""}
                  onChange={(v) => setAns("pain_other", v)}
                />
              )}
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                已选 {(answers.pain_points || []).length} / 3 个
              </p>
            </QuestionBlock>
          )}

          {/* Q5: 账号现状 */}
          {step === 4 && (
            <QuestionBlock label="Q5. 你目前的账号情况？">
              {/* 粉丝量滑块 */}
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 10px" }}>粉丝量</p>
              <input
                type="range" min={0} max={5} step={1}
                value={answers.follower_idx ?? 2}
                onChange={(e) => setAns("follower_idx", +e.target.value)}
                style={{ width: "100%", accentColor: "var(--blue)", height: 4, cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, marginBottom: 6 }}>
                {Q5_FOLLOWERS.map((l, i) => (
                  <span key={l} style={{ fontSize: 10, color: (answers.follower_idx ?? 2) === i ? "var(--blue)" : "var(--text-muted)", fontWeight: (answers.follower_idx ?? 2) === i ? 700 : 400, textAlign: "center", width: `${100 / Q5_FOLLOWERS.length}%` }}>
                    {l}
                  </span>
                ))}
              </div>
              <div style={{ background: "var(--blue-light)", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 16px", textAlign: "center", fontSize: 15, fontWeight: 700, color: "var(--blue)", marginBottom: 20 }}>
                {Q5_FOLLOWERS[answers.follower_idx ?? 2]}
              </div>

              {/* 发布频率 */}
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 10px" }}>发布频率</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Q5_FREQUENCIES.map((f) => (
                  <Chip key={f} label={f} selected={answers.post_frequency === f} onClick={() => setAns("post_frequency", f)} />
                ))}
              </div>
            </QuestionBlock>
          )}

          {/* Q6: AI助力重点（多选，最多2个） */}
          {step === 5 && (
            <QuestionBlock label="Q6. 你希望 AI 重点帮你做什么？" sub="可多选，最多2个">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Q6_GOALS.map((g) => {
                  const selected = (answers.ai_goals || []).includes(g);
                  const atMax = (answers.ai_goals || []).length >= 2;
                  return (
                    <CheckItem
                      key={g}
                      label={g}
                      selected={selected}
                      onClick={() => toggleMulti("ai_goals", g, 2)}
                      disabled={atMax}
                    />
                  );
                })}
                <CheckItem
                  label="其他（填写）"
                  selected={(answers.ai_goals || []).includes("其他")}
                  onClick={() => toggleMulti("ai_goals", "其他", 2)}
                  disabled={(answers.ai_goals || []).length >= 2}
                />
              </div>
              {(answers.ai_goals || []).includes("其他") && (
                <OtherInput
                  placeholder="描述你希望AI帮你做的事..."
                  value={answers.goals_other || ""}
                  onChange={(v) => setAns("goals_other", v)}
                />
              )}
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                已选 {(answers.ai_goals || []).length} / 2 个
              </p>
            </QuestionBlock>
          )}

          <button
            className="btn-primary"
            onClick={nextStep}
            disabled={!canProceed()}
            style={{ width: "100%", padding: "13px 0", fontSize: 15, marginTop: 24 }}
          >
            {step < TOTAL_STEPS - 1 ? "下一题 →" : "构建我的账号定位 ✨"}
          </button>
        </div>
      )}
    </div>
  );
}
