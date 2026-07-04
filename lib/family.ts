// Familjen är fast — åtta personer, ingen CRUD-UI. Hålls i kod istället
// för databas så att chattens systemprompt alltid har profilerna.
// Varje resenär har en egen färg som används i chatt, deltagar-chips m.m.

export type Person = {
  name: string;
  age?: number;
  profile: string;
  tags: string[];
  color: string;
};

export const FAMILY: Person[] = [
  {
    name: "Andreas",
    age: 51,
    profile:
      "IT-konsult, tränar halvmaraton, gillar äkta upplevelser över turistfällor. Coachar Elton i fotboll.",
    tags: ["löpning", "äkta upplevelser", "fotboll"],
    color: "#6ec1e4",
  },
  {
    name: "Elin",
    age: 49,
    profile:
      "Ergonom på Volvo, fyller 50 den 12 juli under resan. Gillar städer, kultur, vin, mat, promenader. Inte strapatser.",
    tags: ["kultur", "vin", "mat", "promenader"],
    color: "#f2b544",
  },
  {
    name: "William",
    age: 25,
    profile:
      "Snart klar civilingenjör i Lund. Reser med flickvännen Anna. Reser hem 20 juli kl 14.50 från Montpellier flygplats.",
    tags: [],
    color: "#52d6a5",
  },
  {
    name: "Anna",
    age: 25,
    profile:
      "Williams flickvän. Reser hem 20 juli kl 14.50 från Montpellier flygplats.",
    tags: [],
    color: "#5ee0d8",
  },
  {
    name: "Leja",
    age: 24,
    profile:
      "Läser juridik i Örebro, första året. Pojkvännen Viktor är med 15–22 juli. Reser hem 22 juli kl 14.50 från Montpellier flygplats.",
    tags: [],
    color: "#c77dff",
  },
  {
    name: "Viktor",
    profile:
      "Lejas pojkvän. Med på resan 15–22 juli: landar 15 juli kl 14.00 på Montpellier flygplats, reser hem 22 juli kl 14.50 tillsammans med Leja och Leo.",
    tags: [],
    color: "#ff8fb1",
  },
  {
    name: "Leo",
    age: 17,
    profile:
      "Fyller 18 den 17 juli under resan. Naturvetenskap på Sjölins i Stockholm. Gillar utegym och kalistenik. Alkohol i Frankrike är 18+ — Leo är 17 fram till 17 juli. Reser hem 22 juli kl 14.50 från Montpellier flygplats.",
    tags: ["utegym", "kalistenik"],
    color: "#f0736a",
  },
  {
    name: "Elton",
    age: 9,
    profile: "Spelar fotboll, coachas av Andreas.",
    tags: ["fotboll"],
    color: "#a3d977",
  },
];

export const FAMILY_NAMES = FAMILY.map((p) => p.name);

export function personColor(name: string | null | undefined): string {
  return FAMILY.find((p) => p.name === name)?.color ?? "#9aa3b2";
}

export const HOME_ADDRESS = "12 Rue Nicolas Copernic, 34000 Montpellier";

// Geokodad via Nominatim (Prés d'Arènes/Aiguerelles, södra Montpellier)
export const HOME_COORDS = { lat: 43.5951, lng: 3.8991 };
