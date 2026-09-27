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
    const file = formData.get('file') as File | null;

    if (!name || !description || !rate || !originCity || !hqCity) {
      return new Response(JSON.stringify({ error: 'Missing required deal parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let publicUrl = '';

    // Upload file to R2 if provided
    if (file && file.size > 0) {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `${Date.now()}-${sanitizedName}`;

      await env.BUCKET.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
      });

      publicUrl = `https://pub-5248d1c256b048ca956edd984fd77cf3.r2.dev/${key}`;
    }

    const dealId = Date.now().toString();
    const createdAt = Date.now();

    // Insert deal metadata into Cloudflare D1 SQL database
    await env.DB.prepare(
      `INSERT INTO deals (id, name, stage, rate, originCity, hqCity, description, imageUrl, postedBy, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(dealId, name, stage, rate, originCity, hqCity, description, publicUrl, postedBy, createdAt).run();

    const newDeal = {
      id: dealId,
      name,
      stage,
      rate,
      originCity,
      hqCity,
      description,
      imageUrl: publicUrl,
      postedBy,
      createdAt
    };

    return new Response(JSON.stringify(newDeal), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to create deal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
