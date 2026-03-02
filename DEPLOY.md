# Guia de Deploy - Zero Base 2.0

## Pré-requisitos

- Projeto compilando localmente
- Conta em uma plataforma de hospedagem

## Build local

```bash
npm install
npm run build
npm run preview
```

## Opções de deploy

### Vercel
- Importar o repositório
- Build command: `npm run build`
- Output directory: `dist`

### Netlify
- Build command: `npm run build`
- Publish directory: `dist`

### GitHub Pages
- Gerar build em `dist`
- Publicar conteúdo estático via workflow

## Checklist pré-deploy

- [ ] `npm run test -- --run` sem falhas
- [ ] `npm run build` sem falhas
- [ ] Variáveis de ambiente definidas
- [ ] Navegação principal validada

## Pós-deploy

- Verificar carregamento inicial
- Testar autenticação
- Testar dashboard e cronômetro
- Validar modo offline (PWA)
