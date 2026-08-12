// assets/js/login.js
document.addEventListener("DOMContentLoaded", function() {
    const formLogin = document.getElementById('form-login');
    const boxErrore = document.getElementById('errore-login');

    // 1. Controllo Sessione: se è già loggato passa oltre
    if (localStorage.getItem('aeromech_operatore_id')) {
        window.location.href = 'operatore.html';
        return;
    }

    formLogin?.addEventListener('submit', function(e) {
        e.preventDefault();

        // Nascondi eventuale errore precedente
        boxErrore.classList.add('nascosto');

        // Trasforma l'email tutta in minuscolo per evitare errori di battitura
        const emailInserita = document.getElementById('login-email').value.trim().toLowerCase();
        const passwordInserita = document.getElementById('login-password').value.trim();

        let utenteTrovato = null;

        // 2. RICERCA UNIVERSALE NEL DATABASE LOCALE
        // Naviga in tutta la memoria del browser per trovare le credenziali,
        // a prescindere da come config.js le abbia salvate
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            try {
                let data = localStorage.getItem(key);

                // Caso A: I dati sono salvati come lista diretta (Array)
                if (data && data.startsWith('[')) {
                    let parsedArray = JSON.parse(data);
                    let found = parsedArray.find(op => op.email && op.email.toLowerCase() === emailInserita && op.password === passwordInserita);
                    if (found) {
                        utenteTrovato = found;
                        break;
                    }
                }
                // Caso B: I dati sono salvati dentro un grande contenitore unico (Oggetto)
                else if (data && data.startsWith('{')) {
                    let parsedObj = JSON.parse(data);
                    for (let tableName in parsedObj) {
                        if (Array.isArray(parsedObj[tableName])) {
                            let found = parsedObj[tableName].find(op => op.email && op.email.toLowerCase() === emailInserita && op.password === passwordInserita);
                            if (found) {
                                utenteTrovato = found;
                                break;
                            }
                        }
                    }
                    if (utenteTrovato) break;
                }
            } catch (err) {
                // Ignora file di sistema o non compatibili
            }
        }

        // 3. VERIFICA FINALE
        if (utenteTrovato) {
            // LOGIN CORRETTO! Memorizza il pass
            localStorage.setItem('aeromech_operatore_id', utenteTrovato.id);
            localStorage.setItem('aeromech_operatore_nome', utenteTrovato.nome);

            // Reindirizza l'operatore alla dashboard
            window.location.href = 'operatore.html';
        } else {
            // LOGIN FALLITO
            boxErrore.classList.remove('nascosto');
            document.getElementById('login-password').value = '';
        }
    });
});