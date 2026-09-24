export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { action, dealId, notes, status } = body;

    if (action === 'approve' || action === 'reject') {
      // Admin Approval or Rejection
      await env.DB.prepare(
        `UPDATE deals SET status = ? WHERE id = ?`
      ).bind(status, dealId).run();
    } else if (action === 'verify' || action === 'contest') {
      // Investor Verification or Contest
      const actionId = "action_" + Date.now();
      await env.DB.prepare(
        `INSERT INTO deal_actions (id, deal_id, action_type, notes) VALUES (?, ?, ?, ?)`
      ).bind(actionId, dealId, action, notes).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
