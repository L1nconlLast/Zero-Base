// ─── Tipos principais ────────────────────────────────────────────────────────

export type EnemCognitiveAxis = 'DL' | 'CF' | 'SP' | 'CA' | 'EP';
export type EnemArea = 'Linguagens' | 'Matematica' | 'Natureza' | 'Humanas';
export type EnemSubject =
  | 'Portugues' | 'Literatura' | 'Artes' | 'EducacaoFisica' | 'LinguaEstrangeira' | 'Redacao'
  | 'Matematica'
  | 'Fisica' | 'Quimica' | 'Biologia'
  | 'Historia' | 'Geografia' | 'Filosofia' | 'Sociologia';

export type OrganizerProfile =
  | 'cebraspe' | 'fcc' | 'fgv' | 'vunesp' | 'iades' | 'ibfc' | 'quadrix' | 'aocp' | 'funrio';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface EnemAxisDefinition {
  code: EnemCognitiveAxis;
  label: string;
  description: string;
}

export interface EnemAreaDefinition {
  area: EnemArea;
  focus: string;
  highLeverageActions: string[];
  subjects: EnemSubject[];
}

export interface EnemSubjectDefinition {
  subject: EnemSubject;
  area: EnemArea;
  highFrequencyTopics: string[];
  studyTips: string[];
}

export interface OrganizerDefinition {
  key: OrganizerProfile;
  label: string;
  signature: string;
  format: string;
  hotDisciplines: string[];
  strategy: string[];
}

// ─── Eixos cognitivos ENEM ────────────────────────────────────────────────────

export const ENEM_COGNITIVE_AXES: EnemAxisDefinition[] = [
  {
    code: 'DL',
    label: 'Dominar Linguagens',
    description: 'Interpretar e usar linguagens textual, visual, matematica, artistica e corporal em diferentes contextos.',
  },
  {
    code: 'CF',
    label: 'Compreender Fenomenos',
    description: 'Construir e aplicar conceitos das ciencias naturais para explicar fenomenos e processos sociotecnologicos.',
  },
  {
    code: 'SP',
    label: 'Enfrentar Situacoes-Problema',
    description: 'Selecionar, organizar e relacionar informacoes para descrever e explicar situacoes-problema.',
  },
  {
    code: 'CA',
    label: 'Construir Argumentacao',
    description: 'Relacionar informacoes e conhecimentos disponíveis em diferentes contextos para construir argumentacao.',
  },
  {
    code: 'EP',
    label: 'Elaborar Propostas',
    description: 'Recorrer aos conhecimentos desenvolvidos para elaborar propostas de intervencao na realidade com responsabilidade social.',
  },
];

// ─── Areas ENEM ───────────────────────────────────────────────────────────────

