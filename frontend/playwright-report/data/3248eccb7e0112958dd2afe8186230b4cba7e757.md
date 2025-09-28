# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - heading "회원가입" [level=1] [ref=e4]
    - paragraph [ref=e5]: 점자 타자 연습기 계정을 만들어보세요
  - generic [ref=e6]:
    - generic [ref=e7]: 비밀번호가 일치하지 않습니다.
    - generic [ref=e8]:
      - generic [ref=e9]: 사용자명
      - textbox "사용자명" [ref=e10]: debuguser_1759025369467
    - generic [ref=e11]:
      - generic [ref=e12]: 비밀번호
      - generic [ref=e13]:
        - textbox "비밀번호" [ref=e14]: password123
        - button "👁️" [ref=e15] [cursor=pointer]
      - generic [ref=e16]: 보통
    - generic [ref=e17]:
      - generic [ref=e18]: 비밀번호 확인
      - generic [ref=e19]:
        - textbox "비밀번호 확인" [ref=e20]
        - button "👁️" [ref=e21] [cursor=pointer]
    - button "회원가입" [active] [ref=e22] [cursor=pointer]
  - paragraph [ref=e24]:
    - text: 이미 계정이 있으신가요?
    - link "로그인" [ref=e25] [cursor=pointer]:
      - /url: login.html
```