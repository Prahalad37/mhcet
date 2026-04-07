import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/db/pool.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function parseAndSeed() {
  console.log("Starting parsing of mock test...");
  const mockPath = path.join(__dirname, 'mock_part1.txt');
  const content = fs.readFileSync(mockPath, 'utf-8');
  
  // 1. Extract the answer key
  const answers = {};
  const allRegex = /(?:^|\s)(\d{1,3})\s+([A-D])(?=\s|$)/g;
  let match;
  // Let's only match the answer key at the end to avoid accidental matches
  const answerKeySection = content.substring(content.lastIndexOf("Q Ans Q Ans"));
  while ((match = allRegex.exec(answerKeySection)) !== null) {
      answers[parseInt(match[1])] = match[2];
  }
  console.log(`Extracted answers for ${Object.keys(answers).length} questions.`);

  // 2. Parse the questions
  const lines = content.split('\n');
  const questions = [];
  let currentSubject = '';
  let currentQ = null;
  
  for(let i=0; i<lines.length; i++) {
     const line = lines[i].trim();
     
     // Skip footers / headers
     if(line.includes("Not for redistribution") || line.includes("All the best!") || line.includes("ANSWER KEY") || line.startsWith("Mock Test 01 of") || line.includes("MHCET BA LLB PREMIUM MOCK TEST SERIES")) {
        continue;
     }
     
     // Subject detection
     if(line.includes("SECTION A — LEGAL APTITUDE")) currentSubject = "Legal Aptitude";
     else if(line.includes("SECTION B — LOGICAL")) currentSubject = "Logical Reasoning";
     else if(line.includes("SECTION C — GENERAL KNOWLEDGE")) currentSubject = "GK & Current Affairs";
     else if(line.includes("SECTION D — ENGLISH")) currentSubject = "English";
     else if(line.includes("SECTION E — BASIC MATHEMATICS")) currentSubject = "Basic Math";
     
     // Start of a question block
     const qMatch = line.match(/^Q\.(\d+)$/);
     if(qMatch) {
         if(currentQ) questions.push(currentQ);
         const qNum = parseInt(qMatch[1]);
         currentQ = {
             qNum,
             subject: currentSubject,
             prompt: '',
             a: '', b: '', c: '', d: '',
             ans: answers[qNum] || 'A', // Fallback to A if parsing failed for some reason
             state: 'prompt'
         };
         continue;
     }

     if(!currentQ) continue; // If we haven't seen a Q.1 yet, just ignore lines
     if(line.includes("Q Ans Q Ans")) currentQ.state = 'done';
     
     // Detect options
     // Options usually start with (A) , (B) etc.
     if (currentQ.state === 'done') continue;
     if (line.match(/^\(A\)\s/)) { currentQ.state = 'a'; currentQ.a = line.substring(4).trim(); }
     else if (line.match(/^\(B\)\s/)) { currentQ.state = 'b'; currentQ.b = line.substring(4).trim(); }
     else if (line.match(/^\(C\)\s/)) { currentQ.state = 'c'; currentQ.c = line.substring(4).trim(); }
     else if (line.match(/^\(D\)\s/)) { currentQ.state = 'd'; currentQ.d = line.substring(4).trim(); }
     else {
         // Accumulate text
         if (line === '') continue; // Skip blank lines inside the text block
         if (currentQ.state === 'prompt') {
             currentQ.prompt += (currentQ.prompt ? '\n' : '') + line;
         } else if (currentQ.state === 'a') {
             currentQ.a += ' ' + line;
         } else if (currentQ.state === 'b') {
             currentQ.b += ' ' + line;
         } else if (currentQ.state === 'c') {
             currentQ.c += ' ' + line;
         } else if (currentQ.state === 'd') {
             currentQ.d += ' ' + line;
         }
     }
  }
  if(currentQ) questions.push(currentQ);

  console.log(`Parsed ${questions.length} total questions from the text.`);
  
  // Basic validation check
  const missingAns = questions.filter(q => !answers[q.qNum]).length;
  if (missingAns > 0) console.log(`Warning: ${missingAns} questions had no answer key match, defaulted to A.`);
  
  // 3. Database Insertion
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const testTitle = "MHCET BA LLB PREMIUM MOCK TEST SERIES — MOCK TEST 01";
    
    // Create new test
    const insTest = await client.query(
      `INSERT INTO tests (title, description, topic, duration_seconds, is_active)
       VALUES ($1, $2, $3, $4, true) RETURNING id`,
      [
        testTitle, 
        "2025–26 Edition | Full 120-question Premium Mock Test | Curated by AIR 46 JMI", 
        "Mixed (MHCET 5-Year Pattern)", 
        7200 // 120 minutes
      ]
    );
    const testId = insTest.rows[0].id;
    console.log(`Created test with ID: ${testId}`);

    // Insert questions into the main full test
    const placeholders = [];
    const values = [];
    questions.forEach((q, i) => {
      const o = i * 11;
      let promptText = q.prompt.trim();
      promptText = promptText.replace(/Q\.\d+Ans Q Ans.*/g,"").trim(); 
      placeholders.push(`($${o+1}, $${o+2}, $${o+3}, $${o+4}, $${o+5}, $${o+6}, $${o+7}, $${o+8}, $${o+9}, $${o+10}, $${o+11})`);
      values.push(testId, promptText, q.a.trim() || 'Option A', q.b.trim() || 'Option B', q.c.trim() || 'Option C', q.d.trim() || 'Option D', q.ans, q.subject, null, null, i);
    });

    await client.query(
      `INSERT INTO questions (test_id, prompt, option_a, option_b, option_c, option_d, correct_option, subject, hint, official_explanation, order_index) 
       VALUES ${placeholders.join(',')}`,
      values
    );

    // Group by subject and create section-wise tests
    const subjects = {};
    for (const q of questions) {
      if (!subjects[q.subject]) subjects[q.subject] = [];
      subjects[q.subject].push(q);
    }

    for (const [subject, qs] of Object.entries(subjects)) {
      const sectionTitle = `${testTitle} — ${subject} Section`;
      const duration = {
         'Legal Aptitude': 35,
         'Logical Reasoning': 35,
         'GK & Current Affairs': 15,
         'English': 25,
         'Basic Math': 10
      }[subject] || 30;
      
      const insTest = await client.query(
        `INSERT INTO tests (title, description, duration_seconds, topic, is_active)
         VALUES ($1, $2, $3, $4, true) RETURNING id`,
        [sectionTitle, `Sectional Practice for ${subject}`, duration * 60, subject]
      );
      const newTestId = insTest.rows[0].id;
      
      const secPlaceholders = [];
      const secValues = [];
      qs.forEach((q, i) => {
        const o = i * 11;
        let promptText = q.prompt.trim();
        promptText = promptText.replace(/Q\.\d+Ans Q Ans.*/g,"").trim();
        secPlaceholders.push(`($${o+1}, $${o+2}, $${o+3}, $${o+4}, $${o+5}, $${o+6}, $${o+7}, $${o+8}, $${o+9}, $${o+10}, $${o+11})`);
        secValues.push(newTestId, promptText, q.a.trim() || 'Option A', q.b.trim() || 'Option B', q.c.trim() || 'Option C', q.d.trim() || 'Option D', q.ans, q.subject, null, null, i);
      });
      
      await client.query(
        `INSERT INTO questions (test_id, prompt, option_a, option_b, option_c, option_d, correct_option, subject, hint, official_explanation, order_index)
         VALUES ${secPlaceholders.join(',')}`,
         secValues
      );
      console.log(`Created section test: ${sectionTitle}`);
    }

    await client.query('COMMIT');
    console.log(`✅ Success! Seeded all ${questions.length} premium questions into the database.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Seeding failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

parseAndSeed();
