import { useState } from "react";
import { supabase } from "../lib/supabase";

export function LoginGate({ reason }: { reason?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendLink = async () => {
    setErr(null);
    if (!email.endsWith("@madup.com")) {
      setErr("매드업 계정(@madup.com)만 접속할 수 있습니다.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/explore" },
    });
    if (error) setErr(error.message);
    else setSent(true);
    setBusy(false);
  };

  return (
    <div className="container" style={{ maxWidth: 460, padding: "90px 20px" }}>
      <h1 style={{ fontSize: 30, letterSpacing: "-0.04em", margin: 0 }}>팀 로그인</h1>
      <p style={{ color: "var(--ink-2)", marginTop: 8 }}>
        {reason ?? "Explore와 Directory는 매드업 구성원만 볼 수 있습니다."}
      </p>
      {sent ? (
        <div className="toggle-row" style={{ marginTop: 20 }}>
          <div>
            <div style={{ fontWeight: 700 }}>메일함을 확인해주세요</div>
            <div className="hint">{email} 로 로그인 링크를 보냈습니다.</div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          <div className="field">
            <label>회사 이메일</label>
            <input className="input" type="email" value={email} placeholder="name@madup.com"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void sendLink(); }} />
            <span className="hint">입력한 주소로 1회용 로그인 링크가 발송됩니다.</span>
          </div>
          {err && <div className="err" style={{ marginBottom: 10 }}>{err}</div>}
          <button className="btn" onClick={() => void sendLink()} disabled={busy || !email}>
            {busy ? "발송 중…" : "로그인 링크 받기"}
          </button>
        </div>
      )}
    </div>
  );
}
