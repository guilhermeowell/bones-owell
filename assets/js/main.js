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

    // SCRUB VIDEO PARALLAX
    const video = document.getElementById('hero-video');
    video.pause();
    
    let scrollInit = false;

    const initVideoScroll = () => {
        if (scrollInit) return;
        scrollInit = true;

        // Scrub mapping sem 'pin'. O container #hero é 200vh.
        // Enquanto a janela rola por sobre esses 200vh, o vídeo, que está sticky internamente, fará o scrub.
        // Como não tem pin, a página (e os textos soltos) rola naturalmente, sumindo de vista rápido.
        ScrollTrigger.create({
            trigger: "#hero",
            start: "top top",
            end: "bottom bottom", 
            scrub: 0.5, // Resposta mais ágil/rápida, acelerando o scrub!
            onUpdate: (self) => {
                if (video.duration) {
                    video.currentTime = video.duration * self.progress;
                }
            }
        });
        
        // O texto e botão principal com um leve delay
        gsap.to(".hero-title, .hero-stagger", {
            y: -100,
            ease: "power1.inOut",
            scrollTrigger: {
                trigger: "#hero",
                start: "top -15%", // Leve delay antes de começar o parallax do texto
                end: "bottom top",
                scrub: true
            }
        });
    };

    if (video.readyState >= 1) {
        initVideoScroll();
    } else {
        video.addEventListener('loadedmetadata', initVideoScroll);
        setTimeout(initVideoScroll, 2000); // fallback
    }

    fetch(video.src)
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            video.src = blobUrl;
        })
        .catch(err => console.log('Fetch buffering failed:', err));

    // INIT SWIPER CAROUSEL
    const swiper = new Swiper('.product-swiper', {
        slidesPerView: 1.2,
        spaceBetween: 16,
        grabCursor: true,
        loop: true,
        speed: 800, // Transição mais suave
        freeMode: true, // Scroll contínuo, livre e sedoso, sem estalos
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

});
