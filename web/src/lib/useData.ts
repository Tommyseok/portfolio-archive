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

/** 편집 레이어 저장 */
export async function saveOverlay(
  id: string,
  patch: Partial<Pick<Item, "custom_description" | "custom_tags" | "extra_images" | "creators" | "showcase_approved" | "media_type" | "format" | "production_method">>,
  email: string,
) {
  const { error } = await supabase
    .from("credential_items")
    .update({ ...patch, updated_by: email, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** 추가 이미지 업로드 → 공개 URL 반환 */
export async function uploadExtraImage(itemId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${itemId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("credential-images").upload(path, file);
  if (error) throw new Error(error.message);
  return supabase.storage.from("credential-images").getPublicUrl(path).data.publicUrl;
}
