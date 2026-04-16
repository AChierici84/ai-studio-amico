# AI Studio Amico

AI Studio Amico e un'app educativa interattiva con lavagna digitale, bot animato, input vocale e percorsi guidati per studio, ripasso e quiz.

L'app accompagna lo studente in un flusso iniziale semplice:

1. inserimento del nome
2. selezione della classe
3. scelta dell'area di lavoro
4. scelta della materia
5. apertura dello studio con lavagna, robot e textbox con microfono

## Funzionalita principali

### Onboarding guidato
- schermata iniziale con nome studente
- selezione classe con formato tipo `3° Elementare`
- scelta tra tre aree di lavoro
- selezione materia prima dell'ingresso nello studio

### Tre aree didattiche
- `Studiamo insieme`: spiegazioni guidate e supporto passo-passo
- `Ripasso`: riepiloghi, concetti chiave e, quando utile, schemi visuali
- `Quiz interattivo`: 5 domande progressive con valutazione finale

### Lavagna interattiva
- rendering Markdown sulla lavagna
- badge con argomento selezionato
- visualizzazione immagini didattiche
- aggiornamento immagini in modo asincrono, senza bloccare la risposta testuale

### Input multimodale
- scrittura da tastiera
- dettatura vocale con Web Speech API
- sintesi vocale delle risposte del bot
- pulizia del Markdown prima della lettura vocale

### Bot animato
- espressioni e gesti in base allo stato
- animazioni durante pensiero e parlato
- presenza laterale accanto alla lavagna

### Quiz e valutazione
- generazione domande in base a classe, materia e argomento
- valutazione finale con feedback domanda per domanda
- gestione di risposte non valutabili come `non lo so` o `non l'abbiamo fatto`

### Immagini didattiche
- generazione immagini separata dal flusso chat principale
- risposta testuale immediata
- immagine mostrata appena disponibile
- fallback automatico se la generazione principale fallisce

## Stack tecnico

- Frontend: React 18, Vite
- Backend: Node.js, Express
- AI testo: OpenAI Chat Completions
- AI immagini: OpenAI Images con fallback automatico
- Markdown: react-markdown, remark-gfm
- Voce: Web Speech API

## Requisiti

- Node.js 18+ consigliato
- npm
- una chiave API OpenAI valida

## Installazione

1. Installa le dipendenze:

```bash
npm install
```

2. Crea o aggiorna il file `.env` nella root del progetto:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-1
PORT=3001
```

3. Verifica che le risorse statiche necessarie siano disponibili nella root pubblica del progetto, ad esempio:

- `logo.png`
- `bot.png`
- `aula.png`

## Avvio in sviluppo

Apri due terminali separati.

### Terminale 1: frontend

```bash
npm run dev
```

Frontend disponibile su `http://localhost:5173`

### Terminale 2: backend

```bash
npm run server
```

Backend disponibile su `http://localhost:3001`

## Build produzione

```bash
npm run build
```

La build viene generata nella cartella `dist`.

## Struttura del progetto

```text
ai-studio-amico/
├── src/
│   ├── components/
│   │   ├── Bot.jsx
│   │   ├── Bot.css
│   │   ├── InputArea.jsx
│   │   ├── InputArea.css
│   │   ├── Whiteboard.jsx
│   │   └── Whiteboard.css
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── server.js
├── package.json
├── vite.config.js
├── index.html
└── README.md
```

## Flusso applicativo

### Studio e Ripasso
1. l'utente scrive o detta una richiesta
2. il backend genera subito la risposta testuale
3. il frontend aggiorna subito la lavagna
4. parte una richiesta separata per generare la parte visuale
5. l'immagine appare appena disponibile

### Quiz
1. l'utente sceglie l'argomento
2. il backend genera 5 domande progressive
3. l'utente risponde una domanda alla volta
4. il backend valuta le risposte e costruisce il riepilogo finale

## Endpoint backend principali

- `POST /api/chat`: genera la risposta testuale e il piano visuale
- `POST /api/generate-visuals`: genera immagini e schemi in modo separato
- `POST /api/extract`: estrae classe, materia o argomento dal testo
- `POST /api/generate-quiz`: genera le domande del quiz
- `POST /api/evaluate-quiz`: valuta il quiz completato

## Personalizzazioni utili

### Modello testo
Puoi cambiare il modello di chat modificando `OPENAI_MODEL` nel file `.env`.

### Modello immagini
Puoi cambiare il modello immagini modificando `OPENAI_IMAGE_MODEL` nel file `.env`.

### Voce del bot
La voce, il pitch e la velocita sono configurati nel frontend dentro [src/App.jsx](e:/repos/ai-studio-amico/src/App.jsx).

### Stile lavagna
Il rendering visivo della lavagna e delle immagini e definito in [src/components/Whiteboard.css](e:/repos/ai-studio-amico/src/components/Whiteboard.css).

## Troubleshooting

### `npm run server` non parte
- verifica che il file `.env` esista
- controlla che `OPENAI_API_KEY` sia valorizzata
- riavvia il terminale dopo modifiche a `.env`
- prova con:

```bash
node --check server.js
```

### `npm run dev` non parte
- assicurati che le dipendenze siano installate
- verifica che la porta 5173 non sia gia occupata
- riesegui `npm install` se hai appena aggiunto pacchetti

### La lavagna mostra il testo ma non le immagini
- controlla che il backend sia avviato
- verifica la presenza di una chiave OpenAI valida
- ricorda che le immagini arrivano in una richiesta separata, quindi possono comparire con qualche secondo di ritardo

### Il bot legge simboli Markdown
- il frontend converte il Markdown in testo parlato pulito
- se senti ancora simboli, verifica che il browser stia usando la build aggiornata

### Il microfono non funziona
- usa Chrome o Edge aggiornati
- controlla i permessi del browser
- in produzione serve HTTPS per l'accesso al microfono

## Note

- La generazione immagini puo aumentare tempi e costi API.
- Le immagini nella lavagna vengono richieste solo nelle aree `Studiamo insieme` e `Ripasso`.
- In `Ripasso` puo essere generato anche uno schema visuale aggiuntivo quando il contenuto lo richiede.