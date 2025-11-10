#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const { promises: fsp } = fs;

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'frontend');
const TARGET_DIR = path.join(ROOT, 'docs');
const FIREBASE_RELATIVE_PATH = path.join('js', 'firebase-config.js');
const ENV_CANDIDATES = ['.env.firebase', '.env'];

const FIREBASE_ENV_MAP = [
  { env: 'FIREBASE_API_KEY', key: 'apiKey', required: true },
  { env: 'FIREBASE_AUTH_DOMAIN', key: 'authDomain', required: true },
  { env: 'FIREBASE_PROJECT_ID', key: 'projectId', required: true },
  { env: 'FIREBASE_STORAGE_BUCKET', key: 'storageBucket', required: true },
  { env: 'FIREBASE_MESSAGING_SENDER_ID', key: 'messagingSenderId', required: true },
  { env: 'FIREBASE_APP_ID', key: 'appId', required: true },
  { env: 'FIREBASE_MEASUREMENT_ID', key: 'measurementId', required: false },
  { env: 'FIREBASE_DATABASE_URL', key: 'databaseURL', required: false }
];

const EXCLUDED_ROOT_DIRS = new Set([
  'node_modules',
  'logs',
  'tests',
  'playwright-report',
  'test-results',
  '.github'
]);

const EXCLUDED_FILES = new Set([
  'package.json',
  'package-lock.json',
  'playwright.config.js',
  'database.db'
]);

function normalize(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function shouldCopy(src) {
  const relative = path.relative(SOURCE_DIR, src);
  if (!relative || relative.startsWith('..')) {
    return true;
  }

  const normalized = normalize(relative);
  const [topLevel] = normalized.split('/');

  if (EXCLUDED_ROOT_DIRS.has(topLevel)) {
    return false;
  }

  if (EXCLUDED_FILES.has(normalized)) {
    return false;
  }

  if (normalized === normalize(FIREBASE_RELATIVE_PATH)) {
    return false;
  }

  return true;
}

async function pathExists(target) {
  try {
    await fsp.access(target, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

async function readExistingFirebaseConfig() {
  const existingPath = path.join(TARGET_DIR, FIREBASE_RELATIVE_PATH);
  if (await pathExists(existingPath)) {
    return fsp.readFile(existingPath, 'utf8');
  }
  return null;
}

async function writeFirebaseConfig(contents) {
  const targetPath = path.join(TARGET_DIR, FIREBASE_RELATIVE_PATH);
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  await fsp.writeFile(targetPath, contents, 'utf8');
}

async function ensurePlaceholderFirebaseConfig() {
  const placeholder = `// Firebase 구성 파일이 필요합니다.\n// docs/js/firebase-config.js 파일에 실제 firebaseConfig 객체를 채워주세요.\nwindow.addEventListener('load', () => {\n  console.error('firebase-config.js placeholder가 로드되었습니다. 실제 Firebase 설정을 추가하세요.');\n});\n`;
  await writeFirebaseConfig(placeholder);
}

function parseEnv(raw) {
  const result = {};
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      return;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  });
  return result;
}

async function loadFirebaseEnv() {
  for (const filename of ENV_CANDIDATES) {
    const fullPath = path.join(ROOT, filename);
    if (await pathExists(fullPath)) {
      const contents = await fsp.readFile(fullPath, 'utf8');
      return { path: fullPath, values: parseEnv(contents) };
    }
  }
  return null;
}

function buildFirebaseConfigSource(envValues) {
  if (!envValues) {
    return { success: false, reason: 'ENV_FILE_MISSING' };
  }

  const configEntries = [];
  const missingKeys = [];

  FIREBASE_ENV_MAP.forEach(({ env, key, required }) => {
    const value = envValues[env];
    if (!value && required) {
      missingKeys.push(env);
    }
    if (value) {
      configEntries.push(`  ${key}: ${JSON.stringify(value)}`);
    }
  });

  if (missingKeys.length > 0) {
    return { success: false, reason: 'ENV_VALUES_MISSING', details: missingKeys };
  }

  const configObject = `const firebaseConfig = {\n${configEntries.join(',\n')}\n};`;

  const moduleSource = `${configObject}\n\nfirebase.initializeApp(firebaseConfig);\n\nconst auth = firebase.auth();\nconst db = firebase.firestore();\nconst storage = firebase.storage();\n`;

  return { success: true, contents: moduleSource };
}

async function main() {
  console.log('📦 Building docs folder from frontend sources...');

  const envSource = await loadFirebaseEnv();
  if (envSource) {
    console.log(`🔐 Firebase 환경 변수 파일 로드: ${path.relative(ROOT, envSource.path)}`);
  } else {
    console.log('⚠️ firebase-config.js 생성을 위한 .env 파일을 찾지 못했습니다.');
  }
  const preservedFirebaseConfig = envSource ? null : await readExistingFirebaseConfig();

  await fsp.rm(TARGET_DIR, { recursive: true, force: true });
  await fsp.mkdir(TARGET_DIR, { recursive: true });

  await fsp.cp(SOURCE_DIR, TARGET_DIR, {
    recursive: true,
    filter: shouldCopy
  });

  await fsp.writeFile(path.join(TARGET_DIR, '.nojekyll'), '');

  if (preservedFirebaseConfig) {
    await writeFirebaseConfig(preservedFirebaseConfig);
  } else {
    const configFromEnv = buildFirebaseConfigSource(envSource && envSource.values);
    if (configFromEnv.success) {
      await writeFirebaseConfig(configFromEnv.contents);
      console.log('🔑 .env 값으로 firebase-config.js를 생성했습니다.');
    } else {
      if (configFromEnv.reason === 'ENV_VALUES_MISSING') {
        console.warn('⚠️ 다음 Firebase 환경 변수가 누락되었습니다:', configFromEnv.details.join(', '));
      }
      await ensurePlaceholderFirebaseConfig();
      console.warn('firebase-config.js placeholder가 유지되었습니다. 환경 변수를 채워주세요.');
    }
  }

  console.log('✅ docs 폴더가 GitHub Pages 배포용으로 준비되었습니다.');
}

main().catch(error => {
  console.error('❌ docs 빌드 중 오류가 발생했습니다.');
  console.error(error);
  process.exit(1);
});
