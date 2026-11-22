import type { Prediction } from "@/lib/isyarat/classifier";
import { StabilityTracker } from "@/lib/isyarat/stability";

export const RELEASE_FRAMES = 6;
export const WRONG_EXTRA_FRAMES = 12;

export type SignEvent = { kind: "terima" | "salah"; letter: string } | null;

export type SignFrame = {
  hold: number;
  seen: string | null;
  event: SignEvent;
};

export class SignSequencer {
  private tracker = new StabilityTracker();
  private held: string | null = null;
  private clear = 0;
  private wrongLetter: string | null = null;
  private wrongFrames = 0;

  reset() {
    this.tracker.reset();
    this.wrongLetter = null;
    this.wrongFrames = 0;
  }

  push(prediction: Prediction | null, expected: string): SignFrame {
    if (this.held) {
      this.clear = !prediction || prediction.letter !== this.held ? this.clear + 1 : 0;
      if (this.clear >= RELEASE_FRAMES) this.held = null;
    }
    const state = this.tracker.push(prediction);
    const free = (letter: string | null) => letter !== null && letter !== this.held;
    const hold = state.leading === expected && free(state.leading) ? Math.round(state.progress * 10) / 10 : 0;
    const seen = state.leading !== expected && free(state.leading) ? state.leading : null;
    if (!state.stable || !free(state.stable)) {
      this.wrongLetter = null;
      this.wrongFrames = 0;
      return { hold, seen, event: null };
    }
    if (state.stable !== expected) {
      this.wrongFrames = this.wrongLetter === state.stable ? this.wrongFrames + 1 : 1;
      this.wrongLetter = state.stable;
      if (this.wrongFrames < WRONG_EXTRA_FRAMES) return { hold, seen, event: null };
    }
    this.wrongLetter = null;
    this.wrongFrames = 0;
    this.held = state.stable;
    this.clear = 0;
    this.tracker.reset();
    return {
      hold: 0,
      seen: null,
      event: { kind: state.stable === expected ? "terima" : "salah", letter: state.stable },
    };
  }
}