export const ENEM_AREA_GUIDANCE: EnemAreaDefinition[] = [
  {
    area: 'Linguagens',
    subjects: ['Portugues', 'Literatura', 'Artes', 'EducacaoFisica', 'LinguaEstrangeira', 'Redacao'],
    focus: 'Interpretacao de genero textual, repertorio cultural e funcao social dos textos. Redacao dissertativo-argumentativa com proposta de intervencao.',
    highLeverageActions: [
      'Praticar leitura ativa de textos multimodais: charge, grafico, poema, artigo de opiniao na mesma sessao.',
      'Resolver questoes com foco em intencao comunicativa, ironia, intertextualidade e argumentacao.',
      'Treinar estrutura da redacao nota 1000 (tese, 2 argumentos com repertorio, proposta de intervencao detalhada).',
      'Revisar figuras de linguagem de alta cobranca: metafora, ironia, eufemismo, hiperbole, paradoxo.',
      'Consolidar conhecimentos de variedade linguistica e lingua padrao sem preconceito linguistico.',
    ],
  },
  {
    area: 'Matematica',
    subjects: ['Matematica'],
    focus: 'Modelagem e resolucao de problemas contextualizados envolvendo dados reais, porcentagem, proporcao, funcoes e geometria.',
    highLeverageActions: [
      'Transformar o enunciado em equacao antes de calcular — nunca calcule de cabeca sem modelo.',
      'Priorizar: estatistica descritiva, proporcao, porcentagem, funcao afim e quadratica, geometria plana.',
      'Treinar leitura e interpretacao de graficos e tabelas do IBGE, INEP e DataSUS.',
      'Resolver 10 questoes por tipo de erro (nao por capitulo) para eliminar padroes de engano.',
      'Fazer revisao rapida de PA, PG, probabilidade basica e combinatoria antes do simulado.',
    ],
  },
  {
    area: 'Natureza',
    subjects: ['Fisica', 'Quimica', 'Biologia'],
    focus: 'Aplicacao dos conceitos de Fisica, Quimica e Biologia em contextos reais: saude, ambiente, energia e tecnologia.',
    highLeverageActions: [
      'Relacionar fenomeno, principio cientifico e impacto ambiental em cada questao.',
      'Treinar questoes interdisciplinares: energia termica, quimica ambiental e saude humana na mesma sessao.',
      'Construir mapas mentais de causa e efeito para conteudos de alta cobranca (ciclos biogeoquimicos, calor, termoquimica).',
      'Priorizar genetica mendeliana, evolucao, ecologia e bioquimica em Biologia.',
      'Focar em eletromagnetismo, ondas, optica e termodinamica em Fisica.',
      'Revisar reacoes organicas, estequiometria e solucoes em Quimica.',
    ],
  },
  {
    area: 'Humanas',
    subjects: ['Historia', 'Geografia', 'Filosofia', 'Sociologia'],
    focus: 'Analise critica de processos historicos, espaciais, politicos e sociologicos, com foco em cidadania e direitos.',
    highLeverageActions: [
      'Resolver questoes comparando periodos historicos com contexto atual (ex: fascismo x autoritarismos contemporaneos).',
      'Revisar: Iluminismo, Revolucao Francesa, Industrializacao, Imperialismo, guerras mundiais, ditaduras na America Latina.',
      'Treinar leitura de mapas tematicos e cartogramas com dados demograficos e climaticos.',
      'Consolidar conceitos de cidadania, estado, democracia e direitos humanos (Filosofia + Sociologia).',
      'Pratique identificar autores classicos das ciencias humanas pelo contexto da questao.',
    ],
  },
];

// ─── Topicos por disciplina (alta cobranca ENEM) ──────────────────────────────

