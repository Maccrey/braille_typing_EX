const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../config/database');

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
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate required fields
    const { categoryName, description, isPublic } = req.body;

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
      workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    } catch (error) {
      return res.status(400).json({ error: 'Invalid Excel file format' });
    }

    // Get the first worksheet
    const worksheetName = workbook.SheetNames[0];
    if (!worksheetName) {
      return res.status(400).json({ error: 'Excel file contains no worksheets' });
    }

    const worksheet = workbook.Sheets[worksheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Validate data structure
    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Check for minimum required columns (character and at least one braille pattern)
    const firstRow = jsonData[0];
    if (!firstRow || firstRow.length < 2) {
      return res.status(400).json({ error: 'Excel file must have at least 2 columns (character and braille pattern)' });
    }

    // Parse braille data from Excel
    const brailleEntries = [];
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length < 2) continue;

      const character = row[0];
      if (!character || character.toString().trim() === '') continue;

      // Parse braille patterns from remaining columns
      const brailleBlocks = [];
      for (let j = 1; j < row.length; j++) {
        const cellValue = row[j];
        if (cellValue && cellValue.toString().trim() !== '') {
          const braillePattern = parseBraillePattern(cellValue.toString().trim());
          if (braillePattern === null) {
            return res.status(400).json({
              error: `Invalid braille pattern "${cellValue}" in row ${i + 1}, column ${j + 1}`
            });
          }
          brailleBlocks.push(braillePattern);
        }
      }

      if (brailleBlocks.length > 0) {
        brailleEntries.push({
          character: character.toString().trim(),
          pattern: brailleBlocks
        });
      }
    }

    if (brailleEntries.length === 0) {
      return res.status(400).json({ error: 'No valid braille data found in Excel file' });
    }

    // Check if category already exists for this user
    const userId = req.user.id;
    const existingCategory = await checkCategoryExists(categoryName.trim(), userId);

    if (existingCategory) {
      return res.status(400).json({ error: 'Category name already exists for this user' });
    }

    // Create category in database
    const isPublicBool = isPublic === 'true' || isPublic === true;
    const category = await createCategory({
      name: categoryName.trim(),
      description: description || '',
      isPublic: isPublicBool,
      createdBy: userId
    });

    // Insert braille data
    const insertedData = await insertBrailleData(category.id, brailleEntries);

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

  } catch (error) {
    console.error('Upload error:', error);

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
    // Handle patterns like "1,2,3" or "1 2 3" or "123"
    const cleaned = patternStr.replace(/[^\d,\s]/g, '');
    let dots;

    if (cleaned.includes(',')) {
      dots = cleaned.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
    } else if (cleaned.includes(' ')) {
      dots = cleaned.split(/\s+/).map(d => parseInt(d.trim())).filter(d => !isNaN(d));
    } else {
      // Individual digits like "123" -> [1, 2, 3]
      dots = cleaned.split('').map(d => parseInt(d)).filter(d => !isNaN(d));
    }

    // Validate dot numbers (must be 1-6)
    for (const dot of dots) {
      if (dot < 1 || dot > 6) {
        return null;
      }
    }

    return dots.sort(); // Sort for consistency
  } catch (error) {
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
          INSERT INTO braille_data (category_id, character, braille_pattern)
          VALUES (?, ?, ?)
        `;

        db.run(query, [
          categoryId,
          entry.character,
          JSON.stringify(entry.pattern)
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

module.exports = {
  upload: upload.single('file'),
  uploadFile
};