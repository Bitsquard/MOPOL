/* ------------------------------------------------------------------ */
/*  The 50-point screening catalog.                                    */
/*  kind "auto" → evaluated by rule against vault data.                */
/*  kind "ai"   → evaluated by the AI against sealed documents.        */
/*  Every check returns ONLY a status + short evidence phrase.         */
/* ------------------------------------------------------------------ */

export type ReqStatus = "met" | "not_met" | "unknown" | "sealed";

export interface ReqContext {
  age: number | null;
  hasPhoto: boolean;
  dobOnFile: boolean;
  location: string;
  trustScore: number | null;
  trustVisible: boolean;
  remarksCount: number;
  allLoanFree: boolean;
  careerYears: number;
  hasProjects: boolean;
  hasCareerHistory: boolean;
  hasDocs: boolean;
}

export interface RequirementDef {
  id: string;
  label: string;
  cat: string;
  kind: "auto" | "ai";
  auto?: (c: ReqContext) => boolean | null; // null = sealed/unknown
}

export const REQUIREMENTS: RequirementDef[] = [
  /* ---------- Identity & eligibility (8) ---------- */
  { id: "age18", label: "Candidate is 18 or older", cat: "Identity & eligibility", kind: "auto", auto: (c) => (c.age === null ? null : c.age >= 18) },
  { id: "age21", label: "Candidate is 21 or older", cat: "Identity & eligibility", kind: "auto", auto: (c) => (c.age === null ? null : c.age >= 21) },
  { id: "age25", label: "Candidate is 25 or older", cat: "Identity & eligibility", kind: "auto", auto: (c) => (c.age === null ? null : c.age >= 25) },
  { id: "age30", label: "Candidate is 30 or older", cat: "Identity & eligibility", kind: "auto", auto: (c) => (c.age === null ? null : c.age >= 30) },
  { id: "ageband", label: "Falls in the 25–34 age band", cat: "Identity & eligibility", kind: "auto", auto: (c) => (c.age === null ? null : c.age >= 25 && c.age <= 34) },
  { id: "dob", label: "Date of birth on file", cat: "Identity & eligibility", kind: "auto", auto: (c) => c.dobOnFile },
  { id: "photo", label: "Profile photo on file", cat: "Identity & eligibility", kind: "auto", auto: (c) => c.hasPhoto },
  { id: "location", label: "Location disclosed", cat: "Identity & eligibility", kind: "auto", auto: (c) => c.location.length > 0 },

  /* ---------- Experience (10) ---------- */
  { id: "exp1", label: "1+ years of experience", cat: "Experience", kind: "auto", auto: (c) => c.careerYears >= 1 },
  { id: "exp2", label: "2+ years of experience", cat: "Experience", kind: "auto", auto: (c) => c.careerYears >= 2 },
  { id: "exp3", label: "3+ years of experience", cat: "Experience", kind: "auto", auto: (c) => c.careerYears >= 3 },
  { id: "exp5", label: "5+ years of experience", cat: "Experience", kind: "auto", auto: (c) => c.careerYears >= 5 },
  { id: "exp8", label: "8+ years of experience", cat: "Experience", kind: "auto", auto: (c) => c.careerYears >= 8 },
  { id: "lead", label: "Led a team or mentored others", cat: "Experience", kind: "ai" },
  { id: "fintech", label: "Fintech industry experience", cat: "Experience", kind: "ai" },
  { id: "startup", label: "Startup environment experience", cat: "Experience", kind: "ai" },
  { id: "remote_exp", label: "Remote work experience", cat: "Experience", kind: "ai" },
  { id: "portfolio", label: "Portfolio of shipped projects", cat: "Experience", kind: "auto", auto: (c) => c.hasProjects },

  /* ---------- Skills (10) ---------- */
  { id: "frontend", label: "Frontend development", cat: "Skills", kind: "ai" },
  { id: "backend", label: "Backend development", cat: "Skills", kind: "ai" },
  { id: "fullstack", label: "Full-stack capability", cat: "Skills", kind: "ai" },
  { id: "mobile", label: "Mobile development", cat: "Skills", kind: "ai" },
  { id: "data_ai", label: "Data / AI / ML exposure", cat: "Skills", kind: "ai" },
  { id: "devops", label: "DevOps / cloud infrastructure", cat: "Skills", kind: "ai" },
  { id: "design", label: "UI/UX design ability", cat: "Skills", kind: "ai" },
  { id: "qa", label: "Testing / QA discipline", cat: "Skills", kind: "ai" },
  { id: "pm", label: "Product management exposure", cat: "Skills", kind: "ai" },
  { id: "communication", label: "Strong communication skills", cat: "Skills", kind: "ai" },

  /* ---------- Education & certifications (5) ---------- */
  { id: "degree", label: "Holds a university degree", cat: "Education & certifications", kind: "ai" },
  { id: "masters", label: "Postgraduate qualification", cat: "Education & certifications", kind: "ai" },
  { id: "cert", label: "Professional certification", cat: "Education & certifications", kind: "ai" },
  { id: "bootcamp", label: "Bootcamp / vocational training", cat: "Education & certifications", kind: "ai" },
  { id: "learning", label: "Evidence of continuous learning", cat: "Education & certifications", kind: "ai" },

  /* ---------- Trust & conduct (9) ---------- */
  { id: "trust60", label: "Trust Score of 60+", cat: "Trust & conduct", kind: "auto", auto: (c) => (c.trustScore === null ? null : c.trustScore >= 60) },
  { id: "trust75", label: "Trust Score of 75+", cat: "Trust & conduct", kind: "auto", auto: (c) => (c.trustScore === null ? null : c.trustScore >= 75) },
  { id: "trust90", label: "Trust Score of 90+", cat: "Trust & conduct", kind: "auto", auto: (c) => (c.trustScore === null ? null : c.trustScore >= 90) },
  { id: "loanfree", label: "Certified loan-free tenure", cat: "Trust & conduct", kind: "auto", auto: (c) => (c.remarksCount === 0 ? null : c.allLoanFree) },
  { id: "remarks1", label: "At least 1 employer remark", cat: "Trust & conduct", kind: "auto", auto: (c) => c.remarksCount >= 1 },
  { id: "remarks2", label: "2+ employer remarks", cat: "Trust & conduct", kind: "auto", auto: (c) => c.remarksCount >= 2 },
  { id: "wordkeeping", label: "Word-keeping praised by employers", cat: "Trust & conduct", kind: "ai" },
  { id: "reference", label: "References available on request", cat: "Trust & conduct", kind: "ai" },
  { id: "reliability", label: "Reliability confirmed by past employers", cat: "Trust & conduct", kind: "ai" },

  /* ---------- Availability & logistics (8) ---------- */
  { id: "immediate", label: "Can start within 2 weeks", cat: "Availability & logistics", kind: "ai" },
  { id: "fulltime", label: "Open to full-time roles", cat: "Availability & logistics", kind: "ai" },
  { id: "contract", label: "Open to contract work", cat: "Availability & logistics", kind: "ai" },
  { id: "remote_ok", label: "Open to remote work", cat: "Availability & logistics", kind: "ai" },
  { id: "hybrid_ok", label: "Open to hybrid work", cat: "Availability & logistics", kind: "ai" },
  { id: "relocate", label: "Open to relocation", cat: "Availability & logistics", kind: "ai" },
  { id: "lagos", label: "Based in Lagos", cat: "Availability & logistics", kind: "ai" },
  { id: "ng_auth", label: "Authorized to work in Nigeria", cat: "Availability & logistics", kind: "ai" },
];

export const REQUIREMENT_CATEGORIES = [...new Set(REQUIREMENTS.map((r) => r.cat))];

export const publicCatalog = REQUIREMENTS.map(({ id, label, cat }) => ({ id, label, cat }));
