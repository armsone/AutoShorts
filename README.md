# 자동쇼츠 (AutoShorts)

YouTube Shorts 전용으로 쇼츠 영상을 자동으로 넘겨주는 Chrome/웨일 확장입니다.

![자동쇼츠 아이콘](icons/icon-512.png)

## 기능

- YouTube Shorts 페이지(`/shorts/*`)에서 현재 영상이 끝나면 다음 쇼츠로 이동
- 확장 아이콘을 눌러 자동 넘김 `켜기/끄기` 가능
- 설정은 브라우저 로컬 저장소(`chrome.storage.local`)에 저장
- 설치 직후 자동 넘김이 켜진 상태로 시작
- YouTube 안에서 Shorts로 이동해도 계속 동작

## 설치 (압축해제된 확장)

1. [GitHub Releases](https://github.com/armsone/AutoShorts/releases)에서 `AutoShorts-0.1.3.zip` 내려받기
2. ZIP 파일 압축 풀기
3. Chrome은 `chrome://extensions`, 네이버 웨일은 `whale://extensions` 열기
4. 우측 상단의 `개발자 모드`를 켜기
5. `압축해제된 확장 프로그램을 로드` 또는 `압축해제된 확장 앱 설치` 클릭
6. 압축을 푼 `AutoShorts` 폴더 선택
7. `https://www.youtube.com/shorts/`를 열거나 새로고침해 동작 확인

## 사용법

- 확장 아이콘 클릭 → `자동쇼츠` 팝업의 버튼으로 토글
- 일반 YouTube 영상 페이지에는 동작하지 않으며 Shorts 페이지에서만 동작

## 주의

- 입력창이 포커스된 상태에서는 자동 이동을 하지 않습니다.
- 개인정보 수집/전송 기능은 없습니다.

## 개인정보

- 자동 넘김 설정만 현재 브라우저의 로컬 저장소에 보관합니다.
- 방문 기록, 시청 기록, 계정 정보와 영상 정보를 수집하거나 외부로 전송하지 않습니다.
