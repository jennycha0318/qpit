import Link from "next/link";

export const metadata = { title: "개인정보처리방침 — Pacemaker" };

export default function PrivacyPage() {
  return (
    <div className="pt-4 pb-8">
      <Link href="/" className="text-sm text-muted">← 처음으로</Link>
      <h1 className="mb-1.5 mt-2 text-[24px] font-bold tracking-tight">개인정보처리방침</h1>
      <p className="mb-6 text-[13px] text-muted">
        초안입니다. 정식 서비스 전 법률 검토가 필요합니다.
      </p>

      <Section title="1. 수집하는 항목">
        <ul className="list-disc pl-5">
          <li>계정: 이메일, 닉네임(이름). Google 가입 시 Google 계정의 표시 이름</li>
          <li>진단 입력: 관계 상황·성향 응답, 자유서술 텍스트</li>
          <li>진단 결과 및 생성 시각</li>
        </ul>
      </Section>

      <Section title="2. 수집·이용 목적">
        <ul className="list-disc pl-5">
          <li>연애 타이밍 진단 제공 및 진단 히스토리 저장</li>
          <li>서비스 개선 및 추후 AI 기반 개인화 분석(자유서술 포함)</li>
        </ul>
      </Section>

      <Section title="3. 보유 및 이용 기간">
        <p>회원 탈퇴 시까지 보관하며, 탈퇴 시 지체 없이 파기합니다. 관련 법령이 정한 경우 해당 기간 동안 보관합니다.</p>
      </Section>

      <Section title="4. 처리 위탁">
        <p>서비스 운영을 위해 아래에 처리를 위탁합니다.</p>
        <ul className="list-disc pl-5">
          <li>인증·데이터베이스: Supabase</li>
          <li>호스팅: Vercel</li>
        </ul>
      </Section>

      <Section title="5. 민감정보 안내">
        <p>연애 상황은 민감한 정보일 수 있습니다. 자유서술에는 식별 가능한 제3자 정보나 과도한 사적 정보를 적지 않기를 권장합니다.</p>
      </Section>

      <Section title="6. 이용자의 권리">
        <p>본인 정보의 열람·수정·삭제 및 동의 철회(회원 탈퇴)를 요청할 수 있습니다.</p>
      </Section>

      <Section title="7. 문의">
        <p>개인정보 관련 문의: (담당자 이메일 입력 예정)</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="mb-1.5 text-[15px] font-bold">{title}</h2>
      <div className="text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}
