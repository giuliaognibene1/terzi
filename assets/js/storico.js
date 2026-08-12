// assets/js/storico.js
document.addEventListener("DOMContentLoaded", function() {
    if (!document.getElementById('lista-da-confermare')) return;

    const mappaLavorazioni = {
        'Aratura / Ripuntatura': { tariffaEttaro: 95 }, 'Erpicatura / Preparazione': { tariffaEttaro: 95 }, 'Semina precisione': { tariffaEttaro: 95 },
        'Trattamento Fitosanitario': { tariffaEttaro: 40 }, 'Diserbo / Concimazione': { tariffaEttaro: 40 }, 'Mietitura / Raccolta': { tariffaEttaro: 140 },
        'Trinciatura Stocchi': { tariffaEttaro: 35 }, 'Pressatura Rotoballe': { tariffaEttaro: 95 }, 'Scavo / Movimento Terra': { tariffaEttaro: 85 }
    };

    const COSTO_GASOLIO_LITRO = 1.35;
    const COEFFICIENTI_MEZZI = {
        'Trattore': { ammortamentoOrario: 35, consumoLitriOra: 25 }, 'Mietitrebbia': { ammortamentoOrario: 80, consumoLitriOra: 45 },
        'Escavatore': { ammortamentoOrario: 30, consumoLitriOra: 15 }, 'Drone': { ammortamentoOrario: 15, consumoLitriOra: 2 },
        'Botte Irroratrice': { ammortamentoOrario: 20, consumoLitriOra: 5 }, 'Trincia': { ammortamentoOrario: 15, consumoLitriOra: 5 }
    };

    function orarioInMinuti(orarioTesto) {
        if (!orarioTesto) return 0;
        const [h, m] = orarioTesto.split(':').map(Number);
        return (h * 60) + m;
    }

    function popolaFiltriAvanzati() {
        const clienti = window.leggiDatabase('clienti');
        const mezzi = window.leggiDatabase('mezzi');
        const operatori = window.leggiDatabase('operatori');

        const selCliente = document.getElementById('filtro-cliente');
        const selMezzo = document.getElementById('filtro-mezzo');
        const selOperatore = document.getElementById('filtro-operatore');

        if(selCliente && selCliente.options.length <= 1) clienti.forEach(c => { selCliente.innerHTML += `<option value="${c.id}">${c.nome}</option>`; });
        if(selMezzo && selMezzo.options.length <= 1) mezzi.forEach(m => { selMezzo.innerHTML += `<option value="${m.id}">${m.nome} (${m.targa})</option>`; });
        if(selOperatore && selOperatore.options.length <= 1) operatori.forEach(o => { selOperatore.innerHTML += `<option value="${o.id}">${o.nome}</option>`; });
    }
    popolaFiltriAvanzati();

    const inputCercaLibera = document.getElementById('cerca-storico');
    const inputDataDa = document.getElementById('filtro-data-da');
    const inputDataA = document.getElementById('filtro-data-a');
    const selCliente = document.getElementById('filtro-cliente');
    const selMezzo = document.getElementById('filtro-mezzo');
    const selOperatore = document.getElementById('filtro-operatore');

    window.aggiornaTabelleStorico = function() {
        const corpoDaConfermare = document.getElementById('lista-da-confermare');
        const corpoCompletati = document.getElementById('lista-completati');

        const cantieri = window.leggiDatabase('cantieri');
        const commesse = window.leggiDatabase('commesse');
        const clienti = window.leggiDatabase('clienti');
        const mezzi = window.leggiDatabase('mezzi');
        const operatori = window.leggiDatabase('operatori');

        const oggi = new Date();
        oggi.setHours(0,0,0,0);
        const oggiIso = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`;

        let cantieriPassati = cantieri.filter(c => {
            if (c.data < oggiIso) return true;
            if (c.data === oggiIso && (c.statoOperativo === 'Completato' || c.oreReali)) return true;
            return false;
        });

        const term = inputCercaLibera ? inputCercaLibera.value.toLowerCase() : '';
        const dataDa = inputDataDa ? inputDataDa.value : '';
        const dataA = inputDataA ? inputDataA.value : '';
        const idCliFiltro = selCliente ? selCliente.value : '';
        const idMezFiltro = selMezzo ? selMezzo.value : '';
        const idOpFiltro = selOperatore ? selOperatore.value : '';

        cantieriPassati = cantieriPassati.filter(c => {
            const com = commesse.find(co => co.id === c.idCommessa);
            const cli = com ? clienti.find(cl => cl.id === com.idCliente) : null;
            const mz = mezzi.find(m => m.id === c.idMezzo);
            const op = operatori.find(o => o.id === c.idOperatore);

            if (dataDa && c.data < dataDa) return false;
            if (dataA && c.data > dataA) return false;
            if (idCliFiltro && (!com || com.idCliente !== idCliFiltro)) return false;
            if (idMezFiltro && c.idMezzo !== idMezFiltro) return false;
            if (idOpFiltro && c.idOperatore !== idOpFiltro) return false;

            if (term) {
                const nCli = cli ? cli.nome.toLowerCase() : '';
                const nLav = com ? com.lavorazione.toLowerCase() : '';
                const nMez = mz ? mz.nome.toLowerCase() : '';
                const nOp = op ? op.nome.toLowerCase() : '';
                const idCom = c.idCommessa ? c.idCommessa.toLowerCase() : '';
                if (!nCli.includes(term) && !nLav.includes(term) && !nMez.includes(term) && !nOp.includes(term) && !idCom.includes(term) && !c.data.includes(term)) {
                    return false;
                }
            }
            return true;
        });

        let daConfermare = cantieriPassati.filter(c => !c.margineReale);
        let completati = cantieriPassati.filter(c => c.margineReale);

        function renderizzaRiga(c, isCompletato) {
            const com = commesse.find(co => co.id === c.idCommessa);
            const cli = com ? clienti.find(cl => cl.id === com.idCliente) : null;
            const mz = mezzi.find(m => m.id === c.idMezzo);
            const op = operatori.find(o => o.id === c.idOperatore);

            const nomeCliente = cli ? cli.nome : 'N/D';
            const nomeLavorazione = com ? com.lavorazione : 'N/D';
            const nomeMezzo = mz ? mz.nome : 'N/D';
            const nomeOp = op ? op.nome : 'N/D';
            const idCommessa = c.idCommessa || (com ? com.id : 'N/D');

            const dataIta = new Date(c.data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

            if (isCompletato) {
                let bottoneAzioneCompletato = '';
                // Se il lavoro salvato e archiviato con margine ha come autore l'operatore, scatta il blocco
                if (c.compilatoDa === 'operatore') {
                    bottoneAzioneCompletato = `
                        <button class="bg-gray-200 text-gray-400 font-bold py-1.5 px-3 rounded text-xs cursor-not-allowed flex items-center justify-center w-full shadow-inner" title="Bloccato: Consuntivato dall'operatore">
                            <i data-lucide="lock" class="w-3.5 h-3.5 mr-1 flex-shrink-0"></i> Bloccato
                        </button>
                    `;
                } else {
                    bottoneAzioneCompletato = `
                        <button type="button" onclick="window.apriConsuntivo('${c.id}')" class="bg-blue-100 hover:bg-blue-600 text-blue-800 hover:text-white font-bold py-1.5 px-3 rounded text-xs transition cursor-pointer w-full text-center shadow-sm flex items-center justify-center space-x-1">
                            <i data-lucide="edit" class="w-3.5 h-3.5 mr-1 flex-shrink-0"></i> <span>Modifica</span>
                        </button>
                    `;
                }

                return `
                    <tr class="hover:bg-gray-50 transition">
                        <td class="p-4 font-mono text-xs text-gray-500">${dataIta}</td>
                        <td class="p-4"><span class="font-mono text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">${idCommessa}</span></td>
                        <td class="p-4">
                            <p class="font-bold text-gray-900">${nomeCliente}</p>
                            <p class="text-[11px] text-gray-500">${nomeLavorazione}</p>
                        </td>
                        <td class="p-4 text-gray-700 font-medium">${nomeMezzo}</td>
                        <td class="p-4 font-bold text-blue-800">${c.oreReali || c.oreEffettive || 'N/D'} h</td>
                        <td class="p-4 font-black text-emerald-700">€ ${c.margineReale}</td>
                        <td class="p-4 text-center">${bottoneAzioneCompletato}</td>
                    </tr>`;
            } else {
                const oreStimate = ((orarioInMinuti(c.oraFine) - orarioInMinuti(c.oraInizio)) / 60).toFixed(1);

                const displayOre = c.oreReali
                    ? `<span class="text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded" title="Dati ricevuti dall'App Operatore">${c.oreReali} h (App)</span>`
                    : `<span class="text-gray-600">${oreStimate} h</span> <br><span class="text-[10px]">(${c.oraInizio}-${c.oraFine})</span>`;

                const iconaNote = (c.noteOperatore && c.noteOperatore.trim() !== '') ? `<i data-lucide="message-square-warning" class="w-4 h-4 text-orange-500 inline ml-2" title="Nota dall'operatore: ${c.noteOperatore.replace(/"/g, '&quot;')}"></i>` : '';

                // NEI LAVORI DA CONFERMARE IL TERZISTA DEVE POTER CLICCARE SEMPRE (anche se le ore arrivano dall'app)
                // per poter inserire il margine economico mancante.
                let bottoneAzione = `
                    <button type="button" onclick="window.apriConsuntivo('${c.id}')" class="bg-orange-100 hover:bg-orange-600 text-orange-800 hover:text-white font-bold py-1.5 px-4 rounded text-xs transition cursor-pointer w-full text-center shadow-sm">
                        Consuntiva
                    </button>
                `;

                return `
                    <tr class="hover:bg-orange-50 transition">
                        <td class="p-4 font-mono text-xs text-gray-500">${dataIta}</td>
                        <td class="p-4"><span class="font-mono text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">${idCommessa}</span>${iconaNote}</td>
                        <td class="p-4">
                            <p class="font-bold text-gray-900">${nomeCliente}</p>
                            <p class="text-[11px] text-gray-500">${nomeLavorazione}</p>
                        </td>
                        <td class="p-4 text-gray-700 text-xs">
                            <span class="block font-bold text-gray-800">${nomeMezzo}</span>
                            <span class="block">${nomeOp}</span>
                        </td>
                        <td class="p-4 font-mono">${displayOre}</td>
                        <td class="p-4 text-center">
                            ${bottoneAzione}
                        </td>
                    </tr>`;
            }
        }

        corpoDaConfermare.innerHTML = daConfermare.length > 0 ? daConfermare.map(c => renderizzaRiga(c, false)).join('') : '<tr><td colspan="6" class="p-4 text-center text-sm text-gray-500">Nessun lavoro passato da confermare trovato.</td></tr>';
        corpoCompletati.innerHTML = completati.length > 0 ? completati.map(c => renderizzaRiga(c, true)).join('') : '<tr><td colspan="7" class="p-4 text-center text-sm text-gray-500">Nessun lavoro completato trovato.</td></tr>';

        if (document.getElementById('badge-da-confermare')) document.getElementById('badge-da-confermare').textContent = daConfermare.length;
        if (document.getElementById('badge-completati')) document.getElementById('badge-completati').textContent = completati.length;

        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    inputCercaLibera?.addEventListener('input', window.aggiornaTabelleStorico);
    inputDataDa?.addEventListener('change', window.aggiornaTabelleStorico);
    inputDataA?.addEventListener('change', window.aggiornaTabelleStorico);
    selCliente?.addEventListener('change', window.aggiornaTabelleStorico);
    selMezzo?.addEventListener('change', window.aggiornaTabelleStorico);
    selOperatore?.addEventListener('change', window.aggiornaTabelleStorico);

    document.getElementById('btn-reset-filtri')?.addEventListener('click', function() {
        if(inputCercaLibera) inputCercaLibera.value = '';
        if(inputDataDa) inputDataDa.value = '';
        if(inputDataA) inputDataA.value = '';
        if(selCliente) selCliente.value = '';
        if(selMezzo) selMezzo.value = '';
        if(selOperatore) selOperatore.value = '';
        window.aggiornaTabelleStorico();
    });

    let cantiereAperto = null;
    let ricavoCantiereFisso = 0;
    let costoBaseMezzo = 0;
    let costoBaseOperaio = 0;

    window.apriConsuntivo = function(idCantiere) {
        const cantieri = window.leggiDatabase('cantieri');
        const commesse = window.leggiDatabase('commesse');
        const clienti = window.leggiDatabase('clienti');
        const mezzi = window.leggiDatabase('mezzi');
        const operatori = window.leggiDatabase('operatori');

        cantiereAperto = cantieri.find(c => c.id === idCantiere);
        if (!cantiereAperto) return;

        // Il blocco scatta SOLO se il cantiere ha già un margine reale salvato dall'operatore (situazione teorica)
        if (cantiereAperto.compilatoDa === 'operatore' && cantiereAperto.margineReale) {
            alert("⚠️ AZIONE NON CONSENTITA: Questo consuntivo è stato completato interamente dall'operatore sul campo e non può essere modificato dal portale amministrativo.");
            return;
        }

        const com = commesse.find(co => co.id === cantiereAperto.idCommessa);
        const cli = com ? clienti.find(cl => cl.id === com.idCliente) : null;
        const mz = mezzi.find(m => m.id === cantiereAperto.idMezzo);
        const op = operatori.find(o => o.id === cantiereAperto.idOperatore);

        document.getElementById('cons-idcantiere').value = cantiereAperto.id;

        let dettagliIntestazione = `${com ? com.lavorazione : ''} • Data: ${new Date(cantiereAperto.data).toLocaleDateString('it-IT')}`;
        if (cantiereAperto.noteOperatore && cantiereAperto.noteOperatore.trim() !== '') {
            dettagliIntestazione += ` | Nota: "${cantiereAperto.noteOperatore}"`;
        }

        document.getElementById('cons-titolo').textContent = cli ? cli.nome : 'Cliente Sconosciuto';
        document.getElementById('cons-dettagli').textContent = dettagliIntestazione;
        document.getElementById('cons-id-commessa-badge').textContent = cantiereAperto.idCommessa || (com ? com.id : 'N/D');

        const oreStimate = ((orarioInMinuti(cantiereAperto.oraFine) - orarioInMinuti(cantiereAperto.oraInizio)) / 60).toFixed(1);
        document.getElementById('cons-ore-stimate').textContent = `${oreStimate} h`;
        document.getElementById('cons-margine-stimato').textContent = `€ ${cantiereAperto.margineCalcolato || '0.00'}`;

        document.getElementById('cons-ore-reali').value = cantiereAperto.oreReali || cantiereAperto.oreEffettive || oreStimate;

        const coeffLavorazione = (com && mappaLavorazioni[com.lavorazione]) ? mappaLavorazioni[com.lavorazione].tariffaEttaro : 80;
        ricavoCantiereFisso = parseFloat(com ? com.ettari : 0) * coeffLavorazione;

        const coeffMezzo = (mz && COEFFICIENTI_MEZZI[mz.tipo]) ? COEFFICIENTI_MEZZI[mz.tipo] : { ammortamentoOrario: 30, consumoLitriOra: 20 };
        costoBaseMezzo = coeffMezzo.ammortamentoOrario + (coeffMezzo.consumoLitriOra * COSTO_GASOLIO_LITRO);
        costoBaseOperaio = op ? parseFloat(op.costo) : 20;

        ricalcolaMargineNuovo();
        document.getElementById('modale-consuntivo').style.display = 'flex';
    };

    function ricalcolaMargineNuovo() {
        if (!cantiereAperto) return;
        const oreRealiInput = parseFloat(document.getElementById('cons-ore-reali').value) || 0;
        const costoTotaleReale = oreRealiInput * (costoBaseOperaio + costoBaseMezzo);
        const nuovoMargine = ricavoCantiereFisso - costoTotaleReale;

        const elemMargine = document.getElementById('cons-margine-nuovo');
        elemMargine.textContent = `€ ${nuovoMargine.toFixed(2)}`;
        if (nuovoMargine < 0) elemMargine.className = "text-xl font-black text-red-500";
        else elemMargine.className = "text-xl font-black text-emerald-400";
    }

    document.getElementById('cons-ore-reali')?.addEventListener('input', ricalcolaMargineNuovo);

    document.getElementById('form-consuntivo')?.addEventListener('submit', function(e) {
        e.preventDefault();

        const utenteAttivo = JSON.parse(sessionStorage.getItem('utenteAttivo')) || {};
        // Se stiamo approvando dallo storico contoterzi rimaniamo identificati come terzista proprietario
        const ruoloCompilatore = utenteAttivo.ruolo === 'operatore' ? 'operatore' : 'terzista';

        const idCantiere = document.getElementById('cons-idcantiere').value;
        const oreReali = document.getElementById('cons-ore-reali').value;
        const elemMargineTesto = document.getElementById('cons-margine-nuovo').textContent;
        const margineNumerico = parseFloat(elemMargineTesto.replace('€', '').trim()) || 0;

        let dbCantieri = window.leggiDatabase ? window.leggiDatabase('cantieri') : JSON.parse(localStorage.getItem('cantieri')) || [];
        let dbCommesse = window.leggiDatabase ? window.leggiDatabase('commesse') : JSON.parse(localStorage.getItem('commesse')) || [];
        let dbRichieste = JSON.parse(localStorage.getItem('databaseRichiesteLavoro')) || [];

        let idxCantiere = dbCantieri.findIndex(c => String(c.id).trim() === String(idCantiere).trim());

        if (idxCantiere !== -1) {

            dbCantieri[idxCantiere].statoOperativo = 'Completato';
            dbCantieri[idxCantiere].oreEffettive = oreReali;
            dbCantieri[idxCantiere].oreReali = oreReali;
            dbCantieri[idxCantiere].margineReale = margineNumerico.toFixed(2);
            dbCantieri[idxCantiere].compilatoDa = ruoloCompilatore;

            let idCommessa = dbCantieri[idxCantiere].idCommessa;
            let idxCommessa = dbCommesse.findIndex(c => String(c.id).trim() === String(idCommessa).trim());

            if (idxCommessa !== -1) {
                dbCommesse[idxCommessa].stato = 'Completato';
                dbCommesse[idxCommessa].oreEffettive = oreReali;
                dbCommesse[idxCommessa].compilatoDa = ruoloCompilatore;

                let idRichiesta = dbCommesse[idxCommessa].idRichiesta;
                if (idRichiesta) {
                    let idxRichiesta = dbRichieste.findIndex(r => String(r.id).trim() === String(idRichiesta).trim());
                    if (idxRichiesta !== -1) {
                        dbRichieste[idxRichiesta].stato = 'COMPLETATO';
                        localStorage.setItem('databaseRichiesteLavoro', JSON.stringify(dbRichieste));
                    }
                }
            }

            if (typeof window.salvaDatabase === 'function') {
                window.salvaDatabase('cantieri', dbCantieri);
                window.salvaDatabase('commesse', dbCommesse);
            } else {
                localStorage.setItem('cantieri', JSON.stringify(dbCantieri));
                localStorage.setItem('commesse', JSON.stringify(dbCommesse));
            }

            document.getElementById('modale-consuntivo').style.display = 'none';
            alert('Consuntivo archiviato e report inviato al cliente con successo!');
            window.location.reload();
        } else {
            alert('Errore: impossibile trovare il cantiere da chiudere.');
        }
    });

    document.querySelectorAll('.btn-chiudi-consuntivo').forEach(btn => {
        btn.addEventListener('click', () => { document.getElementById('modale-consuntivo').style.display = 'none'; });
    });

    window.aggiornaTabelleStorico();
});