export const ENEM_SUBJECT_GUIDANCE: EnemSubjectDefinition[] = [
  {
    subject: 'Portugues',
    area: 'Linguagens',
    highFrequencyTopics: [
      'Interpretacao e inferencia textual',
      'Generos textuais (editorial, cronica, conto, artigo de opiniao)',
      'Figuras de linguagem (ironia, metafora, paradoxo, eufemismo)',
      'Variedade linguistica e norma padrao',
      'Coesao e coerencia textual',
      'Funcoes da linguagem (referencial, poetica, fática, metalinguística)',
      'Intertextualidade e dialogismo',
    ],
    studyTips: [
      'Leia 1 texto editado por dia (jornal, revista, conto curto) e identifique o argumento central.',
      'Ao errar questao de interpretacao, releia o trecho sem inferencia propria.',
      'Use o metodo CESPE de verificacao de afirmacao: cada palavra importa.',
    ],
  },
  {
    subject: 'Literatura',
    area: 'Linguagens',
    highFrequencyTopics: [
      'Estilos de epoca: Romantismo, Realismo, Modernismo e Contemporaneidade',
      'Autores canonicos: Machado de Assis, Clarice Lispector, Carlos Drummond, Guimaraes Rosa',
      'Caracteristicas dos movimentos literarios',
      'Analise de fragmentoilterary nos enunciados',
      'Poesia concreta e tendencias modernas',
    ],
    studyTips: [
      'Leia resumos de obras canonicas e identifique personagens-tema de cada escola literaria.',
      'Questoes de literatura no ENEM sempre vem com trecho; interprete antes de aplicar teoria.',
    ],
  },
  {
    subject: 'Redacao',
    area: 'Linguagens',
    highFrequencyTopics: [
      'Estrutura dissertativo-argumentativa (5 paragrafos)',
      'Proposta de intervencao com 5 elementos (agente, acao, modo, efeito, finalidade/detalhamento)',
      'Repertorio sociocultural legitimado',
      'Direitos humanos como eixo etico',
      'Coesao: conectivos, pronomes e sinonimos',
    ],
    studyTips: [
      'Escreva 1 redacao completa por semana. Corrija com foco nos 5 criterios do INEP.',
      'Monte repertorios tematicos por area (saude, educacao, tecnologia, violencia) com dados e autores.',
      'Treine proposta de intervencao com agente especifico (nao "o governo") e efeito concreto.',
    ],
  },
  {
    subject: 'LinguaEstrangeira',
    area: 'Linguagens',
    highFrequencyTopics: [
      'Ingles ou Espanhol: interpretacao de texto sem traducao direta',
      'Vocabulario de alta frequencia e cognatos',
      'Inferencia semantica por contexto',
    ],
    studyTips: [
      'Ingles: foque em vocabulario academico e inferencia; nao e necessario fluencia.',
      'Espanhol: falantes de portugues tem vantagem — explore cognatos e estruturas similares.',
    ],
  },
  {
    subject: 'Matematica',
    area: 'Matematica',
    highFrequencyTopics: [
      'Funcao afim e quadratica (grafico, zeros, crescimento)',
      'Porcentagem, juros simples e compostos',
      'Estatistica: media, mediana, moda, desvio',
      'Geometria plana: area, perimetro, semelhanca',
      'Geometria espacial: volume de prismas e piramides',
      'Progressao Aritmetica e Geometrica',
      'Probabilidade e analise combinatoria',
      'Trigonometria no triangulo retangulo',
      'Logaritmo e funcao exponencial',
      'Razao, proporcao e regra de tres',
    ],
    studyTips: [
      'Resolva problemas contextualizados com dados reais do IBGE — o ENEM usa frequentemente.',
      'Para cada tipo de erro, classifique: erro de leitura, erro de calculo ou falta de conceito.',
      'Simulado semanal com 5 questoes cronometradas e revisao da causa de cada erro.',
    ],
  },
  {
    subject: 'Fisica',
    area: 'Natureza',
    highFrequencyTopics: [
      'Cinematica: MRU, MRUV, queda livre',
      'Dinamica: leis de Newton, atrito, trabalho e energia',
      'Termodinamica: calor, temperatura, maquinas termicas',
      'Ondulatoria: caracteristicas de ondas, som, luz',
      'Optica: reflexao, refracao, espelhos e lentes',
      'Eletromagnetismo: Lei de Ohm, circuitos, campo magnetico',
      'Fisica Moderna: dualidade onda-particula, radioatividade',
    ],
    studyTips: [
      'Fisica no ENEM e contextualizada: relacione cada conceito a um fenomeno do cotidiano.',
      'Nao decore formulas. Entenda a logica da grandeza (o que ela mede, como varia).',
      'Priorize termodinamica e eletromagnetismo — mais frequentes nas ultimas edicoes.',
    ],
  },
  {
    subject: 'Quimica',
    area: 'Natureza',
    highFrequencyTopics: [
      'Quimica organica: funcoes, nomenclatura, reacoes (adicao, eliminacao, substituicao)',
      'Estequiometria e calculos com mol',
      'Solucoes: concentracao, diluicao e mistura',
      'Termoquimica: entalpias e energia de ligacao',
      'Eletroquimica: pilhas e eletrolise',
      'Equilibrio quimico e Le Chatelier',
      'Radioatividade e quimica nuclear',
    ],
    studyTips: [
      'Quimica organica so precisa de logica de grupos funcionais — nao decore cada substancia.',
      'Em estequiometria, monte sempre a proporcao em mol antes de calcular.',
      'Relacione reacoes quimicas a contextos reais: industria, combustivel, alimentos.',
    ],
  },
  {
    subject: 'Biologia',
    area: 'Natureza',
    highFrequencyTopics: [
      'Ecologia: cadeias alimentares, ciclos biogeoquimicos, biomas brasileiros',
      'Genetica: 1a e 2a lei de Mendel, herancas ligadas ao sexo, mutacoes',
      'Evolucao: selecao natural, deriva genetica, especiacao',
      'Citologia: estrutura celular, divisao celular (mitose e meiose)',
      'Fisiologia humana: sistemas digestório, cardiovascular, nervoso e imunologico',
      'Biotecnologia: DNA recombinante, PCR, transgênicos',
      'Virologia e bacteriologia: doencas virais e bacterianas de importancia epidemiologica',
    ],
    studyTips: [
      'Genetica: resolva problemas de cruzamento — e habilidade, nao decoreba.',
      'Fisiologia: entenda o mecanismo; questoes do ENEM sempre contextualizam com saude real.',
      'Ecologia: relacione sempre ao desmatamento, mudancas climaticas e biodiversidade brasileira.',
    ],
  },
  {
    subject: 'Historia',
    area: 'Humanas',
    highFrequencyTopics: [
      'Historia da America: colonizacao, independencias, revolucoes (EUA, francesa, haitiana)',
      'Brasil Imperio e Republica: monarquia, Proclamacao, Republica Velha, Era Vargas',
      'Seculo XX: guerras mundiais, Guerra Fria, descolonizacao afro-asiatica',
      'Historia do Brasil Contemporaneo: ditadura militar, redemocratizacao, CF 1988',
      'Civilizacoes antigas: grega, romana, mesopotamica, africanas e pre-colombianas',
    ],
    studyTips: [
      'Sempre relacione o evento historico ao seu contexto economico e social — o ENEM cobra causas.',
      'Use linha do tempo para posicionar eventos e identificar conexoes entre continentes.',
      'Questoes de historia geralmente trazem fonte primaria (carta, discurso, imagem) — interprete antes de aplicar conteudo.',
    ],
  },
  {
    subject: 'Geografia',
    area: 'Humanas',
    highFrequencyTopics: [
      'Climatologia: tipos climaticos, fenomenos El Nino/La Nina, aquecimento global',
      'Geopolitica: blocos economicos, organizacoes internacionais, conflitos contemporaneos',
      'Urbanizacao: metropolizacao, problemas urbanos, segregacao sociospacial',
      'Populacao: crescimento, migracao, transicao demografica, IDH',
      'Geomorfologia: relevo brasileiro, bacias hidrograficas, solos',
      'Biomas brasileiros: Amazonia, Cerrado, Caatinga, Pantanal, Mata Atlantica, Pampas',
      'Energia e recursos naturais: fontes renovaveis, pre-sal, minerios estrategicos',
    ],
    studyTips: [
      'Mapa e essencial: treine leitura de mapas tematicos e cartogramas semanalmente.',
      'Relacione questoes geograficas a dados atuais de noticias (conflitos, clima, migracao).',
      'Biomas brasileiros: memorize as caracteristicas-chave e os problemas ambientais de cada um.',
    ],
  },
  {
    subject: 'Filosofia',
    area: 'Humanas',
    highFrequencyTopics: [
      'Filosofia politica: Estado, democracia, contrato social (Hobbes, Locke, Rousseau)',
      'Etica: virtude, dever, utilitarismo, etica da alteridade',
      'Epistemologia: empirismo, racionalismo, critica kantiana',
      'Filosofia antiga: Socrates, Platao, Aristoteles',
      'Existencialismo e fenomenologia: Sartre, Heidegger, Beauvoir',
      'Filosofia contemporanea: Foucault, Habermas, Bourdieu',
    ],
    studyTips: [
      'Filosofia no ENEM sempre vem com trecho de um filosofo — nao decore pensamentos, interprete o texto.',
      'Associe cada filosofo a um conceito central e a uma obra referencia.',
      'Questoes eticas e politicas sao as mais frequentes — foque nessas correntes.',
    ],
  },
  {
    subject: 'Sociologia',
    area: 'Humanas',
    highFrequencyTopics: [
      'Classicos: Durkheim (fato social, anomia), Weber (acao social, burocracia), Marx (classes, alienacao)',
      'Desigualdade social: classes, racismo, patriarcado, LGBTfobia',
      'Movimentos sociais: feminismo, movimento negro, ambientalismo, trabalhistas',
      'Cultura: identidade, diversidade, etnocentrismo, relativismo cultural',
      'Globalizacao e trabalho: precarizacao, uberizacao, desemprego tecnologico',
      'Democracia e cidadania: participacao politica, direitos civis e sociais',
    ],
    studyTips: [
      'Sociologia no ENEM cobra aplicacao dos conceitos a situacoes contemporaneas.',
      'Domine os tres classicos e seus conceitos centrais — sempre aparecem em pelo menos 2 questoes.',
      'Relacione movimentos sociais ao contexto historico e brasileiro atual.',
    ],
  },
];

