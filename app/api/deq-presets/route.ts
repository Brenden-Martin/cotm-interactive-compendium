import { listDeqPresets, saveDeqPreset } from "../../../db/deq-presets";

type ConfigInput = {
  k?: unknown;
  exponent?: unknown;
  dt?: unknown;
  decay?: unknown;
  noise?: unknown;
};

const finiteArray = (value: unknown, length: number, limit: number) =>
  Array.isArray(value) &&
  value.length === length &&
  value.every((item) => typeof item === "number" && Number.isFinite(item) && Math.abs(item) <= limit);

function validatedConfig(input: ConfigInput) {
  if (
    !finiteArray(input.k, 45, 100) ||
    !finiteArray(input.exponent, 3, 10) ||
    typeof input.dt !== "number" || !Number.isFinite(input.dt) || input.dt < 0 || input.dt > 10 ||
    typeof input.decay !== "number" || !Number.isFinite(input.decay) || input.decay < 0 || input.decay > 10 ||
    typeof input.noise !== "number" || !Number.isFinite(input.noise) || input.noise < 0 || input.noise > 1
  ) return null;
  return {
    k: [...input.k] as number[],
    exponent: [...input.exponent] as number[],
    dt: input.dt,
    decay: input.decay,
    noise: input.noise,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const after = Number(url.searchParams.get("after") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? 128);
    const page = await listDeqPresets(
      Number.isFinite(after) && after >= 0 ? after : 0,
      Number.isFinite(limit) && limit > 0 ? limit : 128,
    );
    return Response.json(page);
  } catch {
    return Response.json({ presets: [], total: 0, nextCursor: null, error: "The shared bank is warming up." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ConfigInput;
    const config = validatedConfig(body);
    if (!config) return Response.json({ error: "That state is outside the safe preset range." }, { status: 400 });
    const stateJson = JSON.stringify(config);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stateJson));
    const stateHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return Response.json({ preset: await saveDeqPreset(stateJson, stateHash) }, { status: 201 });
  } catch {
    return Response.json({ error: "The state could not be saved just now." }, { status: 500 });
  }
}
