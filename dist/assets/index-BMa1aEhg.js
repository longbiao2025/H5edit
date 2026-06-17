(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))o(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const l of s.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&o(l)}).observe(document,{childList:!0,subtree:!0});function n(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function o(r){if(r.ep)return;r.ep=!0;const s=n(r);fetch(r.href,s)}})();function $(t){return/^\s*<!doctype\s+html[\s>]/i.test(t)}function v(t,e){return`${$(e)?`<!doctype html>
`:""}${t.documentElement.outerHTML}`}function V(t){const e=t.replace(/\\/g,"/"),n=e.includes("/")?e.slice(0,e.lastIndexOf("/")+1):"";return n?/^[a-zA-Z]:\//.test(n)?encodeURI(`file:///${n}`):n.startsWith("/")?encodeURI(`file://${n}`):encodeURI(n):""}async function y(t,e={},n){return window.__TAURI_INTERNALS__.invoke(t,e,n)}function U(){return"__TAURI_INTERNALS__"in window}async function q(){return y("open_html_file")}async function W(t,e){return y("save_html_file",{path:t,contents:e})}async function z(t,e){return y("save_html_file_as",{defaultName:t,contents:e})}const X=new Set(["SCRIPT","STYLE","NOSCRIPT","TEMPLATE","HEAD","TITLE","META","LINK","BASE","SVG","MATH","TEXTAREA","SELECT","OPTION"]),k=document.querySelector("#app");if(!k)throw new Error("App root not found.");k.innerHTML=`
  <main class="shell">
    <header class="toolbar">
      <div class="brand">
        <strong>HTML Text Editor</strong>
        <span id="fileLabel">未打开文件</span>
      </div>
      <div class="toolbarActions">
        <button id="openButton" class="primary">打开 HTML</button>
        <button id="saveButton" disabled>保存</button>
        <button id="saveAsButton" disabled>另存为</button>
        <button id="undoButton" title="撤销" disabled>↶</button>
        <button id="redoButton" title="重做" disabled>↷</button>
        <label class="switch">
          <input id="highlightToggle" type="checkbox" checked />
          <span>高亮</span>
        </label>
      </div>
    </header>

    <section class="workspace">
      <section class="previewPane">
        <div id="emptyState" class="emptyState">
          <h1>打开一个 HTML 文件</h1>
          <p>点击页面里的文字，在右侧修改后保存。应用会先备份原文件。</p>
        </div>
        <iframe id="previewFrame" title="HTML 预览"></iframe>
      </section>

      <aside class="editorPane">
        <div class="panelHeader">
          <span>文字编辑</span>
          <small id="textCounter">0 段文字</small>
        </div>
        <label class="field">
          <span>当前文字</span>
          <textarea id="textEditor" disabled placeholder="在左侧预览中点击一段文字"></textarea>
        </label>
        <div class="details">
          <div>
            <span>状态</span>
            <strong id="statusText">等待打开文件</strong>
          </div>
          <div>
            <span>备份</span>
            <strong id="backupText">保存时自动生成</strong>
          </div>
        </div>
      </aside>
    </section>
  </main>
`;const C=a("fileLabel"),j=a("openButton"),H=a("saveButton"),L=a("saveAsButton"),I=a("undoButton"),P=a("redoButton"),B=a("highlightToggle"),G=a("emptyState"),m=a("previewFrame"),c=a("textEditor"),J=a("textCounter"),K=a("statusText"),w=a("backupText");let h="",E="",g="",i=null,u=[],d=null,T=!1,p=[],b=[];j.addEventListener("click",()=>{Y()});H.addEventListener("click",()=>{st()});L.addEventListener("click",()=>{it()});I.addEventListener("click",()=>{M("undo")});P.addEventListener("click",()=>{M("redo")});B.addEventListener("change",()=>{O()});c.addEventListener("input",()=>{if(d===null)return;const t=u[d];if(!t)return;const e=t.node.nodeValue??"",n=c.value;e!==n&&(ot(d,e,n),D(d,n),x(!0))});function a(t){const e=document.getElementById(t);if(!e)throw new Error(`Element #${t} not found.`);return e}async function Y(){if(!U()){f("请在 Tauri 桌面应用中打开文件");return}try{const t=await q();if(!t)return;Z(t)}catch(t){f(_(t))}}function Z(t){h=t.path,E=t.name,g=t.contents,i=new DOMParser().parseFromString(t.contents,"text/html"),d=null,p=[],b=[],c.value="",c.disabled=!0,w.textContent="保存时自动生成",Q(),R(),x(!1),C.textContent=t.name,J.textContent=`${u.length} 段文字`,G.hidden=!0,L.disabled=!1,f("已打开，点击左侧文字开始修改")}function Q(){if(u=[],!(i!=null&&i.body))return;const t=i.createTreeWalker(i.body,NodeFilter.SHOW_TEXT,{acceptNode(n){return F(n)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});let e=t.nextNode();for(;e;)u.push({id:u.length,node:e}),e=t.nextNode()}function F(t){if(!t.nodeValue||t.nodeValue.trim().length===0)return!1;const e=t.parentElement;return e?!e.closest(Array.from(X).join(",")):!1}function R(){if(!i)return;m.addEventListener("load",()=>{et(),O(),d!==null&&S(d)},{once:!0});const t=i.cloneNode(!0);tt(t),m.srcdoc=v(t,g)}function tt(t){if(!h||!t.head)return;const e=V(h);if(!e)return;const n=t.createElement("base");n.href=e,t.head.prepend(n)}function et(){const t=m.contentDocument;if(!(t!=null&&t.body))return;nt(t);const e=t.createTreeWalker(t.body,NodeFilter.SHOW_TEXT,{acceptNode(r){return F(r)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}}),n=[];let o=e.nextNode();for(;o;)n.push(o),o=e.nextNode();n.forEach((r,s)=>{var A;if(s>=u.length)return;const l=t.createElement("span");l.dataset.htmlTextEditorId=String(s),l.className="html-text-editor-target",l.textContent=r.nodeValue,(A=r.parentNode)==null||A.replaceChild(l,r)}),t.addEventListener("click",r=>{var l;const s=(l=r.target)==null?void 0:l.closest("[data-html-text-editor-id]");s&&(r.preventDefault(),r.stopPropagation(),rt(Number(s.dataset.htmlTextEditorId)))},!0)}function nt(t){var n;const e=t.createElement("style");e.textContent=`
    .html-text-editor-target {
      cursor: text !important;
      border-radius: 3px !important;
      transition: box-shadow 120ms ease, background 120ms ease !important;
    }

    body.html-text-editor-highlight .html-text-editor-target {
      box-shadow: 0 0 0 1px rgba(30, 111, 255, 0.42) !important;
      background: rgba(255, 235, 59, 0.18) !important;
    }

    .html-text-editor-target:hover,
    .html-text-editor-target.html-text-editor-selected {
      box-shadow: 0 0 0 2px #1e6fff !important;
      background: rgba(30, 111, 255, 0.14) !important;
    }
  `,(n=t.head)==null||n.append(e)}function rt(t){const e=u[t];e&&(d=t,c.disabled=!1,c.value=e.node.nodeValue??"",c.focus(),c.select(),S(t),f(`正在编辑第 ${t+1} 段文字`))}function S(t){var n;const e=m.contentDocument;e&&(e.querySelectorAll(".html-text-editor-selected").forEach(o=>{o.classList.remove("html-text-editor-selected")}),(n=e.querySelector(`[data-html-text-editor-id="${t}"]`))==null||n.classList.add("html-text-editor-selected"))}function O(){var t,e;(e=(t=m.contentDocument)==null?void 0:t.body)==null||e.classList.toggle("html-text-editor-highlight",B.checked)}function ot(t,e,n){const o=p[p.length-1],r=Date.now();o&&o.id===t&&r-o.at<800?(o.after=n,o.at=r):p.push({id:t,before:e,after:n,at:r}),b=[],N()}function M(t){const e=t==="undo"?p:b,n=t==="undo"?b:p,o=e.pop();if(!o)return;const r=t==="undo"?o.before:o.after;D(o.id,r),n.push({...o,at:Date.now()}),d=o.id,c.disabled=!1,c.value=r,S(o.id),x(!0),N()}function D(t,e){var r;const n=u[t];if(!n)return;n.node.nodeValue=e;const o=(r=m.contentDocument)==null?void 0:r.querySelector(`[data-html-text-editor-id="${t}"]`);o&&(o.textContent=e)}async function st(){if(!(!i||!h))try{const t=v(i,g),e=await W(h,t);g=t,x(!1),w.textContent=e.backup_path||"无",f("已保存")}catch(t){f(_(t))}}async function it(){if(i)try{const t=v(i,g),e=await z(E||"page.html",t);if(!e)return;h=e.path,E=e.path.split(/[\\/]/).pop()??"page.html",g=t,C.textContent=E,w.textContent=e.backup_path||"新文件",x(!1),R(),f("已另存为")}catch(t){f(_(t))}}function x(t){T=t,H.disabled=!i||!h||!T,L.disabled=!i,N(),document.title=`${T?"*":""}HTML Text Editor`}function N(){I.disabled=p.length===0,P.disabled=b.length===0}function f(t){K.textContent=t}function _(t){return t instanceof Error?t.message:String(t)}
