export async function onRequestGet({ request, env }: { request: Request; env: any }) {
  try {
    const url = new URL(request.url);
    const dealId = url.searchParams.get('id');

    // Fetch single deal detail with votes and comments
    if (dealId) {
      const deal = await env.DB.prepare(`SELECT * FROM deals WHERE id = ?`).bind(dealId).first();
      if (!deal) {
        return new Response(JSON.stringify({ error: 'Deal not found' }), { status: 404 });
      }

      const votes = await env.DB.prepare(
        `SELECT 
          SUM(CASE WHEN voteType = 'verify' THEN 1 ELSE 0 END) as verifications,
          SUM(CASE WHEN voteType = 'dispute' THEN 1 ELSE 0 END) as disputes
         FROM deal_votes WHERE dealId = ?`
      ).bind(dealId).first();

      const comments = await env.DB.prepare(
        `SELECT * FROM deal_comments WHERE dealId = ? ORDER BY createdAt DESC`
      ).bind(dealId).all();

      return new Response(
        JSON.stringify({
          ...deal,
          verifications: votes?.verifications || 0,
          disputes: votes?.disputes || 0,
          comments: comments.results || [],
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all deals list
    const { results } = await env.DB.prepare(
      `SELECT d.*, 
        COALESCE(v.verifications, 0) as verifications,
        COALESCE(v.disputes, 0) as disputes
       FROM deals d
       LEFT JOIN (
         SELECT dealId,
           SUM(CASE WHEN voteType = 'verify' THEN 1 ELSE 0 END) as verifications,
           SUM(CASE WHEN voteType = 'dispute' THEN 1 ELSE 0 END) as disputes
         FROM deal_votes GROUP BY dealId
       ) v ON d.id = v.dealId
       ORDER BY d.createdAt DESC`
    ).all();

    return new Response(JSON.stringify(results || []), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // Handle Upvoting / Disputes
    if (action === 'vote') {
      const { dealId, userId, voteType } = await request.json();
      await env.DB.prepare(
        `INSERT INTO deal_votes (id, dealId, userId, voteType, createdAt)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(dealId, userId) DO UPDATE SET voteType = ?`
      )
        .bind(`${dealId}_${userId}`, dealId, userId, voteType, Date.now(), voteType)
        .run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle Commenting
    if (action === 'comment') {
      const { dealId, author, text } = await request.json();
      const commentId = `comment_${Date.now()}`;
      await env.DB.prepare(
        `INSERT INTO deal_comments (id, dealId, author, text, createdAt)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(commentId, dealId, author, text, Date.now())
        .run();

      return new Response(JSON.stringify({ success: true, id: commentId }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestDelete({ request, env }: { request: Request; env: any }) {
  try {
    const url = new URL(request.url);
    const dealId = url.searchParams.get('id');
    if (!dealId) return new Response(JSON.stringify({ error: 'Missing deal ID' }), { status: 400 });

    await env.DB.prepare(`DELETE FROM deals WHERE id = ?`).bind(dealId).run();
    await env.DB.prepare(`DELETE FROM deal_votes WHERE dealId = ?`).bind(dealId).run();
    await env.DB.prepare(`DELETE FROM deal_comments WHERE dealId = ?`).bind(dealId).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
