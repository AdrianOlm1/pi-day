import { useState, useEffect, useCallback } from 'react';

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
/** IP-based geolocation (no app permission required). */
const IP_API = 'https://ipapi.co/json/';

export interface WeatherState {
  temp: number | null;
  weatherCode: number | null;
  loading: boolean;
  error: string | null;
}

/** Map WMO weather code to Ionicons name (outline style where available). */
export function weatherCodeToIcon(code: number): string {
  if (code === 0) return 'sunny';
  if (code <= 3) return 'partly-sunny'; // 1–3: mainly clear, partly cloudy, overcast
  if (code <= 48) return 'cloudy';       // 45, 48: fog
  if (code <= 67) return 'rainy';       // drizzle, rain
  if (code <= 77) return 'snow';        // snow
  if (code <= 82) return 'rainy';      // showers
  if (code <= 86) return 'snow';        // snow showers
  return 'thunderstorm';                // 95–99
}

export function useWeather(): WeatherState & { refresh: () => void } {
  const [temp, setTemp] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    try {
      const url = `${OPEN_METEO}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather unavailable');
      const data = await res.json();
      const cur = data?.current;
      if (cur != null) {
        const raw = cur.temperature_2m;
        const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
        setTemp(value != null ? Math.round(value) : null);
        setWeatherCode(cur.weather_code ?? null);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Weather unavailable');
      setTemp(null);
      setWeatherCode(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Fallback coordinates (e.g. NYC) when IP geolocation fails so weather still loads. */
  const FALLBACK_LAT = 40.7128;
  const FALLBACK_LON = -74.006;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    let lat: number;
    let lon: number;
    try {
      const ipRes = await fetch(IP_API);
      if (!ipRes.ok) throw new Error('Location unavailable');
      const ipData = await ipRes.json();
      const latFromIp = ipData?.latitude;
      const lonFromIp = ipData?.longitude;
      if (typeof latFromIp === 'number' && typeof lonFromIp === 'number') {
        lat = latFromIp;
        lon = lonFromIp;
      } else {
        lat = FALLBACK_LAT;
        lon = FALLBACK_LON;
      }
    } catch {
      lat = FALLBACK_LAT;
      lon = FALLBACK_LON;
    }
    await fetchWeather(lat, lon);
  }, [fetchWeather]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { temp, weatherCode, loading, error, refresh };
}
