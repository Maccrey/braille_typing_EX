# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - heading "로그인" [level=1] [ref=e4]
    - paragraph [ref=e5]: 점자 타자 연습기에 오신 것을 환영합니다
  - generic [ref=e6]:
    - generic [ref=e7]: 네트워크 오류가 발생했습니다. 다시 시도해주세요.
    - generic [ref=e8]:
      - generic [ref=e9]: 사용자명
      - textbox "사용자명" [ref=e10]: nonexistent
    - generic [ref=e11]:
      - generic [ref=e12]: 비밀번호
      - generic [ref=e13]:
        - textbox "비밀번호" [ref=e14]: wrongpassword
        - button "👁️" [ref=e15] [cursor=pointer]
    - button "로그인" [ref=e16] [cursor=pointer]
  - paragraph [ref=e18]:
    - text: 아직 계정이 없으신가요?
    - link "회원가입" [ref=e19] [cursor=pointer]:
      - /url: signup.html
```