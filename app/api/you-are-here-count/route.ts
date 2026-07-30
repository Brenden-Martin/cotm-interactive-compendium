import {
  getYouAreHereCount,
  incrementYouAreHereCount,
} from "../../../db/site-counters";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    return Response.json(
      { count: await getYouAreHereCount() },
      { headers },
    );
  } catch {
    return Response.json(
      { count: 0, error: "The counter is warming up." },
      { status: 503, headers },
    );
  }
}

export async function POST() {
  try {
    return Response.json(
      { count: await incrementYouAreHereCount() },
      { headers },
    );
  } catch {
    return Response.json(
      { error: "The press could not be recorded just now." },
      { status: 503, headers },
    );
  }
}
