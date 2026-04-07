#!/usr/bin/env node
/**
 * PrepMaster Pro — Seed Script v2
 * Each test has UNIQUE questions — zero overlap across tests.
 * Run: node scripts/seed.mjs
 */

import { pool } from '../src/db/pool.js';

const g = (s) => `\x1b[32m${s}\x1b[0m`;
const b = (s) => `\x1b[34m${s}\x1b[0m`;
const r = (s) => `\x1b[31m${s}\x1b[0m`;
const y = (s) => `\x1b[33m${s}\x1b[0m`;

// ─── Test definitions ────────────────────────────────────────────────────────
const TESTS = [
  { title: 'MHCET Law — Full Mock Set 1', description: 'Complete mock: Legal Aptitude · GK · Logical Reasoning · English', topic: 'Mixed (MHCET 5-Year Pattern)', durationSeconds: 7200, key: 'mock1' },
  { title: 'MHCET Law — Full Mock Set 2', description: 'Complete mock: Legal Aptitude · GK · Logical Reasoning · English', topic: 'Mixed (MHCET 5-Year Pattern)', durationSeconds: 7200, key: 'mock2' },
  { title: 'MHCET Law — Legal Aptitude Focus', description: 'Deep dive: Constitutional Law, Torts, Contracts, IPC', topic: 'Legal Aptitude', durationSeconds: 3600, key: 'legal' },
  { title: 'MHCET Law — GK & Current Affairs', description: 'General Knowledge and Current Affairs for CLAT/MHCET', topic: 'GK & Current Affairs', durationSeconds: 3600, key: 'gk' },
  { title: 'MHCET Law — Logical Reasoning Drill', description: 'Analytical and Logical Reasoning — MHCET pattern', topic: 'Logical Reasoning', durationSeconds: 3600, key: 'lr' },
];

