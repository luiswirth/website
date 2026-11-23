// Serves the static site, and fills in its YouTube videos from YouTube itself.
//
// A page names a video by its ID alone, as a card `<a class="video" data-youtube="ID">`
// or as a line of a list `<li class="video-line" data-youtube="ID">`, and the Worker adds the link, the thumbnail, the title, the duration and the counts,
// so nothing about a video is kept in the site.
// Thumbnails are served from this domain at `/yt/ID.jpg`, so a visitor's browser never contacts YouTube.

const API = "https://www.googleapis.com/youtube/v3/videos";
// The YouTube logo of the site's header (Simple Icons, CC0).
const YOUTUBE_ICON =
	'<svg class="icon-inline" viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>';
const TTL = 6 * 3600; // seconds the video data and thumbnails are cached

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const thumb = url.pathname.match(/^\/yt\/([\w-]{11})\.jpg$/);
		if (thumb) return thumbnail(thumb[1], ctx);

		const response = await env.ASSETS.fetch(request);
		if (!(response.headers.get("content-type") ?? "").startsWith("text/html")) return response;

		const html = await response.text();
		const ids = [...new Set([...html.matchAll(/data-youtube="([\w-]{11})"/g)].map((m) => m[1]))];
		if (ids.length === 0) return new Response(html, response);

		const videos = await fetchVideos(ids, env, ctx).catch(() => ({}));
		return new HTMLRewriter()
			.on("a[data-youtube]", {
				element(el) {
					const id = el.getAttribute("data-youtube");
					const v = videos[id];
					el.setAttribute("href", `https://youtu.be/${id}`);
					el.prepend(
						`<span class="thumb"><img src="/yt/${id}.jpg" alt="" width="1280" height="720" loading="lazy">` +
							`<span class="play"></span>${v ? `<span class="duration">${v.duration}</span>` : ""}</span>`,
						{ html: true },
					);
					if (v) el.append(`<span class="video-title" title="${v.title}">${v.title}</span>`, { html: true });
					if (v) el.append(`<span class="video-meta">${v.meta}<span class="video-year"> · ${v.year}</span></span>`, { html: true });
				},
			})
			.on("li[data-youtube]", {
				element(el) {
					const id = el.getAttribute("data-youtube");
					const v = videos[id];
					el.append(
						`<a href="https://youtu.be/${id}">${YOUTUBE_ICON}YouTube</a>` +
							(v ? `<span class="video-meta"> · ${v.duration} · ${v.meta}</span>` : "") +
							`<span class="preview"><img src="/yt/${id}.jpg" alt="" width="1280" height="720" loading="lazy"></span>`,
						{ html: true },
					);
				},
			})
			.transform(new Response(html, response));
	},
};

/** The videos' data by ID, from the YouTube Data API, cached for `TTL`. */
async function fetchVideos(ids, env, ctx) {
	const key = new Request(`https://cache.internal/youtube/${ids.sort().join(",")}`);
	const cache = caches.default;
	const hit = await cache.match(key);
	if (hit) return hit.json();

	const query = new URLSearchParams({ part: "snippet,statistics,contentDetails", id: ids.join(","), key: env.YOUTUBE_API_KEY });
	const res = await fetch(`${API}?${query}`);
	if (!res.ok) throw new Error(`YouTube API: ${res.status}`);
	const videos = {};
	for (const item of (await res.json()).items) {
		const s = item.statistics;
		const parts = [`${compact(s.viewCount)} views`];
		if (s.likeCount) parts.push(`${compact(s.likeCount)} likes`);
		videos[item.id] = {
			title: escape(item.snippet.title),
			duration: duration(item.contentDetails.duration),
			meta: parts.join(" · "),
			year: item.snippet.publishedAt.slice(0, 4),
		};
	}
	ctx.waitUntil(cache.put(key, Response.json(videos, { headers: { "cache-control": `max-age=${TTL}` } })));
	return videos;
}

/** The video's largest thumbnail, falling back to the medium one that every video has. */
async function thumbnail(id, ctx) {
	const cache = caches.default;
	const key = new Request(`https://cache.internal/yt/${id}.jpg`);
	const hit = await cache.match(key);
	if (hit) return hit;

	let res = await fetch(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`);
	if (!res.ok) res = await fetch(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`);
	if (!res.ok) return new Response("not found", { status: 404 });
	const out = new Response(res.body, {
		headers: { "content-type": "image/jpeg", "cache-control": `public, max-age=${TTL}` },
	});
	ctx.waitUntil(cache.put(key, out.clone()));
	return out;
}

const escape = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const compact = (n) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(n));

/** An ISO 8601 duration such as `PT43M55S` as `43:55`. */
function duration(iso) {
	const [, h = 0, m = 0, s = 0] = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/).map((x) => x ?? 0);
	const mm = String(m).padStart(h ? 2 : 1, "0");
	const ss = String(s).padStart(2, "0");
	return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