// ─── Perfis de bancas de concurso ─────────────────────────────────────────────

export const ORGANIZER_GUIDANCE: OrganizerDefinition[] = [
  {
    key: 'cebraspe',
    label: 'CEBRASPE / CESPE',
    signature: 'Certo/Errado com penalidade por erro. Alta interpretacao e pegadinhas com termos absolutos.',
    format: 'Itens independentes Certo/Errado; cada item correto vale 1 ponto, errado desconta 1 ponto.',
    hotDisciplines: ['Direito Constitucional', 'Administrativo', 'Portugues', 'Raciocinio Logico', 'Informatica'],
    strategy: [
      'Somente marque quando o grau de certeza for alto — a duvida custa ponto.',
      'Identifique termos absolutos no enunciado: sempre, nunca, somente, exclusivamente, imprescindível.',
      'Leia o item inteiro antes de julgar — uma palavra no final pode inverter a logica.',
      'Treine decisao de risco-beneficio: 60% de certeza nao e suficiente para marcar.',
      'Estude lei seca dos artigos mais cobrados: CF 1988 (arts. 1-17, 37-41, 102-135), Lei 8.112, Lei 8.666/13.140.',
    ],
  },
  {
    key: 'fcc',
    label: 'FCC — Fundacao Carlos Chagas',
    signature: 'Questoes objetivas e conteudistas. Peso grande em lei seca e literalidade de normas.',
    format: 'Multipla escolha com 5 alternativas. Sem penalidade por erro. Alto volume de questoes juridicas.',
    hotDisciplines: ['Direito do Trabalho', 'Direito Previdenciario', 'Portugues', 'Contabilidade', 'Financas Publicas'],
    strategy: [
      'Leia os artigos literalmente — a FCC cobra o texto exato da lei, nao interpretacao.',
      'Faca bloco de questoes diretas por assunto tronco do edital (1 bloco por dia).',
      'Consolide caderno de excecoes e "pegadinhas" normativas com jurisprudencia recente.',
      'Portugues FCC: muito gramatica normativa — invista em concordancia, regencia e crase.',
      'Faca no minimo 3 provas anteriores completas da FCC para a mesma area.',
    ],
  },
  {
    key: 'fgv',
    label: 'FGV — Fundacao Getulio Vargas',
    signature: 'Enunciados longos e casoscomplexa. Alta variabilidade tematica. Exige interpretacao refinada.',
    format: 'Multipla escolha com 5 alternativas. Provas longas com questoes discursivas em algumas seletivas.',
    hotDisciplines: ['Portugues', 'Administracao Publica', 'Direito Constitucional', 'Economia', 'Logica'],
    strategy: [
      'Comece pela rodada curta (questoes rapidas) para garantir base de pontos.',
      'Treine leitura criteriosa de enunciados longos: identifique o verbo-pedido.',
      'A FGV gosta de casos abstratos e situacoes novas — interprete, nao decore.',
      'Controle o tempo por bloco: maximo 2 min por questao nas primeiras 30, 3 min nas dificeis.',
      'Simule prova completa com cronometro pelo menos 2 vezes antes do exame.',
    ],
  },
  {
    key: 'vunesp',
    label: 'VUNESP',
    signature: 'Questoes contextualizadas com casos praticos. Alto peso em Portugues e conhecimentos especificos.',
    format: 'Multipla escolha com 5 alternativas. Provas para Estado de Sao Paulo (SP) e municipios.',
    hotDisciplines: ['Portugues', 'Legislacao Estadual SP', 'Direito Constitucional', 'Informatica Basica'],
    strategy: [
      'VUNESP cobra Portugues com foco em interpretacao de texto — mas tambem gramatica contextualizada.',
      'Estude legislacao estadual e municipal do estado de SP quando for cargo estadual/municipal.',
      'Faca provas anteriores da VUNESP para o mesmo cargo — estilo e bastante consistente.',
      'Para cargos tecnicos: conhecimentos especificos geralmente valem 60% da nota — priorize.',
    ],
  },
  {
    key: 'iades',
    label: 'IADES',
    signature: 'Questoes interpretativas com foco em raciocinio. Cobra aplicacao pratica de normas.',
    format: 'Multipla escolha com 5 alternativas. Presente em concursos de saude, educacao e setor publico federal.',
    hotDisciplines: ['Saude Publica', 'Legislacao SUS', 'Etica no Servico Publico', 'Portugues', 'Estatistica'],
    strategy: [
      'O IADES valoriza raciocinio aplicado — nao so memorizar a lei, mas saber quando aplicar.',
      'Em areas de saude: domine protocolos do SUS, politicas nacionais e legislacao sanitaria.',
      'Provas IADES costumam ter questoes com "qual a conduta correta" — estude casos praticos.',
      'Faca simulados com questoes IADES anteriores para calibrar o estilo interpretativo.',
    ],
  },
  {
    key: 'ibfc',
    label: 'IBFC',
    signature: 'Estilo objetivo e direto. Provas frequentes para nivel medio e tecnico do setor publico.',
    format: 'Multipla escolha com 5 alternativas. Provas para tribunais, PRF, cargos tecnicos.',
    hotDisciplines: ['Portugues', 'Matematica Basica', 'Raciocinio Logico', 'Informatica', 'Direito Constitucional'],
    strategy: [
      'IBFC cobra principalmente principios gerais — estude conceitos e nao detalhe excessivo.',
      'Matematica IBFC: resolucao rapida de proporcao, porcentagem e regra de tres e essencial.',
      'Raciocinio logico: proposicoes, tabela-verdade e silogismos sao os temas mais cobrados.',
      'Revise Portugues com foco em encontrar o erro/acerto em frases curtas.',
    ],
  },
  {
    key: 'quadrix',
    label: 'QUADRIX',
    signature: 'Questoes modernas com foco em atualizacao de normas. Cobra muito legislacao recente.',
    format: 'Multipla escolha com 5 alternativas. Provas para conselhos profissionais e autarquias.',
    hotDisciplines: ['Legislacao do Conselho', 'Etica Profissional', 'Portugues', 'Atualidades', 'Informatica'],
    strategy: [
      'Estude o regimento e os instrumentos normativos do conselho profissional especifico do edital.',
      'Etica profissional: codigo de etica da categoria e imprescindivel — decore os artigos centrais.',
      'Atualidades QUADRIX: leia noticias dos ultimos 6 meses relacionadas ao setor do concurso.',
      'Informatica: ferramentas de escritorio (Word, Excel, Outlook) e seguranca basica sao recorrentes.',
    ],
  },
  {
    key: 'aocp',
    label: 'AOCP / INSTITUTO AOCP',
    signature: 'Questoes com enunciados medios. Presente em concursos de saude federal e estaduais.',
    format: 'Multipla escolha com 5 alternativas. Forte presenca em cargos de saude e assistencia social.',
    hotDisciplines: ['Saude Publica', 'Enfermagem', 'Servico Social', 'Portugues', 'Legislacao SUS'],
    strategy: [
      'Para saude: priorize politicas nacionais (PNAB, PNHIS, PNAN), protocolos e redes de atencao.',
      'Portugues AOCP: leitura de texto longo e frequente — treine velocidade de leitura.',
      'Legislacao: vai alem da CF — inclua leis organicas do SUS, LDB e ECA para cargos especificos.',
      'Faca pelo menos 2 provas anteriores AOCP para a mesma area (saude, assistencia, educacao).',
    ],
  },
  {
    key: 'funrio',
    label: 'FUNRIO',
    signature: 'Questoes com nivel medio de dificuldade. Presente em concursos de nivel medio e superior.',
    format: 'Multipla escolha com 5 alternativas. Provas para universidades federais e orgaos estaduais.',
    hotDisciplines: ['Portugues', 'Legislacao Federal', 'Conhecimentos Especificos da Carreira', 'Informatica'],
    strategy: [
      'FUNRIO prioriza conhecimentos especificos com peso alto — invista 60% do tempo nessa parte.',
      'Portugues: gramatica basica + interpretacao; nao espere questoes muito elaboradas.',
      'Para cargos em universidades: conheca o regimento das IFES e legislacao do servidor publico federal.',
      'Matematica basica aparece em nivel medio — proporcao, porcentagem e operacoes fundamentais.',
    ],
  },
];
