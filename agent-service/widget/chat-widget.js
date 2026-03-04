(function () {
  const script = document.currentScript;
  const AGENT_ID = script.getAttribute("data-agent-id");
  const API_KEY = script.getAttribute("data-api-key");
  const API_URL = script.src.replace("/widget/chat-widget.js", "");
  const TITLE = script.getAttribute("data-title") || "¿En qué te ayudo?";
  const COLOR = script.getAttribute("data-color") || "#4F46E5";

  let sessionId = localStorage.getItem("_agt_sid");
  if (!sessionId) { sessionId = crypto.randomUUID(); localStorage.setItem("_agt_sid", sessionId); }

  const style = document.createElement("style");
  style.textContent = `
    #agt-bubble{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:${COLOR};cursor:pointer;z-index:9999;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.25);}
    #agt-bubble svg{width:26px;height:26px;fill:white;}
    #agt-box{position:fixed;bottom:92px;right:24px;width:360px;max-height:520px;border-radius:16px;background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.15);display:none;flex-direction:column;z-index:9999;font-family:system-ui,sans-serif;overflow:hidden;}
    #agt-header{background:${COLOR};color:#fff;padding:16px;font-weight:600;font-size:15px;}
    #agt-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:200px;max-height:340px;}
    .agt-msg{max-width:80%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.5;}
    .agt-msg.user{background:${COLOR};color:#fff;align-self:flex-end;border-bottom-right-radius:4px;}
    .agt-msg.bot{background:#f3f4f6;color:#111;align-self:flex-start;border-bottom-left-radius:4px;}
    #agt-typing{font-size:12px;color:#6b7280;padding:0 16px 8px;display:none;}
    #agt-input-row{display:flex;padding:12px;gap:8px;border-top:1px solid #e5e7eb;}
    #agt-input{flex:1;border:1px solid #d1d5db;border-radius:8px;padding:8px 12px;font-size:14px;outline:none;}
    #agt-send{background:${COLOR};color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:14px;}
  `;
  document.head.appendChild(style);

  document.body.insertAdjacentHTML("beforeend", `
    <div id="agt-bubble"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></div>
    <div id="agt-box">
      <div id="agt-header">${TITLE}</div>
      <div id="agt-messages"></div>
      <div id="agt-typing">Escribiendo...</div>
      <div id="agt-input-row">
        <input id="agt-input" placeholder="Escribí tu mensaje..." autocomplete="off"/>
        <button id="agt-send">Enviar</button>
      </div>
    </div>
  `);

  const bubble = document.getElementById("agt-bubble"), box = document.getElementById("agt-box"),
    msgs = document.getElementById("agt-messages"), input = document.getElementById("agt-input"),
    send = document.getElementById("agt-send"), typing = document.getElementById("agt-typing");

  let open = false;
  bubble.addEventListener("click", () => {
    open = !open; box.style.display = open ? "flex" : "none";
    if (open && msgs.children.length === 0) addMsg("bot", "Hola 👋 ¿En qué puedo ayudarte?");
  });

  function addMsg(role, text) {
    const d = document.createElement("div"); d.className = `agt-msg ${role}`;
    d.textContent = text; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  }

  async function send_msg() {
    const text = input.value.trim(); if (!text) return;
    input.value = ""; addMsg("user", text);
    typing.style.display = "block"; send.disabled = true;
    try {
      const r = await fetch(`${API_URL}/api/agents/${AGENT_ID}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({ messages: [{ role: "user", content: text }], session_id: sessionId })
      });
      const d = await r.json(); addMsg("bot", d.response);
    } catch { addMsg("bot", "Hubo un error. Intentá de nuevo."); }
    finally { typing.style.display = "none"; send.disabled = false; input.focus(); }
  }

  send.addEventListener("click", send_msg);
  input.addEventListener("keydown", e => { if (e.key === "Enter") send_msg(); });
})();
