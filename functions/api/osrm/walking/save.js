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
    const {
      batch_id,
      id_trafo,
      request_hash,
      walk_time_min,
      walk_order,
      walk_geom = null,   // opcional — puede no venir
    } = await request.json();

    if (!batch_id || !id_trafo || !request_hash) {
      return json({ ok: false, error: "batch_id, id_trafo y request_hash son obligatorios" }, 400);
    }

    if (walk_time_min === undefined || walk_time_min === null) {
      return json({ ok: false, error: "walk_time_min es obligatorio" }, 400);
    }

    if (!walk_order || !Array.isArray(walk_order)) {
      return json({ ok: false, error: "walk_order es obligatorio y debe ser un array" }, 400);
    }

    // walk_geom es nullable — se guarda como texto JSON si viene, null si no
    const geomText = walk_geom ? JSON.stringify(walk_geom) : null;

    await env.DB.prepare(`
      INSERT INTO osrm_walking (
        batch_id, id_trafo, request_hash,
        walk_time_min, walk_order, walk_geom, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(batch_id, id_trafo, request_hash) DO UPDATE SET
        walk_time_min = excluded.walk_time_min,
        walk_order    = excluded.walk_order,
        walk_geom     = excluded.walk_geom,
        updated_at    = CURRENT_TIMESTAMP
    `).bind(
      batch_id,
      id_trafo,
      request_hash,
      walk_time_min,
      JSON.stringify(walk_order),
      geomText
    ).run();

    return json({ ok: true, saved: true });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
