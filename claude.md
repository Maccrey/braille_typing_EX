# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a braille typing practice web application built with Node.js/Express backend, Firebase/Firestore database, and vanilla JavaScript frontend. The project follows TDD principles with Jest for backend testing and Playwright for E2E testing.

## Development Commands

### Backend (from `/backend` directory)

- **Run tests**: `npm test` (runs Jest test suite)
- **Start development server**: `npm start` (starts Express server on port 3000)
- **Start dev server with auto-reload**: `npm run dev` (uses nodemon)
- **Make user admin**: `node scripts/makeUserAdmin.js <username>` (promotes user to admin role)

### Frontend (from `/frontend` directory)

- **Run E2E tests**: `npm test` (runs Playwright tests)
- **Start dev server**: `npm run serve` or `npx http-server -p 8080` (serves static files for testing)

### Database

- **Database**: Firebase Firestore (Cloud NoSQL database)
- **Setup Guide**: See `FIREBASE_SETUP.md` for detailed Firebase project configuration
- **Migration Notes**: See `FIREBASE_MIGRATION.md` for migration details from JSON DB

## Architecture & Structure

### Backend Architecture

- **Entry point**: `backend/app.js` (Express app configuration)
- **Database**: Firebase Firestore (NoSQL cloud database)
- **Authentication**: Firebase Authentication + JWT tokens with bcrypt password hashing
- **File uploads**: Multer for Excel file processing
- **API structure**: RESTful endpoints following `/api/*` pattern

### Key Backend Components

- `/config/firebase.js` - Firebase Admin SDK initialization
- `/config/database.js` - Database interface (exports Firebase methods)
- `/controllers/` - Business logic for auth, data, profile, admin
- `/routes/` - Express route definitions
- `/middleware/` - Authentication and admin authorization
- `/__tests__/` - Jest test files with supertest for API testing

### Frontend Architecture

- **Technology**: Vanilla JavaScript, HTML5, CSS3 (no frameworks)
- **API communication**: Fetch API for async backend calls
- **Testing**: Playwright E2E tests in `/tests/` directory
- **UI**: Custom braille grid interface based on sample.md implementation
  - Dynamic braille block generation with 2x3 dot grid layout
  - Keyboard input mapping: F(1), D(2), S(3), J(4), K(5), L(6)
  - Real-time visual feedback with active/correct/wrong states
  - Sequential block progression system with auto-validation

### Firestore Collections Schema

- **users**: Firebase Auth UID, username (unique), hashed password, role, timestamps
  - Document ID: Auto-generated Firestore ID
  - Indexed fields: username, uid
- **categories**: braille learning categories/topics with public/private visibility and owner tracking
  - Document ID: Auto-generated Firestore ID
  - Boolean fields: is_public (true/false)
  - Indexed fields: created_by, is_public
- **braille_data**: characters with braille dot patterns (JSON string format)
  - Document ID: Auto-generated Firestore ID
  - Indexed fields: category_id
- **practice_logs**: user practice session duration tracking
  - Document ID: Auto-generated Firestore ID
  - Indexed fields: user_id, practiced_at
- **attendance**: daily attendance calendar data with check-in/out times
  - Document ID: Auto-generated Firestore ID
  - Compound index: user_id + date
- **favorites**: user bookmarks for public categories created by others
  - Document ID: Auto-generated Firestore ID
  - Compound index: user_id + category_id (unique)
- **posts**: community posts with author information
  - Document ID: Auto-generated Firestore ID
  - Indexed fields: author_id
- **comments**: nested comments for posts
  - Document ID: Auto-generated Firestore ID
  - Indexed fields: post_id, parent_comment_id

## Development Rules & Workflow

### TDD Requirements

- Backend APIs must have Jest tests written FIRST using supertest
- Frontend features require Playwright E2E tests
- All tests must pass before committing
- Follow Red-Green-Refactor cycle

### Documentation-Driven Development

- All features must align with `prd.md` requirements
- Task progression follows `tasklist.md` order strictly
- No arbitrary feature additions outside documented scope

### Commit Standards

