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

    if (!batch_id) {
      return json({ ok: false, error: "batch_id es obligatorio" }, 400);
    }

    const batch = await env.DB.prepare(`
      SELECT batch_id, csv_hash, total_groups, created_at, updated_at
      FROM osrm_batches
      WHERE batch_id = ?
      LIMIT 1
    `).bind(batch_id).first();

    const stats = await env.DB.prepare(`
      SELECT
        COUNT(*) AS saved_routes,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_routes,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_routes
      FROM osrm_transformador_routes
      WHERE batch_id = ?
    `).bind(batch_id).first();

    return json({
      ok: true,
      batch,
      stats,
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
