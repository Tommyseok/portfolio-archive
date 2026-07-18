import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export function TopNav({ session, isStaff, q, setQ }: {
  session: Session | null;
  isStaff: boolean;
  q: string;
  setQ: (v: string) => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Showcase(/)에서는 히어로 패널 위에 투명 오버레이로 떠 있다가, 스크롤하면 라이트 바로 전환
  const overlay = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.55);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  // 브랜드 → 맨 위(캐러셀)로
  const goTop = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  // Showcase → 쇼케이스 콘텐츠 섹션(중간 카피·그리드)으로
  const goWork = (e: React.MouseEvent) => {
    e.preventDefault();
    const scroll = () => document.getElementById("showcase-work")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (pathname === "/") scroll();
    else { navigate("/"); setTimeout(scroll, 140); }
  };

  return (
    <header className={"topnav" + (overlay ? " fixed" + (scrolled ? "" : " dark") : "")}>
      <div className="container topnav-in">
        <NavLink to="/" className="brand" onClick={goTop}>madup<b>.</b>creative-portal</NavLink>
        <nav className="nav-links">
          <NavLink to="/" end onClick={goWork} className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>Showcase</NavLink>
          <NavLink to="/explore" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>Explore</NavLink>
          <NavLink to="/directory" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>Directory</NavLink>
        </nav>
        <div className="nav-right">
          <div className="nav-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input placeholder="광고주·소재·태그 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {session ? (
            <button className="btn ghost" onClick={() => void supabase.auth.signOut()}>
              {isStaff ? session.user.email?.split("@")[0] : "게스트"} · 로그아웃
            </button>
          ) : (
            <NavLink to="/explore" className="btn">팀 로그인</NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
