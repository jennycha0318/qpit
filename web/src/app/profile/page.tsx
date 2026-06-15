import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { count } = await supabase
    .from("diagnoses")
    .select("*", { count: "exact", head: true });

  const name = (user?.user_metadata?.name as string) || "-";
  const provider = user?.app_metadata?.provider === "google" ? "Google 계정" : "이메일";

  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex justify-between border-b border-line py-3 text-sm last:border-0">
      <span className="text-muted">{k}</span>
      <b>{v}</b>
    </div>
  );

  return (
    <div>
      <h2 className="mb-4 text-[23px] font-bold tracking-tight">내 프로필</h2>
      <div className="card">
        <Row k="이름" v={name} />
        <Row k="이메일" v={user?.email ?? "-"} />
        <Row k="로그인 방식" v={provider} />
        <Row k="진단 횟수" v={`${count ?? 0}회`} />
      </div>
      <SignOutButton />
    </div>
  );
}
