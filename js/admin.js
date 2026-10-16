/* ===========================================================
   GLAMLOVE — admin dashboard
   Demo auth only: a client-side passcode gate. This keeps the
   dashboard out of casual view but is NOT secure — for a real
   launch, put this behind real authentication on a real backend.
=========================================================== */
(function(){
  "use strict";
  if(!window.GL) return;

  var PASSCODE = 'glamlove2026';
  var SESSION_KEY = 'glamlove_admin_session';

  var loginBox = document.getElementById('adminLogin');
  var shell = document.getElementById('adminShell');

  function unlock(){
    loginBox.style.display = 'none';
    shell.classList.add('show');
    initDashboard();
  }
  if(sessionStorage.getItem(SESSION_KEY) === '1'){ unlock(); }

  document.getElementById('adminLoginBtn').addEventListener('click', attemptLogin);
  document.getElementById('adminPass').addEventListener('keydown', function(e){
    if(e.key === 'Enter') attemptLogin();
  });
  function attemptLogin(){
    var val = document.getElementById('adminPass').value;
    if(val === PASSCODE){
      sessionStorage.setItem(SESSION_KEY, '1');
      unlock();
    } else {
      document.getElementById('adminLoginError').style.display = 'block';
    }
  }
  document.getElementById('adminLogout').addEventListener('click', function(){
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });

  /* ---------------- TABS ---------------- */
  document.querySelectorAll('.admin-tab').forEach(function(tab){
    tab.addEventListener('click', function(){
      document.querySelectorAll('.admin-tab').forEach(function(t){ t.classList.remove('active'); });
      document.querySelectorAll('.admin-panel').forEach(function(p){ p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('panel-'+tab.dataset.tab).classList.add('active');
    });
  });

  var MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var admCalDate = new Date(); admCalDate.setDate(1);

  function initDashboard(){
    renderStats();
    renderAdminCalendar();
    renderRequests();

    document.getElementById('admCalPrev').addEventListener('click', function(){ admCalDate.setMonth(admCalDate.getMonth()-1); renderAdminCalendar(); });
    document.getElementById('admCalNext').addEventListener('click', function(){ admCalDate.setMonth(admCalDate.getMonth()+1); renderAdminCalendar(); });

    document.getElementById('closeModal').addEventListener('click', function(){
      document.getElementById('requestModal').classList.remove('show');
    });
    document.getElementById('requestModal').addEventListener('click', function(e){
      if(e.target === this) this.classList.remove('show');
    });

    var gcalBtn = document.getElementById('gcalPreviewBtn');
    if(gcalBtn) gcalBtn.addEventListener('click', previewGcal);
    var ejsBtn = document.getElementById('ejsPreviewBtn');
    if(ejsBtn) ejsBtn.addEventListener('click', sendTestEmail);
  }

  /* ---------------- EMAIL RECEIPTS SETUP TAB ---------------- */
  function sendTestEmail(){
    var publicKey = document.getElementById('ejsPublicInput').value.trim();
    var serviceId = document.getElementById('ejsServiceInput').value.trim();
    var clientTpl = document.getElementById('ejsClientTplInput').value.trim();
    var adminTpl = document.getElementById('ejsAdminTplInput').value.trim();
    if(!publicKey || !serviceId || !clientTpl || !adminTpl){
      alert('Fill in all four fields to test.');
      return;
    }
    window.EMAILJS_CONFIG = {
      enabled: true,
      publicKey: publicKey,
      serviceId: serviceId,
      clientTemplateId: clientTpl,
      adminTemplateId: adminTpl,
      adminEmail: window.EMAILJS_CONFIG.adminEmail || 'dayalyn918@gmail.com'
    };
    document.getElementById('ejsCodeSnippet').textContent =
      'window.EMAILJS_CONFIG = { enabled: true, publicKey: "' + publicKey + '", serviceId: "' + serviceId +
      '", clientTemplateId: "' + clientTpl + '", adminTemplateId: "' + adminTpl + '", adminEmail: "' +
      window.EMAILJS_CONFIG.adminEmail + '" };';

    var testBooking = {
      id: 'TEST-' + Date.now().toString(36).toUpperCase(),
      email: window.EMAILJS_CONFIG.adminEmail,
      name: 'Test Bride',
      phone: '(602) 555-0100',
      dateLabel: 'Saturday, January 1, 2027',
      eventType: 'Wedding',
      venue: 'Test Venue',
      city: 'Glendale, AZ',
      readyLocation: 'Home',
      servicesSummary: 'Bride Hair + Makeup, 2 Bridesmaid(s)',
      breakdownText: 'Bride Hair + Makeup ...... $450\n2 x Bridesmaid Hair + Makeup ...... $440\n------------------------------\nEstimated Total: $890',
      estimatedTotal: 890,
      allergies: 'No',
      photoConsent: true,
      message: 'This is a test email from the GlamLove admin dashboard.'
    };

    if(!window.GL_EMAIL){ alert('js/email.js did not load — check the browser console.'); return; }
    window.GL_EMAIL.sendBookingEmails(testBooking).then(function(result){
      if(result.sent) alert('Test email sent! Check ' + window.EMAILJS_CONFIG.adminEmail + '.');
      else alert('Could not send test email — open the browser console (F12) for details.');
    });
  }

  /* ---------------- GOOGLE CALENDAR SETUP TAB ---------------- */
  function previewGcal(){
    var id = document.getElementById('gcalIdInput').value.trim();
    var key = document.getElementById('gcalKeyInput').value.trim();
    if(!id || !key){ alert('Enter both a Calendar ID and an API key to preview.'); return; }
    window.GCAL_CONFIG = { enabled: true, apiKey: key, calendarId: id };
    document.getElementById('gcalCodeSnippet').textContent =
      'window.GCAL_CONFIG = { enabled: true, apiKey: "' + key + '", calendarId: "' + id + '" };';
    // clear this session's fetch cache isn't exposed, so just re-render — fetchMonth caches per key/month already unused since config changed
    admCalDate.setDate(1);
    renderAdminCalendar();
    alert('Previewing live Google Calendar data in the Calendar Preview tab (this browser only).');
  }

  function renderStats(){
    var cal = GL.getCalendar();
    var bookings = GL.getBookings();
    var counts = {available:0, unavailable:0, booked:0, requested:0};
    Object.keys(cal).forEach(function(k){ if(counts[cal[k]] !== undefined) counts[cal[k]]++; });
    var pending = bookings.filter(function(b){ return b.status === 'requested'; }).length;

    var stats = [
      [bookings.length, 'Total Requests'],
      [pending, 'Pending Review'],
      [counts.available, 'Open Dates'],
      [counts.booked, 'Booked Dates']
    ];
    document.getElementById('statRow').innerHTML = stats.map(function(s){
      return '<div class="admin-stat"><div class="num">'+s[0]+'</div><div class="lbl">'+s[1]+'</div></div>';
    }).join('');
  }

  function renderAdminCalendar(){
    var grid = document.getElementById('admCalGrid');
    document.getElementById('admCalMonthLabel').textContent = MONTH_NAMES[admCalDate.getMonth()] + ' ' + admCalDate.getFullYear();
    grid.setAttribute('aria-busy', 'true');

    var year = admCalDate.getFullYear(), month = admCalDate.getMonth();
    var fetchPromise = (window.GL_GCAL ? window.GL_GCAL.fetchMonth(year, month) : Promise.resolve({statusMap:null, source:'demo'}));

    fetchPromise.then(function(result){
      if(admCalDate.getFullYear() !== year || admCalDate.getMonth() !== month) return;
      drawAdminCalendar(result);
    });
  }

  function drawAdminCalendar(result){
    var grid = document.getElementById('admCalGrid');
    grid.innerHTML = '';
    var useGoogle = result && result.source === 'google' && result.statusMap;
    var note = document.getElementById('admCalSourceNote');
    if(note){
      note.textContent = useGoogle
        ? 'Synced in real time with Google Calendar (casaemma123456@gmail.com).'
        : 'Showing local demo data.';
    }

    var firstDay = new Date(admCalDate.getFullYear(), admCalDate.getMonth(), 1);
    var startPad = firstDay.getDay();
    var daysInMonth = new Date(admCalDate.getFullYear(), admCalDate.getMonth()+1, 0).getDate();

    for(var p=0; p<startPad; p++){
      var pad = document.createElement('div');
      pad.className = 'admin-cal-cell pad';
      grid.appendChild(pad);
    }
    for(var d=1; d<=daysInMonth; d++){
      var cellDate = new Date(admCalDate.getFullYear(), admCalDate.getMonth(), d);
      var key = GL.toKey(cellDate);
      var status = useGoogle ? (result.statusMap[key] || 'unavailable') : (GL.getStatus(key) || 'available');
      var cell = document.createElement('div');
      cell.className = 'admin-cal-cell ' + (status ? 'st-'+status : 'st-none');
      cell.innerHTML = '<span>'+d+'</span><span class="st">'+(status || '\u2014')+'</span>';
      grid.appendChild(cell);
    }
    grid.setAttribute('aria-busy', 'false');
  }

  /* ---------------- REQUESTS ---------------- */
  function renderRequests(){
    var bookings = GL.getBookings();
    var tbody = document.getElementById('requestsTableBody');
    var empty = document.getElementById('requestsEmpty');
    if(!bookings.length){
      tbody.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    tbody.innerHTML = bookings.map(function(b){
      var specialTag = b.isSpecialRequest ? ' <span style="display:inline-block; background:#ffebeb; color:#D04A2B; font-size:10px; font-weight:700; padding:2px 5px; border-radius:3px; margin-left:4px;">SPECIAL</span>' : '';
      return '<tr>'+
        '<td>'+esc(b.name)+specialTag+'<br><span style="color:var(--espresso-faint); font-size:12px;">'+esc(b.phone)+'</span></td>'+
        '<td>'+esc(b.dateLabel || b.date || '—')+'</td>'+
        '<td>'+esc(b.servicesSummary || '—')+'</td>'+
        '<td>'+esc(String((b.qty ? Object.values(b.qty).reduce(function(a,c){return a+ (parseInt(c)||0);},0) : 0) + (b.bridePkg && b.bridePkg!=='none' ? 1 : 0)))+'</td>'+
        '<td>'+esc(b.venue || b.city || '—')+'</td>'+
        '<td>'+GL.money(b.estimatedTotal||0)+'</td>'+
        '<td><span class="status-badge status-'+esc(b.status)+'">'+esc(b.status)+'</span></td>'+
        '<td><button class="btn btn-ghost btn-sm" data-id="'+esc(b.id)+'">View</button></td>'+
      '</tr>';
    }).join('');
    tbody.querySelectorAll('button[data-id]').forEach(function(btn){
      btn.addEventListener('click', function(){ openModal(this.dataset.id); });
    });
  }

  function esc(s){
    if(s === undefined || s === null) return '';
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function openModal(id){
    var b = GL.getBookings().find(function(x){ return x.id === id; });
    if(!b) return;
    var fields = [
      ['Confirmation #', b.id], ['Status', b.status],
      ['Name', b.name], ['Email', b.email], ['Phone', b.phone],
      ['Date', b.dateLabel || b.date],
      ['Request Type', b.isSpecialRequest ? '<span style="color:#D04A2B; font-weight:700;">⚠ SPECIAL REQUEST (Closed Date — Requires Your Prior Approval)</span>' : '<span style="color:#557a46; font-weight:700;">✓ Open Calendar Date</span>'],
      ['Event Type', b.eventType],
      ['Venue', b.venue], ['City', b.city], ['Getting-Ready Location', b.readyLocation],
      ['Getting-Ready Time', b.readyTime], ['Ceremony Time', b.ceremonyTime],
      ['Photography Start', b.photoTime], ['Desired Completion', b.completeTime],
      ['Services', b.servicesSummary], ['Trial Requested', b.trial ? 'Yes' : 'No'],
      ['Travel Zone', b.travelZone], ['Touch-Up Hours', b.touchUpHours],
      ['Assistants', b.assistants], ['Extra Artists', b.extraArtists],
      ['Allergies', b.allergies + (b.allergyDetail ? ' — '+b.allergyDetail : '')],
      ['Photo Consent', b.photoConsent ? 'Yes' : 'No'],
      ['Policies Accepted', b.acceptedPolicies ? 'Yes ✓ (Agreed to terms & deposit)' : 'Pending'],
      ['Message', b.message || '—'],
      ['Estimated Total', GL.money(b.estimatedTotal||0)],
      ['Required 30% Deposit', GL.money(Math.round((b.estimatedTotal||0) * 0.30))],
      ['Submitted', new Date(b.createdAt).toLocaleString()]
    ];
    var html = fields.map(function(f){
      return '<div class="cs-row"><span>'+esc(f[0])+'</span><strong style="text-align:right; max-width:60%;">'+(f[1].indexOf('<span') !== -1 ? f[1] : esc(f[1]))+'</strong></div>';
    }).join('');

    if(b.referencePhotos && b.referencePhotos.length){
      html += '<div style="margin-top:16px; padding-top:14px; border-top:1px solid var(--line);">' +
        '<div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--gold); margin-bottom:8px;">Client Reference Photos (' + b.referencePhotos.length + ')</div>' +
        '<div style="display:flex; gap:10px; flex-wrap:wrap;">' +
        b.referencePhotos.map(function(ph){
          return '<a href="' + ph.dataUrl + '" target="_blank" rel="noopener" title="' + esc(ph.name) + '" style="display:inline-block; border-radius:6px; overflow:hidden; border:1px solid var(--line);">' +
            '<img src="' + ph.dataUrl + '" style="width:72px; height:72px; object-fit:cover; display:block;" alt="' + esc(ph.name) + '">' +
            '</a>';
        }).join('') +
        '</div>' +
        '</div>';
    }

    var depositAmt = GL.money(Math.round((b.estimatedTotal||0) * 0.30));
    var cleanPhone = (b.phone||'').replace(/\D/g,'');
    var approveMsg = "Hi " + (b.name || 'there') + "! This is Maritza from GlamLove Salon. I have reviewed and APPROVED your booking request for " + (b.dateLabel || b.date) + "! To officially lock your date on my calendar, the 30% deposit is " + depositAmt + " (Zelle to mmaperez04@gmail.com). Let me know once sent so I can send your official confirmation!";
    var waApproveUrl = "https://wa.me/1" + cleanPhone + "?text=" + encodeURIComponent(approveMsg);

    html += '<div style="margin-top:24px; padding-top:16px; border-top:1px solid var(--line); display:flex; flex-direction:column; gap:10px;">'+
      '<div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--gold);">Owner Approval Actions</div>'+
      '<div style="display:flex; gap:10px; flex-wrap:wrap;">'+
        '<button class="btn btn-primary btn-sm" data-action="approved_pending_deposit" style="background:#557a46;">✓ Approve &amp; Request Deposit</button>'+
        '<button class="btn btn-primary btn-sm" data-action="confirmed">Mark Fully Booked</button>'+
        '<button class="btn btn-ghost btn-sm" data-action="cancelled" style="color:var(--unavailable);">Decline / Free Date</button>'+
      '</div>'+
      (cleanPhone ? '<div style="margin-top:6px;"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="' + waApproveUrl + '">Send Approval &amp; Deposit Link on WhatsApp 💬</a></div>' : '')+
      '</div>';

    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('requestModal').classList.add('show');

    document.querySelectorAll('#modalContent [data-action]').forEach(function(btn){
      btn.addEventListener('click', function(){
        GL.updateBookingStatus(b.id, this.dataset.action);
        document.getElementById('requestModal').classList.remove('show');
        renderRequests();
        renderStats();
        renderAdminCalendar();
      });
    });
  }

})();
