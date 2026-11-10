/* main.js — scripts globais, carregados em todas as páginas (antes do script da página).
   Ordem: dados → formulário → barra superior → lógica de cada tela. Cada tela só roda quando o
   <body> tem a sua classe (pg-inicio, pg-favoritos, pg-entrar, pg-cliente, pg-profissional,
   pg-analise). */

/* ===== dados.js ===== */
/* dados.js — dados dos profissionais, categorias, favoritos e card (compartilhado por Início e Favoritos) */
var Servicos=(function(){
  var PROS=[
    {id:"cs",ini:"CS",nome:"Carlos Silva",cat:"Elétrica",prof:"Eletricista",bairro:"Vila Mariana",dist:"0,5 km"},
    {id:"as",ini:"AS",nome:"Ana Santos",cat:"Hidráulica",prof:"Encanadora",bairro:"Paraíso",dist:"0,9 km"},
    {id:"jo",ini:"JO",nome:"José Oliveira",cat:"Construção",prof:"Pedreiro",bairro:"Aclimação",dist:"1,2 km"},
    {id:"ml",ini:"ML",nome:"Marcos Lima",cat:"Pintura",prof:"Pintor",bairro:"Saúde",dist:"1,6 km"}
  ];
  var CATS=[
    ["Elétrica","M13 2L3 14h9l-1 8 10-12h-9l1-8z"],
    ["Hidráulica","M12 3s-6 6.5-6 11a6 6 0 0012 0c0-4.5-6-11-6-11z"],
    ["Construção","M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"],
    ["Pintura","M18 3l3 3-9 9-3-3zM9 12l-4 4c-1 1-1 4-2 5 3 0 4-1 5-2l4-4"],
    ["Limpeza","M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"],
    ["Jardinagem","M11 20A7 7 0 019.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.5 6-7"],
    ["Montagem","M14.7 6.3a4 4 0 005 5l-9.4 9.4a2 2 0 01-3-3z"],
    ["Reparos","M15 12l-8.4 8.4a2 2 0 01-3-3L12 9M9 7l4-4 4 4-4 4z"]
  ];
  var BAIRROS=["Aclimação","Ipiranga","Mooca","Paraíso","Saúde","Vila Mariana"];
  var ICONES={
    estrela:"M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z",
    chat:"M21 11.5a8.4 8.4 0 01-12.4 7.4L3 20.5l1.6-5.4A8.5 8.5 0 1121 11.5z",
    pin:"M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
    casa:"M3 11l9-8 9 8M5 10v10h14V10"
  };

  var favs={};
  try{favs=JSON.parse(localStorage.getItem("favs")||"{}")||{};}catch(e){favs={};}
  function salvar(){try{localStorage.setItem("favs",JSON.stringify(favs));}catch(e){}}
  function ehFav(id){return !!favs[id];}
  function alternarFav(id){if(favs[id])delete favs[id];else favs[id]=1;salvar();return !!favs[id];}

  function norm(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}

  function card(p){
    var on=ehFav(p.id);
    return '<div class="card" data-id="'+p.id+'">'+
      '<div class="av" aria-hidden="true">'+p.ini+'</div>'+
      '<div class="inf"><div class="nmrow"><div class="nm">'+p.nome+'</div>'+
      '<button class="star" type="button" data-star="'+p.id+'" aria-pressed="'+on+'" aria-label="Favoritar '+p.nome+'">'+
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+ICONES.estrela+'"/></svg></button></div>'+
      '<div class="pf">'+p.prof+'</div>'+
      '<div class="lc"><span class="bairro"><svg class="pin" viewBox="0 0 24 24" aria-hidden="true"><path d="'+ICONES.pin+'"/></svg>'+p.bairro+'</span>'+
      '<span class="dist"><span class="sep"> • </span>'+p.dist+'</span></div></div>'+
      '<a class="btn-contato" href="#" aria-label="Contato com '+p.nome+' pelo WhatsApp">'+
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+ICONES.chat+'"/></svg><span>Contato</span></a></div>';
  }

  return {PROS:PROS,CATS:CATS,BAIRROS:BAIRROS,ICONES:ICONES,ehFav:ehFav,alternarFav:alternarFav,norm:norm,card:card};
})();

/* ===== formulario.js ===== */
/* formulario.js — validação e mensagens de erro compartilhadas (Entrar e cadastros).
   Uso: Formulario.validar(form, [{id,rotulo,teste:function(valor){return "mensagem"|null}}]) → true/false */