- Use Conventional Commits format: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`
- Commit after each completed task with passing tests
- Example: `feat: Implement user login API with JWT`

## Key Technical Patterns

### Authentication Flow

- **Firebase Authentication**: Users created with email format `username@braille-typing.local`
- **Firestore User Documents**: Additional user data (username, role) stored in Firestore
- **JWT Tokens**: Backward compatible JWT tokens for API authentication
- **Middleware**: Validates tokens and retrieves user data from Firestore
- **Admin Routes**: Additional authorization middleware for admin-only endpoints

### Braille Data Structure

- Characters stored with dot patterns as JSON arrays
- Example: `[[6], [2, 6], [1]]` represents multi-block braille sequence
- Each sub-array represents one braille block with dot numbers (1-6)
- Excel upload parsing converts spreadsheet data to this format
- Sample.md demonstrates the complete braille map for Greek characters

### Frontend State Management

- No framework - pure JavaScript with DOM manipulation
- Local storage for auth tokens and user session data
- Event-driven UI updates for braille practice interface
- Key state variables: currentChar, correctBraille, currentBlockIndex, pressedDots Set
- Dynamic DOM creation for braille blocks using createBrailleBlocks() function
- Real-time dot state updates with visual feedback classes (.active, .correct, .wrong)

## Testing Strategy

### Backend Tests (`backend/__tests__/`)

- `auth.test.js` - Authentication endpoints
- `data.test.js` - Category and braille data APIs
- `profile.test.js` - User statistics and practice logging
- `upload.test.js` - Excel upload with public/private options
- `favorites.test.js` - Favorites add/remove and search functionality
- `database.test.js` - Database schema validation including Favorites table

### Frontend Tests (`frontend/tests/`)

- `login.spec.js` - Authentication user flows
- `practice.spec.js` - Braille practice interface and functionality
  - Keyboard input testing (F,D,S,J,K,L key mapping)
  - Multi-block progression validation
  - Visual feedback state verification (.active, .correct, .wrong classes)
  - Hint functionality toggle testing
- `search-favorites.spec.js` - Search and favorites functionality
  - Public category search interface testing
  - Favorites add/remove button interactions
  - Category filtering (My/Favorites/Search tabs) testing

### Test Execution

- Backend: `cd backend && npm test`
- Frontend: `cd frontend && npm test` (starts http-server automatically)
- Playwright config uses port 8080 for test server

## File Upload & Excel Processing

All users can upload Excel files with braille data:

- Column A: Character to learn
- Columns B+: Dot numbers for each braille block (e.g., "1,3,5")
- Upload form includes: category name, description, public/private toggle
- Uses `xlsx` library for parsing
- Stores data in Firestore `categories` and `braille_data` collections with owner tracking
- Public categories become searchable by other users

## Common Pitfalls & Important Notes

### Firebase-Specific
- **Firebase Setup Required**: Must configure Firebase project before running (see `FIREBASE_SETUP.md`)
- **Service Account Key**: `backend/config/serviceAccountKey.json` required but NOT committed to Git
- **Firestore IDs**: Document IDs are auto-generated strings, not integers - no `parseInt()` needed
- **Boolean Fields**: Use `true/false` instead of `1/0` for Firestore boolean fields (e.g., `is_public`)
- **Compound Queries**: Some Firestore queries require composite indexes - Firebase will auto-suggest creating them
- **Batch Limits**: Firestore batch operations limited to 500 operations per batch

### General Application
- Backend app.js exports Express app but doesn't include server.listen() - use `npm start` to run server
- Frontend relies on specific keyboard mapping: F(1), D(2), S(3), J(4), K(5), L(6)
- JWT tokens stored in localStorage require manual cleanup on logout
- Playwright tests expect http-server on port 8080 exactly
- Braille dot grid layout must follow 1-4, 2-5, 3-6 arrangement (sample.md pattern)
- Auto-validation triggers when pressedDots.size equals correctDots.size
- Backspace removes last dot (not full reset) - use Array.from(pressedDots).pop() pattern
- Visual feedback timing: wrong state shows for 500ms before reset
- Categories unique constraint is on (name, created_by) combination, not just name
- Favorites prevents duplicate bookmarks with (user_id, category_id) compound index
- Search API only returns public categories (is_public = true)
- Upload permission: all authenticated users can upload, not just admins

## Firebase Migration

This project was migrated from JSON file-based database to Firebase/Firestore on 2025-10-16. See:
- `FIREBASE_SETUP.md` - Firebase project setup guide
- `FIREBASE_MIGRATION.md` - Detailed migration report
- `backup_old_database/` - Archived JSON database code (for reference only)