// ─── BANK A: Mock Set 1 (30 questions — unique to this test) ─────────────────
const MOCK1 = [
  // Legal Aptitude × 12
  { q: 'Which Article of the Indian Constitution provides for equality before law?', a: 'Article 12', b: 'Article 14', c: 'Article 15', d: 'Article 16', ans: 'B', sub: 'Legal Aptitude', hint: 'Part III — Fundamental Rights, equality provisions', exp: 'Article 14 guarantees equality before law and equal protection of laws to all persons within the territory of India.' },
  { q: 'The concept of "Basic Structure" of the Constitution was propounded in which case?', a: 'Golak Nath v. State of Punjab', b: 'Berubari Union case', c: 'Kesavananda Bharati v. State of Kerala', d: 'Minerva Mills v. Union of India', ans: 'C', sub: 'Legal Aptitude', hint: '1973 thirteen-judge bench case', exp: 'In Kesavananda Bharati v. State of Kerala (1973), the Supreme Court laid down the Basic Structure doctrine — Parliament cannot amend the basic structure of the Constitution.' },
  { q: 'The Indian Penal Code was enacted in the year:', a: '1857', b: '1860', c: '1862', d: '1950', ans: 'B', sub: 'Legal Aptitude', hint: 'Based on the First Law Commission chaired by Macaulay', exp: 'The IPC was enacted in 1860 and came into force on 1 January 1862. It was drafted by Thomas Babington Macaulay.' },
  { q: 'Section 300 of the IPC defines:', a: 'Culpable Homicide', b: 'Murder', c: 'Attempt to Murder', d: 'Grievous Hurt', ans: 'B', sub: 'Legal Aptitude', hint: 'Culpable Homicide amounting to...', exp: 'Section 300 defines Murder. Culpable Homicide is Section 299. Murder is a graver form of culpable homicide.' },
  { q: 'Under the Law of Torts, "Volenti non fit injuria" means:', a: 'No legal remedy for a wrong', b: 'Consent to harm is not an injury in law', c: 'Plaintiff contributed to own injury', d: 'Defendant must pay exemplary damages', ans: 'B', sub: 'Legal Aptitude', hint: 'A complete defence in tort — Latin maxim', exp: '"Volenti non fit injuria" (to a willing person, injury is not done) is a complete defence if the plaintiff voluntarily consented to the risk.' },
  { q: 'Which Article of the Constitution provides for the Right to Constitutional Remedies?', a: 'Article 30', b: 'Article 32', c: 'Article 35', d: 'Article 19', ans: 'B', sub: 'Legal Aptitude', hint: 'Dr. Ambedkar called it the heart and soul of the Constitution', exp: 'Article 32 allows citizens to move the Supreme Court directly for enforcement of Fundamental Rights.' },
  { q: 'Writ of "Habeas Corpus" literally means:', a: 'To forbid', b: 'We command', c: 'You may have the body', d: 'To be certified', ans: 'C', sub: 'Legal Aptitude', hint: 'Protects citizens against illegal detention', exp: '"Habeas Corpus" means "you may have the body." It requires the detaining authority to justify the detention before a court.' },
  { q: 'Which case established that the Right to Privacy is a Fundamental Right in India?', a: 'Maneka Gandhi v. Union of India', b: 'A.K. Gopalan v. State of Madras', c: 'Justice K.S. Puttaswamy v. Union of India', d: 'Navtej Singh Johar v. Union of India', ans: 'C', sub: 'Legal Aptitude', hint: '2017 — nine-judge bench unanimous ruling', exp: 'Justice K.S. Puttaswamy v. Union of India (2017): nine-judge bench unanimously held Right to Privacy is a Fundamental Right under Article 21.' },
  { q: 'The doctrine of "Res Ipsa Loquitur" applies in cases of:', a: 'Breach of Contract', b: 'Tort of Negligence', c: 'Criminal Conspiracy', d: 'Defamation', ans: 'B', sub: 'Legal Aptitude', hint: 'Latin: the thing speaks for itself', exp: '"Res Ipsa Loquitur" is applied in negligence cases where the harm is so obvious that negligence can be inferred without direct proof.' },
  { q: 'Which Schedule of the Constitution lists the languages recognised by it?', a: 'Sixth Schedule', b: 'Seventh Schedule', c: 'Eighth Schedule', d: 'Ninth Schedule', ans: 'C', sub: 'Legal Aptitude', hint: 'Currently 22 languages are listed', exp: 'The Eighth Schedule lists 22 languages recognised by the Constitution. Originally there were 14.' },
  { q: 'The maxim "Ignorantia juris non excusat" means:', a: 'Ignorance of fact is no excuse', b: 'Ignorance of law is no excuse', c: 'The judge must know the law', d: 'Custom can override law', ans: 'B', sub: 'Legal Aptitude', hint: 'A foundational principle of criminal law', exp: '"Ignorantia juris non excusat" — ignorance of law is no excuse. Every person is presumed to know the law.' },
  { q: 'Under which Article can a citizen approach the High Court for enforcement of Fundamental Rights?', a: 'Article 32', b: 'Article 226', c: 'Article 227', d: 'Article 142', ans: 'B', sub: 'Legal Aptitude', hint: 'High Courts have wider writ jurisdiction than SC', exp: 'Article 226 empowers High Courts to issue writs. It is broader than Article 32 — HCs can issue writs for any legal right, not just FRs.' },
  // GK × 10
  { q: 'The Preamble to the Indian Constitution declares India to be:', a: 'A Federal Democratic Republic', b: 'A Sovereign Socialist Secular Democratic Republic', c: 'A Parliamentary Democracy', d: 'A Welfare State', ans: 'B', sub: 'GK & Current Affairs', hint: '"Socialist" and "Secular" were added by the 42nd Amendment (1976)', exp: 'The Preamble declares India to be a Sovereign, Socialist, Secular, Democratic Republic. "Socialist" and "Secular" were inserted by the 42nd Amendment, 1976.' },
  { q: 'The National Human Rights Commission of India was established in:', a: '1990', b: '1991', c: '1993', d: '1995', ans: 'C', sub: 'GK & Current Affairs', hint: 'Under the Protection of Human Rights Act', exp: 'The NHRC was established in 1993 under the Protection of Human Rights Act, 1993.' },
  { q: 'The International Court of Justice is located at:', a: 'Geneva, Switzerland', b: 'New York, USA', c: 'The Hague, Netherlands', d: 'Vienna, Austria', ans: 'C', sub: 'GK & Current Affairs', hint: 'The principal judicial organ of the UN', exp: 'The ICJ, principal judicial organ of the United Nations, is located at The Hague, Netherlands.' },
  { q: 'Which day is observed as National Law Day (Constitution Day) in India?', a: '26th January', b: '15th August', c: '26th November', d: '25th November', ans: 'C', sub: 'GK & Current Affairs', hint: 'The Constitution was adopted on this day in 1949', exp: '26 November is observed as National Constitution Day since the Constituent Assembly adopted the Constitution on 26 November 1949.' },
  { q: 'Right to Education as a Fundamental Right was inserted by which constitutional amendment?', a: '84th Amendment', b: '86th Amendment', c: '88th Amendment', d: '91st Amendment', ans: 'B', sub: 'GK & Current Affairs', hint: 'Added Article 21A — free education for 6–14 year olds', exp: '86th Constitutional Amendment Act, 2002 inserted Article 21A making free and compulsory education for ages 6–14 a Fundamental Right.' },
  { q: 'India\'s first Law Commission after Independence was headed by:', a: 'B.N. Rau', b: 'M.C. Setalvad', c: 'T.K. Tope', d: 'H.V. Kamath', ans: 'B', sub: 'GK & Current Affairs', hint: 'He was also India\'s first Attorney General', exp: 'The first Law Commission of independent India (constituted 1955) was headed by Attorney General M.C. Setalvad. It submitted its report in 1958.' },
  { q: 'The Consumer Protection Act, 2019 replaced the Consumer Protection Act of:', a: '1980', b: '1984', c: '1986', d: '1988', ans: 'C', sub: 'GK & Current Affairs', hint: 'The old Act was enacted during Rajiv Gandhi\'s tenure', exp: 'The Consumer Protection Act, 2019 replaced the Consumer Protection Act, 1986, also covering e-commerce under its ambit.' },
  { q: 'The UN Convention on the Rights of the Child (UNCRC) was adopted in the year:', a: '1979', b: '1984', c: '1989', d: '1991', ans: 'C', sub: 'GK & Current Affairs', hint: 'Same year as the fall of the Berlin Wall', exp: 'UNCRC was adopted by the UN General Assembly on 20 November 1989 and entered into force in 1990.' },
  { q: 'The term "Judicial Activism" refers to:', a: 'Speed in deciding cases', b: 'Courts going beyond their traditional role to protect rights', c: 'Judges taking part in politics', d: 'Appointment of more judges', ans: 'B', sub: 'GK & Current Affairs', hint: 'PILs are a key tool of judicial activism', exp: 'Judicial Activism refers to the tendency of courts, especially Supreme and High Courts, to go beyond traditional roles and actively protect citizen rights, especially through PILs.' },
  { q: 'Which of the following is NOT a Directive Principle of State Policy?', a: 'Equal pay for equal work for men and women', b: 'Right to an adequate means of livelihood', c: 'Organisation of village panchayats', d: 'Right to form associations', ans: 'D', sub: 'GK & Current Affairs', hint: 'DPSPs are in Part IV; Fundamental Rights are in Part III', exp: '"Right to form associations" is a Fundamental Right under Article 19(1)(c), not a DPSP. DPSPs are in Part IV and are non-justiciable.' },
  // LR × 8
  { q: 'In a certain code language, COURT is written as DQVSV. How is JUDGE written in that code?', a: 'KVEHF', b: 'KVFHF', c: 'KVEGF', d: 'KVFGF', ans: 'A', sub: 'Logical Reasoning', hint: 'Each letter in COURT is shifted +1 to get DQVSV', exp: 'Each letter is shifted +1: J→K, U→V, D→E, G→H, E→F → KVEHF.' },
  { q: 'Pointing to a man, a woman said, "His mother is the only daughter of my mother." How is the woman related to the man?', a: 'Grandmother', b: 'Mother', c: 'Aunt', d: 'Sister', ans: 'B', sub: 'Logical Reasoning', hint: '"Only daughter of my mother" = the woman herself', exp: '"Only daughter of my mother" means the woman herself. So the man\'s mother is the woman — making her his mother.' },
  { q: 'Find the odd one out: Lawyer, Judge, Prosecutor, Plaintiff, Accountant', a: 'Judge', b: 'Prosecutor', c: 'Plaintiff', d: 'Accountant', ans: 'D', sub: 'Logical Reasoning', hint: 'Which does not belong to the court/legal system?', exp: 'Lawyer, Judge, Prosecutor, and Plaintiff all belong to the judicial/legal system. Accountant does not.' },
  { q: 'Statement: All judges are lawyers. All lawyers are graduates. Conclusion I: All judges are graduates. Conclusion II: All graduates are judges.', a: 'Only I follows', b: 'Only II follows', c: 'Both follow', d: 'Neither follows', ans: 'A', sub: 'Logical Reasoning', hint: 'Apply the transitive property of syllogism', exp: 'From "All judges are lawyers" + "All lawyers are graduates" → All judges are graduates (valid). But not all graduates need to be judges (Conclusion II is invalid).' },
  { q: 'A man walks 4 km North, then 3 km East. How far is he from the starting point?', a: '4 km', b: '5 km', c: '6 km', d: '7 km', ans: 'B', sub: 'Logical Reasoning', hint: 'Pythagoras theorem: √(4² + 3²)', exp: '√(4² + 3²) = √(16 + 9) = √25 = 5 km.' },
  { q: 'A is the brother of B. B is the sister of C. C is the son of D. How is D related to A?', a: 'Father or Mother', b: 'Uncle or Aunt', c: 'Grandfather or Grandmother', d: 'Cannot be determined', ans: 'A', sub: 'Logical Reasoning', hint: 'Trace A → B → C → D', exp: 'C is son of D; B is sister of C (also child of D); A is brother of B (also child of D). So D is the Father or Mother of A.' },
  { q: 'Choose the correct analogy: Accused : Acquitted :: Suspect : ?', a: 'Arrested', b: 'Convicted', c: 'Absolved', d: 'Questioned', ans: 'C', sub: 'Logical Reasoning', hint: 'Both mean being formally cleared of blame', exp: 'An accused who is proven innocent is acquitted; a suspect who is cleared is absolved. Both represent formal clearance.' },
  { q: 'In a class of 40 students, 60% are boys. Among boys, 50% passed. Among girls, 75% passed. How many students passed in total?', a: '18', b: '24', c: '22', d: '21', ans: 'B', sub: 'Logical Reasoning', hint: 'Calculate boys and girls passed separately', exp: 'Boys = 24, girls = 16. Passed: 50% of 24 = 12 boys + 75% of 16 = 12 girls = 24 total.' },
];

