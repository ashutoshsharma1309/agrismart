import { clamp } from './utils';

export type SoilInput = {
  n: number;
  p: number;
  k: number;
  ph: number;
  organicCarbon: number;
  fertilizer?: string;
  pesticide?: string;
};

export type SoilResult = {
  fertilizer: { name: string; rationale: string; dosage: string };
  pesticide: { name: string; rationale: string };
  healthScore: number;
  plan: { step: number; title: string; body: string }[];
};

const PESTICIDE_SWAPS: Record<string, { name: string; rationale: string }> = {
  chlorpyrifos: {
    name: 'Neem oil (5% solution)',
    rationale:
      'Chlorpyrifos is being phased out in many states due to bee toxicity. A 5% neem-oil solution targets the same soft-bodied pests without residue.',
  },
  cypermethrin: {
    name: 'Pyrethrin + insecticidal soap',
    rationale:
      'Pyrethrin breaks down in 24 hours instead of persisting in soil, and combines well with mild insecticidal soap for the same pest spectrum.',
  },
  imidacloprid: {
    name: 'Azadirachtin 1% EC (neem-based)',
    rationale:
      'Systemic neem extracts give similar aphid and whitefly control while preserving pollinators.',
  },
  monocrotophos: {
    name: 'Trichogramma parasitoids + Bt spray',
    rationale:
      'Monocrotophos is banned on several crops. Biological control with Trichogramma eggs plus a Bt spray is safer and approved.',
  },
  glyphosate: {
    name: 'Mechanical weeding + mulch',
    rationale:
      'Reduce reliance on glyphosate with intercrop mulching and hoeing at the 2–4 leaf stage of weeds.',
  },
  paraquat: {
    name: 'Vinegar-based contact herbicide',
    rationale:
      'Paraquat has serious human toxicity. Acetic-acid (20%) contact sprays burn down annual weeds without the health risks.',
  },
};

export function analyseSoil(input: SoilInput): SoilResult {
  const { n, p, k, ph, organicCarbon, pesticide } = input;

  // Fertilizer recommendation
  let fertilizerName = 'Balanced NPK 10-26-26 with compost top-dressing';
  let fertilizerRationale =
    'Your nutrient levels are within a healthy range. A balanced NPK with compost maintains fertility without runoff risk.';
  let fertilizerDosage = '100 kg/acre at sowing + 5 tonnes compost annually';

  if (n < 40) {
    fertilizerName = 'Vermicompost + Azolla green manure';
    fertilizerRationale =
      'Nitrogen is low. Vermicompost releases N slowly and Azolla adds live nitrogen fixation — gentler on soil biology than urea.';
    fertilizerDosage = '2 tonnes vermicompost/acre; Azolla biomass as top dressing';
  } else if (organicCarbon > 0.75) {
    fertilizerName = 'Well-rotted farmyard manure + bone meal';
    fertilizerRationale =
      'Your soil already has healthy organic carbon. Rely on compost instead of urea — synthetic N would disrupt your microbial balance.';
    fertilizerDosage = '3 tonnes FYM/acre + 50 kg bone meal for phosphorus';
  } else if (p < 25) {
    fertilizerName = 'Rock phosphate + mustard green manure';
    fertilizerRationale =
      'Phosphorus is limited. Rock phosphate with a mustard cover crop releases P slowly and improves soil structure.';
    fertilizerDosage = '200 kg rock phosphate/acre before sowing';
  } else if (k < 25) {
    fertilizerName = 'Wood ash + banana pseudostem compost';
    fertilizerRationale =
      'Potassium is low. Wood ash (wood-fired kilns) and banana pseudostem compost are excellent organic K sources.';
    fertilizerDosage = '100 kg wood ash + 1 tonne banana compost per acre';
  }

  // pH adjustment notes
  if (ph < 6.0) {
    fertilizerRationale +=
      ' Soil is acidic (pH below 6) — add 300–500 kg of agricultural lime per acre before your next cycle.';
  } else if (ph > 7.8) {
    fertilizerRationale +=
      ' Soil is slightly alkaline (pH above 7.8) — incorporate 200 kg gypsum and green manure to bring it back towards neutral.';
  }

  // Pesticide swap
  const key = (pesticide ?? '').toLowerCase().trim();
  const match = Object.keys(PESTICIDE_SWAPS).find((k) => key.includes(k));
  const pest = match
    ? PESTICIDE_SWAPS[match]
    : {
        name: 'Integrated Pest Management (IPM) kit',
        rationale:
          'No known risky input detected. Keep using pheromone traps, yellow sticky cards and weekly scouting as your first line of defence.',
      };

  // Soil health score (0–100)
  const nScore = clamp(n / 80, 0, 1);
  const pScore = clamp(p / 60, 0, 1);
  const kScore = clamp(k / 80, 0, 1);
  const phScore = ph >= 6.0 && ph <= 7.5 ? 1 : clamp(1 - Math.abs(6.75 - ph) / 2, 0, 1);
  const ocScore = clamp(organicCarbon / 1.0, 0, 1);
  const healthScore = Math.round(
    (nScore * 0.2 + pScore * 0.2 + kScore * 0.2 + phScore * 0.2 + ocScore * 0.2) * 100,
  );

  // 3-step plan
  const plan = [
    {
      step: 1,
      title: 'This week',
      body: ph < 6
        ? 'Apply lime to correct acidity, then wait 7 days before any nitrogen application.'
        : 'Apply a light compost top-dressing and water in gently so nutrients reach the root zone.',
    },
    {
      step: 2,
      title: 'Next 2–3 weeks',
      body: `Start using ${pest.name} for any pest emergence. Scout fields every 3 days and keep a simple log.`,
    },
    {
      step: 3,
      title: 'Through the season',
      body:
        organicCarbon < 0.5
          ? 'Build organic matter: grow a green-manure cover crop (dhaincha / sunn hemp) before your next main crop.'
          : 'Maintain your soil: split nitrogen into 2–3 doses through the crop cycle and retain crop residue as mulch.',
    },
  ];

  return {
    fertilizer: { name: fertilizerName, rationale: fertilizerRationale, dosage: fertilizerDosage },
    pesticide: pest,
    healthScore,
    plan,
  };
}
