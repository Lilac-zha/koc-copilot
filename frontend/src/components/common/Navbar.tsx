import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePersonaStore } from "../../store/personaStore";
import TrustBadge from "./TrustBadge";

const NAV_ITEMS = [
  { path: "/dashboard", label: "首页" },
  { path: "/topics",    label: "选题地图" },
  { path: "/create",    label: "内容创作" },
  { path: "/analytics", label: "健康度" },
  { path: "/matching",  label: "品牌匹配" },
];

export default function Navbar() {
  const location = useLocation();
  const { persona } = usePersonaStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      style={{
        background: "#fff",
        borderBottom: "1px solid #E2E8F0",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 20px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link to="/dashboard" style={{ textDecoration: "none", flexShrink: 0 }}>
          <span
            className="gradient-text"
            style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}
          >
            KOC Copilot
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex" style={{ gap: 2 }}>
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  textDecoration: "none",
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--blue)" : "var(--text-secondary)",
                  background: active ? "var(--blue-light)" : "transparent",
                  transition: "all 0.15s ease",
                  display: "inline-block",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right: persona badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {persona && (
            <>
              <div className="hidden md:block" style={{ textAlign: "right" }}>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                  {persona.platform} · v{persona.version}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-primary)",
                    margin: 0,
                    fontWeight: 500,
                  }}
                >
                  {persona.niche.slice(0, 12)}
                </p>
              </div>
              <TrustBadge score={persona.trust_score} />
            </>
          )}
          <button
            className="md:hidden btn-ghost"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ padding: "5px 8px", fontSize: 16 }}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "10px 16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            background: "#fff",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                style={{
                  textDecoration: "none",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 14,
                  color: active ? "var(--blue)" : "var(--text-secondary)",
                  background: active ? "var(--blue-light)" : "transparent",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
