// Replace the POST creation handler inside functions/api/create-deal.ts or functions/api/deals.ts
export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const stage = formData.get('stage') as string;
    const rate = formData.get('rate') as string;
    const originCity = formData.get('originCity') as string;
    const hqCity = formData.get('hqCity') as string;
    const description = formData.get('description') as string;
    const postedBy = formData.get('postedBy') as string;
    const listingType = (formData.get('listingType') as string) || 'Business'; // 'Business' | 'VC'

    let imageUrl = '';
    const file = formData.get('file') as File | null;
    if (file && file.size > 0) {
      const key = `deals/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      await env.MY_BUCKET.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type },
      });
      imageUrl = `https://your-r2-public-domain.com/${key}`;
    }

    const id = `deal_${Date.now()}`;
    await env.DB.prepare(
      `INSERT INTO deals (id, name, stage, rate, originCity, hqCity, description, imageUrl, postedBy, listingType, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, name, stage, rate, originCity, hqCity, description, imageUrl, postedBy, listingType, Date.now()).run();

    return new Response(JSON.stringify({ success: true, id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to create deal' }), { status: 500 });
  }
}
