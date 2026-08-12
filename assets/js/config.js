window.idAzienda = null;

const utenteAttivo = sessionStorage.getItem('utenteAttivo');
if (!utenteAttivo && !window.location.href.includes('accesso.html')) {
    window.location.href = 'accesso.html';
} else if (utenteAttivo) {
    window.idAzienda = JSON.parse(utenteAttivo).email;
}

window.leggiDatabase = function(tabella) {
    if (!window.idAzienda) return [];
    const dati = localStorage.getItem('db_' + tabella + '_' + window.idAzienda);
    return dati ? JSON.parse(dati) : [];
};

window.salvaDatabase = function(tabella, dati) {
    if (!window.idAzienda) return;
    localStorage.setItem('db_' + tabella + '_' + window.idAzienda, JSON.stringify(dati));
};

window.generaID = function(prefisso, db) {
    if (db.length === 0) return prefisso + '-00001';
    let maxNum = 0;
    db.forEach(item => {
        if(item.id && item.id.startsWith(prefisso)) {
            let numeroPart = parseInt(item.id.split('-')[1]);
            if(numeroPart > maxNum) maxNum = numeroPart;
        }
    });
    return prefisso + '-' + String(maxNum + 1).padStart(5, '0');
};

window.calcolaStatoScadenza = function(dataStringa) {
    if (!dataStringa) return { testo: 'Non impostata', badge: 'bg-gray-100 text-gray-600', eInAllarme: false };
    const dataScadenza = new Date(dataStringa);
    const oggi = new Date();
    oggi.setHours(0,0,0,0);
    const diffTempo = dataScadenza.getTime() - oggi.getTime();
    const giorniRimanenti = Math.ceil(diffTempo / (1000 * 3600 * 24));

    if (giorniRimanenti < 0) return { testo: 'Scaduto (' + Math.abs(giorniRimanenti) + ' gg fa)', badge: 'bg-red-100 text-red-800 font-bold', eInAllarme: true };
    else if (giorniRimanenti <= 30) return { testo: 'In scadenza (' + giorniRimanenti + ' gg)', badge: 'bg-orange-100 text-orange-800 font-bold', eInAllarme: true };
    else return { testo: 'Valido', badge: 'bg-emerald-100 text-emerald-800', eInAllarme: false };
};

document.addEventListener("DOMContentLoaded", function() {
    if (typeof lucide !== 'undefined') lucide.createIcons();

    if (utenteAttivo) {
        const datiUtente = JSON.parse(utenteAttivo);
        if (document.getElementById('etichetta-titolare')) document.getElementById('etichetta-titolare').textContent = datiUtente.nome.toUpperCase();
        if (document.getElementById('saluto-nome')) document.getElementById('saluto-nome').textContent = 'Ciao, ' + datiUtente.nome;
    }

    // --- NOVITÀ: RECUPERO NOME AZIENDA ---
    const etichettaTerzista = document.getElementById('etichetta-terzista');
    if (etichettaTerzista) {
        const profilo = window.leggiDatabase('profilo_azienda');
        // Verifica che il profilo esista, non sia un array vuoto e abbia la proprietà ragioneSociale
        if (profilo && !Array.isArray(profilo) && profilo.ragioneSociale) {
            etichettaTerzista.textContent = profilo.ragioneSociale;
        } else {
            etichettaTerzista.textContent = 'Configura Profilo';
        }
    }
    // --------------------------------------

    if (document.getElementById('data-odierna')) {
        const opzioniData = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('data-odierna').textContent = new Date().toLocaleDateString('it-IT', opzioniData);
    }

    // --- LOGICA INTELLIGENTE MENU LATERALE (VERSIONE BLINDATA) ---
    const linksMenu = document.querySelectorAll('nav a');
    let urlBrowser = window.location.href;

    // Gestione della pagina principale se non è scritto "index.html" nell'indirizzo
    if (urlBrowser.endsWith('/')) {
        urlBrowser += 'index.html';
    }

    linksMenu.forEach(link => {
        const paginaLinkata = link.getAttribute('href');

        // Controlla se il nome del file (es. storico.html) è contenuto nell'indirizzo attuale
        if (urlBrowser.includes(paginaLinkata)) {
            link.className = "flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-emerald-900 text-white font-medium transition cursor-pointer";
        } else {
            // Nota: ho lasciato i colori originali che avevi impostato, adatti al tema scuro/chiaro che stai usando
            if (document.querySelector('aside').classList.contains('bg-white')) {
                link.className = "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition cursor-pointer";
            } else {
                link.className = "flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-emerald-950 hover:text-white text-gray-400 transition cursor-pointer";
            }
        }
    });

    document.getElementById('btn-logout')?.addEventListener('click', function() {
        sessionStorage.removeItem('utenteAttivo');
        window.location.href = 'accesso.html';
    });
});
