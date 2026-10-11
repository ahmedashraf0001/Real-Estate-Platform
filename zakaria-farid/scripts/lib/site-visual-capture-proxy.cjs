// Loaded only by the capture-owned Next process, never imported by app code.
const http = require('node:http');
let fixture = null;
let intercepts = 0;
const fetchOriginal = globalThis.fetch;
if (process.env.SITE_VISUAL_CAPTURE_PROXY_PORT) {
  http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/fixture') {
      let body = ''; for await (const chunk of req) body += chunk;
      fixture = JSON.parse(body); res.end(JSON.stringify({fixture, intercepts}));
    } else if (req.url === '/status') res.end(JSON.stringify({fixture, intercepts}));
    else { res.statusCode=404; res.end(); }
  }).listen(Number(process.env.SITE_VISUAL_CAPTURE_PROXY_PORT), '127.0.0.1');
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method || input?.method || 'GET').toUpperCase();
    if (url.pathname.includes('/rest/v1/') && !['GET','HEAD'].includes(method)) throw new Error('Capture forbids database writes');
    const response = await fetchOriginal(input, init);
    if (!fixture || !response.ok || !url.pathname.endsWith('/rest/v1/properties') || !url.searchParams.has('slug')) return response;
    const data = await response.json();
    const property = Array.isArray(data) ? data[0] : data;
    if (!property?.property_images?.[0]?.url) throw new Error('Capture fixture requires a real source property image');
    const image = property.property_images[0];
    property.property_images = Array.from({length:fixture.images}, (_,i) => ({...image, id:`capture-image-${i}`, sort_order:i, url:image.url+'#capture_image='+i}));
    property.videos = fixture.video ? [{id:'capture-tour', url:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', thumbnail:image.url, category:'tour', title_en:'Capture tour', title_ar:'\u062c\u0648\u0644\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631'}] : [];
    property.video_url = null;
    if (fixture.otherSpecs) { property.type='apartment'; property.building_units=[]; property.bedrooms=3; property.bathrooms=2; property.area_sqm=150; property.construction_completed_at='2024-01-01'; property.finishing='fully_finished'; property.completion_status='ready'; }
    intercepts++;
    const headers=new Headers(response.headers); headers.delete('content-length'); headers.delete('content-encoding');
    return new Response(JSON.stringify(data), {status:response.status,headers});
  };
}