var Formulario=(function(){
  var ALERTA='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5M12 16h.01M12 21a9 9 0 100-18 9 9 0 000 18z"/></svg>';
  function $(id){return document.getElementById(id);}
  function emailValido(v){return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);}

  function limparCampo(id){
    var c=$(id),e=$("e-"+id);
    if(c){c.removeAttribute("aria-invalid");c.removeAttribute("aria-describedby");}
    if(e){e.hidden=true;e.innerHTML="";}
  }
  function mostrarErro(er){
    var c=$(er.id),e=$("e-"+er.id);
    if(c){c.setAttribute("aria-invalid","true");c.setAttribute("aria-describedby","e-"+er.id);}
    if(e){e.innerHTML=ALERTA+"<span>"+er.msg+"</span>";e.hidden=false;}
  }
  function resumo(form,erros){
    var r=form.querySelector(".sum");if(!r)return;
    if(!erros.length){r.hidden=true;r.innerHTML="";return;}
    r.innerHTML='<h2>'+ALERTA+'Corrija '+erros.length+(erros.length>1?' campos':' campo')+' para continuar</h2><ul>'+
      erros.map(function(x){return '<li><a href="#'+x.id+'" data-campo="'+x.id+'">'+x.rotulo+': '+(x.resumo||x.msg.charAt(0).toLowerCase()+x.msg.slice(1))+'</a></li>';}).join("")+'</ul>';
    r.hidden=false;
  }
  function validar(form,regras){
    var erros=[];
    regras.forEach(function(r){
      limparCampo(r.id);
      var c=$(r.id);
      var v=c.type==="checkbox"?c.checked:c.value.trim();
      var m=r.teste(v);
      if(m)erros.push({id:r.id,rotulo:r.rotulo,msg:m,resumo:r.resumo});
    });
    erros.forEach(mostrarErro);
    resumo(form,erros);
    if(erros.length){var r=form.querySelector(".sum");if(r)r.focus();}
    return erros.length===0;
  }
  /* Ao digitar, some o erro do campo; links do resumo levam ao campo; botão Mostrar/Ocultar senha */
  document.addEventListener("input",function(e){
    var id=e.target.id;if(!id||!$("e-"+id)||$("e-"+id).hidden)return;
    limparCampo(id);
    var form=e.target.closest("form");
    if(form&&!form.querySelector(".err:not([hidden])"))resumo(form,[]);
  });
  document.addEventListener("change",function(e){
    var id=e.target.id;if(id&&$("e-"+id)&&!$("e-"+id).hidden)limparCampo(id);
  });
  document.addEventListener("click",function(e){
    var l=e.target.closest("[data-campo]");
    if(l){e.preventDefault();var c=$(l.getAttribute("data-campo"));if(c)c.focus();return;}
    var b=e.target.closest("[data-mostrar]");
    if(b){
      var campo=$(b.getAttribute("data-mostrar")),mostrar=campo.type==="password";
      campo.type=mostrar?"text":"password";
      b.textContent=mostrar?"Ocultar":"Mostrar";
      b.setAttribute("aria-pressed",mostrar);
      b.setAttribute("aria-label",(mostrar?"Ocultar":"Mostrar")+" senha");
    }
  });
  return {validar:validar,emailValido:emailValido};
})();

/* ===== topbar.js ===== */
/* topbar.js — monta a barra superior (tablet/desktop) e as abas inferiores (mobile).
   Uso: <div id="topbar" data-ativo="inicio|favoritos|" data-tabs="sim|nao"></div> */
(function(){
  var el=document.getElementById("topbar");
  if(!el)return;
  var ativo=el.getAttribute("data-ativo")||"";
  var tabs=el.getAttribute("data-tabs")!=="nao";
  var I=Servicos.ICONES;
  function svg(d){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+d+'"/></svg>';}
  function cur(n){return ativo===n?' aria-current="page"':'';}
  var h='<header class="topbar">'+
    '<a class="topbar-marca" href="index.html"><span class="topbar-logo"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+I.casa+'"/></svg></span>Serviços perto de você</a>'+
    '<nav class="topbar-nav" aria-label="Navegação principal">'+
      '<a class="topbar-link" href="index.html"'+cur("inicio")+'>'+svg(I.casa)+'Início</a>'+
      '<a class="topbar-link topbar-link--fav" href="favoritos.html"'+cur("favoritos")+'>'+svg(I.estrela)+'Favoritos</a>'+
    '</nav>'+
    '<div class="topbar-acoes"><a class="btn btn-s" href="entrar.html">Entrar</a><a class="btn btn-p" href="cadastro-cliente.html">Criar conta</a></div>'+
  '</header>';
  if(tabs){
    h+='<nav class="tabs" aria-label="Navegação principal (celular)">'+
      '<a class="tabs-item" href="index.html"'+cur("inicio")+'>'+svg(I.casa)+'<span>Início</span></a>'+
      '<a class="tabs-item tabs-item--fav" href="favoritos.html"'+cur("favoritos")+'>'+svg(I.estrela)+'<span>Favoritos</span></a>'+
    '</nav>';
    document.body.classList.add("com-tabs");
  }
  el.innerHTML=h;
})();

