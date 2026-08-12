// assets/js/anagrafiche.js
document.addEventListener("DOMContentLoaded", function() {
    if (!document.getElementById('lista-clienti')) return;

    const catalogoMezzi = {
        'Trattore': ['John Deere 8R 410', 'Fendt 942 Vario', 'New Holland T7', 'Case IH Puma 240', 'Altro (Inserisci manualmente...)'],
        'Mietitrebbia': ['Claas Lexion 8900', 'New Holland CR11', 'John Deere X9', 'Altro (Inserisci manualmente...)'],
        'Escavatore': ['Caterpillar 320', 'Komatsu PC210', 'Altro (Inserisci manualmente...)'],
        'Furgone': ['Iveco Daily', 'Fiat Ducato', 'Altro (Inserisci manualmente...)'],
        'Drone': ['DJI Agras T40', 'Altro (Inserisci manualmente...)'],
        'Botte Irroratrice': ['Caffini Striker', 'Mazzotti MAF', 'Altro (Inserisci manualmente...)'],
        'Trincia': ['Maschio Gaspardo', 'Altro (Inserisci manualmente...)']
    };

    const selettoreTipo = document.getElementById('mez-tipo');
    const selettoreNome = document.getElementById('mez-nome');

    if (selettoreNome && !document.getElementById('mez-nome-manuale')) {
        selettoreNome.insertAdjacentHTML('afterend', '<input type="text" id="mez-nome-manuale" placeholder="Scrivi marca e modello esatto..." class="w-full px-3 py-2 border rounded-md outline-none focus:border-orange-500 mt-2" style="display: none;">');
    }
    const campoNomeManuale = document.getElementById('mez-nome-manuale');

    if (selettoreTipo && selettoreNome) {
        selettoreTipo.addEventListener('change', function() {
            selettoreNome.innerHTML = '<option value="">Seleziona modello specifico...</option>';
            if(campoNomeManuale) { campoNomeManuale.style.display = 'none'; campoNomeManuale.value = ''; }
            if (this.value && catalogoMezzi[this.value]) {
                catalogoMezzi[this.value].forEach(mezzo => { selettoreNome.innerHTML += `<option value="${mezzo}">${mezzo}</option>`; });
            }
        });
        selettoreNome.addEventListener('change', function() {
            if (this.value === 'Altro (Inserisci manualmente...)') {
                campoNomeManuale.style.display = 'block'; campoNomeManuale.setAttribute('required', 'true');
            } else {
                campoNomeManuale.style.display = 'none'; campoNomeManuale.removeAttribute('required'); campoNomeManuale.value = '';
            }
        });
    }

    // --- LOGICA CORRETTA PER LOCALIZZAZIONE FLOTTA IN TEMPO REALE ---
    function calcolaPosizioneAttualeMezzo(idMezzo) {
        const cantieri = window.leggiDatabase('cantieri') || [];
        const commesse = window.leggiDatabase('commesse') || [];

        const oggi = new Date();
        const dataOdiernaIso = oggi.toISOString().split('T')[0];

        // Calcolo minuti assoluti per evitare problemi di stringhe "14:30" vs "07:30"
        const minutiAttuali = (oggi.getHours() * 60) + oggi.getMinutes();

        const cantieriOggi = cantieri.filter(c => String(c.idMezzo).trim() === String(idMezzo).trim() && c.data === dataOdiernaIso);

        if (cantieriOggi.length === 0) {
            return '<span class="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block">IN SEDE</span>';
        }

        let cantiereRiferimento = null;

        for (let cantiere of cantieriOggi) {
            if (!cantiere.oraInizio || !cantiere.oraFine) continue;

            const [startH, startM] = cantiere.oraInizio.split(':').map(Number);
            const [endH, endM] = cantiere.oraFine.split(':').map(Number);

            const minInizio = (startH * 60) + startM;
            const minFine = (endH * 60) + endM;

            // Il mezzo è nel cantiere SE l'ora attuale è compresa tra inizio e fine
            // Manteniamo una tolleranza di 15 minuti prima (trasferimento) e 15 minuti dopo
            if (minutiAttuali >= (minInizio - 15) && minutiAttuali <= (minFine + 15)) {
                cantiereRiferimento = cantiere;
                break;
            }
        }

        // Se abbiamo trovato un cantiere attivo o in fase di trasferimento (tolleranza 15 min)
        if (cantiereRiferimento) {
            const commessaAssociata = commesse.find(co => String(co.id).trim() === String(cantiereRiferimento.idCommessa).trim());
            if (commessaAssociata && commessaAssociata.gps && commessaAssociata.gps.trim() !== "") {
                const gpsCoords = commessaAssociata.gps.trim();
                const urlMaps = `http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(gpsCoords)}`;
                return `<a href="${urlMaps}" target="_blank" class="text-xs font-mono font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded inline-flex items-center space-x-1 cursor-pointer transition shadow-sm" title="Mezzo in campo: apri mappa">
                            <i data-lucide="map-pin" class="w-3 h-3 inline text-blue-600 mr-1"></i><span class="animate-pulse">${gpsCoords}</span>
                        </a>`;
            } else {
                 return `<span class="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-1 rounded inline-block">IN CANTIERE (No GPS)</span>`;
            }
        }

        // Se non rientra in nessuno slot (nemmeno con tolleranza), allora è in sede
        return '<span class="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block">IN SEDE</span>';
    }
    // --- FINE LOGICA LOCALIZZAZIONE ---

    window.aggiornaTabelleAnagrafiche = function() {
        const corpoClienti = document.getElementById('lista-clienti');
        const corpoMezzi = document.getElementById('lista-mezzi');
        const corpoOperatori = document.getElementById('lista-operatori');
        const termCli = document.getElementById('cerca-clienti')?.value.toLowerCase() || '';
        const termMez = document.getElementById('cerca-mezzi')?.value.toLowerCase() || '';
        const termOpe = document.getElementById('cerca-operatori')?.value.toLowerCase() || '';

        if (corpoClienti) {
            corpoClienti.innerHTML = '';
            window.leggiDatabase('clienti').forEach((item, index) => {
                if (!item.nome.toLowerCase().includes(termCli) && !item.id.toLowerCase().includes(termCli)) return;
                corpoClienti.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 text-center"><button type="button" onclick="avviaModificaAnagrafica('clienti', ${index})" class="text-blue-600 cursor-pointer"><i data-lucide="edit-3" class="w-4 h-4 inline"></i></button></td><td class="p-4 font-mono text-xs text-gray-500">${item.id}</td><td class="p-4 font-semibold text-gray-900">${item.nome}</td><td class="p-4 text-gray-600">${item.coltura}</td><td class="p-4 text-xs font-mono text-gray-500">${item.gps}</td><td class="p-4 text-center"><button type="button" onclick="rimuoviRigaAnagrafica('clienti', ${index})" class="text-red-500 cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4 inline"></i></button></td></tr>`;
            });
        }

        if (corpoMezzi) {
            corpoMezzi.innerHTML = '';
            window.leggiDatabase('mezzi').forEach((item, index) => {
                if (!item.nome.toLowerCase().includes(termMez) && !item.id.toLowerCase().includes(termMez)) return;
                let badgeColore = item.stato === 'Disponibile' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800';

                // Calcola la posizione Reale (In Sede o In Cantiere)
                let tagPosizione = calcolaPosizioneAttualeMezzo(item.id);

                corpoMezzi.innerHTML += `<tr class="hover:bg-gray-50">
                    <td class="p-4 text-center"><button type="button" onclick="avviaModificaAnagrafica('mezzi', ${index})" class="text-blue-600 cursor-pointer"><i data-lucide="edit-3" class="w-4 h-4 inline"></i></button></td>
                    <td class="p-4 font-mono text-xs text-gray-500">${item.id}</td>
                    <td class="p-4 font-semibold text-gray-900">${item.nome} <br><span class="text-xs font-normal text-gray-500">${item.tipo}</span></td>
                    <td class="p-4 text-gray-600">${item.potenza} CV <br><span class="text-xs text-emerald-700 font-bold">Resa: ${item.resa || 1} Ha/h</span></td>
                    <td class="p-4"><span class="px-2.5 py-1 text-xs font-bold ${badgeColore} rounded-full">${item.stato}</span></td>
                    <td class="p-4">${tagPosizione}</td>
                    <td class="p-4 text-center"><button type="button" onclick="rimuoviRigaAnagrafica('mezzi', ${index})" class="text-red-500 cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4 inline"></i></button></td>
                </tr>`;
            });
        }

        if (corpoOperatori) {
            corpoOperatori.innerHTML = '';
            window.leggiDatabase('operatori').forEach((item, index) => {
                if (!item.nome.toLowerCase().includes(termOpe) && !item.id.toLowerCase().includes(termOpe)) return;
                let patentiniNomi = (item.patentini && item.patentini.length > 0) ? item.patentini.map(p => p.nome).join(', ') : 'Nessuno';
                corpoOperatori.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 text-center"><button type="button" onclick="avviaModificaAnagrafica('operatori', ${index})" class="text-blue-600 cursor-pointer"><i data-lucide="edit-3" class="w-4 h-4 inline"></i></button></td><td class="p-4 font-mono text-xs text-gray-500">${item.id}</td><td class="p-4 font-semibold text-gray-900">${item.nome}</td><td class="p-4 text-gray-600">€ ${item.costo}/h</td><td class="p-4 text-xs text-gray-600">${item.scadVisita || 'N/D'}</td><td class="p-4 text-xs text-gray-600">${item.scadAttestato || 'N/D'}</td><td class="p-4 text-xs text-gray-600 truncate max-w-xs">${patentiniNomi}</td><td class="p-4 text-center"><button type="button" onclick="rimuoviRigaAnagrafica('operatori', ${index})" class="text-red-500 cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4 inline"></i></button></td></tr>`;
            });
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    window.rimuoviRigaAnagrafica = function(tabella, indice) {
        if (confirm("Eliminare definitivamente questo elemento?")) {
            let db = window.leggiDatabase(tabella);
            db.splice(indice, 1);
            window.salvaDatabase(tabella, db);
            window.aggiornaTabelleAnagrafiche();
        }
    };

    window.avviaModificaAnagrafica = function(tabella, indice) {
        let db = window.leggiDatabase(tabella);
        let item = db[indice];

        if (tabella === 'clienti') {
            document.getElementById('cli-indice').value = indice; document.getElementById('cli-id').value = item.id;
            document.getElementById('cli-nome').value = item.nome; document.getElementById('cli-piva').value = item.piva || '';
            document.getElementById('cli-referente').value = item.referente; document.getElementById('cli-telefono').value = item.telefono;
            document.getElementById('cli-indirizzo').value = item.indirizzo; document.getElementById('cli-gps').value = item.gps;
            document.getElementById('cli-coltura').value = item.coltura;
            document.getElementById('modale-clienti').style.display = 'flex';
        } else if (tabella === 'mezzi') {
            document.getElementById('mez-indice').value = indice; document.getElementById('mez-id').value = item.id;
            document.getElementById('mez-tipo').value = item.tipo;
            selettoreTipo.dispatchEvent(new Event('change'));
            setTimeout(() => {
                if(!catalogoMezzi[item.tipo] || !catalogoMezzi[item.tipo].includes(item.nome)) {
                    document.getElementById('mez-nome').value = 'Altro (Inserisci manualmente...)';
                    document.getElementById('mez-nome').dispatchEvent(new Event('change'));
                    document.getElementById('mez-nome-manuale').value = item.nome;
                } else { document.getElementById('mez-nome').value = item.nome; }
            }, 50);
            document.getElementById('mez-potenza').value = item.potenza; document.getElementById('mez-resa').value = item.resa || '';
            document.getElementById('mez-targa').value = item.targa; document.getElementById('mez-stato').value = item.stato;
            document.getElementById('mez-scad-ass').value = item.scadenzaAss || ''; document.getElementById('mez-scad-rev').value = item.scadenzaRev || '';
            document.getElementById('modale-mezzi').style.display = 'flex';
        } else if (tabella === 'operatori') {
            document.getElementById('ope-indice').value = indice; document.getElementById('ope-id').value = item.id;
            document.getElementById('ope-nome').value = item.nome; document.getElementById('ope-costo').value = item.costo;
            document.getElementById('ope-email').value = item.email; document.getElementById('ope-password').value = item.password;
            document.getElementById('ope-telefono').value = item.telefono; document.getElementById('ope-scad-visita').value = item.scadVisita || '';
            document.getElementById('ope-scad-attestato').value = item.scadAttestato || '';

            const rPat = (n) => (item.patentini || []).find(p => p.nome === n);
            document.getElementById('chk-patente').checked = !!rPat('Patente CE / CQC'); document.getElementById('ope-scad-patente').value = rPat('Patente CE / CQC') ? rPat('Patente CE / CQC').scadenza : '';
            document.getElementById('chk-trattori').checked = !!rPat('Patentino Macchine Agricole'); document.getElementById('ope-scad-trattori').value = rPat('Patentino Macchine Agricole') ? rPat('Patentino Macchine Agricole').scadenza : '';
            document.getElementById('chk-fito').checked = !!rPat('Patentino Fitosanitario'); document.getElementById('ope-scad-fito').value = rPat('Patentino Fitosanitario') ? rPat('Patentino Fitosanitario').scadenza : '';
            document.getElementById('chk-drone').checked = !!rPat('Licenza Pilota Drone (A2/Specific)'); document.getElementById('ope-scad-drone').value = rPat('Licenza Pilota Drone (A2/Specific)') ? rPat('Licenza Pilota Drone (A2/Specific)').scadenza : '';
            document.getElementById('modale-operatori').style.display = 'flex';
        }
    };

    document.getElementById('cerca-clienti')?.addEventListener('input', window.aggiornaTabelleAnagrafiche);
    document.getElementById('cerca-mezzi')?.addEventListener('input', window.aggiornaTabelleAnagrafiche);
    document.getElementById('cerca-operatori')?.addEventListener('input', window.aggiornaTabelleAnagrafiche);

    const pulsanti = { 'clienti': document.getElementById('tab-clienti'), 'mezzi': document.getElementById('tab-mezzi'), 'operatori': document.getElementById('tab-operatori') };
    const tabelle = { 'clienti': document.getElementById('sub-clienti'), 'mezzi': document.getElementById('sub-mezzi'), 'operatori': document.getElementById('sub-operatori') };

    function cambiaSchermata(scelta) {
        Object.keys(tabelle).forEach(chiave => {
            if (tabelle[chiave]) tabelle[chiave].style.display = 'none';
            if (pulsanti[chiave]) {
                pulsanti[chiave].classList.remove('bg-emerald-800', 'text-white', 'shadow');
                pulsanti[chiave].classList.add('bg-white', 'text-gray-600');
            }
        });
        if (tabelle[scelta]) tabelle[scelta].style.display = 'block';
        if (pulsanti[scelta]) {
            pulsanti[scelta].classList.add('bg-emerald-800', 'text-white', 'shadow');
            pulsanti[scelta].classList.remove('bg-white', 'text-gray-600');
        }
    }

    pulsanti['clienti']?.addEventListener('click', () => cambiaSchermata('clienti'));
    pulsanti['mezzi']?.addEventListener('click', () => cambiaSchermata('mezzi'));
    pulsanti['operatori']?.addEventListener('click', () => cambiaSchermata('operatori'));

    document.getElementById('btn-nuovo-cliente')?.addEventListener('click', () => { document.getElementById('form-clienti').reset(); document.getElementById('cli-indice').value = ""; document.getElementById('cli-id').value = ""; document.getElementById('modale-clienti').style.display = 'flex'; });
    document.getElementById('btn-nuovo-mezzo')?.addEventListener('click', () => { document.getElementById('form-mezzi').reset(); document.getElementById('mez-indice').value = ""; document.getElementById('mez-id').value = ""; if(campoNomeManuale) campoNomeManuale.style.display = 'none'; document.getElementById('modale-mezzi').style.display = 'flex'; });
    document.getElementById('btn-nuovo-operatore')?.addEventListener('click', () => { document.getElementById('form-operatori').reset(); document.getElementById('ope-indice').value = ""; document.getElementById('ope-id').value = ""; document.getElementById('modale-operatori').style.display = 'flex'; });

    document.querySelectorAll('.btn-chiudi').forEach(btn => {
        btn.addEventListener('click', () => {
            if(document.getElementById('modale-clienti')) document.getElementById('modale-clienti').style.display = 'none';
            if(document.getElementById('modale-mezzi')) document.getElementById('modale-mezzi').style.display = 'none';
            if(document.getElementById('modale-operatori')) document.getElementById('modale-operatori').style.display = 'none';
        });
    });

    document.getElementById('form-clienti')?.addEventListener('submit', function(e) {
        e.preventDefault();
        let db = window.leggiDatabase('clienti');
        const indice = document.getElementById('cli-indice').value;
        const record = { id: document.getElementById('cli-id').value || window.generaID('CLI', db), nome: document.getElementById('cli-nome').value, piva: document.getElementById('cli-piva').value, referente: document.getElementById('cli-referente').value, telefono: document.getElementById('cli-telefono').value, indirizzo: document.getElementById('cli-indirizzo').value, gps: document.getElementById('cli-gps').value, coltura: document.getElementById('cli-coltura').value };
        if (indice === "") db.unshift(record); else db[indice] = record;
        window.salvaDatabase('clienti', db);
        document.getElementById('modale-clienti').style.display = 'none';
        window.aggiornaTabelleAnagrafiche();
    });

    document.getElementById('form-mezzi')?.addEventListener('submit', function(e) {
        e.preventDefault();
        let db = window.leggiDatabase('mezzi');
        const indice = document.getElementById('mez-indice').value;
        const nomeScelto = document.getElementById('mez-nome').value === 'Altro (Inserisci manualmente...)' ? document.getElementById('mez-nome-manuale').value : document.getElementById('mez-nome').value;
        const record = { id: document.getElementById('mez-id').value || window.generaID('MEZ', db), tipo: document.getElementById('mez-tipo').value, nome: nomeScelto, potenza: document.getElementById('mez-potenza').value, resa: document.getElementById('mez-resa').value, targa: document.getElementById('mez-targa').value, stato: document.getElementById('mez-stato').value, scadenzaAss: document.getElementById('mez-scad-ass').value, scadenzaRev: document.getElementById('mez-scad-rev').value };
        if (indice === "") db.unshift(record); else db[indice] = record;
        window.salvaDatabase('mezzi', db);
        document.getElementById('modale-mezzi').style.display = 'none';
        window.aggiornaTabelleAnagrafiche();
    });

    document.getElementById('form-operatori')?.addEventListener('submit', function(e) {
        e.preventDefault();
        let db = window.leggiDatabase('operatori');
        const indice = document.getElementById('ope-indice').value;
        let patentiniLista = [];
        if(document.getElementById('chk-patente').checked) patentiniLista.push({ nome: 'Patente CE / CQC', scadenza: document.getElementById('ope-scad-patente').value });
        if(document.getElementById('chk-trattori').checked) patentiniLista.push({ nome: 'Patentino Macchine Agricole', scadenza: document.getElementById('ope-scad-trattori').value });
        if(document.getElementById('chk-fito').checked) patentiniLista.push({ nome: 'Patentino Fitosanitario', scadenza: document.getElementById('ope-scad-fito').value });
        if(document.getElementById('chk-drone').checked) patentiniLista.push({ nome: 'Licenza Pilota Drone (A2/Specific)', scadenza: document.getElementById('ope-scad-drone').value });

        const record = { id: document.getElementById('ope-id').value || window.generaID('OPE', db), nome: document.getElementById('ope-nome').value, costo: document.getElementById('ope-costo').value, email: document.getElementById('ope-email').value, password: document.getElementById('ope-password').value, telefono: document.getElementById('ope-telefono').value, scadVisita: document.getElementById('ope-scad-visita').value, scadAttestato: document.getElementById('ope-scad-attestato').value, patentini: patentiniLista };
        if (indice === "") db.unshift(record); else db[indice] = record;
        window.salvaDatabase('operatori', db);
        document.getElementById('modale-operatori').style.display = 'none';
        window.aggiornaTabelleAnagrafiche();
    });

    window.aggiornaTabelleAnagrafiche();
});
