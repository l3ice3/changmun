import Link from "next/link";

interface Props {
  basePath: string;
  params: Record<string, string>;
  page: number;
  totalPages: number;
}

// 페이지 번호 + ?page=N 고유 URL (SEO·CC-07). 무한스크롤 금지 (web.md 규칙 3).
const WINDOW = 5;

export function Pagination({ basePath, params, page, totalPages }: Props) {
  if (totalPages <= 1) return null;

  const start = Math.max(1, Math.min(page - 2, totalPages - WINDOW + 1));
  const end = Math.min(totalPages, start + WINDOW - 1);
  const numbers = range(start, end);

  function href(target: number): string {
    const query = new URLSearchParams(params);
    query.set("page", String(target));
    return `${basePath}?${query.toString()}`;
  }

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="페이지">
      {page > 1 ? (
        <PageLink href={href(page - 1)} label="이전" />
      ) : null}
      {numbers.map((number) => (
        <Link
          key={number}
          href={href(number)}
          aria-current={number === page ? "page" : undefined}
          className={`tnum press grid h-9 min-w-9 place-items-center rounded-lg px-2 text-[13px] ${
            number === page
              ? "btn-sheen font-medium text-white"
              : "border border-line text-secondary hover:border-edge"
          }`}
        >
          {number}
        </Link>
      ))}
      {page < totalPages ? (
        <PageLink href={href(page + 1)} label="다음" />
      ) : null}
    </nav>
  );
}

function PageLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="press grid h-9 place-items-center rounded-lg border border-line px-3 text-[13px] text-secondary hover:border-edge"
    >
      {label}
    </Link>
  );
}

function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let value = start; value <= end; value += 1) {
    result.push(value);
  }
  return result;
}
