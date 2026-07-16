import { useEffect, useState } from "react";
import type { Item } from "../types";
import { SOURCE_TEAM_LABELS, tagsOf } from "../types";
import { saveOverlay, uploadExtraImage } from "../lib/useData";

function TagEditor({ tags, setTags }: { tags: string[]; setTags: (t: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim().replace(/^#/, "");
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setDraft("");
  };
  return (
    <div className="tagbox">
      {tags.map((t) => (
        <button key={t} className="tg" onClick={() => setTags(tags.filter((x) => x !== t))} title="클릭해서 제거">
          #{t} ✕
        </button>
      ))}
      <input
        value={draft}
        placeholder="태그 입력 후 Enter"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        onBlur={add}
      />
    </div>
  );
}

export function ItemModal({ item, onClose, staff, email, onSaved }: {
  item: Item | null;
  onClose: () => void;
  staff: boolean;
  email: string | null;
  onSaved: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [creators, setCreators] = useState("");
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setEdit(false); setErr(null);
    setDesc(item.custom_description ?? "");
    setTags(item.custom_tags ?? []);
    setCreators((item.creators ?? []).join(", "));
    setApproved(item.showcase_approved);
  }, [item]);

  if (!item) return null;

  const save = async () => {
    if (!email) return;
    setBusy(true); setErr(null);
    try {
      await saveOverlay(item.id, {
        custom_description: desc || null,
        custom_tags: tags,
        creators: creators.split(",").map((s) => s.trim()).filter(Boolean),
        showcase_approved: approved,
      }, email);
      onSaved();
      setEdit(false);
    } catch (e) {
      setErr(String((e as Error).message));
    }
    setBusy(false);
  };

  const upload = async (file: File) => {
    if (!email) return;
    setBusy(true); setErr(null);
    try {
      const url = await uploadExtraImage(item.id, file);
      await saveOverlay(item.id, { extra_images: [...(item.extra_images ?? []), url] }, email);
      onSaved();
    } catch (e) {
      setErr(String((e as Error).message));
    }
    setBusy(false);
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {item.thumbnail && (
          <img src={item.thumbnail} alt="" style={{ width: "100%", maxHeight: 330, objectFit: "contain", background: "#eceef1" }} />
        )}
        <div className="modal-body">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span className={"badge team-" + item.source_team}>{SOURCE_TEAM_LABELS[item.source_team]}</span>
            {item.is_bidding && <span className="badge bidding">비딩 제안</span>}
            {item.showcase_approved && staff && <span className="badge showcase">Showcase 공개중</span>}
          </div>
          <h2>{item.client}</h2>
          <div style={{ color: "var(--ink-2)", fontSize: 14, marginTop: 2 }}>{item.title}</div>

          {!edit && (
            <>
              {(item.custom_description || item.overview) && (
                <p style={{ fontSize: 14, lineHeight: 1.65, marginTop: 12 }}>{item.custom_description || item.overview}</p>
              )}
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="label-row"><span className="label-key">카테고리</span><span className="badge">{item.category_group ?? "미확정"}</span>{item.industry && <span className="badge">{item.industry}</span>}{item.advertiser_type && <span className="badge">{item.advertiser_type}</span>}</div>
                {tagsOf(item).length > 0 && (
                  <div className="label-row"><span className="label-key">태그</span>{tagsOf(item).map((t) => <span key={t} className="badge">#{t}</span>)}</div>
                )}
                {item.tools.length > 0 && (
                  <div className="label-row"><span className="label-key">AI 도구</span>{item.tools.map((t) => <span key={t} className="badge">{t}</span>)}</div>
                )}
                {(item.creators ?? []).length > 0 && (
                  <div className="label-row"><span className="label-key">크리에이터</span>{item.creators.map((c) => <span key={c} className="badge">{c}</span>)}</div>
                )}
                <div className="label-row">
                  <span className="label-key">정보</span>
                  <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                    {item.year_month ?? "제작월 미상"}
                    {item.in_house !== null && <> · {item.in_house ? "내부제작" : "외주"}</>}
                    {item.piece_count !== null && <> · {item.piece_count}편</>}
                    {item.team && <> · {item.team}</>}
                  </span>
                </div>
              </div>

              {(item.extra_images ?? []).length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}>
                  {item.extra_images.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt="" style={{ borderRadius: 10, aspectRatio: "1", objectFit: "cover", width: "100%" }} />
                    </a>
                  ))}
                </div>
              )}

              {item.video_urls.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                  {item.video_urls.map((u, i) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer" className="btn">
                      영상 보기{item.video_urls.length > 1 ? ` ${i + 1}` : ""} ↗
                    </a>
                  ))}
                </div>
              )}
              {staff && (
                <div style={{ display: "flex", gap: 8, marginTop: 18, borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
                  <button className="btn ghost" onClick={() => setEdit(true)}>편집</button>
                  <label className="btn ghost" style={{ cursor: "pointer" }}>
                    이미지 추가
                    <input type="file" accept="image/*" style={{ display: "none" }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
                  </label>
                </div>
              )}
            </>
          )}

          {edit && staff && (
            <div style={{ marginTop: 14 }}>
              <div className="toggle-row">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Showcase 외부 공개</div>
                  <div className="hint">동의된 소재만 외부(비로그인)에 노출됩니다</div>
                </div>
                <button className={"btn" + (approved ? " accent" : " ghost")} onClick={() => setApproved(!approved)}>
                  {approved ? "공개 중" : "비공개"}
                </button>
              </div>
              <div className="field">
                <label>설명 (썸네일 캡션·상세 소개)</label>
                <textarea className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={item.overview || "이 소재에 대한 설명"} />
              </div>
              <div className="field">
                <label>태그 (복수 입력)</label>
                <TagEditor tags={tags} setTags={setTags} />
                <span className="hint">AI 소구 태그({(item.appeal_points ?? []).join(", ") || "미분류"})에 추가로 붙습니다</span>
              </div>
              <div className="field">
                <label>크리에이터 (쉼표로 구분)</label>
                <input className="input" value={creators} onChange={(e) => setCreators(e.target.value)} placeholder="홍길동, 김제작" />
              </div>
              {err && <div className="err">{err}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn" onClick={() => void save()} disabled={busy}>{busy ? "저장 중…" : "저장"}</button>
                <button className="btn ghost" onClick={() => setEdit(false)} disabled={busy}>취소</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
