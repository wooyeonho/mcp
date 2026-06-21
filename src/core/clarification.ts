export type MissingField = "homeWork" | "home" | "work" | "origin" | "destination";
export function askClarification(missing: MissingField, context?: string): string {
  if (missing === "homeWork") return `${context ?? "길"}을 찾으려면 집과 회사 위치가 필요합니다.\n처음 한 번만 이렇게 알려주세요.\n예: '집은 신림역 근처, 회사는 강남역 근처야'`;
  if (missing === "home") return "집 가는 방향을 추천하려면 집 위치가 필요합니다.\n예: '집은 신림역 근처야'";
  if (missing === "work") return "회사 기준 길을 찾으려면 회사 위치가 필요합니다.\n예: '회사는 강남역 근처야'";
  if (missing === "destination") return "어디까지 가야 하는지 알려주세요.\n\n예:\n- 강남역 3시까지\n- 홍대입구 빨리\n- 서울성모병원 20분 안에";
  return "출발지를 알려주세요.\n\n예:\n- 회사에서 강남역 빨리\n- 집에서 강남역 빨리\n- 신림역에서 강남역 빨리";
}
