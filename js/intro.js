/* ===== Vinheta de entrada =====
   O script no começo do <body> já decidiu se ela aparece (uma vez por sessão;
   pra forçar, abra o site com ?intro). Aqui só cuidamos da saída:
   some sozinha depois da escrita, ou na hora com clique, toque ou tecla. */
(function(){
  const el = document.getElementById('intro');
  if(!el) return;
  const DURACAO = 3700;   // ms até começar a sumir (escrita ≈3s + um respiro)
  let saiu = false;

  function sair(){
    if(saiu) return;
    saiu = true;
    el.classList.add('out');
    document.documentElement.classList.remove('intro-on');
    setTimeout(() => el.remove(), 750);
    removeEventListener('keydown', sair);
  }

  const t = setTimeout(sair, DURACAO);
  el.addEventListener('click', () => { clearTimeout(t); sair(); });
  addEventListener('keydown', () => { clearTimeout(t); sair(); }, {once:true});
})();
