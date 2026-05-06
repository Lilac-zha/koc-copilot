import { useNavigate, useLocation } from "react-router-dom";
import { usePersonaStore } from "../../store/personaStore";

const STEPS = [
  { key: "topics",    label: "选题", match: "/topics"    },
  { key: "create",    label: "创作", match: "/create"    },
  { key: "publish",   label: "发布", match: "/dashboard" },
  { key: "analytics", label: "复盘", match: "/analytics" },
];

export default function StrategyBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { persona } = usePersonaStore();

  const activeStep = STEPS.find((s) => location.pathname.startsWith(s.match))?.key ?? null;

  // Mock weekly progress from persona
  const weekDone = 1;
  const weekTotal = 3;
  const pct = Math.round((weekDone / weekTotal) * 100);

  // Priority task text based on persona
  const priorityTask =
    persona && persona.evergreen_ratio < 0.7
      ? "发一篇常青选题"
      : "发一篇互动型内容";
  const trustGain = 9;

  return (
    <div
      style={{
        background: "#fff",
        borderBottom: "1px solid var(--border)",
        padding: "0 20px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          height: 44,
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "nowrap",
          overflow: "hidden",
        }}
      >
        {/* Week target */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            🎯 本周目标
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            发布{weekTotal}篇（已完成{weekDone}篇）
          </span>
        </div>

        {/* Progress */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <div style={{ width: 72 }}>
            <div className="progress-bar" style={{ height: 5 }}>
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--blue)",
            }}
          >
            {pct}%
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 20,
            background: "var(--border)",
            flexShrink: 0,
          }}
        />

        {/* Priority task */}
        <span
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            flexShrink: 0,
          }}
        >
          当前优先任务 →
        </span>
        <span
          className="hidden md:inline"
          style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}
        >
          立即{priorityTask}
          <span style={{ color: "var(--success)", marginLeft: 6, fontSize: 12 }}>
            （信任度+{trustGain}分）
          </span>
        </span>

        {/* Workflow steps - desktop only */}
        <div
          className="hidden lg:flex"
          style={{
            marginLeft: "auto",
            alignItems: "center",
            gap: 0,
            flexShrink: 0,
          }}
        >
          {STEPS.map((step, i) => {
            const isActive = activeStep === step.key;
            return (
              <span key={step.key} style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? "var(--blue)" : "var(--text-muted)",
                    background: isActive ? "var(--blue-light)" : "transparent",
                    padding: "3px 10px",
                    borderRadius: 20,
                    transition: "all 0.15s",
                  }}
                >
                  {step.label}
                </span>
                {i < STEPS.length - 1 && (
                  <span style={{ fontSize: 10, color: "var(--border)", margin: "0 2px" }}>
                    →
                  </span>
                )}
              </span>
            );
          })}
        </div>

        {/* CTA */}
        <button
          className="btn-amber"
          onClick={() => navigate("/topics")}
          style={{ padding: "6px 16px", fontSize: 12, flexShrink: 0, marginLeft: "auto" }}
        >
          去选题
        </button>
      </div>
    </div>
  );
}
