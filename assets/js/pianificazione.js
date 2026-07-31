// assets/js/pianificazione.js
document.addEventListener("DOMContentLoaded", function() {
    if (!document.getElementById('head-calendario')) return;

    let impostazioniAzienda = window.leggiDatabase('impostazioni');
    if (!impostazioniAzienda || Array.isArray(impostazioniAzienda)) {
        impostazioniAzienda = { inizioTurno: "07:30", fineTurno: "19:30" };
        window.salvaDatabase('impostazioni', impostazioniAzienda);
    }

    function leggiGpsAzienda() {
        const profilo = window.leggiDatabase('profilo_azienda');
        return profilo && !Array.isArray(profilo) && profilo.gps ? profilo.gps : "44.8000, 10.3000";
    }

    function orarioInMinuti(orarioTesto) {
        if (!orarioTesto) return 0;
        const [h, m] = orarioTesto.split(':').map(Number);
        return (h * 60) + m;
    }

    let MINUTI_INIZIO_TURNO = orarioInMinuti(impostazioniAzienda.inizioTurno);
    let MINUTI_FINE_TURNO = orarioInMinuti(impostazioniAzienda.fineTurno);

    const btnImpostazioni = document.getElementById('btn-impostazioni-orari');
    const modaleImpostazioni = document.getElementById('modale-impostazioni');

    if (btnImpostazioni && modaleImpostazioni) {
        btnImpostazioni.addEventListener('click', () => {
            document.getElementById('imposta-inizio').value = impostazioniAzienda.inizioTurno;
            document.getElementById('imposta-fine').value = impostazioniAzienda.fineTurno;
            modaleImpostazioni.style.display = 'flex';
        });
        document.querySelectorAll('.btn-chiudi-impostazioni').forEach(btn => {
            btn.addEventListener('click', () => { modaleImpostazioni.style.display = 'none'; });
        });
        document.getElementById('form-impostazioni').addEventListener('submit', function(e) {
            e.preventDefault();
            impostazioniAzienda.inizioTurno = document.getElementById('imposta-inizio').value;
            impostazioniAzienda.fineTurno = document.getElementById('imposta-fine').value;
            window.salvaDatabase('impostazioni', impostazioniAzienda);
            MINUTI_INIZIO_TURNO = orarioInMinuti(impostazioniAzienda.inizioTurno);
            MINUTI_FINE_TURNO = orarioInMinuti(impostazioniAzienda.fineTurno);
            modaleImpostazioni.style.display = 'none';
            alert('Orari aggiornati con successo!');
        });
    }

    function calcolaMinutiTrasferimento(gpsOrigine, gpsDestinazione) {
        if (!gpsOrigine || !gpsDestinazione || !gpsOrigine.includes(',') || !gpsDestinazione.includes(',')) return 15;
        const [lat1, lon1] = gpsOrigine.split(',').map(Number);
        const [lat2, lon2] = gpsDestinazione.split(',').map(Number);
        if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 15;
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const km = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))) * 1.3;
        return Math.round((km / 30) * 60) + 10;
    }

    const headCalendario = document.getElementById('head-calendario');
    const bodyCalendario = document.getElementById('body-calendario');
    const contenitoreAttesa = document.getElementById('contenitore-commesse-attesa');
    const inputCercaAttesa = document.getElementById('cerca-attesa');

    const mappaLavorazioni = {
        'Aratura / Ripuntatura': ['Trattore'], 'Erpicatura / Preparazione': ['Trattore'], 'Semina precisione': ['Trattore'],
        'Trattamento Fitosanitario': ['Botte Irroratrice', 'Trattore', 'Drone'], 'Diserbo / Concimazione': ['Botte Irroratrice', 'Trattore', 'Drone'],
        'Mietitura / Raccolta': ['Mietitrebbia'], 'Trinciatura Stocchi': ['Trattore', 'Trincia'], 'Pressatura Rotoballe': ['Trattore'], 'Scavo / Movimento Terra': ['Escavatore']
    };

    const COSTO_GASOLIO_LITRO = 1.35;
    const COEFFICIENTI_MEZZI = {
        'Trattore': { ammortamentoOrario: 35, consumoLitriOra: 25, tariffaEttaro: 95 },
        'Mietitrebbia': { ammortamentoOrario: 80, consumoLitriOra: 45, tariffaEttaro: 140 },
        'Escavatore': { ammortamentoOrario: 30, consumoLitriOra: 15, tariffaEttaro: 85 },
        'Drone': { ammortamentoOrario: 15, consumoLitriOra: 2, tariffaEttaro: 50 },
        'Botte Irroratrice': { ammortamentoOrario: 20, consumoLitriOra: 5, tariffaEttaro: 40 },
        'Trincia': { ammortamentoOrario: 15, consumoLitriOra: 5, tariffaEttaro: 35 }
    };

    const dateCalendario = [];
    const cheOggi = new Date();
    cheOggi.setHours(0,0,0,0);

    let htmlHeader = '<tr><th class="p-4 text-xs font-bold uppercase text-gray-700 colonna-fissa w-64 min-w-[250px]">Macchine / Flotta</th>';
    for (let i = 0; i < 15; i++) {
        let dataCorrente = new Date(cheOggi);
        dataCorrente.setDate(cheOggi.getDate() + i);
        let aaaa = dataCorrente.getFullYear();
        let mm = String(dataCorrente.getMonth() + 1).padStart(2, '0');
        let gg = String(dataCorrente.getDate()).padStart(2, '0');
        dateCalendario.push(`${aaaa}-${mm}-${gg}`);
        htmlHeader += `<th class="p-3 text-xs text-center border-l border-gray-200 cella-calendario">${dataCorrente.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}</th>`;
    }
    headCalendario.innerHTML = htmlHeader + '</tr>';

    function controllaSovrapposizioneLogistica(idRisorsa, tipoRisorsa, dataInput, oraInizioInput, oraFineInput, idCommessaAttuale, cantieriVirtuali) {
        const commesse = window.leggiDatabase('commesse');
        const cantieri = cantieriVirtuali || window.leggiDatabase('cantieri');

        const commessaNuova = commesse.find(c => c.id === idCommessaAttuale);
        const gpsNuovo = commessaNuova ? (commessaNuova.gps || "") : "";

        const minNuovoInizio = orarioInMinuti(oraInizioInput);
        const minNuovoFine = orarioInMinuti(oraFineInput);

        let cantieriGiorno = cantieri.filter(c => c.data === dataInput && c[tipoRisorsa] === idRisorsa);
        cantieriGiorno.sort((a,b) => orarioInMinuti(a.oraInizio) - orarioInMinuti(b.oraInizio));

        for (let i = 0; i < cantieriGiorno.length; i++) {
            let c = cantieriGiorno[i];
            const commessaEsistente = commesse.find(com => com.id === c.idCommessa);
            const gpsEsistente = commessaEsistente ? (commessaEsistente.gps || "") : "";

            const minEsInizio = orarioInMinuti(c.oraInizio);
            const minEsFine = orarioInMinuti(c.oraFine);
            const minutiViaggio = calcolaMinutiTrasferimento(gpsEsistente, gpsNuovo);

            if (minNuovoInizio < minEsFine && minNuovoFine > minEsInizio) {
                return { sovrapposto: true, causale: `L'orario si accavalla con la commessa esistente ${c.idCommessa} (già fissata dalle ${c.oraInizio} alle ${c.oraFine}).` };
            }

            if (minNuovoInizio >= minEsFine) {
                if (minNuovoInizio < (minEsFine + minutiViaggio)) {
                    return { sovrapposto: true, causale: `Mancano i minuti necessari (${minutiViaggio} min) per viaggiare dal campo della commessa ${c.idCommessa} a questo campo.` };
                }
            }

            if (minNuovoFine <= minEsInizio) {
                if ((minNuovoFine + minutiViaggio) > minEsInizio) {
                    return { sovrapposto: true, causale: `Se finisce alle ${oraFineInput}, la macchina non farà in tempo a viaggiare (${minutiViaggio} min) per iniziare la commessa successiva ${c.idCommessa}.` };
                }
            }
        }

        if (cantieriGiorno.length === 0 || minNuovoInizio <= orarioInMinuti(cantieriGiorno[0].oraInizio)) {
            const gpsAzienda = leggiGpsAzienda();
            const minutiDallaSede = calcolaMinutiTrasferimento(gpsAzienda, gpsNuovo);
            if (minNuovoInizio < (MINUTI_INIZIO_TURNO + minutiDallaSede)) {
                return { sovrapposto: true, causale: `L'azienda apre alle ${impostazioniAzienda.inizioTurno}, serve tempo materiale (${minutiDallaSede} min) per arrivare in questo campo.` };
            }
        }

        return { sovrapposto: false };
    }

    window.aggiornaCalendario = function() {
        if (contenitoreAttesa) {
            contenitoreAttesa.innerHTML = '';
            const commesse = window.leggiDatabase('commesse').filter(c => c.stato === 'Da Pianificare');
            const clienti = window.leggiDatabase('clienti');
            const termineRicerca = inputCercaAttesa ? inputCercaAttesa.value.toLowerCase() : '';

            const commesseFiltrate = commesse.filter(com => {
                const cli = clienti.find(c => c.id === com.idCliente);
                const nomeCli = cli ? cli.nome.toLowerCase() : '';
                const lavorazione = com.lavorazione.toLowerCase();
                const idCom = com.id.toLowerCase();
                return nomeCli.includes(termineRicerca) || lavorazione.includes(termineRicerca) || idCom.includes(termineRicerca);
            });

            if (commesseFiltrate.length === 0) {
                contenitoreAttesa.innerHTML = '<p class="text-xs text-gray-500 font-medium py-3 px-2">Nessuna commessa trovata in attesa.</p>';
            } else {
                commesseFiltrate.forEach(com => {
                    const cli = clienti.find(c => c.id === com.idCliente);

                    contenitoreAttesa.innerHTML += `
                        <div class="bg-white border-l-4 border-orange-500 rounded-r-lg p-3 min-w-[260px] max-w-[260px] shadow-sm flex flex-col justify-between flex-shrink-0">
                            <div>
                                <div class="flex justify-between items-start mb-1">
                                    <span class="text-[10px] font-mono text-gray-500 bg-gray-100 px-1 rounded">${com.id}</span>
                                    <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">${com.ettari} Ha</span>
                                </div>
                                <h4 class="font-bold text-gray-900 text-xs truncate" title="${cli ? cli.nome : 'N/D'}">${cli ? cli.nome : 'N/D'}</h4>
                                <p class="text-[11px] text-gray-600 truncate mt-0.5">${com.lavorazione}</p>
                            </div>
                            <button type="button" onclick="window.apriPianificazione('${com.id}')" class="w-full bg-orange-100 hover:bg-orange-500 hover:text-white text-orange-800 text-[11px] font-bold py-1 rounded transition mt-2 cursor-pointer">Pianifica</button>
                        </div>`;
                });
            }
        }

        const mezzi = window.leggiDatabase('mezzi');
        const operatori = window.leggiDatabase('operatori');
        const clienti = window.leggiDatabase('clienti');
        const cantieri = window.leggiDatabase('cantieri');

        if(bodyCalendario) {
            bodyCalendario.innerHTML = '';
            mezzi.forEach(mezzo => {
                let isManutenzione = mezzo.stato === 'In Manutenzione';
                let rigaHtml = `<tr><td class="p-3 colonna-fissa bg-white font-bold text-sm">${mezzo.nome} <br><span class="text-xs font-normal text-gray-400">Resa: ${mezzo.resa || 1} Ha/h</span></td>`;

                dateCalendario.forEach(giorno => {
                    rigaHtml += `<td class="p-1 border-l cella-calendario align-top bg-gray-50/20">`;
                    if (isManutenzione) {
                        rigaHtml += `<div class="bg-red-50 text-red-700 text-center text-[10px] p-2 border rounded">Officina</div>`;
                    } else {
                        cantieri.filter(c => c.idMezzo === mezzo.id && c.data === giorno).sort((a, b) => a.oraInizio.localeCompare(b.oraInizio)).forEach(cant => {
                            const op = operatori.find(o => o.id === cant.idOperatore);
                            const com = window.leggiDatabase('commesse').find(co => co.id === cant.idCommessa);
                            const cli = com ? clienti.find(cl => cl.id === com.idCliente) : null;

                            rigaHtml += `
                                <div onclick="window.mostraDettaglioCantiere('${cant.id}')" class="bg-white border border-emerald-300 rounded p-1.5 shadow-sm text-[11px] mb-1 cursor-pointer hover:border-emerald-600">
                                    <span class="font-bold block text-emerald-800">${cant.oraInizio}-${cant.oraFine}</span>
                                    <p class="font-black text-gray-900 uppercase truncate text-[10px]">${cli ? cli.nome : 'N/D'}</p>
                                    <p class="text-[9px] text-gray-500 font-medium">ID: <span class="font-mono font-bold text-orange-600">${cant.idCommessa}</span></p>
                                    <p class="text-[9px] text-gray-400 truncate">${op ? op.nome : 'N/D'}</p>
                                </div>`;
                        });
                    }
                    rigaHtml += `</td>`;
                });
                bodyCalendario.innerHTML += rigaHtml + '</tr>';
            });
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    inputCercaAttesa?.addEventListener('input', window.aggiornaCalendario);

    const selectMezzo = document.getElementById('pian-idmezzo');
    const selectOperatore = document.getElementById('pian-idoperatore');
    const inputInizio = document.getElementById('pian-orainizio');
    const inputFine = document.getElementById('pian-orafine');
    let ettariGlobali = 0;

    window.apriPianificazione = function(idCommessa) {
        const commessaReq = window.leggiDatabase('commesse').find(c => c.id === idCommessa);
        if (!commessaReq) return;

        const clienteObj = window.leggiDatabase('clienti').find(c => c.id === commessaReq.idCliente);
        const nomeCliente = clienteObj ? clienteObj.nome : 'N/D';
        const lavorazione = commessaReq.lavorazione;
        const ettari = commessaReq.ettari;

        ettariGlobali = parseFloat(ettari);
        document.getElementById('pian-idcommessa').value = idCommessa;
        document.getElementById('pian-lavorazione').value = lavorazione;
        document.getElementById('riepilogo-commessa').textContent = `${lavorazione} • ${nomeCliente} (${ettari} Ha) - ID: ${idCommessa}`;
        document.getElementById('form-pianificazione').reset();

        if (commessaReq.dataInizio) document.getElementById('pian-data').value = commessaReq.dataInizio;

        if(selectMezzo) {
            selectMezzo.innerHTML = '<option value="">Seleziona macchina...</option>';
            window.leggiDatabase('mezzi').filter(m => m.stato === 'Disponibile').forEach(m => {
                selectMezzo.innerHTML += `<option value="${m.id}">${m.nome} (${m.targa})</option>`;
            });
        }

        if(selectOperatore) {
            selectOperatore.innerHTML = '<option value="">Seleziona operatore...</option>';
            window.leggiDatabase('operatori').forEach(o => {
                selectOperatore.innerHTML += `<option value="${o.id}">${o.nome} (€${o.costo}/h)</option>`;
            });
        }

        if(inputInizio) inputInizio.value = impostazioniAzienda.inizioTurno;
        calcolaQuadroEconomico();
        document.getElementById('modale-pianificazione').style.display = 'flex';
    };

    function calcolaQuadroEconomico() {
        const lavorazione = document.getElementById('pian-lavorazione').value;
        const idMezzo = selectMezzo ? selectMezzo.value : null;
        let resaRealeHa = parseFloat(window.leggiDatabase('mezzi').find(m => m.id === idMezzo)?.resa) || 1.0;
        let oreLavoro = ettariGlobali / resaRealeHa;

        if (inputInizio && inputInizio.value && (!inputFine.value || idMezzo)) {
            let minutiTotali = orarioInMinuti(inputInizio.value) + Math.round(oreLavoro * 60);
            let oreFine = Math.floor(minutiTotali / 60);
            let minFine = minutiTotali % 60;
            if (oreFine > 23) { oreFine = 23; minFine = 59; }
            inputFine.value = `${String(oreFine).padStart(2, '0')}:${String(minFine).padStart(2, '0')}`;
        }

        if (inputInizio && inputInizio.value && inputFine && inputFine.value && inputInizio.value < inputFine.value) {
            oreLavoro = (orarioInMinuti(inputFine.value) - orarioInMinuti(inputInizio.value)) / 60;
        }

        const coef = COEFFICIENTI_MEZZI[mappaLavorazioni[lavorazione]?.[0]] || { tariffaEttaro: 80, ammortamentoOrario: 30, consumoLitriOra: 20 };
        const ricavoTotale = ettariGlobali * coef.tariffaEttaro;
        const costoOperaio = parseFloat(window.leggiDatabase('operatori').find(o => o.id === (selectOperatore ? selectOperatore.value : null))?.costo) || 20;
        const costoTotale = oreLavoro * (costoOperaio + coef.ammortamentoOrario + (coef.consumoLitriOra * COSTO_GASOLIO_LITRO));

        const elRicavo = document.getElementById('econ-ricavo');
        const elCosto = document.getElementById('econ-costo');
        const elMargine = document.getElementById('econ-margine');

        if(elRicavo) elRicavo.textContent = `€ ${ricavoTotale.toFixed(2)}`;
        if(elCosto) elCosto.textContent = `€ ${costoTotale.toFixed(2)}`;
        if(elMargine) elMargine.textContent = `€ ${(ricavoTotale - costoTotale).toFixed(2)}`;
    }

    document.getElementById('pian-data')?.addEventListener('change', calcolaQuadroEconomico);
    if(inputInizio) inputInizio.addEventListener('change', calcolaQuadroEconomico);
    if(inputFine) inputFine.addEventListener('change', calcolaQuadroEconomico);
    if(selectMezzo) selectMezzo.addEventListener('change', calcolaQuadroEconomico);
    if(selectOperatore) selectOperatore.addEventListener('change', calcolaQuadroEconomico);

    document.getElementById('form-pianificazione')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const data = document.getElementById('pian-data').value;
        const idCom = document.getElementById('pian-idcommessa').value;

        const checkMz = controllaSovrapposizioneLogistica(selectMezzo.value, 'idMezzo', data, inputInizio.value, inputFine.value, idCom, null);
        if (checkMz.sovrapposto) {
            alert(`🚨 BLOCCO MACCHINA\nImpossibile assegnare il lavoro.\n\nMotivo: ${checkMz.causale}\n\nCambia l'orario o scegli un altro mezzo.`);
            return;
        }

        const checkOp = controllaSovrapposizioneLogistica(selectOperatore.value, 'idOperatore', data, inputInizio.value, inputFine.value, idCom, null);
        if (checkOp.sovrapposto) {
            alert(`🚨 BLOCCO OPERATORE\nImpossibile assegnare il lavoro.\n\nMotivo: ${checkOp.causale}\n\nCambia l'orario o scegli un altro dipendente.`);
            return;
        }

        let cantieri = window.leggiDatabase('cantieri');
        cantieri.push({
            id: window.generaID('CANT', cantieri),
            data: data,
            oraInizio: inputInizio.value,
            oraFine: inputFine.value,
            idMezzo: selectMezzo.value,
            idOperatore: selectOperatore.value,
            idCommessa: idCom,
            margineCalcolato: document.getElementById('econ-margine').textContent.replace('€ ', '')
        });
        window.salvaDatabase('cantieri', cantieri);

        let commesse = window.leggiDatabase('commesse');
        const idx = commesse.findIndex(c => c.id === idCom);
        if (idx !== -1) { commesse[idx].stato = 'Pianificato'; window.salvaDatabase('commesse', commesse); }

        document.getElementById('modale-pianificazione').style.display = 'none';
        window.aggiornaCalendario();
    });

    document.getElementById('btn-ottimizza-ai')?.addEventListener('click', function() {
        let commesse = window.leggiDatabase('commesse');
        let commesseDaPianificare = commesse.filter(c => c.stato === 'Da Pianificare');
        let mezzi = window.leggiDatabase('mezzi').filter(m => m.stato === 'Disponibile');
        let operatori = window.leggiDatabase('operatori');
        let cantieriMemory = window.leggiDatabase('cantieri');
        const gpsAzienda = leggiGpsAzienda();

        if (commesseDaPianificare.length === 0 || mezzi.length === 0 || operatori.length === 0) return alert("Dati insufficienti per l'ottimizzazione.");

        let successCount = 0;

        for (let giorno of dateCalendario) {
            for (let macchina of mezzi) {
                let inMin = MINUTI_INIZIO_TURNO;
                let ultimaPosizione = gpsAzienda;

                while (inMin < MINUTI_FINE_TURNO) {
                    let commesseValide = commesseDaPianificare.filter(c => {
                        const compatibili = mappaLavorazioni[c.lavorazione];
                        return c.stato === 'Da Pianificare' &&
                               giorno >= c.dataInizio && giorno <= c.dataFine &&
                               (compatibili ? compatibili.includes(macchina.tipo) : true);
                    });

                    if (commesseValide.length === 0) break;

                    let commessaPiuVicina = null;
                    let minDistanza = Infinity;

                    commesseValide.forEach(c => {
                        let gpsDest = (c.gps && c.gps.trim() !== "") ? c.gps.trim() : gpsAzienda;
                        let tViaggio = calcolaMinutiTrasferimento(ultimaPosizione, gpsDest);
                        if (tViaggio < minDistanza) {
                            minDistanza = tViaggio;
                            commessaPiuVicina = c;
                        }
                    });

                    if (!commessaPiuVicina) break;

                    let durataLavoro = Math.round((parseFloat(commessaPiuVicina.ettari) / (parseFloat(macchina.resa) || 1.0)) * 60);
                    let inizioEffettivo = inMin + minDistanza;
                    let fineEffettiva = inizioEffettivo + durataLavoro;

                    if (fineEffettiva <= MINUTI_FINE_TURNO) {
                        let strIn = `${String(Math.floor(inizioEffettivo/60)).padStart(2,'0')}:${String(inizioEffettivo%60).padStart(2,'0')}`;
                        let strFi = `${String(Math.floor(fineEffettiva/60)).padStart(2,'0')}:${String(fineEffettiva%60).padStart(2,'0')}`;

                        const opLibero = operatori.find(op => !controllaSovrapposizioneLogistica(op.id, 'idOperatore', giorno, strIn, strFi, commessaPiuVicina.id, cantieriMemory).sovrapposto);

                        if (opLibero) {
                            cantieriMemory.push({
                                id: window.generaID('CANT', cantieriMemory),
                                data: giorno,
                                oraInizio: strIn,
                                oraFine: strFi,
                                idMezzo: macchina.id,
                                idOperatore: opLibero.id,
                                idCommessa: commessaPiuVicina.id
                            });
                            commessaPiuVicina.stato = 'Pianificato';
                            successCount++;
                            ultimaPosizione = (commessaPiuVicina.gps && commessaPiuVicina.gps.trim() !== "") ? commessaPiuVicina.gps.trim() : gpsAzienda;
                            inMin = fineEffettiva;
                            continue;
                        } else {
                           inMin += 30;
                           continue;
                        }
                    } else {
                        break;
                    }
                }
            }
        }

        if (successCount > 0) {
            window.salvaDatabase('cantieri', cantieriMemory);
            window.salvaDatabase('commesse', commesse);
            alert(`Logistica ottimizzata: ${successCount} cantieri concatenati in sequenza per prossimità geografica.`);
            window.aggiornaCalendario();
        } else {
            alert("Nessun inserimento possibile. Limiti di viaggio o orari saturi.");
        }
    });

    document.querySelectorAll('.btn-chiudi, #btn-chiudi-view, #btn-chiudi-view-basso').forEach(btn => btn.addEventListener('click', () => {
        if(document.getElementById('modale-pianificazione')) document.getElementById('modale-pianificazione').style.display = 'none';
        if(document.getElementById('modale-visualizzazione')) document.getElementById('modale-visualizzazione').style.display = 'none';
    }));

    window.mostraDettaglioCantiere = function(idCantiere) {
        const modaleView = document.getElementById('modale-visualizzazione');
        if (!modaleView) return;

        const cantieri = window.leggiDatabase('cantieri');
        const commesse = window.leggiDatabase('commesse');
        const clienti = window.leggiDatabase('clienti');
        const mezzi = window.leggiDatabase('mezzi');
        const operatori = window.leggiDatabase('operatori');

        const cant = cantieri.find(c => c.id === idCantiere);
        if (!cant) return;

        const com = commesse.find(c => c.id === cant.idCommessa);
        const cli = com ? clienti.find(c => c.id === com.idCliente) : null;
        const m = mezzi.find(mez => mez.id === cant.idMezzo);
        const op = operatori.find(o => o.id === cant.idOperatore);

        document.getElementById('view-id-cantiere').textContent = cant.id;
        document.getElementById('view-lavorazione').textContent = com ? com.lavorazione : 'Lavorazione N/D';
        document.getElementById('view-cliente').textContent = cli ? cli.nome : 'Cliente N/D';
        document.getElementById('view-orario').textContent = `${cant.oraInizio} - ${cant.oraFine}`;

        const dataFormattata = new Date(cant.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        document.getElementById('view-data-lavoro').textContent = dataFormattata;
        document.getElementById('view-macchina').textContent = m ? m.nome : 'N/D';
        document.getElementById('view-operatore').textContent = op ? op.nome : 'N/D';
        document.getElementById('view-ettari').textContent = com ? `${com.ettari} Ha` : '0 Ha';

        const gpsAzienda = leggiGpsAzienda();
        const gpsCampoAttuale = (com && com.gps) ? com.gps.trim() : "";

        const cantieriStessoGiorno = cantieri
            .filter(c => c.idMezzo === cant.idMezzo && c.data === cant.data)
            .sort((a, b) => a.oraInizio.localeCompare(b.oraInizio));

        const indiceCantiereAttuale = cantieriStessoGiorno.findIndex(c => c.id === cant.id);

        let gpsOrigineAndata = gpsAzienda;
        let etichettaOrigine = "Da Sede Aziendale";

        if (indiceCantiereAttuale > 0) {
            const cantierePrecedente = cantieriStessoGiorno[indiceCantiereAttuale - 1];
            const commessaPrecedente = commesse.find(co => co.id === cantierePrecedente.idCommessa);
            if (commessaPrecedente && commessaPrecedente.gps && commessaPrecedente.gps.trim() !== "") {
                gpsOrigineAndata = commessaPrecedente.gps.trim();
                const clientePrec = clienti.find(cl => cl.id === commessaPrecedente.idCliente);
                etichettaOrigine = `Da Campo Prec.: ${clientePrec ? clientePrec.nome : commessaPrecedente.id}`;
            }
        }

        const minutiAndata = calcolaMinutiTrasferimento(gpsOrigineAndata, gpsCampoAttuale);
        const elemAndata = document.getElementById('view-trasferimento-andata');
        const elemOrigine = document.getElementById('view-origine-andata');
        if (elemAndata) elemAndata.textContent = `${minutiAndata} min`;
        if (elemOrigine) elemOrigine.textContent = etichettaOrigine;

        let gpsDestinazioneRitorno = gpsAzienda;
        let etichettaDestinazione = "Rientro in Sede";

        if (indiceCantiereAttuale !== -1 && indiceCantiereAttuale < cantieriStessoGiorno.length - 1) {
            const cantiereSuccessivo = cantieriStessoGiorno[indiceCantiereAttuale + 1];
            const commessaSuccessiva = commesse.find(co => co.id === cantiereSuccessivo.idCommessa);
            if (commessaSuccessiva && commessaSuccessiva.gps && commessaSuccessiva.gps.trim() !== "") {
                gpsDestinazioneRitorno = commessaSuccessiva.gps.trim();
                const clienteSucc = clienti.find(cl => cl.id === commessaSuccessiva.idCliente);
                etichettaDestinazione = `Verso Campo: ${clienteSucc ? clienteSucc.nome : commessaSuccessiva.id}`;
            }
        }

        const minutiRitorno = calcolaMinutiTrasferimento(gpsCampoAttuale, gpsDestinazioneRitorno);
        const elemRitorno = document.getElementById('view-trasferimento-ritorno');
        const elemDestinazione = document.getElementById('view-destinazione-ritorno');
        if (elemRitorno) elemRitorno.textContent = `${minutiRitorno} min`;
        if (elemDestinazione) elemDestinazione.textContent = etichettaDestinazione;

        const bloccoNote = document.getElementById('blocco-note-view');
        if (bloccoNote) {
            if (com && com.note && com.note.trim() !== "") {
                document.getElementById('view-note').textContent = com.note;
                bloccoNote.style.display = 'block';
            } else {
                bloccoNote.style.display = 'none';
            }
        }

        const linkTel = document.getElementById('view-telefono');
        if (linkTel) {
            if (cli && cli.telefono) {
                linkTel.href = `tel:${cli.telefono}`;
                const testoTel = linkTel.querySelector('span') || linkTel;
                testoTel.textContent = `Chiama Referente (${cli.referente || 'In Campo'})`;
                linkTel.style.display = 'inline-flex';
            } else {
                linkTel.style.display = 'none';
            }
        }

        // --- GESTIONE BOTTONE SINGOLO DINAMICO GOOGLE MAPS ---
        const gpsSpan = document.getElementById('view-gps');
        const linkMappa = document.getElementById('view-mappa-link'); // Questo è l'UNICO bottone nel tuo HTML originale

        if (gpsCampoAttuale !== "") {
            if (gpsSpan) {
                const testoGps = gpsSpan.querySelector('span') || gpsSpan;
                testoGps.textContent = `Coordinate Campo: ${gpsCampoAttuale}`;
                gpsSpan.style.display = 'flex';
            }

            if (linkMappa) {
                // Impostiamo l'URL passando gpsOrigineAndata (che sarà la sede oppure il campo precedente a seconda dei calcoli logistici fatti sopra)
                const urlNavigazione = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(gpsOrigineAndata)}&destination=${encodeURIComponent(gpsCampoAttuale)}&travelmode=driving`;
                linkMappa.href = urlNavigazione;
                linkMappa.target = "_blank";

                const spanBottone = linkMappa.querySelector('span');
                if (spanBottone) {
                    // Cambia solo il testo per farti capire da dove partirà il navigatore
                    if (indiceCantiereAttuale > 0 && gpsOrigineAndata !== gpsAzienda) {
                        spanBottone.textContent = "Naviga dal Campo Prec.";
                    } else {
                        spanBottone.textContent = "Naviga dalla Sede";
                    }
                }

                linkMappa.style.display = 'inline-flex';
            }
        } else {
            if (gpsSpan) gpsSpan.style.display = 'none';
            if (linkMappa) linkMappa.style.display = 'none';
        }

        const btnElimina = document.getElementById('btn-elimina-da-view');
        if (btnElimina) {
            const nuovoBtnElimina = btnElimina.cloneNode(true);
            btnElimina.parentNode.replaceChild(nuovoBtnElimina, btnElimina);

            nuovoBtnElimina.addEventListener('click', function() {
                if(confirm("Vuoi liberare questa fascia oraria? La commessa tornerà tra i lavori in attesa.")) {
                    let dbCant = window.leggiDatabase('cantieri');
                    let dbCom = window.leggiDatabase('commesse');
                    const cToDelete = dbCant.find(ca => ca.id === idCantiere);
                    if (cToDelete) {
                        const idx = dbCom.findIndex(co => co.id === cToDelete.idCommessa);
                        if (idx !== -1) dbCom[idx].stato = 'Da Pianificare';
                    }
                    window.salvaDatabase('commesse', dbCom);
                    window.salvaDatabase('cantieri', dbCant.filter(ca => ca.id !== idCantiere));
                    modaleView.style.display = 'none';
                    window.aggiornaCalendario();
                }
            });
        }

        modaleView.style.display = 'flex';
    };

    window.aggiornaCalendario();
});