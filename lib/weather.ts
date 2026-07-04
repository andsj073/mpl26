// Open-Meteo: gratis, ingen nyckel. Fasta koordinater för Montpellier.
// Prognosen täcker max 16 dagar framåt — dagar bortom det får null.

const LAT = 43.62;
const LNG = 3.87;

export type DailyWeather = {
  date: string;
  tempMax: number;
  tempMin: number;
  weathercode: number;
};

export async function getForecast(): Promise<Map<string, DailyWeather>> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
    `&forecast_days=16&timezone=Europe%2FParis`;

  const map = new Map<string, DailyWeather>();
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return map;
    const data = await res.json();
    const d = data.daily;
    for (let i = 0; i < d.time.length; i++) {
      map.set(d.time[i], {
        date: d.time[i],
        tempMax: Math.round(d.temperature_2m_max[i]),
        tempMin: Math.round(d.temperature_2m_min[i]),
        weathercode: d.weathercode[i],
      });
    }
  } catch {
    // Utan nät (eller om Open-Meteo ligger nere) visas dagarna utan väder.
  }
  return map;
}

/** WMO weather code → emoji. */
export function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 49) return "🌫️";
  if (code <= 59) return "🌦️";
  if (code <= 69) return "🌧️";
  if (code <= 79) return "🌨️";
  if (code <= 84) return "🌧️";
  return "⛈️";
}
