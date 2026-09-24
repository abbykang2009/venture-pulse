export async function onRequestGet(context) {
  const { env } = context;
  try {
    // Fetch deals and their actions
    const { results: deals } = await env.DB.prepare(
      `SELECT * FROM deals ORDER BY created_at DESC`
    ).all();

    const { results: actions } = await env.DB.prepare(
      `SELECT * FROM deal_actions ORDER BY created_at ASC`
    ).all();

    // Map database structure back to frontend format
    const formattedDeals = deals.map(deal => ({
      id: deal.id,
      companyName: deal.company_name,
      stage: deal.stage,
      sector: deal.sector,
      amountRaised: deal.amount_raised,
      valuation: deal.valuation,
      pitch: deal.pitch,
      postedByRole: deal.posted_by_role,
      status: deal.status,
      verifications: actions.filter(a => a.deal_id === deal.id && a.action_type === 'verify'),
      contests: actions.filter(a => a.deal_id === deal.id && a.action_type === 'contest'),
    }));

    return new Response(JSON.stringify(formattedDeals), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const id = "deal_" + Date.now();
    const status = body.postedByRole === 'investor' ? 'approved' : 'pending';

    await env.DB.prepare(
      `INSERT INTO deals (id, company_name, stage, sector, amount_raised, valuation, pitch, posted_by_role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.companyName,
      body.stage,
      body.sector,
      body.amountRaised,
      body.valuation,
      body.pitch,
      body.postedByRole,
      status
    ).run();

    return new Response(JSON.stringify({ success: true, id, status }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
