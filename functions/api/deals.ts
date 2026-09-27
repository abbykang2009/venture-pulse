export async function onRequestGet({ env }: { env: any }) {
  try {
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

export async function onRequestDelete({ request, env }: { request: Request; env: any }) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing opportunity ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.DB.prepare('DELETE FROM deals WHERE id = ?').bind(id).run();

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
