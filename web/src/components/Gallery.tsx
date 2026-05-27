import type { PublicPortfolioItem } from "../types";
import { Card } from "./Card";

export function Gallery({ items, onOpen }: { items: PublicPortfolioItem[]; onOpen: (i: PublicPortfolioItem) => void }) {
  if (items.length === 0) return <p style={{ color: "#888" }}>결과가 없습니다.</p>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
      {items.map((it) => <Card key={it.id} item={it} onOpen={onOpen} />)}
    </div>
  );
}