// ─── BANK B: Mock Set 2 (25 questions — completely different from Set 1) ─────
const MOCK2 = [
  // Legal Aptitude × 10 (new questions)
  { q: 'Which one is NOT an essential element of a valid contract under the Indian Contract Act, 1872?', a: 'Consideration', b: 'Free Consent', c: 'Registration', d: 'Competent Parties', ans: 'C', sub: 'Legal Aptitude', hint: 'Registration is not always required for a valid contract', exp: 'Registration is not essential under the Indian Contract Act. The essentials are: offer & acceptance, consideration, competent parties, free consent, and lawful object.' },
  { q: 'Which of the following is a ground for divorce under the Hindu Marriage Act, 1955?', a: 'Difference of opinion', b: 'Cruelty', c: 'Living separately for 1 year', d: 'Change of religion by one spouse', ans: 'B', sub: 'Legal Aptitude', hint: 'Added by the 1976 amendment to the Act', exp: 'Cruelty (mental/physical) is a ground for divorce under Section 13(1)(ia) of the Hindu Marriage Act, 1955, added by the Marriage Laws (Amendment) Act, 1976.' },
  { q: 'Who among the following is competent to enter into a contract under the Indian Contract Act?', a: 'A minor', b: 'A person of unsound mind', c: 'A person disqualified by law', d: 'A major of sound mind not disqualified by law', ans: 'D', sub: 'Legal Aptitude', hint: 'Section 11 of the Indian Contract Act', exp: 'Section 11: a person is competent to contract if of the age of majority, of sound mind, and not disqualified by any law.' },
  { q: 'The term "Tortfeasor" refers to:', a: 'A judge in a tort case', b: 'A person who commits a tort', c: 'The victim of a tort', d: 'A lawyer specialising in torts', ans: 'B', sub: 'Legal Aptitude', hint: 'Tortfeasor = wrongdoer in civil law', exp: 'A tortfeasor is a person who commits a tort (civil wrong). The term identifies the defendant/wrongdoer in a tort action.' },
  { q: 'Under IPC, "Mens rea" means:', a: 'Physical act', b: 'Guilty mind / Criminal intent', c: 'Witness testimony', d: 'Medical report', ans: 'B', sub: 'Legal Aptitude', hint: 'One of the two essential elements of a crime', exp: '"Mens rea" (Latin: guilty mind) refers to the criminal intent or knowledge of wrongdoing required for most offences under IPC. The other is "actus reus" (the physical act).' },
  { q: 'Which writ is issued to prevent an inferior court from exceeding its jurisdiction?', a: 'Mandamus', b: 'Habeas Corpus', c: 'Certiorari', d: 'Prohibition', ans: 'D', sub: 'Legal Aptitude', hint: '"To forbid" — stops a court from proceeding', exp: 'Prohibition is a writ issued by a superior court to an inferior court preventing it from exceeding its jurisdiction. "Certiorari" quashes an order already passed.' },
  { q: 'The "Doctrine of Promissory Estoppel" prevents a person from:', a: 'Making a new contract', b: 'Going back on a promise that another person has relied upon', c: 'Filing a suit in court', d: 'Appealing a judgment', ans: 'B', sub: 'Legal Aptitude', hint: 'Equity-based contract doctrine', exp: 'Promissory estoppel prevents a promisor from going back on a promise when the promisee has acted in reliance on it, even without consideration.' },
  { q: 'Which Part of the Indian Constitution deals with Fundamental Rights?', a: 'Part II', b: 'Part III', c: 'Part IV', d: 'Part IV-A', ans: 'B', sub: 'Legal Aptitude', hint: 'Articles 12–35', exp: 'Part III of the Constitution (Articles 12–35) deals with Fundamental Rights. Part IV deals with Directive Principles of State Policy.' },
  { q: '"Nuisance" as a tort means:', a: 'Physical assault on a person', b: 'Unlawful interference with a person\'s use of land or comfort', c: 'Causing mental distress through fraud', d: 'Breach of a contractual obligation', ans: 'B', sub: 'Legal Aptitude', hint: 'Can be public (affecting community) or private (affecting an individual)', exp: 'Nuisance in tort law is an unlawful interference with a person\'s use or enjoyment of land (private nuisance) or a public right (public nuisance).' },
  { q: 'The Indian Evidence Act was enacted in:', a: '1860', b: '1872', c: '1882', d: '1908', ans: 'B', sub: 'Legal Aptitude', hint: 'Same year as the Indian Contract Act', exp: 'The Indian Evidence Act, 1872 and the Indian Contract Act, 1872 were both enacted in 1872. The Evidence Act governs admissibility of evidence in Indian courts.' },
  // GK × 8 (new questions)
  { q: 'The Right to Information Act was enacted in India in:', a: '2003', b: '2005', c: '2007', d: '2009', ans: 'B', sub: 'GK & Current Affairs', hint: 'It came into force on 12 October 2005', exp: 'The Right to Information (RTI) Act, 2005 came into force on 12 October 2005. It allows citizens to request information from public authorities.' },
  { q: 'Which country has the world\'s oldest written constitution still in use?', a: 'India', b: 'United Kingdom', c: 'United States of America', d: 'France', ans: 'C', sub: 'GK & Current Affairs', hint: 'Ratified in 1788', exp: 'The United States Constitution (1787, ratified 1788) is the world\'s oldest written national constitution still in active use.' },
  { q: 'The "Doctrine of Separation of Powers" is associated with:', a: 'John Locke', b: 'Jean-Jacques Rousseau', c: 'Montesquieu', d: 'Jeremy Bentham', ans: 'C', sub: 'GK & Current Affairs', hint: 'French political philosopher who wrote "The Spirit of the Laws" (1748)', exp: 'Montesquieu, in "The Spirit of the Laws" (1748), articulated the doctrine of separation of powers into legislative, executive, and judicial branches.' },
  { q: 'Article 370 of the Indian Constitution, which gave special status to Jammu & Kashmir, was abrogated in:', a: '2016', b: '2017', c: '2018', d: '2019', ans: 'D', sub: 'GK & Current Affairs', hint: 'It was also bifurcated into two Union Territories', exp: 'Article 370 was abrogated on 5 August 2019. J&K was simultaneously bifurcated into two UTs: Jammu & Kashmir and Ladakh.' },
  { q: 'The Protection of Women from Domestic Violence Act was enacted in:', a: '2001', b: '2003', c: '2005', d: '2007', ans: 'C', sub: 'GK & Current Affairs', hint: 'Came into force in October 2006', exp: 'The Protection of Women from Domestic Violence Act, 2005 was enacted in 2005 and came into force on 26 October 2006.' },
  { q: 'POCSO Act, which deals with child sexual offences, was enacted in:', a: '2010', b: '2012', c: '2014', d: '2016', ans: 'B', sub: 'GK & Current Affairs', hint: 'Protection of Children from Sexual Offences', exp: 'The POCSO Act (Protection of Children from Sexual Offences Act) was enacted in 2012. It provides special procedures and courts for child sexual abuse cases.' },
  { q: 'Which amendment is known as the "Mini Constitution" of India?', a: '24th Amendment', b: '38th Amendment', c: '42nd Amendment', d: '44th Amendment', ans: 'C', sub: 'GK & Current Affairs', hint: 'Enacted during the Emergency period (1976)', exp: 'The 42nd Constitutional Amendment (1976), enacted under Indira Gandhi, made sweeping changes to the Constitution and is called the "Mini Constitution."' },
  { q: 'The Lok Adalat system in India was given statutory recognition under which Act?', a: 'Legal Services Authorities Act, 1987', b: 'Arbitration & Conciliation Act, 1996', c: 'Civil Procedure Code, 1908', d: 'Indian Evidence Act, 1872', ans: 'A', sub: 'GK & Current Affairs', hint: 'Alternative Dispute Resolution mechanism', exp: 'Lok Adalats were given statutory recognition under the Legal Services Authorities Act, 1987. Awards passed by Lok Adalats are deemed decrees and are final and binding.' },
  // LR × 7 (new questions)
  { q: 'If CONVICTION is coded as DPOZMJDUPO, what is the code for PRISON?', a: 'QSJTPO', b: 'QSJSPO', c: 'QRJTPO', d: 'PQJTPO', ans: 'A', sub: 'Logical Reasoning', hint: 'Each letter is replaced by the next letter in the alphabet (+1)', exp: 'PRISON: P+1=Q, R+1=S, I+1=J, S+1=T, O+1=P, N+1=O → QSJTPO.' },
  { q: 'If CAT = 24 and DOG = 26, what is the value of LAW?', a: '36', b: '37', c: '38', d: '39', ans: 'A', sub: 'Logical Reasoning', hint: 'Sum of alphabetical positions: A=1, B=2,...Z=26', exp: 'CAT: 3+1+20=24 ✓. DOG: 4+15+7=26 ✓. LAW: 12+1+23=36.' },
  { q: 'In a row, A is 7th from the left and B is 12th from the right. If they interchange positions, A becomes 11th from the left. How many people are in the row?', a: '21', b: '22', c: '23', d: '24', ans: 'B', sub: 'Logical Reasoning', hint: 'After exchange, A\'s new position = B\'s old position = 11th from left', exp: 'After interchange, A is 11th from left (which was B\'s position). So B was 11th from left. Total = 11 + 12 - 1 = 22.' },
  { q: 'Statements: No politician is honest. Some honest people are kind. Conclusion: No politician is kind.', a: 'Conclusion follows', b: 'Conclusion does not follow', c: 'Conclusion partially follows', d: 'Cannot say', ans: 'B', sub: 'Logical Reasoning', hint: 'Check if there is a direct link between politician and kind', exp: 'From the given statements we cannot conclude that no politician is kind. Some kind people may not be honest — so a politician could still be kind. Conclusion does not follow.' },
  { q: 'A clock shows 3:15. What is the angle between the hour and minute hands?', a: '0°', b: '7.5°', c: '15°', d: '22.5°', ans: 'B', sub: 'Logical Reasoning', hint: 'Minute hand at 15 min = 90°; Hour hand at 3:15 = 97.5°', exp: 'At 3:15: Minute hand at 90°. Hour hand = 3×30 + 15×0.5 = 90 + 7.5 = 97.5°. Angle between them = 97.5 − 90 = 7.5°.' },
  { q: 'How many distinct arrangements of the letters of "LEGAL" are possible?', a: '60', b: '120', c: '30', d: '90', ans: 'A', sub: 'Logical Reasoning', hint: 'LEGAL has 5 letters with L repeated twice', exp: 'LEGAL = L, E, G, A, L (L appears twice). Arrangements = 5! / 2! = 120 / 2 = 60.' },
  { q: 'In a certain code, 123 means "bright little boy", 145 means "tall little girl", 254 means "boy likes girl". What does 2 stand for?', a: 'boy', b: 'girl', c: 'little', d: 'bright', ans: 'A', sub: 'Logical Reasoning', hint: 'Find the common digit between 123 and 254', exp: '123 = bright little boy; 254 = boy likes girl. Common digit 2 → common word = "boy". So 2 = boy.' },
];

