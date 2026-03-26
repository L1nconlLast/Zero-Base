# Seed Minima Sprint 2 - Zero Base MVP v1

## 1. Objetivo da seed
Viabilizar 5 questoes reais por sessao para o primeiro loop funcional da Sprint 2 sem mock e sem tabela paralela.

## 2. Recorte pedagogico
### Modalidade
- ENEM

### Disciplina
- Matematica

### Topico
- Porcentagem

### Justificativa
- ja existe no curriculo seedado do projeto
- combina com a recomendacao inicial default do MVP
- reduz variabilidade na Sprint 2
- facilita validacao funcional de ponta a ponta

Referencia de catalogo existente:
- [20260301000003_seed_enem_curriculum.sql](/abs/path/c:/Users/DELL/Desktop/Zero%20Base/supabase/migrations/20260301000003_seed_enem_curriculum.sql)

## 3. Volume minimo
### Obrigatorio
- 10 questoes validas
- 4 alternativas por questao
- 1 alternativa correta por questao

### Recomendado
- 12 a 15 questoes validas

### Regra
- a sessao do MVP usa 5 questoes
- a seed precisa sobrar questao suficiente para repeticao basica e evitar fragilidade no primeiro teste

## 4. Estrutura exigida
### Tabela `public.questoes`
Campos minimos por questao:
- `topico_id`
- `enunciado`
- `nivel`
- `fonte`
- `ano`
- `explicacao`
- `assunto`
- `ativo`

Valor esperado:
- `assunto = 'Porcentagem'`
- `nivel` entre `facil` e `medio`
- `ativo = true`
- `fonte` curta e identificavel, por exemplo `Seed Sprint 2`

### Tabela `public.alternativas`
Campos minimos por alternativa:
- `questao_id`
- `letra`
- `texto`
- `correta`

Valor esperado:
- letras `A`, `B`, `C`, `D`
- exatamente 1 alternativa com `correta = true` por questao

## 5. Tabelas-alvo
- `public.questoes`
- `public.alternativas`

## 6. Dependencias do catalogo
### Reaproveitar, nao recriar
- `public.modalidades`
- `public.disciplinas`
- `public.topicos`

### Alvo concreto
Usar o topico ja existente:
- modalidade `ENEM`
- disciplina `Matematica`
- topico `Porcentagem`

### Regra
- nao criar nova disciplina
- nao criar novo topico se `Porcentagem` ja existir
- se o topico nao existir no ambiente remoto, corrigir primeiro o catalogo com as migrations ja existentes; nao inventar um catalogo paralelo dentro da seed

## 7. Estrutura de conteudo recomendada
Cada questao deve ter:
- enunciado curto ou medio, suficiente para renderizar bem a UI
- 4 alternativas claras
- 1 correta
- explicacao curta de 1 a 3 frases

### Tipos de problema recomendados
- desconto percentual
- aumento percentual
- percentual de um valor
- variacao percentual entre dois valores
- porcentagem em contexto cotidiano

### O que evitar
- questoes longas demais
- textos com imagens ou anexos
- dependencia de tabela externa
- formulações ambigas

## 8. Migration ou seed alvo
### Caminho recomendado
- `supabase/migrations/<timestamp>_sprint2_seed_matematica_porcentagem.sql`

### Motivo
- garante aplicacao remota idempotente
- evita drift entre local e producao
- deixa a Sprint 2 reprodutivel

### Estrategia de implementacao
1. localizar `topico_id` de `Matematica > Porcentagem`
2. inserir 10 a 15 linhas em `public.questoes`
3. inserir 4 alternativas para cada questao em `public.alternativas`
4. marcar uma unica correta por questao
5. manter a migration idempotente

### Regra de idempotencia
- usar chave de identificacao estavel no texto/enunciado ou `fonte`
- impedir duplicacao em reaplicacoes da migration

## 9. Contrato minimo da seed
### O que a seed precisa habilitar
- `POST /api/study-sessions` consegue selecionar 5 questoes reais
- cada questao chega ao frontend com alternativas reais
- `POST /api/study-sessions/:sessionId/answer` consegue validar resposta contra alternativa correta
- `POST /api/study-sessions/:sessionId/finish` consegue calcular resultado real

### O que a seed nao precisa fazer
- cobrir varias disciplinas
- montar banco ENEM completo
- alimentar recomendacao multi-topico
- escalar conteudo pedagogico alem do loop de estudo

## 10. Criterio de pronto
### Banco
- existem pelo menos 10 questoes ativas em `public.questoes` para `Matematica > Porcentagem`
- cada uma tem pelo menos 4 alternativas validas em `public.alternativas`
- cada questao tem exatamente 1 alternativa correta

### Validacao SQL minima
```sql
select count(*)
from public.questoes q
join public.topicos t on t.id = q.topico_id
join public.disciplinas d on d.id = t.disciplina_id
join public.modalidades m on m.id = d.modalidade_id
where m.nome = 'ENEM'
  and d.nome = 'Matematica'
  and t.nome = 'Porcentagem'
  and q.ativo is true;
```

```sql
select q.id, count(a.*) as total_alternativas
from public.questoes q
left join public.alternativas a on a.questao_id = q.id
join public.topicos t on t.id = q.topico_id
join public.disciplinas d on d.id = t.disciplina_id
join public.modalidades m on m.id = d.modalidade_id
where m.nome = 'ENEM'
  and d.nome = 'Matematica'
  and t.nome = 'Porcentagem'
  and q.ativo is true
group by q.id
having count(a.*) < 4;
```

```sql
select q.id, sum(case when a.correta then 1 else 0 end) as corretas
from public.questoes q
join public.alternativas a on a.questao_id = q.id
join public.topicos t on t.id = q.topico_id
join public.disciplinas d on d.id = t.disciplina_id
join public.modalidades m on m.id = d.modalidade_id
where m.nome = 'ENEM'
  and d.nome = 'Matematica'
  and t.nome = 'Porcentagem'
  and q.ativo is true
group by q.id
having sum(case when a.correta then 1 else 0 end) <> 1;
```

### Gate operacional
- a Sprint 2 so pode comecar se essas queries passarem
- se qualquer uma falhar, corrigir a seed antes de tocar nos endpoints de sessao

## 11. Regras de implementacao
- nao criar tabela paralela de questoes
- nao popular varias disciplinas agora
- nao inflar cobertura pedagogica
- nao misturar seed minima com banco final do produto
- foco exclusivo em habilitar o loop de estudo da Sprint 2

## 12. Prompt base para execucao da seed
```text
Crie a seed minima da Sprint 2 do Zero Base MVP v1 nas tabelas existentes do catalogo.

Objetivo:
habilitar 5 questoes reais por sessao para o loop de estudo da Sprint 2.

Regras:
1. usar exclusivamente public.questoes e public.alternativas
2. usar o catalogo ja existente de ENEM > Matematica > Porcentagem
3. inserir de 10 a 15 questoes validas
4. inserir 4 alternativas por questao
5. marcar exatamente 1 alternativa correta por questao
6. incluir explicacao curta em cada questao
7. manter a migration idempotente
8. nao criar tabela paralela
9. nao expandir para outras disciplinas

Arquivo alvo:
- supabase/migrations/<timestamp>_sprint2_seed_matematica_porcentagem.sql

Criterio de pronto:
o banco remoto precisa conseguir retornar 5 questoes reais validas por sessao para Matematica > Porcentagem, com alternativas suficientes e sem mock.
```
