// assets/js/pianificazione.js
document.addEventListener("DOMContentLoaded", function() {
    if (!document.getElementById('head-calendario')) return;

    // IMPOSTAZIONI AZIENDALI CON PAUSA PRANZO
    let impostazioniAzienda = window.leggiDatabase('impostazioni');
    if (!impostazioniAzienda || Array.isArray(impostazioniAzienda) || !impostazioniAzienda.inizioPausa) {
        impostazioniAzienda = {
            inizioTurno: "07:30",
            fineTurno: "19:30",
            inizioPausa: "12:30",
            finePausa: "13:30",
            pausaAttiva: true
        };
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
    let MINUTI_INIZIO_PAUSA = orarioInMinuti(impostazioniAzienda.inizioPausa);
    let MINUTI_FINE_PAUSA = orarioInMinuti(impostazioniAzienda.finePausa);
    let DURATA_PAUSA_MINUTI = MINUTI_FINE_PAUSA - MINUTI_INIZIO_PAUSA;

    // FUNZIONE CHIAVE: Calcola l'ora di fine considerando lo scavalcamento della pausa pranzo
    function calcolaMinutiFineConPausa(minutiInizio, durataLavoroMinuti) {
        let minutiFine = minutiInizio + durataLavoroMinuti;

        if (impostazioniAzienda.pausaAttiva && DURATA_PAUSA_MINUTI > 0) {
            if (minutiInizio < MINUTI_FINE_PAUSA && minutiFine > MINUTI_INIZIO_PAUSA) {
                minutiFine += DURATA_PAUSA_MINUTI;
            }
        }
        return minutiFine;
    }

    const btnImpostazioni = document.getElementById('btn-impostazioni-orari');
    const modaleImpostazioni = document.getElementById('modale-impostazioni');

    if (btnImpostazioni && modaleImpostazioni) {
        btnImpostazioni.addEventListener('click', () => {
            if (document.getElementById('imposta-inizio')) document.getElementById('imposta-inizio').value = impostazioniAzienda.inizioTurno;
            if (document.getElementById('imposta-fine')) document.getElementById('imposta-fine').value = impostazioniAzienda.fineTurno;
            if (document.getElementById('imposta-inizio-pausa')) document.getElementById('imposta-inizio-pausa').value = impostazioniAzienda.inizioPausa;
            if (document.getElementById('imposta-fine-pausa')) document.getElementById('imposta-fine-pausa').value = impostazioniAzienda.finePausa;
            modaleImpostazioni.style.display = 'flex';
        });

        document.querySelectorAll('.btn-chiudi-impostazioni').forEach(btn => {
            btn.addEventListener('click', () => { modaleImpostazioni.style.display = 'none'; });
        });

        document.getElementById('form-impostazioni')?.addEventListener('submit', function(e) {
            e.preventDefault();
            impostazioniAzienda.inizioTurno = document.getElementById('imposta-inizio').value;
            impostazioniAzienda.fineTurno = document.getElementById('imposta-fine').value;
            impostazioniAzienda.inizioPausa = document.getElementById('imposta-inizio-pausa').value;
            impostazioniAzienda.finePausa = document.getElementById('imposta-fine-pausa').value;

            window.salvaDatabase('impostazioni', impostazioniAzienda);

            MINUTI_INIZIO_TURNO = orarioInMinuti(impostazioniAzienda.inizioTurno);
            MINUTI_FINE_TURNO = orarioInMinuti(impostazioniAzienda.fineTurno);
            MINUTI_INIZIO_PAUSA = orarioInMinuti(impostazioniAzienda.inizioPausa);
            MINUTI_FINE_PAUSA = orarioInMinuti(impostazioniAzienda.finePausa);
            DURATA_PAUSA_MINUTI = MINUTI_FINE_PAUSA - MINUTI_INIZIO_PAUSA;

            modaleImpostazioni.style.display = 'none';
            alert('Orari e pausa pranzo aggiornati con successo!');
            window.aggiornaCalendario();
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
        if (!idRisorsa) return { sovrapposto: false };

        const commesse = window.leggiDatabase('commesse') || [];
        const cantieri = cantieriVirtuali || window.leggiDatabase('cantieri') || [];

        const commessaNuova = commesse.find(c => String(c.id).trim() === String(idCommessaAttuale).trim());
        const gpsNuovo = commessaNuova ? (commessaNuova.gps || "") : "";

        const minNuovoInizio = orarioInMinuti(oraInizioInput);
        const minNuovoFine = orarioInMinuti(oraFineInput);

        let cantieriGiorno = cantieri.filter(c =>
            String(c.data).trim() === String(dataInput).trim() &&
            String(c[tipoRisorsa]).trim() === String(idRisorsa).trim()
        );

        cantieriGiorno.sort((a,b) => orarioInMinuti(a.oraInizio) - orarioInMinuti(b.oraInizio));

        for (let i = 0; i < cantieriGiorno.length; i++) {
            let c = cantieriGiorno[i];

            if (String(c.idCommessa).trim() === String(idCommessaAttuale).trim()) continue;

            const minEsInizio = orarioInMinuti(c.oraInizio);
            const minEsFine = orarioInMinuti(c.oraFine);

            if (minNuovoInizio < minEsFine && minNuovoFine > minEsInizio) {
                const commessaEsistente = commesse.find(com => String(com.id).trim() === String(c.idCommessa).trim());
                const nomeCom = commessaEsistente ? commessaEsistente.id : c.idCommessa;
                return {
                    sovrapposto: true,
                    causale: `Risorsa già impegnata nella commessa ${nomeCom} dalle ${c.oraInizio} alle ${c.oraFine}.`
                };
            }

            const commessaEsistente = commesse.find(com => String(com.id).trim() === String(c.idCommessa).trim());
            const gpsEsistente = commessaEsistente ? (commessaEsistente.gps || "") : "";
            const minutiViaggio = calcolaMinutiTrasferimento(gpsEsistente, gpsNuovo);

            if (minNuovoInizio >= minEsFine) {
                if (minNuovoInizio < (minEsFine + minutiViaggio)) {
                    return {
                        sovrapposto: true,
                        causale: `Mancano i minuti stradali necessari (${minutiViaggio} min) per spostarsi dal cantiere ${c.idCommessa}.`
                    };
                }
            }

            if (minNuovoFine <= minEsInizio) {
                if ((minNuovoFine + minutiViaggio) > minEsInizio) {
                    return {
                        sovrapposto: true,
                        causale: `Servono ${minutiViaggio} min di viaggio per raggiungere il cantiere successivo ${c.idCommessa}.`
                    };
                }
            }
        }

        if (cantieriGiorno.length === 0 || minNuovoInizio <= orarioInMinuti(cantieriGiorno[0].oraInizio)) {
            const gpsAzienda = leggiGpsAzienda();
            const minutiDallaSede = calcolaMinutiTrasferimento(gpsAzienda, gpsNuovo);
            if (minNuovoInizio < (MINUTI_INIZIO_TURNO + minutiDallaSede)) {
                return {
                    sovrapposto: true,
                    causale: `L'azienda apre alle ${impostazioniAzienda.inizioTurno}. Servono ${minutiDallaSede} min per arrivare in campo.`
                };
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

        const mezzi = window.leggiDatabase('mezzi') || [];
        const operatori = window.leggiDatabase('operatori') || [];
        const clienti = window.leggiDatabase('clienti') || [];
        const cantieri = window.leggiDatabase('cantieri') || [];

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
                        cantieri.filter(c => String(c.idMezzo).trim() === String(mezzo.id).trim() && String(c.data).trim() === String(giorno).trim())
                        .sort((a, b) => a.oraInizio.localeCompare(b.oraInizio))
                        .forEach(cant => {
                            const op = operatori.find(o => String(o.id).trim() === String(cant.idOperatore).trim());
                            const com = window.leggiDatabase('commesse').find(co => String(co.id).trim() === String(cant.idCommessa).trim());
                            const cli = com ? clienti.find(cl => String(cl.id).trim() === String(com.idCliente).trim()) : null;

                            let bgStyle = "bg-white border-emerald-300 hover:border-emerald-600";
                            let oraStyle = "text-emerald-800";
                            let icona = "";

                            if (cant.statoOperativo === 'Completato' || (com && com.stato === 'Completato')) {
                                bgStyle = "bg-gray-100 border-gray-300 opacity-70";
                                oraStyle = "text-gray-500 line-through";
                                icona = `<i data-lucide="check-circle-2" class="w-3 h-3 inline ml-1 text-emerald-600"></i>`;
                            } else if (cant.statoOperativo === 'In Corso') {
                                bgStyle = "bg-orange-50 border-orange-400 hover:border-orange-500";
                                oraStyle = "text-orange-800 animate-pulse";
                                icona = `<i data-lucide="play-circle" class="w-3 h-3 inline ml-1 text-orange-600"></i>`;
                            }

                            rigaHtml += `
                                <div onclick="window.mostraDettaglioCantiere('${cant.id}')" class="${bgStyle} border rounded p-1.5 shadow-sm text-[11px] mb-1 cursor-pointer transition">
                                    <span class="font-bold block ${oraStyle}">${cant.oraInizio}-${cant.oraFine} ${icona}</span>
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
        const commessaReq = window.leggiDatabase('commesse').find(c => String(c.id).trim() === String(idCommessa).trim());
        if (!commessaReq) return;

        const clienteObj = window.leggiDatabase('clienti').find(c => String(c.id).trim() === String(commessaReq.idCliente).trim());
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
            selectMezzo.innerHTML = '<option value="">Seleziona macchina idonea...</option>';

            const compatibilita = {
                'aratura': ['Trattore', 'Aratro'],
                'ripuntatura': ['Trattore'],
                'erpicatura': ['Trattore'],
                'semina': ['Trattore', 'Seminatrice'],
                'trattamento': ['Botte Irroratrice', 'Drone', 'Trattore'],
                'diserbo': ['Botte Irroratrice', 'Drone', 'Trattore'],
                'concimazione': ['Botte Irroratrice', 'Drone', 'Trattore'],
                'mietitura': ['Mietitrebbia'],
                'raccolta': ['Mietitrebbia'],
                'trinciatura': ['Trattore', 'Trincia'],
                'fienagione': ['Trattore', 'Imballatrice', 'Rotopressa', 'Fresa'],
                'pressatura': ['Trattore']
            };

            let tipiAmmessi = [];
            for (let lavoroKey in compatibilita) {
                if (lavorazione.toLowerCase().includes(lavoroKey)) {
                    tipiAmmessi = compatibilita[lavoroKey];
                    break;
                }
            }

            const tuttiIMezzi = window.leggiDatabase('mezzi') || [];
            let mezziFiltrati = tuttiIMezzi.filter(m => m.stato === 'Disponibile');

            if (tipiAmmessi.length > 0) {
                mezziFiltrati = mezziFiltrati.filter(m => {
                    const tipoMezzo = String(m.tipo || m.nome).toLowerCase();
                    return tipiAmmessi.some(tipoAmmesso => tipoMezzo.includes(tipoAmmesso.toLowerCase()));
                });
            }

            mezziFiltrati.forEach(m => {
                selectMezzo.innerHTML += `<option value="${m.id}">${m.nome} (${m.tipo || m.targa || 'N/D'})</option>`;
            });

            if(mezziFiltrati.length === 0) {
                selectMezzo.innerHTML = '<option value="">Attenzione: Nessun mezzo idoneo trovato. Mostro tutti...</option>';
                tuttiIMezzi.filter(m => m.stato === 'Disponibile').forEach(m => {
                    selectMezzo.innerHTML += `<option value="${m.id}">${m.nome} (${m.tipo || m.targa || 'N/D'})</option>`;
                });
            }
        }

        if(selectOperatore) {
            selectOperatore.innerHTML = '<option value="">Seleziona operatore...</option>';
            window.leggiDatabase('operatori').forEach(o => {
                selectOperatore.innerHTML += `<option value="${o.id}">${o.nome} (€${o.costo}/h)</option>`;
            });
        }

        // --- INIZIO MODIFICA: CONTROLLO ORARIO MANUALE ---
        if(inputInizio) {
            let oraSuggerita = impostazioniAzienda.inizioTurno;

            // Se stiamo pianificando per OGGI e l'orario attuale supera quello di inizio turno, aggiorna il suggerimento
            if (document.getElementById('pian-data') && document.getElementById('pian-data').value === new Date().toISOString().split('T')[0]) {
                const adesso = new Date();
                const minutiAttuali = (adesso.getHours() * 60) + adesso.getMinutes();
                if (minutiAttuali > MINUTI_INIZIO_TURNO) {
                     // Arrotondiamo alla mezz'ora successiva
                    let minutiArrotondati = Math.ceil(minutiAttuali / 30) * 30;
                    let h = Math.floor(minutiArrotondati / 60);
                    let m = minutiArrotondati % 60;
                    oraSuggerita = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                }
            }

            inputInizio.value = oraSuggerita;
        }
        // --- FINE MODIFICA ---

        calcolaQuadroEconomico();
        document.getElementById('modale-pianificazione').style.display = 'flex';
    };

    function calcolaQuadroEconomico() {
        const lavorazione = document.getElementById('pian-lavorazione').value;
        const idMezzo = selectMezzo ? selectMezzo.value : null;

        const RESE_MEDIE = {
            'Aratura': 0.8,
            'Ripuntatura': 1.2,
            'Erpicatura': 1.5,
            'Semina': 1.8,
            'Semina precisione': 1.5,
            'Trattamento Fitosanitario': 4.0,
            'Diserbo': 4.0,
            'Concimazione': 5.0,
            'Mietitura': 1.5,
            'Raccolta': 1.5,
            'Trinciatura Stocchi': 2.0,
            'Fienagione': 2.5,
            'Pressatura Rotoballe': 2.5
        };

        let resaRealeHa = 1.5;
        for (let chiaveLav in RESE_MEDIE) {
            if (lavorazione.toLowerCase().includes(chiaveLav.toLowerCase())) {
                resaRealeHa = RESE_MEDIE[chiaveLav];
                break;
            }
        }

        let oreLavoro = ettariGlobali / resaRealeHa;
        let minutiLavoroNetto = Math.round(oreLavoro * 60) + 15; // 15 min setup

        if (inputInizio && inputInizio.value && (!inputFine.value || idMezzo)) {
            let startMin = orarioInMinuti(inputInizio.value);
            let minutesTotali = calcolaMinutiFineConPausa(startMin, minutiLavoroNetto);

            let oreFine = Math.floor(minutesTotali / 60);
            let minFine = minutesTotali % 60;
            if (oreFine > 23) { oreFine = 23; minFine = 59; }

            inputFine.value = `${String(oreFine).padStart(2, '0')}:${String(minFine).padStart(2, '0')}`;
        }

        if (inputInizio && inputInizio.value && inputFine && inputFine.value && inputInizio.value < inputFine.value) {
            oreLavoro = (orarioInMinuti(inputFine.value) - orarioInMinuti(inputInizio.value)) / 60;
        }

        const coef = COEFFICIENTI_MEZZI[mappaLavorazioni[lavorazione]?.[0]] || { tariffaEttaro: 80, ammortamentoOrario: 30, consumoLitriOra: 20 };

        const ricavoTotale = ettariGlobali * coef.tariffaEttaro;
        const costoOperaio = parseFloat(window.leggiDatabase('operatori').find(o => String(o.id).trim() === String(selectOperatore ? selectOperatore.value : null).trim())?.costo) || 20;
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

        // --- INIZIO MODIFICA: BLOCCO SALVATAGGIO NEL PASSATO ---
        if (data === new Date().toISOString().split('T')[0]) {
            const adesso = new Date();
            const minAttuali = (adesso.getHours() * 60) + adesso.getMinutes();
            if (orarioInMinuti(inputInizio.value) < minAttuali) {
                alert("Errore: Non puoi pianificare un lavoro nel passato per la giornata odierna. L'orario di inizio deve essere successivo a quello attuale.");
                return;
            }
        }
        // --- FINE MODIFICA ---

        const dbCantieriAttuali = window.leggiDatabase('cantieri') || [];

        const checkMz = controllaSovrapposizioneLogistica(selectMezzo.value, 'idMezzo', data, inputInizio.value, inputFine.value, idCom, dbCantieriAttuali);
        if (checkMz.sovrapposto) {
            alert(`🚨 BLOCCO MACCHINA\n\nMotivo: ${checkMz.causale}`);
            return;
        }

        const checkOp = controllaSovrapposizioneLogistica(selectOperatore.value, 'idOperatore', data, inputInizio.value, inputFine.value, idCom, dbCantieriAttuali);
        if (checkOp.sovrapposto) {
            alert(`🚨 BLOCCO OPERATORE\n\nMotivo: ${checkOp.causale}`);
            return;
        }

        const opIdScelto = selectOperatore.value;
        const cantieriStessaMacchinaOggi = dbCantieriAttuali.filter(c => String(c.data).trim() === String(data).trim() && String(c.idMezzo).trim() === String(selectMezzo.value).trim());

        if (cantieriStessaMacchinaOggi.length > 0) {
            const cantiereAltroOperatore = cantieriStessaMacchinaOggi.find(c => String(c.idOperatore).trim() !== String(opIdScelto).trim());
            if (cantiereAltroOperatore) {
                const operatoriDb = window.leggiDatabase('operatori') || [];
                const opPrecedente = operatoriDb.find(o => String(o.id).trim() === String(cantiereAltroOperatore.idOperatore).trim());
                const nomeOpPrecedente = opPrecedente ? opPrecedente.nome : 'un altro operatore';
                const opNuovo = operatoriDb.find(o => String(o.id).trim() === String(opIdScelto).trim());
                const nomeOpNuovo = opNuovo ? opNuovo.nome : 'l\'operatore selezionato';

                const confermaCambio = confirm(`⚠️ CAMBIO ALLA GUIDA RILEVATO\n\nLa macchina selezionata è già guidata oggi da ${nomeOpPrecedente}.\nStai per assegnare un nuovo cantiere a ${nomeOpNuovo}.\n\nVuoi confermare il cambio alla guida sulla stessa macchina?\n\nPremi OK per procedere, Annulla per correggere.`);
                if (!confermaCambio) return;
            }
        }

        dbCantieriAttuali.push({
            id: window.generaID('CANT', dbCantieriAttuali),
            data: data,
            oraInizio: inputInizio.value,
            oraFine: inputFine.value,
            idMezzo: selectMezzo.value,
            idOperatore: selectOperatore.value,
            idCommessa: idCom,
            margineCalcolato: document.getElementById('econ-margine').textContent.replace('€ ', '')
        });
        window.salvaDatabase('cantieri', dbCantieriAttuali);

        let commesse = window.leggiDatabase('commesse') || [];
        const idx = commesse.findIndex(c => String(c.id).trim() === String(idCom).trim());
        if (idx !== -1) { commesse[idx].stato = 'Pianificato'; window.salvaDatabase('commesse', commesse); }

        document.getElementById('modale-pianificazione').style.display = 'none';
        window.aggiornaCalendario();
    });

    // --- OTTIMIZZATORE IA BLINDATO E CORRETTO ---

    function eMacchinaIdoneaPerLavoro(tipoMacchina, nomeMacchina, lavorazione) {
        const tipo = (tipoMacchina + " " + nomeMacchina).toLowerCase();
        const lav = lavorazione.toLowerCase();

        if (tipo.includes('botte') || tipo.includes('irroratrice') || tipo.includes('mazzotti')) {
            return lav.includes('trattamento') || lav.includes('diserbo') || lav.includes('concimazione') || lav.includes('fitosanitario');
        }
        if (tipo.includes('mietitrebbia')) return lav.includes('mietitura') || lav.includes('raccolta');
        if (tipo.includes('escavatore')) return lav.includes('scavo') || lav.includes('movimento terra');
        if (lav.includes('aratura') || lav.includes('ripuntatura') || lav.includes('erpicatura') || lav.includes('semina')) {
            return tipo.includes('trattore') || tipo.includes('aratro') || tipo.includes('seminatrice');
        }
        if (lav.includes('trinciatura')) return tipo.includes('trincia') || tipo.includes('trattore');
        if (lav.includes('fienagione') || lav.includes('pressatura')) {
            return tipo.includes('trattore') || tipo.includes('imballatrice') || tipo.includes('rotopressa') || tipo.includes('fresa');
        }
        return true;
    }

    document.getElementById('btn-ottimizza-ai')?.addEventListener('click', function() {
        let commesse = window.leggiDatabase('commesse') || [];
        let commesseDaPianificare = commesse.filter(c => c.stato === 'Da Pianificare' || c.stato === 'In Corso Parziale');
        let mezzi = window.leggiDatabase('mezzi').filter(m => m.stato === 'Disponibile');
        let operatori = window.leggiDatabase('operatori') || [];
        let cantieriMemory = window.leggiDatabase('cantieri') || [];
        const gpsAzienda = leggiGpsAzienda();

        // --- INIZIO MODIFICA: CALCOLO ORARIO ATTUALE PER L'IA ---
        const oggiIA = new Date();
        const dataOdiernaIA = oggiIA.toISOString().split('T')[0];
        const minutiAttualiIA = (oggiIA.getHours() * 60) + oggiIA.getMinutes();
        // --- FINE MODIFICA ---

        if (commesseDaPianificare.length === 0 || mezzi.length === 0 || operatori.length === 0) {
            return alert("Dati insufficienti per l'ottimizzazione.");
        }

        const RESE_MEDIE_IA = {
            'Aratura': 0.8, 'Ripuntatura': 1.2, 'Erpicatura': 1.5,
            'Semina precisione': 1.5, 'Semina': 1.8, 'Trattamento Fitosanitario': 4.0,
            'Diserbo': 4.0, 'Concimazione': 5.0, 'Mietitura': 1.5, 'Raccolta': 1.5,
            'Trinciatura Stocchi': 2.0, 'Trinciatura': 2.0, 'Fienagione': 2.5, 'Pressatura Rotoballe': 2.5
        };

        let successCount = 0;

        for (let giorno of dateCalendario) {
            let commesseLavorateOggi = [];

            for (let macchina of mezzi) {
                let inMin = MINUTI_INIZIO_TURNO;

                // --- INIZIO MODIFICA: AGGIORNAMENTO START IA ---
                if (giorno === dataOdiernaIA && inMin < minutiAttualiIA) {
                    inMin = Math.ceil(minutiAttualiIA / 30) * 30;
                }
                // --- FINE MODIFICA ---

                let ultimaPosizione = gpsAzienda;
                let operatoreDelGiorno = null;
                let loopCount = 0;

                while (inMin < MINUTI_FINE_TURNO && loopCount < 50) {
                    loopCount++;

                    let commesseValide = commesseDaPianificare.filter(c => {
                        if (commesseLavorateOggi.includes(c.id)) return false;

                        let lavStr = String(c.lavorazione || "").trim();
                        let dateOk = true;
                        if (c.dataInizio && c.dataFine && String(c.dataInizio).trim() !== '' && String(c.dataFine).trim() !== '') {
                            dateOk = (giorno >= c.dataInizio && giorno <= c.dataFine);
                        }
                        let macOk = eMacchinaIdoneaPerLavoro(macchina.tipo || "", macchina.nome || "", lavStr);
                        return dateOk && macOk;
                    });

                    if (commesseValide.length === 0) break;

                    let commessaPiuVicina = null;
                    let minDistanza = Infinity;

                    commesseValide.forEach(c => {
                        let gpsDest = (c.gps && String(c.gps).trim() !== "") ? String(c.gps).trim() : gpsAzienda;
                        let tViaggio = calcolaMinutiTrasferimento(ultimaPosizione, gpsDest);
                        if (tViaggio > 60) tViaggio = 60;
                        if (tViaggio < minDistanza) {
                            minDistanza = tViaggio;
                            commessaPiuVicina = c;
                        }
                    });

                    if (!commessaPiuVicina) break;

                    let rawEttari = String(commessaPiuVicina.ettari || "0").replace(',', '.');
                    let lavorazioneCommessa = String(commessaPiuVicina.lavorazione || "").toLowerCase();

                    let resaRealeHa = 1.5;
                    for (let chiaveLav in RESE_MEDIE_IA) {
                        if (lavorazioneCommessa.includes(chiaveLav.toLowerCase())) {
                            resaRealeHa = RESE_MEDIE_IA[chiaveLav];
                            break;
                        }
                    }

                    let durataLavoroNetta = Math.round((parseFloat(rawEttari) / resaRealeHa) * 60) + 15;
                    let inizioEffettivo = inMin + minDistanza;

                    if (inizioEffettivo >= MINUTI_INIZIO_PAUSA && inizioEffettivo < MINUTI_FINE_PAUSA) {
                        inizioEffettivo = MINUTI_FINE_PAUSA;
                    }

                    let fineEffettiva = calcolaMinutiFineConPausa(inizioEffettivo, durataLavoroNetta);

                    let haBisognoDiPiuGiorni = false;
                    let ettariRimanenti = 0;

                    if (fineEffettiva > MINUTI_FINE_TURNO) {
                        let minutiDisponibiliOggi = MINUTI_FINE_TURNO - inizioEffettivo;
                        if (minutiDisponibiliOggi < 45) {
                            break;
                        }
                        fineEffettiva = MINUTI_FINE_TURNO;

                        let minutiLavoroReale = minutiDisponibiliOggi - 15;
                        let oreLavoroReale = minutiLavoroReale / 60;
                        let ettariCompletatiOggi = oreLavoroReale * resaRealeHa;

                        ettariRimanenti = parseFloat(rawEttari) - ettariCompletatiOggi;
                        haBisognoDiPiuGiorni = true;
                    }

                    let strIn = `${String(Math.floor(inizioEffettivo/60)).padStart(2,'0')}:${String(inizioEffettivo%60).padStart(2,'0')}`;
                    let strFi = `${String(Math.floor(fineEffettiva/60)).padStart(2,'0')}:${String(fineEffettiva%60).padStart(2,'0')}`;

                    const checkMz = controllaSovrapposizioneLogistica(macchina.id, 'idMezzo', giorno, strIn, strFi, commessaPiuVicina.id, cantieriMemory);
                    if (checkMz.sovrapposto) {
                        inMin += 30;
                        continue;
                    }

                    let opAssegnato = null;
                    if (operatoreDelGiorno) {
                        const checkStessoOp = controllaSovrapposizioneLogistica(operatoreDelGiorno.id, 'idOperatore', giorno, strIn, strFi, commessaPiuVicina.id, cantieriMemory);
                        if (!checkStessoOp.sovrapposto) opAssegnato = operatoreDelGiorno;
                    }

                    if (!opAssegnato) {
                        opAssegnato = operatori.find(op => !controllaSovrapposizioneLogistica(op.id, 'idOperatore', giorno, strIn, strFi, commessaPiuVicina.id, cantieriMemory).sovrapposto);
                    }

                    if (opAssegnato) {
                        operatoreDelGiorno = opAssegnato;

                        cantieriMemory.push({
                            id: window.generaID('CANT', cantieriMemory),
                            data: giorno,
                            oraInizio: strIn,
                            oraFine: strFi,
                            idMezzo: macchina.id,
                            idOperatore: opAssegnato.id,
                            idCommessa: commessaPiuVicina.id
                        });

                        commesseLavorateOggi.push(commessaPiuVicina.id);

                        if (haBisognoDiPiuGiorni && ettariRimanenti > 0.1) {
                            commessaPiuVicina.ettari = ettariRimanenti.toFixed(2);
                            commessaPiuVicina.stato = 'In Corso Parziale';
                        } else {
                            commessaPiuVicina.stato = 'Pianificato';
                        }

                        successCount++;
                        ultimaPosizione = (commessaPiuVicina.gps && String(commessaPiuVicina.gps).trim() !== "") ? String(commessaPiuVicina.gps).trim() : gpsAzienda;
                        inMin = fineEffettiva;
                    } else {
                       inMin += 30;
                    }
                }
            }
        }

        if (successCount > 0) {
            window.salvaDatabase('cantieri', cantieriMemory);
            window.salvaDatabase('commesse', commesse);
            alert(`Logistica ottimizzata: ${successCount} turni pianificati.`);
            window.aggiornaCalendario();
        } else {
            alert("Nessun inserimento possibile. Controllare limiti di viaggio, orari o dati delle commesse.");
        }
    });

    document.querySelectorAll('.btn-chiudi, #btn-chiudi-view, #btn-chiudi-view-basso').forEach(btn => btn.addEventListener('click', () => {
        if(document.getElementById('modale-pianificazione')) document.getElementById('modale-pianificazione').style.display = 'none';
        if(document.getElementById('modale-visualizzazione')) document.getElementById('modale-visualizzazione').style.display = 'none';
    }));

    window.mostraDettaglioCantiere = function(idCantiere) {
        const modaleView = document.getElementById('modale-visualizzazione');
        if (!modaleView) return;

        const cantieri = window.leggiDatabase('cantieri') || [];
        const commesse = window.leggiDatabase('commesse') || [];
        const clienti = window.leggiDatabase('clienti') || [];
        const mezzi = window.leggiDatabase('mezzi') || [];
        const operatori = window.leggiDatabase('operatori') || [];

        const cant = cantieri.find(c => String(c.id).trim() === String(idCantiere).trim());
        if (!cant) return;

        const com = commesse.find(c => String(c.id).trim() === String(cant.idCommessa).trim());
        const cli = com ? clienti.find(c => String(c.id).trim() === String(com.idCliente).trim()) : null;
        const m = mezzi.find(mez => String(mez.id).trim() === String(cant.idMezzo).trim());
        const op = operatori.find(o => String(o.id).trim() === String(cant.idOperatore).trim());

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
            .filter(c => String(c.idMezzo).trim() === String(cant.idMezzo).trim() && String(c.data).trim() === String(cant.data).trim())
            .sort((a, b) => a.oraInizio.localeCompare(b.oraInizio));

        const indiceCantiereAttuale = cantieriStessoGiorno.findIndex(c => String(c.id).trim() === String(cant.id).trim());

        let gpsOrigineAndata = gpsAzienda;
        let etichettaOrigine = "Da Sede Aziendale";

        if (indiceCantiereAttuale > 0) {
            const cantierePrecedente = cantieriStessoGiorno[indiceCantiereAttuale - 1];
            const commessaPrecedente = commesse.find(co => String(co.id).trim() === String(cantierePrecedente.idCommessa).trim());
            if (commessaPrecedente && commessaPrecedente.gps && commessaPrecedente.gps.trim() !== "") {
                gpsOrigineAndata = commessaPrecedente.gps.trim();
                const clientePrec = clienti.find(cl => String(cl.id).trim() === String(commessaPrecedente.idCliente).trim());
                etichettaOrigine = `Da Campo: ${clientePrec ? clientePrec.nome : commessaPrecedente.id}`;
            }
        }

        const minutesAndata = calcolaMinutiTrasferimento(gpsOrigineAndata, gpsCampoAttuale);
        const elemAndata = document.getElementById('view-trasferimento-andata');
        const elemOrigine = document.getElementById('view-origine-andata');
        if (elemAndata) elemAndata.textContent = `${minutesAndata} min`;
        if (elemOrigine) elemOrigine.textContent = etichettaOrigine;

        let gpsDestinazioneRitorno = gpsAzienda;
        let etichettaDestinazione = "Rientro in Sede";

        if (indiceCantiereAttuale !== -1 && indiceCantiereAttuale < cantieriStessoGiorno.length - 1) {
            const cantiereSuccessivo = cantieriStessoGiorno[indiceCantiereAttuale + 1];
            const commessaSuccessiva = commesse.find(co => String(co.id).trim() === String(cantiereSuccessivo.idCommessa).trim());
            if (commessaSuccessiva && commessaSuccessiva.gps && commessaSuccessiva.gps.trim() !== "") {
                gpsDestinazioneRitorno = commessaSuccessiva.gps.trim();
                const clienteSucc = clienti.find(cl => String(cl.id).trim() === String(commessaSuccessiva.idCliente).trim());
                etichettaDestinazione = `Verso Campo: ${clienteSucc ? clienteSucc.nome : commessaSuccessiva.id}`;
            }
        }

        const minutesRitorno = calcolaMinutiTrasferimento(gpsCampoAttuale, gpsDestinazioneRitorno);
        const elemRitorno = document.getElementById('view-trasferimento-ritorno');
        const elemDestinazione = document.getElementById('view-destinazione-ritorno');
        if (elemRitorno) elemRitorno.textContent = `${minutesRitorno} min`;
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

        const gpsSpan = document.getElementById('view-gps');
        const linkMappa = document.getElementById('view-mappa-link');

        if (gpsCampoAttuale !== "") {
            if (gpsSpan) {
                const testoGps = gpsSpan.querySelector('span') || gpsSpan;
                testoGps.textContent = `Coordinate Campo: ${gpsCampoAttuale}`;
                gpsSpan.style.display = 'flex';
            }

            if (linkMappa) {
                const urlNavigazione = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(gpsOrigineAndata)}&destination=${encodeURIComponent(gpsCampoAttuale)}&travelmode=driving`;
                linkMappa.href = urlNavigazione;
                linkMappa.target = "_blank";

                const spanBottone = linkMappa.querySelector('span');
                if (spanBottone) {
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
                if(confirm("Vuoi liberare questa fascia oraria? La commessa tornerà tra i lavori in attesa e verranno azzerate le risorse assegnate.")) {
                    let dbCant = window.leggiDatabase('cantieri') || [];
                    let dbCom = window.leggiDatabase('commesse') || [];

                    // Trova il cantiere che stiamo eliminando
                    const cToDelete = dbCant.find(ca => String(ca.id).trim() === String(idCantiere).trim());

                    if (cToDelete) {
                        // Trova la commessa collegata
                        const idx = dbCom.findIndex(co => String(co.id).trim() === String(cToDelete.idCommessa).trim());

                        if (idx !== -1) {
                            // RIPRISTINO TOTALE COMMESSA: Torna da pianificare e rimuove gli orari/risorse residue
                            dbCom[idx].stato = 'Da Pianificare';
                            delete dbCom[idx].oraInizio;
                            delete dbCom[idx].oraFine;
                            delete dbCom[idx].idMezzo;
                            delete dbCom[idx].idOperatore;
                        }
                    }

                    // Salva i database aggiornati ripulendo il cantiere
                    window.salvaDatabase('commesse', dbCom);
                    window.salvaDatabase('cantieri', dbCant.filter(ca => String(ca.id).trim() !== String(idCantiere).trim()));

                    modaleView.style.display = 'none';
                    window.aggiornaCalendario();
                }
            });
        }

        modaleView.style.display = 'flex';
    };

    window.aggiornaCalendario();
});
