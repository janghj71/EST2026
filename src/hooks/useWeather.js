// src/hooks/useWeather.js
import { useEffect, useState } from "react";

const OWM_KEY = "8b2eb6cfae9117179b088ac36cafe649";

const WMO = {
  0:  { label: "맑음",        icon: "☀️" },
  1:  { label: "대체로 맑음",  icon: "🌤️" },
  2:  { label: "구름 많음",   icon: "⛅" },
  3:  { label: "흐림",        icon: "☁️" },
  45: { label: "안개",        icon: "🌫️" },
  51: { label: "이슬비",      icon: "🌦️" },
  61: { label: "비",          icon: "🌧️" },
  65: { label: "강한 비",     icon: "🌧️" },
  71: { label: "눈",          icon: "🌨️" },
  75: { label: "폭설",        icon: "❄️" },
  80: { label: "소나기",      icon: "🌦️" },
  82: { label: "강한 소나기", icon: "⛈️" },
  95: { label: "천둥번개",    icon: "⛈️" },
};

function parseCity(addr1) {
  if (!addr1) return null;
  const tokens = addr1.trim().split(/\s+/);
  return tokens.find((t) => /[가-힣]+(시|군|구)$/.test(t)) ?? null;
}

function owmToCode(id) {
  if (id === 800)                    return 0;
  if (id >= 801 && id <= 802)        return 1;
  if (id >= 803 && id <= 804)        return 3;
  if (id >= 700 && id < 800)         return 45;
  if (id >= 600 && id < 700)         return 71;
  if (id >= 520 && id < 532)         return 80;
  if (id >= 500 && id < 600)         return 61;
  if (id >= 300 && id < 400)         return 51;
  if (id >= 200 && id < 300)         return 95;
  return 0;
}

export function useWeather(addr1) {
  const [weather, setWeather] = useState(null);
  const [city,    setCity]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const parsed = parseCity(addr1);
    if (!parsed) return;

    setCity(parsed);
    setLoading(true);

    // 1단계: 도시명 → lat, lon
    fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(parsed)},KR&limit=1&appid=${OWM_KEY}`
    )
      .then((r) => r.json())
      .then((geo) => {
        if (!geo?.length) throw new Error("geocoding 실패");
        const { lat, lon } = geo[0];
        // 2단계: lat, lon → 날씨
        return fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric&lang=kr`
        ).then((r) => r.json());
      })
      .then((data) => {
        const id   = data.weather?.[0]?.id;
        const code = owmToCode(id);
        const info = WMO[code] ?? { label: "날씨 정보", icon: "🌡️" };
        setWeather({
          temp:  Math.round(data.main.temp),
          wind:  Math.round((data.wind?.speed ?? 0) * 3.6), // m/s → km/h
          label: info.label,
          icon:  info.icon,
          code,
        });
      })
      .catch(() => setWeather(null))
      .finally(() => setLoading(false));
  }, [addr1]);

  return { weather, city, loading };
}
