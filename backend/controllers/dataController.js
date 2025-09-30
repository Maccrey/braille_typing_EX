const { getDb } = require('../config/database');

const getMyCategoriesWithCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = getDb();

    console.log('🔍 Getting categories for user:', userId);

    // Get user's categories using JSON database method
    const categories = await db.select('categories', { created_by: userId });
    console.log('📋 Found categories:', categories);

    if (categories.length === 0) {
      return res.status(200).json({
        categories: [],
        total: 0
      });
    }

    // Get ALL braille data in one query and group by category_id for performance
    const allBrailleData = await db.select('braille_data', {});
    const brailleCountMap = {};

    // Group braille data by category_id
    allBrailleData.forEach(braille => {
      if (!brailleCountMap[braille.category_id]) {
        brailleCountMap[braille.category_id] = 0;
      }
      brailleCountMap[braille.category_id]++;
    });

    // Add count to each category
    const categoriesWithCount = categories.map(category => ({
      ...category,
      braille_count: brailleCountMap[category.id] || 0
    }));

    // Sort by created_at DESC
    categoriesWithCount.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log('✅ Successfully retrieved categories with counts');

    res.status(200).json({
      categories: categoriesWithCount,
      total: categoriesWithCount.length
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
    console.log('🔍 Searching public categories with query:', searchQuery);

    // Get all public categories using JSON database method
    const allPublicCategories = await db.select('categories', { is_public: 1 });
    console.log('📋 Found public categories:', allPublicCategories.length);

    // Filter by search query if provided
    let filteredCategories = allPublicCategories;
    if (searchQuery && searchQuery.trim() !== '') {
      const searchTerm = searchQuery.toLowerCase();
      filteredCategories = allPublicCategories.filter(category => {
        return category.name.toLowerCase().includes(searchTerm) ||
               (category.description || '').toLowerCase().includes(searchTerm);
      });
      console.log('🔎 Filtered categories:', filteredCategories.length);
    }

    // Add braille data count to each category
    const categoriesWithCount = await Promise.all(
      filteredCategories.map(async (category) => {
        const brailleData = await db.select('braille_data', { category_id: category.id });
        console.log(`📊 Category "${category.name}" has ${brailleData.length} braille entries`);

        return {
          ...category,
          braille_count: brailleData.length
        };
      })
    );

    // Sort by created_at DESC
    categoriesWithCount.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log('✅ Successfully retrieved public categories');

    res.status(200).json({
      categories: categoriesWithCount,
      total: categoriesWithCount.length
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
    const categories = await db.select('categories', { id: parseInt(categoryId), is_public: 1 });
    const category = categories.find(cat => cat.created_by !== userId);

    if (!category) {
      return res.status(404).json({ error: 'Category not found or not public' });
    }

    // Check if already in favorites
    const existingFavorite = await db.selectOne('favorites', {
      user_id: userId,
      category_id: parseInt(categoryId)
    });

    if (existingFavorite) {
      return res.status(409).json({ error: 'Category already in favorites' });
    }

    // Add to favorites
    await db.insert('favorites', {
      user_id: userId,
      category_id: parseInt(categoryId)
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
    const existingFavorite = await db.selectOne('favorites', {
      user_id: userId,
      category_id: parseInt(categoryId)
    });

    if (!existingFavorite) {
      return res.status(404).json({ error: 'Category not in favorites' });
    }

    // Remove from favorites
    await db.delete('favorites', {
      user_id: userId,
      category_id: parseInt(categoryId)
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

    // Get user's favorites
    const userFavorites = await db.select('favorites', { user_id: userId });

    // Get category details for each favorite
    const favorites = await Promise.all(
      userFavorites.map(async (favorite) => {
        const category = await db.selectOne('categories', { id: favorite.category_id });
        return {
          ...category,
          braille_count: 0,
          favorited_at: favorite.created_at
        };
      })
    );

    // Sort by favorited_at descending
    favorites.sort((a, b) => new Date(b.favorited_at) - new Date(a.favorited_at));

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
    const category = await db.selectOne('categories', { id: parseInt(categoryId) });

    if (!category) {
      return res.status(404).json({ error: 'Category not found or access denied' });
    }

    // Check access: owned by user, public, or in favorites
    let hasAccess = false;
    if (category.created_by === userId || category.is_public === 1) {
      hasAccess = true;
    } else {
      const favorite = await db.selectOne('favorites', {
        user_id: userId,
        category_id: parseInt(categoryId)
      });
      if (favorite) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(404).json({ error: 'Category not found or access denied' });
    }

    // Get all braille data from this category and pick random one
    const allBrailleData = await db.select('braille_data', { category_id: parseInt(categoryId) });

    if (!allBrailleData || allBrailleData.length === 0) {
      return res.status(404).json({ error: 'No braille data found in this category' });
    }

    // Pick random braille data
    const randomIndex = Math.floor(Math.random() * allBrailleData.length);
    const brailleData = allBrailleData[randomIndex];

    // Return only needed fields
    const result = {
      id: brailleData.id,
      category_id: brailleData.category_id,
      character: brailleData.character,
      braille_pattern: brailleData.braille_pattern,
      description: brailleData.description
    };

    res.json(result);

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
    const category = await db.selectOne('categories', {
      id: parseInt(categoryId),
      created_by: userId
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found or not owned by user' });
    }

    // Delete related braille data first
    await db.delete('braille_data', { category_id: parseInt(categoryId) });

    // Delete from favorites
    await db.delete('favorites', { category_id: parseInt(categoryId) });

    // Delete category
    await db.delete('categories', { id: parseInt(categoryId) });

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
    const category = await db.selectOne('categories', {
      id: parseInt(categoryId),
      created_by: userId
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found or not owned by user' });
    }

    // Check if name already exists for this user (excluding current category)
    const userCategories = await db.select('categories', { created_by: userId });
    const existingCategory = userCategories.find(cat =>
      cat.name === name.trim() && cat.id !== parseInt(categoryId)
    );

    if (existingCategory) {
      return res.status(400).json({ error: 'Category name already exists for this user' });
    }

    // Update category
    await db.update('categories', {
      name: name.trim(),
      description: description || '',
      is_public: isPublic ? 1 : 0
    }, { id: parseInt(categoryId) });

    // Fetch updated category
    const updatedCategory = await db.selectOne('categories', { id: parseInt(categoryId) });

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
    const category = await db.selectOne('categories', {
      id: parseInt(categoryId),
      created_by: userId
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found or not owned by user' });
    }

    // Get braille data
    const brailleData = await db.select('braille_data', { category_id: parseInt(categoryId) });

    // Sort by id and parse braille patterns from JSON
    const parsedData = brailleData
      .sort((a, b) => a.id - b.id)
      .map(item => ({
        id: item.id,
        character: item.character,
        braille_pattern: typeof item.braille_pattern === 'string' ?
          JSON.parse(item.braille_pattern) : item.braille_pattern,
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
    const category = await db.selectOne('categories', {
      id: parseInt(categoryId),
      created_by: userId
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found or not owned by user' });
    }

    // Validate braille data
    if (!Array.isArray(brailleData)) {
      return res.status(400).json({ error: 'Braille data must be an array' });
    }

    // Validate each braille data item
    for (const item of brailleData) {
      if (!item.character || !item.character.trim()) {
        throw new Error('Character is required');
      }

      if (!Array.isArray(item.braille_pattern)) {
        throw new Error('Braille pattern must be an array');
      }

      // Validate braille pattern structure
      for (const block of item.braille_pattern) {
        if (!Array.isArray(block)) {
          throw new Error('Each braille block must be an array');
        }
        for (const dot of block) {
          if (typeof dot !== 'number' || dot < 1 || dot > 6) {
            throw new Error('Braille dots must be numbers between 1 and 6');
          }
        }
      }
    }

    // Delete existing braille data
    await db.delete('braille_data', { category_id: parseInt(categoryId) });

    // Insert new braille data
    if (brailleData.length > 0) {
      for (const item of brailleData) {
        await db.insert('braille_data', {
          category_id: parseInt(categoryId),
          character: item.character.trim(),
          braille_pattern: JSON.stringify(item.braille_pattern),
          description: (item.description || '').trim()
        });
      }
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