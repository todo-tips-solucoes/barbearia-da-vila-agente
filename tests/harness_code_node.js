// Executa o jsCode de um Code node (ja renderizado) com $, $input e $runIndex simulados. Entrada JSON em stdin:
// { js, each, input: [json...], refs: { "Nome do no": [json...] }, runIndex, estado }. Saida: JSON do retorno.
// estado: o que $getWorkflowStaticData devolve; quando vem, a saida e { out, estado } (o no pode alterar o estado).
const fs = require('fs');
const { js, each, input, refs = {}, runIndex = 0, estado } = JSON.parse(fs.readFileSync(0, 'utf8'));
const wrap = (arr) => (arr || []).map((json) => ({ json }));
const $ = (nome) => ({ first: () => wrap(refs[nome])[0], item: wrap(refs[nome])[0], all: () => wrap(refs[nome]) });
const $input = { first: () => wrap(input)[0], item: wrap(input)[0], all: () => wrap(input) };
const out = new Function('$', '$input', '$runIndex', '$getWorkflowStaticData', js)($, $input, runIndex, () => estado);
const saida = each ? out.json : out.map((x) => x.json);
process.stdout.write(JSON.stringify(estado ? { out: saida, estado } : saida));
