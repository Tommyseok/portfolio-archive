import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useItems, useSession, logAccess } from "./lib/useData";
import type { Filters } from "./lib/filter";
import { emptyFilters } from "./lib/filter";
import { isAdminEmail } from "./lib/supabase";
import { TopNav } from "./components/TopNav";
import { Showcase } from "./pages/Showcase";
import { Explore } from "./pages/Explore";
import { Directory } from "./pages/Directory";
import { Admin } from "./pages/Admin";

export default function App() {
  const { session, isStaff, ready } = useSession();
  // 세션 변화(로그인/아웃)마다 RLS 가시성이 달라지므로 재조회
  const { items, loading, reload } = useItems([session?.access_token ?? "anon"]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const email = session?.user?.email ?? null;
  const isAdmin = isAdminEmail(email);
  const setQ = (q: string) => setFilters((f) => ({ ...f, q }));

  // 로그인 접속 기록 (세션 확립 시 1회)
  useEffect(() => {
    if (email) void logAccess(email, window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  return (
    <BrowserRouter>
      <TopNav session={session} isStaff={isStaff} isAdmin={isAdmin} q={filters.q} setQ={setQ} />
      <Routes>
        <Route path="/" element={
          <Showcase items={items} loading={loading} filters={filters} setFilters={setFilters}
            staff={isStaff} email={email} onSaved={() => void reload()} />
        } />
        <Route path="/showcase" element={
          <Showcase items={items} loading={loading} filters={filters} setFilters={setFilters}
            staff={isStaff} email={email} onSaved={() => void reload()} />
        } />
        <Route path="/explore" element={
          <Explore items={items} loading={loading} filters={filters} setFilters={setFilters}
            staff={isStaff} ready={ready} email={email} onSaved={() => void reload()} />
        } />
        <Route path="/directory" element={<Directory items={items} staff={isStaff} ready={ready} />} />
        <Route path="/admin" element={<Admin isAdmin={isAdmin} ready={ready} />} />
      </Routes>
      <footer style={{ borderTop: "1px solid var(--line-soft)", padding: "26px 0", marginTop: 20 }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--ink-3)" }}>
          <span>© MADUP Creative Credential</span>
          <span>PD · DS · MS 통합 아카이브</span>
        </div>
      </footer>
    </BrowserRouter>
  );
}