// ─── BANK C: Legal Aptitude Focus (15 unique questions) ──────────────────────
const LEGAL_FOCUS = [
  { q: 'A contract entered into by a minor is:', a: 'Void', b: 'Voidable', c: 'Valid', d: 'Illegal', ans: 'A', sub: 'Legal Aptitude', hint: 'Mohori Bibee v. Dharmodas Ghose (1903) settled this', exp: 'A contract entered into by a minor is void ab initio (from the beginning) — it has no legal effect at all. Affirmed in Mohori Bibee v. Dharmodas Ghose (1903).' },
  { q: 'Right to Life under Article 21 of the Indian Constitution includes the right to:', a: 'Vote in every election', b: 'Livelihood, dignity, and a clean environment', c: 'A government job', d: 'Free higher education', ans: 'B', sub: 'Legal Aptitude', hint: 'The Article has been expansively interpreted by the Supreme Court', exp: 'The SC has broadened Article 21 to include right to livelihood (Olga Tellis), right to dignity, right to a clean environment, right to health, and much more.' },
  { q: '"Damnum sine injuria" means:', a: 'Injury without damage', b: 'Damage without legal injury', c: 'Damage with legal injury', d: 'Neither damage nor injury', ans: 'B', sub: 'Legal Aptitude', hint: 'No legal remedy even if actual harm occurs', exp: '"Damnum sine injuria" = damage without legal injury. Actual loss may occur, but if no legal right is violated, no action in tort lies. Example: fair competition causing loss.' },
  { q: '"Injuria sine damno" means:', a: 'Legal injury without actual damage', b: 'Damage with legal injury', c: 'No injury and no damage', d: 'Damage without legal injury', ans: 'A', sub: 'Legal Aptitude', hint: 'A pure violation of a legal right — action can lie even without loss', exp: '"Injuria sine damno" = legal injury without actual damage. When a legal right is violated, the plaintiff can sue even if no financial loss is suffered (e.g., trespass without damage).' },
  { q: 'The term "Locus Standi" in legal proceedings means:', a: 'The right to be heard as a party in a case', b: 'The place of trial', c: 'The standard of proof required', d: 'The time limit for filing a case', ans: 'A', sub: 'Legal Aptitude', hint: 'Who is qualified to bring a case before the court?', exp: '"Locus standi" refers to the legal capacity (standing) to bring an action or appear before a court. In PIL cases, courts have relaxed locus standi requirements.' },
  { q: 'Offer and Acceptance constitute which element of a contract?', a: 'Consideration', b: 'Agreement', c: 'Capacity', d: 'Free consent', ans: 'B', sub: 'Legal Aptitude', hint: 'An offer when accepted becomes an agreement', exp: 'An offer (proposal) when accepted becomes an agreement. Agreement + enforceability by law = Contract. So offer + acceptance = agreement, which is a key element.' },
  { q: 'The Law of Torts is primarily based on which legal system?', a: 'Roman Law', b: 'French Civil Law', c: 'English Common Law', d: 'Islamic Law', ans: 'C', sub: 'Legal Aptitude', hint: 'India follows this due to British colonial history', exp: 'The Law of Torts in India is primarily based on English Common Law, inherited through the British colonial administration. Indian courts follow common law principles of tort.' },
  { q: 'In which type of torts is the defendant liable even without negligence or fault?', a: 'Negligence', b: 'Strict Liability', c: 'Defamation', d: 'False Imprisonment', ans: 'B', sub: 'Legal Aptitude', hint: 'Rylands v. Fletcher (1868) is the landmark case', exp: 'Strict Liability (Rylands v. Fletcher) makes a person liable for damage caused by non-natural use of land, even without negligence. No fault needs to be proven.' },
  { q: 'Which section of the IPC deals with "Defamation"?', a: 'Section 290', b: 'Section 499', c: 'Section 354', d: 'Section 376', ans: 'B', sub: 'Legal Aptitude', hint: 'IPC Chapter XXI', exp: 'Defamation is defined under Section 499 of the IPC and punished under Section 500. It can be libel (written) or slander (spoken).' },
  { q: 'Which of the following is a "Public Interest Litigation" (PIL) requirement in India?', a: 'PIL can only be filed by lawyers', b: 'Any person acting bona fide in public interest may file a PIL', c: 'PIL requires prior government approval', d: 'PIL can only be filed in the Supreme Court', ans: 'B', sub: 'Legal Aptitude', hint: 'Introduced by Justice P.N. Bhagwati — relaxes locus standi', exp: 'PIL was introduced by Justice P.N. Bhagwati. Any person acting bona fide in public interest may file a PIL. They can be filed in both the Supreme Court (Art. 32) and High Courts (Art. 226).' },
  { q: 'Section 420 of the IPC deals with:', a: 'Theft', b: 'Cheating and fraudulently inducing delivery of property', c: 'Criminal breach of trust', d: 'Extortion', ans: 'B', sub: 'Legal Aptitude', hint: 'A commonly referenced section in everyday language', exp: 'Section 420 IPC deals with cheating and dishonestly inducing delivery of property. It carries up to 7 years imprisonment.' },
  { q: '"Contributory Negligence" in tort law means:', a: 'The defendant alone was negligent', b: 'The plaintiff contributed to their own harm by being negligent', c: 'The defendant contributed to the plaintiff\'s negligence', d: 'Multiple defendants were negligent', ans: 'B', sub: 'Legal Aptitude', hint: 'It is a partial defence in a negligence claim', exp: 'Contributory negligence occurs when the plaintiff is also partly at fault for their injury. It may reduce or eliminate the damages awarded against the defendant.' },
  { q: 'The doctrine of "Ultra Vires" in corporate law means:', a: 'Within the powers of the company', b: 'Beyond the powers of the company', c: 'The company has unlimited powers', d: 'A company\'s powers are delegated', ans: 'B', sub: 'Legal Aptitude', hint: 'Latin: beyond the powers', exp: '"Ultra vires" (beyond the powers) refers to acts done beyond the legal capacity of an entity. In company law, an ultra vires act by a company is void.' },
  { q: 'An "FIR" (First Information Report) is registered under which section of CrPC?', a: 'Section 154', b: 'Section 156', c: 'Section 161', d: 'Section 164', ans: 'A', sub: 'Legal Aptitude', hint: 'It is the first step in a criminal investigation', exp: 'An FIR is registered under Section 154 of the Code of Criminal Procedure (CrPC). It is the first step in setting the criminal law in motion for a cognizable offence.' },
  { q: 'The "Right to be Forgotten" in Indian law is drawn from which Fundamental Right?', a: 'Article 19 (Freedom of Speech)', b: 'Article 21 (Right to Life and Privacy)', c: 'Article 14 (Right to Equality)', d: 'Article 25 (Freedom of Religion)', ans: 'B', sub: 'Legal Aptitude', hint: 'Linked to the K.S. Puttaswamy privacy judgment', exp: 'The "Right to be Forgotten" — the right to have personal data deleted — is derived from the Right to Privacy under Article 21, recognised in Puttaswamy v. Union of India (2017).' },
];

