/* ===== Vinheta de entrada =====
   O script no começo do <body> já decidiu se ela aparece (uma vez por sessão;
   pra forçar, abra o site com ?intro). Aqui só cuidamos da saída:
   some sozinha depois da escrita, ou na hora com clique, toque ou tecla. */
(function(){
  const el = document.getElementById('intro');
  if(!el) return;
  const DURACAO = 3800;   // ms até começar a sumir (caneta 0,35s→2,95s + pingo até 3,1s + um respiro)
  let saiu = false;

  function sair(){
    if(saiu) return;
    saiu = true;
    el.classList.add('out');
    document.documentElement.classList.remove('intro-on');
    setTimeout(() => el.remove(), 750);
    removeEventListener('keydown', pular);
  }

  const t = setTimeout(sair, DURACAO);
  /* mesma função nos dois: assim o removeEventListener acima consegue tirar o da tecla */
  function pular(){ clearTimeout(t); sair(); }
  el.addEventListener('click', pular);
  addEventListener('keydown', pular, {once:true});
})();
