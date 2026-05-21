# 🔄 PoliSync AI: Guida Definitiva all'Avvio (Passo-Passo)

Questa è l'unica guida ufficiale per avviare il progetto **PoliSync AI** da zero o per resettarlo in qualsiasi momento, assicurandoti di non vedere dati vecchi o incoerenti nel database.

---

### 1. 🗄️ RESET E POPOLAMENTO DEL DATABASE (Da fare all'inizio o per resettare i dati)
Se stai avviando il progetto da zero o se vedi ancora vecchi progetti, vecchie spese o credenziali non funzionanti, devi pulire e ri-popolare il database con i dati corretti.

1. Apri un terminale ed entra nella cartella del **backend**:
   ```bash
   cd /Users/davidepregliasco/Desktop/TUTTO/Intership/policost/backend
   ```

2. Attiva l'ambiente virtuale:
   ```bash
   source venv/bin/activate
   ```

3. Esegui lo script di popolamento (questo pulirà le vecchie tabelle e inserirà i nuovi dati dimostrativi di PoliSync AI):
   ```bash
   python seed.py
   ```
   *(Al termine vedrai la scritta `✅ Seed complete!` e l'elenco delle credenziali aggiornate).*

---

### 2. 🧠 AVVIARE IL BACKEND (Flask - Porta 5001)
Lascia attivo il terminale precedente (oppure aprine uno nuovo e ripeti i passaggi 1 e 2 di sopra) ed esegui:

```bash
python run.py
```
*(Il server rimarrà in ascolto all'indirizzo `http://0.0.0.0:5001/`. Non chiudere questo terminale!).*

---

### 3. 💻 AVVIARE IL FRONTEND (React + Vite - Porta 5174)
Apri un **secondo terminale** ed esegui i seguenti comandi per avviare l'interfaccia utente:

1. Entra nella cartella del **frontend**:
   ```bash
   cd /Users/davidepregliasco/Desktop/TUTTO/Intership/policost/frontend
   ```

2. Avvia il server di sviluppo React:
   ```bash
   npm run dev
   ```
   *(Il server rimarrà in ascolto all'indirizzo `http://localhost:5174`).*

---

### 🚀 Accedere all'Applicazione ed Evitare Dati Vecchi
Apri il tuo browser all'indirizzo:
👉 **[http://localhost:5174](http://localhost:5174)**

> [!IMPORTANT]
> **Risoluzione Cache del Browser:**
> Se vedi ancora la vecchia struttura o le vecchie pagine del progetto precedente, il tuo browser ha salvato in cache il vecchio codice. Per risolvere all'istante ed effettuare un caricamento pulito, esegui un **Hard Refresh**:
> * Su Mac (Safari / Chrome / Firefox): Premi **`Cmd + Shift + R`** (oppure tieni premuto `Shift` e clicca sul pulsante di ricarica pagina del browser).

#### Credenziali di Test Create da `seed.py`:
* **Amministratore (Admin Control Center):**
  * **Email:** `admin@polito.it`
  * **Password:** `Admin123!`
* **Project Manager (Gestisce i progetti attivi e approva le spese):**
  * **Email:** `pm@polito.it`
  * **Password:** `Pm12345!`
* **Responsabile Finanziario (Approvatore finale):**
  * **Email:** `giulia.bianchi@polito.it`
  * **Password:** `Polito2024!`

---

### 🛑 Come Spegnere i Server
Quando hai finito di lavorare, posizionati in ciascuno dei due terminali e premi la combinazione di tasti:
`Ctrl + C`
Questo arresterà i server in modo sicuro.
