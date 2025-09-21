const { getDb } = require('../config/database');

const getMyCategoriesWithCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = getDb();

    // Get user's categories (simplified for now)
    const categories = await new Promise((resolve, reject) => {
      const query = `
        SELECT
          c.*,
          0 as braille_count
        FROM categories c
        WHERE c.created_by = ?
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

    // Search public categories (excluding user's own categories)
    const categories = await new Promise((resolve, reject) => {
      let query = `
        SELECT
          c.*,
          0 as braille_count
        FROM categories c
        WHERE c.is_public = 1 AND c.created_by != ?
      `;

      let params = [userId];

      // Add search filter if query is not empty
      if (searchQuery && searchQuery.trim() !== '') {
        query += ` AND (LOWER(c.name) LIKE LOWER(?) OR LOWER(c.description) LIKE LOWER(?))`;
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
          f.created_at as favorited_at
        FROM favorites f
        JOIN categories c ON f.category_id = c.id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
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
    const userId = req.user.id;
    const { categoryId } = req.params;
    const db = getDb();

    // Get random braille data from accessible category
    const brailleData = await new Promise((resolve, reject) => {
      const query = `
        SELECT bd.character, bd.braille_pattern
        FROM braille_data bd
        JOIN categories c ON bd.category_id = c.id
        WHERE bd.category_id = ?
          AND (c.created_by = ? OR c.is_public = 1)
        ORDER BY RANDOM()
        LIMIT 1
      `;

      db.get(query, [categoryId, userId], (err, row) => {
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

    res.status(200).json({
      character: brailleData.character,
      braille_pattern: brailleData.braille_pattern
    });

  } catch (error) {
    console.error('Get random braille data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getMyCategoriesWithCount,
  searchPublicCategories,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  getRandomBrailleData
};