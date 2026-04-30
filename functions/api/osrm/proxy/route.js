/**
 * Proxy para OSRM /route/v1/
 * Soporta walking y driving.
 *
 * Uso desde el cliente:
 *   GET /api/osrm/proxy/route?coords=lon1,lat1;lon2,lat2&mode=walking&overview=full&geometries=geojson
 */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequestOptions() {
  return json({ ok: true });
}

export async function onRequestGet({ request }) {
  try {
    const url        = new URL(request.url);
    const coords     = url.searchParams.get("coords");
    const mode       = url.searchParams.get("mode")       || "walking";
    const overview   = url.searchParams.get("overview")   || "full";
    const geometries = url.searchParams.get("geometries") || "geojson";

    if (!coords) {
      return json({ ok: false, error: "coords es obligatorio" }, 400);
    }

    const osrmUrl = `https://router.project-osrm.org/route/v1/${mode}/${coords}?overview=${overview}&geometries=${geometries}`;

    const res = await fetch(osrmUrl, {
      headers: { "User-Agent": "CloudflareProxy/1.0" }
    });

    if (!res.ok) {
      return json({ ok: false, error: `OSRM HTTP ${res.status}` }, res.status);
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
