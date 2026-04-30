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

    // ⚡ NUEVO: flag para decidir si traer geometría o no
    const include_geom = url.searchParams.get("include_geom") === "1";

    if (!batch_id || !id_trafo || !request_hash) {
      return json(
        { ok: false, error: "batch_id, id_trafo y request_hash son obligatorios" },
        400
      );
    }

    // ⚡ Query dinámica según necesidad
    const baseFields = `
      batch_id,
      id_trafo,
      request_hash,
      status,
      walk_time_min,
      walk_order,
      error_message,
      created_at,
      updated_at
    `;

    const fields = include_geom
      ? baseFields + `, walk_geom`
      : baseFields;

    const row = await env.DB.prepare(`
      SELECT ${fields}
      FROM osrm_transformador_routes
      WHERE batch_id = ? AND id_trafo = ? AND request_hash = ?
      LIMIT 1
    `)
      .bind(batch_id, id_trafo, request_hash)
      .first();

    if (!row) {
      return json({ ok: true, found: false });
    }

    return json({
      ok: true,
      found: true,
      route: {
        ...row,
        walk_order: JSON.parse(row.walk_order),
        ...(include_geom && row.walk_geom
          ? { walk_geom: JSON.parse(row.walk_geom) }
          : {}),
      },
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
