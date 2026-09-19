.DEFAULT_GOAL := help

.PHONY: help init dev build preview check test test-smoke fonts-fetch

help:
	@printf '%s\n' 'make init' 'make dev' 'make build' 'make preview' 'make check' 'make test' 'make test-smoke' 'make fonts-fetch'

init:
	@command -v node >/dev/null || { printf '%s\n' '需要 Node.js >=24.11.0'; exit 1; }
	@node -e 'const c=process.versions.node.split(".").map(Number);const m=[24,11,0];for(let i=0;i<3;i++){if((c[i]||0)>m[i])process.exit(0);if((c[i]||0)<m[i]){console.error("需要 Node.js >=24.11.0，当前 "+process.versions.node);process.exit(1);}}'
	npm ci

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

check:
	npm run check

test:
	npm test

test-smoke:
	npm run test:browser-smoke

fonts-fetch:
	npm run fonts:fetch
