import { KaboomCtx, ZComp } from "kaboom";
import { randNum } from "../utils";

interface BaseStarsOptions {
  minSpeed?: number;
  maxSpeed?: number;
  z?: number;
}

interface StarsOptions extends BaseStarsOptions {
  count?: number;
}

export function Stars(k: KaboomCtx, options?: StarsOptions) {
  const count = options?.count ?? 100;
  for (let i = 0; i < count; i++) {
    const star = Star(k, {
      radius: randNum(1, 2),
      pos: [randNum(0, k.width()), randNum(0, k.height())],
      opacity: randNum(2, 6) / 10,
      z: options?.z ?? 0
    })
    star.onUpdate(() => {
      // glitchy star effect
      star.pos.x -= randNum(options?.minSpeed ?? 0.2, options?.maxSpeed ?? 1);
    });
  }
}

interface StarGeneratorOptions extends BaseStarsOptions {
  baseFrequency?: number;
}

export function StarGenerator(k: KaboomCtx, options?: StarGeneratorOptions) {
  k.loop(options?.baseFrequency || 0.5, () => {
    const star = Star(k, {
      radius: randNum(1, 2),
      pos: [k.width(), randNum(0, k.height())],
      opacity: randNum(2, 6) / 10,
      z: options?.z ?? 0
    })
    star.onUpdate(() => {
      star.pos.x -= randNum(options?.minSpeed ?? 0.2, options?.maxSpeed ?? 1);
    });
  });k.loop((options?.baseFrequency || 0.5) * 2.2, () => {
    const star = Star(k, {
      radius: randNum(1, 2),
      pos: [k.width(), randNum(0, k.height())],
      opacity: randNum(2, 6) / 10,
      z: options?.z ?? 0
    })
    star.onUpdate(() => {
      star.pos.x -= randNum(options?.minSpeed ?? 0.2, options?.maxSpeed ?? 1);
    });
  });
}

interface StarOptions {
  radius: number;
  pos: [number, number];
  opacity: number;
  z: number;
}

function Star(k: KaboomCtx, { radius, pos, opacity, z }: StarOptions) {
  return k.add([
    "star",
    k.circle(radius),
    k.pos(...pos),
    k.anchor("left"),
    k.color(255, 255, 255),
    k.opacity(opacity),
    k.offscreen({ destroy: true }),
    k.z(z),
    k.stay(),
  ]);
}
