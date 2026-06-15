"""dedup 핵심: 블로킹 → 스코어링 → Union-Find → canonical 선정 (data-model.md §6-D).

비파괴·증분: 기존 dedup_group_id 멤버십은 보존하고(그룹 해제는 수동 영역),
새 쌍 병합과 canonical 선정만 배치마다 재평가한다 — AC-010(마감 시 승격)의 전제.
"""
from collections import defaultdict
from dataclasses import dataclass
from datetime import date

from ingest.dedup.keys import norm_org, norm_title, veto_tokens
from ingest.dedup.similarity import trigram_similarity

# 임계값은 튜닝 대상 상수 (ingest.md 규칙 5). 오합치 > 놓침 — 보수적으로.
SIMILARITY_THRESHOLD = 0.85
TITLE_WEIGHT = 0.6
ORGANIZATION_WEIGHT = 0.25
PERIOD_WEIGHT = 0.15

KSTARTUP_SOURCE = "k-startup"

# 실데이터 표본 검수(2026-06-12)에서 같은 시리즈의 다른 트랙(분야·지역·파트너 한 단어 차이)이
# 임계값을 넘는 오합치로 확인됨 → 토큰 차집합에 아래 외의 실질 토큰이 있으면 병합 금지 (PRD §11-8 튜닝)
IGNORABLE_DIFFERENCE_TOKENS = frozenset({"모집", "공고", "공모", "안내", "수정", "재공고", "연장", "변경", "추가"})


@dataclass(frozen=True)
class DedupRecord:
    record_id: int
    source: str
    norm_title: str
    veto_tokens: frozenset[str]
    norm_org: str | None
    region: str | None
    start_date: date | None
    deadline: date | None
    always_open: bool
    info_count: int
    group_id: int | None


@dataclass(frozen=True)
class Assignment:
    record_id: int
    group_id: int | None
    canonical: bool


def record_of(row: tuple) -> DedupRecord:
    """db.fetch_dedup_rows 행 → DedupRecord (정규화 키 계산 포함)."""
    (record_id, source, title, organization, region, start_date, deadline,
     always_open, info_count, group_id) = row
    return DedupRecord(
        record_id=record_id,
        source=source,
        norm_title=norm_title(title),
        veto_tokens=veto_tokens(title),
        norm_org=norm_org(organization),
        region=region,
        start_date=start_date,
        deadline=deadline,
        always_open=always_open,
        info_count=info_count,
        group_id=group_id,
    )


def pair_score(left: DedupRecord, right: DedupRecord) -> float:
    """0.6·제목 유사도 + 0.25·기관 일치 + 0.15·기간(시작일) 일치 (§6-D 규칙 3)."""
    title_score = trigram_similarity(left.norm_title, right.norm_title)
    organization_score = 0.0
    if left.norm_org is not None and left.norm_org == right.norm_org:
        organization_score = 1.0
    period_score = 0.0
    if left.start_date is not None and left.start_date == right.start_date:
        period_score = 1.0
    return TITLE_WEIGHT * title_score + ORGANIZATION_WEIGHT * organization_score + PERIOD_WEIGHT * period_score


def build_assignments(records: list[DedupRecord], today: date) -> list[Assignment]:
    parent = {record.record_id: record.record_id for record in records}
    _seed_existing_groups(records, parent)
    for block in _blocks_by_deadline(records).values():
        _union_similar_pairs(block, parent)
    assignments: list[Assignment] = []
    for members in _groups_of(records, parent).values():
        assignments.extend(_assign_group(members, today))
    return assignments


def _seed_existing_groups(records: list[DedupRecord], parent: dict[int, int]) -> None:
    """기존 그룹을 '재검증 후' 유지한다 — 무조건 보존하지 않는다.

    마감일이 갱신돼 블로킹(마감일 기준)이 갈라놓은 같은 공고는 다시 묶어 AC-010 승격을 살리되,
    제목·기관이 실제로 달라져 더는 같은 공고가 아니게 된 stale 그룹은 자연히 해제한다.
    (블로킹을 건너뛰고 직접 동일성 판정 — 기존 멤버 쌍은 수가 적어 비용도 작다.)
    """
    members_by_group: dict[int, list[DedupRecord]] = defaultdict(list)
    for record in records:
        if record.group_id is not None:
            members_by_group[record.group_id].append(record)
    for members in members_by_group.values():
        _reunion_still_similar(members, parent)


