/* Movimento do dossiê.

   Personalidade: contida e sem overshoot, porque o assunto não comporta
   bounce. Uma curva de assinatura (expo.out) para chegadas; "none" só onde
   a rolagem é o relógio. Cada cena anima a ideia do seu capítulo:
   - abertura: as duas metades da pergunta se afastam e a distância é medida;
   - pilha: as privações se acumulam na mesma família (CSS sticky);
   - rota: a linha desce da lavoura ao mercado e o preço vai se formando;
   - grade: 28 quadrados viram 24 entre 2023 e 2024;
   - fecho: a pergunta do começo é riscada e completada;
   - créditos: o fio desce pelo rolo e a medida da abertura volta sob o nome.
   Texto corrido nunca anima. Sem GSAP ou com movimento reduzido, tudo fica
   no estado final. */
(function () {
  "use strict";

  const root = document.documentElement;
  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.remove("js");
    return;
  }

  const temSplit = typeof window.SplitText !== "undefined";
  gsap.registerPlugin(ScrollTrigger);
  if (temSplit) gsap.registerPlugin(SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.defaults({ ease: "expo.out", duration: 0.8 });

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const cor = (v) => getComputedStyle(root).getPropertyValue(v).trim();

  /* ------------------------------------------------------------------
     Barra: progresso, marcas de capítulo na régua, capítulo atual e
     material. Roda sempre, com qualquer preferência de movimento.
     ------------------------------------------------------------------ */
  function barra() {
    const el = $("[data-barra]");
    const prog = $("[data-progresso]");
    const marcas = $("[data-marcas]");
    const atual = $("[data-atual]");
    if (!el || !prog) return;

    const links = $$(".indice a");
    const secoes = links
      .map((link) => {
        const alvo = $(link.getAttribute("href"));
        if (!alvo) return null;
        const n = link.querySelector("span").textContent.trim();
        return { link, alvo, n, nome: link.textContent.replace(n, "").trim(), topo: 0 };
      })
      .filter(Boolean);

    /* trechos em que a barra fica sobre a tinta; nos cortes, a metade escura */
    const tintas = $$('[data-mat="tinta"], .corte').map((alvo) => ({ alvo, a: 0, b: 0 }));

    marcas.innerHTML = secoes.map(() => "<i></i>").join("");
    const ticks = $$("i", marcas);
    const setProg = gsap.quickSetter(prog, "scaleX");

    function medir() {
      const y = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      secoes.forEach((s, i) => {
        s.topo = s.alvo.getBoundingClientRect().top + y;
        ticks[i].style.left = Math.min(100, Math.max(0, (s.topo / max) * 100)) + "%";
      });
      tintas.forEach((t) => {
        const r = t.alvo.getBoundingClientRect();
        const topo = r.top + y;
        if (t.alvo.classList.contains("corte--escurece")) {
          t.a = topo + r.height / 2;
          t.b = topo + r.height;
        } else if (t.alvo.classList.contains("corte--clareia")) {
          t.a = topo;
          t.b = topo + r.height / 2;
        } else if (t.alvo.classList.contains("corte")) {
          t.a = t.b = -1;
        } else {
          t.a = topo;
          t.b = topo + r.height;
        }
      });
    }

    let marcado;
    let emTinta;
    function posicionar() {
      const y = window.scrollY;
      const meio = y + window.innerHeight * 0.4;
      let s = null;
      for (const sec of secoes) if (meio >= sec.topo) s = sec;
      if (s !== marcado) {
        marcado = s;
        secoes.forEach((x) =>
          x === s ? x.link.setAttribute("aria-current", "true") : x.link.removeAttribute("aria-current")
        );
        atual.innerHTML = s ? (s.n ? "<span>" + s.n + "</span>" : "") + s.nome : "";
      }
      const sob = y + el.offsetHeight / 2;
      const t = tintas.some((x) => sob >= x.a && sob < x.b);
      if (t !== emTinta) {
        emTinta = t;
        el.classList.toggle("em-tinta", t);
      }
    }

    medir();
    posicionar();
    ScrollTrigger.addEventListener("refresh", () => {
      medir();
      posicionar();
    });
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        setProg(self.progress);
        posicionar();
      }
    });
  }

  /* ------------------------------------------------------------------
     Índice de capítulos: disclosure acessível (Esc, clique fora, foco).
     ------------------------------------------------------------------ */
  function indice() {
    const botao = $("[data-indice-abre]");
    const nav = $("[data-indice]");
    if (!botao || !nav) return;

    function esc(e) {
      if (e.key === "Escape") fechar(true);
    }
    function fora(e) {
      if (!nav.contains(e.target) && !botao.contains(e.target)) fechar(false);
    }
    function abrir() {
      nav.hidden = false;
      botao.setAttribute("aria-expanded", "true");
      ($('a[aria-current="true"]', nav) || $("a", nav)).focus();
      document.addEventListener("keydown", esc);
      document.addEventListener("pointerdown", fora, true);
    }
    function fechar(devolverFoco) {
      if (nav.hidden) return;
      nav.hidden = true;
      botao.setAttribute("aria-expanded", "false");
      document.removeEventListener("keydown", esc);
      document.removeEventListener("pointerdown", fora, true);
      if (devolverFoco) botao.focus();
    }
    botao.addEventListener("click", () => (nav.hidden ? abrir() : fechar(false)));
    /* o foco saiu do índice para outro lugar da página: fecha */
    nav.addEventListener("focusout", (e) => {
      const para = e.relatedTarget;
      if (para && !nav.contains(para) && para !== botao) fechar(false);
    });
    $$("a", nav).forEach((a) => a.addEventListener("click", () => fechar(false)));
  }

  /* Rolagem suave dos links internos. Fica aqui, e não no CSS, porque
     scroll-behavior: smooth quebra a medição do ScrollTrigger. */
  function ancoras() {
    const suave = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        const alvo = id.length > 1 && $(id);
        if (!alvo) return;
        e.preventDefault();
        const barraAlt = $("[data-barra]") ? $("[data-barra]").offsetHeight : 0;
        const topo = alvo.getBoundingClientRect().top + window.scrollY - (id === "#topo" ? 0 : barraAlt);
        window.scrollTo({ top: topo, behavior: suave() ? "smooth" : "auto" });
        history.pushState(null, "", id);
        alvo.setAttribute("tabindex", "-1");
        alvo.focus({ preventScroll: true });
      });
    });
  }

  /* ------------------------------------------------------------------
     ABERTURA
     A entrada anima as linhas de texto e o traço interno; a cena de
     rolagem anima os blocos e o traço externo. Camadas separadas, para
     que uma não atropele a outra se a pessoa rolar durante a entrada.
     ------------------------------------------------------------------ */
  function abertura(desk) {
    const a = $("[data-abre-a]");
    const b = $("[data-abre-b]");
    const traco = $("[data-abre-traco]");
    const tracoIn = $("[data-abre-traco] i");
    const pontas = $$("[data-abre-ponta]");
    const dist = $("[data-abre-distancia]");
    const resto = $("[data-abre-resto]");
    const texto = $("[data-abre-texto]");
    const ir = $("[data-abre-ir]");
    const marca = $(".abre__marca");
    const palco = $("[data-abre-palco]");

    const sa = temSplit ? SplitText.create(a, { type: "lines", mask: "lines", linesClass: "lin" }) : null;
    const sb = temSplit ? SplitText.create(b, { type: "lines", mask: "lines", linesClass: "lin" }) : null;
    gsap.set([a, b], { opacity: 1 });

    /* se a linha do tempo não rodar (aba em segundo plano, rAF travado),
       a abertura não pode ficar em branco */
    const rede = setTimeout(() => root.classList.remove("js"), 4500);

    gsap
      /* curta de propósito: ninguém deve esperar a animação para ler */
      .timeline({ delay: 0.05, onComplete: () => clearTimeout(rede) })
      .to(marca, { opacity: 1, duration: 0.6, ease: "power2.out" })
      .from(sa ? sa.lines : a, { yPercent: 108, duration: 0.95 }, 0.1)
      .to(tracoIn, { scaleX: 1, duration: 0.8, ease: "power3.inOut" }, 0.35)
      .to(pontas, { opacity: 1, duration: 0.3, ease: "power2.out" }, 0.85)
      .from(sb ? sb.lines : b, { yPercent: 108, duration: 1, stagger: 0.08 }, 0.45)
      .to([texto, ir], { opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out" }, 0.4)
      .to(".barra", { autoAlpha: 1, duration: 0.6, ease: "power2.out" }, 1);

    /* a cena de rolagem só existe se a abertura cabe inteira na tela;
       num celular muito baixo, prender a tela esconderia o botão */
    const barraAlt = $("[data-barra]").offsetHeight;
    if (palco.offsetHeight > window.innerHeight - barraAlt - 24) return;

    const abre = $(".abre");
    abre.classList.add("abre--cena");
    const esticar = () => Math.max(1, (window.innerWidth * (desk ? 0.8 : 0.88)) / traco.offsetWidth);
    const cena = gsap.timeline({
      defaults: { ease: "none", duration: 1 },
      scrollTrigger: {
        trigger: ".abre",
        start: "top top",
        end: desk ? "+=80%" : "+=50%",
        pin: true,
        scrub: 0.7,
        invalidateOnRefresh: true
      }
    });
    if (desk) {
      cena.to(a, { x: "-6vw" }, 0).to(b, { x: "6vw" }, 0);
    } else {
      cena.to(a, { y: "-2.5vh" }, 0).to(b, { y: "2.5vh" }, 0);
    }
    cena
      .to(traco, { scaleX: esticar }, 0)
      .to(pontas[0], { x: () => (-(esticar() - 1) * traco.offsetWidth) / 2 }, 0)
      .to(pontas[1], { x: () => ((esticar() - 1) * traco.offsetWidth) / 2 }, 0)
      .fromTo(resto, { opacity: 1 }, { opacity: 0, duration: 0.3 }, 0)
      .fromTo(dist, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, 0.45);
    return () => abre.classList.remove("abre--cena");
  }

  /* títulos de capítulo: as linhas sobem de dentro de uma máscara */
  function titulos() {
    $$("[data-titulo]").forEach((el) => {
      if (!temSplit) {
        gsap.from(el, { y: 24, opacity: 0, duration: 1, scrollTrigger: { trigger: el, start: "top 88%", once: true } });
        return;
      }
      SplitText.create(el, {
        type: "lines",
        mask: "lines",
        linesClass: "lin",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 106,
            duration: 1.05,
            stagger: 0.08,
            scrollTrigger: { trigger: el, start: "top 88%", once: true }
          })
      });
    });
  }

  /* a voz (introduções em itálico) entra em foco, sem subir */
  function vozes() {
    $$("[data-voz]").forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        filter: "blur(6px)",
        duration: 1.2,
        ease: "power2.out",
        clearProps: "filter",
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      });
    });
  }

  /* o fio que atravessa os cortes entre papel e tinta */
  function fios() {
    $$("[data-fio]").forEach((i) => {
      gsap.fromTo(
        i,
        { scaleY: 0 },
        { scaleY: 1, ease: "none", scrollTrigger: { trigger: i.parentElement, start: "top 92%", end: "bottom 40%", scrub: true } }
      );
    });
  }

  function dez() {
    const f = $("[data-dez]");
    if (!f) return;
    gsap
      .timeline({ scrollTrigger: { trigger: f, start: "top 72%", once: true } })
      .from($$(".dez__fila i", f), { scaleY: 0, duration: 1, stagger: 0.05 })
      .from($(".dez__uma", f), { backgroundColor: cor("--linha"), duration: 0.7, ease: "power2.inOut" }, "-=0.2");
  }

  function antesDepois() {
    const f = $("[data-antes-depois]");
    if (!f) return;
    gsap
      .timeline({ scrollTrigger: { trigger: f, start: "top 75%", once: true } })
      .from($(".antes-depois__seta i", f), { scaleX: 0, duration: 0.9, ease: "power3.inOut" })
      .from($(".antes-depois__item--agora", f), { opacity: 0, x: -14, duration: 0.8 }, "-=0.3");
  }

  function mapa() {
    const m = $("[data-mapa]");
    if (!m) return;
    m.classList.add("mapa--espera");
    gsap.from($$(".region", m), {
      opacity: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: "power2.out",
      scrollTrigger: { trigger: m, start: "top 72%", once: true },
      onComplete: () => m.classList.remove("mapa--espera")
    });
    return () => m.classList.remove("mapa--espera");
  }

  function quadros() {
    const f = $("[data-quadros]");
    if (!f) return;
    gsap
      .timeline({ scrollTrigger: { trigger: f, start: "top 72%", once: true } })
      .from($$(".quadro__forma", f), { scale: 0, duration: 1.3, stagger: 0.3 })
      .from($$(".quadro__txt", f), { opacity: 0, duration: 0.6, stagger: 0.3, ease: "power2.out" }, 0.45);
  }

  function rota() {
    const r = $("[data-rota]");
    if (!r) return;
    const trajeto = $(".rota__trajeto", r);
    const paradas = $$("[data-parada]", r);
    r.classList.add("rota--viva");

    gsap.fromTo(
      $("[data-rota-linha]", r),
      { scaleY: 0 },
      { scaleY: 1, ease: "none", scrollTrigger: { trigger: trajeto, start: "top 62%", end: "bottom 62%", scrub: 0.3 } }
    );
    paradas.forEach((p) =>
      ScrollTrigger.create({
        trigger: p,
        start: "top 62%",
        onEnter: () => p.classList.add("chegou"),
        onLeaveBack: () => p.classList.remove("chegou")
      })
    );
    /* o trecho depois da porteira enche entre a porteira e o mercado */
    gsap.fromTo(
      $("[data-rota-fill]", r),
      { "--p": 0 },
      {
        "--p": 1,
        ease: "none",
        scrollTrigger: { trigger: paradas[1], endTrigger: paradas[paradas.length - 1], start: "top 62%", end: "top 62%", scrub: 0.3 }
      }
    );
    return () => {
      r.classList.remove("rota--viva");
      paradas.forEach((p) => p.classList.remove("chegou"));
    };
  }

  function linhaTempo() {
    const f = $("[data-linha-tempo]");
    if (!f) return;
    gsap
      .timeline({ scrollTrigger: { trigger: f, start: "top 80%", once: true } })
      .from($$("li", f), { opacity: 0, y: 12, duration: 0.8, stagger: 0.35, ease: "power2.out" })
      .from($(".linha-tempo__traco i", f), { scaleX: 0, duration: 1.1, ease: "power2.inOut" }, 0.1);
  }

  /* 28 quadrados em 2023, 24 em 2024: a grade fica parada (sticky) e os
     quatro a mais se apagam enquanto a pessoa rola */
  function grade() {
    const g = $("[data-grade100]");
    if (!g) return;
    const extras = $$(".grade100__quadros .extra", g).reverse();
    const ano = $("[data-grade-ano]", g);
    const valor = $("[data-grade-valor]", g);
    g.classList.add("grade100--viva");

    let estado = "";
    const mostra = (is2024) => {
      const e = is2024 ? "2024" : "2023";
      if (e === estado) return;
      estado = e;
      ano.textContent = e;
      valor.textContent = is2024 ? "24,2%" : "27,6%";
      gsap.fromTo([ano, valor], { opacity: 0.2 }, { opacity: 1, duration: 0.45, ease: "power2.out", overwrite: true });
    };
    mostra(false);

    gsap
      .timeline({
        scrollTrigger: {
          trigger: g,
          start: "top 18%",
          end: "bottom 88%",
          scrub: 0.4,
          onUpdate: (self) => mostra(self.progress > 0.55)
        }
      })
      .to({}, { duration: 0.35 })
      .fromTo(
        extras,
        { backgroundColor: cor("--fome-tinta") },
        { backgroundColor: cor("--linha-tinta"), duration: 0.45, stagger: 0.08, ease: "none" }
      )
      .to({}, { duration: 0.35 });

    return () => {
      g.classList.remove("grade100--viva");
      ano.textContent = "2024";
      valor.textContent = "24,2%";
    };
  }

  function espelho() {
    const f = $("[data-espelho]");
    if (!f) return;
    gsap.from($$(".espelho__fam", f), {
      scaleX: 0,
      duration: 1.3,
      stagger: 0.55,
      ease: "power3.out",
      scrollTrigger: { trigger: f, start: "top 75%", once: true }
    });
  }

  function parcelas() {
    const f = $("[data-parcelas]");
    if (!f) return;
    gsap.from($$(".parcelas__barra i", f), {
      scaleX: 0,
      duration: 1.1,
      stagger: 0.08,
      ease: "power3.out",
      scrollTrigger: { trigger: f, start: "top 78%", once: true }
    });
  }

  function raio() {
    const f = $("[data-raio]");
    if (!f) return;
    gsap
      .timeline({ scrollTrigger: { trigger: f, start: "top 70%", once: true } })
      .from($("[data-raio-borda]", f), { strokeDashoffset: 1, duration: 1.6, ease: "power2.inOut" })
      .from($("[data-raio-reta]", f), { strokeDashoffset: 1, duration: 0.7, ease: "power2.out" }, "-=0.5")
      .from($(".raio__rotulo", f), { opacity: 0, duration: 0.5, ease: "power2.out" }, "-=0.3")
      .from($$(".raio__mercado, .raio__mercado + .raio__nome", f), { opacity: 0, duration: 0.5, ease: "power2.out" }, "-=0.2");
  }

  /* a pergunta do começo é riscada, e a nova completa a frase */
  function fecho(desk) {
    const f = $("[data-fecho]");
    if (!f) return;
    const palco = $("[data-fecho-palco]", f);
    const risca = $("[data-fecho-risca]", f);
    const nova = $("[data-fecho-nova]", f);
    const texto = $("[data-fecho-texto]", f);
    const barraAlt = $("[data-barra]").offsetHeight;
    const cabe = palco.offsetHeight < window.innerHeight - barraAlt - 32;

    const tl = gsap.timeline({
      scrollTrigger: cabe
        ? { trigger: f, start: "top top", end: desk ? "+=130%" : "+=90%", pin: true, scrub: 0.6 }
        : { trigger: palco, start: "top 70%", end: "bottom 60%", scrub: 0.6 }
    });
    tl.fromTo(risca, { "--risco": 0, color: cor("--claro") }, { "--risco": 1, duration: 1, ease: "none" })
      .to(risca, { color: cor("--claro-2"), duration: 0.3, ease: "none" }, "-=0.1")
      .fromTo(nova, { opacity: 0, y: 34, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "power2.out" })
      .fromTo(texto, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "none" }, "+=0.05")
      .to({}, { duration: 0.45 });
  }

  /* créditos: o fio acompanha a rolagem; nomes entram um a um */
  function creditos(desk) {
    const c = $("[data-creditos]");
    if (!c) return;
    const fio = $("[data-rolo-fio]", c);
    if (desk && fio) {
      gsap.fromTo(
        fio,
        { scaleY: 0 },
        { scaleY: 1, ease: "none", scrollTrigger: { trigger: $("[data-rolo]", c), start: "top 75%", end: "bottom 75%", scrub: true } }
      );
    }
    $$("[data-rolo-item]", c).forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        y: 22,
        duration: 1,
        scrollTrigger: { trigger: el, start: "top 90%", once: true }
      });
    });

    const nome = $("[data-rolo-nome]", c);
    const medida = $("[data-rolo-medida]", c);
    const tl = gsap.timeline({ scrollTrigger: { trigger: nome, start: "top 82%", once: true } });
    if (temSplit) {
      const partes = SplitText.create(nome, { type: "lines", mask: "lines", linesClass: "lin" });
      tl.from(partes.lines, { yPercent: 106, duration: 1.1, stagger: 0.08 });
    } else {
      tl.from(nome, { opacity: 0, y: 24, duration: 1 });
    }
    tl.from(medida, { scaleX: 0, duration: 1.1, ease: "power3.inOut" }, "-=0.6").from(
      $("i", medida),
      { scaleX: 0, duration: 0.9, ease: "power3.inOut" },
      "<0.15"
    );
  }

  /* ------------------------------------------------------------------ */

  barra();
  indice();
  ancoras();

  gsap.matchMedia().add(
    {
      desk: "(min-width: 48rem) and (prefers-reduced-motion: no-preference)",
      mob: "(max-width: 47.99rem) and (prefers-reduced-motion: no-preference)",
      reduz: "(prefers-reduced-motion: reduce)"
    },
    (ctx) => {
      const { desk, reduz } = ctx.conditions;
      if (reduz) return;

      /* criadas de cima para baixo, na ordem da página, por causa dos pins */
      const limpezas = [];
      limpezas.push(abertura(desk));
      titulos();
      vozes();
      fios();
      dez();
      antesDepois();
      limpezas.push(mapa());
      quadros();
      limpezas.push(rota());
      linhaTempo();
      limpezas.push(grade());
      espelho();
      parcelas();
      raio();
      fecho(desk);
      creditos(desk);

      if (ScrollTrigger.sort) ScrollTrigger.sort();
      return () => limpezas.forEach((fn) => fn && fn());
    }
  );

  /* as fontes mudam a altura do texto; sem isso os gatilhos ficam alguns
     pixels fora do lugar na primeira carga */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
