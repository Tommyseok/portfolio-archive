import { useState } from "react";

export function SearchBar({ onSearch, onClear, loading }: { onSearch: (q: string) => void; onClear: () => void; loading: boolean }) {
  const [q, setQ] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); q.trim() ? onSearch(q.trim()) : onClear(); }} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='예: "양현종 나온 선케어 메이킹 영상", "유머러스한 세무 숏폼"'
        style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 14 }} />
      <button type="submit" disabled={loading} style={{ padding: "0 18px", borderRadius: 10, border: "none", background: "#334", color: "#fff", cursor: "pointer" }}>
        {loading ? "검색중…" : "검색"}
      </button>
      <button type="button" onClick={() => { setQ(""); onClear(); }} style={{ padding: "0 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>초기화</button>
    </form>
  );
}
