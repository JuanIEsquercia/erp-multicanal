import type { ChannelState } from "@/lib/demo/state";
import { Badge } from "./ui";

export function ChannelBadge({ channel }: { channel: ChannelState }) {
  switch (channel.status) {
    case "published":
      return <Badge tone="success">Publicado · {channel.externalId}</Badge>;
    case "publishing":
      return <Badge>Publicando…</Badge>;
    case "error":
      return <Badge tone="danger">Error</Badge>;
    case "unpublished":
      return <Badge tone="warning">Sin publicar</Badge>;
  }
}
