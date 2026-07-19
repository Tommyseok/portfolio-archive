import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isMadupEmail } from "./supabase";
import type { Item } from "../types";

/** 인증 세션 훅 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  const isStaff = isMadupEmail(session?.user?.email);
  return { session, isStaff, ready };
}

/**
 * 아이템 로드 훅. RLS 가 가시성을 통제:
 * 비로그인 → showcase 승인 건만, 매드업 계정 → 전체.
 */
export function useItems(deps: unknown[] = []) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    // supabase 기본 1000행 제한 — 명시적으로 범위 확장
    const { data, error } = await supabase
      .from("credential_items")
      .select("*")
      .order("year_month", { ascending: false, nullsFirst: false })
      .range(0, 4999);
    if (error) setError(error.message);
    setItems((data as Item[]) ?? []);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void reload(); }, deps);
  return { items, loading, error, reload };
}

/* ── 소셜 레이어: 좋아요·코멘트 (매드업 구성원 전용) ── */

export interface SocialState {
  likes: Record<string, string[]>;        // item_id → 좋아요 누른 이메일들
  commentCounts: Record<string, number>;  // item_id → 코멘트 수
}

export function useSocial(deps: unknown[] = []) {
  const [social, setSocial] = useState<SocialState>({ likes: {}, commentCounts: {} });

  const reloadSocial = useCallback(async () => {
    const [lk, cm] = await Promise.all([
      supabase.from("credential_likes").select("item_id,user_email").range(0, 9999),
      supabase.from("credential_comments").select("item_id").range(0, 9999),
    ]);
    const likes: Record<string, string[]> = {};
    for (const r of lk.data ?? []) (likes[r.item_id] ??= []).push(r.user_email);
    const commentCounts: Record<string, number> = {};
    for (const r of cm.data ?? []) commentCounts[r.item_id] = (commentCounts[r.item_id] ?? 0) + 1;
    setSocial({ likes, commentCounts });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void reloadSocial(); }, deps);
  return { social, reloadSocial };
}

export async function toggleLike(itemId: string, email: string, liked: boolean) {
  const { error } = liked
    ? await supabase.from("credential_likes").delete().eq("item_id", itemId).eq("user_email", email)
    : await supabase.from("credential_likes").insert({ item_id: itemId, user_email: email });
  if (error) throw new Error(error.message);
}

export interface CommentRow {
  id: string;
  item_id: string;
  author_email: string;
  body: string;
  created_at: string;
}

export async function fetchComments(itemId: string): Promise<CommentRow[]> {
  const { data, error } = await supabase
    .from("credential_comments")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as CommentRow[]) ?? [];
}

export async function addComment(itemId: string, email: string, body: string) {
  const { error } = await supabase
    .from("credential_comments")
    .insert({ item_id: itemId, author_email: email, body });
  if (error) throw new Error(error.message);
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from("credential_comments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** 공개 토글 — 누가 전환했는지는 DB 트리거가 credential_publish_log 에 자동 기록 */
export async function togglePublish(item: Pick<Item, "id" | "showcase_approved">, email: string) {
  await saveOverlay(item.id, { showcase_approved: !item.showcase_approved }, email);
}

/** 편집 레이어 저장 */
export async function saveOverlay(
  id: string,
  patch: Partial<Pick<Item,
    | "custom_description" | "custom_tags" | "extra_images" | "creators" | "showcase_approved"
    | "media_type" | "format" | "production_method" | "production_team"
    | "is_featured" | "featured_rank" | "featured_headline" | "featured_subcopy"
    | "featured_kicker" | "featured_cover" | "custom_title" | "custom_links"
    | "cover_image" | "cover_position" | "cover_zoom" | "cover_video" | "detail_video" | "card_media">>,
  email: string,
) {
  const { error } = await supabase
    .from("credential_items")
    .update({ ...patch, updated_by: email, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Featured 순서 중복 검사 — 같은 rank 를 쓰는 다른 featured 항목이 있으면 true */
export async function featuredRankConflict(rank: number, exceptId: string): Promise<boolean> {
  const { data } = await supabase
    .from("credential_items").select("id")
    .eq("is_featured", true).eq("featured_rank", rank).neq("id", exceptId).limit(1);
  return (data?.length ?? 0) > 0;
}

// Supabase 스토리지 키는 ASCII 안전 문자만 허용 — 한글 등은 치환 (id에 한글 포함되는 덱 항목 대응)
const safeSeg = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

/** 추가 이미지 업로드 → 공개 URL 반환 */
export async function uploadExtraImage(itemId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${safeSeg(itemId)}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("credential-images").upload(path, file);
  if (error) throw new Error(error.message);
  return supabase.storage.from("credential-images").getPublicUrl(path).data.publicUrl;
}

/** 커버/상세 동영상 업로드 → 공개 URL 반환 (재생용 mp4/webm) */
export async function uploadCoverVideo(itemId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "mp4";
  const path = `videos/${safeSeg(itemId)}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("credential-images").upload(path, file, { contentType: file.type || "video/mp4" });
  if (error) throw new Error(error.message);
  return supabase.storage.from("credential-images").getPublicUrl(path).data.publicUrl;
}

/** 새 항목 생성 (스태프 직접 등록) → 생성된 id 반환. Explore/Featured 공용 행. */
export async function createItem(fields: { client: string; title?: string; overview?: string; media_type?: string | null; format?: string | null }, email: string): Promise<Item> {
  const id = `manual-${crypto.randomUUID()}`;
  const client = fields.client.trim();
  const row = {
    id, source_team: "MANUAL", source_slide_id: id,
    client, client_raw: client, client_matched: false,
    industry: null, category_group: null, advertiser_type: null, advertiser_status: "unmatched",
    is_bidding: false, title: fields.title?.trim() || client, overview: fields.overview?.trim() || "",
    year_month: null, media_type: fields.media_type ?? null, format: fields.format ?? null,
    content_type: [], production_team: null, production_method: null, tools: [], team: null,
    video_urls: [], asset_images: [], thumbnail: null, ai_used: false,
    period_start: null, period_end: null, in_house: null, piece_count: null,
    appeal_points: [], keywords: [], search_summary: "", ai_confidence: null,
    custom_description: null, custom_tags: [], extra_images: [], creators: [],
    showcase_approved: false, is_featured: false, updated_by: email,
  };
  const { error } = await supabase.from("credential_items").insert(row);
  if (error) throw new Error(error.message);
  return row as unknown as Item;
}

/** 수동 생성 항목 삭제 (manual-* 만, RLS 로도 강제) */
export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("credential_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
