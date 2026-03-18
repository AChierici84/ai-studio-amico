# AI Studio Amico

Applicazione educativa interattiva con un bot 2D animato che conversa con l'utente usando OpenAI.

<img width="1501" height="891" alt="Screenshot 2026-03-18 170117" src="https://github.com/user-attachments/assets/326c2622-1ea5-4f3c-9c14-7f72c1544d2f" />
In base alla classe , alla materia e all'argomento selezionato...

<img width="1228" height="804" alt="Screenshot 2026-03-18 170148" src="https://github.com/user-attachments/assets/3df6b7fe-dbd9-469d-b593-c0ccd531700a" />

<img width="1211" height="815" alt="Screenshot 2026-03-18 170221" src="https://github.com/user-attachments/assets/5701d35f-d1b0-48f6-9fb2-0c569fa9448c" />

Propone 5 domande del livello relativo alla classe di appartenenza...

<img width="1306" height="781" alt="Screenshot 2026-03-18 170244" src="https://github.com/user-attachments/assets/673e5b13-81d6-41c6-89dd-01f3dcd4f379" />

E valuta le risposte (che possono essere scritte o dettate a voce).

<img width="1215" height="819" alt="Screenshot 2026-03-18 170411" src="https://github.com/user-attachments/assets/2ff46898-2bde-432c-bdca-a0dabffad763" />


## Caratteristiche

**Bot 2D Animato**
- Movimento casuale in un'area delimitata
- Espressioni facciali dinamiche (neutro, felice, confuso, pensieroso)
- Gesticulazione variata durante la conversazione
- Effetti visivi (bolle parlanti, ondeggiamento)

**Input Multimodale**
- Input testuale tramite tastiera
- Input vocale tramite Web Speech API (riconoscimento vocale italiano)
- Feedback visivo per lo stato di ascolto

**Conversazione Intelligente**
- Integrazione con OpenAI gpt-4o-mini (configurabile)
- Contesto conversazionale mantenuto
- Risposte brevi e educative
- Sintesi vocale (Text-to-Speech) per le risposte del bot

**Interfaccia**
- Design moderno con gradiente
- Lavagna per visualizzazione messaggi
- Layout responsive
- Animazioni fluide

## Setup Iniziale

### Prerequisiti
- Node.js 16+ e npm
- Una chiave API OpenAI (https://platform.openai.com/api-keys)

### Installazione

1. **Clona il repository e installa le dipendenze**
   ```bash
   npm install
   ```

2. **Configura le variabili d'ambiente**
   ```bash
   # Copia il file di esempio
   cp .env.example .env
   
   # Modifica .env e aggiungi la tua chiave OpenAI
   OPENAI_API_KEY=sk-...
   ```

3. **Copia bot.png nella cartella pubblica**
   ```bash
   # Assicurati che bot.png sia nella root del progetto
   # Verrà servito come risorsa statica
   ```

## Esecuzione

### Sviluppo

**Terminal 1 - Frontend (Vite)**
```bash
npm run dev
```
L'app sarà disponibile su `http://localhost:5173`

**Terminal 2 - Backend (Node.js)**
```bash
npm run server
```
Il server sarà disponibile su `http://localhost:3001`

### Produzione

```bash
npm run build
# Servire la cartella 'dist' con un web server
```

## Struttura del Progetto

```
ai-studio-amico/
├── src/
│   ├── components/
│   │   ├── Bot.jsx          # Componente bot con animazioni
│   │   ├── Bot.css
│   │   ├── Whiteboard.jsx   # Visualizzazione messaggi
│   │   ├── Whiteboard.css
│   │   ├── InputArea.jsx    # Input testuale e vocale
│   │   └── InputArea.css
│   ├── App.jsx              # Componente principale
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── public/
│   └── bot.png             # Immagine del bot
├── server.js               # Backend Express + OpenAI
├── .env.example
├── .env                    # Variabili di ambiente (non committare)
├── package.json
├── vite.config.js
└── index.html
```

## Configurazione OpenAI

1. Visita https://platform.openai.com/api-keys
2. Crea una nuova API key
3. Copia la chiave in `.env`

**Nota:** Assicurati di configurable i limiti di spesa su OpenAI per evitare costi inaspettati.

## Customizzazioni

### Cambio personalità del bot
Modifica il `system content` in `server.js`:
```javascript
content: 'Sei Amico, un assistente educativo...'
```

### Velocità del movimento
In `Bot.jsx`, modifica l'intervallo:
```javascript
const interval = setInterval(() => {
  // Cambia 3000 per renderlo più/meno veloce
}, 3000)
```

### Voce del bot
In `App.jsx`, modifica le proprietà di `SpeechSynthesisUtterance`:
```javascript
utterance.rate = 1        // Velocità (0.1 - 10)
utterance.pitch = 1.2     // Tono (0.1 - 2)
utterance.volume = 1      // Volume (0 - 1)
```

## Troubleshooting

**Il microfono non funziona**
- Controlla che il browser supporti Web Speech API (Chrome, Edge, Safari)
- Verifica i permessi di microphone del browser
- Assicurati di usare HTTPS in produzione (il microfono richiede un contesto sicuro)

**Errore "OpenAI API key non configurata"**
- Verifica che `.env` sia nella root del progetto
- Riavvia il server Node.js dopo aver modificato `.env`
- Assicurati che la chiave sia corretta

**Bot non parla**
- Verifica che speechSynthesis sia supportato dal browser
- Controlla il volume del sistema
- Prova su un browser diverso

**Il bot.png non si carica**
- Assicurati che il file sia supportato (PNG, JPG, etc.)
- Verifica il percorso: deve essere nella root `/bot.png`

## Tecnologie Utilizzate

- **Frontend:** React 18, CSS3 Animations, Vite
- **Backend:** Node.js, Express
- **API:** OpenAI gpt-4o-mini (default via OPENAI_MODEL)
- **Speech:** Web Speech API (riconoscimento vocale), Web Audio API (sintesi vocale)
