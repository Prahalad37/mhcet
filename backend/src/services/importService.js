import { pool } from "../db/pool.js";
import { parseCSV, validateQuestionCSV } from "../utils/csvParser.js";
import { HttpError } from "../utils/httpError.js";
import { logInfo } from "../utils/logger.js";

/**
 * Import questions from CSV data
 * @param {string} testId - Target test ID
 * @param {string} csvText - CSV file content
 * @param {string} userId - Admin user ID for audit
 * @returns {Promise<Object>} Import result with stats and any errors
 */
export async function importQuestionsFromCSV(testId, csvText, userId) {
  try {
    // Parse CSV
    const { rows } = parseCSV(csvText);
    
    if (rows.length === 0) {
      throw new HttpError(400, "CSV file contains no data rows");
    }
    
    // Validate CSV structure and data
    const { errors, validRows } = validateQuestionCSV(rows);
    
    if (errors.length > 0 && validRows.length === 0) {
      throw new HttpError(400, `CSV validation failed: ${errors.join('; ')}`);
    }
    
    // Verify test exists
    const testCheck = await pool.query(
      `SELECT id, title FROM tests WHERE id = $1`,
      [testId]
    );
    
    if (testCheck.rows.length === 0) {
      throw new HttpError(404, "Test not found");
    }
    
    const testTitle = testCheck.rows[0].title;
    
    // Get next order index for questions
    const maxOrderResult = await pool.query(
      `SELECT COALESCE(MAX(order_index), 0) as max_order FROM questions WHERE test_id = $1`,
      [testId]
    );
    let nextOrderIndex = maxOrderResult.rows[0].max_order + 1;
    
    // Import valid rows in a transaction
    const client = await pool.connect();
    const importedQuestions = [];
    
    try {
      await client.query('BEGIN');
      
      const BATCH_SIZE = 1000;
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE);

        let queryTemplate = `
          INSERT INTO questions (
            test_id, prompt, option_a, option_b, option_c, option_d,
            correct_option, subject, hint, official_explanation, order_index,
            prompt_hi, option_a_hi, option_b_hi, option_c_hi, option_d_hi, hint_hi, official_explanation_hi
          ) VALUES
        `;
        const values = [];
        const placeholders = [];

        batch.forEach((questionData, index) => {
          const offset = index * 18;
          placeholders.push(
            `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18})`
          );

          values.push(
            testId,
            questionData.prompt,
            questionData.optionA,
            questionData.optionB,
            questionData.optionC,
            questionData.optionD,
            questionData.correctOption,
            questionData.subject,
            questionData.hint,
            questionData.officialExplanation,
            nextOrderIndex++,
            questionData.promptHi ?? null,
            questionData.optionAHi ?? null,
            questionData.optionBHi ?? null,
            questionData.optionCHi ?? null,
            questionData.optionDHi ?? null,
            questionData.hintHi ?? null,
            questionData.officialExplanationHi ?? null
          );
        });

        queryTemplate += placeholders.join(', ') + ' RETURNING id, prompt';
        
        const result = await client.query(queryTemplate, values);
        importedQuestions.push(...result.rows);
      }
      
      await client.query('COMMIT');
      
      logInfo({
        msg: "csv_import_complete",
        userId,
        testId,
        testTitle,
        importedCount: validRows.length,
      });
      
      return {
        success: true,
        imported: validRows.length,
        total: rows.length,
        errors: errors.length > 0 ? errors : null,
        testTitle,
        questions: importedQuestions,
      };
      
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    
  } catch (e) {
    if (e instanceof HttpError) {
      throw e;
    }
    throw new HttpError(400, `Import failed: ${e.message}`);
  }
}

/**
 * Generate a sample CSV template for question imports
 */
export function generateCSVTemplate() {
  const headers = [
    'question',
    'optionA',
    'optionB',
    'optionC',
    'optionD',
    'correct',
    'subject',
    'hint',
    'explanation',
    'questionHi',
    'optionAHi',
    'optionBHi',
    'optionCHi',
    'optionDHi',
    'hintHi',
    'explanationHi',
  ];

  const sampleRow = [
    'Which article of the Indian Constitution deals with equality before law?',
    'Article 12',
    'Article 14',
    'Article 19',
    'Article 21',
    'B',
    'Legal Aptitude',
    'Think about fundamental rights in Part III',
    'Article 14 guarantees equality before law and equal protection of laws',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ];
  
  // Format as CSV with proper quoting
  const formatCSVRow = (row) => {
    return row.map(field => {
      // Quote fields that contain commas, quotes, or newlines
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    }).join(',');
  };
  
  return [
    formatCSVRow(headers),
    formatCSVRow(sampleRow)
  ].join('\n');
}