/* ===========================================================
   GLAMLOVE — email receipts (client + Maritza)
   ------------------------------------------------------------
   Because this site has no backend server, emails are sent using
   EmailJS (emailjs.com) — a service that lets client-side
   JavaScript send real emails through your own Gmail/Outlook
   account, no server required. Free tier: 200 emails/month.

   WHAT GETS SENT, every time someone submits a booking request:
   1. A receipt to the CLIENT'S email — itemized services, dates,
      and the estimated total, plus the "not confirmed until
      deposit" reminder.
   2. A notification to MARITZA'S email — the same breakdown plus
      full contact info, timeline, allergies, and her message.

   ONE-TIME SETUP (Maritza or a developer, ~10 minutes):
   1. Create a free account at https://www.emailjs.com
   2. Email Services -> Add New Service -> connect the Gmail/Outlook
      account you want these emails to send FROM. Copy its
      "Service ID".
   3. Email Templates -> Create Template -> make one for the CLIENT
      receipt. Use variables like {{to_email}}, {{client_name}},
      {{event_date}}, {{breakdown}}, {{estimated_total}},
      {{confirmation_id}} in the template body. Copy its
      "Template ID".
   4. Create a second template for MARITZA'S notification -- same
      idea, but include {{client_phone}}, {{message}}, etc. Copy
      its "Template ID" too.
   5. Account -> General -> copy your "Public Key".
   6. Paste all 5 values into EMAILJS_CONFIG below and set
      enabled: true.

   Until this is configured, bookings still save normally (see
   js/data.js) -- only the email step is skipped.
=========================================================== */
window.EMAILJS_CONFIG = {
  enabled: false,
  formspreeEndpoint: "https://formspree.io/f/xrpernqo",
  adminEmail: "dayalyn918@gmail.com"
};

window.GL_EMAIL = (function(){
  "use strict";

  var sdkLoaded = false;
  var sdkLoadingPromise = null;

  function isConfigured(){
    var c = window.EMAILJS_CONFIG;
    return !!(c && c.enabled && c.publicKey && c.serviceId && c.clientTemplateId && c.adminTemplateId &&
      c.publicKey.indexOf('PASTE_') !== 0 &&
      c.serviceId.indexOf('PASTE_') !== 0 &&
      c.clientTemplateId.indexOf('PASTE_') !== 0 &&
      c.adminTemplateId.indexOf('PASTE_') !== 0);
  }

  function loadSdk(){
    if(sdkLoaded) return Promise.resolve();
    if(sdkLoadingPromise) return sdkLoadingPromise;
    sdkLoadingPromise = new Promise(function(resolve, reject){
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      script.onload = function(){
        try{
          window.emailjs.init({ publicKey: window.EMAILJS_CONFIG.publicKey });
          sdkLoaded = true;
          resolve();
        }catch(err){ reject(err); }
      };
      script.onerror = function(){ reject(new Error('Could not load EmailJS SDK')); };
      document.head.appendChild(script);
    });
    return sdkLoadingPromise;
  }

  function buildTemplateParams(booking){
    return {
      confirmation_id: booking.id,
      to_email: booking.email,
      client_name: booking.name,
      client_phone: booking.phone,
      client_email: booking.email,
      event_date: booking.dateLabel || booking.date || 'TBD',
      event_type: booking.eventType,
      venue: booking.venue || '\u2014',
      city: booking.city || '\u2014',
      ready_location: booking.readyLocation || '\u2014',
      ready_time: booking.readyTime || '\u2014',
      ceremony_time: booking.ceremonyTime || '\u2014',
      photo_time: booking.photoTime || '\u2014',
      complete_time: booking.completeTime || '\u2014',
      services_summary: booking.servicesSummary,
      breakdown: booking.breakdownText || '',
      estimated_total: 'Estimated Total: ' + (window.GL ? GL.money(booking.estimatedTotal||0) : ('$'+(booking.estimatedTotal||0))),
      allergies: booking.allergies + (booking.allergyDetail ? (' \u2014 ' + booking.allergyDetail) : ''),
      photo_consent: booking.photoConsent ? 'Yes' : 'No',
      message: booking.message || '(no message left)',
      admin_email: window.EMAILJS_CONFIG.adminEmail
    };
  }

  function sendBookingEmails(booking){
    if(!isConfigured()){
      console.info('GlamLove: EmailJS is not configured yet -- skipping email receipts. See js/email.js for setup steps.');
      return Promise.resolve({sent:false, reason:'not-configured'});
    }
    var params = buildTemplateParams(booking);
    var cfg = window.EMAILJS_CONFIG;

    return loadSdk().then(function(){
      var clientSend = window.emailjs.send(cfg.serviceId, cfg.clientTemplateId, params);
      var adminParams = Object.assign({}, params, { to_email: cfg.adminEmail });
      var adminSend = window.emailjs.send(cfg.serviceId, cfg.adminTemplateId, adminParams);
      return Promise.all([clientSend, adminSend]);
    }).then(function(){
      return {sent:true};
    }).catch(function(err){
      console.warn('GlamLove: email receipt failed to send.', err);
      return {sent:false, reason:'error', error:err};
    });
  }

  return { sendBookingEmails: sendBookingEmails, isConfigured: isConfigured };
})();
