import type { PlaceProvider, PlaceSuggestion, PlaceType } from "./types.js";

export class KakaoLocalProvider implements PlaceProvider {
  constructor(private readonly apiKey?: string) {}
  async findAlongRoute(_origin: string, _destination: string, _type: PlaceType): Promise<PlaceSuggestion[]> {
    if (!this.apiKey) return [];
    throw new Error("Kakao Local provider is optional and not implemented in the mock-first MVP.");
  }
}
