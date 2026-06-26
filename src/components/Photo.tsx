import { useEffect, useState } from "react";
import { getSignedPhoto } from "@/lib/photo";
import { User } from "lucide-react";

export function Photo({ path, alt, className }: { path: string | null | undefined; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getSignedPhoto(path).then((u) => !cancelled && setUrl(u));
    return () => { cancelled = true; };
  }, [path]);

  if (!url) {
    return (
      <div className={`grid place-items-center bg-muted text-muted-foreground ${className ?? ""}`}>
        <User className="h-1/3 w-1/3 opacity-40" />
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}

export default Photo;