interface Props {
  text?: string;
  subtext?: string;
  progress?: number;
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  text = "AI 分析中...",
  subtext,
  progress,
  fullScreen = false,
}: Props) {
  const inner = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
      }}
    >
      <div className="spinner" />
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {text}
        </p>
        {subtext && (
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              marginTop: 4,
              margin: 0,
            }}
          >
            {subtext}
          </p>
        )}
      </div>
      {progress !== undefined && (
        <div style={{ width: 200 }}>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textAlign: "center",
              marginTop: 5,
            }}
          >
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        {inner}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 0",
      }}
    >
      {inner}
    </div>
  );
}
