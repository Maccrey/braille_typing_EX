// Global error handling middleware for Express

const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);

  // Default error response
  let statusCode = 500;
  let message = '서버 내부 오류가 발생했습니다.';
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '입력 데이터가 유효하지 않습니다.';
    details = err.message;
  } else if (err.name === 'UnauthorizedError' || err.message.includes('jwt')) {
    statusCode = 401;
    message = '인증이 필요합니다.';
  } else if (err.message.includes('already exists')) {
    statusCode = 400;
    message = '이미 존재하는 데이터입니다.';
  } else if (err.message.includes('not found')) {
    statusCode = 404;
    message = '요청하신 데이터를 찾을 수 없습니다.';
  } else if (err.message.includes('permission') || err.message.includes('access')) {
    statusCode = 403;
    message = '접근 권한이 없습니다.';
  } else if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Send standardized error response
  res.status(statusCode).json({
    success: false,
    error: message,
    details: process.env.NODE_ENV === 'development' ? details : null,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
};

module.exports = errorHandler;