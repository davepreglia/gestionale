# 🔄 Guida Definitiva: Avvio locale di Streamlit e Deploy Cloud (PoliSync AI)

Questa guida spiega come eseguire l'applicazione **Streamlit** locale per PoliSync AI e come caricarla e connetterla a **Streamlit Community Cloud** utilizzando un database PostgreSQL in Cloud.

---

## 1. 💻 Esecuzione Locale dell'App Streamlit

L'applicazione Streamlit locale si connette al database PostgreSQL locale (`localhost:5432`) o, qualora non fosse raggiungibile, crea automaticamente un database di backup SQLite locale (`mock_policost.db`) con dati di prova pre-popolati per consentire il test immediato.

### Procedura per l'avvio in locale:

1. Apri un terminale ed entra nella cartella principale del progetto:
   ```bash
   cd /Users/davidepregliasco/Desktop/TUTTO/Intership
   ```

2. Attiva l'ambiente virtuale python:
   ```bash
   source policost/backend/venv/bin/activate
   ```

3. Installa le dipendenze richieste per Streamlit:
   ```bash
   pip install -r requirements.txt
   ```

4. Avvia l'applicazione Streamlit:
   ```bash
   streamlit run streamlit_app.py
   ```
   *(Si aprirà automaticamente una pagina nel tuo browser all'indirizzo `http://localhost:8501`).*

---

## 2. 🗄️ Procedura per rendere il Database accessibile in Cloud

Streamlit Community Cloud è ospitato sui server di Streamlit (AWS). Pertanto, **non può accedere al database PostgreSQL che risiede in locale sul tuo computer (`localhost`)**. Per fare in modo che la tua applicazione funzioni online in cloud, devi migrare o ospitare il database in cloud.

La soluzione più semplice ed economica (100% gratuita) consiste nell'utilizzare **Neon.tech** (PostgreSQL Serverless) o **Supabase**.

### Migrazione su Neon (Consigliata e velocissima):

1. Vai su [https://neon.tech](https://neon.tech) e registrati gratuitamente.
2. Crea un nuovo progetto (es. `policost-db`) e seleziona la versione di Postgres 15 o 16.
3. Copia la **Connection String** fornita (avrà un formato simile a: `postgresql://neondb_owner:xyz...-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`).
4. Per popolare il tuo database in cloud con le tabelle e i dati di prova di PoliSync AI:
   - Nel file `policost/backend/.env` del tuo computer locale, commenta la vecchia riga `DATABASE_URL` e incolla quella nuova di Neon:
     ```env
     DATABASE_URL=postgresql://neondb_owner:xyz...-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
   - Esegui lo script di popolamento da terminale con il venv attivo:
     ```bash
     cd policost/backend
     python seed.py
     ```
     *(Questo creerà tutte le tabelle e popolerà gli utenti di demo direttamente sul cloud di Neon).*
   - Ripristina il file `.env` locale su `localhost:5432` se desideri continuare a lavorare in locale.

---

## 3. ☁️ Collegare Streamlit Community Cloud a GitHub

1. Fai il push delle modifiche al tuo repository GitHub (verrà eseguito automaticamente nei prossimi passaggi).
2. Vai su [https://streamlit.io/cloud](https://streamlit.io/cloud) e accedi con il tuo account GitHub.
3. Clicca su **"Create app"** o **"New app"**.
4. Seleziona il tuo repository:
   - **Repository:** `davepreglia/Gestionale`
   - **Branch:** `main`
   - **Main file path:** `streamlit_app.py`
5. **Configurazione dei Secrets (MOLTO IMPORTANTE):**
   Prima di lanciare l'applicazione in cloud, clicca su **"Advanced settings"** nella schermata di deploy di Streamlit e individua la sezione **Secrets**. 
   Incolla la stringa di connessione del tuo database cloud (Neon/Supabase) in questo modo:
   ```toml
   DATABASE_URL = "postgresql://neondb_owner:xyz...-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```
6. Clicca su **"Deploy!"**.
   L'applicazione verrà creata, installerà in automatico le dipendenze da `requirements.txt` e si collegherà in modo sicuro al database cloud!

---

## 🔑 Credenziali Utenti di Demo (Create da seed.py)

Puoi accedere al sistema (sia in locale che in cloud) usando i pulsanti di accesso rapido dell'app oppure digitando manualmente:

* **Amministratore (Admin Control Center):**
  * **Email:** `admin@polito.it` | **Password:** `Admin123!`
* **Project Manager (Approvatore PM):**
  * **Email:** `pm@polito.it` | **Password:** `Pm12345!`
* **Responsabile Finanziario (Approvazione finale):**
  * **Email:** `giulia.bianchi@polito.it` | **Password:** `Polito2024!`