def _reunion_still_similar(members: list[DedupRecord], parent: dict[int, int]) -> None:
    for index, left in enumerate(members):
        for right in members[index + 1:]:
            if _is_same_announcement(left, right):
                _union(parent, left.record_id, right.record_id)


def _blocks_by_deadline(records: list[DedupRecord]) -> dict[date, list[DedupRecord]]:
    """마감일 동일 그룹 내에서만 쌍 비교 (N² 방지). 마감일 없는 레코드는 신규 병합 제외 — 오합치 > 놓침."""
    blocks: dict[date, list[DedupRecord]] = defaultdict(list)
    for record in records:
        if record.deadline is not None:
            blocks[record.deadline].append(record)
    return blocks


def _union_similar_pairs(block: list[DedupRecord], parent: dict[int, int]) -> None:
    for index, left in enumerate(block):
        for right in block[index + 1:]:
            if _is_same_announcement(left, right):
                _union(parent, left.record_id, right.record_id)


def _is_same_announcement(left: DedupRecord, right: DedupRecord) -> bool:
    if _region_conflict(left, right):
        return False
    if has_substantive_difference(left.veto_tokens, right.veto_tokens):
        return False
    return pair_score(left, right) >= SIMILARITY_THRESHOLD


def _region_conflict(left: DedupRecord, right: DedupRecord) -> bool:
    """둘 다 지역이 있고 서로 다르면 다른 공고 — '[서울] OO'/'[부산] OO' 오합치 방지 (Codex 재리뷰).

    norm_title이 [지역] 접두를 제거하고 score가 region을 보지 않으므로, 지역만 다른 변형이
    같은 기관·기간으로 묶일 수 있다. 한쪽 region이 NULL(온통청년 복수지역 등)이면 비교하지 않는다.
    """
    return left.region is not None and right.region is not None and left.region != right.region


def has_substantive_difference(left_tokens: frozenset[str], right_tokens: frozenset[str]) -> bool:
    """토큰 차집합에 무시 가능 토큰 외의 것이 있으면 다른 공고로 판정 — 경계 케이스는 합치지 않는다 (AC-008)."""
    difference = left_tokens.symmetric_difference(right_tokens)
    return bool(difference - IGNORABLE_DIFFERENCE_TOKENS)


def _groups_of(records: list[DedupRecord], parent: dict[int, int]) -> dict[int, list[DedupRecord]]:
    groups: dict[int, list[DedupRecord]] = defaultdict(list)
    for record in records:
        groups[_find(parent, record.record_id)].append(record)
    return groups


def _assign_group(members: list[DedupRecord], today: date) -> list[Assignment]:
    if len(members) == 1:
        return [Assignment(members[0].record_id, None, True)]
    group_id = min(member.record_id for member in members)
    canonical_id = _pick_canonical(members, today).record_id
    return [
        Assignment(member.record_id, group_id, member.record_id == canonical_id)
        for member in members
    ]


def _pick_canonical(members: list[DedupRecord], today: date) -> DedupRecord:
    """진행 중 우선(AC-010) → K-Startup 우선 → 정보량 → id 안정 정렬 (§6-D 규칙 5)."""
    return max(
        members,
        key=lambda record: (
            _is_open(record, today),
            record.source == KSTARTUP_SOURCE,
            record.info_count,
            -record.record_id,
        ),
    )


def _is_open(record: DedupRecord, today: date) -> bool:
    return record.always_open or (record.deadline is not None and record.deadline >= today)


def _find(parent: dict[int, int], node: int) -> int:
    root = node
    while parent[root] != root:
        root = parent[root]
    while parent[node] != root:
        parent[node], node = root, parent[node]
    return root


def _union(parent: dict[int, int], left: int, right: int) -> None:
    parent[_find(parent, right)] = _find(parent, left)
