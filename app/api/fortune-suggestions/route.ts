import { listApprovedFortunes, saveFortuneSuggestion } from "../../../db/fortune-suggestions";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

type SuggestionInput = { fortune?: unknown; website?: unknown };

export async function GET(request: Request) {
  const fortunes = new Set<string>();
  let sourceAvailable = false;
  try {
    for (const fortune of await listApprovedFortunes()) fortunes.add(fortune);
    sourceAvailable = true;
  } catch {
    // The private workbench has its own D1. Its local bank may be empty or unavailable.
  }

  const hostname = new URL(request.url).hostname;
  if (hostname === "cotm-private-workbench.nednerdnitram.chatgpt.site") {
    try {
      const response = await fetch("https://cotm-interactive-compendium.nednerdnitram.chatgpt.site/api/fortune-suggestions", { cache: "no-store" });
      if (response.ok) {
        const result = await response.json() as { fortunes?: unknown };
        if (Array.isArray(result.fortunes)) {
          for (const fortune of result.fortunes) {
            if (typeof fortune === "string" && fortune.length >= 3 && fortune.length <= 240) fortunes.add(fortune);
          }
        }
        sourceAvailable = true;
      }
    } catch {
      // Starter fortunes still keep the exhibit usable if the public bank is temporarily unreachable.
    }
  }

  if (!sourceAvailable) {
    return Response.json({ fortunes: [], error: "The approved fortune bank is warming up." }, { status: 503, headers });
  }
  return Response.json({ fortunes: Array.from(fortunes) }, { headers });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as SuggestionInput;
    if (typeof body.website === "string" && body.website.length > 0) {
      return Response.json({ saved: true }, { status: 202, headers });
    }
    if (typeof body.fortune !== "string") {
      return Response.json({ error: "Please write a fortune first." }, { status: 400, headers });
    }
    const fortune = body.fortune.trim().replace(/\s+/g, " ");
    if (fortune.length < 3 || fortune.length > 240) {
      return Response.json({ error: "Fortunes must be between 3 and 240 characters." }, { status: 400, headers });
    }
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fortune.toLocaleLowerCase()));
    const fortuneHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const saved = await saveFortuneSuggestion(fortune, fortuneHash);
    return Response.json(
      { saved: true, duplicate: saved.duplicate },
      { status: saved.duplicate ? 200 : 201, headers },
    );
  } catch {
    return Response.json({ error: "The suggestion box is unavailable just now." }, { status: 503, headers });
  }
}
