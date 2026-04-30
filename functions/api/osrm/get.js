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

export async function onRequestGet({ request, env }) {
  try {
    const url     = new URL(request.url);
    const batch_id     = url.searchParams.get("batch_id");
    const id_trafo     = url.searchParams.get("id_trafo");
    const request_hash = url.searchParams.get("request_hash");
    const include_geom = url.searchParams.get("include_geom") === "1";

    if (!batch_id || !id_trafo || !request_hash) {
      return json({ ok: false, error: "batch_id, id_trafo y request_hash son obligatorios" }, 400);
    }

    // Seleccionar campos según si se necesita geometría
    const fields = include_geom
      ? "batch_id, id_trafo, request_hash, walk_time_min, walk_order, walk_geom"
      : "batch_id, id_trafo, request_hash, walk_time_min, walk_order";

    const row = await env.DB.prepare(`
      SELECT ${fields}
      FROM osrm_walking
      WHERE batch_id = ? AND id_trafo = ? AND request_hash = ?
      LIMIT 1
    `).bind(batch_id, id_trafo, request_hash).first();

    if (!row) {
      return json({ ok: true, found: false });
    }

    return json({
      ok: true,
      found: true,
      route: {
        ...row,
        walk_order: JSON.parse(row.walk_order),
        walk_geom: include_geom && row.walk_geom
          ? JSON.parse(row.walk_geom)
          : null,
      },
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
