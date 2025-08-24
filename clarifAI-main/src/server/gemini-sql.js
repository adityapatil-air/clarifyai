import express from 'express';

const router = express.Router();

// Gemini API endpoint for natural language to SQL conversion
router.post('/gemini-sql', async (req, res) => {
  try {
    const { userQuery, columns, sampleData, totalRows } = req.body;
    
    // For now, we'll use intelligent parsing without external API
    // You can replace this with actual Gemini API call
    const result = parseNaturalLanguageQuery(userQuery, columns, sampleData, totalRows);
    
    res.json(result);
  } catch (error) {
    console.error('Gemini SQL processing error:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

function parseNaturalLanguageQuery(userQuery, columns, sampleData, totalRows) {
  const query = userQuery.toLowerCase();
  
  // Show all data
  if (query.includes('show all') || query.includes('all data') || query.includes('everything')) {
    return {
      filterLogic: 'ALL',
      sqlQuery: 'SELECT * FROM data'
    };
  }
  
  // Count queries
  if (query.includes('count') || query.includes('how many')) {
    if (query.includes('null') || query.includes('missing') || query.includes('empty')) {
      const column = columns.find(col => query.includes(col.toLowerCase()));
      if (column) {
        return {
          filterLogic: {
            type: 'COUNT',
            conditions: { column, type: 'NULL_CHECK' }
          },
          sqlQuery: `SELECT COUNT(*) as count FROM data WHERE ${column} IS NULL OR ${column} = ''`
        };
      }
    }
    return {
      filterLogic: { type: 'COUNT' },
      sqlQuery: 'SELECT COUNT(*) as count FROM data'
    };
  }
  
  // NULL/missing values
  if (query.includes('null') || query.includes('missing') || query.includes('empty')) {
    const column = columns.find(col => query.includes(col.toLowerCase()));
    if (column) {
      return {
        filterLogic: {
          type: 'FILTER',
          conditions: { column, type: 'NULL_CHECK' }
        },
        sqlQuery: `SELECT * FROM data WHERE ${column} IS NULL OR ${column} = ''`
      };
    }
  }
  
  // City/location queries
  if (query.includes('from ') || query.includes('in ')) {
    const cityMatch = query.match(/(?:from|in)\\s+(\\w+)/i);
    if (cityMatch) {
      const city = cityMatch[1];
      const cityColumn = columns.find(col => 
        col.toLowerCase().includes('city') || 
        col.toLowerCase().includes('location') ||
        col.toLowerCase().includes('place')
      );
      if (cityColumn) {
        return {
          filterLogic: {
            type: 'FILTER',
            conditions: { column: cityColumn, type: 'STRING_CONTAINS', value: city }
          },
          sqlQuery: `SELECT * FROM data WHERE ${cityColumn} LIKE '%${city}%'`
        };
      }
    }
  }
  
  // Age queries
  if (query.includes('age')) {
    const ageColumn = columns.find(col => col.toLowerCase().includes('age'));
    if (ageColumn) {
      // Greater than / older than
      if (query.includes('greater than') || query.includes('older than') || query.includes('>')) {
        const ageMatch = query.match(/(?:greater than|older than|>)\\s*(\\d+)/i);
        if (ageMatch) {
          const ageValue = ageMatch[1];
          return {
            filterLogic: {
              type: 'FILTER',
              conditions: { column: ageColumn, type: 'NUMERIC', operator: '>', value: ageValue }
            },
            sqlQuery: `SELECT * FROM data WHERE ${ageColumn} > ${ageValue}`
          };
        }
      }
      // Less than / younger than
      else if (query.includes('less than') || query.includes('younger than') || query.includes('<')) {
        const ageMatch = query.match(/(?:less than|younger than|<)\\s*(\\d+)/i);
        if (ageMatch) {
          const ageValue = ageMatch[1];
          return {
            filterLogic: {
              type: 'FILTER',
              conditions: { column: ageColumn, type: 'NUMERIC', operator: '<', value: ageValue }
            },
            sqlQuery: `SELECT * FROM data WHERE ${ageColumn} < ${ageValue}`
          };
        }
      }
      // Exact age
      else {
        const ageMatch = query.match(/age\\s*(\\d+)|\\b(\\d+)\\s*years?\\s*old/i);
        if (ageMatch) {
          const ageValue = ageMatch[1] || ageMatch[2];
          return {
            filterLogic: {
              type: 'FILTER',
              conditions: { column: ageColumn, type: 'NUMERIC', operator: '=', value: ageValue }
            },
            sqlQuery: `SELECT * FROM data WHERE ${ageColumn} = ${ageValue}`
          };
        }
      }
    }
  }
  
  // Group by queries
  if (query.includes('group by') || query.includes('count by')) {
    const column = columns.find(col => query.includes(col.toLowerCase()));
    if (column) {
      return {
        filterLogic: {
          type: 'GROUP',
          column: column
        },
        sqlQuery: `SELECT ${column}, COUNT(*) as count FROM data GROUP BY ${column}`
      };
    }
  }
  
  // Duplicates
  if (query.includes('duplicate') || query.includes('duplicates')) {
    const column = columns.find(col => query.includes(col.toLowerCase()));
    if (column) {
      return {
        filterLogic: {
          type: 'FILTER',
          conditions: { column, type: 'DUPLICATES' }
        },
        sqlQuery: `SELECT * FROM data WHERE ${column} IN (SELECT ${column} FROM data GROUP BY ${column} HAVING COUNT(*) > 1)`
      };
    }
  }
  
  // Default: show all data
  return {
    filterLogic: 'ALL',
    sqlQuery: 'SELECT * FROM data'
  };
}

export default router;