# 🏗 Marques Caetano · Gestão de Obras

Sistema mobile-first de gestão financeira para empreiteiras.  
Stack: **HTML puro + Firebase (gratuito)** · Hospedagem: **GitHub Pages**

---

## 🚀 Como instalar (passo a passo)

### 1. Criar conta Firebase (gratuito)

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Criar projeto"**
3. Nome sugerido: `marques-caetano-obras`
4. Google Analytics: pode desativar
5. Clique em **"Criar projeto"**

---

### 2. Ativar Firestore Database

1. No menu lateral, vá em **"Firestore Database"**
2. Clique em **"Criar banco de dados"**
3. Escolha **"Iniciar no modo de produção"**
4. Selecione a região **`southamerica-east1`** (São Paulo)
5. Clique em **"Criar"**

---

### 3. Ativar Authentication

1. No menu lateral, vá em **"Authentication"**
2. Clique em **"Começar"**
3. Em **"Provedores de login"**, ative **"E-mail/senha"**
4. Salve

**Criar usuário:**
1. Vá na aba **"Usuários"**
2. Clique em **"Adicionar usuário"**
3. Informe e-mail e senha do administrador
4. Clique em **"Adicionar usuário"**

---

### 4. Obter as credenciais Firebase

1. No painel do projeto, clique na engrenagem ⚙ → **"Configurações do projeto"**
2. Role até **"Seus apps"** → clique em **`</>`** (Web)
3. Nome do app: `mc-obras-web`
4. **NÃO** marque "Firebase Hosting"
5. Clique em **"Registrar app"**
6. Copie o objeto `firebaseConfig` exibido

---

### 5. Configurar o arquivo `firebase-config.js`

Abra o arquivo `firebase-config.js` e substitua com suas credenciais:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // sua chave
  authDomain: "meu-projeto.firebaseapp.com",
  projectId: "meu-projeto",
  storageBucket: "meu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};

const EMPRESA_ID = "marques-caetano"; // identificador da empresa (não alterar)
```

---

### 6. Configurar Regras de Segurança do Firestore

1. No console Firebase, vá em **Firestore Database → Regras**
2. Substitua tudo pelo conteúdo do arquivo `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /empresas/{empresaId}/{collection}/{docId} {
      allow read, write: if request.auth != null;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Clique em **"Publicar"**

---

### 7. Publicar no GitHub Pages (gratuito)

#### Opção A — Interface GitHub (mais fácil)

1. Crie uma conta em [github.com](https://github.com) se não tiver
2. Clique em **"New repository"**
3. Nome: `mc-obras` (ou qualquer nome)
4. Deixe como **Public**
5. Clique em **"Create repository"**
6. Clique em **"uploading an existing file"**
7. **Arraste todos os arquivos** desta pasta para o GitHub
8. Clique em **"Commit changes"**

#### Ativar GitHub Pages:
1. No repositório, vá em **Settings → Pages**
2. Em **"Source"**, selecione **"Deploy from a branch"**
3. Branch: **`main`**, pasta: **`/ (root)`**
4. Clique em **"Save"**
5. Aguarde ~2 minutos. O link será: `https://seu-usuario.github.io/mc-obras`

#### Opção B — Git (linha de comando)

```bash
cd marques-caetano
git init
git add .
git commit -m "Sistema MC Obras v1.0"
git remote add origin https://github.com/SEU_USUARIO/mc-obras.git
git push -u origin main
```

---

## 📱 Instalar como app no celular

### Android (Chrome)
1. Acesse o link do GitHub Pages
2. Toque no menu ⋮ → **"Adicionar à tela inicial"**
3. O app aparecerá como ícone nativo

### iPhone (Safari)
1. Acesse o link no Safari
2. Toque em Compartilhar → **"Adicionar à Tela de Início"**

---

## 🏗 Estrutura do sistema

```
marques-caetano/
├── index.html              # Arquivo principal (único HTML)
├── firebase-config.js      # ⚠ Configure aqui suas credenciais
├── manifest.json           # PWA manifest (app instalável)
├── firestore.rules         # Regras de segurança (deploy no console)
├── firestore.indexes.json  # Índices Firestore
├── css/
│   └── styles.css          # Todos os estilos
└── js/
    ├── app.js              # Core: estado, roteamento, Firebase helpers
    ├── pages-obras.js      # Dashboard, Obras, Detalhe de Obra
    └── pages-rest.js       # Planilhas, Funcionários, OC, Lançamentos, Config
```

---

## 💾 Estrutura de dados (Firestore)

Todos os dados ficam em: `empresas/marques-caetano/{coleção}`

| Coleção | Descrição |
|---|---|
| `obras` | Obras/projetos |
| `planilhas` | Centros de custo por obra |
| `funcionarios` | Cadastro de funcionários |
| `alocacoes` | Alocação funcionário ↔ obra |
| `lancamentos` | Todos os movimentos financeiros |
| `ordens_compra` | OCs importadas |
| `empresas_contratantes` | ENGIX, Murano, Ferreira Santos... |

---

## 💰 Plano gratuito Firebase (Spark)

| Recurso | Limite gratuito |
|---|---|
| Firestore leituras | 50.000/dia |
| Firestore escritas | 20.000/dia |
| Autenticação | Ilimitada |
| Hospedagem | Não necessária (GitHub Pages) |

> Para uma empreiteira de médio porte, o plano gratuito é mais que suficiente.

---

## 🔒 Regras de negócio implementadas

- ✅ Nunca deleta registros financeiros (apenas estorno)
- ✅ Cancelamento de OC gera lançamento inverso automático
- ✅ Saldo calculado dinamicamente (nunca salvo)
- ✅ Alerta visual para planilhas negativas
- ✅ Folha sugerida automática para mensalistas
- ✅ Validação de duplicidade de OC
- ✅ Extração de dados de PDF por padrões de texto
- ✅ Bloqueio de pagamento sem alocação ativa
- ✅ Multiempresa ready (campo `empresa_id` em todas as coleções)

---

## 🛠 Personalizar

**Trocar nome da empresa:** Edite `firebase-config.js`:
```javascript
const EMPRESA_ID = "sua-empresa"; // identificador único
```

**Cores:** Edite as variáveis CSS no topo de `css/styles.css`:
```css
--accent: #C4502A;  /* cor principal */
--green: #2D7A4F;   /* cor positivo */
```

---

## 📞 Suporte

Sistema desenvolvido para uso interno da **Marques Caetano Empreiteira**.  
Para novas funcionalidades, consulte o desenvolvedor.
