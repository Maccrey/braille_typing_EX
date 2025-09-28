# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - heading "로그인" [level=1] [ref=e4]
    - paragraph [ref=e5]: 점자 타자 연습기에 오신 것을 환영합니다
  - generic [ref=e6]:
    - generic [ref=e7]:
      - generic [ref=e8]: 사용자명
      - textbox "사용자명" [ref=e9]: testuser
    - generic [ref=e10]:
      - generic [ref=e11]: 비밀번호
      - generic [ref=e12]:
        - textbox "비밀번호" [active] [ref=e13]: testpass123
        - button "👁️" [ref=e14] [cursor=pointer]
    - button "로그인" [ref=e15] [cursor=pointer]
  - paragraph [ref=e17]:
    - text: 아직 계정이 없으신가요?
    - link "회원가입" [ref=e18] [cursor=pointer]:
      - /url: signup.html
```