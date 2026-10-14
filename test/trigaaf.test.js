// สคริปต์ทดสอบ parse/generate ของ Trig AAF — รันด้วย: node test/trigaaf.test.js
const { ta_parse, ta_generate } = require('../js/trigaaf.js');

// ───────────────────────────────────────────────
// ข้อมูลทดสอบ 3 package (1008 = ใช้ได้, 1005 + 1009 = ต้องถูกข้าม)
// จัดรูปแบบตามสเปก: ขึ้น package ใหม่ด้วย "<เบอร์>;Text:AmfCounterDetail=",
// บรรทัดต่อขึ้นต้นด้วย ";;;;" และ record จบด้วย ";OK."
// ───────────────────────────────────────────────
const INPUT = [
  '8881513754;Text:AmfCounterDetail=1008;NGB_PLAY ASIAN 99Baht 12Months;1;0;0;0;2026-08-21T21:28:50.0700000+07:00;0;2027-08-21T00:00:00.0000000+07:00;0;0',
  ';;;;Text:ChildCounterEntry=1;0;0;0;ngvdo;0;0;0;0;3009100018,3020710036',
  ';;;;Text:ChildCounterEntry=2;0;0;0;partnerstb;0;0;0;0;3009100018,3020710036;OK.',
  '8881513754;Text:AmfCounterDetail=1005;NGB_PLAY PREMIUM 199Baht 12Months;1;0;0;0;2026-08-21T21:28:50.0700000+07:00;0;2027-08-21T00:00:00.0000000+07:00;0;0',
  ';;;;Text:ChildCounterEntry=1;0;0;0;partnerstb;0;0;0;0;5002800016;OK.',
  '8881513754;Text:AmfCounterDetail=1009;NGB_PLAY MONOMAX 59Baht 12Months;1;0;0;0;2026-08-21T21:28:50.0700000+07:00;0;2027-08-21T00:00:00.0000000+07:00;0;0',
  ';;;;Text:ChildCounterEntry=1;0;0;0;ngvdo;0;0;0;0;3003710081',
  ';;;;Text:ChildCounterEntry=2;0;0;0;partnerstb;0;0;0;0;3003710081;OK.'
].join('\n');

const EXPECT_IQIYI =
  'curl -X POST http://10.198.99.82:8001/api/v1/aaf/pushNotificationInfo.json -d \'{"commandId": "AISPLAY_By_NOC_20260923_000001","eventType":"activate","subscriptionId":"3|8881513754","publicId":"","packageNo":"1008","packageName":"NGB_PLAY ASIAN 99Baht 12Months","packageStartTime":"20260821212850","packageExpiryTime":"20270821000000","listOfServiceId":[{"serviceId":""}],"listOfApp":[{"groupId": "1","serviceId":"67","counterType":"partnerstb","listOfAppId":[{"appId":"3009100018"}]}]}\'';

const EXPECT_WETV =
  'curl -X POST http://10.198.99.82:8001/api/v1/aaf/pushNotificationInfo.json -d \'{"commandId": "AISPLAY_By_NOC_20260923_000002","eventType":"reactive","subscriptionId":"3|8881513754","publicId":"","packageNo":"1008","packageName":"NGB_PLAY ASIAN 99Baht 12Months","packageStartTime":"20260821212850","packageExpiryTime":"20270821000000","listOfServiceId":[{"serviceId":""}],"listOfApp":[{"groupId": "1","serviceId":"67","counterType":"partnerstb","listOfAppId":[{"appId":"3020710036"}]}]}\'';

let failed = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) {
    failed++;
    console.log(`✗ ${label}`);
    console.log(`  expected: ${JSON.stringify(expected)}`);
    console.log(`  actual  : ${JSON.stringify(actual)}`);
  } else {
    console.log(`✓ ${label}`);
  }
}

// ── parse ──────────────────────────────────────
const pkgs = ta_parse(INPUT);
check('อ่าน package ได้ 3 รายการ', pkgs.length, 3);
check('package[0].msisdn', pkgs[0].msisdn, '8881513754');
check('package[0].packageNo', pkgs[0].packageNo, '1008');
check('package[0].packageName', pkgs[0].packageName, 'NGB_PLAY ASIAN 99Baht 12Months');
check('package[0].start', pkgs[0].start, '20260821212850');
check('package[0].expiry', pkgs[0].expiry, '20270821000000');
check('package[0] มี 2 child', pkgs[0].children.length, 2);
check('package[0].child[0].counterType', pkgs[0].children[0].counterType, 'ngvdo');
check('package[0].child[1].counterType', pkgs[0].children[1].counterType, 'partnerstb');
check('package[0].child[1].appIds', pkgs[0].children[1].appIds.join('|'), '3009100018|3020710036');
check('package[1].packageNo', pkgs[1].packageNo, '1005');
check('package[2].packageNo', pkgs[2].packageNo, '1009');

// ── generate (วันที่ 20260923, เลขเริ่ม 1) ───────
const res = ta_generate(INPUT, 1, '20260923');
check('กล่อง iQIYI มี 1 คำสั่ง', res.iqiyi.length, 1);
check('กล่อง WETV มี 1 คำสั่ง', res.wetv.length, 1);
check('คำสั่ง Trig AAF iQIYI ตรงทุกตัวอักษร', res.iqiyi[0], EXPECT_IQIYI);
check('คำสั่ง Trig AAF WETV ตรงทุกตัวอักษร', res.wetv[0], EXPECT_WETV);

// ── ส่วนสรุป: appId ที่ถูกข้าม ────────────────────
check('ข้าม appId 2 ตัว', res.skipped.length, 2);
check('ข้าม 5002800016 (package 1005)',
  `${res.skipped[0].packageNo}/${res.skipped[0].appId}/${res.skipped[0].wSubTtType}`, '1005/5002800016/50028');
check('ข้าม 3003710081 (package 1009)',
  `${res.skipped[1].packageNo}/${res.skipped[1].appId}/${res.skipped[1].wSubTtType}`, '1009/3003710081/30037');

// ── กรณีไม่พบข้อมูล ────────────────────────────
const empty = ta_generate('', 1, '20260923');
check('ข้อมูลว่าง → ไม่มี package', empty.packages.length, 0);
check('ข้อมูลว่าง → WETV ว่าง', empty.wetv.length, 0);
check('ข้อมูลว่าง → iQIYI ว่าง', empty.iqiyi.length, 0);

// ── เลขลำดับเริ่มต้นอื่น ─────────────────────────
const res50 = ta_generate(INPUT, 50, '20260923');
check('เลขเริ่ม 50 → iQIYI ได้ 000050', res50.iqiyi[0].includes('AISPLAY_By_NOC_20260923_000050'), true);
check('เลขเริ่ม 50 → WETV ได้ 000051', res50.wetv[0].includes('AISPLAY_By_NOC_20260923_000051'), true);

console.log(failed === 0 ? '\nผ่านทั้งหมด ✅' : `\nไม่ผ่าน ${failed} ข้อ ❌`);
process.exit(failed === 0 ? 0 : 1);
