export async function onRequestGet({ request, env }: { request: Request; env: any }) {
  try {
    const url = new URL(request.url);
    const dealId = url.searchParams.get('id');

    // Fetch single deal detail with comments and votes
    if (dealId) {
      const deal = await env.DB.prepare('SELECT * FROM deals WHERE id = ?').bind(dealId).first();
      if (!deal) {
        return new Response(JSON.stringify({ error: 'Opportunity not found' }), { status: 404 });
      }

      const { results: votes } = await env.DB.prepare(
        'SELECT voteType, count(*) as count FROM deal_votes WHERE dealId = ? GROUP BY voteType'
      ).bind(dealId).all();

      const { results: comments } = await env.DB.prepare(
        'SELECT * FROM deal_comments WHERE dealId = ? ORDER BY createdAt DESC'
      ).bind(dealId).all();

      const verifications = votes?.find((v: any) => v.voteType === 'verify')?.count || 0;
      const disputes = votes?.find((v: any) => v.voteType === 'dispute')?.count || 0;

      return new Response(
        JSON.stringify({
          ...deal,
          verifications,
          disputes,
          comments: comments || [],
        }),
        { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }

    // Fetch all deals with verification scores for grid
    const { results: deals } = await env.DB.prepare(
      'SELECT id, name, stage, rate, originCity, hqCity, description, imageUrl, postedBy, createdAt FROM deals ORDER BY createdAt DESC'
    ).all();

    const { results: voteCounts } = await env.DB.prepare(
      'SELECT dealId, voteType, COUNT(*) as count FROM deal_votes GROUP BY dealId, voteType'
    ).all();

    const votesMap: Record<string, { verifications: number; disputes: number }> = {};
    (voteCounts || []).forEach((v: any) => {
      if (!votesMap[v.dealId]) votesMap[v.dealId] = { verifications: 0, disputes: 0 };
      if (v.voteType === 'verify') votesMap[v.dealId].verifications = v.count;
      if (v.voteType === 'dispute') votesMap[v.dealId].disputes = v.count;
    });

    const enrichedDeals = (deals || []).map((deal: any) => {
      const v = votesMap[deal.id]?.verifications || 0;
      const d = votesMap[deal.id]?.disputes || 0;
      return {
        ...deal,
        verifications: v,
        disputes: d,
      };
    });

    return new Response(JSON.stringify(enrichedDeals), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch deals' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const body = await request.json();

    if (action === 'vote') {
      const { dealId, userId, voteType } = body; // voteType: 'verify' | 'dispute'
      if (!dealId || !userId || !['verify', 'dispute'].includes(voteType)) {
        return new Response(JSON.stringify({ error: 'Invalid parameters' }), { status: 400 });
      }

      await env.DB.prepare(
        `INSERT INTO deal_votes (dealId, userId, voteType, createdAt) 
         VALUES (?, ?, ?, ?) 
         ON CONFLICT(dealId, userId) DO UPDATE SET voteType = excluded.voteType`
      ).bind(dealId, userId, voteType, Date.now()).run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'comment') {
      const { dealId, author, text } = body;
      if (!dealId || !text) {
        return new Response(JSON.stringify({ error: 'Missing dealId or comment text' }), { status: 400 });
      }

      const id = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await env.DB.prepare(
        'INSERT INTO deal_comments (id, dealId, author, text, createdAt) VALUES (?, ?, ?, ?, ?)'
      ).bind(id, dealId, author || 'Anonymous', text, Date.now()).run();

      return new Response(JSON.stringify({ success: true, id }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to process request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestDelete({ request, env }: { request: Request; env: any }) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing opportunity ID' }), { status: 400 });
    }

    await env.DB.prepare('DELETE FROM deals WHERE id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM deal_votes WHERE dealId = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM deal_comments WHERE dealId = ?').bind(id).run();

    return new Response(JSON.stringify({ success: true, id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to delete deal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
