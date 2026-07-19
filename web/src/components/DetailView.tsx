import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Item } from "../types";
import { MEDIA_TAXONOMY, PRODUCTION_METHODS, PRODUCTION_TEAMS, SOURCE_TEAM_LABELS, tagsOf } from "../types";
import { saveOverlay, uploadExtraImage, uploadCoverVideo, deleteItem, fetchComments, addComment, deleteComment, featuredRankConflict, type CommentRow } from "../lib/useData";
import { detailTitle, detailSubtitle, detailDesc, detailGallery, detailLinks } from "../lib/detail";

const nameOf = (email: string) => email.split("@")[0];
const timeOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

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
    try { await addComment(item.id, email, body); setDraft(""); setRows(await fetchComments(item.id)); onChanged(); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    setBusy(true);
    try { await deleteComment(id); setRows((r) => r.filter((c) => c.id !== id)); onChanged(); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ marginTop: 26, borderTop: "1px solid rgba(255,255,255,0.14)", paddingTop: 18 }}>
      <div style={{ fontWeight: 800, fontSize: 13.5 }}>코멘트 {rows.length > 0 && <span style={{ color: "#7a7c82", fontFamily: "var(--mono)", fontSize: 12 }}>{rows.length}</span>}</div>
      <div className="cmt-list">
        {rows.map((c) => (
          <div key={c.id} className="cmt">
            <div className="cmt-avatar">{nameOf(c.author_email).slice(0, 2)}</div>
            <div className="cmt-body">
              <div className="cmt-head">
                <span className="cmt-author">{nameOf(c.author_email)}</span>
                <span className="cmt-time">{timeOf(c.created_at)}</span>
                {email === c.author_email && <button className="cmt-del" onClick={() => void remove(c.id)} disabled={busy}>삭제</button>}
              </div>
              <div className="cmt-text">{c.body}</div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div style={{ fontSize: 12.5, color: "#7a7c82" }}>첫 코멘트를 남겨보세요.</div>}
      </div>
      <div className="cmt-form">
        <input className="input" placeholder="코멘트 입력 후 Enter" value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); } }} />
        <button className="dv-btn" onClick={() => void submit()} disabled={busy || !draft.trim()}>등록</button>
      </div>
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
        <button key={t} className="tg" onClick={() => setTags(tags.filter((x) => x !== t))} title="클릭해서 제거">#{t} ✕</button>
      ))}
      <input value={draft} placeholder="태그 입력 후 Enter" onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} onBlur={add} />
    </div>
  );
}

function parseXY(pos: string): [number, number] {
  const m = pos.match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : [50, 50];
}

