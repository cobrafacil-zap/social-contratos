#!/bin/bash
# Executa um JS no Chrome real, na aba cuja URL contém RESEND_TAB_MATCH (padrão: resend.com).
# Uso: ./chrome-js.sh arquivo.js [match]
set -euo pipefail
FILE="$1"
MATCH="${2:-resend.com}"

# Descobre o índice da aba que casa com o padrão e torna ela a ativa da janela.
IDX=$(osascript <<OSA
tell application "Google Chrome"
  set idx to 0
  set found to 0
  repeat with w in windows
    set n to count of tabs of w
    repeat with i from 1 to n
      set u to URL of tab i of w
      if u contains "$MATCH" then
        set found to i
        set active tab index of w to i
        set index of w to 1
        exit repeat
      end if
    end repeat
    if found is not 0 then exit repeat
  end repeat
  return found
end tell
OSA
)

if [ "$IDX" = "0" ]; then
  echo "ERRO: nenhuma aba com '$MATCH' encontrada" >&2
  exit 1
fi

sleep 0.5
osascript <<OSA
tell application "Google Chrome"
  execute active tab of window 1 javascript (read POSIX file "$FILE")
end tell
OSA
