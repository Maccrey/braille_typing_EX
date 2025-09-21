const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getProfile, getStats } = require('../controllers/protectedController');
const { upload, uploadFile } = require('../controllers/uploadController');
const { getMyCategoriesWithCount, searchPublicCategories, addToFavorites, removeFromFavorites, getFavorites } = require('../controllers/dataController');

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// Protected routes
router.get('/profile', getProfile);
router.get('/stats', getStats);

// Category routes
router.get('/categories/my', getMyCategoriesWithCount);
router.get('/categories/search', searchPublicCategories);

// Favorites routes
router.post('/favorites', addToFavorites);
router.delete('/favorites/:categoryId', removeFromFavorites);
router.get('/favorites', getFavorites);

// Upload route
router.post('/upload', upload, uploadFile);

module.exports = router;