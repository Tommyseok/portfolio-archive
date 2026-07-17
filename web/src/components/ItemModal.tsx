import { useEffect, useRef, useState } from "react";
import type { Item } from "../types";
import { SOURCE_TEAM_LABELS, MEDIA_TAXONOMY, PRODUCTION_METHODS, PRODUCTION_TEAMS, tagsOf } from "../types";
import { saveOverlay, uploadExtraImage, fetchComments, addComment, deleteComment, type CommentRow } from "../lib/useData";

const nameOf = (email: string) => email.split("@")[0];
const timeOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** 코멘트 스레드 — 열릴 때 로드, 본인 것만 삭제 가능 */
function Comments({ item, email, onChanged }: { item: Item; email: string | null; onChanged: () => void }) {
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRows([]); setDraft("");
    void fetchComments(item.id).then(setRows).catch(() => setRows([]));
  }, [item.id]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || !email) return;
    setBusy(true);
    try {
      await addComment(item.id, email, body);
      setDraft("");
      setRows(await fetchComments(item.id));
      onChanged();
    } finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    setBusy(true);
    try {
      await deleteComment(id);
      setRows((r) => r.filter((c) => c.id !== id));
      onChanged();
    } finally { setBusy(false); }
  };

  return (
    <div style={{ marginTop: 18, borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
      <div style={{ fontWeight: 800, fontSize: 13.5 }}>코멘트 {rows.length > 0 && <span style={{ color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 12 }}>{rows.length}</span>}</div>
      <div className="cmt-list">
        {rows.map((c) => (
          <div key={c.id} className="cmt">
            <div className="cmt-avatar">{nameOf(c.author_email).slice(0, 2)}</div>
            <div className="cmt-body">
              <div className="cmt-head">
                <span className="cmt-author">{nameOf(c.author_email)}</span>
                <span className="cmt-time">{timeOf(c.created_at)}</span>
                {email === c.author_email && (
                  <button className="cmt-del" onClick={() => void remove(c.id)} disabled={busy}>삭제</button>
                )}
              </div>
              <div className="cmt-text">{c.body}</div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>첫 코멘트를 남겨보세요.</div>}
      </div>
      <div className="cmt-form">
        <input
          className="input"
          placeholder="코멘트 입력 후 Enter"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); } }}
        />
        <button className="btn" onClick={() => void submit()} disabled={busy || !draft.trim()}>등록</button>
      </div>
    </div>
  );
}

/** 크리에이티브 캐러셀 — 추출된 소재 이미지들을 스냅 스크롤로, 없으면 슬라이드 캡처 1장 */
function Carousel({ item }: { item: Item }) {
  const slides = (item.asset_images?.length ? item.asset_images : item.thumbnail ? [item.thumbnail] : []);
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setIdx(0); trackRef.current?.scrollTo({ left: 0 }); }, [item.id]);
  if (slides.length === 0) return null;

  const go = (d: number) => {
    const next = Math.min(slides.length - 1, Math.max(0, idx + d));
    setIdx(next);
    const el = trackRef.current;
    el?.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = trackRef.current;
    if (el) setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="carousel">
      <div className="carousel-track" ref={trackRef} onScroll={onScroll}>
        {slides.map((s) => (
          <div key={s} className="carousel-slide"><img src={s} alt="" loading="lazy" /></div>
        ))}
      </div>
      {slides.length > 1 && (
        <>
          <button className="carousel-nav prev" onClick={() => go(-1)} disabled={idx === 0} aria-label="이전">‹</button>
          <button className="carousel-nav next" onClick={() => go(1)} disabled={idx === slides.length - 1} aria-label="다음">›</button>
          <div className="carousel-count">{idx + 1} / {slides.length}</div>
        </>
      )}
      {item.asset_images?.length > 0 && item.thumbnail && (
        <a className="carousel-src" href={item.thumbnail} target="_blank" rel="noreferrer">슬라이드 원본 ↗</a>
      )}
    </div>
  );
}

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

