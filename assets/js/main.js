// Detect Android — MOV video and Lenis smooth scroll have compatibility issues on Android
const isAndroid = /Android/i.test(navigator.userAgent);

// Init Lenis smooth scroll — disabled on Android (native scroll is more compatible)
let lenis = null;
if (!isAndroid) {
    lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        smooth: true
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0, 0);
}

gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {

    // ─── HEADER ───────────────────────────────────────────────────────────
    gsap.to('.header-el', {
        opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: "power3.out", delay: 0.1
    });

    const siteHeader = document.getElementById('site-header');
    let lastScrollY = 0, headerHidden = false, introTween = null;

    const onScroll = (scrollY) => {
        if (introTween && scrollY > 0) { introTween.kill(); introTween = null; }
        const delta = scrollY - lastScrollY;
        lastScrollY = scrollY;
        if (scrollY < 80) {
            if (headerHidden) { gsap.to(siteHeader, { y: 0, duration: 0.4, ease: 'power2.out' }); headerHidden = false; }
            return;
        }
        if (delta > 0 && !headerHidden) {
            gsap.to(siteHeader, { y: '-110%', duration: 0.35, ease: 'power2.in' });
            headerHidden = true;
        } else if (delta < 0 && headerHidden) {
            gsap.to(siteHeader, { y: 0, duration: 0.4, ease: 'power2.out' });
            headerHidden = false;
        }
    };

    if (lenis) {
        lenis.on('scroll', ({ scroll }) => onScroll(scroll));
    } else {
        window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
    }

    // ─── HERO CTA ─────────────────────────────────────────────────────────
    document.getElementById('hero-cta-btn').addEventListener('click', () => {
        const target = window.innerHeight * 0.6;
        if (lenis) {
            lenis.scrollTo(target, { duration: 1.4, easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t });
        } else {
            window.scrollTo({ top: target, behavior: 'smooth' });
        }
    });

    // ─── VIDEO SETUP ──────────────────────────────────────────────────────
    const videoDesktop = document.getElementById('hero-video');
    const videoMobile  = document.getElementById('hero-video-mobile');
    const heroSection  = document.getElementById('hero');
    const mobileQuery  = window.matchMedia('(max-width: 767px)');
    let activeVideo    = mobileQuery.matches ? videoMobile : videoDesktop;
    const canvas = document.getElementById('hero-canvas');
    const ctx    = canvas.getContext('2d');

    // targetTime/lerpTime para o scroll scrub (desktop/iOS)
    let targetTime = 0, lerpTime = 0, lastDrawn = -1;

    if (isAndroid) {
        // Android: hero simples — vídeo em autoplay/loop, sem canvas, sem scroll scrub
        heroSection.style.height = '100vh';
        canvas.style.display = 'none';
        videoDesktop.preload = 'none';
        videoDesktop.removeAttribute('src');
        Object.assign(videoMobile.style, {
            position: 'absolute', inset: '0', width: '100%', height: '100%',
            objectFit: 'cover', opacity: '1', pointerEvents: 'none'
        });
        videoMobile.autoplay = true;
        videoMobile.loop = true;
        videoMobile.preload = 'auto';
        videoMobile.load();
        videoMobile.play().catch(() => {});
    } else {
        // Não-Android: canvas + scroll scrub
        function resizeCanvas() {
            canvas.width  = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        function drawVideoFrame() {
            if (activeVideo.readyState < 2) return;
            const cw = canvas.width, ch = canvas.height;
            const vw = activeVideo.videoWidth, vh = activeVideo.videoHeight;
            if (!cw || !ch || !vw || !vh) return;
            const cRatio = cw / ch, vRatio = vw / vh;
            ctx.clearRect(0, 0, cw, ch);
            if (vRatio > cRatio) {
                const w = ch * vRatio;
                ctx.drawImage(activeVideo, -(w - cw) / 2, 0, w, ch);
            } else {
                const h = cw / vRatio;
                ctx.drawImage(activeVideo, 0, -(h - ch) / 2, cw, h);
            }
        }

        if (mobileQuery.matches) { videoMobile.preload = 'auto'; videoMobile.load(); }

        const stopOnLoad = (v) => {
            const stop = () => { v.pause(); v.currentTime = 0; };
            if (v.readyState >= 1) stop();
            else v.addEventListener('loadedmetadata', stop, { once: true });
        };
        stopOnLoad(videoDesktop);
        stopOnLoad(videoMobile);

        const drawFirstFrame = () => { if (activeVideo.readyState >= 2) drawVideoFrame(); };
        if (activeVideo.readyState >= 2) drawFirstFrame();
        else {
            activeVideo.addEventListener('canplay',    drawFirstFrame, { once: true });
            activeVideo.addEventListener('loadeddata', drawFirstFrame, { once: true });
        }

        // RAF com lerp suave
        (function rafLoop() {
            requestAnimationFrame(rafLoop);
            if (!activeVideo.duration) return;
            lerpTime += (targetTime - lerpTime) * 0.14;
            if (Math.abs(targetTime - lerpTime) > 0.0005) activeVideo.currentTime = lerpTime;
            if (activeVideo.currentTime !== lastDrawn) { lastDrawn = activeVideo.currentTime; drawVideoFrame(); }
        })();
    }

    if (!isAndroid) {
        function adjustMobileHeroHeight() {
            if (!mobileQuery.matches) return;
            if (!videoDesktop.duration || !videoMobile.duration) return;
            heroSection.style.height = Math.round(200 * videoMobile.duration / videoDesktop.duration) + 'vh';
        }
        function onMobileMetadataReady() { adjustMobileHeroHeight(); if (heroScrollTrigger) ScrollTrigger.refresh(); }
        if (videoMobile.readyState >= 1) onMobileMetadataReady();
        else videoMobile.addEventListener('loadedmetadata', onMobileMetadataReady, { once: true });
        if (!videoDesktop.duration) videoDesktop.addEventListener('loadedmetadata', onMobileMetadataReady, { once: true });

        mobileQuery.addEventListener('change', (e) => {
            activeVideo = e.matches ? videoMobile : videoDesktop;
            targetTime = 0; lerpTime = 0; activeVideo.currentTime = 0;
            if (e.matches) { videoMobile.preload = 'auto'; videoMobile.load(); }
            if (heroScrollTrigger) { heroScrollTrigger.kill(); heroScrollTrigger = null; }
            scrollInit = false;
            heroSection.style.height = '';
            adjustMobileHeroHeight();
            ScrollTrigger.refresh();
            initVideoScroll();
        });
    }

    // ─── HERO TYPOGRAPHY ──────────────────────────────────────────────────
    // Android: pula SplitType (pode crashar o timeline) — anima o título inteiro
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    if (isAndroid) {
        tl.from('.hero-title', { opacity: 0, y: 30, duration: 1, delay: 0.2, immediateRender: false })
          .to('.hero-stagger', { opacity: 1, y: -10, stagger: 0.1, duration: 1 }, "-=0.5");
    } else {
        const heroText  = new SplitType('.hero-title', { types: 'chars, words' });
        const heroChars = (heroText && heroText.chars && heroText.chars.length)
            ? heroText.chars
            : [document.querySelector('.hero-title')];

        tl.from(heroChars, { opacity: 0, y: 50, rotateX: -20, stagger: 0.02, duration: 1.2, delay: 0.2 })
          .to('.hero-stagger', { opacity: 1, y: -10, stagger: 0.1, duration: 1 }, "-=0.8")
          .add(() => {
              const startIntroAdvance = () => {
                  if (!activeVideo.duration || targetTime > 0) return;
                  const proxy = { t: 0 };
                  introTween = gsap.to(proxy, {
                      t: activeVideo.duration * 0.05, duration: 2.5, ease: 'power2.inOut',
                      onUpdate: () => { targetTime = proxy.t; },
                      onComplete: () => { introTween = null; }
                  });
              };
              if (activeVideo.readyState >= 1) startIntroAdvance();
              else activeVideo.addEventListener('loadedmetadata', startIntroAdvance, { once: true });
          });
    }

    // ─── HERO SCROLL TRIGGER ──────────────────────────────────────────────
    let heroScrollTrigger = null, scrollInit = false;

    if (!isAndroid) {
        function initVideoScroll() {
            if (scrollInit) return;
            scrollInit = true;
            heroScrollTrigger = ScrollTrigger.create({
                trigger: "#hero", start: "top top", end: "bottom bottom",
                onUpdate: (self) => {
                    if (activeVideo.duration > 0) {
                        targetTime = Math.min(activeVideo.duration * self.progress, activeVideo.duration - 0.1);
                    }
                }
            });
            gsap.to(".hero-title, .hero-stagger", {
                y: -100, ease: "power1.inOut",
                scrollTrigger: { trigger: "#hero", start: "top -15%", end: "bottom top", scrub: true }
            });
        }

        if (activeVideo.readyState >= 1) {
            initVideoScroll();
        } else {
            activeVideo.addEventListener('loadedmetadata', initVideoScroll, { once: true });
            activeVideo.addEventListener('canplay', initVideoScroll, { once: true });
            setTimeout(initVideoScroll, 3000);
        }
    }

    // ─── SWIPER ───────────────────────────────────────────────────────────
    new Swiper('.product-swiper', {
        slidesPerView: 1.2, spaceBetween: 16, grabCursor: true,
        loop: false, speed: 700,
        centeredSlides: true, centeredSlidesBounds: true,
        mousewheel: { forceToAxis: true, sensitivity: 0.5 },
        navigation: { nextEl: '.swiper-button-next-custom', prevEl: '.swiper-button-prev-custom' },
        pagination: { el: '.swiper-pagination', clickable: true },
        breakpoints: { 640: { slidesPerView: 2.2, spaceBetween: 24 }, 1024: { slidesPerView: 2.2, spaceBetween: 32 } }
    });

    // ─── CAROUSEL ANIMATIONS ──────────────────────────────────────────────
    gsap.to(".section-title", {
        y: 0, opacity: 1, stagger: 0.1, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: "#colecao", start: "top 95%" }
    });
    ScrollTrigger.batch(".product-card", {
        onEnter: batch => gsap.to(batch, { y: 0, opacity: 1, stagger: 0.15, duration: 1.2, ease: "power3.out" }),
        start: "top 100%"
    });

    // ─── LOOKBOOK ANIMATIONS ──────────────────────────────────────────────
    gsap.to(".lookbook-bg img", {
        y: -50, ease: "none",
        scrollTrigger: { trigger: "#lookbook", start: "top bottom", end: "bottom top", scrub: true }
    });

    const lookbookTl = gsap.timeline({
        scrollTrigger: { trigger: "#lookbook", start: "top 60%" }
    });

    const lookbookText = new SplitType('.lookbook-title', { types: 'words, chars' });
    const lookbookChars = (lookbookText && lookbookText.chars && lookbookText.chars.length)
        ? lookbookText.chars
        : [document.querySelector('.lookbook-title')];

    lookbookTl
        .from(".lookbook-bg img", {
            scale: 1.2, duration: 2.5, ease: "power3.out", immediateRender: false
        }, 0)
        .from(".lookbook-bg > div:first-of-type", {
            opacity: 0, duration: 2, ease: "power2.out", immediateRender: false
        }, 0)
        .to(".lookbook-line", { scaleX: 1, duration: 1, ease: "power3.inOut" }, 0.3)
        .from(lookbookChars, {
            opacity: 0, y: 30, rotateX: -40, scale: 0.9, filter: "blur(12px)",
            stagger: 0.03, duration: 1.2, ease: "back.out(1.4)"
        }, 0.5)
        .from(".lookbook-subtitle", {
            opacity: 0, y: 20, filter: "blur(5px)", duration: 1, ease: "power3.out"
        }, "-=0.8");

    gsap.from(".lookbook-card, .lookbook-right-btn", {
        scrollTrigger: { trigger: ".lookbook-card", start: "top 100%" },
        y: 40, opacity: 0, scale: 0.95, stagger: 0.15, duration: 1.2,
        ease: "back.out(1.2)", clearProps: "all", immediateRender: false
    });

    // ─── FEATURES ANIMATIONS ─────────────────────────────────────────────
    gsap.to(".feature-title", {
        y: 0, opacity: 1, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: "#features", start: "top 95%" }
    });
    ScrollTrigger.batch(".feature-card", {
        onEnter: batch => gsap.to(batch, { y: 0, opacity: 1, stagger: 0.15, duration: 1.2, ease: "power3.out" }),
        start: "top 100%"
    });
    gsap.from(".feature-cta", {
        opacity: 0, y: 24, duration: 1.1, ease: "power3.out", immediateRender: false,
        scrollTrigger: { trigger: ".feature-cta", start: "top 90%" }
    });

    // ─── FOOTER ANIMATIONS ────────────────────────────────────────────────
    gsap.from(".footer-logo", {
        opacity: 0, y: 20, duration: 1.2, ease: "power3.out", immediateRender: false,
        scrollTrigger: { trigger: "#site-footer", start: "top bottom" }
    });
    gsap.from(".footer-tagline", {
        opacity: 0, y: 20, duration: 1.2, delay: 0.25, ease: "power3.out", immediateRender: false,
        scrollTrigger: { trigger: "#site-footer", start: "top bottom" }
    });

    // No Android: recalcula posições do ScrollTrigger após layout e imagens carregarem
    if (isAndroid) {
        setTimeout(() => ScrollTrigger.refresh(), 500);
        window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
    }

    // ─── MOBILE LOOKBOOK TOGGLE ───────────────────────────────────────────
    const mobileToggleBtn      = document.getElementById('mobile-toggle-btn');
    const mobileCardsContainer = document.getElementById('mobile-cards-container');
    const mobileChevron        = document.getElementById('mobile-chevron');
    const lookbookOverlay      = document.getElementById('lookbook-dynamic-overlay');

    if (mobileToggleBtn && mobileCardsContainer) {
        const mobileCards = [...mobileCardsContainer.querySelectorAll('.lookbook-card-mobile')];
        const CARD_H = 60, CARD_GAP = 12;
        let isExpanded = false;

        mobileCards.forEach((card, i) => {
            gsap.set(card, { y: i * 6, scale: 1 - i * 0.03, opacity: 1 - i * 0.25 });
        });

        mobileToggleBtn.addEventListener('click', () => {
            isExpanded = !isExpanded;
            if (isExpanded) {
                const totalH = mobileCards.length * CARD_H + (mobileCards.length - 1) * CARD_GAP;
                gsap.to(mobileCardsContainer, { height: totalH, duration: 0.6, ease: "power3.out" });
                mobileCards.forEach((card, i) => {
                    gsap.to(card, { y: i * (CARD_H + CARD_GAP), scale: 1, opacity: 1, duration: 0.55, delay: i * 0.09, ease: "back.out(1.3)" });
                });
                gsap.to(lookbookOverlay, { opacity: 0.28, duration: 0.5 });
                gsap.to(mobileChevron,   { rotation: 180, duration: 0.4, ease: "power2.inOut" });
                mobileToggleBtn.setAttribute('aria-label', 'Ocultar produtos');
            } else {
                gsap.to(mobileCardsContainer, { height: 76, duration: 0.5, ease: "power2.in", delay: 0.1 });
                mobileCards.forEach((card, i) => {
                    gsap.to(card, { y: i * 6, scale: 1 - i * 0.03, opacity: 1 - i * 0.25, duration: 0.4, delay: (mobileCards.length - 1 - i) * 0.07, ease: "power2.in" });
                });
                gsap.to(lookbookOverlay, { opacity: 0,  duration: 0.4 });
                gsap.to(mobileChevron,   { rotation: 0, duration: 0.4, ease: "power2.inOut" });
                mobileToggleBtn.setAttribute('aria-label', 'Ver produtos');
            }
        });
    }

});
