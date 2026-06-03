import { valueObjectCardFixtures } from "./value-object-card.fixtures";
import type {
  ValueObjectCardModel,
  ValueObjectCardStateSignalTone,
} from "./value-object-card.types";

export function getValueObjectCardFixtureById(
  id: string,
): ValueObjectCardModel {
  return (
    valueObjectCardFixtures.find((fixture) => fixture.id === id) ??
    valueObjectCardFixtures.find((fixture) => fixture.id === "default") ??
    valueObjectCardFixtures[0]
  );
}

export function getStateSignalToneClassName(
  tone: ValueObjectCardStateSignalTone,
): string {
  const toneClassNames: Record<ValueObjectCardStateSignalTone, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    attention: "border-amber-200 bg-amber-50 text-amber-900",
    growth: "border-violet-200 bg-violet-50 text-violet-900",
    data: "border-cyan-200 bg-cyan-50 text-cyan-900",
  };

  return toneClassNames[tone];
}
