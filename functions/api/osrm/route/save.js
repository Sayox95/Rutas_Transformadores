function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequestOptions() {
  return json({ ok: true });
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    const {
      batch_id,
      id_trafo,
      request_hash,
      walk_geom,
      walk_time_min,
      walk_order,
      status = "done",
      error_message = null,
    } = body;

    if (!batch_id || !id_trafo || !request_hash) {
      return json({ ok: false, error: "batch_id, id_trafo y request_hash son obligatorios" }, 400);
    }

    if (!walk_order || walk_time_min === undefined) {
      return json({ ok: false, error: "walk_order y walk_time_min son obligatorios" }, 400);
    }

    // walk_geom es opcional — puede ser null o un objeto vacío
    const geomToSave = walk_geom ?? { type: 'LineString', coordinates: [] };

    await env.DB.prepare(`
      INSERT INTO osrm_transformador_routes (
        batch_id, id_trafo, request_hash, status,
        walk_geom, walk_time_min, walk_order,
        error_message, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(batch_id, id_trafo, request_hash) DO UPDATE SET
        status = excluded.status,
        walk_geom = excluded.walk_geom,
        walk_time_min = excluded.walk_time_min,
        walk_order = excluded.walk_order,
        error_message = excluded.error_message,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      batch_id,
      id_trafo,
      request_hash,
      status,
      JSON.stringify(geomToSave),
      walk_time_min,
      JSON.stringify(walk_order),
      error_message
    ).run();

    return json({ ok: true, saved: true });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
