const ADJECTIVES = [
  "Blue",
  "Silent",
  "Red",
  "Dark",
  "Silver",
  "Clever",
  "Golden",
  "Green",
  "Swift",
  "Bold",
  "Calm",
  "Bright",
] as const;

const ANIMALS = [
  "Falcon",
  "Fox",
  "Panda",
  "Tiger",
  "Wolf",
  "Raven",
  "Hawk",
  "Otter",
  "Lynx",
  "Eagle",
  "Bear",
  "Heron",
] as const;

export function generateDisplayName(): string {
  const adjBytes = new Uint8Array(1);
  const animalBytes = new Uint8Array(1);
  crypto.getRandomValues(adjBytes);
  crypto.getRandomValues(animalBytes);
  const adjective = ADJECTIVES[adjBytes[0]! % ADJECTIVES.length]!;
  const animal = ANIMALS[animalBytes[0]! % ANIMALS.length]!;
  return `${adjective} ${animal}`;
}