/* ===== inicio.js ===== */
/* inicio.js — tela Início: categorias, busca, filtro e favoritos */
(function(){
  if(!document.body.classList.contains("pg-inicio"))return;
  var S=Servicos, busca="", catSel=null;
  var $=function(id){return document.getElementById(id);};

  $("cats").innerHTML=S.CATS.map(function(c){
    return '<button type="button" class="cat" data-cat="'+c[0]+'" aria-pressed="false" aria-label="Filtrar por '+c[0]+'">'+
      '<span class="ci"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+c[1]+'"/></svg></span><span class="ct">'+c[0]+'</span></button>';
  }).join("");

  function filtrados(){
    var q=S.norm(busca.trim());
    return S.PROS.filter(function(p){
      var okCat=!catSel||p.cat===catSel;
      var okBusca=!q||S.norm(p.nome+" "+p.prof+" "+p.bairro).indexOf(q)>-1;
      return okCat&&okBusca;
    });
  }

  function render(){
    var lista=filtrados(), ativo=!!catSel||busca.trim()!=="";
    $("lista").innerHTML=lista.map(S.card).join("");
    $("vazio").hidden=lista.length>0;
    $("res").textContent=ativo?"Mostrando "+lista.length+" de "+S.PROS.length+" profissionais"+(catSel?" · "+catSel:""):"";
    $("limpar").hidden=!ativo;
    document.querySelectorAll("[data-cat]").forEach(function(b){
      b.setAttribute("aria-pressed",b.getAttribute("data-cat")===catSel);
    });
  }

  $("q").addEventListener("input",function(e){busca=e.target.value;render();});

  document.addEventListener("click",function(e){
    var ct=e.target.closest("[data-cat]");
    if(ct){var c=ct.getAttribute("data-cat");catSel=catSel===c?null:c;render();return;}
    if(e.target.id==="limpar"){catSel=null;busca="";$("q").value="";render();$("q").focus();return;}
    var st=e.target.closest("[data-star]");
    if(st){
      var id=st.getAttribute("data-star");
      S.alternarFav(id);render();
      var novo=document.querySelector('[data-star="'+id+'"]');if(novo)novo.focus();
      return;
    }
    if(e.target.closest('a[href="#"]'))e.preventDefault();
  });

  render();
})();

/* ===== favoritos.js ===== */
/* favoritos.js — tela Favoritos: lista só os profissionais marcados com a estrela */
(function(){
  if(!document.body.classList.contains("pg-favoritos"))return;
  var S=Servicos, $=function(id){return document.getElementById(id);};

  function render(){
    var lista=S.PROS.filter(function(p){return S.ehFav(p.id);});
    $("lista").innerHTML=lista.map(S.card).join("");
    $("vazio").hidden=lista.length>0;
    return lista.length;
  }

  document.addEventListener("click",function(e){
    var st=e.target.closest("[data-star]");
    if(st){
      S.alternarFav(st.getAttribute("data-star"));
      var restam=render();
      // devolve o foco: primeira estrela restante ou o aviso de lista vazia
      var prox=document.querySelector("[data-star]");
      if(prox)prox.focus();else if(!restam)$("vazio").focus();
      return;
    }
    if(e.target.closest('a[href="#"]'))e.preventDefault();
  });

  render();
})();

/* ===== entrar.js ===== */
/* entrar.js — tela Entrar: validação e envio (protótipo: sem servidor, vai direto ao Início) */
(function(){
  if(!document.body.classList.contains("pg-entrar"))return;
  var form=document.getElementById("form-entrar");
  form.addEventListener("submit",function(e){
    e.preventDefault();
    var ok=Formulario.validar(form,[
      {id:"email",rotulo:"E-mail",resumo:"informe um e-mail válido",teste:function(v){return Formulario.emailValido(v)?null:"Informe um e-mail válido";}},
      {id:"senha",rotulo:"Senha",resumo:"informe sua senha",teste:function(v){return v?null:"Informe sua senha";}}
    ]);
    if(ok)window.location.href="index.html";
  });
})();

