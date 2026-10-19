#!/bin/bash
# Automação do Resend via Chrome real (AppleScript + JavaScript nos Apple Events).
# Requer: Chrome > Visualizar > Desenvolvedor > Permitir o JavaScript do Eventos da Apple
set -euo pipefail

CHROME_JS() {
  osascript -e "tell application \"Google Chrome\" to execute front window's active tab javascript $1"
}

echo "==>abrindo Resend..."
osascript -e 'tell application "Google Chrome" to make new tab at end of tabs of front window with properties {URL:"https://resend.com/signup"}' >/dev/null
sleep 5

# Clica em "Log in with Google"
CHROME_JS "'(() => { const b=[...document.querySelectorAll(\"button,a\")].find(x=>x.textContent.trim()===\"Log in with Google\"); if(b){b.click(); return \"clicou google\"} return \"nao achou\" })()'"
sleep 5

# Se aparecer o seletor de contas do Google, escolhe o primeiro
CHROME_JS "'(() => { const m=document.body.innerText; if(m.includes(\"Choose an account\")||m.includes(\"Escolha uma conta\")){ const el=[...document.querySelectorAll(\"*\")].find(e=>e.children.length===0&&e.textContent&&e.textContent.includes(\"@\")); if(el){el.closest(\"[data-identifier]\")?.click()||el.click(); return \"conta escolhida\"} } return \"sem seletor\" })()'"
sleep 6

# Verifica em que página estamos
CHROME_JS "'location.href + \" | \" + document.title'"

echo "==>conta resend (email):"
CHROME_JS "'(() => { const i=document.querySelector(\"input[name=email],input[type=email]\"); return i ? i.value : \"(sem campo de email)\" })()'"
