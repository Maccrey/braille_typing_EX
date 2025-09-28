# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - heading "회원가입" [level=1] [ref=e4]
    - paragraph [ref=e5]: 점자 타자 연습기 계정을 만들어보세요
  - generic [ref=e6]:
    - generic [ref=e7]: 네트워크 오류가 발생했습니다. 다시 시도해주세요.
    - generic [ref=e8]:
      - generic [ref=e9]: 사용자명
      - textbox "사용자명" [ref=e10]: testuser_1759017418139_ih5l4
    - generic [ref=e11]:
      - generic [ref=e12]: 비밀번호
      - textbox "비밀번호" [ref=e13]: password123
      - generic [ref=e14]: 보통
    - generic [ref=e15]:
      - generic [ref=e16]: 비밀번호 확인
      - textbox "비밀번호 확인" [ref=e17]: password123
    - button "회원가입" [ref=e18] [cursor=pointer]
  - paragraph [ref=e20]:
    - text: 이미 계정이 있으신가요?
    - link "로그인" [ref=e21] [cursor=pointer]:
      - /url: login.html
```