#!/bin/bash

# 🚀 Script de Instalação Automática - Medicina do Zero v2.1
# Este script instala automaticamente todas as melhorias

set -e  # Para na primeira erro

echo "════════════════════════════════════════════════════════════"
echo "  🚀 Medicina do Zero v2.1 - Instalação Automática"
echo "════════════════════════════════════════════════════════════"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de log
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Verificar se está na pasta correta
if [ ! -f "package.json" ]; then
    log_error "package.json não encontrado!"
    log_info "Execute este script na pasta raiz do projeto medicina-do-zero-v2"
    exit 1
fi

log_info "Projeto encontrado: $(pwd)"
echo ""

# Passo 1: Backup
log_info "Passo 1/5: Criando backup..."
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "../$BACKUP_DIR"
cp -r . "../$BACKUP_DIR/"
log_success "Backup criado em ../$BACKUP_DIR"
echo ""

# Passo 2: Copiar novos arquivos
log_info "Passo 2/5: Copiando novos arquivos..."

# Criar pastas se não existirem
mkdir -p src/schemas
mkdir -p src/services
mkdir -p src/components/ErrorBoundary

# Copiar arquivos
MELHORIAS_DIR="../medicina-do-zero-v2.1-melhorias"

if [ -d "$MELHORIAS_DIR" ]; then
    cp "$MELHORIAS_DIR/src/schemas/index.ts" src/schemas/
    log_success "schemas/index.ts copiado"
    
    cp "$MELHORIAS_DIR/src/services/auth.service.ts" src/services/
    log_success "services/auth.service.ts copiado"
    
    cp "$MELHORIAS_DIR/src/services/storage.service.ts" src/services/
    log_success "services/storage.service.ts copiado"
    
    cp "$MELHORIAS_DIR/src/components/ErrorBoundary/ErrorBoundary.tsx" src/components/ErrorBoundary/
    log_success "components/ErrorBoundary/ErrorBoundary.tsx copiado"
    
    # Arquivos de configuração
    cp "$MELHORIAS_DIR/tsconfig.json" .
    log_success "tsconfig.json atualizado"
    
    cp "$MELHORIAS_DIR/vite.config.ts" .
    log_success "vite.config.ts atualizado"
    
    cp "$MELHORIAS_DIR/package.json" .
    log_success "package.json atualizado"
else
    log_error "Pasta de melhorias não encontrada: $MELHORIAS_DIR"
    log_info "Certifique-se de extrair o ZIP na pasta pai do projeto"
    exit 1
fi

echo ""

# Passo 3: Instalar dependências
log_info "Passo 3/5: Instalando dependências..."
log_warning "Isso pode demorar alguns minutos..."
npm install
log_success "Dependências instaladas"
echo ""

# Passo 4: Verificar instalação
log_info "Passo 4/5: Verificando instalação..."

# Type check
log_info "Verificando tipos TypeScript..."
if npm run type-check 2>&1 | grep -q "error"; then
    log_warning "Há alguns erros de tipo (normal se você ainda não migrou o código)"
else
    log_success "TypeScript OK"
fi

echo ""

# Passo 5: Criar arquivo de tipos para secure-ls se necessário
log_info "Passo 5/5: Configurando tipos..."
if [ ! -f "src/types/secure-ls.d.ts" ]; then
    mkdir -p src/types
    cat > src/types/secure-ls.d.ts << 'EOF'
declare module 'secure-ls' {
  export default class SecureLS {
    constructor(config?: {
      encodingType?: string;
      isCompression?: boolean;
      encryptionSecret?: string;
    });
    get(key: string): any;
    set(key: string, value: any): void;
    remove(key: string): void;
  }
}
EOF
    log_success "Tipos para secure-ls criados"
else
    log_success "Tipos já configurados"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}  ✓ Instalação Concluída com Sucesso!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📦 Novos arquivos adicionados:"
echo "   • src/schemas/index.ts"
echo "   • src/services/auth.service.ts"
echo "   • src/services/storage.service.ts"
echo "   • src/components/ErrorBoundary/ErrorBoundary.tsx"
echo ""
echo "🔧 Arquivos atualizados:"
echo "   • tsconfig.json (path aliases)"
echo "   • vite.config.ts (path aliases)"
echo "   • package.json (novas dependências)"
echo ""
echo "🎯 Próximos passos:"
echo "   1. Abra o VSCode: code ."
echo "   2. Reinicie o TypeScript Server (Ctrl+Shift+P → 'Restart TS Server')"
echo "   3. Inicie o dev server: npm run dev"
echo "   4. Leia FASE_1_IMPLEMENTADA.md para migrar o código"
echo ""
echo "📚 Documentação disponível:"
echo "   • README.md - Instruções de uso"
echo "   • FASE_1_IMPLEMENTADA.md - Guia de migração"
echo "   • PLANO_MELHORIAS_V2.1.md - Plano completo"
echo ""
echo "🆘 Se tiver problemas:"
echo "   • Verifique se todas as dependências foram instaladas"
echo "   • Limpe cache: rm -rf node_modules && npm install"
echo "   • Consulte a documentação"
echo ""
echo -e "${BLUE}🎓 Bons estudos!${NC} 📚"
echo ""
