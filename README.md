# AI Studio Amico

App educativa interattiva per studenti delle scuole primarie e medie. Combina una lavagna digitale, un robot animato, input vocale e percorsi guidati per studio, ripasso e quiz.

## Flusso di utilizzo

1. Inserisci il nome
2. Seleziona la classe (es. `3° Elementare`)
3. Scegli l'area di lavoro
4. Scegli la materia
5. Studia con lavagna, robot e microfono
6. A fine lezione stampa il PDF con trascrizione, immagini e riassunto AI

---

## Funzionalità principali

### Onboarding guidato
- Schermata iniziale con nome studente
- Selezione classe
- Scelta tra tre aree di lavoro
- Selezione materia

### Tre aree didattiche
- **Studiamo insieme** — spiegazioni guidate e supporto passo-passo
- **Ripasso** — riepiloghi, concetti chiave e schemi visuali
- **Quiz interattivo** — 5 domande progressive con valutazione finale e feedback

### Lavagna interattiva
- Rendering Markdown
- Badge con area e materia in corso
- Immagini didattiche generate da AI
- Aggiornamento asincrono delle immagini (non blocca la risposta testuale)

### Bot animato
- Gesti e animazioni in base allo stato (idle, pensiero, parlato, confusione)
- Braccia statiche durante il parlato (nessuna animazione eccessiva)

### Input multimodale
- Scrittura da tastiera
- Dettatura vocale con Web Speech API
- Sintesi vocale delle risposte del bot
- Selezione automatica della voce italiana maschile/giovane più naturale disponibile
- Pulizia del Markdown prima della lettura vocale

### Immagini didattiche
- Generazione separata dal flusso chat (risposta testuale immediata)
- Prompt specifici per argomento con vincoli visivi concreti
- Fallback automatico se la generazione principale fallisce
- Dimensione e qualità configurabili via `.env`

### Archivio lezione
- Accumulo di tutti i messaggi (studente + Amico) durante la sessione
- Raccolta di tutte le immagini generate
- Reset automatico a inizio nuova lezione

### PDF di fine lezione
- Generato tramite iframe nascosto (nessuna pagina bianca)
- **Riassunto AI** della lezione in cima (generato da `gpt-4o-mini`)
- Immagini generate durante la lezione
- Trascrizione completa della conversazione
- Bottone disabilitato con etichetta "Sto generando il riassunto…" durante la chiamata AI

### Logging OpenAI
- Log strutturato di ogni richiesta/risposta verso OpenAI (testo e immagini)
- Attivo di default in sviluppo, disabilitabile via `.env`
- Testi troncati a `OPENAI_IO_LOG_MAX_CHARS` caratteri per leggibilità

---

## Stack tecnico

| Livello | Tecnologia |
|---------|-----------|
| Frontend | React 18, Vite |
| Backend | Node.js, Express 5 (ESM) |
| AI testo | OpenAI Chat Completions (`gpt-4o-mini`) |
| AI immagini | OpenAI Images (`gpt-image-1`) |
| Markdown | react-markdown, remark-gfm |
| Voce | Web Speech API |
| PDF | iframe `srcdoc` + `window.print()` |

---

## Requisiti

- Node.js 18+
- npm
- Chiave API OpenAI valida

---

## Installazione

```bash
npm install
```

Crea il file `.env` nella root del progetto:

```env
OPENAI_API_KEY=sk-...
PORT=3001
OPENAI_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-1
OPENAI_IMAGE_SIZE=1024x1024
OPENAI_IMAGE_QUALITY=high
OPENAI_IO_LOG=true
OPENAI_IO_LOG_MAX_CHARS=1800
```

---

## Avvio in sviluppo

Apri due terminali separati.

**Terminale 1 — frontend:**
```bash
npm run dev
```
Disponibile su `http://localhost:5173`

**Terminale 2 — backend:**
```bash
npm run server
```
Disponibile su `http://localhost:3001`

---

## Build produzione

