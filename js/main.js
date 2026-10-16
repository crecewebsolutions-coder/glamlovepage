/* ===========================================================
   GLAMLOVE — core site behavior
=========================================================== */
(function(){
  "use strict";

  /* Header scroll state */
  var header = document.querySelector('.site-header');
  function onScroll(){
    if(!header) return;
    if(window.scrollY > 30) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }
  document.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  /* Mobile menu */
  var burger = document.querySelector('.hamburger');
  var panel = document.querySelector('.mobile-panel');
  if(burger && panel){
    burger.addEventListener('click', function(){
      var isOpen = panel.classList.toggle('open');
      burger.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    panel.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        panel.classList.remove('open');
        burger.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* Active nav link */
  var path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-panel a').forEach(function(a){
    var href = a.getAttribute('href');
    if(href === path || (path === '' && href === 'index.html')){
      a.classList.add('active');
    }
  });

  /* Scroll reveal */
  var revealEls = document.querySelectorAll('.reveal, .reveal-scale');
  if('IntersectionObserver' in window && revealEls.length){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, {threshold:.14, rootMargin:'0px 0px -60px 0px'});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

  /* Hero load-in */
  var hero = document.querySelector('.hero');
  if(hero){
    requestAnimationFrame(function(){
      setTimeout(function(){ hero.classList.add('loaded'); }, 80);
    });
  }

  /* Accordion (FAQ / Policies) */
  document.querySelectorAll('.accordion-item').forEach(function(item){
    var head = item.querySelector('.accordion-head');
    var body = item.querySelector('.accordion-body');
    if(!head || !body) return;
    head.addEventListener('click', function(){
      var isOpen = item.classList.contains('open');
      // close siblings within same accordion group
      var group = item.closest('.accordion');
      if(group){
        group.querySelectorAll('.accordion-item.open').forEach(function(other){
          if(other !== item){
            other.classList.remove('open');
            other.querySelector('.accordion-body').style.maxHeight = null;
          }
        });
      }
      if(isOpen){
        item.classList.remove('open');
        body.style.maxHeight = null;
      } else {
        item.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  });

  /* Gallery filters, Editorial spotlight & Lightbox modal */
  var chips = document.querySelectorAll('.filter-chip');
  var galleryItems = document.querySelectorAll('.gallery-item');
  var editorialNotice = document.getElementById('editorialNotice');

  function setGalleryFilter(filter){
    chips.forEach(function(c){
      if(c.dataset.filter === filter) c.classList.add('active');
      else c.classList.remove('active');
    });

    if(editorialNotice){
      editorialNotice.style.display = (filter === 'editorial') ? 'flex' : 'none';
    }

    galleryItems.forEach(function(item){
      var match = filter === 'all' || item.dataset.cat === filter;
      if(match){
        item.style.display = '';
        item.style.opacity = '0';
        item.style.transform = 'scale(0.97)';
        requestAnimationFrame(function(){
          item.style.transition = 'opacity .4s ease, transform .4s ease';
          item.style.opacity = '1';
          item.style.transform = 'scale(1)';
        });
      } else {
        item.style.display = 'none';
      }
    });
  }

  if(chips.length && galleryItems.length){
    chips.forEach(function(chip){
      chip.addEventListener('click', function(){
        setGalleryFilter(chip.dataset.filter);
      });
    });

    // Check URL hash (#editorial)
    if(window.location.hash === '#editorial'){
      setGalleryFilter('editorial');
      var filterSection = document.querySelector('.filter-row');
      if(filterSection){
        setTimeout(function(){
          filterSection.scrollIntoView({behavior:'smooth', block:'start'});
        }, 150);
      }
    }
  }

  /* Luxury Lightbox & Placeholder Dialog (Global for all pages) */
  var lightbox = document.getElementById('galleryLightbox');
  if(!lightbox){
    var lbDiv = document.createElement('div');
    lbDiv.className = 'gallery-lightbox';
    lbDiv.id = 'galleryLightbox';
    lbDiv.setAttribute('role', 'dialog');
    lbDiv.setAttribute('aria-modal', 'true');
    lbDiv.setAttribute('aria-label', 'Photograph image preview');
    lbDiv.innerHTML = [
      '<div class="lightbox-backdrop"></div>',
      '<div class="lightbox-container">',
      '  <button class="lightbox-close" aria-label="Cerrar (Esc)">&times;</button>',
      '  <button class="lightbox-arrow lightbox-prev" aria-label="Fotografía anterior">&#10094;</button>',
      '  <button class="lightbox-arrow lightbox-next" aria-label="Fotografía siguiente">&#10095;</button>',
      '  <div class="lightbox-figure">',
      '    <img src="" alt="" class="lightbox-image" id="lightboxImage">',
      '    <div class="lightbox-caption">',
      '      <span class="lightbox-tag" id="lightboxTag">Editorial</span>',
      '      <p class="lightbox-title" id="lightboxTitle"></p>',
      '      <span class="lightbox-counter" id="lightboxCounter"></span>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');
    document.body.appendChild(lbDiv);
    lightbox = lbDiv;
  }

  var lightboxImg = document.getElementById('lightboxImage');
  var lightboxTag = document.getElementById('lightboxTag');
  var lightboxTitle = document.getElementById('lightboxTitle');
  var lightboxCounter = document.getElementById('lightboxCounter');
  var placeholderModal = document.getElementById('placeholderModal');
  var placeholderModalTitle = document.getElementById('placeholderModalTitle');
  var placeholderModalDesc = document.getElementById('placeholderModalDesc');

  var currentImgList = [];
  var currentIndex = 0;

  function showLightbox(index){
    if(!currentImgList.length) return;
    if(index < 0) index = currentImgList.length - 1;
    if(index >= currentImgList.length) index = 0;
    currentIndex = index;
    var cur = currentImgList[currentIndex];
    if(lightboxImg){
      lightboxImg.classList.remove('zoomed');
      lightboxImg.src = cur.src;
      lightboxImg.alt = cur.alt || 'GlamLove Salon By Maritza';
    }
    if(lightboxTag) lightboxTag.textContent = cur.tag || 'GlamLove Editorial';
    if(lightboxTitle) lightboxTitle.textContent = cur.alt || 'Fotografía de Alta Definición';
    if(lightboxCounter){
      if(currentImgList.length > 1){
        lightboxCounter.style.display = 'inline';
        lightboxCounter.textContent = (currentIndex + 1) + ' / ' + currentImgList.length;
      } else {
        lightboxCounter.style.display = 'none';
      }
    }
    var prevBtn = lightbox.querySelector('.lightbox-prev');
    var nextBtn = lightbox.querySelector('.lightbox-next');
    if(prevBtn) prevBtn.style.display = currentImgList.length > 1 ? 'flex' : 'none';
    if(nextBtn) nextBtn.style.display = currentImgList.length > 1 ? 'flex' : 'none';

    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox(){
    if(lightboxImg) lightboxImg.classList.remove('zoomed');
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Toggle 1.42x Zoom when clicking directly on the lightbox image
  if(lightboxImg){
    lightboxImg.addEventListener('click', function(e){
      e.stopPropagation();
      lightboxImg.classList.toggle('zoomed');
    });
  }

  // Helper to open an image in lightbox and optionally build playlist from related page images
  function openInLightbox(targetSrc, targetAlt, targetTag){
    var candidateEls = document.querySelectorAll('.gallery-item:not(.placeholder-slot) img, .zoomable, .img-frame img, .project-media img, .editorial-lead-media img, .editorial-grid-col img');
    var list = [];
    var seen = {};

    candidateEls.forEach(function(el){
      var src = el.getAttribute('data-zoom-src') || el.getAttribute('src');
      if(!src && el.style && el.style.backgroundImage){
        var match = el.style.backgroundImage.match(/url\(["']?([^"']+)["']?\)/);
        if(match) src = match[1];
      }
      if(src && !seen[src]){
        seen[src] = true;
        var alt = el.getAttribute('data-zoom-title') || el.getAttribute('alt') || 'GlamLove Salon';
        var tag = el.getAttribute('data-zoom-tag');
        if(!tag){
          var parentTag = el.closest('.gallery-item') ? el.closest('.gallery-item').querySelector('.tag') : null;
          tag = parentTag ? parentTag.textContent : (el.closest('.project-card') ? 'Special Project' : 'Portfolio');
        }
        list.push({ src: src, alt: alt, tag: tag });
      }
    });

    if(!list.length || !seen[targetSrc]){
      list.push({ src: targetSrc, alt: targetAlt || 'GlamLove Salon', tag: targetTag || 'Portfolio' });
    }

    currentImgList = list;
    var targetIdx = currentImgList.findIndex(function(item){ return item.src === targetSrc; });
    showLightbox(targetIdx >= 0 ? targetIdx : 0);
  }

  // Bind Gallery Items
  if(typeof galleryItems !== 'undefined' && galleryItems.length){
    galleryItems.forEach(function(item){
      if(item.classList.contains('placeholder-slot')){
        item.addEventListener('click', function(){
          var title = item.querySelector('.placeholder-title');
          var desc = item.querySelector('.placeholder-desc');
          var num = item.querySelector('.placeholder-num');
          if(placeholderModal && placeholderModalTitle && placeholderModalDesc){
            placeholderModalTitle.textContent = (num ? num.textContent + ' — ' : '') + (title ? title.textContent : 'Open Slot');
            placeholderModalDesc.textContent = (desc ? desc.textContent : '') + ' — This space is reserved for an upcoming photograph from the Editorial Bridal collection by GlamLove Salon By Maritza.';
            placeholderModal.classList.add('open');
            document.body.style.overflow = 'hidden';
          }
        });
      } else {
        item.addEventListener('click', function(e){
          e.preventDefault();
          var img = item.querySelector('img');
          var tag = item.querySelector('.tag');
          if(img){
            openInLightbox(img.getAttribute('src'), img.getAttribute('alt'), tag ? tag.textContent : 'Editorial');
          }
        });
      }
    });
  }

  // Bind site-wide zoomable images (.zoomable, .img-frame img, .project-media img, .breadcrumb-media)
  var zoomTriggers = document.querySelectorAll('.zoomable, .img-frame img, .project-media img, .breadcrumb-media');
  zoomTriggers.forEach(function(trigger){
    if(trigger.closest('.gallery-item')) return;

    trigger.addEventListener('click', function(e){
      e.preventDefault();
      var src = trigger.getAttribute('data-zoom-src') || trigger.getAttribute('src');
      if(!src && trigger.style && trigger.style.backgroundImage){
        var match = trigger.style.backgroundImage.match(/url\(["']?([^"']+)["']?\)/);
        if(match) src = match[1];
      }
      if(!src){
        var childImg = trigger.querySelector('img');
        if(childImg) src = childImg.getAttribute('src');
      }
      if(src){
        var title = trigger.getAttribute('data-zoom-title') || trigger.getAttribute('alt');
        if(!title){
          var cImg = trigger.querySelector('img');
          if(cImg) title = cImg.getAttribute('alt');
        }
        var tag = trigger.getAttribute('data-zoom-tag') || (trigger.closest('.project-card') ? 'Special Project' : 'GlamLove Portfolio');
        openInLightbox(src, title, tag);
      }
    });
  });

  var closeBtn = lightbox.querySelector('.lightbox-close');
  var backdrop = lightbox.querySelector('.lightbox-backdrop');
  var prevBtn = lightbox.querySelector('.lightbox-prev');
  var nextBtn = lightbox.querySelector('.lightbox-next');

  if(closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if(backdrop) backdrop.addEventListener('click', closeLightbox);
  if(prevBtn) prevBtn.addEventListener('click', function(e){ e.stopPropagation(); showLightbox(currentIndex - 1); });
  if(nextBtn) nextBtn.addEventListener('click', function(e){ e.stopPropagation(); showLightbox(currentIndex + 1); });

  document.addEventListener('keydown', function(e){
    if(lightbox.classList.contains('open')){
      if(e.key === 'Escape') closeLightbox();
      if(e.key === 'ArrowLeft') showLightbox(currentIndex - 1);
      if(e.key === 'ArrowRight') showLightbox(currentIndex + 1);
    } else if(placeholderModal && placeholderModal.classList.contains('open')){
      if(e.key === 'Escape'){
        placeholderModal.classList.remove('open');
        document.body.style.overflow = '';
      }
    }
  });

  if(placeholderModal){
    var pClose = placeholderModal.querySelector('.placeholder-close');
    var pBackdrop = placeholderModal.querySelector('.placeholder-backdrop');
    var pBtn = placeholderModal.querySelector('.js-close-placeholder');
    function closePlaceholderModal(){
      placeholderModal.classList.remove('open');
      document.body.style.overflow = '';
    }
    if(pClose) pClose.addEventListener('click', closePlaceholderModal);
    if(pBackdrop) pBackdrop.addEventListener('click', closePlaceholderModal);
    if(pBtn) pBtn.addEventListener('click', closePlaceholderModal);
  }

  /* Animated stat counters */
  var counters = document.querySelectorAll('.js-counter');
  if(counters.length && 'IntersectionObserver' in window){
    var counterIO = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          animateCounter(entry.target);
          counterIO.unobserve(entry.target);
        }
      });
    }, {threshold:.6});
    counters.forEach(function(c){ counterIO.observe(c); });
  } else {
    counters.forEach(function(c){ c.textContent = c.dataset.target; });
  }
  function animateCounter(el){
    var target = parseInt(el.dataset.target, 10) || 0;
    var duration = 1400;
    var start = null;
    function step(ts){
      if(!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target);
      if(progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  /* Footer year */
  document.querySelectorAll('.js-year').forEach(function(el){
    el.textContent = new Date().getFullYear();
  });

})();
