// src/hooks/useWeather.js
// Open-Meteo (무료, API 키 불필요) — 기상청 API 키 발급 후 교체 예정
import { useEffect, useState } from "react";

const WMO = {
  0:  { label: "맑음",       icon: "☀️" },
  1:  { label: "대체로 맑음", icon: "🌤️" },
  2:  { label: "구름 많음",  icon: "⛅" },
  3:  { label: "흐림",       icon: "☁️" },
  45: { label: "안개",       icon: "🌫️" },
  48: { label: "안개",       icon: "🌫️" },
  51: { label: "이슬비",     icon: "🌦️" },
  53: { label: "이슬비",     icon: "🌦️" },
  55: { label: "이슬비",     icon: "🌦️" },
  61: { label: "비",         icon: "🌧️" },
  63: { label: "비",         icon: "🌧️" },
  65: { label: "강한 비",    icon: "🌧️" },
  71: { label: "눈",         icon: "🌨️" },
  73: { label: "눈",         icon: "🌨️" },
  75: { label: "폭설",       icon: "❄️" },
  80: { label: "소나기",     icon: "🌦️" },
  81: { label: "소나기",     icon: "🌦️" },
  82: { label: "강한 소나기",icon: "⛈️" },
  95: { label: "천둥번개",   icon: "⛈️" },
  99: { label: "천둥번개",   icon: "⛈️" },
};

// 경기도 하남시 좌표 (기상청 API 키 발급 후 addr1 기반으로 교체 예정)
const LAT = 37.5394;
const LON = 127.2079;

export function useWeather() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,weathercode,windspeed_10m&timezone=Asia%2FSeoul`
    )
      .then((r) => r.json())
      .then((data) => {
        const c = data.current;
        const code = c.weathercode;
        const info = WMO[code] ?? { label: "날씨 정보", icon: "🌡️" };
        setWeather({
          temp: Math.round(c.temperature_2m),
          wind: Math.round(c.windspeed_10m),
          label: info.label,
          icon: info.icon,
          code,
        });
      })
      .catch(() => setWeather(null))
      .finally(() => setLoading(false));
  }, []);

  return { weather, loading };
}
