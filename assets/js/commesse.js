// assets/js/commesse.js
document.addEventListener("DOMContentLoaded", function() {
    if (!document.getElementById('lista-commesse')) return;

    function autoAllineaStatoCommesse() {
        let commesse = window.leggiDatabase('commesse');
        const cantieri = window.leggiDatabase('cantieri');
        let modificato = false;

        commesse.forEach(com => {
            const cantiereChiuso = cantieri.some(c => c.idCommessa === com.id && c.oreReali);
            if (cantiereChiuso && com.stato === 'Pianificato') {
                com.stato = 'Completato';
                modificato = true;
            }
        });

        if (modificato) window.salvaDatabase('commesse', commesse);
    }

    autoAllineaStatoCommesse();

    window.aggiornaTabellaCommesse = function() {
        const corpoTabella = document.getElementById('lista-commesse');
        if (!corpoTabella) return;

        let commesse = window.leggiDatabase('commesse');
        const clienti = window.leggiDatabase('clienti');
        const preventivi = window.leggiDatabase('preventivi');
        const termineRicerca = document.getElementById('cerca-commesse')?.value.toLowerCase() || '';

        corpoTabella.innerHTML = '';

        if (commesse.length === 0) {
            corpoTabella.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-sm text-gray-500">Nessuna commessa presente nel sistema.</td></tr>';
            return;
        }

        const prioritaStato = {
            'Da Pianificare': 1,
            'Pianificato': 2,
            'Completato': 3
        };

        commesse.sort((a, b) => {
            const pA = prioritaStato[a.stato] || 99;
            const pB = prioritaStato[b.stato] || 99;
            if (pA !== pB) return pA - pB;
            return b.id.localeCompare(a.id, undefined, { numeric: true, sensitivity: 'base' });
        });

        commesse.forEach((item) => {
            const cli = clienti.find(c => c.id === item.idCliente);
            const nomeCliente = cli ? cli.nome : 'N/D';

            if (termineRicerca && !nomeCliente.toLowerCase().includes(termineRicerca) && !item.lavorazione.toLowerCase().includes(termineRicerca) && !item.id.toLowerCase().includes(termineRicerca)) {
                return;
            }

            let coloreBadge = 'bg-gray-100 text-gray-800';
            if (item.stato === 'Da Pianificare') coloreBadge = 'bg-blue-100 text-blue-800 font-bold';
            else if (item.stato === 'Pianificato') coloreBadge = 'bg-orange-100 text-orange-800 font-bold';
            else if (item.stato === 'Completato') coloreBadge = 'bg-emerald-100 text-emerald-800 font-black';

            const dataInizioFormattata = item.dataInizio ? new Date(item.dataInizio).toLocaleDateString('it-IT') : 'N/D';
            const dataFineFormattata = item.dataFine ? new Date(item.dataFine).toLocaleDateString('it-IT') : 'N/D';

            const prevCollegato = preventivi.find(p => p.idCommessa === item.id || p.id === item.idPreventivo);
            let badgePreventivoHtml = '';

            if (prevCollegato) {
                badgePreventivoHtml = `
                    <button type="button" onclick="mostraDettaglioPreventivo('${prevCollegato.id}')" class="block mt-1 font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 px-1.5 py-0.5 rounded transition" title="Visualizza Preventivo Collegato">
                        <i data-lucide="calculator" class="w-3 h-3 inline mr-0.5"></i>${prevCollegato.id}
                    </button>`;
            }

            const idCommessaCorrente = item.id;

            corpoTabella.innerHTML += `
                <tr class="hover:bg-gray-50 border-b border-gray-100 transition">
                    <td class="p-4 text-center">
                        <button type="button" onclick="avviaModificaCommessaPerId('${idCommessaCorrente}')" class="text-blue-600 hover:text-blue-800"><i data-lucide="edit-3" class="w-4 h-4 inline"></i></button>
                    </td>
                    <td class="p-4 font-mono text-xs text-gray-500 font-bold">
                        <span>${item.id}</span>
                        ${badgePreventivoHtml}
                        ${item.idRichiesta ? `<span class="block mt-1 text-[9px] text-blue-500 font-bold uppercase tracking-wider"><i data-lucide="globe" class="w-3 h-3 inline"></i> Da Portale</span>` : ''}
                    </td>
                    <td class="p-4">
                        <p class="font-bold text-gray-900">${nomeCliente}</p>
                        <p class="text-xs text-gray-500">ID Cliente: ${item.idCliente}</p>
                    </td>
                    <td class="p-4">
                        <p class="font-semibold text-gray-800">${item.lavorazione}</p>
                        <p class="text-xs text-emerald-700 font-bold">${item.ettari} Ha</p>
                    </td>
                    <td class="p-4 text-xs text-gray-600">
                        <span>Dal: ${dataInizioFormattata}</span><br>
                        <span>Al: ${dataFineFormattata}</span>
                    </td>
                    <td class="p-4">
                        <span class="px-2.5 py-1 text-xs rounded-full ${coloreBadge}">${item.stato}</span>
                    </td>
                    <td class="p-4 text-center">
                        <button type="button" onclick="rimuoviCommessaPerId('${idCommessaCorrente}')" class="text-red-500 hover:text-red-700" title="Elimina e/o Rilascia sul portale"><i data-lucide="trash-2" class="w-5 h-5 inline"></i></button>
                    </td>
                </tr>`;
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    window.mostraDettaglioPreventivo = function(idPreventivo) {
        const preventivi = window.leggiDatabase('preventivi');
        const clienti = window.leggiDatabase('clienti');
        const p = preventivi.find(prev => prev.id === idPreventivo);
        if (!p) return;

        const cli = clienti.find(c => c.id === p.idCliente);
        const totale = parseFloat(p.ettari) * parseFloat(p.tariffaUnitario);

        document.getElementById('prev-view-id').textContent = p.id;
        document.getElementById('prev-view-cliente').textContent = cli ? cli.nome : 'N/D';
        document.getElementById('prev-view-lavorazione').textContent = p.lavorazione;
        document.getElementById('prev-view-ettari').textContent = `${p.ettari} Ha`;
        document.getElementById('prev-view-tariffa').textContent = `€ ${p.tariffaUnitario} / ${p.modalitaTariffa === 'ettaro' ? 'Ha' : 'ora'}`;
        document.getElementById('prev-view-totale').textContent = `€ ${totale.toFixed(2)}`;

        document.getElementById('modale-dettaglio-preventivo').style.display = 'flex';
    };

    document.getElementById('btn-chiudi-view-prev')?.addEventListener('click', () => {
        document.getElementById('modale-dettaglio-preventivo').style.display = 'none';
    });

    function caricaSelectClienti() {
        const selectCliente = document.getElementById('com-idcliente');
        if (!selectCliente) return;
        selectCliente.innerHTML = '<option value="">Seleziona il cliente destinatario...</option>';
        window.leggiDatabase('clienti').forEach(c => {
            selectCliente.innerHTML += `<option value="${c.id}">${c.nome} (${c.id})</option>`;
        });
    }

    document.getElementById('btn-nuova-commessa')?.addEventListener('click', () => {
        caricaSelectClienti();
        document.getElementById('form-commesse').reset();
        document.getElementById('com-indice').value = "";
        document.getElementById('com-id').value = "";
        document.getElementById('modale-commesse').style.display = 'flex';
    });

    window.avviaModificaCommessaPerId = function(idCommessa) {
        caricaSelectClienti();
        let db = window.leggiDatabase('commesse');
        const indice = db.findIndex(c => c.id === idCommessa);
        if (indice === -1) return;
        let item = db[indice];

        document.getElementById('com-indice').value = indice;
        document.getElementById('com-id').value = item.id;
        document.getElementById('com-idcliente').value = item.idCliente;
        document.getElementById('com-lavorazione').value = item.lavorazione;
        document.getElementById('com-ettari').value = item.ettari;
        document.getElementById('com-datainizio').value = item.dataInizio;
        document.getElementById('com-datafine').value = item.dataFine;
        document.getElementById('com-stato').value = item.stato;
        document.getElementById('com-gps').value = item.gps || '';
        document.getElementById('com-note').value = item.note || '';

        document.getElementById('modale-commesse').style.display = 'flex';
    };

    document.getElementById('form-commesse')?.addEventListener('submit', function(e) {
        e.preventDefault();
        let db = window.leggiDatabase('commesse');
        const indice = document.getElementById('com-indice').value;

        // Recupero idPreventivo e idRichiesta per non perderli se si salva la modifica
        let idPrevEsistente = null;
        let idRichiestaEsistente = null;
        if (indice !== "" && db[indice]) {
            idPrevEsistente = db[indice].idPreventivo;
            idRichiestaEsistente = db[indice].idRichiesta;
        }

        const record = {
            id: document.getElementById('com-id').value || window.generaID('COM', db),
            idPreventivo: idPrevEsistente,
            idRichiesta: idRichiestaEsistente, // Manteniamo il legame con il portale!
            idCliente: document.getElementById('com-idcliente').value,
            lavorazione: document.getElementById('com-lavorazione').value,
            ettari: document.getElementById('com-ettari').value,
            dataInizio: document.getElementById('com-datainizio').value,
            dataFine: document.getElementById('com-datafine').value,
            stato: document.getElementById('com-stato').value,
            gps: document.getElementById('com-gps').value,
            note: document.getElementById('com-note').value
        };

        if (indice === "") db.unshift(record);
        else db[indice] = record;

        window.salvaDatabase('commesse', db);
        document.getElementById('modale-commesse').style.display = 'none';
        window.aggiornaTabellaCommesse();
    });

    // ELIMINAZIONE INTELLIGENTE COMMESSA + PULIZIA AUTOMATICA PIANIFICAZIONE (CANTIERI)
    window.rimuoviCommessaPerId = function(idCommessa) {
        if (confirm("Sei sicuro di voler eliminare questa commessa? Se è già stata pianificata, verrà rimossa anche dal calendario.")) {

            let db = window.leggiDatabase('commesse');
            const indice = db.findIndex(c => c.id === idCommessa);

            if (indice !== -1) {
                const commessaDaEliminare = db[indice];

                // 1. Se la commessa proviene dal portale, ripristiniamo la richiesta per l'agricoltore
                if (commessaDaEliminare.idRichiesta) {
                    let tutteLeRichieste = JSON.parse(localStorage.getItem('databaseRichiesteLavoro')) || [];
                    let indiceRichiesta = tutteLeRichieste.findIndex(r => r.id == commessaDaEliminare.idRichiesta);

                    if (indiceRichiesta !== -1) {
                        tutteLeRichieste[indiceRichiesta].stato = "IN ATTESA";
                        localStorage.setItem('databaseRichiesteLavoro', JSON.stringify(tutteLeRichieste));
                    }
                }

                // 2. PULIZIA PIANIFICAZIONE: Rimuoviamo i cantieri/eventi a calendario collegati a questa commessa
                let cantieriDb = window.leggiDatabase('cantieri') || [];
                let cantieriAggiornati = cantieriDb.filter(c => c.idCommessa != idCommessa);
                window.salvaDatabase('cantieri', cantieriAggiornati);

                // 3. Eliminiamo la commessa dal database commesse
                db.splice(indice, 1);
                window.salvaDatabase('commesse', db);

                alert("Commessa e relativa pianificazione cancellate con successo.");
                window.aggiornaTabellaCommesse();
            }
        }
    };

    document.querySelectorAll('.btn-chiudi').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('modale-commesse').style.display = 'none';
        });
    });

    document.getElementById('cerca-commesse')?.addEventListener('input', window.aggiornaTabellaCommesse);

    window.aggiornaTabellaCommesse();

    // --- LETTORE PARAMETRI URL PER APERTURA AUTOMATICA COMMESSA ---
    const urlParams = new URLSearchParams(window.location.search);
    const idDaAprire = urlParams.get('apri');
    if (idDaAprire) {
        setTimeout(() => {
            if (typeof window.avviaModificaCommessaPerId === 'function') {
                window.avviaModificaCommessaPerId(idDaAprire);
            }
        }, 150);
    }
});