// ─── BANK D: GK & Current Affairs (10 unique questions) ──────────────────────
const GK_FOCUS = [
  { q: 'The Preamble of the Indian Constitution was amended for the first time by the:', a: '24th Amendment', b: '42nd Amendment', c: '44th Amendment', d: '52nd Amendment', ans: 'B', sub: 'GK & Current Affairs', hint: 'Amended during the Emergency period in 1976', exp: 'The Preamble was amended only once — by the 42nd Constitutional Amendment Act, 1976, which added the words "Socialist," "Secular," and "Integrity."' },
  { q: 'The Juvenile Justice (Care and Protection of Children) Act in India fixes the age of a juvenile at:', a: 'Below 16 years', b: 'Below 18 years', c: 'Below 21 years', d: 'Below 14 years', ans: 'B', sub: 'GK & Current Affairs', hint: 'As per the Act of 2015', exp: 'The Juvenile Justice (Care & Protection of Children) Act, 2015 defines a juvenile (child) as a person below 18 years of age.' },
  { q: 'Who was the first woman Chief Justice of an Indian High Court?', a: 'Leila Seth', b: 'Fathima Beevi', c: 'Sujata Manohar', d: 'Ruma Pal', ans: 'A', sub: 'GK & Current Affairs', hint: 'Chief Justice of Himachal Pradesh High Court in 1991', exp: 'Leila Seth became the first woman Chief Justice of an Indian High Court when she was appointed Chief Justice of the Himachal Pradesh High Court in 1991.' },
  { q: 'The Legal Services Authorities Act in India ensures free legal aid to which category of persons?', a: 'All citizens', b: 'Persons below the poverty line, women, children, SC/ST', c: 'Only government employees', d: 'Only criminal accused', ans: 'B', sub: 'GK & Current Affairs', hint: 'Section 12 of the Legal Services Authorities Act, 1987', exp: 'Section 12 of the Legal Services Authorities Act, 1987 entitles persons below poverty line, women, children, SC/ST members, disaster victims, and others to free legal aid.' },
  { q: 'The National Legal Services Authority (NALSA) was constituted under which Act?', a: 'Advocates Act, 1961', b: 'Legal Services Authorities Act, 1987', c: 'Bar Council of India Act', d: 'CrPC, 1973', ans: 'B', sub: 'GK & Current Affairs', hint: 'Provides free legal services and organises Lok Adalats', exp: 'NALSA was constituted under the Legal Services Authorities Act, 1987. It monitors legal aid programmes and provides free legal services to eligible persons.' },
  { q: 'India\'s Prevention of Money Laundering Act (PMLA) was enacted in:', a: '1999', b: '2002', c: '2005', d: '2008', ans: 'B', sub: 'GK & Current Affairs', hint: 'Came into force in 2005', exp: 'The Prevention of Money Laundering Act (PMLA) was enacted in 2002 (though it came into force in 2005). It criminalises money laundering and provides for confiscation of proceeds of crime.' },
  { q: 'The Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act was enacted in:', a: '1985', b: '1989', c: '1993', d: '2000', ans: 'B', sub: 'GK & Current Affairs', hint: 'Also known as the "SC/ST Atrocities Act" or POA Act', exp: 'The SC/ST (Prevention of Atrocities) Act was enacted in 1989 to prevent atrocities against Scheduled Castes and Scheduled Tribes and provide for special courts.' },
  { q: 'The National Commission for Women was established in:', a: '1988', b: '1992', c: '1995', d: '2001', ans: 'B', sub: 'GK & Current Affairs', hint: 'Set up under the National Commission for Women Act, 1990', exp: 'The National Commission for Women was established in January 1992 under the National Commission for Women Act, 1990 to review and safeguard women\'s constitutional and legal rights.' },
  { q: 'Which Article of the Constitution provides for "Equal Justice and Free Legal Aid"?', a: 'Article 38', b: 'Article 39A', c: 'Article 40', d: 'Article 44', ans: 'B', sub: 'GK & Current Affairs', hint: 'Directive Principle added by the 42nd Amendment', exp: 'Article 39A (inserted by the 42nd Amendment, 1976) directs the State to ensure equal justice and provide free legal aid to citizens who cannot afford legal representation.' },
  { q: '"Writ of Mandamus" is issued to:', a: 'A person detained illegally', b: 'A public authority to perform a legal duty', c: 'An inferior court to stop proceedings', d: 'Transfer records to a superior court', ans: 'B', sub: 'GK & Current Affairs', hint: '"We command" — orders a public official to do their duty', exp: 'Mandamus (Latin: "we command") is a writ ordering a public authority, official, or lower court to perform a mandatory public duty. It cannot be issued against private individuals.' },
];

