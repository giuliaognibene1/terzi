// assets/js/azienda.js
document.addEventListener("DOMContentLoaded", function() {
    if (!document.getElementById('form-azienda')) return;

    const formAzienda = document.getElementById('form-azienda');

    function caricaDatiAzienda() {
        const profilo = window.leggiDatabase('profilo_azienda');
        if (profilo && !Array.isArray(profilo)) {
            if (document.getElementById('azi-ragione-sociale')) document.getElementById('azi-ragione-sociale').value = profilo.ragioneSociale || '';
            if (document.getElementById('azi-piva')) document.getElementById('azi-piva').value = profilo.piva || '';
            if (document.getElementById('azi-indirizzo')) document.getElementById('azi-indirizzo').value = profilo.indirizzo || '';
            if (document.getElementById('azi-gps')) document.getElementById('azi-gps').value = profilo.gps || '';
            if (document.getElementById('azi-telefono')) document.getElementById('azi-telefono').value = profilo.telefono || '';
            if (document.getElementById('azi-email')) document.getElementById('azi-email').value = profilo.email || '';
        }
    }

    formAzienda.addEventListener('submit', function(e) {
        e.preventDefault();
        const record = {
            ragioneSociale: document.getElementById('azi-ragione-sociale').value,
            piva: document.getElementById('azi-piva').value,
            indirizzo: document.getElementById('azi-indirizzo').value,
            gps: document.getElementById('azi-gps').value,
            telefono: document.getElementById('azi-telefono').value,
            email: document.getElementById('azi-email').value
        };
        window.salvaDatabase('profilo_azienda', record);
        alert('Dati della sede aziendale salvati con successo! I trasferimenti stradali calcoleranno ora la partenza da queste coordinate.');
    });

    caricaDatiAzienda();
});