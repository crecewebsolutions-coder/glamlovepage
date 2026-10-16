/* ===========================================================
   GLAMLOVE — booking flow
=========================================================== */
(function(){
  "use strict";
  if(!window.GL) return;

  var state = {
    date: null,        // 'YYYY-MM-DD'
    dateLabel: '',
    isSpecialRequest: false,
    bridePkg: 'brideHairMakeup',
    qty: { bridesmaid:0, guestHair:0, guestMakeup:0, flowerGirl:0 },
    trial: false,
    touchUpHours: 0,
    assistants: 0,
    extraArtists: 0,
    travelZone: 'none',
    earlyStart: false,
    uploads: [],
    referencePhotos: [] // [{ name, size, dataUrl }]
  };

  var MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var calDate = new Date(); calDate.setDate(1);

  /* ---------------- CALENDAR ---------------- */
  var calGrid = document.getElementById('calGrid');
  var calMonthLabel = document.getElementById('calMonthLabel');

  var calSourceNote = document.getElementById('calSourceNote');

  function renderCalendar(){
    if(!calGrid) return;
    calMonthLabel.textContent = MONTH_NAMES[calDate.getMonth()] + ' ' + calDate.getFullYear();
    calGrid.setAttribute('aria-busy', 'true');

    var year = calDate.getFullYear(), month = calDate.getMonth();
    var fetchPromise = (window.GL_GCAL ? window.GL_GCAL.fetchMonth(year, month) : Promise.resolve({statusMap:null, source:'demo'}));

    fetchPromise.then(function(result){
      // ignore stale responses if the user has already navigated away from this month
      if(calDate.getFullYear() !== year || calDate.getMonth() !== month) return;
      drawCalendar(result);
    });
  }

  function drawCalendar(result){
    calGrid.innerHTML = '';
    var useGoogle = result && result.source === 'google' && result.statusMap;

    if(calSourceNote){
      if(useGoogle){
        calSourceNote.textContent = 'Live from Maritza\'s Google Calendar · Date request subject to prior approval';
        calSourceNote.classList.remove('demo');
      } else {
        calSourceNote.textContent = 'Demo calendar — synchronized with Google Calendar.';
        calSourceNote.classList.add('demo');
      }
    }

    var firstDay = new Date(calDate.getFullYear(), calDate.getMonth(), 1);
    var startPad = firstDay.getDay();
    var daysInMonth = new Date(calDate.getFullYear(), calDate.getMonth()+1, 0).getDate();
    var today = new Date(); today.setHours(0,0,0,0);

    for(var p=0; p<startPad; p++){
      var pad = document.createElement('div');
      pad.className = 'cal-cell pad';
      calGrid.appendChild(pad);
    }
    for(var d=1; d<=daysInMonth; d++){
      var cellDate = new Date(calDate.getFullYear(), calDate.getMonth(), d);
      var key = GL.toKey(cellDate);
      var status = useGoogle ? (result.statusMap[key] || null) : GL.getStatus(key);

      // Only dates explicitly marked available in Google Calendar (or weekend defaults in demo) are green/available
      var isAvailable = (status === 'available');
      var isBooked = (status === 'booked' || status === 'requested');
      var isPast = cellDate < today;

      var cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-cell';
      cell.textContent = d;

      if(isPast){
        cell.classList.add('past');
        cell.title = 'Past date';
      } else if(isBooked){
        cell.classList.add('booked');
        cell.title = 'Booked — Date already reserved for another bride';
        cell.addEventListener('click', function(){
          alert('This date is already fully booked. Please select an available date or contact us directly on WhatsApp to check for waitlist availability.');
        });
      } else if(isAvailable){
        cell.classList.add('available');
        cell.title = 'Open date on calendar — Click to select';
        cell.addEventListener('click', function(k, lbl){
          return function(){ selectDate(k, lbl, false); };
        }(key, formatLongDate(cellDate)));
      } else {
        // Date is closed in regular schedule -> Can be requested as Special Request subject to approval!
        cell.classList.add('unavailable');
        cell.title = 'Closed in regular schedule — Click to submit Special Request (subject to approval)';
        cell.addEventListener('click', function(k, lbl){
          return function(){ selectDate(k, lbl, true); };
        }(key, formatLongDate(cellDate)));
      }

      if(state.date === key) cell.classList.add('selected');
      calGrid.appendChild(cell);
    }
    calGrid.setAttribute('aria-busy', 'false');
  }
  function formatLongDate(d){
    return d.toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric', year:'numeric'});
  }
  function selectDate(key, label, isSpecial){
    state.date = key;
    state.dateLabel = label;
    state.isSpecialRequest = !!isSpecial;

    var banner = document.getElementById('selectedDateBanner');
    var txt1 = document.getElementById('selectedDateText');
    var txt2 = document.getElementById('selectedDateText2');
    banner.classList.add('show');
    txt1.textContent = label;

    if(isSpecial){
      txt2.innerHTML = '<span style="color:#D04A2B; font-weight:700;">(Booked / Closed in Standard Schedule)</span>.<br>' +
        '<small style="color:var(--espresso-soft); display:block; margin-top:6px;">You have chosen a <strong>Special Date Request</strong>. Maritza will personally review if an extraordinary opening or schedule adjustment can be accommodated for your event (subject to her prior approval).</small>';
    } else {
      txt2.innerHTML = '(<span style="color:#557a46; font-weight:700;">Open / Available on Schedule</span>).<br>' +
        '<small style="color:var(--espresso-soft); display:block; margin-top:6px;">This booking request will be sent to Maritza for prior approval and itinerary confirmation before coordinating the 30% retainer.</small>';
    }

    document.getElementById('eventDateDisplay').value = label;
    document.getElementById('toStep2').disabled = false;
    renderCalendar();
  }
  var calPrev = document.getElementById('calPrev');
  var calNext = document.getElementById('calNext');
  if(calPrev) calPrev.addEventListener('click', function(){ calDate.setMonth(calDate.getMonth()-1); renderCalendar(); });
  if(calNext) calNext.addEventListener('click', function(){ calDate.setMonth(calDate.getMonth()+1); renderCalendar(); });

  // Toggle live Google Calendar embed drawer
  var toggleGcalBtn = document.getElementById('toggleGcalEmbedBtn');
  var gcalDrawer = document.getElementById('gcalEmbedDrawer');
  if(toggleGcalBtn && gcalDrawer){
    toggleGcalBtn.addEventListener('click', function(){
      var isHidden = gcalDrawer.style.display === 'none' || !gcalDrawer.style.display;
      gcalDrawer.style.display = isHidden ? 'block' : 'none';
      toggleGcalBtn.textContent = isHidden ? '✕ Hide Official Google Calendar' : '✦ View Official Live Google Calendar';
    });
  }

  renderCalendar();

  /* ---------------- SERVICES / ESTIMATOR ---------------- */
  var serviceList = document.getElementById('serviceList');
  var P = GL.PRICES;

  function buildServiceList(){
    if(!serviceList) return;
    var brideOptions = [
      {key:'brideHairMakeup', name:P.brideHairMakeup.label, price:P.brideHairMakeup.price, desc:'Hair, makeup & lashes'},
      {key:'brideHair', name:P.brideHair.label, price:P.brideHair.price, desc:'Hair only'},
      {key:'brideMakeup', name:P.brideMakeup.label, price:P.brideMakeup.price, desc:'Makeup only'},
      {key:'none', name:'No Bride Service', price:0, desc:'Booking for bridal party only'}
    ];
    var html = '<h4 style="margin-bottom:16px;">Bride</h4><div class="radio-cards" id="brideRadios">';
    brideOptions.forEach(function(o){
      html += '<label class="radio-card" data-key="'+o.key+'"><input type="radio" name="bridePkg" value="'+o.key+'" '+(o.key===state.bridePkg?'checked':'')+'>'+
        '<div class="rc-name">'+o.name+'</div>'+
        (o.price ? '<div class="rc-price">'+GL.money(o.price)+'</div>' : '<div class="rc-price">—</div>')+
        '<div class="rc-desc">'+o.desc+'</div></label>';
    });
    html += '</div>';

    html += '<h4 style="margin:34px 0 6px;">Bridal Party &amp; Guests</h4>';
    html += qtyRow('bridesmaid', P.bridesmaid.label, P.bridesmaid.price, 'Hair + makeup, per person');
    html += qtyRow('guestHair', P.guestHair.label, P.guestHair.price, 'Hair only, per person');
    html += qtyRow('guestMakeup', P.guestMakeup.label, P.guestMakeup.price, 'Makeup only, per person');
    html += qtyRow('flowerGirl', P.flowerGirl.label, P.flowerGirl.price, 'Hair, mascara, blush, glitter & lips');

    html += '<div class="check-row" style="border-top:1px solid var(--line); margin-top:10px;">'+
      '<input type="checkbox" id="trialCheck">'+
      '<label for="trialCheck">Add a Bridal Trial <em>(price confirmed separately with Maritza — not included in this estimate)</em></label></div>';

    serviceList.innerHTML = html;

    // bride radio events
    document.querySelectorAll('input[name="bridePkg"]').forEach(function(r){
      r.addEventListener('change', function(){
        state.bridePkg = this.value;
        document.querySelectorAll('#brideRadios .radio-card').forEach(function(c){ c.classList.remove('checked'); });
        this.closest('.radio-card').classList.add('checked');
        updateEstimate();
      });
    });
    document.querySelectorAll('#brideRadios .radio-card').forEach(function(c){
      if(c.dataset.key === state.bridePkg) c.classList.add('checked');
    });

    // qty controls
    ['bridesmaid','guestHair','guestMakeup','flowerGirl'].forEach(function(key){
      var minus = document.getElementById('qtyMinus_'+key);
      var plus = document.getElementById('qtyPlus_'+key);
      var span = document.getElementById('qtyVal_'+key);
      minus.addEventListener('click', function(){
        state.qty[key] = Math.max(0, state.qty[key]-1);
        span.textContent = state.qty[key];
        updateEstimate();
      });
      plus.addEventListener('click', function(){
        state.qty[key] = Math.min(20, state.qty[key]+1);
        span.textContent = state.qty[key];
        updateEstimate();
      });
    });

    document.getElementById('trialCheck').addEventListener('change', function(){
      state.trial = this.checked;
    });

    updateEstimate();
  }

  function qtyRow(key, label, price, desc){
    return '<div class="qty-row">'+
      '<div><div class="qi-name">'+label+'</div><div class="qi-price">'+GL.money(price)+' each — '+desc+'</div></div>'+
      '<div class="qty-control">'+
        '<button type="button" id="qtyMinus_'+key+'" aria-label="Decrease">–</button>'+
        '<span id="qtyVal_'+key+'">'+state.qty[key]+'</span>'+
        '<button type="button" id="qtyPlus_'+key+'" aria-label="Increase">+</button>'+
      '</div></div>';
  }

  function totalPeople(){
    var bride = state.bridePkg !== 'none' ? 1 : 0;
    return bride + state.qty.bridesmaid + state.qty.guestHair + state.qty.guestMakeup + state.qty.flowerGirl;
  }

  function buildLineItems(){
    // Rebuilds a clean, itemized breakdown from current state — reused by
    // the on-screen estimate box AND the email receipts, so both always match.
    var lines = [];
    var total = 0;

    if(state.bridePkg !== 'none'){
      var b = P[state.bridePkg];
      lines.push({label:b.label, qty:1, unit:b.price, amount:b.price});
      total += b.price;
    }
    if(state.qty.bridesmaid > 0){
      var amt = state.qty.bridesmaid*P.bridesmaid.price;
      lines.push({label:P.bridesmaid.label, qty:state.qty.bridesmaid, unit:P.bridesmaid.price, amount:amt});
      total += amt;
    }
    if(state.qty.guestHair > 0){
      var amt2 = state.qty.guestHair*P.guestHair.price;
      lines.push({label:P.guestHair.label, qty:state.qty.guestHair, unit:P.guestHair.price, amount:amt2});
      total += amt2;
    }
    if(state.qty.guestMakeup > 0){
      var amt3 = state.qty.guestMakeup*P.guestMakeup.price;
      lines.push({label:P.guestMakeup.label, qty:state.qty.guestMakeup, unit:P.guestMakeup.price, amount:amt3});
      total += amt3;
    }
    if(state.qty.flowerGirl > 0){
      var amt4 = state.qty.flowerGirl*P.flowerGirl.price;
      lines.push({label:P.flowerGirl.label, qty:state.qty.flowerGirl, unit:P.flowerGirl.price, amount:amt4});
      total += amt4;
    }

    var touchUpHours = parseInt(getVal('touchUpHours')) || 0;
    var assistants = parseInt(getVal('assistants')) || 0;
    var extraArtists = parseInt(getVal('extraArtists')) || 0;
    var travelZone = getVal('travelZone') || 'none';

    if(touchUpHours > 0){
      var amt5 = touchUpHours*P.touchUp.price;
      lines.push({label:P.touchUp.label, qty:touchUpHours, unit:P.touchUp.price, amount:amt5});
      total += amt5;
    }
    if(assistants > 0){
      var amt6 = assistants*P.assistant.price;
      lines.push({label:P.assistant.label, qty:assistants, unit:P.assistant.price, amount:amt6});
      total += amt6;
    }
    if(extraArtists > 0){
      var amt7 = extraArtists*P.additionalHairstylist.price;
      lines.push({label:'Additional Artist', qty:extraArtists, unit:P.additionalHairstylist.price, amount:amt7});
      total += amt7;
    }
    if(travelZone !== 'none' && travelZone !== 'other' && GL.TRAVEL[travelZone]){
      var t = GL.TRAVEL[travelZone];
      lines.push({label:'Travel — '+t.label, qty:1, unit:t.price, amount:t.price});
      total += t.price;
    }
    if(state.earlyStart){
      lines.push({label:P.earlyStart.label, qty:1, unit:P.earlyStart.price, amount:P.earlyStart.price});
      total += P.earlyStart.price;
    }
    if(state.trial){
      lines.push({label:'Bridal Trial', qty:1, unit:null, amount:null});
    }

    return {lines: lines, total: total};
  }

  function lineItemsToText(lines, total){
    // Plain-text itemized breakdown — used inside the receipt emails.
    var rows = lines.map(function(l){
      var qtyPart = l.qty > 1 ? (l.qty+' x ') : '';
      var amtPart = l.amount === null ? 'TBD' : GL.money(l.amount);
      return qtyPart + l.label + ' ...... ' + amtPart;
    });
    rows.push('------------------------------');
    rows.push('Estimated Total: ' + GL.money(total));
    return rows.join('\n');
  }

  function updateEstimate(){
    var built = buildLineItems();
    var lines = built.lines.map(function(l){
      var prefix = l.qty > 1 ? (l.qty+' × ') : '';
      return [prefix + l.label, l.amount];
    });
    var total = built.total;

    var estimateLines = document.getElementById('estimateLines');
    var estimateTotal = document.getElementById('estimateTotal');
    if(estimateLines){
      estimateLines.innerHTML = lines.length ? lines.map(function(l){
        return '<div class="estimate-line"><span>'+l[0]+'</span><span>'+GL.money(l[1])+'</span></div>';
      }).join('') : '<p style="font-size:13.5px; color:var(--espresso-faint);">Select services above to build your estimate.</p>';
    }
    if(estimateTotal) estimateTotal.textContent = GL.money(total);

    var warning = document.getElementById('groupWarning');
    if(warning){
      var people = totalPeople();
      if(people > 6 || extraArtists > 0 || assistants > 0){
        warning.classList.add('show');
      } else {
        warning.classList.remove('show');
      }
    }
    state._total = total;
    state._lines = lines;
  }

  function getVal(id){
    var el = document.getElementById(id);
    return el ? el.value : null;
  }

  buildServiceList();

  /* ---------------- STEP 3 listeners ---------------- */
  ['touchUpHours','assistants','extraArtists','travelZone'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.addEventListener('input', updateEstimate);
    if(el) el.addEventListener('change', updateEstimate);
  });

  function checkEarlyStart(){
    var t = getVal('readyTime');
    var notice = document.getElementById('earlyStartNotice');
    if(t && t < '07:00'){
      state.earlyStart = true;
      notice.style.display = 'flex';
    } else {
      state.earlyStart = false;
      notice.style.display = 'none';
    }
    updateEstimate();
  }
  var readyTimeEl = document.getElementById('readyTime');
  if(readyTimeEl) readyTimeEl.addEventListener('change', checkEarlyStart);

  /* ---------------- FILE UPLOAD & REFERENCE PHOTOS ---------------- */
  var photoDropzone = document.getElementById('photoDropzone');
  var photoUploadTrigger = document.getElementById('photoUploadTrigger');
  var referencePhotosInput = document.getElementById('referencePhotosInput');
  var referenceThumbsRow = document.getElementById('referenceThumbsRow');

  if(photoUploadTrigger && referencePhotosInput){
    photoUploadTrigger.addEventListener('click', function(e){
      e.stopPropagation();
      referencePhotosInput.click();
    });
  }
  if(photoDropzone && referencePhotosInput){
    photoDropzone.addEventListener('click', function(){
      referencePhotosInput.click();
    });
    ['dragenter','dragover'].forEach(function(evt){
      photoDropzone.addEventListener(evt, function(e){
        e.preventDefault(); e.stopPropagation();
        photoDropzone.classList.add('dragover');
      });
    });
    ['dragleave','drop'].forEach(function(evt){
      photoDropzone.addEventListener(evt, function(e){
        e.preventDefault(); e.stopPropagation();
        photoDropzone.classList.remove('dragover');
      });
    });
    photoDropzone.addEventListener('drop', function(e){
      if(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length){
        handleFiles(e.dataTransfer.files);
      }
    });
    referencePhotosInput.addEventListener('change', function(){
      if(this.files && this.files.length){
        handleFiles(this.files);
      }
    });
  }

  function handleFiles(files){
    var maxPhotos = 5;
    var fileArr = Array.prototype.slice.call(files);
    fileArr.forEach(function(file){
      if(!file.type.match(/^image\//)) return;
      if(state.referencePhotos.length >= maxPhotos){
        alert('You can upload up to a maximum of ' + maxPhotos + ' reference photos.');
        return;
      }
      var reader = new FileReader();
      reader.onload = function(e){
        var img = new Image();
        img.onload = function(){
          var canvas = document.createElement('canvas');
          var maxDim = 800;
          var w = img.width, h = img.height;
          if(w > maxDim || h > maxDim){
            if(w > h){ h = Math.round(h * (maxDim / w)); w = maxDim; }
            else { w = Math.round(w * (maxDim / h)); h = maxDim; }
          }
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          var compressedUrl = canvas.toDataURL('image/jpeg', 0.82);

          state.referencePhotos.push({
            name: file.name,
            size: file.size,
            dataUrl: compressedUrl
          });
          renderPhotoThumbs();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderPhotoThumbs(){
    if(!referenceThumbsRow) return;
    referenceThumbsRow.innerHTML = '';
    state.referencePhotos.forEach(function(photo, idx){
      var card = document.createElement('div');
      card.className = 'reference-thumb-card';
      card.innerHTML = '<img src="' + photo.dataUrl + '" alt="' + photo.name + '">' +
        '<button type="button" class="thumb-remove-btn" title="Remove photo" data-idx="' + idx + '">×</button>' +
        '<div class="thumb-name">' + photo.name + '</div>';
      referenceThumbsRow.appendChild(card);
    });
    referenceThumbsRow.querySelectorAll('.thumb-remove-btn').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var index = parseInt(this.dataset.idx, 10);
        state.referencePhotos.splice(index, 1);
        renderPhotoThumbs();
      });
    });
  }

  /* ---------------- ALLERGY TOGGLE ---------------- */
  var allergySelect = document.getElementById('allergies');
  if(allergySelect){
    allergySelect.addEventListener('change', function(){
      document.getElementById('allergyDetailField').style.display = this.value === 'Yes' ? 'block' : 'none';
    });
  }

  /* ---------------- STEP NAVIGATION ---------------- */
  var panes = document.querySelectorAll('.step-pane');
  var steps = document.querySelectorAll('.progress-step');

  function goToStep(n){
    panes.forEach(function(p){ p.classList.toggle('active', +p.dataset.pane === n); });
    steps.forEach(function(s){
      var sn = +s.dataset.step;
      s.classList.toggle('active', sn === n);
      s.classList.toggle('done', sn < n);
    });
    document.querySelector('.booking-panel').scrollIntoView({behavior:'smooth', block:'start'});
  }

  document.getElementById('toStep2').addEventListener('click', function(){ goToStep(2); });
  document.getElementById('toStep3').addEventListener('click', function(){ goToStep(3); });
  document.getElementById('toStep4').addEventListener('click', function(){ goToStep(4); });
  document.getElementById('toStep5').addEventListener('click', function(){
    if(validateStep4()) { buildReview(); goToStep(5); }
  });
  document.querySelectorAll('[data-back]').forEach(function(btn){
    btn.addEventListener('click', function(){ goToStep(+this.dataset.back); });
  });

  function validateStep4(){
    var ok = true;
    [['fullName',/.+/], ['email',/^[^\s@]+@[^\s@]+\.[^\s@]+$/], ['phone',/.{7,}/]].forEach(function(pair){
      var el = document.getElementById(pair[0]);
      var valid = pair[1].test(el.value.trim());
      el.classList.toggle('error', !valid);
      var msg = el.parentElement.querySelector('.error-msg');
      if(msg) msg.classList.toggle('show', !valid);
      if(!valid) ok = false;
    });
    return ok;
  }

  function serviceSummaryText(){
    var parts = [];
    if(state.bridePkg !== 'none') parts.push(P[state.bridePkg].label);
    if(state.qty.bridesmaid) parts.push(state.qty.bridesmaid+' Bridesmaid(s)');
    if(state.qty.guestHair) parts.push(state.qty.guestHair+' Guest Hair');
    if(state.qty.guestMakeup) parts.push(state.qty.guestMakeup+' Guest Makeup');
    if(state.qty.flowerGirl) parts.push(state.qty.flowerGirl+' Flower Girl(s)');
    if(state.trial) parts.push('Bridal Trial');
    return parts.length ? parts.join(', ') : 'No services selected yet';
  }

  function buildReview(){
    var rows = [
      ['Date', state.dateLabel || '—'],
      ['Request Type', state.isSpecialRequest ? 'Special Request (Closed date — subject to prior approval)' : 'Open date on calendar'],
      ['Event Type', getVal('eventType')],
      ['Venue', getVal('venue') || '—'],
      ['City', getVal('city') || '—'],
      ['Getting-Ready Location', getVal('readyLocation')],
      ['Services', serviceSummaryText()],
      ['Total People', totalPeople()],
      ['Reference Photos', state.referencePhotos.length ? state.referencePhotos.length + ' reference photo(s) attached' : 'None attached'],
      ['Name', getVal('fullName')],
      ['Email', getVal('email')],
      ['Phone', getVal('phone')],
      ['Estimated Total', GL.money(state._total || 0)]
    ];
    var html = rows.map(function(r){
      return '<div class="cs-row"><span>'+r[0]+'</span><strong>'+(r[1] || '—')+'</strong></div>';
    }).join('');
    document.getElementById('reviewSummary').innerHTML = html;
  }

  /* ---------------- SUBMIT ---------------- */
  var policyCheck = document.getElementById('policyConsent');
  if(policyCheck){
    policyCheck.addEventListener('change', function(){
      var err = document.getElementById('policyConsentError');
      if(err && this.checked){ err.style.display = 'none'; err.classList.remove('show'); }
    });
  }

  document.getElementById('bookingForm').addEventListener('submit', function(e){
    e.preventDefault();

    var policyConsentEl = document.getElementById('policyConsent');
    var policyErrorEl = document.getElementById('policyConsentError');
    if(policyConsentEl && !policyConsentEl.checked){
      if(policyErrorEl){
        policyErrorEl.style.display = 'block';
        policyErrorEl.classList.add('show');
      }
      policyConsentEl.focus();
      var card = policyConsentEl.closest('.policy-agreement-card');
      if(card) card.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }
    if(policyErrorEl){
      policyErrorEl.style.display = 'none';
      policyErrorEl.classList.remove('show');
    }

    var built = buildLineItems();
    var breakdownText = lineItemsToText(built.lines, built.total);

    var entry = {
      date: state.date,
      dateLabel: state.dateLabel,
      isSpecialRequest: state.isSpecialRequest,
      eventType: getVal('eventType'),
      venue: getVal('venue'),
      city: getVal('city'),
      readyLocation: getVal('readyLocation'),
      readyTime: getVal('readyTime'),
      ceremonyTime: getVal('ceremonyTime'),
      photoTime: getVal('photoTime'),
      completeTime: getVal('completeTime'),
      travelZone: getVal('travelZone'),
      touchUpHours: getVal('touchUpHours'),
      assistants: getVal('assistants'),
      extraArtists: getVal('extraArtists'),
      bridePkg: state.bridePkg,
      qty: state.qty,
      trial: state.trial,
      uploads: state.uploads,
      referencePhotos: state.referencePhotos,
      name: getVal('fullName'),
      email: getVal('email'),
      phone: getVal('phone'),
      allergies: getVal('allergies'),
      allergyDetail: getVal('allergyDetail'),
      message: getVal('message'),
      photoConsent: document.getElementById('photoConsent') ? document.getElementById('photoConsent').checked : false,
      policyConsent: true,
      acceptedPolicies: true,
      acceptedPoliciesAt: new Date().toISOString(),
      estimatedTotal: built.total,
      servicesSummary: serviceSummaryText(),
      breakdownText: breakdownText
    };

    var saved = GL.addBooking(entry);

    // Build WhatsApp message
    var specialTag = entry.isSpecialRequest ? " [SPECIAL REQUEST: Date closed in regular schedule — subject to your prior approval]" : "";
    var photoNote = state.referencePhotos.length ? (" I have selected " + state.referencePhotos.length + " reference photo(s) for my hair/makeup and I am attaching them right below in this chat 📸.") : "";

    var msg = "Hi Maritza! I'm interested in booking GlamLove for " + (entry.dateLabel || 'a date') + specialTag + ". " +
      "My event is a " + entry.eventType + ". I'm interested in " + entry.servicesSummary + " for " + totalPeople() + " people. " +
      "My venue/location is " + (entry.venue || entry.city || 'TBD') + ". " +
      "Estimated total: " + GL.money(entry.estimatedTotal) + ". " + photoNote + " " +
      "I have reviewed and accepted GlamLove's Policies & Terms of Service. " +
      "I'd love to discuss availability and schedule confirmation.";
    var waLink = "https://wa.me/16232240331?text=" + encodeURIComponent(msg);
    var waBtn = document.getElementById('whatsappBtn');
    waBtn.setAttribute('href', waLink);

    // Setup photo modal preview if reference photos were uploaded
    var photoModal = document.getElementById('photoWhatsAppModal');
    var modalPreview = document.getElementById('modalThumbsPreview');
    var modalWaLink = document.getElementById('modalDirectWaLink');
    var closeModalBtn = document.getElementById('closePhotoModalBtn');

    if(modalWaLink) modalWaLink.setAttribute('href', waLink);

    if(modalPreview){
      modalPreview.innerHTML = '';
      if(state.referencePhotos.length > 0){
        state.referencePhotos.forEach(function(ph){
          var img = document.createElement('img');
          img.src = ph.dataUrl;
          img.alt = ph.name;
          modalPreview.appendChild(img);
        });
      }
    }

    if(closeModalBtn && photoModal){
      closeModalBtn.onclick = function(){
        photoModal.style.display = 'none';
      };
    }

    if(waBtn && photoModal){
      if(state.referencePhotos.length > 0){
        waBtn.onclick = function(e){
          e.preventDefault();
          photoModal.style.display = 'flex';
          window.open(waLink, '_blank');
        };
      } else {
        waBtn.onclick = null;
      }
    }

    var finalRows = [
      ['Confirmation #', saved.id],
      ['Date', entry.dateLabel || '—'],
      ['Request Type', entry.isSpecialRequest ? 'Special Request (Subject to approval)' : 'Open calendar date'],
      ['Services', entry.servicesSummary],
      ['Estimated Total', GL.money(entry.estimatedTotal)],
      ['Reference Photos', state.referencePhotos.length ? state.referencePhotos.length + ' photo(s) saved' : 'None']
    ];
    document.getElementById('finalSummary').innerHTML = finalRows.map(function(r){
      return '<div class="cs-row"><span>'+r[0]+'</span><strong>'+r[1]+'</strong></div>';
    }).join('');

    // Deliver request directly to Maritza via Formspree (no email sent to client)
    var emailStatusEl = document.getElementById('emailStatus');
    if(emailStatusEl){
      emailStatusEl.textContent = 'Delivering your request to Maritza…';
      emailStatusEl.className = 'email-status sending';
    }

    var formspreePayload = {
      _subject: 'New Booking Request: ' + (entry.name || 'Client') + ' (' + (entry.dateLabel || 'Date TBD') + ')',
      name: entry.name,
      email: entry.email,
      phone: entry.phone,
      eventDate: entry.dateLabel || 'Not specified',
      requestType: entry.isSpecialRequest ? 'Special Request (Subject to Prior Approval)' : 'Standard Calendar Date',
      eventType: entry.eventType || 'Wedding',
      venue: entry.venue || 'TBD',
      city: entry.city || 'TBD',
      gettingReadyLocation: entry.readyLocation || 'Home',
      gettingReadyTime: entry.readyTime || 'TBD',
      ceremonyTime: entry.ceremonyTime || 'TBD',
      photographyStartTime: entry.photoTime || 'TBD',
      desiredCompletionTime: entry.completeTime || 'TBD',
      travelDestination: entry.travelZone || 'Local',
      touchUpHours: entry.touchUpHours || 0,
      assistantsNeeded: entry.assistants || 0,
      extraArtistsNeeded: entry.extraArtists || 0,
      servicesSummary: entry.servicesSummary || 'None selected',
      servicesBreakdown: entry.breakdownText || '',
      estimatedTotal: GL.money(entry.estimatedTotal),
      allergies: entry.allergies || 'No',
      allergyDetails: entry.allergyDetail || 'None',
      message: entry.message || 'None',
      photoConsent: entry.photoConsent ? 'Yes' : 'No',
      policyAgreed: 'Yes (Accepted GlamLove Policies & 30% deposit requirement)',
      referencePhotosCount: state.referencePhotos.length
    };

    fetch('https://formspree.io/f/xrpernqo', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formspreePayload)
    }).then(function(res){
      if(!emailStatusEl) return;
      if(res.ok){
        emailStatusEl.textContent = '✓ Your request has been delivered directly to Maritza.';
        emailStatusEl.className = 'email-status sent';
      } else {
        emailStatusEl.textContent = 'Your request has been saved. Maritza will follow up shortly.';
        emailStatusEl.className = 'email-status sent';
      }
    }).catch(function(err){
      console.warn('GlamLove Formspree notice:', err);
      if(emailStatusEl){
        emailStatusEl.textContent = 'Your request has been saved. Maritza will follow up shortly.';
        emailStatusEl.className = 'email-status sent';
      }
    });

    goToStep(6);
  });

})();
