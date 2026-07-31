document.addEventListener("DOMContentLoaded", function() {
    lucide.createIcons();

    const moduloAccesso = document.getElementById('modulo-accesso');
    const moduloRegistrazione = document.getElementById('modulo-registrazione');
    const formLogin = document.getElementById('form-login');
    const formRegistrazione = document.getElementById('form-registrazione');

    // Scambio schermata (tra login e registrazione)
    document.getElementById('btn-vai-registrazione').addEventListener('click', function() {
        moduloAccesso.classList.add('nascosto');
        moduloRegistrazione.classList.remove('nascosto');
    });

    document.getElementById('btn-vai-accesso').addEventListener('click', function() {
        moduloRegistrazione.classList.add('nascosto');
        moduloAccesso.classList.remove('nascosto');
    });

    // Inizializza il database locale (se non esiste, lo crea vuoto)
    if (!localStorage.getItem('databaseOperatori')) {
        localStorage.setItem('databaseOperatori', JSON.stringify([]));
    }

    // GESTIONE REGISTRAZIONE
    formRegistrazione.addEventListener('submit', function(evento) {
        evento.preventDefault(); // Evita il ricaricamento della pagina

        const nome = document.getElementById('reg-nome').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        // Recupera gli utenti esistenti
        let utenti = JSON.parse(localStorage.getItem('databaseOperatori'));

        // Controlla che l'email non esista già
        const emailEsistente = utenti.find(utente => utente.email === email);
        if (emailEsistente) {
            alert("Questa email è già registrata nel sistema.");
            return;
        }

        // Salva il nuovo utente
        const nuovoUtente = { nome: nome, email: email, password: password };
        utenti.push(nuovoUtente);
        localStorage.setItem('databaseOperatori', JSON.stringify(utenti));

        alert("Registrazione completata con successo! Ora puoi accedere.");

        // Pulisce i campi e torna alla schermata di accesso
        formRegistrazione.reset();
        moduloRegistrazione.classList.add('nascosto');
        moduloAccesso.classList.remove('nascosto');
    });

    // GESTIONE ACCESSO (LOGIN) E REINDIRIZZAMENTO
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
            // Ordina al browser di cambiare pagina
            window.location.href = 'index.html';
        } else {
            alert("Credenziali errate. Verifica l'email o il codice segreto.");
        }
    });
});