import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

// 창문 web 린트 = 계산적 센서.
// 산문 규칙(.claude/rules/web.md)에 적힌 것 중 "기계로 셀 수 있는 것"만 여기에 인코딩한다.
// 셀 수 없는 것(서버 계산값 렌더만·SEO 판단 등)은 리뷰 B그룹에 남긴다 — docs/rules/review.md.
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  {
    rules: {
      // [절대규칙 9 · AC-015] 합격 보장 카피 금지.
      // hook(guardrail-lint.sh)은 에이전트 편집만 잡는다 — 사람 편집은 여기서 잡힌다.
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/받을 수 있/]",
          message:
            "[AC-015] 합격 보장 표현 금지. '신청 자격이 됩니다 / 합격 여부는 별개' 기준으로 쓴다.",
        },
        {
          selector: "JSXText[value=/받을 수 있/]",
          message:
            "[AC-015] 합격 보장 표현 금지. '신청 자격이 됩니다 / 합격 여부는 별개' 기준으로 쓴다.",
        },
        {
          selector: "TemplateElement[value.raw=/받을 수 있/]",
          message:
            "[AC-015] 합격 보장 표현 금지. '신청 자격이 됩니다 / 합격 여부는 별개' 기준으로 쓴다.",
        },
      ],
    },
  },
];

export default eslintConfig;
