import { listApprovedFortunes, saveFortuneSuggestion } from "../../../db/fortune-suggestions";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

type SuggestionInput = { fortune?: unknown; website?: unknown };

export async function GET() {
  try {
    return Response.json({ fortunes: await listApprovedFortunes() }, { headers });
  } catch {
    return Response.json({ fortunes: [], error: "The approved fortune bank is warming up." }, { status: 503, headers });
  }
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
    const fortune = body.fortune
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.trim().replace(/[ \t]+/g, " "))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (fortune.length < 3 || fortune.length > 240) {
      return Response.json({ error: "Fortunes must be between 3 and 240 characters." }, { status: 400, headers });
    }
    const canonicalFortune = fortune.replace(/\s+/g, " ").toLocaleLowerCase();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalFortune));
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
