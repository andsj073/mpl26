// Familjen är fast — sju personer, ingen CRUD-UI. Hålls i kod istället
// för databas så att chattens systemprompt alltid har profilerna.

export type Person = {
  name: string;
  age?: number;
  profile: string;
  tags: string[];
};

export const FAMILY: Person[] = [
  {
    name: "Andreas",
    age: 51,
    profile:
      "IT-konsult, tränar halvmaraton, gillar äkta upplevelser över turistfällor. Coachar Elton i fotboll.",
    tags: ["löpning", "äkta upplevelser", "fotboll"],
  },
  {
    name: "Elin",
    age: 49,
    profile:
      "Ergonom på Volvo, fyller 50 den 12 juli under resan. Gillar städer, kultur, vin, mat, promenader. Inte strapatser.",
    tags: ["kultur", "vin", "mat", "promenader"],
  },
  {
    name: "William",
    age: 25,
    profile:
      "Snart klar civilingenjör i Lund. Reser med flickvännen Anna. Reser hem 20 juli kl 14.50 från Montpellier flygplats.",
    tags: [],
  },
  {
    name: "Anna",
    age: 25,
    profile:
      "Williams flickvän. Reser hem 20 juli kl 14.50 från Montpellier flygplats.",
    tags: [],
  },
  {
    name: "Leja",
    age: 24,
    profile:
      "Läser juridik i Örebro, första året. Reser hem 22 juli kl 14.50 från Montpellier flygplats.",
    tags: [],
  },
  {
    name: "Leo",
    age: 17,
    profile:
      "Fyller 18 den 17 juli under resan. Naturvetenskap på Sjölins i Stockholm. Gillar utegym och kalistenik. Alkohol i Frankrike är 18+ — Leo är 17 fram till 17 juli. Reser hem 22 juli kl 14.50 från Montpellier flygplats.",
    tags: ["utegym", "kalistenik"],
  },
  {
    name: "Viktor",
    profile:
      "Med på resan 15–22 juli: landar 15 juli kl 14.00 på Montpellier flygplats, reser hem 22 juli kl 14.50 tillsammans med Leja och Leo.",
    tags: [],
  },
  {
    name: "Elton",
    age: 9,
    profile: "Spelar fotboll, coachas av Andreas.",
    tags: ["fotboll"],
  },
];

export const FAMILY_NAMES = FAMILY.map((p) => p.name);

export const HOME_ADDRESS =
  "12 Rue Nicolas Copernic, Hôpitaux-Facultés, Montpellier";
