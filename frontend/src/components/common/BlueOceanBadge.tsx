interface Props { score: number; }

export default function BlueOceanBadge({ score }: Props) {
  const isBlue = score > 15;
  const isRed  = score < 10;
  const s = isBlue
    ? { bg: "#DBEAFE", border: "#BFDBFE", text: "#1D4ED8", label: "蓝海" }
    : isRed
    ? { bg: "#FEE2E2", border: "#FECACA", text: "#DC2626", label: "红海" }
    : { bg: "#F1F5F9", border: "#E2E8F0", text: "#64748B", label: "一般" };

  return (
    <span
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        whiteSpace: "nowrap",
      }}
    >
      {score.toFixed(1)} {s.label}
    </span>
  );
}
