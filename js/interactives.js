/* A conta do IPM (capítulo 1). Não depende do GSAP: se a animação falhar,
   a ferramenta continua funcionando.

   Pesos e corte do IPM global (PNUD/OPHI): cada dimensão vale 1/3. Saúde e
   Educação têm 2 indicadores (1/6 cada); Padrão de vida tem 6 (1/18 cada).
   Pobre: 1/3 ou mais das privações ponderadas. Vulnerável: de 0,2 a 1/3.
   Pobreza severa: 0,5 ou mais. */
(function () {
  "use strict";

  var raiz = document.getElementById("ipm");
  if (!raiz) return;

  var PESO = { saude: 1 / 6, educacao: 1 / 6, vida: 1 / 18 };
  var CORTE = 1 / 3;
  var EPS = 1e-9;

  var inputs = Array.prototype.slice.call(raiz.querySelectorAll(".chip input"));
  var barra = raiz.querySelector("[data-ipm-fill]");
  var valor = raiz.querySelector("[data-ipm-score]");
  var veredito = raiz.querySelector("[data-ipm-verdict]");
  var limpar = raiz.querySelector("[data-ipm-reset]");
  if (!barra || !valor || !veredito) return;

  function pesoDe(input) {
    return PESO[input.closest(".dim").getAttribute("data-dim")] || 0;
  }

  function atualizar() {
    var score = 0;
    var marcados = 0;
    inputs.forEach(function (i) {
      if (i.checked) {
        score += pesoDe(i);
        marcados++;
      }
    });

    var pct = score * 100;
    barra.style.width = pct.toFixed(1) + "%";
    valor.textContent = pct.toFixed(1).replace(".", ",") + "%";

    var classe = "";
    var texto;
    if (marcados === 0) {
      texto = "Nenhuma privação marcada. Pela régua do IPM, esta família não está em pobreza multidimensional.";
    } else if (score >= 0.5 - EPS) {
      classe = "is-severe";
      texto = "Metade ou mais das privações ponderadas. Pelo IPM, esta família está em pobreza multidimensional severa.";
    } else if (score >= CORTE - EPS) {
      classe = "is-poor";
      texto = "Um terço ou mais das privações ponderadas. Pelo IPM, esta família é pobre, qualquer que seja a renda dela.";
    } else if (score >= 0.2 - EPS) {
      classe = "is-vuln";
      texto = "Entre 20% e um terço. A família não cruza o corte, mas o IPM a considera vulnerável: mais uma privação pode mudar a classificação.";
    } else {
      texto = "Abaixo de 20% das privações ponderadas. Há carências, mas não o bastante para o corte do índice.";
    }

    barra.classList.toggle("is-poor", score >= CORTE - EPS);
    veredito.className = "ipm__veredito" + (classe ? " " + classe : "");
    veredito.textContent = texto;
  }

  inputs.forEach(function (i) {
    i.addEventListener("change", atualizar);
  });
  if (limpar) {
    limpar.addEventListener("click", function () {
      inputs.forEach(function (i) {
        i.checked = false;
      });
      atualizar();
    });
  }
  atualizar();
})();
