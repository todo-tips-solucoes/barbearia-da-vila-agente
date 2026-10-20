// Executa o jsCode de um Code node (ja renderizado) com $, $input e $runIndex simulados. Entrada JSON em stdin:
// { js, each, input: [json...], refs: { "Nome do no": [json...] }, runIndex }. Saida: JSON do retorno.
const fs = require('fs');
const { js, each, input, refs = {}, runIndex = 0 } = JSON.parse(fs.readFileSync(0, 'utf8'));
const wrap = (arr) => (arr || []).map((json) => ({ json }));
const $ = (nome) => ({ first: () => wrap(refs[nome])[0], item: wrap(refs[nome])[0], all: () => wrap(refs[nome]) });
const $input = { first: () => wrap(input)[0], item: wrap(input)[0], all: () => wrap(input) };
const out = new Function('$', '$input', '$runIndex', js)($, $input, runIndex);
process.stdout.write(JSON.stringify(each ? out.json : out.map((x) => x.json)));
