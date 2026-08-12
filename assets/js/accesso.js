document.addEventListener("DOMContentLoaded", function() {
    // Inizializza le icone se è presente la libreria
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    const moduloAccesso = document.getElementById('modulo-accesso');
    const moduloRegistrazione = document.getElementById('modulo-registrazione');
    const formLogin = document.getElementById('form-login');
    const formRegistrazione = document.getElementById('form-registrazione');

    // Scambio schermata (tra login e registrazione)
    document.getElementById('btn-vai-registrazione').addEventListener('click', function() {
        moduloAccesso.classList.add('nascosto');
        moduloAccesso.classList.add('hidden'); // Sicurezza extra se usi Tailwind
        moduloRegistrazione.classList.remove('nascosto');
        moduloRegistrazione.classList.remove('hidden');
    });

    document.getElementById('btn-vai-accesso').addEventListener('click', function() {
        moduloRegistrazione.classList.add('nascosto');
        moduloRegistrazione.classList.add('hidden');
        moduloAccesso.classList.remove('nascosto');
        moduloAccesso.classList.remove('hidden');
    });

    // Inizializza il database locale (se non esiste, lo crea vuoto)
    if (!localStorage.getItem('databaseOperatori')) {
        localStorage.setItem('databaseOperatori', JSON.stringify([]));
    }

    // --- GESTIONE REGISTRAZIONE ---
    formRegistrazione.addEventListener('submit', function(evento) {
        evento.preventDefault(); // Evita il ricaricamento della pagina

        const nome = document.getElementById('reg-nome').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        // Novità: Recuperiamo il ruolo selezionato nei bottoni a scelta (Terzista o Agricoltore)
        // Se per caso non trova la selezione, imposta 'terzista' di default per sicurezza
        let ruoloSelezionato = 'terzista';
        const radioRuolo = document.querySelector('input[name="ruolo_reg"]:checked');
        if (radioRuolo) {
            ruoloSelezionato = radioRuolo.value;
        }

        // Recupera gli utenti esistenti
        let utenti = JSON.parse(localStorage.getItem('databaseOperatori'));

        // Controlla che l'email non esista già
        const emailEsistente = utenti.find(utente => utente.email === email);
        if (emailEsistente) {
            alert("Questa email è già registrata nel sistema.");
            return;
        }

        // Salva il nuovo utente INCLUDENDO IL RUOLO
        const nuovoUtente = {
            nome: nome,
            email: email,
            password: password,
            ruolo: ruoloSelezionato // Aggiunto qui!
        };
        utenti.push(nuovoUtente);
        localStorage.setItem('databaseOperatori', JSON.stringify(utenti));

        alert(`Registrazione completata con successo come ${ruoloSelezionato.toUpperCase()}! Ora puoi accedere.`);

        // Pulisce i campi e torna alla schermata di accesso
        formRegistrazione.reset();
        moduloRegistrazione.classList.add('nascosto');
        moduloAccesso.classList.remove('nascosto');
    });

    // --- GESTIONE ACCESSO (LOGIN) E REINDIRIZZAMENTO ---
    formLogin.addEventListener('submit', function(evento) {
        evento.preventDefault();

        const emailInviata = document.getElementById('login-email').value;
        const passwordInviata = document.getElementById('login-password').value;

        let utenti = JSON.parse(localStorage.getItem('databaseOperatori'));

        // Cerca una corrispondenza esatta di email e password
        const utenteTrovato = utenti.find(utente => utente.email === emailInviata && utente.password === passwordInviata);

        if (utenteTrovato) {
            // Crea il "lasciapassare" per l'utente attivo
            sessionStorage.setItem('utenteAttivo', JSON.stringify(utenteTrovato));

            // SMISTAMENTO AUTOMATICO IN BASE AL RUOLO SALVATO
            // Se è un vecchio account senza ruolo salvato, lo consideriamo 'terzista' per non bloccarlo
            const ruoloUtente = utenteTrovato.ruolo || 'terzista';

            if (ruoloUtente === 'agricoltore') {
                window.location.href = 'agricoltore-dashboard.html'; // <-- Destinazione corretta!
            } else {
                window.location.href = 'index.html';
            }

        } else {
            alert("Credenziali errate. Verifica l'email o il codice segreto.");
        }
    });
});