```bash
npm run build
```

La build viene generata nella cartella `dist`.

---

## Struttura del progetto

```text
ai-studio-amico/
├── src/
│   ├── components/
│   │   ├── Bot.jsx / Bot.css
│   │   ├── InputArea.jsx / InputArea.css
│   │   └── Whiteboard.jsx / Whiteboard.css
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── server.js
├── package.json
├── vite.config.js
├── .env
├── index.html
└── README.md
```

---

## Endpoint backend

| Metodo | Percorso | Scopo |
|--------|----------|-------|
| POST | `/api/chat` | Risposta testuale + piano visuale |
| POST | `/api/generate-visuals` | Genera immagini didattiche |
| POST | `/api/extract` | Estrae classe, materia o argomento dal testo |
| POST | `/api/generate-quiz` | Genera 5 domande del quiz |
| POST | `/api/evaluate-quiz` | Valuta il quiz completato |
| POST | `/api/summarize-lesson` | Riassunto AI dell'intera lezione (usato dal PDF) |

---

## Flusso applicativo

### Studio e Ripasso
1. L'utente scrive o detta una richiesta
2. Il backend genera subito la risposta testuale
3. La lavagna si aggiorna immediatamente
4. Parte una richiesta separata per le immagini
5. Le immagini appaiono appena disponibili

### Quiz
1. L'utente sceglie l'argomento
2. Il backend genera 5 domande progressive
3. L'utente risponde una domanda alla volta
4. Il backend valuta e costruisce il riepilogo finale

### PDF di fine lezione
1. L'utente preme "Fine lezione · Stampa PDF"
2. Il backend genera un riassunto AI della conversazione
3. Il frontend costruisce l'HTML con riassunto, immagini e trascrizione
4. Un iframe nascosto apre la finestra di stampa del browser

---

## Configurazione `.env`

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `OPENAI_API_KEY` | — | Chiave API OpenAI (obbligatoria) |
| `PORT` | `3001` | Porta del backend |
| `OPENAI_MODEL` | `gpt-4o-mini` | Modello per chat e riassunti |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1` | Modello per la generazione immagini |
| `OPENAI_IMAGE_SIZE` | `1024x1024` | Dimensione immagini generate |
| `OPENAI_IMAGE_QUALITY` | `high` | Qualità immagini (`standard` o `high`) |
| `OPENAI_IO_LOG` | `true` in dev | Attiva il log delle chiamate OpenAI |
| `OPENAI_IO_LOG_MAX_CHARS` | `1800` | Lunghezza massima del testo nei log |

---

## Troubleshooting

### `npm run server` non parte
- Verifica che `.env` esista e che `OPENAI_API_KEY` sia valorizzata
- Riavvia il terminale dopo modifiche a `.env`
- Controlla la sintassi con: `node --check server.js`

### `npm run dev` non parte
- Esegui `npm install`
- Verifica che la porta 5173 non sia già occupata

### Le immagini non appaiono
- Controlla che il backend sia avviato
- Le immagini arrivano in una richiesta separata: possono comparire con qualche secondo di ritardo
- Verifica nei log del server la presenza di errori OpenAI

### Il PDF è vuoto o bianco
- Accertati che ci siano messaggi o immagini nella sessione corrente
- Usa Chrome o Edge (supporto iframe/print più affidabile)

### Il bot legge simboli Markdown
- Il frontend converte il Markdown in testo pulito prima della lettura
- Se il problema persiste, aggiorna la pagina per caricare la build più recente

### Il microfono non funziona
- Usa Chrome o Edge aggiornati
- Controlla i permessi del browser per il microfono
- In produzione è richiesto HTTPS per l'accesso al microfono

---

## Note

- La generazione immagini aumenta i tempi di risposta e i costi API.
- Le immagini vengono richieste solo nelle aree **Studiamo insieme** e **Ripasso**.
- Il riassunto AI nel PDF consuma token aggiuntivi proporzionali alla lunghezza della lezione.