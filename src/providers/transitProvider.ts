import type { GoodRouteRequest, GoodRouteSuggestion, RouteOption, RouteProvider, RouteRequest } from "./types.js";

export class OptionalTransitProvider implements RouteProvider {
  constructor(private readonly apiKey?: string) {}
  async getRouteOptions(_req: RouteRequest): Promise<RouteOption[]> {
    if (!this.apiKey) return [];
    throw new Error("Transit provider is optional and not implemented in the mock-first MVP.");
  }
  async getGoodRoute(_req: GoodRouteRequest): Promise<GoodRouteSuggestion> {
    throw new Error("Good-route provider is optional and not implemented in the mock-first MVP.");
  }
}