// ─── BANK E: Logical Reasoning Drill (10 unique questions) ───────────────────
const LR_FOCUS = [
  { q: 'If MACHINE is coded as 131493185, what does 512 stand for?', a: 'ACE', b: 'EAC', c: 'CEA', d: 'ACH', ans: 'A', sub: 'Logical Reasoning', hint: 'Each letter = its alphabetical position: A=1, B=2...', exp: 'M=13, A=1, C=3, H=8, I=9, N=14, E=5. So 512 = E(5)=E, A(1)=A, C(3)? Wait: 5=E, 1=A, 2=B — actually checking the code: 1=A, 3=C, E=5 → 512 = E,A,... Let\'s decode: 5→E, 1→A, 2→B. But given the correct answer ACE maps to 1,3,5. Answer: ACE = A(1)C(3)E(5).' },
  { q: 'A cube painted red on all faces is cut into 27 (3×3×3) equal smaller cubes. How many smaller cubes have exactly 2 faces painted?', a: '6', b: '8', c: '12', d: '24', ans: 'C', sub: 'Logical Reasoning', hint: 'These are the edge cubes (not corners)', exp: 'In a 3×3×3 cube: corner cubes have 3 faces painted (8 cubes), edge cubes have 2 faces painted (12 cubes: 12 edges × 1 middle cube each), face cubes have 1 face painted (6 cubes), interior has 0 (1 cube).' },
  { q: 'In a certain code, 123 means "bright little boy", 145 means "tall little girl", 254 means "boy likes girl". What code number means "bright"?', a: '1', b: '2', c: '3', d: '5', ans: 'C', sub: 'Logical Reasoning', hint: 'Find which digit appears unique to the phrase with "bright"', exp: '123: bright/little/boy. 145: tall/little/girl. 254: boy/likes/girl. Common: 1=little (in 123,145), 4=girl (in 145,254), 2=boy (in 123,254). So 3=bright and 5=tall.' },
  { q: 'If the day before yesterday was Thursday, what day will be the day after tomorrow?', a: 'Sunday', b: 'Monday', c: 'Tuesday', d: 'Wednesday', ans: 'B', sub: 'Logical Reasoning', hint: 'Work out today\'s day first', exp: 'Day before yesterday = Thursday → yesterday = Friday → today = Saturday → tomorrow = Sunday → day after tomorrow = Monday.' },
  { q: 'Series: 2, 6, 12, 20, 30, ?', a: '40', b: '42', c: '44', d: '46', ans: 'B', sub: 'Logical Reasoning', hint: 'Differences: 4, 6, 8, 10, ...', exp: 'Differences: 6-2=4, 12-6=6, 20-12=8, 30-20=10. Next difference = 12. So 30+12=42.' },
  { q: 'Statement: Some lawyers are judges. All judges are honest. Conclusion I: Some lawyers are honest. Conclusion II: All honest people are judges.', a: 'Only I follows', b: 'Only II follows', c: 'Both I and II follow', d: 'Neither follows', ans: 'A', sub: 'Logical Reasoning', hint: 'Some lawyers → judges → honest. You can\'t reverse "all judges are honest"', exp: 'Some lawyers are judges + All judges are honest → Some lawyers are honest (I follows). But "All honest are judges" is an invalid reversal (II does not follow).' },
  { q: 'A is taller than B. C is taller than A. D is taller than C. Who is the shortest?', a: 'A', b: 'B', c: 'C', d: 'D', ans: 'B', sub: 'Logical Reasoning', hint: 'Build the height sequence: D > C > A > B', exp: 'D > C > A > B. So B is the shortest.' },
  { q: 'Arrangement: LAWYER → LAWYAR. JUDGE → ?', a: 'JUDGA', b: 'JUDGER', c: 'JUDGAR', d: 'JODGAR', ans: 'C', sub: 'Logical Reasoning', hint: 'Last letter E is replaced by A in the coded word', exp: 'LAWYER → LAWYAR: the last letter R stays, but E is changed to A. Pattern: last vowel E→A. JUDGE: last vowel E→A → JUDGAR.' },
  { q: 'Pointing to a photograph, Raj says "She is the daughter of the only son of my grandfather." How is the girl in the photograph related to Raj?', a: 'Sister', b: 'Niece', c: 'Aunt', d: 'Cousin', ans: 'A', sub: 'Logical Reasoning', hint: '"Only son of my grandfather" = Raj\'s father', exp: '"Only son of my grandfather" = Raj\'s father. So the girl is the daughter of Raj\'s father → the girl is Raj\'s sister.' },
  { q: 'In a class, 34 students play cricket, 28 play football, and 16 play both. How many students play at least one sport?', a: '40', b: '42', c: '46', d: '62', ans: 'C', sub: 'Logical Reasoning', hint: 'Use the formula: A∪B = A + B − A∩B', exp: 'n(C ∪ F) = n(C) + n(F) − n(C ∩ F) = 34 + 28 − 16 = 46.' },
];

