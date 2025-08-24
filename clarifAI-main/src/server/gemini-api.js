import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = 'AIzaSyChXPdqfHXxW0lhaOBD5Utfhcl5kTD8IOQ';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function processNaturalLanguageWithGemini(userQuery, columns, sampleData) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
You are a SQL query generator. Convert natural language to filter logic for JavaScript array operations.

Dataset Info:
- Columns: ${columns.join(', ')}
- Sample data: ${JSON.stringify(sampleData.slice(0, 2))}
- User Query: "${userQuery}"

Return ONLY a JSON object with this structure:
{
  "filterLogic": {
    "type": "FILTER|COUNT|GROUP|ALL",
    "conditions": {
      "column": "column_name",
      "operator": ">|<|=|LIKE|NULL_CHECK",
      "value": "search_value",
      "type": "NUMERIC|STRING_CONTAINS|NULL_CHECK|SEARCH"
    }
  },
  "sqlQuery": "SELECT statement"
}

Examples:
- "show all data" → {"filterLogic": "ALL", "sqlQuery": "SELECT * FROM data"}
- "rank1 artist" → {"filterLogic": {"type": "FILTER", "conditions": {"type": "LIMIT", "value": 1}}, "sqlQuery": "SELECT * FROM data LIMIT 1"}
- "count missing emails" → {"filterLogic": {"type": "COUNT", "conditions": {"column": "email", "type": "NULL_CHECK"}}, "sqlQuery": "SELECT COUNT(*) FROM data WHERE email IS NULL"}
- "users from NYC" → {"filterLogic": {"type": "FILTER", "conditions": {"column": "city", "type": "STRING_CONTAINS", "value": "NYC"}}, "sqlQuery": "SELECT * FROM data WHERE city LIKE '%NYC%'"}

Convert the user query now:
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('No valid JSON in response');
    
  } catch (error) {
    console.error('Gemini API error:', error);
    // Fallback to basic logic
    return fallbackLogic(userQuery, columns);
  }
}

function fallbackLogic(userQuery, columns) {
  const query = userQuery.toLowerCase();
  
  if (query.includes('rank1') || query.includes('first')) {
    return {
      filterLogic: {
        type: 'FILTER',
        conditions: { type: 'LIMIT', value: 1 }
      },
      sqlQuery: 'SELECT * FROM data LIMIT 1'
    };
  }
  
  if (query.includes('all')) {
    return {
      filterLogic: 'ALL',
      sqlQuery: 'SELECT * FROM data'
    };
  }
  
  return {
    filterLogic: {
      type: 'FILTER',
      conditions: { type: 'LIMIT', value: 10 }
    },
    sqlQuery: 'SELECT * FROM data LIMIT 10'
  };
}