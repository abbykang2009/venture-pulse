export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Sanitize filename and make key unique
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${Date.now()}-${sanitizedName}`;

    // Upload object stream directly to R2
    await env.BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    // Return the public R2 URL using your public domain
    const publicUrl = `https://pub-5248d1c256b048ca956edd984fd77cf3.r2.dev/${key}`;

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Upload failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
