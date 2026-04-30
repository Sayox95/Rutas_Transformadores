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
    const url = new URL(request.url);
    const batch_id = url.searchParams.get("batch_id");
    const id_trafo = url.searchParams.get("id_trafo");
    const request_hash = url.searchParams.get("request_hash");

    if (!batch_id || !id_trafo || !request_hash) {
      return json({ ok: false, error: "batch_id, id_trafo y request_hash son obligatorios" }, 400);
    }

    const row = await env.DB.prepare(`
      SELECT batch_id, id_trafo, request_hash, status,
             walk_geom, walk_time_min, walk_order,
             error_message, created_at, updated_at
      FROM osrm_transformador_routes
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
        walk_geom: JSON.parse(row.walk_geom),
        walk_order: JSON.parse(row.walk_order),
      },
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
