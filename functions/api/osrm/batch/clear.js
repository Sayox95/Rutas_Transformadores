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
    const { batch_id } = await request.json();

    if (!batch_id) {
      return json({ ok: false, error: "batch_id es obligatorio" }, 400);
    }

    await env.DB.prepare(
      `DELETE FROM osrm_walking WHERE batch_id = ?`
    ).bind(batch_id).run();

    await env.DB.prepare(
      `DELETE FROM osrm_batches WHERE batch_id = ?`
    ).bind(batch_id).run();

    return json({ ok: true, cleared: true, batch_id });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
