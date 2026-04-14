// Init Lenis
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    smooth: true
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0, 0);

gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {
    
    // Header animation
    gsap.to('.header-el', {
        opacity: 1,
        y: 0,
        duration: 1,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.1
    });

    // Splitting typography
    const heroText = new SplitType('.hero-title', { types: 'chars, words' });
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    tl.from(heroText.chars, {
        opacity: 0,
        y: 50,
        rotateX: -20,
        stagger: 0.02,
        duration: 1.2,
        delay: 0.2
    })
    .to('.hero-stagger', {
        opacity: 1,
        y: -10,
        stagger: 0.1,
        duration: 1
    }, "-=0.8");

    // SCRUB VIDEO → CANVAS (sem botão de play nativo no iOS)
    const video  = document.getElementById('hero-video');
    const canvas = document.getElementById('hero-canvas');
    const ctx    = canvas.getContext('2d');

    // Dimensiona o canvas ao tamanho real do container
    function resizeCanvas() {
        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Desenha um frame no canvas — object-cover em todos os tamanhos (100% largura)
    function drawVideoFrame() {
        if (video.readyState < 2) return;
        const cw = canvas.width, ch = canvas.height;
        const vw = video.videoWidth, vh = video.videoHeight;
        if (!cw || !ch || !vw || !vh) return;
        const cRatio = cw / ch, vRatio = vw / vh;
        ctx.clearRect(0, 0, cw, ch);
        // object-cover: preenche sem deformar, corta o excesso (sem barras pretas)
        if (vRatio > cRatio) {
            const w = ch * vRatio;
            ctx.drawImage(video, -(w - cw) / 2, 0, w, ch);
        } else {
            const h = cw / vRatio;
            ctx.drawImage(video, 0, -(h - ch) / 2, cw, h);
        }
    }

    // Para o autoplay assim que os metadados carregam, mantendo o primeiro frame visível
    const stopAutoplay = () => {
        video.pause();
        video.currentTime = 0;
    };
    if (video.readyState >= 1) {
        stopAutoplay();
    } else {
        video.addEventListener('loadedmetadata', stopAutoplay, { once: true });
    }

    // Lerp suave: targetTime atualiza no scroll, lerpTime segue com inércia via RAF
    let targetTime = 0;
    let lerpTime   = 0;
    (function rafLoop() {
        requestAnimationFrame(rafLoop);
        if (!video.duration) return;
        lerpTime += (targetTime - lerpTime) * 0.1;
        if (Math.abs(targetTime - lerpTime) > 0.0005) {
            video.currentTime = lerpTime;
        }
        drawVideoFrame();
    })();

    let scrollInit = false;

    const initVideoScroll = () => {
        if (scrollInit) return;
        scrollInit = true;

        ScrollTrigger.create({
            trigger: "#hero",
            start: "top top",
            end: "bottom bottom",
            onUpdate: (self) => {
                if (video.duration > 0) {
                    targetTime = video.duration * self.progress;
                }
            }
        });

        gsap.to(".hero-title, .hero-stagger", {
            y: -100,
            ease: "power1.inOut",
            scrollTrigger: {
                trigger: "#hero",
                start: "top -15%",
                end: "bottom top",
                scrub: true
            }
        });
    };

    if (video.readyState >= 1) {
        initVideoScroll();
    } else {
        video.addEventListener('loadedmetadata', initVideoScroll);
        video.addEventListener('canplay', initVideoScroll);
        setTimeout(initVideoScroll, 3000);
    }

    // INIT SWIPER CAROUSEL
    const swiper = new Swiper('.product-swiper', {
        slidesPerView: 1.2,
        spaceBetween: 16,
        grabCursor: true,
        loop: true,
        speed: 800,
        mousewheel: {
            forceToAxis: true,
            sensitivity: 0.5, // Suaviza o impacto no touchpad do Mac
        },
        navigation: {
            nextEl: '.swiper-button-next-custom',
            prevEl: '.swiper-button-prev-custom',
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        breakpoints: {
            640: {
                slidesPerView: 2,
                spaceBetween: 24,
            },
            1024: {
                slidesPerView: 2,
                spaceBetween: 32,
            }
        }
    });

    // GSAP ANIMATIONS FOR CAROUSEL
    gsap.to(".section-title", {
        y: 0,
        opacity: 1,
        stagger: 0.1,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
            trigger: "#colecao",
            start: "top 80%",
        }
    });

    // Animating Product Cards sequentially on scroll
    ScrollTrigger.batch(".product-card", {
        onEnter: batch => gsap.to(batch, {
            y: 0,
            opacity: 1,
            stagger: 0.15,
            duration: 1.2,
            ease: "power3.out"
        }),
        start: "top 85%"
    });

    // Lookbook Section Animation
    const lookbookText = new SplitType('.lookbook-title', { types: 'words, chars' });
    
    // Parallax subtly on bg image
    gsap.to(".lookbook-bg img", {
        y: -50,
        ease: "none",
        scrollTrigger: {
            trigger: "#lookbook",
            start: "top bottom",
            end: "bottom top",
            scrub: true
        }
    });

    const lookbookTl = gsap.timeline({
        scrollTrigger: {
            trigger: "#lookbook",
            start: "top 60%", // dispara quando topo atingir 60% da tela
        }
    });

    // Animação de entrada sofisticada Lookbook
    lookbookTl.from(".lookbook-bg img", {
        scale: 1.2,
        duration: 2.5,
        ease: "power3.out"
    }, 0)
    .from(".lookbook-bg div", {
        opacity: 1, // Overlay começa forte escuro e clareia pro tom correto
        duration: 2,
        ease: "power2.out"
    }, 0)
    .to(".lookbook-line", {
        scaleX: 1,
        duration: 1,
        ease: "power3.inOut"
    }, 0.3)
    .from(lookbookText.chars, {
        opacity: 0,
        y: 50,
        rotateX: -40,
        scale: 0.9,
        filter: "blur(12px)",
        stagger: 0.03,
        duration: 1.2,
        ease: "back.out(1.4)"
    }, 0.5)
    .from(".lookbook-subtitle", {
        opacity: 0,
        y: 20,
        filter: "blur(5px)",
        duration: 1,
        ease: "power3.out"
    }, "-=0.8");

    // Independently animate the buttons so they cannot be stuck by timeline cascades
    gsap.from(".lookbook-card, .lookbook-right-btn", {
        scrollTrigger: {
            trigger: "#lookbook",
            start: "top 40%"
        },
        y: 40,
        opacity: 0,
        scale: 0.95,
        stagger: 0.15,
        duration: 1.2,
        ease: "back.out(1.2)",
        clearProps: "all"
    });

    // ─── Mobile Lookbook Toggle ────────────────────────────────────────────
    const mobileToggleBtn      = document.getElementById('mobile-toggle-btn');
    const mobileCardsContainer = document.getElementById('mobile-cards-container');
    const mobileChevron        = document.getElementById('mobile-chevron');
    const lookbookOverlay      = document.getElementById('lookbook-dynamic-overlay');

    if (mobileToggleBtn && mobileCardsContainer) {
        const mobileCards = [...mobileCardsContainer.querySelectorAll('.lookbook-card-mobile')];
        const CARD_H  = 60;
        const CARD_GAP = 12;
        let isExpanded = false;

        // GSAP assume controle total dos transforms — inicializa o deck
        mobileCards.forEach((card, i) => {
            gsap.set(card, {
                y:       i * 6,
                scale:   1 - i * 0.03,
                opacity: 1 - i * 0.25
            });
        });

        mobileToggleBtn.addEventListener('click', () => {
            isExpanded = !isExpanded;

            if (isExpanded) {
                // Expande — cards se separam em lista vertical
                const totalH = mobileCards.length * CARD_H + (mobileCards.length - 1) * CARD_GAP;
                gsap.to(mobileCardsContainer, { height: totalH, duration: 0.6, ease: "power3.out" });

                mobileCards.forEach((card, i) => {
                    gsap.to(card, {
                        y:       i * (CARD_H + CARD_GAP),
                        scale:   1,
                        opacity: 1,
                        duration: 0.55,
                        delay:    i * 0.09,
                        ease:    "back.out(1.3)"
                    });
                });

                gsap.to(lookbookOverlay, { opacity: 0.28, duration: 0.5 });
                gsap.to(mobileChevron,   { rotation: 180, duration: 0.4, ease: "power2.inOut" });
                mobileToggleBtn.setAttribute('aria-label', 'Ocultar produtos');

            } else {
                // Colapsa — cards voltam para o deck
                gsap.to(mobileCardsContainer, { height: 76, duration: 0.5, ease: "power2.in", delay: 0.1 });

                mobileCards.forEach((card, i) => {
                    gsap.to(card, {
                        y:       i * 6,
                        scale:   1 - i * 0.03,
                        opacity: 1 - i * 0.25,
                        duration: 0.4,
                        delay:    (mobileCards.length - 1 - i) * 0.07,
                        ease:    "power2.in"
                    });
                });

                gsap.to(lookbookOverlay, { opacity: 0,  duration: 0.4 });
                gsap.to(mobileChevron,   { rotation: 0, duration: 0.4, ease: "power2.inOut" });
                mobileToggleBtn.setAttribute('aria-label', 'Ver produtos');
            }
        });
    }
    // ──────────────────────────────────────────────────────────────────────

});