/** 커버 선택(썸네일) + 드래그 포컬(object-position) 에디터 */
function CoverEditor({ images, cover, setCover, pos, setPos, zoom, setZoom }: {
  images: string[]; cover: string; setCover: (s: string) => void; pos: string; setPos: (s: string) => void;
  zoom: number; setZoom: (n: number) => void;
}) {
  const TILE_AR = 4 / 3; // Selected work 타일 비율 기준
  const chosen = cover || images[0] || "";
  const [x, y] = parseXY(pos);
  const [ar, setAr] = useState(1);
  const boxRef = useRef<HTMLDivElement>(null);

  // 크롭 프레임 크기(전체 이미지 대비 비율) = cover 크롭 + 확대(zoom)
  const fw = Math.min(1, ar >= TILE_AR ? (TILE_AR / ar) / zoom : 1 / zoom);
  const fh = Math.min(1, ar >= TILE_AR ? 1 / zoom : (ar / TILE_AR) / zoom);
  const left = (x / 100) * (1 - fw);
  const top = (y / 100) * (1 - fh);
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    const cf = clamp01((e.clientX - r.left) / r.width);
    const cvf = clamp01((e.clientY - r.top) / r.height);
    const nx = 1 - fw > 0.001 ? clamp01((cf - fw / 2) / (1 - fw)) * 100 : 50;
    const ny = 1 - fh > 0.001 ? clamp01((cvf - fh / 2) / (1 - fh)) * 100 : 50;
    setPos(`${Math.round(nx)}% ${Math.round(ny)}%`);
  };

  const boxW = Math.min(300, Math.round(240 * ar));

  return (
    <div className="field">
      <label>커버 이미지 · 보일 영역 (타일 4:3)</label>
      {images.length > 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, marginBottom: 10 }}>
          {images.map((src) => (
            <button key={src} type="button" onClick={() => setCover(src)}
              style={{ padding: 0, borderRadius: 6, overflow: "hidden", cursor: "pointer", background: "none",
                border: chosen === src ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,.2)" }}>
              <img src={src} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
            </button>
          ))}
        </div>
      )}
      {chosen ? (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <div ref={boxRef} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onMove(e); }} onPointerMove={onMove}
                style={{ position: "relative", width: boxW, aspectRatio: String(ar), background: "#000", borderRadius: 8, overflow: "hidden", cursor: "move", userSelect: "none", touchAction: "none" }}>
                <img src={chosen} alt="" draggable={false}
                  onLoad={(e) => { const t = e.currentTarget; if (t.naturalWidth && t.naturalHeight) setAr(t.naturalWidth / t.naturalHeight); }}
                  style={{ width: "100%", height: "100%", objectFit: "fill", display: "block", pointerEvents: "none" }} />
                <div style={{ position: "absolute", left: `${left * 100}%`, top: `${top * 100}%`, width: `${fw * 100}%`, height: `${fh * 100}%`, boxSizing: "border-box", border: "2px solid #fff", boxShadow: "0 0 0 9999px rgba(0,0,0,.6)", pointerEvents: "none" }} />
              </div>
              <span className="hint">밝은 프레임 = 타일에 실제로 보이는 영역. 드래그로 이동 · 슬라이더로 확대해 글자를 프레임 밖으로.</span>
            </div>
            <div>
              <div style={{ width: 150, aspectRatio: "4 / 3", borderRadius: 8, overflow: "hidden", background: "#000" }}>
                <img src={chosen} alt="" draggable={false}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%` }} />
              </div>
              <span className="hint" style={{ display: "block", textAlign: "center" }}>실제 타일 결과</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, maxWidth: 300 }}>
            <span style={{ fontSize: 12, color: "#b6b7bb" }}>확대</span>
            <input type="range" min={1} max={3} step={0.05} value={zoom} style={{ flex: 1 }} onChange={(e) => setZoom(Number(e.target.value))} />
            <span style={{ fontSize: 12, fontFamily: "var(--mono)", minWidth: 34 }}>{zoom.toFixed(2)}×</span>
          </div>
          {(cover || pos || zoom !== 1) && <button className="dv-btn" type="button" style={{ marginTop: 8 }} onClick={() => { setCover(""); setPos(""); setZoom(1); }}>커버 해제 (기본값)</button>}
        </>
      ) : <span className="hint">이미지가 없어 커버를 설정할 수 없습니다.</span>}
    </div>
  );
}

export function DetailView({ item, onClose, staff, email, onSaved, likers = [], onToggleLike, onSocialChanged }: {
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
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [creators, setCreators] = useState("");
  const [approved, setApproved] = useState(false);
  const [media, setMedia] = useState("");
  const [fmt, setFmt] = useState("");
  const [method, setMethod] = useState("");
  const [pteam, setPteam] = useState("");
  // featured
  const [feat, setFeat] = useState(false);
  const [rank, setRank] = useState<string>("");
  const [headline, setHeadline] = useState("");
  const [subcopy, setSubcopy] = useState("");
  const [kicker, setKicker] = useState("");
  const [coverImg, setCoverImg] = useState("");
  const [coverPos, setCoverPos] = useState("");
  const [coverZoom, setCoverZoom] = useState(1);
  const [coverVideo, setCoverVideo] = useState("");
  const [linkRows, setLinkRows] = useState<{ label: string; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setEdit(false); setErr(null);
    setDesc(item.custom_description ?? "");
    setTitle(item.custom_title ?? "");
    setTags(item.custom_tags ?? []);
    setCreators((item.creators ?? []).join(", "));
    setApproved(item.showcase_approved);
    setMedia(item.media_type ?? "");
    setFmt(item.format ?? "");
    setMethod(item.production_method ?? "");
    setPteam(item.production_team ?? "");
    setFeat(item.is_featured ?? false);
    setRank(item.featured_rank != null ? String(item.featured_rank) : "");
    setHeadline(item.featured_headline ?? "");
    setSubcopy(item.featured_subcopy ?? "");
    setKicker(item.featured_kicker ?? "");
    setCoverImg(item.cover_image ?? "");
    setCoverPos(item.cover_position ?? "");
    setCoverZoom(item.cover_zoom ?? 1);
    setCoverVideo(item.cover_video ?? "");
    setLinkRows(item.custom_links ?? []);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [item, onClose]);

  if (!item) return null;

  const gallery = detailGallery(item);
  const links = detailLinks(item);
  const liked = !!email && likers.includes(email);

  const save = async () => {
    if (!email) return;
    setBusy(true); setErr(null);
    try {
      if (feat && rank && (await featuredRankConflict(Number(rank), item.id))) {
        if (!window.confirm(`${rank}번 순서는 이미 다른 Featured 케이스가 사용 중입니다. 그대로 저장하면 순서가 겹칩니다. 계속할까요?`)) {
          setBusy(false); return;
        }
      }
      await saveOverlay(item.id, {
        custom_description: desc || null,
        custom_title: title || null,
        custom_tags: tags,
        creators: creators.split(",").map((s) => s.trim()).filter(Boolean),
        showcase_approved: approved,
        media_type: media || null,
        format: fmt || null,
        production_method: method || null,
        production_team: pteam || null,
        is_featured: feat,
        featured_rank: feat && rank ? Number(rank) : null,
        featured_headline: headline || null,
        featured_subcopy: subcopy || null,
        featured_kicker: kicker || null,
        cover_image: coverImg || null,
        cover_position: coverPos || null,
        cover_zoom: coverZoom !== 1 ? coverZoom : null,
        cover_video: coverVideo || null,
        custom_links: linkRows.filter((r) => r.url.trim()),
      }, email);
      onSaved();
      setEdit(false);
    } catch (e) { setErr(String((e as Error).message)); }
    setBusy(false);
  };

  const upload = async (file: File) => {
    if (!email) return;
    setBusy(true); setErr(null);
    try {
      const url = await uploadExtraImage(item.id, file);
      await saveOverlay(item.id, { extra_images: [...(item.extra_images ?? []), url] }, email);
      onSaved();
    } catch (e) { setErr(String((e as Error).message)); }
    setBusy(false);
  };

  const removeImage = async (url: string) => {
    if (!email) return;
    setBusy(true); setErr(null);
    try {
      await saveOverlay(item.id, { extra_images: (item.extra_images ?? []).filter((u) => u !== url) }, email);
      onSaved();
    } catch (e) { setErr(String((e as Error).message)); }
    setBusy(false);
  };

  const uploadVid = async (file: File) => {
    if (!email) return;
    setBusy(true); setErr(null);
    try { setCoverVideo(await uploadCoverVideo(item.id, file)); }
    catch (e) { setErr(String((e as Error).message)); }
    setBusy(false);
  };

  const isManual = item.id.startsWith("manual-");
  const removeThisItem = async () => {
    if (!email || !isManual) return;
    if (!window.confirm(`'${item.client}' 항목을 완전히 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setBusy(true); setErr(null);
    try { await deleteItem(item.id); onSaved(); onClose(); }
    catch (e) { setErr(String((e as Error).message)); setBusy(false); }
  };

  return (
    <div className="dv-back" onClick={onClose}>
      <div className="dv" onClick={(e) => e.stopPropagation()}>
        <div className="dv-top">
          <span className="dv-brand">MADUP — Selected Work</span>
          <div className="dv-actions">
            {onToggleLike && email && (
              <button className={"dv-like" + (liked ? " liked" : "")} onClick={() => onToggleLike(item)} aria-label="좋아요">
                ♥ {likers.length > 0 && likers.length}
              </button>
            )}
            {staff && !edit && <button className="dv-btn" onClick={() => setEdit(true)}>✎ 편집</button>}
            <button className="dv-close" onClick={onClose} aria-label="닫기">✕</button>
          </div>
        </div>

        {!edit && (
          <>
            <div className="dv-head">
              <h1 className="dv-title">{detailTitle(item)}</h1>
              {detailSubtitle(item) && <div className="dv-subtitle">{detailSubtitle(item)}</div>}
              {detailDesc(item) && <p className="dv-desc">{detailDesc(item)}</p>}
              <div className="dv-meta">
                {item.year_month && <span className="dv-chip">{item.year_month}</span>}
                <span className="dv-chip">{SOURCE_TEAM_LABELS[item.source_team]}</span>
                {item.production_method && <span className="dv-chip">{item.production_method}</span>}
                {item.industry && <span className="dv-chip">{item.industry}</span>}
                {item.piece_count != null && <span className="dv-chip">{item.piece_count}편</span>}
                {item.is_bidding && <span className="dv-chip">비딩 제안</span>}
                {tagsOf(item).slice(0, 6).map((t) => <span key={t} className="dv-chip">#{t}</span>)}
                {(item.creators ?? []).map((c) => <span key={c} className="dv-chip">◇ {c}</span>)}
              </div>
            </div>

            {item.cover_video && (
              <div className="dv-video">
                <video src={item.cover_video} controls autoPlay muted loop playsInline
                  poster={item.cover_image ?? item.thumbnail ?? undefined} />
              </div>
            )}

            {gallery.length > 0 && (
              <div className="dv-gallery">
                {gallery.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt={item.client} loading="lazy" /></a>
                ))}
              </div>
            )}

            {(links.length > 0 || (item.asset_images?.length > 0 && item.thumbnail)) && (
              <div className="dv-links">
                <div className="lbl">상세 · 링크</div>
                <div className="row">
                  {links.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="dv-lbtn">{l.label} ↗</a>
                  ))}
                  {item.asset_images?.length > 0 && item.thumbnail && (
                    <a className="dv-lbtn ghost" href={item.thumbnail} target="_blank" rel="noreferrer">원본 슬라이드 ↗</a>
                  )}
                </div>
              </div>
            )}

            {email && onSocialChanged && <Comments item={item} email={email} onChanged={onSocialChanged} />}
            {staff && (
              <label className="dv-btn" style={{ cursor: "pointer", marginTop: 18, display: "inline-block" }}>
                이미지 추가
                <input type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
              </label>
            )}
          </>
        )}

        {edit && staff && (
          <div className="dv-edit">
            <div className="toggle-row">
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Showcase 외부 공개</div>
                <div className="hint">동의된 소재만 외부(비로그인)에 노출됩니다</div>
              </div>
              <button className={"dv-btn" + (approved ? " accent" : "")} onClick={() => setApproved(!approved)}>{approved ? "공개 중" : "비공개"}</button>
            </div>

            <div className="toggle-row" style={{ marginTop: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Featured Case Study</div>
                <div className="hint">{feat && !approved ? "⚠ 공개 승인해야 외부에 노출됩니다" : "메인 상단 Featured 섹션에 노출 (최대 5개)"}</div>
              </div>
              <button className={"dv-btn" + (feat ? " accent" : "")} onClick={() => setFeat(!feat)}>{feat ? "Featured" : "일반"}</button>
            </div>

            {feat && (
              <>
                <div className="field">
                  <label>순서 (1=히어로 · 2~5=타일)</label>
                  <select className="input" value={rank} onChange={(e) => setRank(e.target.value)}>
                    <option value="">순서 선택</option>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 1 ? "1 (히어로)" : `${n} (타일)`}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>헤드라인 (문제-해결 · *별표*는 이탤릭 강조)</label>
                  <input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="모델 계약 없이, *심의를 통과한* 건기식 캠페인" />
                </div>
                <div className="field">
                  <label>보조 카피 / 히어로 리드</label>
                  <textarea className="input" rows={2} value={subcopy} onChange={(e) => setSubcopy(e.target.value)} placeholder="한 줄 요약 (타일) 또는 리드 문단 (히어로)" />
                </div>
                <div className="field">
                  <label>키커 (히어로 · 익명화 가능)</label>
                  <input className="input" value={kicker} onChange={(e) => setKicker(e.target.value)} placeholder="Featured Case Study · 헬스케어 D사" />
                </div>
              </>
            )}

            <CoverEditor images={detailGallery(item)} cover={coverImg} setCover={setCoverImg} pos={coverPos} setPos={setCoverPos} zoom={coverZoom} setZoom={setCoverZoom} />

            <div className="field">
              <label>커버 동영상 (자동재생 · 선택)</label>
              {coverVideo ? (
                <div>
                  <video src={coverVideo} muted loop playsInline autoPlay style={{ width: 150, aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 8, background: "#000", display: "block" }} />
                  <button className="dv-btn" type="button" style={{ marginTop: 6 }} onClick={() => setCoverVideo("")}>동영상 제거</button>
                </div>
              ) : (
                <label className="dv-btn" style={{ cursor: "pointer", display: "inline-block" }}>
                  동영상 업로드 (mp4/webm)
                  <input type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadVid(f); }} />
                </label>
              )}
              <span className="hint">있으면 Featured 카드가 이 영상을 음소거 자동재생하고 그 위에 카피가 표시됩니다. (짧은 루프 권장)</span>
            </div>

            <div className="field">
              <label>타이틀 (상세 뷰 · 비우면 광고주명)</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={item.client} />
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
              <label>설명 (상세 소개)</label>
              <textarea className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={item.overview || "이 소재에 대한 설명"} />
            </div>
            <div className="field">
              <label>태그 (복수 입력)</label>
              <TagEditor tags={tags} setTags={setTags} />
            </div>
            <div className="field">
              <label>크리에이터 (쉼표로 구분)</label>
              <input className="input" value={creators} onChange={(e) => setCreators(e.target.value)} placeholder="홍길동, 김제작" />
            </div>
            <div className="field">
              <label>상세 링크 (라벨 · URL)</label>
              {linkRows.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input className="input" style={{ flex: "0 0 34%" }} placeholder="라벨 (예: 영상 보기)" value={r.label}
                    onChange={(e) => setLinkRows(linkRows.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                  <input className="input" style={{ flex: 1 }} placeholder="https://…" value={r.url}
                    onChange={(e) => setLinkRows(linkRows.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
                  <button className="dv-btn" type="button" onClick={() => setLinkRows(linkRows.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              <button className="dv-btn" type="button" onClick={() => setLinkRows([...linkRows, { label: "", url: "" }])}>+ 링크 추가</button>
              <span className="hint">비우면 영상 URL(자동)이 그대로 쓰입니다</span>
            </div>
            {(item.extra_images ?? []).length > 0 && (
              <div className="field">
                <label>추가 이미지 (클릭해서 삭제)</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                  {item.extra_images.map((u) => (
                    <button key={u} type="button" onClick={() => void removeImage(u)} disabled={busy}
                      style={{ padding: 0, border: "none", background: "none", cursor: "pointer", position: "relative" }}>
                      <img src={u} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                      <span style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,.6)", color: "#fff", borderRadius: "50%", width: 20, height: 20, fontSize: 12, lineHeight: "20px", textAlign: "center" }}>✕</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {err && <div className="err">{err}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="dv-btn accent" onClick={() => void save()} disabled={busy}>{busy ? "저장 중…" : "저장"}</button>
              <button className="dv-btn" onClick={() => setEdit(false)} disabled={busy}>취소</button>
              {isManual && <button className="dv-btn" style={{ marginLeft: "auto", color: "#ff6b81", borderColor: "rgba(255,107,129,.5)" }} onClick={() => void removeThisItem()} disabled={busy}>항목 삭제</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
