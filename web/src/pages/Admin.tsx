import { useEffect, useState } from "react";
import { fetchAccessLog, type AccessRow } from "../lib/useData";

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const nameOf = (e: string) => e.split("@")[0];

const statCard = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 20px" } as const;

export function Admin({ isAdmin, ready }: { isAdmin: boolean; ready: boolean }) {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!isAdmin) { setLoading(false); return; }
    fetchAccessLog(1000)
      .then((r) => { setRows(r); setLoading(false); })
      .catch((e) => { setErr(String((e as Error).message)); setLoading(false); });
  }, [isAdmin, ready]);

  if (!ready || loading) return <div className="container" style={{ padding: "40px 0", color: "var(--ink-3)" }}>불러오는 중…</div>;
  if (!isAdmin) return (
    <div className="container empty">
      <div className="big">접근 권한 없음</div>
      <p>관리자만 접속 로그를 볼 수 있습니다.</p>
    </div>
  );

  const byUser = new Map<string, { count: number; last: string }>();
  for (const r of rows) {
    const u = byUser.get(r.user_email);
    if (u) u.count++;
    else byUser.set(r.user_email, { count: 1, last: r.accessed_at }); // rows 는 최신순 → 첫 등장이 최근
  }
  const users = [...byUser.entries()].sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="container" style={{ padding: "28px 0 80px" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.02em" }}>접속 로그</h1>
      <p style={{ color: "var(--ink-2)", marginTop: 4, fontSize: 14 }}>로그인(@madup.com) 접속 시점마다 기록됩니다. 관리자 전용.</p>

      <div style={{ display: "flex", gap: 14, margin: "20px 0 6px", flexWrap: "wrap" }}>
        <div style={statCard}><div style={{ fontSize: 12, color: "var(--ink-3)" }}>총 접속</div><div style={{ fontSize: 26, fontWeight: 800 }}>{rows.length.toLocaleString()}</div></div>
        <div style={statCard}><div style={{ fontSize: 12, color: "var(--ink-3)" }}>순 사용자</div><div style={{ fontSize: 26, fontWeight: 800 }}>{users.length}</div></div>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 800, margin: "24px 0 8px" }}>사용자별</h2>
      <table className="admin-table">
        <thead><tr><th>사용자</th><th>접속 수</th><th>최근 접속</th></tr></thead>
        <tbody>{users.map(([email, s]) => (<tr key={email}><td>{nameOf(email)}</td><td>{s.count}</td><td>{fmt(s.last)}</td></tr>))}</tbody>
      </table>

      <h2 style={{ fontSize: 16, fontWeight: 800, margin: "28px 0 8px" }}>최근 기록 <span style={{ color: "var(--ink-3)", fontWeight: 400, fontSize: 13 }}>(최대 200건 표시 / 총 {rows.length})</span></h2>
      <table className="admin-table">
        <thead><tr><th>시각</th><th>사용자</th><th>경로</th></tr></thead>
        <tbody>{rows.slice(0, 200).map((r) => (<tr key={r.id}><td>{fmt(r.accessed_at)}</td><td>{nameOf(r.user_email)}</td><td style={{ color: "var(--ink-2)" }}>{r.path ?? "—"}</td></tr>))}</tbody>
      </table>

      {rows.length === 0 && <p style={{ color: "var(--ink-3)", marginTop: 12 }}>아직 기록이 없습니다.</p>}
      {err && <div className="err" style={{ marginTop: 12 }}>{err}</div>}
    </div>
  );
}
