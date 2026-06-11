// S1 메인(페르소나 탭 + 공고 리스트)은 FR-003에서 구현한다.
// 계약: docs/screens.md S1 · docs/api-spec.md §1 · 규칙: .claude/rules/web.md
export default function Home() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">창문</h1>
      <p className="mt-2 text-gray-600">
        스캐폴딩 화면 — 메인 리스트(S1)는 FR-003에서 구현됩니다.
      </p>
    </main>
  );
}
