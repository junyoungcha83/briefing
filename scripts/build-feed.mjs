// 호환 shim — 실제 로직은 tools/build-feed.mjs 로 이동했다.
// 기존 명령 `node scripts/build-feed.mjs <today.json>` 을 그대로 유지하기 위한 얇은 래퍼.
// (import 대상 모듈이 import.meta.url 로 ROOT 를 계산하므로 출력 경로 data/feed.json·data/archive/ 는 불변)
import '../tools/build-feed.mjs';
