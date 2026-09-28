export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const stage = formData.get('stage') as string;
    const rate = formData.get('rate') as string;
    const originCity = formData.get('originCity') as string;
    const hqCity = formData.get('hqCity') as string;
    const description = formData.get('description') as string;
    const postedBy = (formData.get('postedBy') as string) || 'Admin';
    const listingType = (formData.get('listingType') as string) || 'Business';

    let imageUrl = '';
    const file = formData.get('file') as File | null;
    if (file && typeof file === 'object' && file.name && file.size > 0) {
      const key = `deals/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      await env.MY_BUCKET.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type },
      });
      imageUrl = `/api/image/${key}`;
    }

    const id = `deal_${Date.now()}`;
    const createdAt = Date.now();

    await env.DB.prepare(
      `INSERT INTO deals (id, name, stage, rate, originCity, hqCity, description, imageUrl, postedBy, listingType, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, name, stage, rate, originCity, hqCity, description, imageUrl, postedBy, listingType, createdAt)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        deal: {
          id,
          name,
          stage,
          rate,
          originCity,
          hqCity,
          description,
          imageUrl,
          postedBy,
          listingType,
          createdAt,
          verifications: 0,
          disputes: 0,
          comments: []
        }
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to create deal' }), { status: 500 });
  }
}
