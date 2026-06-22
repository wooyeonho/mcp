export type RouteMode = "subway" | "bus" | "taxi";

export interface RouteRequest { origin: string; destination: string; includeTaxi?: boolean; arrivalBy?: Date; weather?: "rain"; }
export interface RouteOption {
  mode: RouteMode;
  durationMinutes: number;
  line?: string;
  direction?: string;
  busNumber?: string;
  boardAt: string;
  alightAt: string;
  firstWalkMinutes: number;
  lastWalkMinutes: number;
  crossingsToStop?: number;
  crossingsFromStop?: number;
  fareKrw?: number;
  taxiFareKrw?: number;
  missedFallback?: string;
}
export interface GoodRouteRequest { origin: string; destination: string; mood?: string; placeType?: PlaceType; maxExtraMinutes?: number; }
export type PlaceType = "cafe" | "restaurant" | "walk" | "dessert" | "any";
export interface GoodRouteSuggestion { concept: string; stopBy: string; detour: string; extraMinutesRange: [number, number]; reason: string; finalAction: string; }
export interface RouteProvider { getRouteOptions(req: RouteRequest): Promise<RouteOption[]>; getGoodRoute(req: GoodRouteRequest): Promise<GoodRouteSuggestion>; }
export interface PlaceSuggestion { name: string; type: PlaceType; note: string; extraMinutes: number; }
export interface PlaceProvider { findAlongRoute(origin: string, destination: string, type: PlaceType): Promise<PlaceSuggestion[]>; }
