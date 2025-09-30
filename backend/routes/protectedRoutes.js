const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getProfile, getStats, getPracticeLogs, logPracticeSession } = require('../controllers/protectedController');
const { logPracticeSession: logPracticeSessionDedicated } = require('../controllers/practiceController');
const { upload, uploadFile, downloadExampleFile } = require('../controllers/uploadController');
const { getMyCategoriesWithCount, searchPublicCategories, addToFavorites, removeFromFavorites, getFavorites, getRandomBrailleData, deleteCategory, updateCategory, getCategoryBrailleData, updateCategoryBrailleData } = require('../controllers/dataController');

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// Protected routes
router.get('/profile', getProfile);
router.get('/stats', getStats);
router.get('/practice-logs', getPracticeLogs);
router.post('/practice-logs', logPracticeSession);

// Category routes
router.get('/categories/my', getMyCategoriesWithCount);
router.get('/categories/search', searchPublicCategories);
router.delete('/categories/:categoryId', deleteCategory);
router.put('/categories/:categoryId', updateCategory);
router.get('/categories/:categoryId/braille-data', getCategoryBrailleData);
router.put('/categories/:categoryId/braille-data', updateCategoryBrailleData);

// Favorites routes
router.post('/favorites', addToFavorites);
router.delete('/favorites/:categoryId', removeFromFavorites);
router.get('/favorites', getFavorites);

// Upload routes
router.post('/upload', upload, uploadFile);
router.get('/download-example', downloadExampleFile);

// Braille practice routes - Task 7.1
router.get('/braille/:categoryId/random', getRandomBrailleData);

// Practice session logging routes using dedicated practice controller
router.post('/practice/log', logPracticeSessionDedicated);

module.exports = router;