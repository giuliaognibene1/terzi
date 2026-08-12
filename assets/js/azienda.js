// assets/js/azienda.js
document.addEventListener("DOMContentLoaded", function() {
    const formAzienda = document.getElementById('form-profilo-azienda');
    if (!formAzienda) return;

    function caricaDatiAzienda() {
        const profilo = window.leggiDatabase('profilo_azienda');
        if (profilo && !Array.isArray(profilo)) {
            if (document.getElementById('azienda-nome')) document.getElementById('azienda-nome').value = profilo.ragioneSociale || '';
            if (document.getElementById('azienda-piva')) document.getElementById('azienda-piva').value = profilo.piva || '';
            if (document.getElementById('azienda-telefono')) document.getElementById('azienda-telefono').value = profilo.telefono || '';
            if (document.getElementById('azienda-email')) document.getElementById('azienda-email').value = profilo.email || '';
            if (document.getElementById('azienda-pec')) document.getElementById('azienda-pec').value = profilo.pec || '';
            if (document.getElementById('azienda-iban')) document.getElementById('azienda-iban').value = profilo.iban || '';
            if (document.getElementById('azienda-indirizzo')) document.getElementById('azienda-indirizzo').value = profilo.indirizzo || '';
            if (document.getElementById('azienda-gps')) document.getElementById('azienda-gps').value = profilo.gps || '';
        }
    }

    formAzienda.addEventListener('submit', function(e) {
        e.preventDefault();

        const record = {
            ragioneSociale: document.getElementById('azienda-nome') ? document.getElementById('azienda-nome').value : '',
            piva: document.getElementById('azienda-piva') ? document.getElementById('azienda-piva').value : '',
            telefono: document.getElementById('azienda-telefono') ? document.getElementById('azienda-telefono').value : '',
            email: document.getElementById('azienda-email') ? document.getElementById('azienda-email').value : '',
            pec: document.getElementById('azienda-pec') ? document.getElementById('azienda-pec').value : '',
            iban: document.getElementById('azienda-iban') ? document.getElementById('azienda-iban').value : '',
            indirizzo: document.getElementById('azienda-indirizzo') ? document.getElementById('azienda-indirizzo').value : '',
            gps: document.getElementById('azienda-gps') ? document.getElementById('azienda-gps').value : ''
        };

        window.salvaDatabase('profilo_azienda', record);
        alert('Dati della sede aziendale e coordinate GPS salvati con successo!');
    });

    caricaDatiAzienda();
});
