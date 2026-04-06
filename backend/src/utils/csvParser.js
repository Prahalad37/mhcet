/**
 * Simple CSV parser for question imports
 * Handles quoted fields and basic CSV parsing without external dependencies
 */

/** Map common Excel / alternate spellings to canonical keys used by validateQuestionCSV */
const HEADER_ALIASES = new Map([
  ['question', 'question'],
  ['prompt', 'question'],
  ['optiona', 'optionA'],
  ['optionb', 'optionB'],
  ['optionc', 'optionC'],
  ['optiond', 'optionD'],
  ['correct', 'correct'],
  ['correctoption', 'correct'],
  ['answer', 'correct'],
  ['subject', 'subject'],
  ['hint', 'hint'],
  ['explanation', 'explanation'],
  ['officialexplanation', 'explanation'],
]);

function normalizeHeaderKey(raw) {
  if (raw == null || raw === '') return '';
  const stripped = String(raw).replace(/^\uFEFF/, '').trim();
  const compact = stripped.toLowerCase().replace(/[\s\-_]+/g, '');
  if (HEADER_ALIASES.has(compact)) return HEADER_ALIASES.get(compact);
  const canonical = [
    'question',
    'optionA',
    'optionB',
    'optionC',
    'optionD',
    'correct',
    'subject',
    'hint',
    'explanation',
  ];
  if (canonical.includes(stripped)) return stripped;
  return stripped;
}

export function parseCSV(csvText) {
  const text = String(csvText).replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headersRaw = parseCSVLine(lines[0]);
  const headers = headersRaw.map((h) => normalizeHeaderKey(h));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    try {
      const values = parseCSVLine(line);
      if (values.length !== headersRaw.length) {
        throw new Error(
          `Expected ${headersRaw.length} columns, got ${values.length}`
        );
      }

      const row = {};
      headers.forEach((headerKey, index) => {
        const key =
          headerKey && String(headerKey).trim() !== ''
            ? headerKey
            : `__col${index}`;
        row[key] = values[index];
      });
      rows.push(row);
    } catch (e) {
      throw new Error(`Row ${i + 1}: ${e.message}`);
    }
  }

  return { headers, rows };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}

export function validateQuestionCSV(rows) {
  const requiredColumns = [
    'question', 'optionA', 'optionB', 'optionC', 'optionD', 
    'correct', 'subject'
  ];
  
  const errors = [];
  const validRows = [];
  
  // Check if we have all required columns
  const firstRow = rows[0] || {};
  const missingColumns = requiredColumns.filter((col) => !(col in firstRow));
  if (missingColumns.length > 0) {
    const found = Object.keys(firstRow).filter((k) => !k.startsWith('__col'));
    const hint =
      found.length > 0
        ? ` Found columns: ${found.join(', ')}.`
        : '';
    errors.push(
      `Missing required columns: ${missingColumns.join(', ')}.${hint} Use the exact headers from Download Template (question, optionA, …) or Excel-friendly names like Question, Option A, Correct.`
    );
    return { errors, validRows: [] };
  }
  
  rows.forEach((row, index) => {
    const rowErrors = [];
    const rowNum = index + 1;
    
    // Validate required fields
    requiredColumns.forEach(col => {
      if (!row[col] || row[col].trim() === '') {
        rowErrors.push(`${col} is required`);
      }
    });
    
    // Validate correct option
    const correct = row.correct?.trim().toUpperCase();
    if (correct && !['A', 'B', 'C', 'D'].includes(correct)) {
      rowErrors.push('correct must be A, B, C, or D');
    }
    
    // Validate subject (should be one of the known subjects)
    const validSubjects = [
      'Legal Aptitude', 'GK & Current Affairs', 'Logical Reasoning', 
      'Basic Math', 'English'
    ];
    const subject = row.subject?.trim();
    if (subject && !validSubjects.includes(subject)) {
      rowErrors.push(`subject must be one of: ${validSubjects.join(', ')}`);
    }
    
    if (rowErrors.length > 0) {
      errors.push(`Row ${rowNum}: ${rowErrors.join(', ')}`);
    } else {
      // Normalize the row data
      validRows.push({
        prompt: row.question.trim(),
        optionA: row.optionA.trim(),
        optionB: row.optionB.trim(),
        optionC: row.optionC.trim(),
        optionD: row.optionD.trim(),
        correctOption: correct,
        subject: subject,
        hint: row.hint?.trim() || null,
        officialExplanation: row.explanation?.trim() || null,
      });
    }
  });
  
  return { errors, validRows };
}