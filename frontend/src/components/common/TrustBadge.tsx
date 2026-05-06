interface TrustBadgeProps {
  score: number;
  showLabel?: boolean;
}

const LEVELS = [
  { min: 80, label: "健康", bg: "#D1FAE5", border: "#A7F3D0", text: "#059669" },
  { min: 60, label: "注意", bg: "#FEF3C7", border: "#FDE68A", text: "#D97706" },
  { min: 40, label: "预警", bg: "#FED7AA", border: "#FDBA74", text: "#EA580C" },
  { min: 0,  label: "危险", bg: "#FEE2E2", border: "#FECACA", text: "#DC2626" },
];

export default function TrustBadge({ score, showLabel = true }: TrustBadgeProps) {
  const level = LEVELS.find((l) => score >= l.min) || LEVELS[3];
  return (
    <span
      style={{
        background: level.bg,
        border: `1px solid ${level.border}`,
        color: level.text,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        whiteSpace: "nowrap",
      }}
    >
      <span>{score}</span>
      {showLabel && <span style={{ opacity: 0.8 }}>{level.label}</span>}
    </span>
  );
}
