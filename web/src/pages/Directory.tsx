import { useNavigate } from "react-router-dom";
import type { Item } from "../types";
import { SOURCE_TEAM_LABELS } from "../types";
import { LoginGate } from "../components/LoginGate";

function agg(items: Item[], pick: (i: Item) => (string | null)[]): [string, number][] {
  const m = new Map<string, number>();
  for (const it of items) for (const v of pick(it)) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function Section({ title, rows, sub, onGo }: {
  title: string;
  rows: [string, number][];
  sub: (name: string) => string;
  onGo: (name: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="dir-section">
      <div className="dir-title">{title}</div>
      <div className="dir-grid">
        {rows.map(([name, count]) => (
          <div key={name} className="dir-card" onClick={() => onGo(name)}>
            <div className="dir-avatar">{name.slice(0, 1)}</div>
            <div>
              <div className="dir-name">{name}</div>
              <div className="dir-sub">{count} items · {sub(name)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Directory({ items, staff, ready }: { items: Item[]; staff: boolean; ready: boolean }) {
  const nav = useNavigate();
  if (!ready) return <div className="container grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skel" />)}</div>;
  if (!staff) return <LoginGate reason="Directory는 매드업 구성원만 볼 수 있습니다." />;

  const teams = agg(items, (i) => [i.source_team]);
  const subTeams = agg(items, (i) => [i.team]);
  const clients = agg(items, (i) => [i.client]);
  const creators = agg(items, (i) => i.creators ?? []);

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60 }}>
      <h1 style={{ fontSize: 30, letterSpacing: "-0.04em", margin: "10px 0 4px" }}>Directory</h1>
      <p style={{ color: "var(--ink-2)", marginTop: 0 }}>제작 조직·광고주·크리에이터 기준으로 소재를 모아봅니다. 카드를 누르면 Explore로 이동합니다.</p>

      <Section title="제작 소스" rows={teams}
        sub={(n) => SOURCE_TEAM_LABELS[n as keyof typeof SOURCE_TEAM_LABELS] ?? n}
        onGo={(n) => nav(`/explore?team=${encodeURIComponent(n)}`)} />

      {subTeams.length > 0 && (
        <Section title="세부 팀" rows={subTeams} sub={() => "제작팀"}
          onGo={(n) => nav(`/explore?creator=${encodeURIComponent(n)}`)} />
      )}

      <Section title="광고주" rows={clients}
        sub={(n) => items.find((i) => i.client === n)?.industry ?? "업종 미확정"}
        onGo={(n) => nav(`/explore?client=${encodeURIComponent(n)}`)} />

      {creators.length > 0 ? (
        <Section title="크리에이터" rows={creators} sub={() => "개인"}
          onGo={(n) => nav(`/explore?creator=${encodeURIComponent(n)}`)} />
      ) : (
        <div className="dir-section">
          <div className="dir-title">크리에이터</div>
          <p style={{ color: "var(--ink-3)", fontSize: 13.5 }}>
            아직 등록된 크리에이터가 없습니다. Explore에서 소재를 열어 편집 → 크리에이터를 입력하면 여기에 나타납니다.
          </p>
        </div>
      )}
    </div>
  );
}
