// ═══════════════════════════════════════════════
//  EMAIL TOOL JS
// ═══════════════════════════════════════════════

  /* ── Tabs ── */
  function switchTab(tabId, btn) {
    // Scoped to #emailToolPage to avoid affecting shift app elements
    const page = document.getElementById('emailToolPage');
    if (page) {
      page.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      page.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    }
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
  }

  /* ── Validation ── */
  function validate() {
    const iId = document.getElementById('internetId');
    const pId = document.getElementById('privateId');
    const iErr = document.getElementById('internetIdError');
    const pErr = document.getElementById('privateIdError');
    let ok = true;

    if (!iId.value.trim()) {
      iId.classList.add('error');
      iErr.classList.add('visible');
      ok = false;
    } else {
      iId.classList.remove('error');
      iErr.classList.remove('visible');
    }

    if (!pId.value.trim()) {
      pId.classList.add('error');
      pErr.classList.add('visible');
      ok = false;
    } else {
      pId.classList.remove('error');
      pErr.classList.remove('visible');
    }
    return ok;
  }

  /* ── Live validation clear ── */
  ['internetId','privateId'].forEach(id => {
    document.getElementById(id).addEventListener('input', function() {
      if (this.value.trim()) {
        this.classList.remove('error');
        document.getElementById(id + 'Error').classList.remove('visible');
      }
    });
  });

  /* ── Generate Mail ── */
  function generateMail() {
    if (!validate()) return;
    const internetId = document.getElementById('internetId').value.trim();
    const privateId  = document.getElementById('privateId').value.trim();
    const body = `Dear WBD Customer Support,\n\nOur customer is having trouble logging in because he forgot the email associated with the ID.\nCould you please provide us with the email that the customer is associated with the ID.\n\nInternet id : ${internetId}\nPrivate ID  : ${privateId}`;
    const preview = `To: "cx.partnersupport@wbd.com" <cx.partnersupport@wbd.com>; "*cspartners" <cspartners@wbd.com>\nCC: vas_fbbtc@ais.co.th; hv_fbbtc@ais.co.th; helpdesk3bb@ais.co.th\nSubject: Could you please provide us with the email that the customer is associated with the ID - Internet ID: ${internetId}\n\n${body}`;
    document.getElementById('emailPreview').value = preview;
  }

  /* ── Send Mail ── */
  function sendMail() {
    if (!validate()) return;
    const internetId = document.getElementById('internetId').value.trim();
    const privateId  = document.getElementById('privateId').value.trim();
    const subject = encodeURIComponent(`Could you please provide us with the email that the customer is associated with the ID - Internet ID: ${internetId}`);
    const body = encodeURIComponent(`Dear WBD Customer Support,\r\n\r\nOur customer is having trouble logging in because he forgot the email associated with the ID.\r\nCould you please provide us with the email that the customer is associated with the ID.\r\n\r\nInternet id : ${internetId}\r\nPrivate ID  : ${privateId}`);
    const a = document.createElement('a');
    a.href = `mailto:cx.partnersupport@wbd.com;cspartners@wbd.com?cc=vas_fbbtc@ais.co.th;hv_fbbtc@ais.co.th;helpdesk3bb@ais.co.th&subject=${subject}&body=${body}`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /* ── Copy Preview ── */
  function copyPreview() {
    const txt = document.getElementById('emailPreview').value;
    if (!txt) return;
    navigator.clipboard.writeText(txt).then(() => {
      const toast = document.getElementById('copyToast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    });
  }

  /* ── Modal ── */
  function confirmClear() {
    document.getElementById('clearModal').classList.add('open');
  }
  function closeModal() {
    document.getElementById('clearModal').classList.remove('open');
  }
  function clearFields() {
    document.getElementById('internetId').value = '';
    document.getElementById('privateId').value  = '';
    document.getElementById('emailPreview').value = '';
    ['internetId','privateId'].forEach(id => {
      document.getElementById(id).classList.remove('error');
      document.getElementById(id + 'Error').classList.remove('visible');
    });
    closeModal();
  }

  /* ══════════════════════════════════════════
     3BB DDNS (รวม)
  ══════════════════════════════════════════ */
  function onDdnsIssueChange() {
    const isCancel = document.getElementById('ddnsIssueType').value === 'cancel';
    document.getElementById('ddnsDomainWrap').style.display = isCancel ? 'block' : 'none';
    document.getElementById('ddnsPortWrap').style.display   = isCancel ? 'block' : 'none';
    document.getElementById('ddnsPhoneWrap').style.display  = isCancel ? 'none'  : 'block';
    document.getElementById('ddnsEmailPreview').value = '';
  }

  const ddnsSharedFields = ['ddnsTicket','ddnsAccountNo','ddnsTenant','ddnsUsername'];

  function validateDdns() {
    let ok = true;
    const isCancel = document.getElementById('ddnsIssueType').value === 'cancel';
    const fields = isCancel
      ? [...ddnsSharedFields, 'ddnsDomain', 'ddnsPort']
      : [...ddnsSharedFields, 'ddnsPhone'];
    fields.forEach(id => {
      const el  = document.getElementById(id);
      const err = document.getElementById(id + 'Error');
      if (!el.value.trim()) {
        el.classList.add('error'); err.classList.add('visible'); ok = false;
      } else {
        el.classList.remove('error'); err.classList.remove('visible');
      }
    });
    return ok;
  }
  [...ddnsSharedFields, 'ddnsDomain','ddnsPort','ddnsPhone'].forEach(id => {
    document.getElementById(id).addEventListener('input', function() {
      if (this.value.trim()) {
        this.classList.remove('error');
        document.getElementById(id + 'Error').classList.remove('visible');
      }
    });
  });

  function buildDdnsData() {
    const isCancel  = document.getElementById('ddnsIssueType').value === 'cancel';
    const ticket    = document.getElementById('ddnsTicket').value.trim();
    const accountNo = document.getElementById('ddnsAccountNo').value.trim();
    const tenant    = document.getElementById('ddnsTenant').value.trim();
    const username  = document.getElementById('ddnsUsername').value.trim();

    let subject, body;
    if (isCancel) {
      const domain = document.getElementById('ddnsDomain').value.trim();
      const port   = document.getElementById('ddnsPort').value.trim();
      subject = `ลูกค้าแจ้งขอยกเลิก 3BB DDNS Ticket No. ${ticket}`;
      body =
`เรียน ทีม Server & Vas
ลูกค้าแจ้งขอยกเลิก 3BB DDNS ข้อมูลลูกค้าตามรายละเอียดด้านล่าง รบกวนช่วยดำเนินการด้วย${polite}

      ชื่อผู้เช่า  : ${tenant}
      Account No   : ${accountNo}
      Username     : ${username}
      Domain       : ${domain}
      Port Default : ${port}`;
    } else {
      const phone = document.getElementById('ddnsPhone').value.trim();
      subject = `[3BBDDNS] ลูกค้าแจ้งไม่สามารถสมัครใช้งาน 3BB DDNS ได้ Ticket No. ${ticket}`;
      body =
`เรียน ทีม Server & Vas
ลูกค้าแจ้งไม่สามารถสมัครใช้งาน 3BB DDNS ได้พบ error "หมายเลขโทรศัพท์ติดต่อที่ให้ไว้กับ 3BB เบอร์โทรศัพท์มือถือไม่ตรงกับที่ลงทะเบียนไว้" ตามภาพที่แนบ ข้อมูลลูกค้าตามรายละเอียดด้านล่าง รบกวนช่วยดำเนินการด้วย${polite}

      ชื่อผู้เช่า  : ${tenant}
      Account No   : ${accountNo}
      Username     : ${username}
      เบอร์ในระบบ  : ${phone}`;
    }
    return { subject, body };
  }

  function generateDdnsMail() {
    if (!validateDdns()) return;
    const { subject, body } = buildDdnsData();
    document.getElementById('ddnsEmailPreview').value =
`To: ISSERVER 3BB <isserver3bb@ais.co.th>
Cc: NOC Helpdesk 3BB <helpdesk3bb@ais.co.th>
Subject: ${subject}

${body}`;
  }

  function sendDdnsMail() {
    if (!validateDdns()) return;
    const { subject, body } = buildDdnsData();
    const a = document.createElement('a');
    a.href = `mailto:isserver3bb@ais.co.th?cc=helpdesk3bb@ais.co.th&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g,"\r\n"))}`;
    a.target = '_blank'; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function copyDdnsPreview() {
    const txt = document.getElementById('ddnsEmailPreview').value;
    if (!txt) return;
    navigator.clipboard.writeText(txt).then(() => {
      const toast = document.getElementById('ddnsCopyToast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    });
  }

  function confirmClearDdns() { document.getElementById('clearDdnsModal').classList.add('open'); }
  function closeDdnsModal()   { document.getElementById('clearDdnsModal').classList.remove('open'); }
  function clearDdnsFields() {
    ['ddnsTicket','ddnsAccountNo','ddnsTenant','ddnsUsername','ddnsDomain','ddnsPort','ddnsPhone','ddnsEmailPreview']
      .forEach(id => { document.getElementById(id).value = ''; });
    ['ddnsTicket','ddnsAccountNo','ddnsTenant','ddnsUsername','ddnsDomain','ddnsPort','ddnsPhone']
      .forEach(id => {
        document.getElementById(id).classList.remove('error');
        document.getElementById(id + 'Error').classList.remove('visible');
      });
    document.getElementById('ddnsIssueType').value = 'cancel';
    onDdnsIssueChange();
    closeDdnsModal();
  }
  document.getElementById('clearDdnsModal').addEventListener('click', function(e) {
    if (e.target === this) closeDdnsModal();
  });

  /* ══════════════════════════════════════════
     ประสาน VDO Support — Template Engine
  ══════════════════════════════════════════ */

  let polite = 'ครับ'; // declared here so VDO_TEMPLATES closures can access it

  const VDO_TEMPLATES = {
    'MAX': [
      {
        label: 'รับสิทธิ์ไม่ได้ — หมายเลขไม่มีแพ็คเกจ HBO MAX',
        subject: (id) => `[MAX] - ลูกค้ารับสิทธิ์ไม่ได้ - Internet ID: ${id}`,
        body: (id, pkg, note) =>
`เรียน ทีม VDO Support,
        รบกวนตรวจสอบลูกค้า Internet ID: ${id} ใช้งานแพ็คเกจ ${pkg}
        พบปัญหาไม่สามารถกดรับสิทธิ์ HBO MAX ได้ พบ Error : หมายเลขของคุณไม่มีแพ็คเกจ HBO MAX${note ? '\n        ' + note : ''}
        รบกวนช่วยตรวจสอบด้วย${polite} ขอบคุณ${polite}`
      },
      {
        label: 'รับสิทธิ์ไม่ได้ — บัญชีผู้ให้บริการลงทะเบียนไปแล้ว',
        subject: (id) => `[MAX] - ประสานตรวจสอบลูกค้าไม่สามารถรับสิทธิ์ได้ - Internet ID: ${id}`,
        body: (id, pkg, note) =>
`เรียน ทีม VDO Support,
        รบกวนตรวจสอบลูกค้า Internet ID: ${id} ใช้งานแพ็คเกจ ${pkg}
        ตรวจสอบสถานะผ่าน Postman ขึ้น Pending ทั้งสองฝั่ง แต่ลูกค้าไม่สามารถรับสิทธิ์ใช้งานได้ ขึ้น Error "บัญชีผู้ให้บริการนี้มีการลงทะเบียนไปแล้ว"${note ? '\n        ' + note : ''}
        รบกวนช่วยตรวจสอบด้วย${polite} ขอบคุณ${polite}`
      },
      {
        label: 'Status TERMINATED ทั้งสองฝั่ง + Casanova ไม่มี Package',
        subject: (id) => `[MAX] - ลูกค้ารับสิทธิ์ไม่ได้ - Internet ID: ${id}`,
        body: (id, pkg, note) =>
`เรียน ทีม VDO Support,
        ขอความอนุเคราะห์ตรวจสอบและแก้ไขปัญหาลูกค้า ${id}
        ตรวจสอบพบ Status AIS : TERMINATED และ MAX : TERMINATED
        ตรวจสอบลูกค้ามี Package HBO MAX แต่ที่ Casanova ไม่มี Package${note ? '\n        ' + note : ''}
        รบกวนตรวจสอบเพิ่มเติมให้ด้วย${polite}`
      },
      {
        label: 'AIS Terminated / MAX ACTIVE — ประสาน Unbind แล้วแต่ยังเป็น Status เดิม',
        subject: (id) => `[MAX] - ประสาน Unbind แต่ยังขึ้น Status MAX: ACTIVE และ AIS: Terminated - Internet ID: ${id}`,
        body: (id, pkg, note) =>
`เรียน ทีม VDO Support,
        ขอความอนุเคราะห์ตรวจสอบและแก้ไขปัญหาลูกค้า ${id}
        ตรวจสอบพบ Status AIS : Terminated และ MAX : ACTIVE
        ก่อนหน้านั้นได้ประสาน Unbind ไปแล้วแต่ก็ยังเป็น Status เดิม${note ? '\n        ' + note : ''}
        รบกวนช่วยตรวจสอบเพิ่มเติมให้ด้วย${polite}`
      }
    ],
    'iQIYI': [
      {
        label: 'Subscriber Not Found — รับสิทธิ์ไม่ได้',
        subject: (id) => `[iQIYI] - ลูกค้ารับสิทธิ์ไม่ได้ - Internet ID: ${id}`,
        body: (id, pkg, note) =>
`เรียน ทีม VDO Support,
        รบกวนตรวจสอบลูกค้า Internet ID: ${id} ใช้งานแพ็คเกจ ${pkg}
        พบปัญหาไม่สามารถกดรับสิทธิ์ iQIYI ได้ พบ Error : Subscriber Not Found
        ตรวจสอบ Casanova และ IM มี Package ปกติ${note ? '\n        ' + note : ''}
        รบกวนช่วยตรวจสอบด้วย${polite} ขอบคุณ${polite}`
      },
      {
        label: 'CMS Error — Account Unblind',
        subject: (id) => `[iQIYI] - ไม่สามารถ CMS iQIYI ได้ - Internet ID: ${id}`,
        body: (id, pkg, note) =>
`เรียน ทีม VDO Support,
        รบกวนตรวจสอบลูกค้า Internet ID: ${id}
        จะทำการ CMS iQIYI ให้ลูกค้ารับสิทธิ์ใหม่ แต่ไม่สามารถดำเนินการได้ ขึ้น Status Account Unblind${note ? '\n        ' + note : ''}
        รบกวนช่วยตรวจสอบด้วย${polite} ขอบคุณ${polite}`
      }
    ],
    'VIU': [
      {
        label: 'Data Not Found — Postman ขึ้น Code 2000',
        subject: (id) => `[Viu] - ประสานตรวจสอบไม่สามารถรับสิทธิ์ได้ - Internet ID: ${id}`,
        body: (id, pkg, note) =>
`เรียน VDO Support
        ลูกค้าใช้งาน ${pkg} ตรวจสอบสถานะผ่าน Postman ขึ้น Code 2000 และไม่มีข้อมูล
        ตรวจสอบที่ Casanova ลูกค้ามี Package ปกติ แต่เมื่อทำการกรอกข้อมูลในลิงก์รับสิทธิ์และกรอก OTP แล้ว ขึ้น Error "เกิดข้อผิดพลาดอื่นๆ"${note ? '\n        ' + note : ''}
        รบกวนช่วยตรวจสอบด้วย${polite} ขอบคุณ${polite}`
      }
    ],
    'Disney+': [
      {
        label: 'Subscription Not Found — Postman ไม่พบ Package',
        subject: (id) => `[Disney+] - ลูกค้าพบปัญหารับสิทธิ์ไม่ได้ - Internet ID: ${id}`,
        body: (id, pkg, note) =>
`เรียน VDO Support
        รบกวนตรวจสอบลูกค้า Internet ID: ${id} ใช้งานแพ็คเกจ ${pkg}
        ตรวจสอบพบมี Package ใน IM และ Casanova แต่ตรวจสอบใน Postman ไม่พบ Package ขึ้น Error code : "Subscription Not Found"
        พบปัญหาไม่สามารถกดรับสิทธิ์ Disney+ ได้${note ? '\n        ' + note : ''}
        รบกวนช่วยตรวจสอบด้วย${polite} ขอบคุณ${polite}`
      },
      {
        label: 'Package Cancelled — Postman ขึ้น Status Cancelled',
        subject: (id) => `[Disney+] - ประสานตรวจสอบ Package Disney+ - Internet ID: ${id}`,
        body: (id, pkg, note) =>
`เรียน ทีม VDO Support,
        รบกวนตรวจสอบลูกค้า Internet ID: ${id} ใช้งานแพ็คเกจ ${pkg}
        ตรวจสอบใน Postman ขึ้น Status : Cancelled
        ตรวจสอบใน IM และ Casanova พบมี Package ปกติ${note ? '\n        ' + note : ''}
        รบกวนช่วยตรวจสอบเพิ่มเติม${polite}`
      },
      {
        label: 'Repair Deleted Account — ช่าง 3BB ลบ Account ลูกค้า',
        subject: (id) => `[Disney+] - ประสานตรวจสอบแพ็คเกจ - Internet ID: ${id}`,
        body: (id, pkg, note) =>
`เรียน ทีม VDO Support,
        รบกวนตรวจสอบลูกค้า Internet ID: ${id} ใช้งานแพ็คเกจ ${pkg}
        ทางช่าง 3BB ทำการลบ Account ลูกค้า ทำให้ลูกค้าไม่สามารถใช้งาน Disney+ ได้
        รบกวนทาง VDO Support ช่วยแก้ไขเพื่อให้ลูกค้ารับสิทธิ์ใหม่ได้${polite}${note ? '\n        ' + note : ''}`
      }
    ],
    'MONOMAX': [
      {
        label: 'Package false — Postman ขึ้น Status false',
        subject: (id) => `[MONOMAX] - ลูกค้าพบปัญหาใช้งาน MONOMAX ไม่ได้ - Internet ID: ${id}`,
        body: (id, pkg, note) =>
`เรียน ทีม VDO Support,
        รบกวนตรวจสอบลูกค้า Internet ID: ${id} ใช้งานแพ็คเกจ ${pkg}
        ตรวจสอบพบ Package ใน Postman ขึ้น Status : false${note ? '\n        ' + note : ''}
        รบกวนช่วยตรวจสอบให้ลูกค้าด้วย${polite} ขอบคุณ${polite}`
      }
    ],
    'Netflix': [
      {
        label: 'Bundle Not Found — ResultCode 40402',
        subject: (id) => `[Netflix] - ประสานตรวจสอบไม่สามารถรับสิทธิ์ได้ - Internet ID: ${id}`,
        body: (id, pkg, note) =>
`เรียน VDO Support
        ลูกค้าใช้งาน ${pkg} ตรวจสอบสถานะผ่าน Casanova ขึ้นมี Package แล้ว
        แต่ฝั่ง Postman ขึ้น "ResultCode": "40402", "ErrorCode": "Bundle Not Found" ทำให้ลูกค้าลงทะเบียนรับสิทธิ์ไม่ได้${note ? '\n        ' + note : ''}
        รบกวนช่วยตรวจสอบด้วย${polite} ขอบคุณ${polite}`
      }
    ],
    'Prime': [
      {
        label: 'Bundle Not Found — Postman Error 404002',
        subject: (id) => `[Prime] - ประสานตรวจสอบไม่สามารถรับชมได้ - Internet ID: ${id}`,
        body: (id, pkg, note) =>
`เรียน VDO Support
        ลูกค้าใช้งาน Package ${pkg} แจ้งไม่สามารถใช้งาน Prime Video ได้
        ตรวจสอบผ่าน Postman พบ Error 404002 "Bundle Not Found"
        แต่ตรวจสอบผ่าน Casanova และ IM ลูกค้ามี Package ปกติ${note ? '\n        ' + note : ''}
        รบกวนตรวจสอบด้วย${polite} ขอบคุณ${polite}`
      }
    ]
  };

  /* ── Init error dropdown on page load ── */
  function onVdoServiceChange() {
    const service = document.getElementById('vdoService').value;
    // show/hide custom service input
    document.getElementById('vdoServiceOtherWrap').style.display =
      service === '__other__' ? 'block' : 'none';

    const errSel = document.getElementById('vdoErrorType');
    errSel.innerHTML = '';
    const templates = VDO_TEMPLATES[service] || [];
    templates.forEach((t, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = t.label;
      errSel.appendChild(opt);
    });
    // always add Other option
    const otherOpt = document.createElement('option');
    otherOpt.value = '__other__';
    otherOpt.textContent = 'Other (ระบุเอง)';
    errSel.appendChild(otherOpt);

    onVdoErrorTypeChange();
    document.getElementById('vdoEmailPreview').value = '';
  }
  function onVdoErrorTypeChange() {
    const isOther = document.getElementById('vdoErrorType').value === '__other__';
    document.getElementById('vdoErrorOtherWrap').style.display = isOther ? 'block' : 'none';
    document.getElementById('vdoEmailPreview').value = '';
  }
  onVdoServiceChange(); // init on load

  /* ── Validate ── */
  function validateVdo() {
    let ok = true;
    ['vdoInternetId','vdoPackage'].forEach(id => {
      const el  = document.getElementById(id);
      const err = document.getElementById(id + 'Error');
      if (!el.value.trim()) {
        el.classList.add('error'); err.classList.add('visible'); ok = false;
      } else {
        el.classList.remove('error'); err.classList.remove('visible');
      }
    });
    // validate custom service
    if (document.getElementById('vdoService').value === '__other__') {
      const el  = document.getElementById('vdoServiceOther');
      const err = document.getElementById('vdoServiceOtherError');
      if (!el.value.trim()) { el.classList.add('error'); err.classList.add('visible'); ok = false; }
      else { el.classList.remove('error'); err.classList.remove('visible'); }
    }
    // validate custom error
    if (document.getElementById('vdoErrorType').value === '__other__') {
      const el  = document.getElementById('vdoErrorOther');
      const err = document.getElementById('vdoErrorOtherError');
      if (!el.value.trim()) { el.classList.add('error'); err.classList.add('visible'); ok = false; }
      else { el.classList.remove('error'); err.classList.remove('visible'); }
    }
    return ok;
  }
  ['vdoInternetId','vdoPackage'].forEach(id => {
    document.getElementById(id).addEventListener('input', function() {
      if (this.value.trim()) {
        this.classList.remove('error');
        document.getElementById(id + 'Error').classList.remove('visible');
      }
    });
  });

  /* ── Build ── */
  function buildVdoData() {
    const serviceKey = document.getElementById('vdoService').value;
    const errIdx     = document.getElementById('vdoErrorType').value;
    const id         = document.getElementById('vdoInternetId').value.trim();
    const pkg        = document.getElementById('vdoPackage').value.trim();
    const note       = document.getElementById('vdoExtraNote').value.trim();

    const service = serviceKey === '__other__'
      ? document.getElementById('vdoServiceOther').value.trim()
      : serviceKey;

    const defaultCc = 'helpdesk3bb@ais.co.th;sup_fbbtc@ais.co.th;vas_fbbtc@ais.co.th';
    let subject, body, cc;

    if (errIdx === '__other__') {
      const customError = document.getElementById('vdoErrorOther').value.trim();
      subject = `[${service}] - ประสานตรวจสอบแพ็คเกจ Internet ID: ${id}`;
      body =
`เรียน ทีม VDO Support,
        รบกวนตรวจสอบลูกค้า Internet ID: ${id} ใช้งานแพ็คเกจ ${pkg}
        ${customError}${note ? '\n        ' + note : ''}
        รบกวนช่วยตรวจสอบด้วย${polite} ขอบคุณ${polite}`;
      cc = defaultCc;
    } else {
      const template = VDO_TEMPLATES[serviceKey][parseInt(errIdx)];
      subject = template.subject(id);
      body    = template.body(id, pkg, note);
      cc      = template.cc || defaultCc;
    }
    return { subject, body, cc };
  }

  /* ── Generate ── */
  function generateVdoMail() {
    if (!validateVdo()) return;
    const { subject, body, cc } = buildVdoData();
    const ccDisplay = cc.split(';').join('; ');
    const preview =
`To: VDO Support <vdosupport@ais.co.th>
Cc: ${ccDisplay}
Subject: ${subject}

${body}`;
    document.getElementById('vdoEmailPreview').value = preview;
  }

  /* ── Send ── */
  function sendVdoMail() {
    if (!validateVdo()) return;
    const { subject, body, cc } = buildVdoData();
    const a = document.createElement('a');
    a.href = `mailto:vdosupport@ais.co.th?cc=${cc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g,"\r\n"))}`;
    a.target = '_blank'; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  /* ── Copy ── */
  function copyVdoPreview() {
    const txt = document.getElementById('vdoEmailPreview').value;
    if (!txt) return;
    navigator.clipboard.writeText(txt).then(() => {
      const toast = document.getElementById('vdoCopyToast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    });
  }

  /* ── Clear ── */
  function confirmClearVdo() { document.getElementById('clearVdoModal').classList.add('open'); }
  function closeVdoModal()   { document.getElementById('clearVdoModal').classList.remove('open'); }
  function clearVdoFields() {
    ['vdoInternetId','vdoPackage','vdoExtraNote','vdoEmailPreview','vdoServiceOther','vdoErrorOther'].forEach(id => {
      document.getElementById(id).value = '';
    });
    ['vdoInternetId','vdoPackage','vdoServiceOther','vdoErrorOther'].forEach(id => {
      document.getElementById(id).classList.remove('error');
      const err = document.getElementById(id + 'Error');
      if (err) err.classList.remove('visible');
    });
    document.getElementById('vdoService').value = 'MAX';
    onVdoServiceChange();
    closeVdoModal();
  }
  document.getElementById('clearVdoModal').addEventListener('click', function(e) {
    if (e.target === this) closeVdoModal();
  });

  /* ══════════════════════════════════════════
     Gender (ครับ / ค่ะ)
  ══════════════════════════════════════════ */
  function setGender(g) {
    polite = g === 'ka' ? 'ค่ะ' : 'ครับ';
    document.getElementById('genderKrab').classList.toggle('active', g === 'krab');
    document.getElementById('genderKa').classList.toggle('active',   g === 'ka');
  }

  /* ══════════════════════════════════════════
     Reject FOA
  ══════════════════════════════════════════ */
  const foaFields = ['foaInternetId','foaCpId','foaIssueNo','foaRejectDateTime'];

  function onFoaActivityChange() {
    const sel = document.getElementById('foaActivity').value;
    const otherGroup = document.getElementById('foaOtherActivityGroup');
    const label = document.getElementById('foaRejectDateTimeLabel');
    otherGroup.style.display = sel === 'other' ? '' : 'none';
    const activityLabel = sel === 'other' ? (document.getElementById('foaOtherActivity').value.trim() || 'Activity') : sel;
    label.textContent = `วันที่และเวลา ${activityLabel}`;
  }
  document.getElementById('foaOtherActivity') && document.getElementById('foaOtherActivity').addEventListener('input', function() {
    if (this.value.trim()) { this.classList.remove('error'); document.getElementById('foaOtherActivityError').classList.remove('visible'); }
    onFoaActivityChange();
  });

  function getFoaActivityText() {
    const sel = document.getElementById('foaActivity').value;
    return sel === 'other' ? document.getElementById('foaOtherActivity').value.trim() : sel;
  }

  function validateFoa() {
    let ok = true;
    foaFields.forEach(id => {
      const el  = document.getElementById(id);
      const err = document.getElementById(id + 'Error');
      if (!el.value.trim()) {
        el.classList.add('error'); err.classList.add('visible'); ok = false;
      } else {
        el.classList.remove('error'); err.classList.remove('visible');
      }
    });
    if (document.getElementById('foaActivity').value === 'other') {
      const otherEl = document.getElementById('foaOtherActivity');
      const otherErr = document.getElementById('foaOtherActivityError');
      if (!otherEl.value.trim()) { otherEl.classList.add('error'); otherErr.classList.add('visible'); ok = false; }
      else { otherEl.classList.remove('error'); otherErr.classList.remove('visible'); }
    }
    return ok;
  }
  foaFields.forEach(id => {
    document.getElementById(id).addEventListener('input', function() {
      if (this.value.trim()) {
        this.classList.remove('error');
        document.getElementById(id + 'Error').classList.remove('visible');
      }
    });
  });

  function buildFoaData() {
    const internetId      = document.getElementById('foaInternetId').value.trim();
    const cpId            = document.getElementById('foaCpId').value.trim();
    const issueNo         = document.getElementById('foaIssueNo').value.trim();
    const rejectDateTime  = document.getElementById('foaRejectDateTime').value.trim();
    const activityText    = getFoaActivityText();

    const subject = `รบกวนติดตามสถานะ Activity: ${activityText} - Internet ID : ${internetId}`;
    const body =
`เรียนทีม MA Follow up
รบกวนติดตามสถานะ Activity: ${activityText}
CP ID : ${cpId}
Issue No. : ${issueNo}
Internet ID : ${internetId}
ตรวจสอบทางพื้นที่มีการ ${activityText} เมื่อ ${rejectDateTime} และไม่มี Activity ต่อ${polite}`;

    return { subject, body };
  }

  function generateFoaMail() {
    if (!validateFoa()) return;
    const { subject, body } = buildFoaData();
    document.getElementById('foaEmailPreview').value =
`To: Sup_onsite_tmc <Sup-onsite-tmc@ais.co.th>
Cc: NOC Helpdesk 3BB <helpdesk3bb@ais.co.th>; Sup_FBB Technical Complaint <sup_fbbtc@ais.co.th>
Subject: ${subject}

${body}`;
  }

  function sendFoaMail() {
    if (!validateFoa()) return;
    const { subject, body } = buildFoaData();
    const a = document.createElement('a');
    a.href = `mailto:Sup-onsite-tmc@ais.co.th?cc=helpdesk3bb@ais.co.th;sup_fbbtc@ais.co.th&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g,"\r\n"))}`;
    a.target = '_blank'; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function copyFoaPreview() {
    const txt = document.getElementById('foaEmailPreview').value;
    if (!txt) return;
    navigator.clipboard.writeText(txt).then(() => {
      const toast = document.getElementById('foaCopyToast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    });
  }

  function confirmClearFoa() { document.getElementById('clearFoaModal').classList.add('open'); }
  function closeFoaModal()   { document.getElementById('clearFoaModal').classList.remove('open'); }
  function clearFoaFields() {
    foaFields.forEach(id => {
      document.getElementById(id).value = '';
      document.getElementById(id).classList.remove('error');
      document.getElementById(id + 'Error').classList.remove('visible');
    });
    document.getElementById('foaActivity').value = 'Reject FOA';
    document.getElementById('foaOtherActivity').value = '';
    document.getElementById('foaOtherActivity').classList.remove('error');
    document.getElementById('foaOtherActivityError').classList.remove('visible');
    onFoaActivityChange();
    document.getElementById('foaEmailPreview').value = '';
    closeFoaModal();
  }
  document.getElementById('clearFoaModal').addEventListener('click', function(e) {
    if (e.target === this) closeFoaModal();
  });

  /* ══════════════════════════════════════════
     ประสาน 3BB Fibre
  ══════════════════════════════════════════ */
  document.getElementById('fibreApp').addEventListener('change', function() {
    const wrap = document.getElementById('fibreAppOtherWrap');
    wrap.style.display = this.value === '__other__' ? 'block' : 'none';
  });

  function getFibreApp() {
    const sel = document.getElementById('fibreApp').value;
    return sel === '__other__' ? document.getElementById('fibreAppOther').value.trim() : sel;
  }

  const fibreRequiredFields = ['fibreInternetId','fibreIssueNo','fibreSymptom','fibrePackage'];

  function validateFibre() {
    let ok = true;
    fibreRequiredFields.forEach(id => {
      const el  = document.getElementById(id);
      const err = document.getElementById(id + 'Error');
      if (!el.value.trim()) {
        el.classList.add('error'); err.classList.add('visible'); ok = false;
      } else {
        el.classList.remove('error'); err.classList.remove('visible');
      }
    });
    if (document.getElementById('fibreApp').value === '__other__') {
      const el  = document.getElementById('fibreAppOther');
      const err = document.getElementById('fibreAppOtherError');
      if (!el.value.trim()) { el.classList.add('error'); err.classList.add('visible'); ok = false; }
      else { el.classList.remove('error'); err.classList.remove('visible'); }
    }
    return ok;
  }
  fibreRequiredFields.forEach(id => {
    document.getElementById(id).addEventListener('input', function() {
      if (this.value.trim()) {
        this.classList.remove('error');
        document.getElementById(id + 'Error').classList.remove('visible');
      }
    });
  });

  function buildFibreData() {
    const internetId = document.getElementById('fibreInternetId').value.trim();
    const issueNo    = document.getElementById('fibreIssueNo').value.trim();
    const symptom    = document.getElementById('fibreSymptom').value.trim();
    const app        = getFibreApp();
    const pkg        = document.getElementById('fibrePackage').value.trim();

    const subject = `รบกวนตรวจสอบและช่วยประสานงานให้ลูกค้า Internet ID: ${internetId}`;
    const body =
`เรียน CC และผู้เกี่ยวข้อง
    อ้างอิง Issue No. : ${issueNo}  ,Symptom : ${symptom}
    ตรวจสอบงานที่เป็นมาไม่มี Package ${pkg} ทำให้ลูกค้าไม่สามารถใช้งาน Application ${app} ได้
    รบกวนประสานงานหน่วยงานที่เกี่ยวข้องและติดต่อกลับลูกค้า และแนะนำแพ็คเกจลูกค้าเพิ่มเติมด้วย${polite}

หากดำเนินการเสร็จ รบกวน Reply Email แจ้งกลับด้วย${polite}`;

    return { subject, body };
  }

  function generateFibreMail() {
    if (!validateFibre()) return;
    const { subject, body } = buildFibreData();
    document.getElementById('fibreEmailPreview').value =
`To: Contact@3bbfibre3.com <contact@3BBFibre3.com>; contactcenter@mimotech.onmicrosoft.com <contactcenter@mimotech.onmicrosoft.com>
Cc: tossapok@ais.co.th; sup_fbbtc@ais.co.th; helpdesk3bb@ais.co.th
Subject: ${subject}

${body}`;
  }

  function sendFibreMail() {
    if (!validateFibre()) return;
    const { subject, body } = buildFibreData();
    const a = document.createElement('a');
    a.href = `mailto:contact@3BBFibre3.com;contactcenter@mimotech.onmicrosoft.com?cc=tossapok@ais.co.th;sup_fbbtc@ais.co.th;helpdesk3bb@ais.co.th&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g,"\r\n"))}`;
    a.target = '_blank'; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function copyFibrePreview() {
    const txt = document.getElementById('fibreEmailPreview').value;
    if (!txt) return;
    navigator.clipboard.writeText(txt).then(() => {
      const toast = document.getElementById('fibreCopyToast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    });
  }

  function confirmClearFibre() { document.getElementById('clearFibreModal').classList.add('open'); }
  function closeFibreModal()   { document.getElementById('clearFibreModal').classList.remove('open'); }
  function clearFibreFields() {
    [...fibreRequiredFields, 'fibreAppOther', 'fibreEmailPreview'].forEach(id => {
      document.getElementById(id).value = '';
    });
    [...fibreRequiredFields, 'fibreAppOther'].forEach(id => {
      document.getElementById(id).classList.remove('error');
      const err = document.getElementById(id + 'Error');
      if (err) err.classList.remove('visible');
    });
    document.getElementById('fibreApp').value = 'WeTV';
    document.getElementById('fibreAppOtherWrap').style.display = 'none';
    closeFibreModal();
  }
  document.getElementById('clearFibreModal').addEventListener('click', function(e) {
    if (e.target === this) closeFibreModal();
  });

  /* ══════════════════════════════════════════
     Netflix — Change Email / Disconnect PAI
  ══════════════════════════════════════════ */
  let nfMode = 'email'; // 'email' | 'pai'
  let nfCircuitCount = 0;
  const NF_MAX_CIRCUITS = 4;

  function setNfMode(mode) {
    nfMode = mode;
    const emailBtn = document.getElementById('nfModeEmailBtn');
    const paiBtn   = document.getElementById('nfModePaiBtn');
    const emailPanel = document.getElementById('nfEmailPanel');
    const paiPanel   = document.getElementById('nfPaiPanel');

    if (mode === 'email') {
      emailBtn.style.border = '2px solid var(--accent)'; emailBtn.style.background = 'var(--accent-light)'; emailBtn.style.color = 'var(--accent)';
      paiBtn.style.border = '2px solid var(--border)';   paiBtn.style.background = 'transparent';          paiBtn.style.color = '';
      emailPanel.style.display = '';
      paiPanel.style.display   = 'none';
    } else {
      paiBtn.style.border = '2px solid var(--accent)'; paiBtn.style.background = 'var(--accent-light)'; paiBtn.style.color = 'var(--accent)';
      emailBtn.style.border = '2px solid var(--border)'; emailBtn.style.background = 'transparent';      emailBtn.style.color = '';
      emailPanel.style.display = 'none';
      paiPanel.style.display   = '';
      if (nfCircuitCount === 0) addNfCircuit();
    }
    document.getElementById('nfEmailPreview').value = '';
  }

  function addNfCircuit() {
    if (nfCircuitCount >= NF_MAX_CIRCUITS) return;
    nfCircuitCount++;
    const idx = nfCircuitCount;
    const wrap = document.createElement('div');
    wrap.className = 'form-group';
    wrap.id = `nfCircuit${idx}`;
    wrap.style = 'background:var(--surface2); border:1px solid var(--border); border-radius:var(--radius-sm); padding:16px; margin-bottom:14px; position:relative';
    wrap.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <label style="margin-bottom:0">วงจรที่ ${idx}</label>
        ${idx > 1 ? `<button type="button" onclick="removeNfCircuit(${idx})" style="background:none;border:none;cursor:pointer;color:var(--danger);font-size:13px">✕ ลบ</button>` : ''}
      </div>
      <div class="form-group">
        <label for="nfPaiIds${idx}">Netflix IDs <span style="font-weight:400;color:var(--text-muted)">— วางข้อมูล 3 บรรทัดได้เลย</span></label>
        <textarea id="nfPaiIds${idx}" rows="3" class="input-area" placeholder="netflix_partner_account_identifier : xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx&#10;netflix_bundle_id : xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx&#10;netflix_offer_id : xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" spellcheck="false"></textarea>
      </div>
      <div class="form-group">
        <label for="nfPaiEmail${idx}">Currently linked email</label>
        <input type="text" id="nfPaiEmail${idx}" placeholder="customer@example.com" autocomplete="off" spellcheck="false" />
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label for="nfPaiInternetId${idx}">Internet ID</label>
        <input type="text" id="nfPaiInternetId${idx}" placeholder="88xxxxxxxxx" autocomplete="off" spellcheck="false" />
      </div>`;
    document.getElementById('nfPaiCircuits').appendChild(wrap);
    document.getElementById(`nfPaiIds${idx}`).addEventListener('input', function() {
      if (this.value.trim()) this.classList.remove('error');
    });
    [`nfPaiEmail${idx}`, `nfPaiInternetId${idx}`].forEach(fid => {
      document.getElementById(fid).addEventListener('input', function() {
        if (this.value.trim()) this.classList.remove('error');
      });
    });
    updateNfCircuitUI();
  }

  function removeNfCircuit(idx) {
    const el = document.getElementById(`nfCircuit${idx}`);
    if (el) el.remove();
    nfCircuitCount--;
    // Renumber remaining circuits visually is skipped — IDs stay as-is, just collected by querying existing nodes
    updateNfCircuitUI();
  }

  function updateNfCircuitUI() {
    const remaining = document.querySelectorAll('[id^="nfCircuit"]').length;
    nfCircuitCount = remaining;
    document.getElementById('nfPaiCountLabel').textContent = `(${remaining}/${NF_MAX_CIRCUITS})`;
    document.getElementById('nfPaiAddBtn').style.display = remaining >= NF_MAX_CIRCUITS ? 'none' : '';
  }

  // Parse pasted Netflix IDs textarea — รองรับทั้งแบบ "key": "value", และ key : value
  function parseNfIds(text) {
    const grab = (key) => {
      const m = text.match(new RegExp('"?' + key + '"?\\s*:\\s*"?([a-zA-Z0-9\\-]+)"?', 'i'));
      return m ? m[1].trim() : '';
    };
    return {
      accId:    grab('netflix_partner_account_identifier'),
      bundleId: grab('netflix_bundle_id'),
      offerId:  grab('netflix_offer_id'),
    };
  }

  function getNfCircuitData() {
    const nodes = document.querySelectorAll('[id^="nfCircuit"]');
    const data = [];
    nodes.forEach(node => {
      const idx = node.id.replace('nfCircuit','');
      const idsText = document.getElementById(`nfPaiIds${idx}`).value.trim();
      const { accId, bundleId, offerId } = parseNfIds(idsText);
      data.push({
        accId, bundleId, offerId,
        email:    document.getElementById(`nfPaiEmail${idx}`).value.trim(),
        internetId: document.getElementById(`nfPaiInternetId${idx}`).value.trim(),
      });
    });
    return data;
  }

  const nfFields = ['nfInternetId','nfIds','nfOldEmail','nfNewEmail'];

  function validateNf() {
    if (nfMode === 'pai') {
      // ตรวจสอบว่าทุกวงจรกรอกครบ (Netflix IDs ต้อง parse ได้ทั้ง 3 ค่า)
      const nodes = document.querySelectorAll('[id^="nfCircuit"]');
      let ok = true;
      nodes.forEach(node => {
        const idx = node.id.replace('nfCircuit','');
        const idsEl   = document.getElementById(`nfPaiIds${idx}`);
        const emailEl = document.getElementById(`nfPaiEmail${idx}`);
        const idEl    = document.getElementById(`nfPaiInternetId${idx}`);

        const parsed = parseNfIds(idsEl.value.trim());
        const idsValid = parsed.accId && parsed.bundleId && parsed.offerId;
        idsEl.classList.toggle('error', !idsValid);
        if (!idsValid) ok = false;

        [emailEl, idEl].forEach(el => {
          const valid = !!el.value.trim();
          el.classList.toggle('error', !valid);
          if (!valid) ok = false;
        });
      });
      return ok;
    }
    let ok = true;
    nfFields.forEach(id => {
      const el  = document.getElementById(id);
      const err = document.getElementById(id + 'Error');
      if (!el.value.trim()) {
        el.classList.add('error'); err.classList.add('visible'); ok = false;
      } else {
        el.classList.remove('error'); err.classList.remove('visible');
      }
    });
    return ok;
  }
  nfFields.forEach(id => {
    document.getElementById(id).addEventListener('input', function() {
      if (this.value.trim()) {
        this.classList.remove('error');
        document.getElementById(id + 'Error').classList.remove('visible');
      }
    });
  });

  function buildNfData() {
    const internetId = document.getElementById('nfInternetId').value.trim();
    const nfIds      = document.getElementById('nfIds').value.trim();
    const oldEmail   = document.getElementById('nfOldEmail').value.trim();
    const newEmail   = document.getElementById('nfNewEmail').value.trim();

    const subject = `[Netflix]- Change Netflix Account to the new email`;
    const body =
`Hello Netflix Partner Support,
        In case the customer already activated Netflix hard bundle with an email account that does not exist, so they can't access the account to update their email by themselves. Could you please help us change Netflix Account to the new email with the below details?
Customer details:
${nfIds}
Activated account email : ${oldEmail}
Change email to : ${newEmail}
Internet ID : ${internetId}`;

    return { subject, body };
  }

  function buildNfPaiData() {
    const circuits = getNfCircuitData();
    const subject  = `[Netflix] - Request to Disconnect PAI for Customer Self Re-link`;

    const customerBlocks = circuits.map((c, i) => {
      const label = circuits.length > 1 ? `Customer ${i+1} details:` : `Customer details:`;
      return `${label}
"netflix_partner_account_identifier": "${c.accId}",
"netflix_bundle_id": "${c.bundleId}",
"netflix_offer_id": "${c.offerId}",
Currently linked email: ${c.email}
Internet ID: ${c.internetId}`;
    }).join('\n\n');

    const body =
`Hello Netflix Partner Support,

We would like to request the disconnection of the Partner Account Integration (PAI) for the customer(s) listed below. These customers wish to unlink their Netflix hard bundle account from our partner integration so that they can re-link the account themselves using their own, desired email address.

Could you please help us disconnect the PAI with the below details?

${customerBlocks}

Once the PAI is disconnected, the customer will proceed to re-link their Netflix account independently using their preferred email address.

Thank you for your support.`;

    return { subject, body };
  }

  function generateNfMail() {
    if (!validateNf()) return;
    const { subject, body } = nfMode === 'pai' ? buildNfPaiData() : buildNfData();
    document.getElementById('nfEmailPreview').value =
`To: NF Partner Support <partnersupport@netflix.com>
Cc: NOC Helpdesk 3BB <helpdesk3bb@ais.co.th>; Sup_FBB Technical Complaint <sup_fbbtc@ais.co.th>
Subject: ${subject}

${body}`;
  }

  function sendNfMail() {
    if (!validateNf()) return;
    const { subject, body } = nfMode === 'pai' ? buildNfPaiData() : buildNfData();
    const crlfBody = body.replace(/\n/g, '\r\n');
    const a = document.createElement('a');
    a.href = `mailto:partnersupport@netflix.com?cc=helpdesk3bb@ais.co.th;sup_fbbtc@ais.co.th&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(crlfBody)}`;
    a.target = '_blank'; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function copyNfPreview() {
    const txt = document.getElementById('nfEmailPreview').value;
    if (!txt) return;
    navigator.clipboard.writeText(txt).then(() => {
      const toast = document.getElementById('nfCopyToast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    });
  }

  function confirmClearNf() { document.getElementById('clearNfModal').classList.add('open'); }
  function closeNfModal()   { document.getElementById('clearNfModal').classList.remove('open'); }
  function clearNfFields() {
    nfFields.forEach(id => {
      document.getElementById(id).value = '';
      document.getElementById(id).classList.remove('error');
      document.getElementById(id + 'Error').classList.remove('visible');
    });
    // Reset PAI circuits — keep only circuit 1, clear its values
    document.querySelectorAll('[id^="nfCircuit"]').forEach((node, i) => {
      if (i === 0) {
        node.querySelectorAll('input, textarea').forEach(inp => { inp.value = ''; inp.classList.remove('error'); });
      } else {
        node.remove();
      }
    });
    updateNfCircuitUI();
    document.getElementById('nfEmailPreview').value = '';
    closeNfModal();
  }
  document.getElementById('clearNfModal').addEventListener('click', function(e) {
    if (e.target === this) closeNfModal();
  });
