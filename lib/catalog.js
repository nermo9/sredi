/**
 * Service categories and the demo tasks shown to signed-out visitors.
 * Extracted from app/page.js so the data is editable without touching the
 * ~3,900-line page component (Ch.14: category management should not require
 * hunting through UI code).
 */
export const categories = [
  { icon: "cleaning", name: "Čišćenje" },
  { icon: "moving", name: "Selidbe" },
  { icon: "garden", name: "Kuća & bašta" },
  { icon: "tools", name: "Montaža" },
  { icon: "car", name: "Prevoz" },
  { icon: "hand", name: "Praktična pomoć" },
  { icon: "home", name: "Nekretnine" },
  { icon: "grid", name: "Ostalo" },
];

export const demoJobs = [
  {
    id: "demo-1",
    demo: true,
    icon: "🧹",
    title: "Čišćenje stana",
    city: "Sarajevo",
    category: "Čišćenje",
    price: 80,
    description: "Potrebna pomoć oko generalnog čišćenja stana.",
    owner: "Amir K.",
    status: "open",
  },
  {
    id: "demo-2",
    demo: true,
    icon: "📦",
    title: "Pomoć pri selidbi",
    city: "Mostar",
    category: "Selidbe",
    price: 120,
    description: "Potrebna pomoć pri nošenju stvari i selidbi.",
    owner: "Lejla M.",
    status: "open",
  },
  {
    id: "demo-3",
    demo: true,
    icon: "🌿",
    title: "Sređivanje bašte",
    city: "Tuzla",
    category: "Kuća & bašta",
    price: 100,
    description: "Košenje trave i osnovno sređivanje bašte.",
    owner: "Haris S.",
    status: "open",
  },
  {
    id: "demo-4",
    demo: true,
    icon: "🔧",
    title: "Montaža ormara",
    city: "Banja Luka",
    category: "Montaža",
    price: 90,
    description: "Potrebna montaža novog ormara.",
    owner: "Jasmina D.",
    status: "open",
  },
];
