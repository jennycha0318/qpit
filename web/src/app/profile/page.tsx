import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { ProfileEditor } from "@/components/ProfileEditor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login"); // 미들웨어 외 2차 방어
  const { count, error: countErr } = await supabase
    .from("diagnoses")
    .select("*", { count: "exact", head: true });

  const name = (user?.user_metadata?.name as string) || "-";
  const provider = user?.app_metadata?.provider === "google" ? "Google 계정" : "이메일";
  const countText = countErr ? "-" : `${count ?? 0}회`;

  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex justify-between border-b border-line py-3 text-sm last:border-0">
      <span className="text-muted">{k}</span>
      <b>{v}</b>
    </div>
  );

  return (
    <div>
      <h2 className="mb-4 text-[26px] font-bold tracking-tight">내 프로필</h2>
      <div className="card mb-4">
        <Row k="이름" v={name} />
        <Row k="이메일" v={user?.email ?? "-"} />
        <Row k="로그인 방식" v={provider} />
        <Row k="진단 횟수" v={countText} />
      </div>
      <p className="mb-4 -mt-1.5 px-1 text-[12.5px] text-muted">이름·이메일·로그인 방식은 변경할 수 없어요.</p>

      <ProfileEditor />

      <div className="mt-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">계정 관리</p>
        <SignOutButton />
      </div>
    </div>
  );
}
