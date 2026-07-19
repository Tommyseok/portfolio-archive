import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export function TopNav({ session, isStaff, isAdmin, q, setQ }: {
  session: Session | null;
  isStaff: boolean;
  isAdmin?: boolean;
  q: string;
  setQ: (v: string) => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Showcase(/ · /showcase)에서는 히어로 패널 위에 투명 오버레이로 떠 있다가, 스크롤하면 라이트 바로 전환
  const overlay = pathname === "/" || pathname === "/showcase";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.55);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  // 브랜드(메인) → URL "/" + 최상단(캐러셀)으로
  const goTop = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // Showcase → URL "/showcase" + Selected work 그리드로
  const goWork = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/showcase");
    setTimeout(() => {
      const el = document.getElementById("showcase-work");
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 62);
    }, 60);
  };

  // 홈(/) 최상단이면 브랜드 밑줄, 스크롤 다운/타 페이지면 Showcase 라운드박스
  const atTopHome = overlay && !scrolled;

  return (
    <header className={"topnav" + (overlay ? " fixed" + (scrolled ? "" : " dark") : "")}>
      <div className="container topnav-in">
        <NavLink to="/" className={"brand" + (atTopHome ? " on" : "")} onClick={goTop}>madup<b>.</b>creative-portal</NavLink>
        <nav className="nav-links">
          <NavLink to="/showcase" onClick={goWork} className={({ isActive }) => "nav-link" + ((overlay ? scrolled : isActive) ? " active" : "")}>Showcase</NavLink>
          <NavLink to="/explore" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>Explore</NavLink>
          <NavLink to="/directory" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>Directory</NavLink>
          {isAdmin && <NavLink to="/admin" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>Admin</NavLink>}
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
