/**
 * Five full-length-style MHCET Law (5-Year LLB) practice mocks.
 * Pattern aligned with public syllabus summaries: Legal Aptitude, GK, Logical Reasoning,
 * Basic Math, English — scaled to 30 MCQs per set (8+6+8+2+6). Timed at 120 minutes.
 * Questions are original / paraphrased for practice; not copied from proprietary papers.
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

const MOCK_DURATION_SEC = 120 * 60;
const MIXED_TOPIC = "Mixed (MHCET 5-Year pattern)";
const DESC = (n) =>
  `Full mock ${n} of 5: 30 MCQs (${MIXED_TOPIC}). Legal 8 · GK & CA 6 · Logical 8 · Math 2 · English 6. No negative marking (exam-style).`;

export const fullMockSets = [
  {
    title: "MHCET Law — Full Mock Set 1 of 5",
    topic: MIXED_TOPIC,
    description: DESC(1),
    durationSeconds: MOCK_DURATION_SEC,
    questions: [
      q(
        "Which one of the following is chiefly described as 'equality before the law and equal protection of laws' within India?",
        "Article 12",
        "Article 14",
        "Article 19(1)(g)",
        "Article 32",
        "B",
        1,
        {
          hint: "Think of the general equality guarantee in Part III.",
          ex: "Article 14 of the Indian Constitution encapsulates both formal equality (equality before the law) and substantive fairness through reasonable classification under 'equal protection of the laws'.",
        }
      ),
      q(
        "Under the Indian Contract Act, 1872, an agreement without consideration is void, except in cases listed in the Act. Which case is a classic classroom exception?",
        "Agreement on account of natural love and affection (registered, near relation)",
        "Agreement to pay time-barred debt orally",
        "Agreement to perform an impossible act knowingly",
        "Agreement made by a minor",
        "A",
        2,
        {
          ex: "Section 25 exceptions include love and affection (registered writing between near relations), compensation for past voluntary service, and a written promise to pay a time-barred debt.",
        }
      ),
      q(
        "Which writ is traditionally described as a remedy to produce the body of a person alleged to be unlawfully detained?",
        "Mandamus",
        "Certiorari",
        "Habeas corpus",
        "Prohibition",
        "C",
        3
      ),
      q(
        "The latin maxim 'actus non facit reum nisi mens sit rea' is most closely associated with which idea?",
        "Strict liability without fault",
        "No liability for omissions",
        "A wrongful act is not criminal without a guilty mind (generally)",
        "Civil negligence only",
        "C",
        4
      ),
      q(
        "In tort law, the defence of 'volenti non fit injuria' means roughly:",
        "The plaintiff freely assumed a known risk and cannot complain",
        "The defendant acted under statutory authority",
        "The harm was inevitable accident",
        "Contributory negligence bars all relief",
        "A",
        5
      ),
      q(
        "Directive Principles of State Policy in the Indian Constitution are found in:",
        "Part III",
        "Part IV",
        "Part V",
        "Part VI",
        "B",
        6
      ),
      q(
        "Which court ordinarily tries warrant cases arising from police reports at the district level under the CrPC scheme?",
        "Supreme Court of India",
        "Court of Sessions",
        "Revenue Board",
        "National Consumer Disputes Commission",
        "B",
        7
      ),
      q(
        "A 'quasi-contract' under Chapter V of the Indian Contract Act chiefly refers to:",
        "Express contracts reduced to writing",
        "Certain relations resembling contract imposed by law to prevent unjust enrichment",
        "Contracts ultra vires a company",
        "Wagering agreements",
        "B",
        8
      ),
      q(
        "The 'Chipko' movement (1970s) is best remembered for:",
        "Blue Revolution in fisheries",
        "Forest conservation by hugging trees in the Garhwal Himalayas",
        "Cooperative sugarcane pricing in Maharashtra",
        "Salt satyagraha extension",
        "B",
        9
      ),
      q(
        "India's first successful Mars orbiter mission is commonly known as:",
        "Chandrayaan-1",
        "Mangalyaan (Mars Orbiter Mission)",
        "Astrosat",
        "GSAT-30",
        "B",
        10
      ),
      q(
        "Fundamental Duties of citizens were inserted in the Constitution by which amendment?",
        "26th Constitutional Amendment",
        "42nd Constitutional Amendment",
        "44th Constitutional Amendment",
        "86th Constitutional Amendment",
        "B",
        11
      ),
      q(
        "Photosynthesis in green plants mainly yields glucose and:",
        "Nitrogen",
        "Oxygen",
        "Methane",
        "Sulphur dioxide",
        "B",
        12
      ),
      q(
        "The head office of the World Health Organization (WHO) is located in:",
        "New York",
        "Geneva",
        "Paris",
        "The Hague",
        "B",
        13
      ),
      q(
        "The Battle of Plassey (1757) is associated with the consolidation of which European power in Bengal?",
        "Portuguese",
        "Dutch",
        "British East India Company",
        "French",
        "C",
        14
      ),
      q(
        "Statements: (1) All advocates are readers. (2) Some readers are poets. Conclusion: Some advocates are poets.",
        "Definitely true",
        "Definitely false",
        "Not certain from the statements",
        "Contradictory",
        "C",
        15
      ),
      q(
        "Find the odd one out: Square, Rectangle, Parallelogram, Circle",
        "Square",
        "Rectangle",
        "Parallelogram",
        "Circle",
        "D",
        16
      ),
      q(
        "In a certain code, FISH is written as EHRG. How is LAKE written in the same code?",
        "KZJD",
        "MZLD",
        "KAJD",
        "JZKD",
        "A",
        17
      ),
      q(
        "Book is to Library as Bee is to:",
        "Flower",
        "Garden / Hive",
        "Honey",
        "Sting",
        "B",
        18
      ),
      q(
        "What comes next in the series: 3, 8, 15, 24, 35, ?",
        "44",
        "46",
        "48",
        "50",
        "C",
        19
      ),
      q(
        "Today is Wednesday. What day of the week will it be 10 days from today?",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
        "C",
        20
      ),
      q(
        "In a row, A is 7th from the left and B is 12th from the left. How many people sit between A and B if they face the same direction? (Assume distinct positions.)",
        "3",
        "4",
        "5",
        "6",
        "B",
        21
      ),
      q(
        "Which number continues the pattern: 2, 6, 12, 20, 30, ?",
        "38",
        "40",
        "42",
        "44",
        "C",
        22
      ),
      q(
        "What is 15% of 480?",
        "60",
        "64",
        "72",
        "80",
        "C",
        23
      ),
      q(
        "A shop marks a shirt ₹800 and gives 25% discount on the marked price. The selling price is:",
        "₹500",
        "₹600",
        "₹640",
        "₹650",
        "B",
        24
      ),
      q(
        "Choose the word most nearly opposite in meaning to OBSCURE.",
        "Hidden",
        "Clear",
        "Ancient",
        "Dull",
        "B",
        25
      ),
      q(
        "Select the option that best improves the sentence: Neither of the two witnesses were present in court.",
        "Neither of the two witnesses was present in court.",
        "Neither of the two witness were present in court.",
        "Neither to the two witnesses was present in court.",
        "Neither from the two witnesses were present in court.",
        "A",
        26
      ),
      q(
        "Choose the correct meaning of the idiom: To turn a blind eye.",
        "To inspect carefully",
        "To pretend not to notice something wrong",
        "To suffer vision loss",
        "To support openly",
        "B",
        27
      ),
      q(
        "Fill in the blank: The committee divided on minor issues ___ agreed on the main resolution.",
        "besides",
        "but",
        "however",
        "therefore",
        "B",
        28
      ),
      q(
        "A person who hates women in general is called:",
        "Misogynist",
        "Misanthrope",
        "Altruist",
        "Misandrist",
        "A",
        29
      ),
      q(
        "The synonym of PRUDENT is:",
        "Reckless",
        "Wise and careful",
        "Lazy",
        "Angry",
        "B",
        30
      ),
    ],
  },
  {
    title: "MHCET Law — Full Mock Set 2 of 5",
    topic: MIXED_TOPIC,
    description: DESC(2),
    durationSeconds: MOCK_DURATION_SEC,
    questions: [
      q(
        "Article 21 of the Indian Constitution protects:",
        "Right to property as a fundamental right only",
        "Right to life and personal liberty (subject to procedure established by law)",
        "Right to vote in all elections",
        "Right to foreign travel without restriction",
        "B",
        1
      ),
      q(
        "In contract law, 'consideration' must ordinarily move:",
        "Only from the promisor",
        "From the promisee or any other person as the parties intend (privity nuance aside at entrance level)",
        "Only from a stranger",
        "Only through written stamp paper",
        "B",
        2
      ),
      q(
        "Which maxim conveys that 'no one should be judge in their own cause'?",
        "Audi alteram partem",
        "Nemo judex in causa sua",
        "Ubi jus ibi remedium",
        "Res judicata",
        "B",
        3
      ),
      q(
        "The Indian Penal Code, 1860, is a substantive law primarily dealing with:",
        "Court fees and appeals",
        "Definitions of crimes and punishments",
        "Company registration",
        "Income tax slabs",
        "B",
        4
      ),
      q(
        "Caveat emptor in sale of goods generally means:",
        "Seller must insure the goods",
        "Let the buyer beware (subject to Act conditions)",
        "Buyer has no remedy ever",
        "Auction sales only",
        "B",
        5
      ),
      q(
        "Which of the High Courts in India was chartered first among the options below?",
        "Bombay High Court (1862)",
        "Delhi High Court (1966)",
        "Chhattisgarh High Court (2000)",
        "Telangana High Court (2014)",
        "A",
        6
      ),
      q(
        "ADR mechanism where disputes are settled amicably with statutory backing and award has decree status in many cases:",
        "Lok Adalat under Legal Services Authorities Act",
        "International arbitration only",
        "Gram Sabha resolution",
        "Rent control tribunal suo motu",
        "A",
        7
      ),
      q(
        "A private nuisance is primarily:",
        "Offence against the State under IPC Chapter VI",
        "Unreasonable interference with a person's use/enjoyment of land",
        "Breach of an employment bond",
        "Violation of SEZ rules",
        "B",
        8
      ),
      q(
        "The 'Quit India' resolution was passed by the Congress in which city (1942)?",
        "Karachi",
        "Mumbai (then Bombay)",
        "Lucknow",
        "Calcutta",
        "B",
        9
      ),
      q(
        "Which planet is known as the Red Planet?",
        "Venus",
        "Mars",
        "Jupiter",
        "Saturn",
        "B",
        10
      ),
      q(
        "GST in India is levied by which constitutional amendment enabling Goods and Services Tax?",
        "101st Amendment",
        "42nd Amendment",
        "73rd Amendment",
        "86th Amendment",
        "A",
        11
      ),
      q(
        "The tawa river basin / Sardar Sarovar dam context relates majorly to which state among:",
        "Kerala",
        "Madhya Pradesh / Gujarat (Narmada)",
        "Assam",
        "Goa",
        "B",
        12
      ),
      q(
        "INS Vikrant (indigenous aircraft carrier) is associated with which organisation?",
        "ISRO",
        "Indian Navy",
        "ONGC",
        "Coast Guard only",
        "B",
        13
      ),
      q(
        "Who is the ex-officio Chairperson of Rajya Sabha?",
        "President of India",
        "Prime Minister",
        "Vice-President of India",
        "Speaker of Lok Sabha",
        "C",
        14
      ),
      q(
        "If NOSE is coded as MPKN, how is FACE coded?",
        "EZBD",
        "GBDF",
        "EACE",
        "DZBC",
        "A",
        15
      ),
      q(
        "Pointing to a woman, Rahul said, 'She is the daughter of my grandfather's only son.' How is Rahul (male) related to her?",
        "Brother",
        "Sister",
        "Cousin",
        "Mother",
        "A",
        16
      ),
      q(
        "Which Venn diagram fits: Some teachers are singers. All singers are artists. (Diagram skills tested verbally: all teachers artists?)",
        "All teachers are artists",
        "Some teachers are artists",
        "No teacher is an artist",
        "Cannot be determined",
        "B",
        17
      ),
      q(
        "Complete: BDA, GID, LRI, ? (pattern: +5 letters cluster)",
        "QWO",
        "QXN",
        "QWN",
        "RWO",
        "C",
        18
      ),
      q(
        "A clock shows 3:15. The angle between hour and minute hands is approximately:",
        "0°",
        "7.5°",
        "90°",
        "82.5°",
        "B",
        19
      ),
      q(
        "Data: A>B, B>C, D<A. Which must be true?",
        "D>B",
        "A>C",
        "C>D",
        "D>C",
        "B",
        20
      ),
      q(
        "In certain code 123 means 'bright little boy', 145 means 'tall little girl', 357 means 'tall dark boy'. Code for 'little'?",
        "1",
        "2",
        "3",
        "4",
        "A",
        21
      ),
      q(
        "In a certain code, each letter is moved one step forward (A→B). The word PEN is written as QFO. The word LAW is written as:",
        "MAX",
        "MBX",
        "KBZ",
        "MAW",
        "B",
        22
      ),
      q(
        "Simple interest: Principal ₹4,000, rate 5% p.a., time 3 years. Interest is:",
        "₹500",
        "₹600",
        "₹650",
        "₹700",
        "B",
        23
      ),
      q(
        "Average of 12, 18, 24 and 6 equals:",
        "12",
        "13",
        "15",
        "16",
        "C",
        24
      ),
      q(
        "Find the error: She did not wrote the affidavit carefully.",
        "did not wrote → did not write",
        "she → her",
        "affidavit → affidavit's",
        "carefully → careful",
        "A",
        25
      ),
      q(
        "ANTONYM of VENERATE:",
        "Respect",
        "Revere",
        "Despise",
        "Honour",
        "C",
        26
      ),
      q(
        "One word for 'a person who believes pleasure is the highest good':",
        "Stoic",
        "Hedonist",
        "Ascetic",
        "Cynic",
        "B",
        27
      ),
      q(
        "Choose appropriate preposition: The contract is binding ___ both parties.",
        "on",
        "for",
        "with",
        "at",
        "A",
        28
      ),
      q(
        "Meaning of AD LIB:",
        "Without preparation; impromptu",
        "With full script",
        "Legally binding",
        "Silent approval",
        "A",
        29
      ),
      q(
        "CLOSE : SHUT :: BEGIN :",
        "END",
        "COMMENCE",
        "STOP",
        "FINISH",
        "B",
        30
      ),
    ],
  },
  {
    title: "MHCET Law — Full Mock Set 3 of 5",
    topic: MIXED_TOPIC,
    description: DESC(3),
    durationSeconds: MOCK_DURATION_SEC,
    questions: [
      q(
        "Judicial review of legislative action in India is primarily a power of:",
        "Election Commission only",
        "Higher judiciary to test constitutionality",
        "District Collector",
        "Gram Nyayalaya exclusively",
        "B",
        1
      ),
      q(
        "Promissory estoppel may sometimes prevent a promisor from:",
        "Always avoiding tax",
        "Going back on a clear promise reasonably relied upon (equitable doctrine)",
        "Filing civil suits",
        "Registering FIR",
        "B",
        2
      ),
      q(
        "Murder under IPC requires among other ingredients:",
        "Only civil damages",
        "Culpable homicide with defined 'murder' qualifications (intent/knowledge per sections)",
        "Only negligence",
        "Breach of contract",
        "B",
        3
      ),
      q(
        "A minor's agreement under the Indian Contract Act is:",
        "Always valid if profitable",
        "Void-ab-initio (generally)",
        "Voidable at minor's option only after 18",
        "Valid if guardian countersigns orally",
        "B",
        4
      ),
      q(
        "Preamble to the Constitution mentions India as a:",
        "Sovereign socialist secular democratic republic",
        "Confederation of princely states",
        "Theocratic republic",
        "Colonial dominion",
        "A",
        5
      ),
      q(
        "Tort of 'defamation' may be:",
        "Only libel, never slander",
        "Libel or slander (with nuances)",
        "Only IPC offence, no civil claim",
        "Unknown in India",
        "B",
        6
      ),
      q(
        "Res judicata under CPC generally bars:",
        "First appeal",
        "Relitigation of the same matter directly and substantially in issue between same parties",
        "Writ petition",
        "Arbitration clause",
        "B",
        7
      ),
      q(
        "Doctrine of basic structure (Kesavananda lineage) limits:",
        "Parliament's power to amend the Constitution beyond certain essential features",
        "Governor's ordinance power only",
        "High Court roster",
        "Gram Sabha meetings",
        "A",
        8
      ),
      q(
        "Operation Blue Star (1984) in entrance-GK framing most commonly links to:",
        "Sri Harmandir Sahib complex, Amritsar",
        "India-China border only",
        "SALT treaty",
        "Bangladesh liberation exclusively",
        "A",
        9
      ),
      q(
        "Green Revolution in India is most associated with higher yields in:",
        "Tea and coffee only",
        "Wheat and rice through HYV seeds and inputs",
        "Silk production",
        "Coal mining",
        "B",
        10
      ),
      q(
        "Dadasaheb Phalke Award is given for outstanding contribution to:",
        "Classical dance",
        "Cinema / films",
        "Painting",
        "Sports coaching",
        "B",
        11
      ),
      q(
        "Ayushman Bharat PM-JAY is best described as:",
        "Export subsidy scheme",
        "Health assurance / insurance coverage initiative for vulnerable families",
        "Railway freight rebate",
        "Coastal highway project",
        "B",
        12
      ),
      q(
        "The first Deputy Prime Minister of India was:",
        "Sardar Vallabhbhai Patel",
        "Dr Rajendra Prasad",
        "C Rajagopalachari",
        "Lal Bahadur Shastri",
        "A",
        13
      ),
      q(
        "International Yoga Day is observed on:",
        "21 June",
        "15 August",
        "2 October",
        "14 November",
        "A",
        14
      ),
      q(
        "All roses are flowers. Some flowers fade quickly. Therefore:",
        "All roses fade quickly",
        "Some roses fade quickly",
        "Neither (A) nor (B) necessarily follows",
        "No rose is a flower",
        "C",
        15
      ),
      q(
        "Which number replaces '?': 5, 11, 23, 47, ?",
        "79",
        "83",
        "91",
        "95",
        "D",
        16
      ),
      q(
        "In a certain code, each letter is shifted +2 (A→C). The word BAR is written as DCT. How is ACT written?",
        "CEV",
        "CEW",
        "BDU",
        "CET",
        "A",
        17
      ),
      q(
        "Directions: Face north, turn right, right, left, left. You now face:",
        "North",
        "South",
        "East",
        "West",
        "A",
        18
      ),
      q(
        "Calendar: 1 March 2024 was a Friday. 1 March 2025 falls on:",
        "Friday",
        "Saturday",
        "Sunday",
        "Monday",
        "B",
        19
      ),
      q(
        "Analogy oar : row :: steering wheel :",
        "Car",
        "Drive / steer",
        "Tyre",
        "Engine",
        "B",
        20
      ),
      q(
        "Series: AZ, BY, CX, ?",
        "DW",
        "EV",
        "DU",
        "EW",
        "A",
        21
      ),
      q(
        "If MACHINE is 131493185, digit-sum per letter place (dummy) — instead: how many prime numbers among {2,9,15,17}?",
        "1",
        "2",
        "3",
        "4",
        "B",
        22
      ),
      q(
        "A bag has 5 red and 3 blue balls. Probability first draw is red (simple):",
        "3/8",
        "5/8",
        "1/2",
        "5/3",
        "B",
        23
      ),
      q(
        "Compound interest yearly on ₹10,000 at 10% for 2 years (no half-yearly): amount ≈",
        "₹12,000",
        "₹12,100",
        "₹12,210",
        "₹11,500",
        "B",
        24
      ),
      q(
        "GERUND in 'Swimming is good exercise' is:",
        "is",
        "Swimming",
        "good",
        "exercise",
        "B",
        25
      ),
      q(
        "Replace phrasal verb: The court rejected the petition outright.",
        "threw out / dismissed summarily",
        "took in",
        "set up",
        "called off",
        "A",
        26
      ),
      q(
        "Logical connector: ___ you study consistently, you cannot expect a top percentile.",
        "Unless",
        "Although",
        "Because",
        "If",
        "A",
        27
      ),
      q(
        "Word for killing one's brother:",
        "Fratricide",
        "Regicide",
        "Uxoricide",
        "Patricide",
        "A",
        28
      ),
      q(
        "Choose correctly punctuated:",
        "Justice delayed is justice denied.",
        "Justice delayed is justice denied",
        "Justice, delayed is justice denied.",
        "justice delayed is justice denied.",
        "A",
        29
      ),
      q(
        "SYNONYM of ERUDITE:",
        "Ignorant",
        "Scholarly",
        "Rude",
        "Lazy",
        "B",
        30
      ),
    ],
  },
  {
    title: "MHCET Law — Full Mock Set 4 of 5",
    topic: MIXED_TOPIC,
    description: DESC(4),
    durationSeconds: MOCK_DURATION_SEC,
    questions: [
      q(
        "Article 19(1)(a) broadly guarantees:",
        "Right to bear arms",
        "Freedom of speech and expression (with reasonable restrictions)",
        "Right to employment in public sector",
        "Right to vote only",
        "B",
        1
      ),
      q(
        "An 'invitation to treat' in contract law is exemplified by:",
        "Acceptance posted to offeror",
        "Goods displayed on a shop shelf with price tags (generally)",
        "Registered mortgage deed",
        "Court decree",
        "B",
        2
      ),
      q(
        "Delegated legislation is scrutinised because:",
        "It is always unconstitutional",
        "It transfers rule-making to executive under parent statute — needs safeguards",
        "It replaces Parliament permanently",
        "It applies only to criminal law",
        "B",
        3
      ),
      q(
        "General exceptions (e.g. mistake of fact, accident) in criminal law are primarily found in:",
        "Indian Evidence Act",
        "IPC Chapter on General Exceptions",
        "CrPC schedule",
        "Limitation Act",
        "B",
        4
      ),
      q(
        "Specific Relief Act broadly concerns:",
        "Income tax appeals",
        "Civil remedies including specific performance and injunctions (subject to Act)",
        "Patent registration",
        "GST assessment",
        "B",
        5
      ),
      q(
        "Partnership firm registration under the Indian Partnership Act is:",
        "Mandatory for existence of partnership",
        "Optional but advisable for certain evidentiary benefits",
        "Done only abroad",
        "Decided by RBI",
        "B",
        6
      ),
      q(
        "Doctrine of eclipse (Constitutional law basics) relates to:",
        "Solar energy policy",
        "Pre-constitutional laws inconsistent with FR temporarily eclipsed until amendment",
        "Moon treaty",
        "Election schedule",
        "B",
        7
      ),
      q(
        "Extraconstitutional device that led to council of ministers accountable to legislature at Centre post-independence continuity:",
        "Basic structure only",
        "Cabinet system as practiced with PM as head",
        "Fifth Schedule alone",
        "Finance Commission binding orders",
        "B",
        8
      ),
      q(
        "1935 Government of India Act is historically significant for:",
        "Granting universal adult franchise immediately",
        "Federal scheme, provincial autonomy features influencing later Constitution",
        "Abolishing provinces",
        "Creating Panchayati Raj",
        "B",
        9
      ),
      q(
        "Kyoto Protocol primarily dealt with:",
        "Trade in services",
        "Greenhouse gas limitations framework",
        "Sea piracy",
        "Postal union",
        "B",
        10
      ),
      q(
        "Ladakh became a separate UT (reorganisation) broadly in the same timeframe as:",
        "August 2019 legislative changes concerning J&K reorganisation",
        "2000 bifurcation of Bihar",
        "Goa liberation 1961",
        "Punjab trifurcation 1966",
        "A",
        11
      ),
      q(
        "Article 370 (historical MCQ style): It was described as:",
        "Temporary transitional provision re J&K (now abrogated 2019)",
        "Permanent ban on elections",
        "Directive Principle",
        "Seventh Schedule entry",
        "A",
        12
      ),
      q(
        "Project Tiger (wildlife conservation) is associated with:",
        "River linking",
        "Protecting Bengal tiger and habitats",
        "Coal block auction",
        "Urban metro",
        "B",
        13
      ),
      q(
        "First general elections based on adult franchise in India were held in:",
        "1947-48",
        "1951-52",
        "1962 only",
        "1977 only",
        "B",
        14
      ),
      q(
        "Assertion A: All squares are rectangles. Reason R: All rectangles are squares.",
        "Both true; R explains A",
        "A true, R false",
        "A false, R true",
        "Both false",
        "B",
        15
      ),
      q(
        "How many distinct arrangements of the letters of the word LAW are possible (all letters used once)?",
        "3",
        "6",
        "9",
        "12",
        "B",
        16
      ),
      q(
        "Letter cluster: CFIL : : BEHK : ? (skip letters pattern)",
        "DGJM",
        "ADGJ",
        "CEGI",
        "FILO",
        "A",
        17
      ),
      q(
        "Count triangles in a simple layered outline (standard test favours 8) — choose:",
        "6",
        "7",
        "8",
        "10",
        "C",
        18
      ),
      q(
        "If * stands for + and − stands for ×, what is the value of 8 * 7 − 3 using these meanings?",
        "59",
        "29",
        "45",
        "17",
        "B",
        19
      ),
      q(
        "Time-work: A does work in 10 days, B in 15. Together in:",
        "6 days",
        "8 days",
        "12 days",
        "25 days",
        "A",
        20
      ),
      q(
        "Syllogism: No thief is honest. Some lawyers are honest. Therefore:",
        "Some lawyers are thieves",
        "No lawyer is a thief",
        "Some lawyers are not thieves",
        "None follows",
        "C",
        21
      ),
      q(
        "Pattern: ACE, BDF, CEG, ?",
        "DFH",
        "DHI",
        "DFI",
        "EFI",
        "A",
        22
      ),
      q(
        "Speed 45 km/h for 2 hours then 60 km/h for 1 hour — average speed approx:",
        "48 km/h",
        "50 km/h",
        "52 km/h",
        "55 km/h",
        "B",
        23
      ),
      q(
        "Profit: ₹800 CP, sells ₹1,000. Profit % on CP:",
        "20%",
        "25%",
        "33%",
        "15%",
        "B",
        24
      ),
      q(
        "FILL IN: The appeal was ___ dismissed; the court found no merit.",
        "hereby",
        "hereby's",
        "here by",
        "hear by",
        "A",
        25
      ),
      q(
        "CONFUSED WORDS: Affect / Effect — The new law will ___ many tenants.",
        "affect",
        "effect",
        "affects",
        "effects",
        "A",
        26
      ),
      q(
        "CLOZE: She has a deep understanding ___ procedural law.",
        "of",
        "for",
        "over",
        "at",
        "A",
        27
      ),
      q(
        "MALAPROPISM example among:",
        "Crown Court",
        "Decamping defendant (fleeing)",
        "Pacific (instead of specific)",
        "Writ petition",
        "C",
        28
      ),
      q(
        "JARGON plain meaning: 'Obiter dicta' roughly is:",
        "Binding ratio",
        "Passing judicial remark not essential to holding",
        "Plaint",
        "Injunction",
        "B",
        29
      ),
      q(
        "PARA JUMBLED: (P1) The bench assembled. (P2) Judgment reserved. (P3) Arguments concluded. Logical order:",
        "P1, P3, P2",
        "P2, P1, P3",
        "P3, P2, P1",
        "P1, P2, P3",
        "A",
        30
      ),
    ],
  },
  {
    title: "MHCET Law — Full Mock Set 5 of 5",
    topic: MIXED_TOPIC,
    description: DESC(5),
    durationSeconds: MOCK_DURATION_SEC,
    questions: [
      q(
        "Forms of Oaths and Affirmations for constitutional offices are set out in which Schedule?",
        "Second Schedule (salaries and emoluments)",
        "Third Schedule",
        "Fourth Schedule (Rajya Sabha seats)",
        "Seventh Schedule (Union/State lists)",
        "B",
        1
      ),
      q(
        "Frustration of contract under Section 56 ICA when performance becomes:",
        "Merely expensive",
        "Impossible or unlawful without default of parties (post-contract supervening)",
        "Delayed one week",
        "Oral only",
        "B",
        2
      ),
      q(
        "Burden of proof in civil cases generally lies on:",
        "Judge",
        "Person who asserts the affirmative",
        "Defendant always",
        "State always",
        "B",
        3
      ),
      q(
        "A cheque dishonoured for insufficient funds may attract:",
        "Only tort",
        "Liability under Negotiable Instruments Act (subject to notice conditions)",
        "Only consumer forum for goods",
        "No liability",
        "B",
        4
      ),
      q(
        "RTI Act, 2005 primarily enables citizens to:",
        "Request information from public authorities",
        "File criminal appeals",
        "Incorporate companies online",
        "Book train tickets",
        "A",
        5
      ),
      q(
        "Consumer Protection Act jurisdiction (basics): A consumer dispute redressal commission deals with:",
        "Only international arbitration",
        "Consumer complaints against defects/deficiencies/service (value limits per tier)",
        "Income tax disputes",
        "Patent appeals only",
        "B",
        6
      ),
      q(
        "Doctrine of harmonious construction seeks to:",
        "Avoid reading statutes",
        "Reconcile apparently conflicting provisions reasonably",
        "Invalidate entire Act",
        "Delay justice",
        "B",
        7
      ),
      q(
        "Emergency provisions in Part XVIII mainly concern:",
        "University exams",
        "National, State, Financial emergency declarations",
        "Railway time table",
        "Festival holidays",
        "B",
        8
      ),
      q(
        "The Bhopal gas tragedy (1984) is linked to:",
        "Union Carbide plant, Bhopal",
        "Chernobyl USSR",
        "Exxon Valdez USA",
        "Deepwater Horizon",
        "A",
        9
      ),
      q(
        "NATO is primarily:",
        "Trade bloc of ASEAN",
        "North Atlantic military alliance",
        "Climate fund",
        "Cricket council",
        "B",
        10
      ),
      q(
        "Make in India campaign emphasises:",
        "Import substitution awareness / manufacturing boost narrative",
        "Banning all imports",
        "Privatising courts",
        "Nationalising banks only",
        "A",
        11
      ),
      q(
        "Statue of Unity commemorates:",
        "Mahatma Gandhi",
        "Sardar Vallabhbhai Patel",
        "Subhas Chandra Bose",
        "Dr B R Ambedkar",
        "B",
        12
      ),
      q(
        "First woman Judge of Supreme Court of India (historic fact commonly asked):",
        "Justice Fathima Beevi (1989)",
        "Justice Leila Seth (never CJI)",
        "Justice Indu Malhotra (later-year)",
        "No woman yet (false)",
        "A",
        13
      ),
      q(
        "SEBI is the chief regulator for which of the following in India?",
        "Banking deposits",
        "Insurance policies only",
        "Securities and capital markets",
        "Foreign exchange remittances only",
        "C",
        14
      ),
      q(
        "Data sufficiency style: Is X > 5? (1) 2X > 11 (2) X is integer.",
        "Statement 1 alone",
        "Statement 2 alone",
        "Both together",
        "Neither",
        "C",
        15
      ),
      q(
        "Cube painted: 3×3×3 cube painted on all faces, cut into 27 small cubes. How many have exactly one face painted?",
        "6",
        "8",
        "12",
        "24",
        "A",
        16
      ),
      q(
        "Find the wrong number: 3, 9, 27, 81, 162, 729",
        "162",
        "81",
        "27",
        "9",
        "A",
        17
      ),
      q(
        "Positions: In a queue Rahul is 10th from front and 25th from last. Total people?",
        "33",
        "34",
        "35",
        "36",
        "B",
        18
      ),
      q(
        "Missing term: J, F, M, A, M, J, ?",
        "J",
        "K",
        "A",
        "S",
        "A",
        19
      ),
      q(
        "Assumption: Statement — 'Wear helmet while riding.' Assumption?",
        "Helmet improves safety",
        "Riding is illegal",
        "Helmets are free",
        "Only pedestrians matter",
        "A",
        20
      ),
      q(
        "Inference: In Maharashtra most law aspirants take MHCET. Statement: Rohan is an aspirant in Pune. Conclusion: Rohan takes MHCET.",
        "Definitely true",
        "Definitely false",
        "Uncertain",
        "Cannot infer",
        "C",
        21
      ),
      q(
        "Linear arrangement: P, Q, R, S, T sit on a bench; Q never at ends; P and T at ends; R left of S. Centre seat occupant can be:",
        "Only Q",
        "Only R",
        "R or Q",
        "Cannot be determined",
        "C",
        22
      ),
      q(
        "Ratio ages 3:5 sum 40. Younger age:",
        "12",
        "15",
        "18",
        "20",
        "B",
        23
      ),
      q(
        "LCM of 12 and 18:",
        "36",
        "72",
        "6",
        "216",
        "A",
        24
      ),
      q(
        "Detect redundancy: 'Please revert back at earliest soonest'.",
        "revert back / soonest — remove duplicate words",
        "Please — remove",
        "earliest — remove",
        "at — remove",
        "A",
        25
      ),
      q(
        "LITERARY DEVICE: 'The courtroom was a battlefield.'",
        "Simile",
        "Metaphor",
        "Alliteration",
        "Oxymoron",
        "B",
        26
      ),
      q(
        "USAGE: The word 'sanction' can mean both approve and penalty — such words are called:",
        "Homophones",
        "Contronyms / auto-antonyms contextually",
        "Synonyms only",
        "Archaisms",
        "B",
        27
      ),
      q(
        "WORD: A written statement on oath:",
        "Affidavit",
        "Vakalatnama",
        "Plaint",
        "Memorandum",
        "A",
        28
      ),
      q(
        "COLLOCATION: 'Uphold the ___ of justice.'",
        "cause",
        "rule",
        "machinery",
        "flag",
        "B",
        29
      ),
      q(
        "TONE: 'With respect, I submit that the learned counsel errs...' is:",
        "Sarcastic casual",
        "Formal forensic legal courtesy",
        "Comic",
        "Angry rant",
        "B",
        30
      ),
    ],
  },
];
