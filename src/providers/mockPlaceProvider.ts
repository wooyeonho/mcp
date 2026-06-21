import type { PlaceProvider, PlaceSuggestion, PlaceType } from "./types.js";
export class MockPlaceProvider implements PlaceProvider {
  async findAlongRoute(_origin: string, _destination: string, type: PlaceType): Promise<PlaceSuggestion[]> {
    const picked = type === "restaurant" ? { name: "혼밥하기 좋은 덮밥집", type, note: "역에서 가깝고 회전이 빠름", extraMinutes: 12 } : { name: "조용한 골목 카페", type: type === "any" ? "cafe" : type, note: "집 가는 방향에서 작은 우회", extraMinutes: 6 };
    return [picked];
  }
}
