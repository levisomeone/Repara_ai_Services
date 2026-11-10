/* dashboard.js — Fila de moderação: busca, aprovar e rejeitar (com motivo) */
(function(){
  var S=Servicos, $=function(id){return document.getElementById(id);};
  var CAD=[
    {id:1,data:"09/10/2026",nome:"Carlos Silva",cat:"Elétrica",bairro:"Vila Mariana",wpp:"(11) 98765-4321",st:"pend"},
    {id:2,data:"10/10/2026",nome:"Ana Santos",cat:"Hidráulica",bairro:"Paraíso",wpp:"(11) 97654-3210",st:"pend"},
    {id:3,data:"11/10/2026",nome:"José Oliveira",cat:"Construção",bairro:"Aclimação",wpp:"(11) 96543-2109",st:"pend"}
  ];
  var busca="", alvo=null;
  var I={
    relogio:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z"/></svg>',
    ok:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
    x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  var ROTULO={pend:["Pendente",I.relogio],apr:["Aprovado",I.ok],rej:["Rejeitado",I.x]};

  function achar(id){return CAD.filter(function(c){return c.id===id;})[0];}

  function linha(c){
    var r=ROTULO[c.st];
    var acoes=c.st==="pend"
      ?'<div class="acoes"><button class="ba" type="button" data-aprovar="'+c.id+'" aria-label="Aprovar cadastro de '+c.nome+'">'+I.ok+'Aprovar</button>'+
       '<button class="br" type="button" data-rejeitar="'+c.id+'" aria-label="Rejeitar cadastro de '+c.nome+'">'+I.x+'Rejeitar</button></div>'
      :'<span class="sec">Analisado</span>';
    return '<tr>'+
      '<td>'+c.data+'</td>'+
      '<td><div class="nome">'+c.nome+'</div><div class="sec so-menor">'+c.wpp+'</div></td>'+
      '<td>'+c.cat+'<div class="sec so-menor">'+c.bairro+'</div></td>'+
      '<td class="so-desktop">'+c.bairro+'</td>'+
      '<td class="so-desktop">'+c.wpp+'</td>'+
      '<td><span class="st st-'+c.st+'" tabindex="-1" id="st-'+c.id+'">'+r[1]+r[0]+'</span></td>'+
      '<td>'+acoes+'</td></tr>';
  }

  function render(){
    var q=S.norm(busca.trim());
    var vis=CAD.filter(function(c){return !q||S.norm(c.nome+" "+c.cat+" "+c.bairro).indexOf(q)>-1;});
    $("linhas").innerHTML=vis.length?vis.map(linha).join(""):'<tr><td colspan="7" style="height:72px;text-align:center;color:var(--text2)">Nenhum cadastro encontrado.</td></tr>';
    $("contagem").textContent=CAD.filter(function(c){return c.st==="pend";}).length;
    $("exibindo").textContent="Exibindo "+vis.length+" de "+CAD.length+" cadastros";
  }

  function concluir(c,st,msg){
    c.st=st;render();
    $("aviso").textContent=msg;
    var n=$("st-"+c.id);if(n)n.focus();
  }

  $("busca").addEventListener("input",function(e){busca=e.target.value;render();});

  document.addEventListener("click",function(e){
    var a=e.target.closest("[data-aprovar]"),r=e.target.closest("[data-rejeitar]");
    if(a){var c=achar(+a.getAttribute("data-aprovar"));concluir(c,"apr","Cadastro de "+c.nome+" aprovado.");return;}
    if(r){alvo=achar(+r.getAttribute("data-rejeitar"));$("mt").textContent="Rejeitar cadastro de "+alvo.nome+"?";$("motivo").value="";$("modal").showModal();return;}
    if(e.target.closest("[data-sem-destino]"))e.preventDefault();
  });

  $("cancelar").addEventListener("click",function(){$("modal").close();});
  $("confirmar").addEventListener("click",function(){
    var c=alvo;$("modal").close();
    if(c){c.motivo=$("motivo").value.trim();concluir(c,"rej","Cadastro de "+c.nome+" rejeitado.");}
  });
  $("modal").addEventListener("click",function(e){if(e.target===$("modal"))$("modal").close();});

  render();
})();
