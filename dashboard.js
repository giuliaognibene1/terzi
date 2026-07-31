document.addEventListener("DOMContentLoaded", function() {
    if (!document.getElementById('count-cantieri-oggi')) return;

    let allerteTagliandi = 0, allerteAssicurazioni = 0, allerteVisite = 0, allerteAttestati = 0, allertePatentini = 0;

    window.leggiDatabase('mezzi').forEach(mezzo => {
        if (window.calcolaStatoScadenza(mezzo.scadenzaRev).eInAllarme) allerteTagliandi++;
        if (window.calcolaStatoScadenza(mezzo.scadenzaAss).eInAllarme) allerteAssicurazioni++;
    });

    window.leggiDatabase('operatori').forEach(op => {
        if (window.calcolaStatoScadenza(op.scadVisita).eInAllarme) allerteVisite++;
        if (window.calcolaStatoScadenza(op.scadAttestato).eInAllarme) allerteAttestati++;
        if (op.patentini && Array.isArray(op.patentini)) {
            op.patentini.forEach(pat => { if (window.calcolaStatoScadenza(pat.scadenza).eInAllarme) allertePatentini++; });
        }
    });

    function gestisciScheda(idScheda, idCount, valore, tabDestinazione) {
        const scheda = document.getElementById(idScheda);
        const counter = document.getElementById(idCount);
        if (scheda && counter && valore > 0) {
            scheda.classList.remove('nascosto');
            counter.textContent = valore;
            scheda.addEventListener('click', () => {
                sessionStorage.setItem('filtroSpecialeScadenze', tabDestinazione);
                window.location.href = 'scadenze.html';
            });
        }
    }

    gestisciScheda('card-tagliandi', 'count-tagliandi', allerteTagliandi, 'mezzi');
    gestisciScheda('card-assicurazioni', 'count-assicurazioni', allerteAssicurazioni, 'mezzi');
    gestisciScheda('card-visite', 'count-visite', allerteVisite, 'operatori');
    gestisciScheda('card-attestati', 'count-attestati', allerteAttestati, 'operatori');
    gestisciScheda('card-patentini', 'count-patentini', allertePatentini, 'operatori');

    const commesseDb = window.leggiDatabase('commesse');
    const cantieriDb = window.leggiDatabase('cantieri');
    const cntPian = document.getElementById('count-da-pianificare');
    if (cntPian) cntPian.textContent = commesseDb.filter(c => c.stato === 'Da Pianificare').length;

    const oggi = new Date();
    oggi.setHours(0,0,0,0);
    const oggiIsoLocale = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`;
    const cntOggi = document.getElementById('count-cantieri-oggi');
    if (cntOggi) cntOggi.textContent = cantieriDb.filter(c => c.data === oggiIsoLocale).length;

    const contenitoreAgenda = document.getElementById('agenda-container');
    const giorniAgenda = [];
    for (let i = 0; i < 3; i++) {
        let d = new Date(oggi);
        d.setDate(oggi.getDate() + i);
        giorniAgenda.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }

    const cantieriProssimi = cantieriDb.filter(c => giorniAgenda.includes(c.data));

    if (contenitoreAgenda) {
        if (cantieriProssimi.length === 0) {
            contenitoreAgenda.innerHTML = `<div class="p-6 text-center"><i data-lucide="coffee" class="w-8 h-8 text-gray-300 mx-auto mb-2"></i><p class="text-sm text-gray-500">Nessun cantiere per i prossimi 3 giorni.</p></div>`;
        } else {
            cantieriProssimi.sort((a, b) => a.data === b.data ? a.oraInizio.localeCompare(b.oraInizio) : a.data.localeCompare(b.data));
            const clientiDb = window.leggiDatabase('clienti');
            const operatoriDb = window.leggiDatabase('operatori');
            const mezziDb = window.leggiDatabase('mezzi');

            let tabellaHTML = `<table class="w-full text-left border-collapse"><thead class="bg-gray-50 border-b border-gray-200"><tr><th class="p-3 text-xs font-bold uppercase text-gray-500">Data e Ora</th><th class="p-3 text-xs font-bold uppercase text-gray-500">Cliente / Commessa</th><th class="p-3 text-xs font-bold uppercase text-gray-500">Macchina</th><th class="p-3 text-xs font-bold uppercase text-gray-500">Operatore</th></tr></thead><tbody class="divide-y divide-gray-100 text-sm">`;

            cantieriProssimi.forEach(cant => {
                const com = commesseDb.find(c => c.id === cant.idCommessa);
                const cli = com ? clientiDb.find(c => c.id === com.idCliente) : null;
                const op = operatoriDb.find(o => o.id === cant.idOperatore);
                const mezzo = mezziDb.find(m => m.id === cant.idMezzo);
                const dataIta = new Date(cant.data).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
                let trClass = cant.data === oggiIsoLocale ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-gray-50';

                tabellaHTML += `<tr class="${trClass} transition"><td class="p-3"><p class="font-bold text-gray-900">${dataIta}</p><p class="text-xs text-gray-500">${cant.oraInizio} - ${cant.oraFine}</p></td><td class="p-3"><p class="font-bold text-gray-900">${cli ? cli.nome : 'N/D'}</p><p class="text-xs text-gray-600">${com ? com.lavorazione : 'N/D'}</p></td><td class="p-3 text-gray-700 font-medium">${mezzo ? mezzo.nome : 'N/D'}</td><td class="p-3 text-gray-700">${op ? op.nome : 'N/D'}</td></tr>`;
            });
            contenitoreAgenda.innerHTML = tabellaHTML + `</tbody></table>`;
        }
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
});