export function ItemModal({ item, onClose, staff, email, onSaved, likers = [], onToggleLike, onSocialChanged }: {
  item: Item | null;
  onClose: () => void;
  staff: boolean;
  email: string | null;
  onSaved: () => void;
  likers?: string[];
  onToggleLike?: (i: Item) => void;
  onSocialChanged?: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [creators, setCreators] = useState("");
  const [approved, setApproved] = useState(false);
  const [media, setMedia] = useState("");
  const [method, setMethod] = useState("");
  const [pteam, setPteam] = useState("");
  const [fmt, setFmt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setEdit(false); setErr(null);
    setDesc(item.custom_description ?? "");
    setTags(item.custom_tags ?? []);
    setCreators((item.creators ?? []).join(", "));
    setApproved(item.showcase_approved);
    setMedia(item.media_type ?? "");
    setMethod(item.production_method ?? "");
    setPteam(item.production_team ?? "");
    setFmt(item.format ?? "");
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
        media_type: media || null,
        format: fmt || null,
        production_method: method || null,
        production_team: pteam || null,
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
        <Carousel item={item} />
        <div className="modal-body">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span className={"badge team-" + item.source_team}>{SOURCE_TEAM_LABELS[item.source_team]}</span>
            {item.is_bidding && <span className="badge bidding">비딩 제안</span>}
            {item.showcase_approved && staff && <span className="badge showcase">Showcase 공개중</span>}
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2>{item.client}</h2>
              <div style={{ color: "var(--ink-2)", fontSize: 14, marginTop: 2 }}>{item.title}</div>
            </div>
            {onToggleLike && (
              <button
                className={"act" + (email && likers.includes(email) ? " liked" : "")}
                onClick={() => onToggleLike(item)}
                aria-label="좋아요"
                style={{ flexShrink: 0 }}
              >
                <svg viewBox="0 0 24 24" fill={email && likers.includes(email) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 15, height: 15 }}>
                  <path d="M19 14c1.5-1.5 2.5-3 2.5-5A4.5 4.5 0 0 0 17 4.5c-2 0-3.6 1-5 3-1.4-2-3-3-5-3A4.5 4.5 0 0 0 2.5 9c0 2 1 3.5 2.5 5l7 7 7-7Z" />
                </svg>
                {likers.length > 0 && likers.length}
              </button>
            )}
          </div>

          {!edit && (
            <>
              {(item.custom_description || item.overview) && (
                <p style={{ fontSize: 14, lineHeight: 1.65, marginTop: 12 }}>{item.custom_description || item.overview}</p>
              )}
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {item.media_type && (
                  <div className="label-row"><span className="label-key">소재타입</span><span className="badge">{item.media_type}</span>{item.format && <span className="badge">{item.format}</span>}</div>
                )}
                <div className="label-row"><span className="label-key">카테고리</span><span className="badge">{item.category_group ?? "미확정"}</span>{item.industry && <span className="badge">{item.industry}</span>}{item.advertiser_type && <span className="badge">{item.advertiser_type}</span>}</div>
                <div className="label-row"><span className="label-key">제작</span>{item.production_method && <span className="badge">{item.production_method}</span>}<span className="badge">{item.production_team ?? item.source_team}</span>{item.team && <span className="badge">{item.team}</span>}</div>
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
              <Comments item={item} email={email} onChanged={() => onSocialChanged?.()} />
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
                <label>소재타입</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="input" value={media} onChange={(e) => { setMedia(e.target.value); setFmt(MEDIA_TAXONOMY[e.target.value]?.[0] ?? ""); }}>
                    <option value="">대분류 선택</option>
                    {Object.keys(MEDIA_TAXONOMY).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select className="input" value={fmt} onChange={(e) => setFmt(e.target.value)} disabled={!media}>
                    <option value="">세부 선택</option>
                    {(MEDIA_TAXONOMY[media] ?? []).map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>제작방식 · 제작팀</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option value="">제작방식 선택</option>
                    {PRODUCTION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select className="input" value={pteam} onChange={(e) => setPteam(e.target.value)}>
                    <option value="">제작팀 선택</option>
                    {PRODUCTION_TEAMS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
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
