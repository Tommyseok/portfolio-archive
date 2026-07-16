import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useItems, useSession } from "./lib/useData";
import type { Filters } from "./lib/filter";
import { emptyFilters } from "./lib/filter";
import { TopNav } from "./components/TopNav";
import { Showcase } from "./pages/Showcase";
import { Explore } from "./pages/Explore";
import { Directory } from "./pages/Directory";

export default function App() {
  const { session, isStaff, ready } = useSession();
  // 세션 변화(로그인/아웃)마다 RLS 가시성이 달라지므로 재조회
  const { items, loading, reload } = useItems([session?.access_token ?? "anon"]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const email = session?.user?.email ?? null;
  const setQ = (q: string) => setFilters((f) => ({ ...f, q }));

  return (
    <BrowserRouter>
      <TopNav session={session} isStaff={isStaff} q={filters.q} setQ={setQ} />
      <Routes>
        <Route path="/" element={
          <Showcase items={items} loading={loading} filters={filters} setFilters={setFilters}
            staff={isStaff} email={email} onSaved={() => void reload()} />
        } />
        <Route path="/explore" element={
          <Explore items={items} loading={loading} filters={filters} setFilters={setFilters}
            staff={isStaff} ready={ready} email={email} onSaved={() => void reload()} />
        } />
        <Route path="/directory" element={<Directory items={items} staff={isStaff} ready={ready} />} />
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
