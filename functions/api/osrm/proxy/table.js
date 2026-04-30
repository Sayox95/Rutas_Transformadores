/**
 * Proxy para OSRM /table/v1/walking/
 * Evita CORS — el request sale desde el servidor de Cloudflare, no desde el navegador.
 *
 * Uso desde el cliente:
 *   GET /api/osrm/proxy/table?coords=lon1,lat1;lon2,lat2&annotations=duration
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
    const url         = new URL(request.url);
    const coords      = url.searchParams.get("coords");
    const annotations = url.searchParams.get("annotations") || "duration";
    const mode        = url.searchParams.get("mode") || "walking"; // walking | driving

    if (!coords) {
      return json({ ok: false, error: "coords es obligatorio" }, 400);
    }

    const osrmUrl = `https://router.project-osrm.org/table/v1/${mode}/${coords}?annotations=${annotations}`;

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
        "Cache-Control": "public, max-age=86400", // cachear 24h — rutas no cambian
      },
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
