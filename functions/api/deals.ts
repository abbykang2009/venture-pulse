export async function onRequestGet({ env }: { env: any }) {
  try {
    // Fetch all deals from Cloudflare D1 ordered by creation time descending
    const { results } = await env.DB.prepare(
      'SELECT id, name, stage, rate, originCity, hqCity, description, imageUrl, postedBy, createdAt FROM deals ORDER BY createdAt DESC'
    ).all();

    return new Response(JSON.stringify(results || []), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch deals' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
