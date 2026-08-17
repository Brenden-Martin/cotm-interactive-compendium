"use client";

import { SoldAsIsListeningRoom } from "../sold-as-is-listening-room";
import { moogTrack } from "../tracks";

export function MoogListeningRoom() {
  return <SoldAsIsListeningRoom track={moogTrack} />;
}
