import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { defaultRehypePlugins, Streamdown, type StreamdownProps } from "streamdown";

type Pluggable = NonNullable<StreamdownProps["rehypePlugins"]>[number];

/**
 * Link/image hardening with our own origin, so uploaded images (/uploads/…)
 * work. No raw HTML (anyone on duty can write guides).
 */
const hardenPlugin = (defaultRehypePlugins.harden as [Pluggable, unknown])[0];
const rehypePlugins: Pluggable[] = [
  [
    hardenPlugin,
    {
      defaultOrigin: typeof window !== "undefined" ? window.location.origin : "http://localhost",
      allowedLinkPrefixes: ["*"],
      allowedImagePrefixes: ["*"],
      allowDataImages: false,
    },
  ] as Pluggable,
];

// tel: links are not allowed by the hardening step, so they travel through it
// as a harmless relative path and are turned back into tel: when rendered.
const TEL_PATH = "/__tel/";
const encodeTel = (md: string) => md.replace(/\]\(tel:([+\d]+)\)/g, `](${TEL_PATH}$1)`);

/**
 * Renders a guide's markdown. Images become full-width pictures with their
 * caption (the alt text) underneath; tapping one opens it large.
 */
export default function GuideBody({ body }: { body: string }) {
  const [zoom, setZoom] = useState<{ src: string; caption: string } | null>(null);
  return (
    <>
      <div className="prose prose-sm max-w-none prose-headings:mb-2 prose-headings:mt-5 prose-li:my-0.5 prose-img:my-0">
        <Streamdown
          rehypePlugins={rehypePlugins}
          components={{
            a: ({ href, children }) => {
              const url = typeof href === "string" ? href : "";
              if (url.startsWith(TEL_PATH)) {
                return (
                  <a href={`tel:${url.slice(TEL_PATH.length)}`} className="font-semibold text-primary underline">
                    {children}
                  </a>
                );
              }
              const external = /^https?:\/\//.test(url) && !url.startsWith(window.location.origin);
              return (
                <a
                  href={url}
                  className="font-semibold text-primary underline"
                  {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {children}
                </a>
              );
            },
            img: ({ src, alt }) => {
              const url = typeof src === "string" ? src : "";
              const caption = alt && !/^bild$/i.test(alt) ? alt : "";
              return (
                <span className="my-4 block">
                  <button
                    type="button"
                    className="block w-full overflow-hidden rounded-xl border border-border"
                    onClick={() => setZoom({ src: url, caption })}
                    aria-label={caption ? `Förstora: ${caption}` : "Förstora bild"}
                  >
                    <img src={url} alt={caption} loading="lazy" className="w-full object-cover" />
                  </button>
                  {caption && (
                    <span className="mt-1.5 block text-center text-sm text-muted-foreground">{caption}</span>
                  )}
                </span>
              );
            },
          }}
        >
          {encodeTel(body)}
        </Streamdown>
      </div>
      <Dialog open={zoom !== null} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-3xl p-2 sm:p-3">
          <DialogTitle className="sr-only">{zoom?.caption || "Bild"}</DialogTitle>
          {zoom && (
            <figure>
              <img src={zoom.src} alt={zoom.caption} className="max-h-[80vh] w-full rounded-lg object-contain" />
              {zoom.caption && (
                <figcaption className="mt-2 text-center text-sm text-muted-foreground">{zoom.caption}</figcaption>
              )}
            </figure>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
