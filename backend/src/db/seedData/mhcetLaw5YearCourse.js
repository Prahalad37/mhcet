/**
 * Single “course” offering for MHCET Law 5-Year LLB: one full-pattern mock with dummy MCQs.
 * Section mix (30 Q, 120 min): Legal 8 · GK & CA 6 · Logical 8 · Math 2 · English 6.
 * Content is practice-only / illustrative, not copied from official papers.
 */

const SUBJECT_BY_ORDER = (order) => {
  if (order <= 8) return "Legal Aptitude";
  if (order <= 14) return "GK & Current Affairs";
  if (order <= 22) return "Logical Reasoning";
  if (order <= 24) return "Basic Math";
  return "English";
};

function q(prompt, option_a, option_b, option_c, option_d, correct, order, meta = {}) {
  return {
    prompt,
    option_a,
    option_b,
    option_c,
    option_d,
    correct,
    order,
    subject: SUBJECT_BY_ORDER(order),
    hint: meta.hint ?? null,
    official_explanation: meta.ex ?? null,
  };
}

const DURATION_SEC = 120 * 60;
const COURSE_TOPIC = "MHCET Law (5-Year LLB)";

/** One catalog test — the only seeded mock when using this module. */
export const mhcetLaw5YearTests = [
  {
    title: "MHCET Law (5-Year LLB) — Full pattern mock",
    topic: COURSE_TOPIC,
    description:
      "Single organized practice mock for the 5-year LLB entrance: 30 MCQs in exam-style sections (Legal Aptitude, GK & Current Affairs, Logical Reasoning, Basic Math, English). Timed 120 minutes. Dummy items for UX and flows — replace with real item bank later.",
    durationSeconds: DURATION_SEC,
    questions: [
      q(
        "In Indian constitutional law, which Article is most directly associated with the idea of ‘equality before the law’ and ‘equal protection of the laws’?",
        "Article 21",
        "Article 14",
        "Article 19(1)(a)",
        "Article 352",
        "B",
        1,
        { ex: "Article 14 guarantees equality before the law and equal protection of laws within the territory of India." }
      ),
      q(
        "Under the Indian Contract Act, 1872, a person who is not a party to the contract can sometimes enforce rights under certain statutes (e.g. insurance). The general contract rule taught first is:",
        "Every stranger may sue on any contract",
        "Privity of contract: only parties are generally bound (subject to stated exceptions)",
        "All oral contracts bind third parties",
        "Minors are always liable",
        "B",
        2
      ),
      q(
        "Which writ is commonly described as a remedy to secure the release of a person allegedly detained unlawfully?",
        "Quo warranto",
        "Habeas corpus",
        "Mandamus",
        "Certiorari",
        "B",
        3
      ),
      q(
        "The Latin maxim actus non facit reum nisi mens sit rea is most closely aligned with which general proposition?",
        "Strict liability needs no fault",
        "Normally, criminal liability requires a wrongful act and a guilty mind (broadly)",
        "Civil wrongs never need intent",
        "Negligence is always a crime",
        "B",
        4
      ),
      q(
        "In torts, the defence that the plaintiff voluntarily accepted a known risk is often labelled:",
        "Vis major",
        "Volenti non fit injuria",
        "Inevitable accident",
        "Contributory negligence (complete bar in all systems)",
        "B",
        5
      ),
      q(
        "Directive Principles of State Policy (DPSP) in the Constitution of India are found primarily in:",
        "Part III",
        "Part IV",
        "Part XI",
        "Schedule VII only",
        "B",
        6
      ),
      q(
        "The expression ‘basic structure’ of the Constitution, in common competitive-exam framing, was developed prominently through judicial decisions concerning limits on:",
        "Ordinary legislation only",
        "The amending power under Article 368",
        "Tax laws only",
        "State List subjects only",
        "B",
        7
      ),
      q(
        "Which of these is characteristically described as a quasi-contract under Chapter V of the Indian Contract Act?",
        "A wagering contract",
        "Relations imposed by law to prevent unjust enrichment (e.g., supply of necessaries)",
        "A contract by deed",
        "An agreement without lawful consideration in every case",
        "B",
        8
      ),
      q(
        "India’s Republic Day is observed on:",
        "15 August",
        "26 January",
        "2 October",
        "14 November",
        "B",
        9
      ),
      q(
        "Which river is often described as the longest river in peninsular India?",
        "Yamuna",
        "Godavari",
        "Ganga",
        "Teesta",
        "B",
        10
      ),
      q(
        "The currency of Japan is:",
        "Won",
        "Yen",
        "Baht",
        "Ringgit",
        "B",
        11
      ),
      q(
        "WHO (World Health Organization) is a specialised agency of:",
        "IMF",
        "United Nations",
        "World Bank",
        "WTO",
        "B",
        12
      ),
      q(
        "Which planet is known as the Red Planet?",
        "Venus",
        "Mars",
        "Jupiter",
        "Saturn",
        "B",
        13
      ),
      q(
        "The first general elections in independent India were held in:",
        "1947",
        "1950–51",
        "1962",
        "1957 only",
        "B",
        14
      ),
      q(
        "All crows are birds. Some birds can fly. Which conclusion is definitely true?",
        "Some crows cannot fly",
        "All crows can fly",
        "No crows are birds",
        "None of the given conclusions necessarily follows from these statements alone",
        "D",
        15
      ),
      q(
        "Find the odd one out: Sparrow, Eagle, Bat, Pigeon",
        "Sparrow",
        "Eagle",
        "Bat",
        "Pigeon",
        "C",
        16,
        { hint: "Think mammals vs birds." }
      ),
      q(
        "In a certain code, TREE is written as UQFF. How is BOOK written in the same pattern (each letter +1)?",
        "CNNL",
        "CPPL",
        "CPLL",
        "DPPL",
        "B",
        17
      ),
      q(
        "If the day after tomorrow is Friday, what day was it yesterday?",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "B",
        18
      ),
      q(
        "Complete the series: 2, 6, 12, 20, 30, ?",
        "40",
        "42",
        "44",
        "48",
        "B",
        19
      ),
      q(
        "Pointing to a photograph, Ravi said, ‘She is the only daughter of my mother’s mother.’ Who is in the photograph?",
        "Ravi’s sister",
        "Ravi’s mother",
        "Ravi’s aunt",
        "Cannot be determined",
        "B",
        20
      ),
      q(
        "Statement: All bottles are containers. Some containers are plastic. Conclusion I: Some bottles are plastic. Conclusion II: All plastic are bottles.",
        "Only I follows",
        "Only II follows",
        "Both follow",
        "Neither follows",
        "D",
        21
      ),
      q(
        "If ‘South-East’ becomes ‘North-West’, the map is rotated by how many degrees in a common transformation trick question (clockwise/counter is not specified; pick the standard 180° flip of direction)?",
        "90°",
        "180°",
        "270°",
        "45°",
        "B",
        22
      ),
      q(
        "A shop marks a bag at ₹1,000 and gives 10% discount. The selling price is:",
        "₹800",
        "₹900",
        "₹950",
        "₹1,100",
        "B",
        23
      ),
      q(
        "Simple interest on ₹4,000 for 2 years at 5% per annum is:",
        "₹200",
        "₹400",
        "₹440",
        "₹800",
        "B",
        24
      ),
      q(
        "Choose the word most nearly opposite in meaning to ABUNDANT:",
        "Plentiful",
        "Scarce",
        "Overflowing",
        "Copious",
        "B",
        25
      ),
      q(
        "Identify the segment with incorrect grammar: ‘She don’t like coffee.’",
        "She",
        "don’t",
        "like",
        "coffee",
        "B",
        26
      ),
      q(
        "The idiom ‘once in a blue moon’ means:",
        "Very often",
        "Very rarely",
        "Only at night",
        "During festivals",
        "B",
        27
      ),
      q(
        "Choose the best synonym for BRIEF:",
        "Lengthy",
        "Concise",
        "Vague",
        "Hostile",
        "B",
        28
      ),
      q(
        "Fill in the blank: He was obliged ___ his mistake.",
        "for admitting",
        "to admit",
        "admitting",
        "about admitting",
        "B",
        29
      ),
      q(
        "Reading snippet: ‘The committee postponed the decision because it needed more data.’ The word ‘postponed’ means:",
        "Cancelled forever",
        "Delayed to a later time",
        "Hid",
        "Rejected",
        "B",
        30
      ),
    ],
  },
];
