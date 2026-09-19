export PATH := $(CURDIR)/node_modules/.bin:$(PATH)

.DEFAULT_GOAL := help

.PHONY: help init post shuoshuo publish

help:
	@printf '%s\n' 'make init' 'make post t="标题"' 'make shuoshuo' 'make publish m="说明"'

init:
	@command -v node >/dev/null || { printf '%s\n' '需要 Node.js >=24.11.0'; exit 1; }
	@node -e 'const c=process.versions.node.split(".").map(Number);const m=[24,11,0];for(let i=0;i<3;i++){if((c[i]||0)>m[i])process.exit(0);if((c[i]||0)<m[i]){console.error("需要 Node.js >=24.11.0，当前 "+process.versions.node);process.exit(1);}}'
	npm ci

post:
	@if [ -z "$(t)" ]; then printf '%s\n' 'make post t="标题"'; exit 1; fi
	jasper-content new:post "$(t)"

shuoshuo:
	jasper-content new:shuoshuo

publish:
	jasper-content publish "$(m)"
