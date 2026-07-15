/**
 * Skill: Weather forecast proxy (keyless, via open-meteo).
 *
 * GET /api/skills/weather?city=Beijing
 *
 * The desktop assistant's CSP only allows connecting to hkdy123.top, so the
 * weather skill cannot call open-meteo directly from the renderer. This server
 * function proxies the request: geocode the city, then fetch current weather.
 *
 * open-meteo requires no API key.
 */

const WMO: Record<number, { desc: string; icon: string }> = {
  0: { desc: "晴", icon: "☀️" },
  1: { desc: "大致晴朗", icon: "🌤️" },
  2: { desc: "局部多云", icon: "⛅" },
  3: { desc: "阴", icon: "☁️" },
  45: { desc: "雾", icon: "🌫️" },
  48: { desc: "雾凇", icon: "🌫️" },
  51: { desc: "小毛毛雨", icon: "🌦️" },
  53: { desc: "毛毛雨", icon: "🌦️" },
  55: { desc: "大毛毛雨", icon: "🌧️" },
  61: { desc: "小雨", icon: "🌦️" },
  63: { desc: "中雨", icon: "🌧️" },
  65: { desc: "大雨", icon: "🌧️" },
  71: { desc: "小雪", icon: "🌨️" },
  73: { desc: "中雪", icon: "🌨️" },
  75: { desc: "大雪", icon: "❄️" },
  80: { desc: "阵雨", icon: "🌦️" },
  81: { desc: "强阵雨", icon: "🌧️" },
  82: { desc: "暴雨", icon: "⛈️" },
  95: { desc: "雷阵雨", icon: "⛈️" },
  96: { desc: "雷阵雨伴冰雹", icon: "⛈️" },
};

interface GeoResult {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
}

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const url = new URL(context.request.url);
  const city = (url.searchParams.get("city") || "北京").trim();
  if (!city) return json({ error: "missing city" }, 400);

  try {
    // 1) Geocode
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=1&language=zh&format=json`
    );
    if (!geoRes.ok) return json({ error: "geocode failed" }, 502);
    const geo = (await geoRes.json()) as { results?: GeoResult[] };
    const loc = geo.results?.[0];
    if (!loc) return json({ error: `找不到城市: ${city}` }, 404);

    // 2) Current weather
    const wxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code`
    );
    if (!wxRes.ok) return json({ error: "weather fetch failed" }, 502);
    const wx = (await wxRes.json()) as {
      current?: { temperature_2m: number; weather_code: number };
    };
    const cur = wx.current;
    if (!cur) return json({ error: "no current weather" }, 502);

    const wmo = WMO[cur.weather_code] || { desc: "未知", icon: "🌡️" };
    return json({
      city: `${loc.name}${loc.country ? "·" + loc.country : ""}`,
      tempC: Math.round(cur.temperature_2m),
      desc: wmo.desc,
      icon: wmo.icon,
    });
  } catch {
    return json({ error: "weather proxy error" }, 500);
  }
}
