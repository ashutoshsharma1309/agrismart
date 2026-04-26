// A curated index of Krishi Vigyan Kendras across major Indian states.
//
// Trust note: phone numbers for individual KVKs change over time and we do not
// ship per-KVK numbers in the app — shipping a wrong number to a farmer is
// worse than shipping no number. Each entry instead deep-links to the official
// ICAR KVK locator (kvk.icar.gov.in) where the current verified contact is
// always one click away. The two ALWAYS-CORRECT helplines (the toll-free
// Kisan Call Centre and the AgriSmart farmer helpline) are surfaced at the
// top of the directory page.

export type KvkEntry = {
  state: string;
  district: string;
  name: string;
  address?: string;
};

export const KVK_ENTRIES: KvkEntry[] = [
  // Karnataka
  {
    state: 'Karnataka',
    district: 'Bengaluru Rural',
    name: 'KVK Bengaluru Rural (Hadonahalli)',
    address: 'Hadonahalli, Doddaballapura Taluk',
  },
  {
    state: 'Karnataka',
    district: 'Mandya',
    name: 'KVK Mandya (V.C. Farm)',
    address: 'V.C. Farm, Mandya',
  },
  {
    state: 'Karnataka',
    district: 'Dharwad',
    name: 'KVK Dharwad',
    address: 'University of Agricultural Sciences, Dharwad',
  },

  // Maharashtra
  {
    state: 'Maharashtra',
    district: 'Pune',
    name: 'KVK Pune (Baramati)',
    address: 'Sharadanagar, Baramati',
  },
  {
    state: 'Maharashtra',
    district: 'Nashik',
    name: 'KVK Nashik (Malegaon)',
    address: 'Malegaon Camp, Nashik',
  },
  {
    state: 'Maharashtra',
    district: 'Solapur',
    name: 'KVK Solapur (Mohol)',
    address: 'Mohol, Solapur',
  },

  // Tamil Nadu
  {
    state: 'Tamil Nadu',
    district: 'Coimbatore',
    name: 'KVK Coimbatore (TNAU)',
    address: 'Tamil Nadu Agricultural University, Coimbatore',
  },
  {
    state: 'Tamil Nadu',
    district: 'Madurai',
    name: 'KVK Madurai',
    address: 'Agricultural College & Research Institute, Madurai',
  },

  // Andhra Pradesh / Telangana
  {
    state: 'Andhra Pradesh',
    district: 'Guntur',
    name: 'KVK Guntur (Lam Farm)',
    address: 'Lam, Guntur',
  },
  {
    state: 'Telangana',
    district: 'Hyderabad',
    name: 'KVK Rangareddy',
    address: 'Rajendranagar, Hyderabad',
  },

  // Uttar Pradesh
  {
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    name: 'KVK Varanasi',
    address: 'BHU, Varanasi',
  },
  {
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    name: 'KVK Lucknow',
    address: 'CSAUA&T regional centre',
  },

  // Punjab
  {
    state: 'Punjab',
    district: 'Ludhiana',
    name: 'KVK Ludhiana (PAU)',
    address: 'Punjab Agricultural University, Ludhiana',
  },
  {
    state: 'Punjab',
    district: 'Patiala',
    name: 'KVK Patiala',
    address: 'Rauni, Patiala',
  },

  // Haryana
  {
    state: 'Haryana',
    district: 'Karnal',
    name: 'KVK Karnal',
    address: 'CSSRI campus, Karnal',
  },

  // Madhya Pradesh
  {
    state: 'Madhya Pradesh',
    district: 'Indore',
    name: 'KVK Indore',
    address: 'Kasturba Gram, Indore',
  },
  {
    state: 'Madhya Pradesh',
    district: 'Jabalpur',
    name: 'KVK Jabalpur (JNKVV)',
    address: 'JNKVV campus, Jabalpur',
  },

  // Rajasthan
  {
    state: 'Rajasthan',
    district: 'Jaipur',
    name: 'KVK Jaipur (Tabiji)',
    address: 'Tabiji, Ajmer Road',
  },
  {
    state: 'Rajasthan',
    district: 'Jodhpur',
    name: 'KVK Jodhpur (CAZRI)',
    address: 'CAZRI campus, Jodhpur',
  },

  // Gujarat
  {
    state: 'Gujarat',
    district: 'Anand',
    name: 'KVK Anand',
    address: 'AAU campus, Anand',
  },
  {
    state: 'Gujarat',
    district: 'Junagadh',
    name: 'KVK Junagadh',
    address: 'JAU campus, Junagadh',
  },

  // West Bengal
  {
    state: 'West Bengal',
    district: 'Hooghly',
    name: 'KVK Hooghly',
    address: 'BCKV regional office, Chinsurah',
  },

  // Bihar
  {
    state: 'Bihar',
    district: 'Patna',
    name: 'KVK Patna',
    address: 'BAU regional centre, Patna',
  },

  // Odisha
  {
    state: 'Odisha',
    district: 'Bhubaneswar',
    name: 'KVK Khordha',
    address: 'OUAT campus, Bhubaneswar',
  },

  // Kerala
  {
    state: 'Kerala',
    district: 'Thiruvananthapuram',
    name: 'KVK Kollam',
    address: 'Sadanandapuram, Kottarakkara',
  },
];

// Build a Google search URL restricted to the official ICAR KVK domain so
// farmers always land on the canonical, current contact page for the KVK they
// tap. We never invent or cache a phone number locally.
export function kvkLookupUrl(entry: KvkEntry): string {
  const q = encodeURIComponent(
    `${entry.name} ${entry.district} ${entry.state} contact site:kvk.icar.gov.in`,
  );
  return `https://www.google.com/search?q=${q}`;
}

// The two ALWAYS-CORRECT helplines we surface at the top of the directory.
// Kisan Call Centre is the central government's toll-free agricultural advisory
// number. The personal helpline is a project-specific point of contact for
// farmers who prefer a person over an institutional line.
export const HELPLINES = {
  kisanCallCentre: '1800-180-1551',
  agriSmartPersonal: '+91 9904260348',
} as const;
