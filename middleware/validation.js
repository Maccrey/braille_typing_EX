// Input validation middleware

const validateSignup = (req, res, next) => {
  const { username, password } = req.body;

  const errors = [];

  // Username validation
  if (!username) {
    errors.push('사용자명은 필수입니다.');
  } else if (typeof username !== 'string') {
    errors.push('사용자명은 문자열이어야 합니다.');
  } else if (username.trim().length < 3) {
    errors.push('사용자명은 3글자 이상이어야 합니다.');
  } else if (username.trim().length > 50) {
    errors.push('사용자명은 50글자 이하여야 합니다.');
  } else if (!/^[a-zA-Z0-9가-힣_-]+$/.test(username.trim())) {
    errors.push('사용자명은 한글, 영문, 숫자, _, - 만 사용할 수 있습니다.');
  }

  // Password validation
  if (!password) {
    errors.push('비밀번호는 필수입니다.');
  } else if (typeof password !== 'string') {
    errors.push('비밀번호는 문자열이어야 합니다.');
  } else if (password.length < 6) {
    errors.push('비밀번호는 6글자 이상이어야 합니다.');
  } else if (password.length > 100) {
    errors.push('비밀번호는 100글자 이하여야 합니다.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: '입력 데이터가 유효하지 않습니다.',
      details: errors
    });
  }

  // Sanitize inputs
  req.body.username = username.trim();
  next();
};

const validateLogin = (req, res, next) => {
  const { username, password } = req.body;

  const errors = [];

  if (!username) {
    errors.push('사용자명을 입력해주세요.');
  }

  if (!password) {
    errors.push('비밀번호를 입력해주세요.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: '로그인 정보를 확인해주세요.',
      details: errors
    });
  }

  next();
};

const validateCategoryUpload = (req, res, next) => {
  const { categoryName, description } = req.body;

  const errors = [];

  // Category name validation
  if (!categoryName) {
    errors.push('카테고리 이름은 필수입니다.');
  } else if (typeof categoryName !== 'string') {
    errors.push('카테고리 이름은 문자열이어야 합니다.');
  } else if (categoryName.trim().length < 1) {
    errors.push('카테고리 이름을 입력해주세요.');
  } else if (categoryName.trim().length > 100) {
    errors.push('카테고리 이름은 100글자 이하여야 합니다.');
  }

  // Description validation (optional)
  if (description && typeof description !== 'string') {
    errors.push('설명은 문자열이어야 합니다.');
  } else if (description && description.trim().length > 500) {
    errors.push('설명은 500글자 이하여야 합니다.');
  }

  // File validation
  if (!req.file) {
    errors.push('업로드할 파일을 선택해주세요.');
  } else {
    const allowedMimeTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      errors.push('Excel 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.');
    }

    if (req.file.size > 10 * 1024 * 1024) { // 10MB limit
      errors.push('파일 크기는 10MB 이하여야 합니다.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: '업로드 데이터가 유효하지 않습니다.',
      details: errors
    });
  }

  // Sanitize inputs
  req.body.categoryName = categoryName.trim();
  if (description) {
    req.body.description = description.trim();
  }

  next();
};

const validatePracticeLog = (req, res, next) => {
  const { duration_seconds } = req.body;

  const errors = [];

  if (duration_seconds === undefined || duration_seconds === null) {
    errors.push('연습 시간은 필수입니다.');
  } else if (!Number.isInteger(duration_seconds)) {
    errors.push('연습 시간은 정수여야 합니다.');
  } else if (duration_seconds < 0) {
    errors.push('연습 시간은 0 이상이어야 합니다.');
  } else if (duration_seconds > 24 * 60 * 60) { // 24 hours max
    errors.push('연습 시간은 24시간을 초과할 수 없습니다.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: '연습 기록 데이터가 유효하지 않습니다.',
      details: errors
    });
  }

  next();
};

const validateFavorite = (req, res, next) => {
  const { category_id } = req.body || req.params;

  const errors = [];

  if (!category_id) {
    errors.push('카테고리 ID는 필수입니다.');
  } else if (!Number.isInteger(parseInt(category_id))) {
    errors.push('카테고리 ID는 정수여야 합니다.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: '즐겨찾기 데이터가 유효하지 않습니다.',
      details: errors
    });
  }

  next();
};

module.exports = {
  validateSignup,
  validateLogin,
  validateCategoryUpload,
  validatePracticeLog,
  validateFavorite
};