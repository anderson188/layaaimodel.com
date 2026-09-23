import {
  COMMUNITY_VIDEOS,
  youtubeEmbedUrl,
  youtubeWatchUrl,
} from "@/lib/videos";

export function VideoGallery() {
  return (
    <section className="space-y-4">
      <div className="max-w-3xl">
        <h2 className="text-xl font-semibold tracking-tight">Videos</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Community YouTube explainers about Laya and Laya vs Jev. These creators are not affiliated with Convai Innovations or with this site. Prefer the README and BENCHMARKS.md for numbers.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {COMMUNITY_VIDEOS.map((video) => (
          <article key={video.id} className="overflow-hidden rounded-lg border border-line bg-panel">
            <div className="aspect-video bg-code">
              <iframe
                title={video.title}
                src={youtubeEmbedUrl(video.id)}
                className="h-full w-full"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="space-y-2 p-4">
              <h3 className="text-sm font-medium leading-snug text-ink">
                <a
                  href={youtubeWatchUrl(video.id)}
                  className="hover:text-accent"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {video.title}
                </a>
              </h3>
              <p className="text-xs text-muted">{video.channel}</p>
              <p className="text-sm leading-relaxed text-muted">{video.note}</p>
              <a
                href={youtubeWatchUrl(video.id)}
                className="inline-block text-xs text-accent hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                Open on YouTube
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
