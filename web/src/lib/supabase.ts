import { createClient } from "@supabase/supabase-js";

// anon 키는 공개용 키 (RLS 가 접근을 통제) — Vercel 환경변수로 덮어쓰기 가능
const URL = import.meta.env.VITE_SUPABASE_URL ?? "https://nfwpdowrggvwbxroyury.supabase.co";
const ANON =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5md3Bkb3dyZ2d2d2J4cm95dXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODM4MzgsImV4cCI6MjA5NjU1OTgzOH0.4LUirIQF4Tt_wk1XmZOGV9LNx3gb71qeTJgjjCNqYUk";

export const supabase = createClient(URL, ANON);

export const isMadupEmail = (email?: string | null) => !!email && email.endsWith("@madup.com");

// 접속 로그 등 관리자 전용 기능 열람 허용 이메일 (RLS is_credential_admin() 와 동일하게 유지)
export const ADMIN_EMAILS = ["jwsuk@madup.com"];
export const isAdminEmail = (email?: string | null) => !!email && ADMIN_EMAILS.includes(email);
