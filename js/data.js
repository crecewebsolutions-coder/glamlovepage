/* ===========================================================
   GLAMLOVE — shared data layer
   Pricing is the single source of truth used by the estimator,
   the booking summary and the WhatsApp message.
   NOTE: This demo uses browser localStorage so the site is fully
   functional to click through. For the calendar/admin dashboard
   to sync in real time across every visitor's device, the
   storage calls below (marked GL.store) should be pointed at a
   real backend (e.g. Firebase, Airtable, Supabase) — see the
   note in admin.html.
=========================================================== */
window.GL = (function(){
  "use strict";

  var PRICES = {
    brideHairMakeup: {label:"Bride Hair + Makeup", price:450},
    brideHair: {label:"Bride Hair Only", price:250},
    brideMakeup: {label:"Bride Makeup Only", price:250},
    bridesmaid: {label:"Bridesmaid Hair + Makeup", price:220},
    guestHair: {label:"Hair Only (Guest)", price:115},
    guestMakeup: {label:"Makeup Only (Guest)", price:115},
    flowerGirl: {label:"Flower Girl (12 & under)", price:70},
    touchUp: {label:"Touch-Up Service", price:150, unit:"/hour"},
    assistant: {label:"Assistant", price:50},
    additionalMakeupArtist: {label:"Additional Makeup Artist", price:75},
    additionalHairstylist: {label:"Additional Hairstylist", price:75},
    earlyStart: {label:"Early Start Fee (per stylist)", price:50}
  };

  var TRAVEL = {
    sedona:{label:"Sedona", price:200},
    prescott:{label:"Prescott", price:250},
    tucson:{label:"Tucson", price:250},
    flagstaff:{label:"Flagstaff", price:350}
  };

  var CAL_KEY = 'glamlove_calendar_v1';
  var BOOK_KEY = 'glamlove_bookings_v1';

  function pad(n){ return n < 10 ? '0'+n : ''+n; }
  function toKey(date){ return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate()); }

  /* ---- Calendar ---- */
  function getCalendar(){
    try{
      var raw = localStorage.getItem(CAL_KEY);
      return raw ? JSON.parse(raw) : seedCalendar();
    }catch(e){ return {}; }
  }
  function saveCalendar(cal){
    localStorage.setItem(CAL_KEY, JSON.stringify(cal));
  }
  function setDateStatus(key, status){
    var cal = getCalendar();
    if(status === 'clear'){ delete cal[key]; }
    else{ cal[key] = status; }
    saveCalendar(cal);
    return cal;
  }
  function getStatus(key){
    var cal = getCalendar();
    return cal[key] || null; // null = unspecified (treated as not-yet-open)
  }
  function seedCalendar(){
    // Seed a friendly demo pattern: weekends open, a couple blocked, next 60 days.
    var cal = {};
    var today = new Date();
    for(var i=1; i<=75; i++){
      var d = new Date(today);
      d.setDate(today.getDate()+i);
      var day = d.getDay();
      var key = toKey(d);
      if(day === 6 || day === 0){ // Sat/Sun
        cal[key] = 'available';
      }
    }
    // a couple of sample booked / unavailable dates for demo realism
    var sample1 = new Date(today); sample1.setDate(today.getDate()+18);
    var sample2 = new Date(today); sample2.setDate(today.getDate()+32);
    cal[toKey(sample1)] = 'booked';
    cal[toKey(sample2)] = 'unavailable';
    saveCalendar(cal);
    return cal;
  }

  /* ---- Bookings ---- */
  function getBookings(){
    try{
      var raw = localStorage.getItem(BOOK_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function saveBookings(list){
    localStorage.setItem(BOOK_KEY, JSON.stringify(list));
  }
  function addBooking(entry){
    var list = getBookings();
    entry.id = 'GL-' + Date.now().toString(36).toUpperCase();
    entry.createdAt = new Date().toISOString();
    entry.status = 'requested';
    list.unshift(entry);
    saveBookings(list);
    // mark the date as "requested" on the calendar if it was available
    if(entry.date){
      var cal = getCalendar();
      if(cal[entry.date] === 'available' || !cal[entry.date]){
        cal[entry.date] = 'requested';
        saveCalendar(cal);
      }
    }
    return entry;
  }
  function updateBookingStatus(id, status){
    var list = getBookings();
    var found = null;
    list = list.map(function(b){
      if(b.id === id){ b.status = status; found = b; }
      return b;
    });
    saveBookings(list);
    if(found && found.date){
      var cal = getCalendar();
      if(status === 'confirmed' || status === 'booked' || status === 'approved_pending_deposit'){ cal[found.date] = 'booked'; }
      if(status === 'cancelled'){ cal[found.date] = 'available'; }
      saveCalendar(cal);
    }
    return found;
  }

  function money(n){
    return '$' + n.toLocaleString('en-US');
  }

  return {
    PRICES: PRICES, TRAVEL: TRAVEL,
    toKey: toKey, pad: pad,
    getCalendar: getCalendar, saveCalendar: saveCalendar,
    setDateStatus: setDateStatus, getStatus: getStatus,
    getBookings: getBookings, addBooking: addBooking, updateBookingStatus: updateBookingStatus,
    money: money
  };
})();
