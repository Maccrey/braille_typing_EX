const { getDb } = require('../config/database');

const getMyCategoriesWithCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = getDb();

    // Get user's categories with actual braille data count
    const categories = await new Promise((resolve, reject) => {
      const query = `
        SELECT
          c.*,
          COUNT(bd.id) as braille_count
        FROM categories c
        LEFT JOIN braille_data bd ON c.id = bd.category_id
        WHERE c.created_by = ?
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `;

      db.all(query, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });

    res.status(200).json({
      categories,
      total: categories.length
    });

  } catch (error) {
    console.error('Get my categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const searchPublicCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const { q: searchQuery } = req.query;

    // Validate search query
    if (searchQuery === undefined) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const db = getDb();

    // Search public categories (including user's own public categories)
    const categories = await new Promise((resolve, reject) => {
      let query = `
        SELECT
          c.*,
          COUNT(bd.id) as braille_count
        FROM categories c
        LEFT JOIN braille_data bd ON c.id = bd.category_id
        WHERE c.is_public = 1
        GROUP BY c.id
      `;

      let params = [];

      // Add search filter if query is not empty
      if (searchQuery && searchQuery.trim() !== '') {
        query += ` HAVING (LOWER(c.name) LIKE LOWER(?) OR LOWER(c.description) LIKE LOWER(?))`;
        const searchTerm = `%${searchQuery}%`;
        params.push(searchTerm, searchTerm);
      }

      query += ` ORDER BY c.created_at DESC`;

      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });

    res.status(200).json({
      categories,
      total: categories.length
    });

  } catch (error) {
    console.error('Search categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const addToFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId } = req.body;

    // Validate categoryId
    if (!categoryId) {
      return res.status(400).json({ error: 'Category ID is required' });
    }

    const db = getDb();

    // Check if category exists and is public (and not owned by user)
    const category = await new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM categories
        WHERE id = ? AND is_public = 1 AND created_by != ?
      `;

      db.get(query, [categoryId, userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found or not public' });
    }

    // Check if already in favorites
    const existingFavorite = await new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM favorites
        WHERE user_id = ? AND category_id = ?
      `;

      db.get(query, [userId, categoryId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (existingFavorite) {
      return res.status(409).json({ error: 'Category already in favorites' });
    }

    // Add to favorites
    await new Promise((resolve, reject) => {
      const query = `
        INSERT INTO favorites (user_id, category_id)
        VALUES (?, ?)
      `;

      db.run(query, [userId, categoryId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });

    res.status(201).json({ message: 'Category added to favorites' });

  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const removeFromFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId } = req.params;

    const db = getDb();

    // Check if favorite exists
    const existingFavorite = await new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM favorites
        WHERE user_id = ? AND category_id = ?
      `;

      db.get(query, [userId, categoryId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!existingFavorite) {
      return res.status(404).json({ error: 'Category not in favorites' });
    }

    // Remove from favorites
    await new Promise((resolve, reject) => {
      const query = `
        DELETE FROM favorites
        WHERE user_id = ? AND category_id = ?
      `;

      db.run(query, [userId, categoryId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    res.status(200).json({ message: 'Category removed from favorites' });

  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = getDb();

    // Get user's favorites with category details
    const favorites = await new Promise((resolve, reject) => {
      const query = `
        SELECT
          c.*,
          0 as braille_count,
          f.favorited_at as favorited_at
        FROM favorites f
        JOIN categories c ON f.category_id = c.id
        WHERE f.user_id = ?
        ORDER BY f.favorited_at DESC
      `;

      db.all(query, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });

    res.status(200).json({
      categories: favorites,
      total: favorites.length
    });

  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Task 7.1: Random Braille Data API
const getRandomBrailleData = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const userId = req.user.id;
    const db = getDb();

    // First check if user has access to this category
    const category = await new Promise((resolve, reject) => {
      const query = `
        SELECT c.* FROM categories c
        LEFT JOIN favorites f ON c.id = f.category_id AND f.user_id = ?
        WHERE c.id = ? AND (c.created_by = ? OR c.is_public = 1 OR f.id IS NOT NULL)
      `;

      db.get(query, [userId, categoryId, userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found or access denied' });
    }

    // Get random braille data from this category
    const brailleData = await new Promise((resolve, reject) => {
      const query = `
        SELECT id, category_id, character, braille_pattern, description FROM braille_data
        WHERE category_id = ?
        ORDER BY RANDOM()
        LIMIT 1
      `;

      db.get(query, [categoryId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!brailleData) {
      return res.status(404).json({ error: 'No braille data found in this category' });
    }

    res.json(brailleData);

  } catch (error) {
    console.error('Get random braille data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete category (only by owner)
const deleteCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId } = req.params;
    const db = getDb();

    // Check if category exists and is owned by user
    const category = await new Promise((resolve, reject) => {
      const query = 'SELECT * FROM categories WHERE id = ? AND created_by = ?';
      db.get(query, [categoryId, userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found or not owned by user' });
    }

    // Delete related braille data first
    await new Promise((resolve, reject) => {
      const query = 'DELETE FROM braille_data WHERE category_id = ?';
      db.run(query, [categoryId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Delete from favorites
    await new Promise((resolve, reject) => {
      const query = 'DELETE FROM favorites WHERE category_id = ?';
      db.run(query, [categoryId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Delete category
    await new Promise((resolve, reject) => {
      const query = 'DELETE FROM categories WHERE id = ?';
      db.run(query, [categoryId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    res.status(200).json({ message: 'Category deleted successfully' });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update category (only by owner)
const updateCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId } = req.params;
    const { name, description, isPublic } = req.body;
    const db = getDb();

    // Validate input
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Category name is required' });
    }

    if (name.length > 100) {
      return res.status(400).json({ error: 'Category name must be 100 characters or less' });
    }

    // Check if category exists and is owned by user
    const category = await new Promise((resolve, reject) => {
      const query = 'SELECT * FROM categories WHERE id = ? AND created_by = ?';
      db.get(query, [categoryId, userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found or not owned by user' });
    }

    // Check if name already exists for this user (excluding current category)
    const existingCategory = await new Promise((resolve, reject) => {
      const query = 'SELECT id FROM categories WHERE name = ? AND created_by = ? AND id != ?';
      db.get(query, [name.trim(), userId, categoryId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category name already exists for this user' });
    }

    // Update category
    const updatedCategory = await new Promise((resolve, reject) => {
      const query = `
        UPDATE categories
        SET name = ?, description = ?, is_public = ?
        WHERE id = ?
      `;

      db.run(query, [
        name.trim(),
        description || '',
        isPublic ? 1 : 0,
        categoryId
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          // Fetch updated category
          db.get('SELECT * FROM categories WHERE id = ?', [categoryId], (err, row) => {
            if (err) {
              reject(err);
            } else {
              resolve(row);
            }
          });
        }
      });
    });

    res.status(200).json({
      message: 'Category updated successfully',
      category: updatedCategory
    });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get braille data for a category (only by owner)
const getCategoryBrailleData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId } = req.params;
    const db = getDb();

    // Check if category exists and is owned by user
    const category = await new Promise((resolve, reject) => {
      const query = 'SELECT * FROM categories WHERE id = ? AND created_by = ?';
      db.get(query, [categoryId, userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found or not owned by user' });
    }

    // Get braille data
    const brailleData = await new Promise((resolve, reject) => {
      const query = `
        SELECT id, character, braille_pattern, description
        FROM braille_data
        WHERE category_id = ?
        ORDER BY id ASC
      `;
      db.all(query, [categoryId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });

    // Parse braille patterns from JSON
    const parsedData = brailleData.map(item => ({
      id: item.id,
      character: item.character,
      braille_pattern: JSON.parse(item.braille_pattern),
      description: item.description || ''
    }));

    res.status(200).json({
      category,
      brailleData: parsedData
    });

  } catch (error) {
    console.error('Get category braille data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update braille data for a category (only by owner)
const updateCategoryBrailleData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId } = req.params;
    const { brailleData } = req.body;
    const db = getDb();

    // Check if category exists and is owned by user
    const category = await new Promise((resolve, reject) => {
      const query = 'SELECT * FROM categories WHERE id = ? AND created_by = ?';
      db.get(query, [categoryId, userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found or not owned by user' });
    }

    // Validate braille data
    if (!Array.isArray(brailleData)) {
      return res.status(400).json({ error: 'Braille data must be an array' });
    }

    // Delete existing braille data
    await new Promise((resolve, reject) => {
      const query = 'DELETE FROM braille_data WHERE category_id = ?';
      db.run(query, [categoryId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Insert new braille data
    if (brailleData.length > 0) {
      const insertPromises = brailleData.map(item => {
        return new Promise((resolve, reject) => {
          // Validate each item
          if (!item.character || !item.character.trim()) {
            reject(new Error('Character is required'));
            return;
          }

          if (!Array.isArray(item.braille_pattern)) {
            reject(new Error('Braille pattern must be an array'));
            return;
          }

          // Validate braille pattern structure
          for (const block of item.braille_pattern) {
            if (!Array.isArray(block)) {
              reject(new Error('Each braille block must be an array'));
              return;
            }
            for (const dot of block) {
              if (typeof dot !== 'number' || dot < 1 || dot > 6) {
                reject(new Error('Braille dots must be numbers between 1 and 6'));
                return;
              }
            }
          }

          const query = `
            INSERT INTO braille_data (category_id, character, braille_pattern, description)
            VALUES (?, ?, ?, ?)
          `;

          db.run(query, [
            categoryId,
            item.character.trim(),
            JSON.stringify(item.braille_pattern),
            (item.description || '').trim()
          ], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ id: this.lastID, ...item });
            }
          });
        });
      });

      await Promise.all(insertPromises);
    }

    res.status(200).json({
      message: 'Braille data updated successfully',
      count: brailleData.length
    });

  } catch (error) {
    console.error('Update category braille data error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

module.exports = {
  getMyCategoriesWithCount,
  searchPublicCategories,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  getRandomBrailleData,
  deleteCategory,
  updateCategory,
  getCategoryBrailleData,
  updateCategoryBrailleData
};