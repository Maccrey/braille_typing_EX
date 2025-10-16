const { getDb } = require('../config/firebase');

const getMyCategoriesWithCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = getDb();

    console.log('🔍 Getting categories for user:', userId);

    // Get user's categories from Firestore
    const categoriesSnapshot = await db.collection('categories')
      .where('created_by', '==', userId)
      .get();

    if (categoriesSnapshot.empty) {
      return res.status(200).json({
        categories: [],
        total: 0
      });
    }

    const categories = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('📋 Found categories:', categories.length);

    // Get braille count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const brailleSnapshot = await db.collection('braille_data')
          .where('category_id', '==', category.id)
          .get();

        return {
          ...category,
          braille_count: brailleSnapshot.size
        };
      })
    );

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

    // Get all public categories from Firestore
    const categoriesSnapshot = await db.collection('categories')
      .where('is_public', '==', true)
      .get();

    let categories = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('📋 Found public categories:', categories.length);

    // Filter by search query if provided
    if (searchQuery && searchQuery.trim() !== '') {
      const searchTerm = searchQuery.toLowerCase();
      categories = categories.filter(category => {
        return category.name.toLowerCase().includes(searchTerm) ||
               (category.description || '').toLowerCase().includes(searchTerm);
      });
      console.log('🔎 Filtered categories:', categories.length);
    }

    // Add braille data count to each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const brailleSnapshot = await db.collection('braille_data')
          .where('category_id', '==', category.id)
          .get();
        console.log(`📊 Category "${category.name}" has ${brailleSnapshot.size} braille entries`);

        return {
          ...category,
          braille_count: brailleSnapshot.size
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
    const categoryDoc = await db.collection('categories').doc(categoryId).get();

    if (!categoryDoc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = categoryDoc.data();

    if (!category.is_public || category.created_by === userId) {
      return res.status(404).json({ error: 'Category not found or not public' });
    }

    // Check if already in favorites
    const favoritesSnapshot = await db.collection('favorites')
      .where('user_id', '==', userId)
      .where('category_id', '==', categoryId)
      .limit(1)
      .get();

    if (!favoritesSnapshot.empty) {
      return res.status(409).json({ error: 'Category already in favorites' });
    }

    // Add to favorites
    await db.collection('favorites').add({
      user_id: userId,
      category_id: categoryId,
      created_at: new Date().toISOString()
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

    // Find and delete favorite
    const favoritesSnapshot = await db.collection('favorites')
      .where('user_id', '==', userId)
      .where('category_id', '==', categoryId)
      .limit(1)
      .get();

    if (favoritesSnapshot.empty) {
      return res.status(404).json({ error: 'Category not in favorites' });
    }

    // Delete the favorite
    await favoritesSnapshot.docs[0].ref.delete();

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
    const favoritesSnapshot = await db.collection('favorites')
      .where('user_id', '==', userId)
      .get();

    if (favoritesSnapshot.empty) {
      return res.status(200).json({
        categories: [],
        total: 0
      });
    }

    // Get category details for each favorite
    const favorites = await Promise.all(
      favoritesSnapshot.docs.map(async (favoriteDoc) => {
        const favorite = favoriteDoc.data();
        const categoryDoc = await db.collection('categories').doc(favorite.category_id).get();

        if (!categoryDoc.exists) {
          return null;
        }

        return {
          id: categoryDoc.id,
          ...categoryDoc.data(),
          braille_count: 0,
          favorited_at: favorite.created_at
        };
      })
    );

    // Filter out null values and sort by favorited_at descending
    const validFavorites = favorites.filter(f => f !== null);
    validFavorites.sort((a, b) => new Date(b.favorited_at) - new Date(a.favorited_at));

    res.status(200).json({
      categories: validFavorites,
      total: validFavorites.length
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

    // First check if category exists
    const categoryDoc = await db.collection('categories').doc(categoryId).get();

    if (!categoryDoc.exists) {
      return res.status(404).json({ error: 'Category not found or access denied' });
    }

    const category = categoryDoc.data();

    // Check access: owned by user, public, or in favorites
    let hasAccess = false;
    if (category.created_by === userId || category.is_public === true) {
      hasAccess = true;
    } else {
      const favoritesSnapshot = await db.collection('favorites')
        .where('user_id', '==', userId)
        .where('category_id', '==', categoryId)
        .limit(1)
        .get();

      if (!favoritesSnapshot.empty) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(404).json({ error: 'Category not found or access denied' });
    }

    // Get all braille data from this category
    const brailleSnapshot = await db.collection('braille_data')
      .where('category_id', '==', categoryId)
      .get();

    if (brailleSnapshot.empty) {
      return res.status(404).json({ error: 'No braille data found in this category' });
    }

    const allBrailleData = brailleSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

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
    const categoryDoc = await db.collection('categories').doc(categoryId).get();

    if (!categoryDoc.exists || categoryDoc.data().created_by !== userId) {
      return res.status(404).json({ error: 'Category not found or not owned by user' });
    }

    // Delete related braille data first
    const brailleSnapshot = await db.collection('braille_data')
      .where('category_id', '==', categoryId)
      .get();

    const batch = db.batch();
    brailleSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete from favorites
    const favoritesSnapshot = await db.collection('favorites')
      .where('category_id', '==', categoryId)
      .get();

    favoritesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete category
    batch.delete(categoryDoc.ref);

    await batch.commit();

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
    const categoryDoc = await db.collection('categories').doc(categoryId).get();

    if (!categoryDoc.exists || categoryDoc.data().created_by !== userId) {
      return res.status(404).json({ error: 'Category not found or not owned by user' });
    }

    // Check if name already exists for this user (excluding current category)
    const existingCategoriesSnapshot = await db.collection('categories')
      .where('created_by', '==', userId)
      .where('name', '==', name.trim())
      .get();

    const nameConflict = existingCategoriesSnapshot.docs.some(doc => doc.id !== categoryId);

    if (nameConflict) {
      return res.status(400).json({ error: 'Category name already exists for this user' });
    }

    // Update category
    await categoryDoc.ref.update({
      name: name.trim(),
      description: description || '',
      is_public: isPublic ? true : false,
      updated_at: new Date().toISOString()
    });

    // Fetch updated category
    const updatedCategoryDoc = await db.collection('categories').doc(categoryId).get();
    const updatedCategory = { id: updatedCategoryDoc.id, ...updatedCategoryDoc.data() };

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
    const categoryDoc = await db.collection('categories').doc(categoryId).get();

    if (!categoryDoc.exists || categoryDoc.data().created_by !== userId) {
      return res.status(404).json({ error: 'Category not found or not owned by user' });
    }

    // Get braille data
    const brailleSnapshot = await db.collection('braille_data')
      .where('category_id', '==', categoryId)
      .get();

    const brailleData = brailleSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        character: data.character,
        braille_pattern: typeof data.braille_pattern === 'string' ?
          JSON.parse(data.braille_pattern) : data.braille_pattern,
        description: data.description || ''
      };
    });

    res.status(200).json({
      category: { id: categoryDoc.id, ...categoryDoc.data() },
      brailleData: brailleData
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
    const categoryDoc = await db.collection('categories').doc(categoryId).get();

    if (!categoryDoc.exists || categoryDoc.data().created_by !== userId) {
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
    const existingBrailleSnapshot = await db.collection('braille_data')
      .where('category_id', '==', categoryId)
      .get();

    const batch = db.batch();

    existingBrailleSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Insert new braille data
    if (brailleData.length > 0) {
      for (const item of brailleData) {
        const newDocRef = db.collection('braille_data').doc();
        batch.set(newDocRef, {
          category_id: categoryId,
          character: item.character.trim(),
          braille_pattern: JSON.stringify(item.braille_pattern),
          description: (item.description || '').trim(),
          created_at: new Date().toISOString()
        });
      }
    }

    await batch.commit();

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
