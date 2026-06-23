import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { BookmarkButton } from "@/components/BookmarkButton";
import { DDay } from "@/components/DDay";
import { DetailViewTracker } from "@/components/DetailViewTracker";
import { ErrorState } from "@/components/ErrorState";
import { GlossaryText } from "@/components/GlossaryText";
import { OutboundLink } from "@/components/OutboundLink";
import { fetchOpportunity, type OpportunityDetail } from "@/lib/api";
import { periodLabel, sourceLabel, targetLabels } from "@/lib/labels";

// 상세는 SSG/ISR — 재생성 주기 = 수집 주기(일 1회) 동기 (PRD 오픈이슈 7). SEO 핵심 페이지.
export const revalidate = 86400;

interface Params {
  params: Promise<{ id: string }>;
}

async function loadOpportunity(id: string): Promise<OpportunityDetail | null> {
  try {
    return await fetchOpportunity(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const opportunity = await loadOpportunity(id);
  if (!opportunity) return { title: "공고" };
  const description = (
    opportunity.summary ??
    opportunity.eligibilityDetail ??
    `${opportunity.organization ?? ""} ${opportunity.title}`
  ).slice(0, 150);
  return {
    title: opportunity.title,
    description,
    openGraph: { title: opportunity.title, description },
  };
}

export default async function DetailPage({ params }: Params) {
  const { id } = await params;
  let opportunity: OpportunityDetail | null = null;
  let failed = false;
  try {
    opportunity = await fetchOpportunity(id);
  } catch {
    failed = true;
  }
  if (failed) {
    return (
      <div className="mx-auto max-w-[760px] px-3.5 py-12">
        <ErrorState retryHref={`/opportunities/${id}`} />
      </div>
    );
  }
  if (!opportunity) notFound();

  const closed = opportunity.status === "CLOSED";
  const targets = targetLabels(
    opportunity.targetStartupStage,
    opportunity.targetAudienceType,
  );
  const organization = opportunity.organization ?? "주관기관 미상";

  return (
    <article className="mx-auto max-w-[760px] px-3.5 py-7">
      <DetailViewTracker opportunityId={opportunity.id} />

      {closed ? (
        <div className="mb-4 rounded-lg bg-surface px-4 py-2.5 text-[13px] font-medium text-secondary">
          마감된 공고입니다. 다음 차수·유사 공고를 둘러보세요.
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {opportunity.badges.map((code) => (
            <Badge key={code} code={code} />
          ))}
        </div>
        <BookmarkButton id={opportunity.id} />
      </div>

      <div className="mt-3 flex items-center gap-2 text-[13px] text-muted">
        <span className="grid h-5 w-5 place-items-center rounded bg-surface-blue text-[11px] font-medium text-accent">
          {organization.charAt(0)}
        </span>
        <span>{organization}</span>
        {opportunity.organizationType ? (
          <span className="text-dim">· {opportunity.organizationType}</span>
        ) : null}
      </div>

      <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight">
        {opportunity.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
        {opportunity.category ? (
          <span className="rounded-[5px] bg-surface-blue px-2 py-0.5 text-[11px] text-accent">
            {opportunity.category}
          </span>
        ) : null}
        {opportunity.region?.length ? (
          <span className="text-secondary">{opportunity.region.join(", ")}</span>
        ) : null}
        <span className="text-muted">{sourceLabel(opportunity.source)}</span>
        <span className="tnum text-secondary">
          {periodLabel(opportunity.applicationStartDate, opportunity.applicationDeadline)}
        </span>
        <DDay item={opportunity} />
      </div>

      <Section title="누가 신청할 수 있나요">
        {targets.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {targets.map((label) => (
              <span
                key={label}
                className="rounded-full bg-surface px-2.5 py-1 text-[12px] text-secondary"
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted">
            대상 조건이 공고에 명시돼 있지 않아요(조건 미상). 자세한 자격은 원문을 확인하세요.
          </p>
        )}
        <p className="mt-2.5 text-[12px] text-muted">
          조건에 맞으면 신청 자격이 됩니다. 합격 여부는 별개예요.
        </p>
      </Section>

      {opportunity.eligibilityDetail ? (
        <Section title="신청 자격">
          <GlossaryText
            text={opportunity.eligibilityDetail}
            terms={opportunity.matchedTerms}
            className="text-[14px] text-secondary"
          />
        </Section>
      ) : null}

      {opportunity.summary ? (
        <Section title="지원 내용">
          <GlossaryText
            text={opportunity.summary}
            terms={opportunity.matchedTerms}
            className="text-[14px] text-secondary"
          />
          {opportunity.supportAmount ? (
            <p className="tnum mt-3 text-[14px] font-medium text-ink">
              지원 규모 · {opportunity.supportAmount}
            </p>
          ) : null}
        </Section>
      ) : null}

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        {opportunity.applyUrl ? (
          <OutboundLink
            href={opportunity.applyUrl}
            opportunityId={opportunity.id}
            linkType="apply"
            primary
          >
            신청하기
          </OutboundLink>
        ) : null}
        <OutboundLink
          href={opportunity.detailUrl}
          opportunityId={opportunity.id}
          linkType="detail"
          primary={opportunity.applyUrl === null}
        >
          공고 원문 보기
        </OutboundLink>
      </div>

      {opportunity.otherSources.length > 0 ? (
        <p className="mt-5 text-[12px] text-muted">
          다른 출처에서도 게재:{" "}
          {opportunity.otherSources.map((other, index) => (
            <span key={other.detailUrl}>
              {index > 0 ? ", " : ""}
              <a
                href={other.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2"
              >
                {sourceLabel(other.source)}
              </a>
            </span>
          ))}
        </p>
      ) : null}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 border-t border-hair pt-5">
      <h2 className="text-[13px] font-medium text-muted">{title}</h2>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}
