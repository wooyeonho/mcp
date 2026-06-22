import type { WeatherContext } from "./types.js";

// Open-Meteo: completely free, no API key needed, real-time Seoul weather
export async function fetchSeoulWeather(): Promise<WeatherContext> {
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=37.5665&longitude=126.9780" +
      "&current=precipitation,rain,snowfall" +
      "&timezone=Asia%2FSeoul";
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return "clear";
    const data = (await res.json()) as {
      current: { rain: number; snowfall: number; precipitation: number };
    };
    const { rain = 0, snowfall = 0, precipitation = 0 } = data.current;
    if (snowfall > 0) return "snow";
    if (rain > 0 || precipitation > 0.1) return "rain";
    return "clear";
  } catch {
    return "clear";
  }
}
