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
    const { batch_id, csv_hash, total_groups = 0 } = body;

    if (!batch_id || !csv_hash) {
      return json({ ok: false, error: "batch_id y csv_hash son obligatorios" }, 400);
    }

    await env.DB.prepare(`
      INSERT INTO osrm_batches (batch_id, csv_hash, total_groups, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(batch_id) DO UPDATE SET
        csv_hash = excluded.csv_hash,
        total_groups = excluded.total_groups,
        updated_at = CURRENT_TIMESTAMP
    `).bind(batch_id, csv_hash, total_groups).run();

    return json({ ok: true, batch_id });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
