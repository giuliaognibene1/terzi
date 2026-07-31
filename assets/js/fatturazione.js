// assets/js/fatturazione.js
document.addEventListener("DOMContentLoaded", function() {
    if (!document.getElementById('lista-pronte-fattura')) return;

    const TARIFFA_CONGUAGLIO_ORARIO = 60;

    function orarioInMinuti(orarioTesto) {
        if (!orarioTesto) return 0;
        const [h, m] = orarioTesto.split(':').map(Number);
        return (h * 60) + m;
    }

    const tabPrev = document.getElementById('tab-preventivi');
    const tabFat = document.getElementById('tab-fatture');

    tabPrev?.addEventListener('click', () => {
        tabPrev.className = "py-4 font-bold text-sm border-b-2 border-emerald-800 text-emerald-800 focus:outline-none cursor-pointer flex items-center";
        tabFat.className = "py-4 font-bold text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer flex items-center";
        document.getElementById('sezione-preventivi').style.display = 'block';
        document.getElementById('sezione-fatture').style.display = 'none';
    });

    tabFat?.addEventListener('click', () => {
        tabFat.className = "py-4 font-bold text-sm border-b-2 border-emerald-800 text-emerald-800 focus:outline-none cursor-pointer flex items-center";
        tabPrev.className = "py-4 font-bold text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer flex items-center";
        document.getElementById('sezione-preventivi').style.display = 'none';
        document.getElementById('sezione-fatture').style.display = 'block';
    });

    function caricaSelectClientiPreventivo(callback) {
        const selectCliente = document.getElementById('prev-cliente');
        if (!selectCliente) return;
        selectCliente.innerHTML = '<option value="">Seleziona cliente...</option>';
        window.leggiDatabase('clienti').forEach(c => {
            selectCliente.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
        });
        if (callback) callback();
    }

    window.aggiornaTabelleFatturazione = function() {
        const corpoPrev = document.getElementById('lista-preventivi');
        const corpoPronte = document.getElementById('lista-pronte-fattura');
        const corpoEmesse = document.getElementById('lista-fatture-emesse');

        const preventivi = window.leggiDatabase('preventivi');
        let commesse = window.leggiDatabase('commesse');
        const cantieri = window.leggiDatabase('cantieri');
        const clienti = window.leggiDatabase('clienti');
        const fatture = window.leggiDatabase('fatture');

        if (corpoPrev) {
            corpoPrev.innerHTML = '';
            if (preventivi.length === 0) {
                corpoPrev.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-sm text-gray-500">Nessun preventivo archiviato.</td></tr>';
            } else {
                preventivi.forEach(p => {
                    const cli = clienti.find(c => c.id === p.idCliente);
                    const importo = parseFloat(p.ettari) * parseFloat(p.tariffaUnitario);
                    const badgeStato = p.stato === 'Approvato' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800';

                    // COSTRUZIONE DELLE AZIONI SEMPRE VISIBILI
                    let azioneColonna = `<div class="flex items-center justify-center space-x-2">`;

                    if (p.stato === 'In Attesa') {
                        azioneColonna += `<button type="button" onclick="approvaEAvviaPreventivo('${p.id}')" class="bg-gray-100 hover:bg-emerald-800 text-gray-700 hover:text-white font-bold py-1 px-3 rounded text-xs transition cursor-pointer">Avvia Lavoro</button>`;
                    } else if (p.stato === 'Approvato') {
                        let commessaCreata = commesse.find(c => c.idPreventivo === p.id || c.id === p.idCommessa);
                        if (!commessaCreata) {
                            commessaCreata = commesse.find(c => c.idCliente === p.idCliente && c.lavorazione === p.lavorazione && parseFloat(c.ettari) === parseFloat(p.ettari));
                        }

                        let idComCollegata = 'N/D';
                        if (commessaCreata) {
                            idComCollegata = commessaCreata.id;
                            if (!commessaCreata.idPreventivo) {
                                commessaCreata.idPreventivo = p.id;
                                window.salvaDatabase('commesse', commesse);
                            }
                            if (p.idCommessa !== idComCollegata) {
                                p.idCommessa = idComCollegata;
                                window.salvaDatabase('preventivi', preventivi);
                            }
                        }

                        if (idComCollegata !== 'N/D') {
                            azioneColonna += `<a href="commesse.html?apri=${idComCollegata}" class="inline-flex items-center space-x-1 font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 transition" title="Apri scheda commessa operativa"><i data-lucide="external-link" class="w-3 h-3"></i><span>${idComCollegata}</span></a>`;
                        } else {
                            azioneColonna += `<span class="text-xs text-gray-400 font-medium italic">Avviata (N/D)</span>`;
                        }
                    }

                    // AGGIUNTA MATITA ED ELIMINA SEMPRE VISIBILI
                    azioneColonna += `
                        <button type="button" onclick="apriModificaPreventivo('${p.id}')" class="p-1 text-gray-500 hover:text-emerald-800 transition cursor-pointer" title="Modifica preventivo">
                            <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        <button type="button" onclick="eliminaPreventivo('${p.id}')" class="p-1 text-gray-500 hover:text-red-600 transition cursor-pointer" title="Elimina preventivo">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>`;

                    corpoPrev.innerHTML += `
                        <tr class="hover:bg-gray-50 transition">
                            <td class="p-4 font-mono text-xs text-gray-600">${p.id}</td>
                            <td class="p-4 font-bold text-gray-900">${cli ? cli.nome : 'N/D'}</td>
                            <td class="p-4 text-gray-700">${p.lavorazione} (<span class="font-bold">${p.ettari} Ha</span>)</td>
                            <td class="p-4 text-xs capitalize">${p.tariffaUnitario} €/${p.modalitaTariffa === 'ettaro' ? 'Ha' : 'ora'}</td>
                            <td class="p-4 font-mono font-bold text-gray-900">€ ${importo.toFixed(2)}</td>
                            <td class="p-4"><span class="px-2 py-0.5 text-xs font-bold rounded ${badgeStato}">${p.stato}</span></td>
                            <td class="p-4 text-center">${azioneColonna}</td>
                        </tr>`;
                });
            }
        }

        const commesseCompletate = commesse.filter(c => c.stato === 'Completato' && !fatture.some(f => f.idCommessa === c.id));
        if (corpoPronte) {
            corpoPronte.innerHTML = '';
            if (commesseCompletate.length === 0) {
                corpoPronte.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-sm text-gray-500">Nessun cantiere completato in attesa.</td></tr>';
            } else {
                commesseCompletate.forEach(com => {
                    const cli = clienti.find(c => c.id === com.idCliente);
                    const cantieriCom = cantieri.filter(ca => ca.idCommessa === com.id);

                    let oreStimateTotali = 0;
                    let oreRealiTotali = 0;

                    cantieriCom.forEach(ca => {
                        const oreStimate = (orarioInMinuti(ca.oraFine) - orarioInMinuti(ca.oraInizio)) / 60;
                        oreStimateTotali += oreStimate;
                        oreRealiTotali += ca.oreReali ? parseFloat(ca.oreReali) : oreStimate;
                    });

                    const tariffaHa = com.tariffaUnitario ? parseFloat(com.tariffaUnitario) : 95;
                    const basePreventivata = parseFloat(com.ettari) * tariffaHa;

                    let oreExtra = oreRealiTotali - oreStimateTotali;
                    if (oreExtra < 0) oreExtra = 0;

                    const conguaglioExtra = oreExtra * TARIFFA_CONGUAGLIO_ORARIO;
                    const totaleFatturabile = basePreventivata + conguaglioExtra;

                    corpoPronte.innerHTML += `
                        <tr class="hover:bg-gray-50 transition">
                            <td class="p-4 font-mono text-xs font-bold text-gray-600">${com.id}</td>
                            <td class="p-4 font-bold text-gray-900">${cli ? cli.nome : 'N/D'}</td>
                            <td class="p-4 text-gray-700">${com.lavorazione} (${com.ettari} Ha)</td>
                            <td class="p-4 font-mono text-gray-800">€ ${basePreventivata.toFixed(2)}</td>
                            <td class="p-4 font-mono text-orange-600 font-bold">+ € ${conguaglioExtra.toFixed(2)}</td>
                            <td class="p-4 font-mono font-black text-emerald-700 text-base">€ ${totaleFatturabile.toFixed(2)}</td>
                            <td class="p-4 text-center">
                                <button type="button" onclick="apriModaleFattura('${com.id}', '${cli ? cli.nome.replace(/'/g, "\\'") : 'N/D'}', '${com.lavorazione}', ${basePreventivata}, ${conguaglioExtra}, ${totaleFatturabile})" class="bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-1 px-3 rounded text-xs transition cursor-pointer">Fattura</button>
                            </td>
                        </tr>`;
                });
            }
        }

        if (corpoEmesse) {
            corpoEmesse.innerHTML = '';
            if (fatture.length === 0) {
                corpoEmesse.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-sm text-gray-500">Nessuna fattura emessa.</td></tr>';
            } else {
                fatture.forEach((f, index) => {
                    const badgeStato = f.stato === 'Pagata' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800';
                    corpoEmesse.innerHTML += `
                        <tr class="hover:bg-gray-50 transition">
                            <td class="p-4 font-mono font-bold text-gray-900">FAT-${f.numero}</td>
                            <td class="p-4 text-xs text-gray-600">${new Date(f.data).toLocaleDateString('it-IT')}</td>
                            <td class="p-4 font-bold text-gray-800">${f.nomeCliente}</td>
                            <td class="p-4 font-mono font-black text-gray-900">€ ${parseFloat(f.totale).toFixed(2)}</td>
                            <td class="p-4"><span class="px-2.5 py-1 text-xs font-bold rounded-full ${badgeStato}">${f.stato}</span></td>
                            <td class="p-4 text-center">
                                <div class="flex items-center justify-center space-x-3">
                                    <button type="button" onclick="cambiaStatoPagamento(${index})" class="text-blue-600 hover:text-blue-800 font-bold text-xs underline cursor-pointer">${f.stato === 'Pagata' ? 'Segna In Attesa' : 'Segna Pagata'}</button>
                                    <button type="button" onclick="eliminaFattura('${f.id}')" class="p-1 text-gray-500 hover:text-red-600 transition cursor-pointer" title="Elimina fattura">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>`;
                });
            }
        }

        if (document.getElementById('badge-preventivi')) document.getElementById('badge-preventivi').textContent = preventivi.length;
        if (document.getElementById('badge-pronte-fattura')) document.getElementById('badge-pronte-fattura').textContent = commesseCompletate.length;
        if (document.getElementById('badge-fatture-emesse')) document.getElementById('badge-fatture-emesse').textContent = fatture.length;

        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    document.getElementById('btn-nuovo-preventivo')?.addEventListener('click', () => {
        caricaSelectClientiPreventivo();
        document.getElementById('form-preventivo').reset();
        document.getElementById('prev-id-edita').value = "";

        const elemGps = document.getElementById('prev-gps');
        if(elemGps) elemGps.value = "";

        document.getElementById('prev-totale-stimato').textContent = "€ 0.00";
        document.getElementById('modale-preventivo').style.display = 'flex';
    });

    function calcolaStimaPreventivo() {
        const ettari = parseFloat(document.getElementById('prev-ettari').value) || 0;
        const tariffa = parseFloat(document.getElementById('prev-tariffa').value) || 0;
        document.getElementById('prev-totale-stimato').textContent = `€ ${(ettari * tariffa).toFixed(2)}`;
    }
    document.getElementById('prev-ettari')?.addEventListener('input', calcolaStimaPreventivo);
    document.getElementById('prev-tariffa')?.addEventListener('input', calcolaStimaPreventivo);

    document.getElementById('form-preventivo')?.addEventListener('submit', function(e) {
        e.preventDefault();
        let preventivi = window.leggiDatabase('preventivi');
        const idEdita = document.getElementById('prev-id-edita').value;

        const elemGps = document.getElementById('prev-gps');
        const gpsValore = elemGps ? elemGps.value.trim() : "";

        if (idEdita) {
            const idx = preventivi.findIndex(p => p.id === idEdita);
            if (idx !== -1) {
                preventivi[idx].idCliente = document.getElementById('prev-cliente').value;
                preventivi[idx].lavorazione = document.getElementById('prev-tipo').value;
                preventivi[idx].ettari = document.getElementById('prev-ettari').value;
                preventivi[idx].tariffaUnitario = document.getElementById('prev-tariffa').value;
                preventivi[idx].modalitaTariffa = document.getElementById('prev-modalita').value;
                preventivi[idx].gps = gpsValore;
            }
        } else {
            const record = {
                id: window.generaID('PRV', preventivi),
                idCliente: document.getElementById('prev-cliente').value,
                lavorazione: document.getElementById('prev-tipo').value,
                ettari: document.getElementById('prev-ettari').value,
                tariffaUnitario: document.getElementById('prev-tariffa').value,
                modalitaTariffa: document.getElementById('prev-modalita').value,
                gps: gpsValore,
                stato: 'In Attesa',
                idCommessa: null
            };
            preventivi.unshift(record);
        }

        window.salvaDatabase('preventivi', preventivi);
        document.getElementById('modale-preventivo').style.display = 'none';
        window.aggiornaTabelleFatturazione();
    });

    window.apriModificaPreventivo = function(idPreventivo) {
        const preventivi = window.leggiDatabase('preventivi');
        const p = preventivi.find(item => item.id === idPreventivo);
        if (!p) return;

        caricaSelectClientiPreventivo(() => {
            document.getElementById('prev-id-edita').value = p.id;
            document.getElementById('prev-cliente').value = p.idCliente;
            document.getElementById('prev-tipo').value = p.lavorazione;
            document.getElementById('prev-ettari').value = p.ettari;
            document.getElementById('prev-tariffa').value = p.tariffaUnitario;
            document.getElementById('prev-modalita').value = p.modalitaTariffa || 'ettaro';

            const elemGps = document.getElementById('prev-gps');
            if(elemGps) elemGps.value = p.gps || "";

            calcolaStimaPreventivo();
            document.getElementById('modale-preventivo').style.display = 'flex';
        });
    };

    window.eliminaPreventivo = function(idPreventivo) {
        if(confirm('Sei sicuro di voler eliminare questo preventivo dal sistema?')) {
            let preventivi = window.leggiDatabase('preventivi');
            preventivi = preventivi.filter(p => p.id !== idPreventivo);
            window.salvaDatabase('preventivi', preventivi);
            window.aggiornaTabelleFatturazione();
        }
    };

    window.approvaEAvviaPreventivo = function(idPreventivo) {
        let preventivi = window.leggiDatabase('preventivi');
        let commesse = window.leggiDatabase('commesse');

        const idx = preventivi.findIndex(p => p.id === idPreventivo);
        if (idx === -1) return;

        const idNuovaCommessa = window.generaID('COM', commesse);

        preventivi[idx].stato = 'Approvato';
        preventivi[idx].idCommessa = idNuovaCommessa;

        const recordCommessa = {
            id: idNuovaCommessa,
            idPreventivo: idPreventivo,
            idCliente: preventivi[idx].idCliente,
            lavorazione: preventivi[idx].lavorazione,
            ettari: preventivi[idx].ettari,
            tariffaUnitario: preventivi[idx].tariffaUnitario,
            modalitaTariffa: preventivi[idx].modalitaTariffa,
            gps: preventivi[idx].gps || '',
            dataInizio: new Date().toISOString().split('T')[0],
            dataFine: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            stato: 'Da Pianificare',
            note: 'Generato da Preventivo ' + idPreventivo
        };

        commesse.unshift(recordCommessa);

        window.salvaDatabase('preventivi', preventivi);
        window.salvaDatabase('commesse', commesse);

        alert(`Preventivo ${idPreventivo} approvato! Generata la commessa ${idNuovaCommessa}.`);
        window.aggiornaTabelleFatturazione();
    };

    window.apriModaleFattura = function(idCommessa, nomeCliente, lavorazione, base, conguaglio, totale) {
        document.getElementById('fat-idcommessa').value = idCommessa;
        document.getElementById('fat-cliente').textContent = nomeCliente;
        document.getElementById('fat-lavorazione').textContent = lavorazione;
        document.getElementById('fat-base').textContent = `€ ${base.toFixed(2)}`;
        document.getElementById('fat-conguaglio').textContent = `+ € ${conguaglio.toFixed(2)}`;
        document.getElementById('fat-totale').textContent = `€ ${totale.toFixed(2)}`;

        const fatture = window.leggiDatabase('fatture');
        document.getElementById('fat-numero').value = String(fatture.length + 1).padStart(3, '0') + '/' + new Date().getFullYear();
        document.getElementById('fat-data').value = new Date().toISOString().split('T')[0];

        document.getElementById('modale-fattura').style.display = 'flex';
    };

    document.getElementById('form-emetti-fattura')?.addEventListener('submit', function(e) {
        e.preventDefault();
        let fatture = window.leggiDatabase('fatture');

        const record = {
            id: window.generaID('FAT', fatture),
            idCommessa: document.getElementById('fat-idcommessa').value,
            nomeCliente: document.getElementById('fat-cliente').textContent,
            numero: document.getElementById('fat-numero').value,
            data: document.getElementById('fat-data').value,
            totale: document.getElementById('fat-totale').textContent.replace('€ ', ''),
            stato: document.getElementById('fat-stato').value
        };

        fatture.unshift(record);
        window.salvaDatabase('fatture', fatture);
        document.getElementById('modale-fattura').style.display = 'none';
        window.aggiornaTabelleFatturazione();
    });

    window.cambiaStatoPagamento = function(index) {
        let fatture = window.leggiDatabase('fatture');
        fatture[index].stato = fatture[index].stato === 'Pagata' ? 'In Attesa' : 'Pagata';
        window.salvaDatabase('fatture', fatture);
        window.aggiornaTabelleFatturazione();
    };

    window.eliminaFattura = function(idFattura) {
        if(confirm('Sei sicuro di voler annullare/eliminare questa fattura emessa?')) {
            let fatture = window.leggiDatabase('fatture');
            fatture = fatture.filter(f => f.id !== idFattura);
            window.salvaDatabase('fatture', fatture);
            window.aggiornaTabelleFatturazione();
        }
    };

    document.querySelectorAll('.btn-chiudi-fattura, .btn-chiudi-preventivo').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('modale-fattura').style.display = 'none';
            document.getElementById('modale-preventivo').style.display = 'none';
        });
    });

    window.aggiornaTabelleFatturazione();
});