/* ===========================================================
   GLAMLOVE — Google Calendar availability source
   ------------------------------------------------------------
   HOW THIS WORKS FOR MARITZA (no custom login, no admin clicking):
   1. She keeps a Google Calendar (any Google account) called
      something like "GlamLove Availability".
   2. On days she wants to open for booking, she adds an all-day
      event titled "Available". To close a day she has open, she
      either deletes that event or adds one titled "Unavailable".
      A day with an event titled "Booked" shows as booked/gold.
   3. That's it — she manages her calendar exactly like she
      already manages personal appointments in the Google
      Calendar app on her phone. The website reads it automatically.

   SETUP (one-time, done by Maritza or a developer):
   1. Make the calendar public: Google Calendar -> Settings ->
      [calendar name] -> "Access permissions" -> check
      "Make available to public" (Free/busy or full details).
   2. Copy the Calendar ID from Settings -> "Integrate calendar".
   3. Get a Google Cloud API key with the Calendar API enabled,
      restricted to your website's domain (HTTP referrer
      restriction) and to the Calendar API only. This key is
      safe to expose in client-side code once restricted this way.
   4. Paste both values into GCAL_CONFIG below and set
      enabled: true.

   Until this is configured, the site automatically falls back to
   a local demo calendar so every page stays fully clickable.
=========================================================== */
window.GCAL_CONFIG = {
  enabled: true,
  apiKey: "AIzaSyCzltQ4iNzD0DUycspAGGIGnoWGjodgYlQ",
  calendarId: "casaemma123456@gmail.com",
  embedUrl: "https://calendar.google.com/calendar/embed?src=casaemma123456%40gmail.com&ctz=America%2FPhoenix"
};

window.GL_GCAL = (function(){
  "use strict";

  var cache = {}; // "YYYY-M" -> {statusMap, source}

  function isConfigured(){
    var c = window.GCAL_CONFIG;
    return !!(c && c.enabled && c.apiKey && c.calendarId &&
      c.apiKey.indexOf('PASTE_') !== 0 && c.calendarId.indexOf('PASTE_') !== 0);
  }

  function classify(summary){
    var s = (summary || '').toLowerCase().trim();

    // 1. Explicitly unavailable / blocked / closed
    if(s.indexOf('no disponib') > -1 || s.indexOf('unavailab') > -1 ||
       s.indexOf('not availab') > -1 || s.indexOf('bloquead') > -1 ||
       s.indexOf('block') > -1 || s.indexOf('cerrad') > -1 ||
       s.indexOf('closed') > -1 || s.indexOf('vacacion') > -1 ||
       s.indexOf('vacation') > -1 || s.indexOf('personal') > -1 ||
       s.indexOf('day off') > -1 || s === 'off') {
      return 'unavailable';
    }

    // 2. Explicitly open / available dates (MUST check before generic booked words!)
    // Matches: "Disponibilidad", "Disponibilidad GlamLove", "Disponible", "Available", "Availability", "Open", "Libre", "Free"
    if(s.indexOf('disponib') > -1 || s.indexOf('availab') > -1 ||
       s.indexOf('libre') > -1 || s.indexOf('open') > -1 ||
       s.indexOf('free') > -1) {
      return 'available';
    }

    // 3. Pending requests
    if(s.indexOf('pendiente') > -1 || s.indexOf('solicitad') > -1 ||
       s.indexOf('requested') > -1 || s.indexOf('pending') > -1) {
      return 'requested';
    }

    // 4. Booked dates (weddings, appointments, confirmed bookings)
    if(s.indexOf('reservad') > -1 || s.indexOf('agendad') > -1 ||
       s.indexOf('booked') > -1 || s.indexOf('reserved') > -1 ||
       s.indexOf('boda') > -1 || s.indexOf('wedding') > -1 ||
       s.indexOf('cita') > -1 || s.indexOf('appointment') > -1 ||
       s.indexOf('quince') > -1 || s.indexOf('evento') > -1 ||
       s.indexOf('event') > -1 || s.indexOf('busy') > -1 ||
       s.indexOf('ocupad') > -1) {
      return 'booked';
    }

    // Any other calendar event means date is occupied
    return 'booked';
  }

  function pad(n){ return n < 10 ? '0'+n : ''+n; }
  function toKey(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }

  // Parses a Google Calendar date. All-day events come back as plain
  // "YYYY-MM-DD" strings, which `new Date(str)` treats as UTC midnight —
  // that shifts the date backward by a day in any timezone behind UTC
  // (like Arizona). We parse the Y/M/D parts directly instead, so the
  // date always lands on the correct LOCAL day.
  function parseGCalDate(dateOnly, dateTime){
    if(dateOnly){
      var parts = dateOnly.split('-');
      return new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
    }
    return new Date(dateTime);
  }

  function fetchMonth(year, monthIndex){
    var cacheKey = year+'-'+monthIndex;
    if(cache[cacheKey]) return Promise.resolve(cache[cacheKey]);

    if(!isConfigured()){
      var demoResult = {statusMap: null, source:'demo'};
      cache[cacheKey] = demoResult;
      return Promise.resolve(demoResult);
    }

    var timeMin = new Date(year, monthIndex, 1).toISOString();
    var timeMax = new Date(year, monthIndex + 1, 1).toISOString();
    var url = 'https://www.googleapis.com/calendar/v3/calendars/' +
      encodeURIComponent(window.GCAL_CONFIG.calendarId) + '/events' +
      '?key=' + encodeURIComponent(window.GCAL_CONFIG.apiKey) +
      '&timeMin=' + encodeURIComponent(timeMin) +
      '&timeMax=' + encodeURIComponent(timeMax) +
      '&singleEvents=true&orderBy=startTime&maxResults=250';

    return fetch(url)
      .then(function(res){
        if(!res.ok) throw new Error('Google Calendar request failed: ' + res.status);
        return res.json();
      })
      .then(function(data){
        var statusMap = {};
        (data.items || []).forEach(function(ev){
          var status = classify(ev.summary);
          if(!status) return;
          var startStr = ev.start && (ev.start.date || ev.start.dateTime);
          var endStr = ev.end && (ev.end.date || ev.end.dateTime);
          if(!startStr) return;
          var start = parseGCalDate(ev.start.date, ev.start.dateTime);
          var end = endStr ? parseGCalDate(ev.end && ev.end.date, ev.end && ev.end.dateTime) : new Date(start);
          var cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          var stop = ev.start.date
            ? new Date(end.getFullYear(), end.getMonth(), end.getDate())
            : new Date(cur.getFullYear(), cur.getMonth(), cur.getDate()+1);
          while(cur < stop){
            statusMap[toKey(cur)] = status;
            cur.setDate(cur.getDate()+1);
          }
        });
        var result = {statusMap: statusMap, source:'google'};
        cache[cacheKey] = result;
        return result;
      })
      .catch(function(err){
        console.warn('GlamLove: could not reach Google Calendar, using local demo data instead.', err);
        var errResult = {statusMap: null, source:'error'};
        cache[cacheKey] = errResult;
        return errResult;
      });
  }

  return { fetchMonth: fetchMonth, isConfigured: isConfigured };
})();
