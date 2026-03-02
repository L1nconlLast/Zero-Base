// ============================================================
// src/data/flashcardsBank.ts
// Flashcards para revisão espaçada — Medicina
// ============================================================

import { EXTRA_FLASHCARDS_BANK } from './flashcardsBank.extra';

export interface Flashcard {
  id: string;
  subject: string;
  track?: 'enem' | 'concurso' | 'ambos';
  front: string;
  back: string;
  tags: string[];
}

export const FLASHCARDS_BANK: Flashcard[] = [
  // ── ANATOMIA ──────────────────────────────────────────────
  { id: 'f-anat-01', subject: 'Anatomia', front: 'Qual é o músculo mais largo da região dorsal?', back: 'Grande dorsal (latíssimo do dorso) — origina-se de T7-S5 e insere-se no sulco intertubercular do úmero.', tags: ['músculo', 'dorso'] },
  { id: 'f-anat-02', subject: 'Anatomia', front: 'Qual nervo pode ser lesado em fratura da cabeça do fíbula?', back: 'Nervo fibular comum (peroneal comum) — passa superficialmente pelo colo da fíbula. Lesão causa "pé caído" (drop foot).', tags: ['nervo', 'membro inferior', 'fratura'] },
  { id: 'f-anat-03', subject: 'Anatomia', front: 'O tendão de Aquiles é formado pela fusão de quais músculos?', back: 'Gastrocnêmio (cabeças medial e lateral) + sóleo. Ambos são da região posterior da perna e formam o tendão calcâneo (Aquiles).', tags: ['tendão', 'membro inferior'] },
  { id: 'f-anat-04', subject: 'Anatomia', front: 'Qual é a diferença entre artérias e veias na histologia?', back: 'Artérias: parede mais espessa, túnica média muscular desenvolvida, lúmen menor. Veias: parede mais fina, colabam na fixação, possuem válvulas, lúmen maior.', tags: ['vaso', 'histologia', 'cardiovascular'] },
  { id: 'f-anat-05', subject: 'Anatomia', front: 'Qual é o plexo nervoso que inerva o membro superior?', back: 'Plexo braquial — formado pelas raízes C5-T1. Origina nervos musculocutâneo, mediano, ulnar, radial e axilar.', tags: ['plexo braquial', 'membro superior'] },
  { id: 'f-anat-06', subject: 'Anatomia', front: 'Quais são as partes do intestino delgado?', back: 'Duodeno (25 cm, fixo, retroperitoneal) → Jejuno (~2,5 m) → Íleo (~3,5 m). Total ≈ 6–7 m. A junção jejunoileal se distingue pelo calibre maior e pregas menores.', tags: ['intestino', 'tubo digestivo'] },
  { id: 'f-anat-07', subject: 'Anatomia', front: 'Qual artéria supre o cérebro na região posterior?', back: 'Artérias cerebrais posteriores (ramos do basilar) — suprem occipital, temporal inferior e tálamo. O basilar é formado pela fusão das artérias vertebrais.', tags: ['cerebral', 'artéria', 'polígono de Willis'] },
  { id: 'f-anat-08', subject: 'Anatomia', front: 'Onde se localiza o triângulo femoral (de Scarpa)?', back: 'Face anterior superior da coxa, delimitado por: ligamento inguinal (superior), sartório (lateral), adutor longo (medial). Contém veia-artéria-nervo femoral (VANi — de lateral para medial).', tags: ['triângulo femoral', 'vascular', 'membro inferior'] },

  // ── FISIOLOGIA ────────────────────────────────────────────
  { id: 'f-fisio-01', subject: 'Fisiologia', front: 'O que é o volume corrente (VC) e qual é o valor normal?', back: 'Volume de ar inspirado/expirado em uma respiração tranquila: ~500 mL. Capacidade pulmonar total ≈ 6 L.', tags: ['respiração', 'volumes pulmonares'] },
  { id: 'f-fisio-02', subject: 'Fisiologia', front: 'Qual é a diferença entre ultrafiltrado e urina final?', back: 'Ultrafiltrado glomerular (150–180 L/dia) é similar ao plasma sem proteínas. A urina final (1,5 L/dia) é ~99% reabsorvida. O néfron concentra ureia, creatinina e íons para excreção.', tags: ['renal', 'filtração glomerular'] },
  { id: 'f-fisio-03', subject: 'Fisiologia', front: 'O que é a barorreflexo e como funciona?', back: 'Reflexo de tamponamento da PA: barorreceptores na aorta e carótida detectam ↑PA → via vago inibem o coração (↓FC) e expandem vasos (↓PA). Resposta rápida (segundos).', tags: ['barorreceptores', 'sistema nervoso autônomo', 'PA'] },
  { id: 'f-fisio-04', subject: 'Fisiologia', front: 'O que é a lei de Starling para o coração?', back: 'A força de contração ventricular é proporcional ao comprimento inicial das fibras musculares (pré-carga). Maior enchimento diastólico → maior força de ejeção na sístole.', tags: ['coração', 'débito cardíaco', 'Starling'] },
  { id: 'f-fisio-05', subject: 'Fisiologia', front: 'O que é o clearance renal?', back: 'Volume de plasma completamente depurado de uma substância por unidade de tempo (mL/min). Clearance de creatinina ≈ TFG (~120 mL/min). Clearance > TFG indica secreção tubular; < TFG indica reabsorção.', tags: ['clearance', 'renal', 'TFG'] },
  { id: 'f-fisio-06', subject: 'Fisiologia', front: 'Quais hormônios tireoidianos são produzidos e qual é mais potente?', back: 'T4 (tiroxina) — pró-hormônio produzido em maior quantidade. T3 (triiodotironina) — 3–5× mais ativo, gerado pela deiodinação periférica do T4. Ambos aumentam metabolismo basal.', tags: ['tireóide', 'hormônios'] },
  { id: 'f-fisio-07', subject: 'Fisiologia', front: 'O que diferencia o pré-carga da pós-carga cardíaca?', back: 'Pré-carga: volume diastólico final (estiramento das fibras antes da contração). Pós-carga: resistência à ejeção ventricular (principalmente pressão aórtica / resistência vascular periférica).', tags: ['coração', 'hemodinâmica'] },

  // ── FARMACOLOGIA ──────────────────────────────────────────
  { id: 'f-farma-01', subject: 'Farmacologia', front: 'O que é a biodisponibilidade de um fármaco?', back: 'Fração da dose administrada que atinge a circulação sistêmica de forma inalterada. IV = 100%; oral varia (efeito de primeira passagem hepática reduz biodisponibilidade).', tags: ['farmacocinética', 'biodisponibilidade'] },
  { id: 'f-farma-02', subject: 'Farmacologia', front: 'Qual é o mecanismo dos inibidores da ECA (captopril, enalapril)?', back: 'Inibem a enzima conversora de angiotensina, impedindo a conversão de Ang I → Ang II. Resultado: ↓vasoconstrição, ↓aldosterona, ↓retenção de Na⁺/H₂O → ↓PA. EAR: tosse seca (↑bradicinina).', tags: ['anti-hipertensivos', 'IECA', 'cardiovascular'] },
  { id: 'f-farma-03', subject: 'Farmacologia', front: 'Quais antibióticos inibem a síntese proteica nos ribossomos 30S?', back: 'Aminoglicosídeos (gentamicina, amicacina) e Tetraciclinas (inibem ligação ao tRNA aminoacil-30S). Contraste: 50S inibem macrolídeos, cloranfenicol, linezolida.', tags: ['antibióticos', 'ribossoma 30S', 'síntese proteica'] },
  { id: 'f-farma-04', subject: 'Farmacologia', front: 'O que são fármacos agonistas parciais e qual o exemplo clássico?', back: 'Agonistas parciais: ativam o receptor mas com eficácia máxima menor que agonistas plenos. Exemplo: buprenorfina (opioide) — agonista parcial de μ, usada em dependência a opioides.', tags: ['receptor', 'agonista parcial', 'opioides'] },
  { id: 'f-farma-05', subject: 'Farmacologia', front: 'Qual é a diferença entre tolerância e dependência farmacológica?', back: 'Tolerância: necessidade de doses maiores para o mesmo efeito (down-regulation dos receptores). Dependência física: síndrome de abstinência ao suspender o fármaco. Ambas podem coexistir.', tags: ['tolerância', 'dependência', 'opioides'] },

  // ── PATOLOGIA ─────────────────────────────────────────────
  { id: 'f-pato-01', subject: 'Patologia', front: 'O que é metaplasia e dê um exemplo?', back: 'Substituição de um tipo celular diferenciado por outro. Exemplo clássico: metaplasia de Barrett — epitélio esôfago (pavimentoso estratificado) → colunar intestinal por DRGE crônica. Precursora de adenocarcinoma.', tags: ['metaplasia', 'adaptação celular'] },
  { id: 'f-pato-02', subject: 'Patologia', front: 'Qual é a diferença entre tumor benigno e maligno?', back: 'Benigno: crescimento lento, encapsulado, não infiltra, não metastatiza, células bem diferenciadas. Maligno: crescimento rápido, infiltrativo, metastático, atipia celular, alto índice mitótico.', tags: ['neoplasia', 'benigno', 'maligno'] },
  { id: 'f-pato-03', subject: 'Patologia', front: 'O que é a apoptose e quais as vias principais?', back: 'Morte celular programada e ordenada. Via intrínseca (mitocondrial): estímulos de dano interno → cyt-c → caspase-9 → caspases efetoras. Via extrínseca: ligantes (FasL/TRAIL) → receptores de morte → caspase-8.', tags: ['apoptose', 'morte celular'] },
  { id: 'f-pato-04', subject: 'Patologia', front: 'Quais são os mediadores vasoativos mais importantes na inflamação aguda?', back: 'Histamina (vasodilatação, ↑permeabilidade imediata), bradicinina (dor, ↑permeabilidade), PGE2/PGI2 (vasodilatação, febre), leucotrienos (broncoconstrição, ↑permeabilidade), NO (vasodilatação).', tags: ['inflamação', 'mediadores', 'histamina'] },
  { id: 'f-pato-05', subject: 'Patologia', front: 'O que é amiloidose e cite o principal marcador histológico?', back: 'Depósito extracelular de proteínas fibrilares insolúveis (amiloide) em órgãos. Marcador: coloração Vermelho Congo com birrefringência verde-maçã à luz polarizada. Afeta rim, coração, fígado.', tags: ['amiloidose', 'depósito', 'diagnóstico'] },

  // ── BIOQUÍMICA ────────────────────────────────────────────
  { id: 'f-bioquim-01', subject: 'Bioquímica', front: 'Qual é a função do NADPH na célula?', back: 'NADPH é o principal agente redutor para biossíntese (ácidos graxos, colesterol) e para proteger a célula do estresse oxidativo (regeneração do glutationa reduzido via glutationa redutase).', tags: ['NADPH', 'antioxidante', 'biossíntese'] },
  { id: 'f-bioquim-02', subject: 'Bioquímica', front: 'O que é o ciclo de Cori?', back: 'Ciclo entre músculo e fígado: músculo converte glicogênio → lactato (glicólise anaeróbia) → lactato liberado → fígado converte de volta em glicose (gliconeogênese) → glicose retorna ao músculo.', tags: ['ciclo de Cori', 'lactato', 'gliconeogênese'] },
  { id: 'f-bioquim-03', subject: 'Bioquímica', front: 'Qual enzima é deficiente na fenilcetonúria (PKU)?', back: 'Fenilalanina-hidroxilase — converte fenilalanina → tirosina. Na PKU, fenilalanina acumula e se converte em fenilpiruvato, causando retardo mental se não tratada. Triagem: teste do pezinho.', tags: ['PKU', 'aminoácidos', 'erros inatos'] },
  { id: 'f-bioquim-04', subject: 'Bioquímica', front: 'Quais são os corpos cetônicos e quando são produzidos?', back: 'Acetoacetato, β-hidroxibutirato e acetona. São produzidos no fígado em jejum prolongado ou DM1 descompensado, quando excesso de acetil-CoA não entra no ciclo de Krebs. Cérebro os usa como energia alternativa à glicose.', tags: ['cetose', 'corpos cetônicos', 'jejum', 'diabetes'] },
  { id: 'f-bioquim-05', subject: 'Bioquímica', front: 'Qual é a estrutura secundária das proteínas e cite exemplos?', back: 'Padrões locais de estrutura formados por ligações de hidrogênio: α-hélice (dextrorsum, proteínas fibrosas) e folha β-pregueada (antiparalela é mais estável). Exemplos: α-queratina do cabelo (hélice), fibroína da seda (folha β).', tags: ['proteínas', 'estrutura secundária'] },

  // ── HISTOLOGIA ────────────────────────────────────────────
  { id: 'f-histo-01', subject: 'Histologia', front: 'Quais são os tipos de epitélio de revestimento?', back: 'Classificação por camadas: simples (1 camada) ou estratificado (várias). Por formato: pavimentoso (achatado), cúbico ou colunar. Ex: simples colunar = intestino; estratificado pavimentoso = pele, esôfago.', tags: ['epitélio', 'classificação'] },
  { id: 'f-histo-02', subject: 'Histologia', front: 'O que são as células de Leydig e de Sertoli?', back: 'Leydig: no interstício testicular, produzem testosterona por estímulo do LH. Sertoli: dentro dos túbulos seminíferos, nutrem espermatócitos, formam a barreira hematotesticular e secretam inibina (↓FSH).', tags: ['testículo', 'reprodução masculina'] },
  { id: 'f-histo-03', subject: 'Histologia', front: 'Quais os 3 tipos de cartilagem e suas localizações?', back: 'Hialina: articulações, traqueia, costelas — mais comum. Fibrocartilagem: discos intervertebrais, meniscos, sínfise púbica — mais resistente. Elástica: pavilhão auricular, epiglote — mais flexível.', tags: ['cartilagem', 'tecido conjuntivo'] },
  { id: 'f-histo-04', subject: 'Histologia', front: 'O que é a barreira placentária e o que ela impede?', back: 'Separa sangue materno do fetal. Formada por sinciciotrofoblasto, citotrofoblasto, tecido conjuntivo e endotélio capilar fetal. Impede passagem de: hemácias maternas, IgM, maioria das bactérias, heparina. Passa: O₂, CO₂, IgG, glicose, álcool, nicotina.', tags: ['placenta', 'barreira', 'histologia'] },
  { id: 'f-histo-05', subject: 'Histologia', front: 'Qual é a estrutura do néfron e suas porções?', back: 'Glomérulo → cápsula de Bowman → túbulo contorcido proximal → alça de Henle (descendente/ascendente) → túbulo contorcido distal → ducto coletor. TFG ocorre no glomérulo; reabsorção principal no TCP (65%).', tags: ['néfron', 'renal', 'estrutura'] },

  // ── ENEM ────────────────────────────────────────────────
  { id: 'f-enem-mat-01', subject: 'Matemática', track: 'enem', front: 'Como calcular porcentagem de desconto?', back: 'Multiplique o valor original por (1 - taxa). Ex.: 20% de desconto em 100 = 100 × 0,8 = 80.', tags: ['enem', 'porcentagem'] },
  { id: 'f-enem-ling-01', subject: 'Linguagens', track: 'enem', front: 'O que caracteriza uma função conativa da linguagem?', back: 'Foco no receptor, buscando influenciar comportamento (ordens, apelos, propaganda).', tags: ['enem', 'linguagens'] },
  { id: 'f-enem-hum-01', subject: 'Ciências Humanas', track: 'enem', front: 'Qual é a principal diferença entre Estado e Nação?', back: 'Estado: organização político-jurídica soberana. Nação: comunidade histórico-cultural com identidade comum.', tags: ['enem', 'humanas'] },
  { id: 'f-enem-nat-01', subject: 'Ciências da Natureza', track: 'enem', front: 'Qual é a função da mitocôndria?', back: 'Produção de ATP por respiração celular aeróbia.', tags: ['enem', 'natureza', 'biologia'] },
  { id: 'f-enem-red-01', subject: 'Redação', track: 'enem', front: 'Quais são os 5 elementos da proposta de intervenção no ENEM?', back: 'Agente, ação, modo/meio, finalidade e detalhamento, sempre com respeito aos direitos humanos.', tags: ['enem', 'redacao'] },

  // ── CONCURSO ────────────────────────────────────────────
  { id: 'f-conc-port-01', subject: 'Português', track: 'concurso', front: 'Quando usar “há” e “a” em tempo decorrido?', back: '“Há” indica tempo passado (há dois anos). “A” indica futuro/distância (daqui a dois anos).', tags: ['concurso', 'portugues'] },
  { id: 'f-conc-rl-01', subject: 'Raciocínio Lógico', track: 'concurso', front: 'Na proposição “Se P, então Q”, quando ela é falsa?', back: 'Somente quando P é verdadeira e Q é falsa.', tags: ['concurso', 'logica'] },
  { id: 'f-conc-const-01', subject: 'Direito Constitucional', track: 'concurso', front: 'Qual é a função do controle de constitucionalidade?', back: 'Garantir que leis e atos normativos sejam compatíveis com a Constituição.', tags: ['concurso', 'constitucional'] },
  { id: 'f-conc-admin-01', subject: 'Direito Administrativo', track: 'concurso', front: 'Quais são os princípios clássicos da administração pública?', back: 'LIMPE: Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência.', tags: ['concurso', 'administrativo'] },
  { id: 'f-conc-info-01', subject: 'Informática', track: 'concurso', front: 'Qual a diferença entre RAM e armazenamento SSD/HD?', back: 'RAM é memória volátil de trabalho; SSD/HD é armazenamento persistente de dados.', tags: ['concurso', 'informatica'] },
  { id: 'f-conc-atual-01', subject: 'Atualidades', track: 'concurso', front: 'Por que acompanhar fontes oficiais em atualidades para concursos?', back: 'Porque reduz erro por desinformação e melhora repertório para questões contextualizadas.', tags: ['concurso', 'atualidades'] },
  ...EXTRA_FLASHCARDS_BANK,
];

export const getFlashcardsBySubject = (subject: string): Flashcard[] =>
  FLASHCARDS_BANK.filter((f) => f.subject === subject);

export const FLASHCARD_SUBJECTS = [...new Set(FLASHCARDS_BANK.map((f) => f.subject))];
