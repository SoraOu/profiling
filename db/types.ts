export interface SurveyYear {
  id: number;
  year: number;
}

export interface Barangay {
  id: number;
  name: string;
  municipality: string;
  year_id: number;
}

export interface Household {
  id: number;
  year_id: number;
  barangay_id: number;
  is_draft: number;
  hh_id: string | null;
  hh_head_name: string | null;
  purok: string | null;
  location_type: string | null;
  dwelling_type: string | null;
  toilet_facility: string | null;
  water_drinking: string | null;
  water_daily_use: string | null;
  waste_disposal: string | null;
  created_at: string;
}

export interface FamilyHead {
  id: number;
  household_id: number;
  name: string | null;
  date_of_interview: string | null;
  contact_no: string | null;
  member_count: number;
  income_sources: string;
  income_sources_other: string | null;
  income_range: string | null;
  gov_programs: string;
  livelihoods: string;
  gov_programs_other: string | null;
  hfias_q1: number;
  hfias_q2: number;
  hfias_q3: number;
  hfias_q4: number;
  hfias_q5: number;
  hfias_q6: number;
  hfias_q7: number;
  hfias_q8: number;
  hfias_q9: number;
  hfias_total: number;
  hfias_interpretation: string | null;
  coping_strategies: string;
  skills: string;
  created_at: string;
}

export interface Child {
  id: number;
  family_head_id: number;
  household_id: number;
  name: string | null;
  birthday: string | null;
  age_in_days: number | null;
  nutritional_statuses: string;
  disability: string | null;
  medical_condition: string | null;
  created_at: string;
}

export interface FamilyHeadParsed extends Omit<FamilyHead,
  'income_sources' | 'gov_programs' | 'livelihoods' | 'coping_strategies' | 'skills'
> {
  income_sources: string[];
  gov_programs: string[];
  livelihoods: string[];
  coping_strategies: string[];
  skills: string[];
}

export interface ChildParsed extends Omit<Child, 'nutritional_statuses'> {
  nutritional_statuses: string[];
}

export const LOCATION_TYPES = [
  "Urban (Within City/town) Bayan",
  "Rural – Inland (Ilaya)",
  "Rural – Coastal (Tabing dagat)",
  "Rural – Upland (Bundok)",
] as const;

export const DWELLING_TYPES = [
  "Concrete",
  "Semi-concrete",
  "Light materials",
  "Makeshift",
] as const;

export const TOILET_FACILITIES = [
  "Water-sealed (own)",
  "Shared",
  "Pit latrine (hukay)",
  "Open defecation",
] as const;

export const WATER_SOURCES = [
  "Level I (balon, poso)",
  "Level II (gripong pang komunidad)",
  "Level III (waterworks system - Maynilad, Municipal, Barangay)",
  "Water Refilling Stations",
  "Unimproved (ilog, sapa, bukal)",
] as const;

export const WASTE_DISPOSAL_TYPES = [
  "Collected",
  "Burned",
  "Open dumping",
  "Composting",
] as const;

export const INCOME_SOURCES = [
  "Farming",
  "Fishing",
  "Labor (skilled/unskilled)",
  "Government employment",
  "Private employment",
  "Business",
  "Remittances",
  "Others",
] as const;

export const INCOME_RANGES = [
  "₱5,000 and below",
  "₱5,001 - ₱10,000",
  "₱10,001 - ₱20,000",
  "₱20,001 and above",
] as const;

export const GOV_PROGRAMS = [
  "4Ps (Pantawid Pamilyang Pilipino Program)",
  "Supplementary Feeding Program",
  "Tutok Kainan",
  "Livelihood Assistance",
  "PhilHealth Member",
  "Others",
] as const;

export const LIVELIHOOD_SOURCES = [
  "LGU",
  "DA",
  "DOLE",
] as const;

export const NUTRITIONAL_STATUSES = [
  "UW",
  "SUW",
  "MAM",
  "SAM",
  "ST",
  "SST",
  "OW",
  "OB",
] as const;

export const SKILLS_LIST = [
  "Cooking / Food preparation",
  "Baking",
  "Food processing (e.g., drying, preserving, bottling)",
  "Sari-sari store / small business management",
  "Farming (crop production)",
  "Gardening / Urban gardening",
  "Basic livestock raising (chicken, pigs, goats)",
  "Fishing / Aquaculture",
  "Carpentry",
  "Masonry",
  "Sewing / Tailoring",
  "Handicrafts (weaving, beadwork, etc.)",
  "Driving",
  "Housekeeping / Domestic work",
  "Computer / Digital skills",
  "Others",
] as const;

export const COPING_STRATEGIES_LIST = [
  "Borrow food/money",
  "Reduce meal size",
  "Skip meals",
  "Buy cheaper food",
  "Sell assets",
] as const;

export const HFIAS_QUESTIONS = [
  "Nag-alala tungkol sa pagkain",
  "Hindi nakakain ng gustong pagkain",
  "Limitado ang klase ng pagkaing nakakain",
  "Kumakain ng pagkaing hindi naman gusto",
  "Kumakain ng mas kaunting dami ng pagkain",
  "Kumakain ng mas kaunting beses sa isang araw",
  "Walang pagkain sa bahay",
  "Natutulog nang gutom",
  "Isang buong araw na walang kinain",
] as const;