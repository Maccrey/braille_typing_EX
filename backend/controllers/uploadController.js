const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../config/database');
const { createExampleFile } = require('../scripts/create-example-file');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only accept Excel files
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];

    if (allowedTypes.includes(file.mimetype) ||
        file.originalname.toLowerCase().endsWith('.xlsx') ||
        file.originalname.toLowerCase().endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const uploadFile = async (req, res) => {
  try {
    console.log('Upload request received:', {
      hasFile: !!req.file,
      body: req.body,
      fileInfo: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });

    // Check if file was uploaded
    if (!req.file) {
      console.log('Error: No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate required fields
    const { categoryName, description, isPublic } = req.body;

    console.log('Request body:', req.body);
    console.log('Category description:', description);

    if (!categoryName || categoryName.trim() === '') {
      return res.status(400).json({ error: 'Category name is required' });
    }

    if (categoryName.length > 100) {
      return res.status(400).json({ error: 'Category name must be 100 characters or less' });
    }

    // Check if file is empty
    if (req.file.size === 0) {
      return res.status(400).json({ error: 'File is empty or invalid' });
    }

    // Parse Excel file
    let workbook;
    try {
      console.log('Starting Excel file parsing...');
      workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      console.log('Excel file parsed successfully');
    } catch (error) {
      console.log('Excel parsing error:', error);
      return res.status(400).json({ error: 'Invalid Excel file format' });
    }

    // Get the first worksheet
    const worksheetName = workbook.SheetNames[0];
    if (!worksheetName) {
      return res.status(400).json({ error: 'Excel file contains no worksheets' });
    }

    const worksheet = workbook.Sheets[worksheetName];
    console.log('Converting worksheet to JSON...');
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`Converted to JSON, found ${jsonData.length} rows`);

    // Debug: Log first few rows to understand structure
    console.log('First 15 rows of Excel data:');
    for (let i = 0; i < Math.min(15, jsonData.length); i++) {
      console.log(`Row ${i + 1}:`, jsonData[i]);
    }

    // Validate data structure
    if (jsonData.length === 0) {
      console.log('Excel file is empty');
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Check for minimum required columns (character and at least one braille pattern)
    // Look at the header row (row 9, index 8) instead of first row
    const headerRow = jsonData[8]; // [ '문자', '블록1', '블록2', '설명' ]
    if (!headerRow || headerRow.length < 2) {
      return res.status(400).json({ error: 'Excel file must have at least 2 columns (character and braille pattern)' });
    }
    console.log('Header row validation passed:', headerRow);

    // Find description column index by looking for "설명" in header row
    let descriptionColumnIndex = -1;
    for (let i = 0; i < headerRow.length; i++) {
      if (headerRow[i] && headerRow[i].toString().trim() === '설명') {
        descriptionColumnIndex = i;
        break;
      }
    }
    console.log('Description column found at index:', descriptionColumnIndex);

    // Parse braille data from Excel
    console.log('=== Starting braille data parsing ===');
    try {
      // Skip header rows - actual data starts from row 9 (index 8)
      const brailleEntries = [];
      const startRow = 9; // 0-based index, so row 10 becomes index 9

      console.log(`Processing Excel data from row ${startRow + 1} to ${jsonData.length}`);
      console.log(`About to start processing loop...`);
      console.log(`StartRow: ${startRow}, jsonData.length: ${jsonData.length}`);

    for (let i = startRow; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length < 2) {
        console.log(`Skipping row ${i + 1}: insufficient data`);
        continue;
      }

      const character = row[0];
      if (!character || character.toString().trim() === '') {
        console.log(`Skipping row ${i + 1}: empty character`);
        continue;
      }

      console.log(`Processing row ${i + 1}: character="${character}"`);

      // Parse braille patterns from all columns except character column (index 0) and description column
      const brailleBlocks = [];

      // Get description from the found description column
      const description = (descriptionColumnIndex >= 0 && row[descriptionColumnIndex])
        ? row[descriptionColumnIndex].toString().trim()
        : '';

      // Process all columns that could contain braille patterns (skip column 0 which is character)
      for (let j = 1; j < row.length; j++) {
        // Skip description column if it exists
        if (j === descriptionColumnIndex) {
          continue;
        }
        const cellValue = row[j];
        if (cellValue && cellValue.toString().trim() !== '') {
          console.log(`  Processing cell [${i + 1}, ${j + 1}]: "${cellValue}"`);
          try {
            const braillePattern = parseBraillePattern(cellValue.toString().trim());
            if (braillePattern === null) {
              console.log(`  Invalid braille pattern: "${cellValue}"`);
              return res.status(400).json({
                error: `Invalid braille pattern "${cellValue}" in row ${i + 1}, column ${j + 1}`
              });
            }
            console.log(`  Successfully parsed pattern: [${braillePattern.join(', ')}]`);
            brailleBlocks.push(braillePattern);
          } catch (parseError) {
            console.log(`  Parse error for "${cellValue}": ${parseError.message}`);
            return res.status(400).json({
              error: `Parse error for "${cellValue}" in row ${i + 1}, column ${j + 1}: ${parseError.message}`
            });
          }
        }
      }

      if (brailleBlocks.length > 0) {
        console.log(`  Added entry for "${character}" with ${brailleBlocks.length} blocks and description: "${description}"`);
        brailleEntries.push({
          character: character.toString().trim(),
          pattern: brailleBlocks,
          description: description
        });
      } else {
        console.log(`  No braille blocks found for "${character}"`);
      }
    }

    console.log(`Processed ${brailleEntries.length} braille entries from Excel file`);
    if (brailleEntries.length === 0) {
      console.log('No valid braille data found in Excel file');
      return res.status(400).json({ error: 'No valid braille data found in Excel file' });
    }

    // Check if category already exists for this user
    const userId = req.user.id;
    console.log(`Checking if category "${categoryName.trim()}" exists for user ${userId}`);
    const existingCategory = await checkCategoryExists(categoryName.trim(), userId);

    if (existingCategory) {
      console.log(`Category "${categoryName.trim()}" already exists for user ${userId}`);
      return res.status(400).json({ error: 'Category name already exists for this user' });
    }

    // Create category in database
    const isPublicBool = isPublic === 'true' || isPublic === true;
    console.log('Creating category in database...');
    const category = await createCategory({
      name: categoryName.trim(),
      description: description || '',
      isPublic: isPublicBool,
      createdBy: userId
    });
    console.log('Category created:', category);

    // Insert braille data
    console.log(`Inserting ${brailleEntries.length} braille entries into database...`);
    const insertedData = await insertBrailleData(category.id, brailleEntries);
    console.log(`Successfully inserted ${insertedData.length} braille data records`);

    res.status(201).json({
      message: 'File uploaded and processed successfully',
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
        is_public: category.is_public,
        created_by: category.created_by,
        created_at: category.created_at
      },
      brailleDataCount: insertedData.length
    });

    } catch (processingError) {
      console.error('Error during braille data processing:', processingError);
      console.error('Processing error stack:', processingError.stack);
      return res.status(400).json({
        error: `Processing error: ${processingError.message}`
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum 10MB allowed.' });
    }

    if (error.message.includes('Only Excel files')) {
      return res.status(400).json({ error: 'Only Excel files (.xlsx, .xls) are allowed' });
    }

    res.status(500).json({ error: 'Internal server error during file upload' });
  }
};

// Helper function to parse braille pattern from string
function parseBraillePattern(patternStr) {
  try {
    console.log(`    Parsing braille pattern: "${patternStr}"`);
    // Handle patterns like "1,2,3" or "1 2 3" or "123"
    const cleaned = patternStr.replace(/[^\d,\s]/g, '');
    console.log(`    Cleaned pattern: "${cleaned}"`);
    let dots;

    if (cleaned.includes(',')) {
      dots = cleaned.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
      console.log(`    Comma-separated dots: [${dots.join(', ')}]`);
    } else if (cleaned.includes(' ')) {
      dots = cleaned.split(/\s+/).map(d => parseInt(d.trim())).filter(d => !isNaN(d));
      console.log(`    Space-separated dots: [${dots.join(', ')}]`);
    } else {
      // Individual digits like "123" -> [1, 2, 3]
      dots = cleaned.split('').map(d => parseInt(d)).filter(d => !isNaN(d));
      console.log(`    Individual digit dots: [${dots.join(', ')}]`);
    }

    // Validate dot numbers (must be 1-6)
    for (const dot of dots) {
      if (dot < 1 || dot > 6) {
        console.log(`    Invalid dot number: ${dot}`);
        return null;
      }
    }

    const result = dots.sort(); // Sort for consistency
    console.log(`    Final result: [${result.join(', ')}]`);
    return result;
  } catch (error) {
    console.log(`    Parse error: ${error.message}`);
    return null;
  }
}

// Database helper functions
function checkCategoryExists(name, userId) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const query = 'SELECT id FROM categories WHERE name = ? AND created_by = ?';
    db.get(query, [name, userId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function createCategory(categoryData) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const query = `
      INSERT INTO categories (name, description, is_public, created_by)
      VALUES (?, ?, ?, ?)
    `;

    db.run(query, [
      categoryData.name,
      categoryData.description,
      categoryData.isPublic ? 1 : 0,
      categoryData.createdBy
    ], function(err) {
      if (err) {
        reject(err);
      } else {
        // Fetch the created category
        db.get('SELECT * FROM categories WHERE id = ?', [this.lastID], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      }
    });
  });
}

function insertBrailleData(categoryId, brailleEntries) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const insertPromises = brailleEntries.map(entry => {
      return new Promise((resolveEntry, rejectEntry) => {
        const query = `
          INSERT INTO braille_data (category_id, character, braille_pattern, description)
          VALUES (?, ?, ?, ?)
        `;

        db.run(query, [
          categoryId,
          entry.character,
          JSON.stringify(entry.pattern),
          entry.description || ''
        ], function(err) {
          if (err) {
            rejectEntry(err);
          } else {
            resolveEntry({ id: this.lastID, ...entry });
          }
        });
      });
    });

    Promise.all(insertPromises)
      .then(results => resolve(results))
      .catch(error => reject(error));
  });
}

// Download example file function
const downloadExampleFile = async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const exampleFilePath = path.join(uploadsDir, 'braille-example.xlsx');

    // Check if example file exists, if not create it
    if (!fs.existsSync(exampleFilePath)) {
      console.log('Example file not found, creating new one...');
      await createExampleFile();
    }

    // Check file exists after creation
    if (!fs.existsSync(exampleFilePath)) {
      return res.status(404).json({ error: 'Example file not found' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="braille-example.xlsx"');
    res.setHeader('Content-Length', fs.statSync(exampleFilePath).size);

    // Stream the file to the response
    const fileStream = fs.createReadStream(exampleFilePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading file' });
      }
    });

    fileStream.on('end', () => {
      console.log('Example file downloaded successfully');
    });

  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error during file download' });
    }
  }
};

module.exports = {
  upload: upload.single('file'),
  uploadFile,
  downloadExampleFile
};