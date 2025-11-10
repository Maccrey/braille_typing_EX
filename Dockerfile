# Node.js 18 Alpine 기반 이미지 사용
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY backend/package*.json ./

# 프로덕션 의존성만 설치
RUN npm ci --only=production

# 애플리케이션 코드 복사
COPY backend/ ./

# 포트 노출
EXPOSE 8080

# 헬스체크 설정 (CloudType이 자동으로 사용)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 환경 변수 기본값
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# 애플리케이션 시작
CMD ["npm", "start"]