/* ===== cadastro-cliente.js ===== */
/* cadastro-cliente.js — cadastro de cliente: bairros, validação e envio (protótipo: vai ao Início) */
(function(){
  if(!document.body.classList.contains("pg-cliente"))return;
  var form=document.getElementById("form-cliente");
  var sel=document.getElementById("bairro");
  Servicos.BAIRROS.forEach(function(b){var o=document.createElement("option");o.value=b;o.textContent=b;sel.appendChild(o);});

  document.querySelectorAll('.chk a[href="#"]').forEach(function(a){a.addEventListener("click",function(e){e.preventDefault();});});

  form.addEventListener("submit",function(e){
    e.preventDefault();
    var ok=Formulario.validar(form,[
      {id:"nome",rotulo:"Nome completo",resumo:"informe seu nome",teste:function(v){return v?null:"Informe seu nome completo";}},
      {id:"email",rotulo:"E-mail",resumo:"informe um e-mail válido",teste:function(v){return Formulario.emailValido(v)?null:"Informe um e-mail válido";}},
      {id:"senha",rotulo:"Senha",resumo:"mínimo de 8 caracteres",teste:function(v){return v.length>=8?null:"A senha precisa ter pelo menos 8 caracteres";}},
      {id:"lgpd",rotulo:"Autorização",resumo:"marque para criar a conta",teste:function(v){return v?null:"Marque esta opção para criar a conta";}}
    ]);
    if(ok)window.location.href="index.html";
  });
})();

/* ===== cadastro-profissional.js ===== */
/* cadastro-profissional.js — cadastro de profissional: listas, máscara do WhatsApp, contador,
   validação e envio (protótipo: vai para "Cadastro em análise") */
(function(){
  if(!document.body.classList.contains("pg-profissional"))return;
  var $=function(id){return document.getElementById(id);};
  var form=$("form-profissional");

  function opcoes(sel,lista){lista.forEach(function(t){var o=document.createElement("option");o.value=t;o.textContent=t;sel.appendChild(o);});}
  opcoes($("categoria"),Servicos.CATS.map(function(c){return c[0];}));
  opcoes($("bairro"),Servicos.BAIRROS);

  /* Máscara (11) 99999-9999 */
  $("whatsapp").addEventListener("input",function(e){
    var d=e.target.value.replace(/\D/g,"").slice(0,11),s=d;
    if(d.length>10)s="("+d.slice(0,2)+") "+d.slice(2,7)+"-"+d.slice(7);
    else if(d.length>6)s="("+d.slice(0,2)+") "+d.slice(2,6)+"-"+d.slice(6);
    else if(d.length>2)s="("+d.slice(0,2)+") "+d.slice(2);
    else if(d.length>0)s="("+d;
    e.target.value=s;
  });

  /* Contador 0/300 */
  $("descricao").addEventListener("input",function(e){$("contador").textContent=e.target.value.length+"/300";});

  document.querySelectorAll('a[href="#"]').forEach(function(a){a.addEventListener("click",function(e){e.preventDefault();});});

  form.addEventListener("submit",function(e){
    e.preventDefault();
    var ok=Formulario.validar(form,[
      {id:"nome",rotulo:"Nome completo",resumo:"informe seu nome",teste:function(v){return v?null:"Informe seu nome completo";}},
      {id:"whatsapp",rotulo:"WhatsApp",resumo:"informe o número com DDD",teste:function(v){var n=v.replace(/\D/g,"").length;return n===10||n===11?null:"Informe o WhatsApp com DDD, ex.: (11) 99999-9999";}},
      {id:"email",rotulo:"E-mail",resumo:"informe um e-mail válido",teste:function(v){return Formulario.emailValido(v)?null:"Informe um e-mail válido";}},
      {id:"senha",rotulo:"Senha",resumo:"mínimo de 8 caracteres",teste:function(v){return v.length>=8?null:"A senha precisa ter pelo menos 8 caracteres";}},
      {id:"categoria",rotulo:"Categoria",resumo:"selecione uma opção",teste:function(v){return v?null:"Selecione uma categoria";}},
      {id:"bairro",rotulo:"Bairro/Distrito",resumo:"selecione uma opção",teste:function(v){return v?null:"Selecione seu bairro ou distrito";}},
      {id:"lgpd",rotulo:"Autorização",resumo:"marque para enviar o cadastro",teste:function(v){return v?null:"Marque esta opção para enviar o cadastro";}}
    ]);
    if(ok)window.location.href="cadastro-analise.html";
  });
})();

/* ===== cadastro-analise.js ===== */
/* cadastro-analise.js — leva o foco ao título para que leitores de tela anunciem a confirmação */
(function(){
  if(!document.body.classList.contains("pg-analise"))return;
  var t=document.getElementById("t-analise");
  if(t)t.focus();
})();

