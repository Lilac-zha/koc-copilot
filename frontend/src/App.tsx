import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import Navbar from "./components/common/Navbar";
import StrategyBar from "./components/common/StrategyBar";
import AdvisorChat from "./components/AdvisorChat";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import TopicMap from "./pages/TopicMap";
import Create from "./pages/Create";
import Analytics from "./pages/Analytics";
import Matching from "./pages/Matching";

function PageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.transition = "opacity 0.2s ease-out, transform 0.2s ease-out";
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      })
    );
  }, [location.pathname]);

  return <div ref={ref}>{children}</div>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />
      <StrategyBar />
      <PageWrapper>
        <main style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</main>
      </PageWrapper>
      <AdvisorChat />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
        <Route path="/topics"    element={<AppLayout><TopicMap /></AppLayout>} />
        <Route path="/create"    element={<AppLayout><Create /></AppLayout>} />
        <Route path="/analytics" element={<AppLayout><Analytics /></AppLayout>} />
        <Route path="/matching"  element={<AppLayout><Matching /></AppLayout>} />
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