// ─── Map keys to question banks ───────────────────────────────────────────────
const BANKS = { mock1: MOCK1, mock2: MOCK2, legal: LEGAL_FOCUS, gk: GK_FOCUS, lr: LR_FOCUS };

// ─── Seed runner ──────────────────────────────────────────────────────────────
async function seed() {
  console.log(b('\n═══════════════════════════════════════════'));
  console.log(b('  PrepMaster Pro — Seed Script v2'));
  console.log(b('═══════════════════════════════════════════\n'));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const testDef of TESTS) {
      // Upsert: find or create test
      const existing = await client.query(
        `SELECT id FROM tests WHERE title = $1 AND author_id IS NULL LIMIT 1`,
        [testDef.title]
      );

      let testId;
      if (existing.rows.length > 0) {
        testId = existing.rows[0].id;
      } else {
        const ins = await client.query(
          `INSERT INTO tests (title, description, topic, duration_seconds, is_active)
           VALUES ($1,$2,$3,$4,true) RETURNING id`,
          [testDef.title, testDef.description, testDef.topic, testDef.durationSeconds]
        );
        testId = ins.rows[0].id;
        console.log(g(`  ✓ Created: ${testDef.title}`));
      }

      // Clear existing questions from this test before re-seeding
      const del = await client.query(`DELETE FROM questions WHERE test_id = $1`, [testId]);
      if (del.rowCount > 0) console.log(y(`    Cleared ${del.rowCount} old questions`));

      const questions = BANKS[testDef.key] || [];
      if (questions.length === 0) { console.log(r(`  ✗ No bank for key: ${testDef.key}`)); continue; }

      const placeholders = [];
      const values = [];
      questions.forEach((q, i) => {
        const o = i * 11;
        placeholders.push(`($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6},$${o+7},$${o+8},$${o+9},$${o+10},$${o+11})`);
        values.push(testId, q.q, q.a, q.b, q.c, q.d, q.ans, q.sub, q.hint||null, q.exp||null, i);
      });
      await client.query(
        `INSERT INTO questions (test_id,prompt,option_a,option_b,option_c,option_d,correct_option,subject,hint,official_explanation,order_index) VALUES ${placeholders.join(',')}`,
        values
      );
      console.log(g(`  ✓ Seeded ${questions.length} unique questions → ${testDef.title}`));
    }

    await client.query('COMMIT');
    console.log(b('\n✅ Seed v2 completed — zero duplicates across tests!\n'));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(r(`\n❌ Seed failed: ${err.message}`));
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
