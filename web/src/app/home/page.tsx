import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// 홈 대시보드는 하단 탭(진단/히스토리/프로필)으로 대체됨 → 진단 탭으로 이동
export default function HomePage() {
  redirect("/diagnose");
}
