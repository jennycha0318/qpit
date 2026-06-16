"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function signOut() {
    setErr("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        setErr("로그아웃에 실패했어요. 다시 시도해 주세요.");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setErr("로그아웃에 실패했어요. 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn btn-ghost mt-[18px]" onClick={signOut} disabled={loading}>
        {loading ? "로그아웃 중…" : "로그아웃"}
      </button>
      {err && <p className="mt-2 text-center text-[13px] text-bad">{err}</p>}
    </div>
  );
}
