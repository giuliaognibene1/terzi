// assets/js/terzista-richieste.js

window.richiesteRaggruppateCampi = {};
window.indiciPopupCampi = {};
window.markerGroupMezzi = null;
window.flottaRaggruppata = {};
window.indiciPopupFlotta = {};

document.addEventListener("DOMContentLoaded", function() {
    let mappaRichieste = null;
    let markerGroup = null;

    // Controllo Sessione Terzista
    const titolareAttivo = JSON.parse(sessionStorage.getItem('utenteAttivo'));
    if (titolareAttivo && document.getElementById('etichetta-titolare')) {
        document.getElementById('etichetta-titolare').textContent = titolareAttivo.nome;
    }

    function caricaRichiesteMappa() {
        const tutteLeRichieste = JSON.parse(localStorage.getItem('databaseRichiesteLavoro')) || [];
        const tuttiICampi = JSON.parse(localStorage.getItem('databaseCampi')) || [];

        // Prendiamo la data di oggi in formato ISO standard (YYYY-MM-DD) per il confronto
        const oggiStr = new Date().toLocaleDateString('sv-SE');

        // FILTRO RIGOROSO: Solo in attesa E con data maggiore o uguale a oggi!
        const richiesteInAttesa = tutteLeRichieste.filter(r => {
            const statoOk = (r.stato === "IN ATTESA");
            const dataOk = (r.dataPianificata && r.dataPianificata >= oggiStr);
            return statoOk && dataOk;
        });

        const bloccoVuoto = document.getElementById('tabella-richieste-portale-vuota');
        const listaRichieste = document.getElementById('lista-richieste-portale');

        if (!mappaRichieste && document.getElementById('mappa-richieste')) {
            mappaRichieste = L.map('mappa-richieste').setView([44.6982, 10.6312], 11);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mappaRichieste);
            markerGroup = L.featureGroup().addTo(mappaRichieste);
            window.markerGroupMezzi = L.featureGroup().addTo(mappaRichieste);
        }

        if (markerGroup) markerGroup.clearLayers();
        if (window.markerGroupMezzi) window.markerGroupMezzi.clearLayers();

        if (!bloccoVuoto || !listaRichieste) return;

        if (richiesteInAttesa.length === 0) {
            bloccoVuoto.classList.remove('hidden');
            bloccoVuoto.innerHTML = "Nessuna richiesta in attesa dagli agricoltori.";
            listaRichieste.classList.add('hidden');
        } else {
            bloccoVuoto.classList.add('hidden');
            listaRichieste.classList.remove('hidden');
            listaRichieste.innerHTML = '';

            window.richiesteRaggruppateCampi = {};

            // 1. RENDERING LISTA TESTUALE
            richiesteInAttesa.forEach(richiesta => {
                const isPianificabile = verificaDisponibilitaRisorse(richiesta.tipoLavoro, richiesta.dataPianificata);

                if (!window.richiesteRaggruppateCampi[richiesta.idCampo]) {
                    window.richiesteRaggruppateCampi[richiesta.idCampo] = [];
                }
                window.richiesteRaggruppateCampi[richiesta.idCampo].push(richiesta);

                const coloreBordoLat = isPianificabile ? 'border-l-blue-500' : 'border-l-gray-300 opacity-75';
                const stileBadge = isPianificabile ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-gray-500 bg-gray-100 border-gray-200';
                const testoBadge = isPianificabile ? '✨ MATCH DISPONIBILE' : '❌ RISORSE OCCUPATE';

                const bottoneHtml = isPianificabile
                    ? `<button onclick="accettaRichiestaInPagina('${richiesta.id}')" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow transition cursor-pointer">Prendi in Carico</button>`
                    : `<button disabled class="bg-gray-200 text-gray-400 text-xs font-bold py-2 px-3 rounded-lg cursor-not-allowed">Non Pianificabile</button>`;

                const div = document.createElement('div');
                div.className = `bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center border-l-4 ${coloreBordoLat} transition`;
                div.innerHTML = `
                    <div>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded border ${stileBadge}">${testoBadge}</span>
                        <h4 class="font-bold text-gray-900 mt-2">🚜 ${richiesta.tipoLavoro}</h4>
                        <p class="text-xs text-gray-600 mt-1">Campo: ${richiesta.nomeCampo} (${richiesta.superficie} Ha)</p>
                        <p class="text-xs ${isPianificabile ? 'text-blue-800' : 'text-gray-500'} font-bold mt-0.5">Data: ${formattaDataInversa(richiesta.dataPianificata)}</p>
                    </div>
                    <div class="mt-3 sm:mt-0">
                        ${bottoneHtml}
                    </div>
                `;
                listaRichieste.appendChild(div);
            });

            // 2. RENDERING MAPPA DELLE RICHIESTE
            Object.keys(window.richiesteRaggruppateCampi).forEach(idCampo => {
                const listaRichiesteCampo = window.richiesteRaggruppateCampi[idCampo];
                const infoCampo = tuttiICampi.find(c => c.id == idCampo);

                if (infoCampo && infoCampo.lat && infoCampo.lng) {
                    window.indiciPopupCampi[idCampo] = 0;

                    const haAlmenoUnMatch = listaRichiesteCampo.some(r => verificaDisponibilitaRisorse(r.tipoLavoro, r.dataPianificata));
                    const marker = L.marker([infoCampo.lat, infoCampo.lng], { opacity: haAlmenoUnMatch ? 1.0 : 0.6 });

                    let navBarHtml = '';
                    if (listaRichiesteCampo.length > 1) {
                        navBarHtml = `
                            <div class="flex justify-between items-center bg-gray-100 p-1 rounded my-2 text-xs font-bold text-gray-700">
                                <button type="button" class="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-200 font-bold" onclick="sccorriPopupDati(event, '${idCampo}', -1)">←</button>
                                <span class="txt-pop-counter" id="counter-pop-${idCampo}">1 di ${listaRichiesteCampo.length}</span>
                                <button type="button" class="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-200 font-bold" onclick="sccorriPopupDati(event, '${idCampo}', 1)">→</button>
                            </div>
                        `;
                    }

                    const containerHtml = `
                        <div class="p-1 min-w-[180px] select-none">
                            <div class="font-bold text-sm text-blue-800 txt-pop-titolo" id="titolo-pop-${idCampo}"></div>
                            <div class="text-xs text-gray-600 mt-1"><strong>Campo:</strong> <span class="txt-pop-info" id="info-pop-${idCampo}"></span></div>
                            <div class="text-xs text-gray-600 mt-0.5"><strong>Data:</strong> <span class="txt-pop-data" id="data-pop-${idCampo}"></span></div>
                            ${navBarHtml}
                            <div id="btn-container-pop-${idCampo}"></div>
                        </div>
                    `;

                    marker.bindPopup(containerHtml);

                    marker.on('popupopen', function() {
                        aggiornaDatiContenutoPopup(idCampo, window.indiciPopupCampi[idCampo]);
                    });

                    markerGroup.addLayer(marker);
                }
            });
        }

        renderizzaFlottaSullaMappa();

        let bounds = L.latLngBounds([]);
        if (markerGroup && markerGroup.getLayers().length > 0) bounds.extend(markerGroup.getBounds());
        if (window.markerGroupMezzi && window.markerGroupMezzi.getLayers().length > 0) bounds.extend(window.markerGroupMezzi.getBounds());

        if (bounds.isValid()) {
            mappaRichieste.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    // --- RECUPERO DINAMICO DELLE COORDINATE DELLA SEDE DEL TERZISTA LOGGATO ---
    // --- RECUPERO IMPRESCINDIBILE DELLE COORDINATE DELLA SEDE DEL TERZISTA ---
    function ottieniCoordinateSedeAzienda() {
        // Coordinate di ripiego estremo
        let fallbackLat = 44.6982;
        let fallbackLng = 10.6312;

        // 1. SETACCIO DELLE CHIAVI DEL DATABASE INTERNO DEL GESTIONALE
        // Controlliamo tutte le varianti di chiavi che potresti aver usato nel modulo azienda
        const chiaviProbabili = ['azienda', 'datiAzienda', 'anagraficaAzienda', 'profiloAzienda', 'sedeAzienda'];

        for (let chiave of chiaviProbabili) {
            let dati = window.leggiDatabase ? window.leggiDatabase(chiave) : null;

            if (dati) {
                // Se è un array prendiamo il primo elemento, altrimenti l'oggetto singolo
                let record = Array.isArray(dati) ? dati[0] : dati;

                if (record && record.gps) {
                    const parti = record.gps.split(',');
                    if (parti.length === 2) {
                        return { lat: parseFloat(parti[0].trim()), lng: parseFloat(parti[1].trim()) };
                    }
                }
            }
        }

        // 2. SETACCIO DEL LOCALSTORAGE GREZZO (Se config.js non è usato per questa specifica tabella)
        const utenteLoggato = JSON.parse(sessionStorage.getItem('utenteAttivo')) || JSON.parse(sessionStorage.getItem('utenteActive'));
        const emailUtente = utenteLoggato ? utenteLoggato.email : null;

        // Cerca nelle anagrafiche globali collegate alla mail di login
        if (emailUtente) {
            const anagraficheGlobali = JSON.parse(localStorage.getItem('databaseAnagraficheAziende')) || {};
            const profilo = anagraficheGlobali[emailUtente];
            if (profilo && profilo.gps) {
                const parti = profilo.gps.split(',');
                if (parti.length === 2) {
                    return { lat: parseFloat(parti[0].trim()), lng: parseFloat(parti[1].trim()) };
                }
            }
        }

        // 3. ISPEZIONE DIRETTA DI TUTTO IL LOCALSTORAGE PER TROVARE LA STRINGA GPS
        // Se hai salvato il dato sotto una chiave personalizzata improvvisata, la scoviamo così
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const chiaveLS = localStorage.key(i);
                if (chiaveLS.toLowerCase().includes('azienda') || chiaveLS.toLowerCase().includes('profile')) {
                    const valoreRaw = localStorage.getItem(chiaveLS);
                    if (valoreRaw && valoreRaw.includes(',')) {
                        const oggetto = JSON.parse(valoreRaw);
                        // Se è un array di configurazione
                        const record = Array.isArray(oggetto) ? oggetto[0] : oggetto;
                        if (record && record.gps) {
                            const parti = record.gps.split(',');
                            if (parti.length === 2) {
                                return { lat: parseFloat(parti[0].trim()), lng: parseFloat(parti[1].trim()) };
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Errore nell'ispezione del localStorage", e);
        }

        // Se è arrivato fin qui, significa che questo specifico terzista non ha ancora
        // inserito o salvato le coordinate nel campo GPS della pagina azienda.html
        return { lat: fallbackLat, lng: fallbackLng };
    }

    // --- POSIZIONAMENTO FLOTTA RAGGRUPPATA ---
    function renderizzaFlottaSullaMappa() {
        const mezzi = window.leggiDatabase ? window.leggiDatabase('mezzi') : [];
        const cantieri = window.leggiDatabase ? window.leggiDatabase('cantieri') : [];
        const commesse = window.leggiDatabase ? window.leggiDatabase('commesse') : [];
        const oggi = new Date().toLocaleDateString('sv-SE');

        // Recupero dinamico della posizione della sede reale
        const coordinateSede = ottieniCoordinateSedeAzienda();

        window.flottaRaggruppata = {};
        window.flottaRaggruppata['sede'] = { lat: coordinateSede.lat, lng: coordinateSede.lng, tipo: 'sede', mezzi: [] };

        mezzi.forEach(mezzo => {
            const cantiereOggi = cantieri.find(c => c.data === oggi && c.idMezzo === mezzo.id);
            let mezzoInCampo = false;

            if (cantiereOggi) {
                const commessaCorrente = commesse.find(c => c.id === cantiereOggi.idCommessa);
                if (commessaCorrente && commessaCorrente.gps) {
                    const gpsSplit = commessaCorrente.gps.split(',');
                    if (gpsSplit.length === 2) {
                        const idCantiere = commessaCorrente.id;

                        if (!window.flottaRaggruppata[idCantiere]) {
                            window.flottaRaggruppata[idCantiere] = {
                                lat: parseFloat(gpsSplit[0].trim()),
                                lng: parseFloat(gpsSplit[1].trim()),
                                tipo: 'campo',
                                lavorazione: commessaCorrente.lavorazione,
                                mezzi: []
                            };
                        }
                        window.flottaRaggruppata[idCantiere].mezzi.push(mezzo);
                        mezzoInCampo = true;
                    }
                }
            }

            if (!mezzoInCampo) {
                window.flottaRaggruppata['sede'].mezzi.push(mezzo);
            }
        });

        Object.keys(window.flottaRaggruppata).forEach(idGruppo => {
            const gruppo = window.flottaRaggruppata[idGruppo];

            if (gruppo.mezzi.length === 0) return;

            window.indiciPopupFlotta[idGruppo] = 0;
            const colorePunto = gruppo.tipo === 'sede' ? 'bg-orange-500 border-orange-700' : 'bg-purple-600 border-purple-800';

            const badgeNumero = gruppo.mezzi.length > 1
                ? `<div class="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white shadow">${gruppo.mezzi.length}</div>`
                : '';

            const flottaIcon = L.divIcon({
                className: 'flotta-icon-custom',
                html: `<div class="${colorePunto} text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md border-2 transform hover:scale-110 transition cursor-pointer z-50 relative">
                           <span class="text-sm">🚜</span>
                           ${badgeNumero}
                       </div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -20]
            });

            const marker = L.marker([gruppo.lat, gruppo.lng], { icon: flottaIcon, zIndexOffset: 1000 });

            let navBarHtml = '';
            if (gruppo.mezzi.length > 1) {
                navBarHtml = `
                    <div class="flex justify-between items-center bg-gray-100 p-1 rounded my-2 text-xs font-bold text-gray-700">
                        <button type="button" class="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-200 font-bold" onclick="scorriPopupFlotta(event, '${idGruppo}', -1)">←</button>
                        <span id="counter-flotta-${idGruppo}">1 di ${gruppo.mezzi.length}</span>
                        <button type="button" class="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-200 font-bold" onclick="scorriPopupFlotta(event, '${idGruppo}', 1)">→</button>
                    </div>
                `;
            }

            const containerHtml = `
                <div class="p-1 min-w-[160px] select-none">
                    <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5" id="tipo-flotta-${idGruppo}">Macchina Agricola</div>
                    <div class="font-black text-sm text-gray-900 border-b pb-1 mb-1" id="nome-flotta-${idGruppo}">Caricamento...</div>
                    <div class="text-xs font-bold ${gruppo.tipo === 'sede' ? 'text-orange-600' : 'text-purple-700'}">${gruppo.tipo === 'sede' ? 'In Sede (Piazzale)' : 'In Campo (A Lavoro)'}</div>
                    ${gruppo.tipo === 'campo' ? `<div class="text-xs text-gray-500 mt-1">Lavorazione: <span class="font-bold text-gray-800">${gruppo.lavorazione}</span></div>` : ''}
                    ${navBarHtml}
                </div>
            `;

            marker.bindPopup(containerHtml);

            marker.on('popupopen', function() {
                aggiornaDatiPopupFlotta(idGruppo, window.indiciPopupFlotta[idGruppo] || 0);
            });

            window.markerGroupMezzi.addLayer(marker);
        });
    }

    // --- FUNZIONI DI SCORRIMENTO POPUP FLOTTA ---
    window.scorriPopupFlotta = function(evento, idGruppo, direzione) {
        if (evento) {
            evento.stopPropagation();
            evento.preventDefault();
        }
        const gruppo = window.flottaRaggruppata[idGruppo];
        if (!gruppo || gruppo.mezzi.length <= 1) return;

        let curIndex = window.indiciPopupFlotta[idGruppo] || 0;
        curIndex += direzione;

        if (curIndex < 0) curIndex = gruppo.mezzi.length - 1;
        if (curIndex >= gruppo.mezzi.length) curIndex = 0;

        window.indiciPopupFlotta[idGruppo] = curIndex;
        aggiornaDatiPopupFlotta(idGruppo, curIndex);
    };

    function aggiornaDatiPopupFlotta(idGruppo, indice) {
        const gruppo = window.flottaRaggruppata[idGruppo];
        if (!gruppo || !gruppo.mezzi[indice]) return;

        const mezzo = gruppo.mezzi[indice];

        const tTipo = document.getElementById(`tipo-flotta-${idGruppo}`);
        const tNome = document.getElementById(`nome-flotta-${idGruppo}`);
        const tCounter = document.getElementById(`counter-flotta-${idGruppo}`);

        if (tTipo) tTipo.textContent = mezzo.tipo || 'Macchina Agricola';
        if (tNome) tNome.textContent = mezzo.nome;
        if (tCounter) tCounter.textContent = `${indice + 1} di ${gruppo.mezzi.length}`;
    }

    // --- FUNZIONI DI SUPPORTO PER IL POPUP RICHIESTE ---
    window.sccorriPopupDati = function(evento, idCampo, direzione) {
        if (evento) {
            evento.stopPropagation();
            evento.preventDefault();
        }
        const lista = window.richiesteRaggruppateCampi[idCampo];
        if (!lista || lista.length <= 1) return;

        let curIndex = window.indiciPopupCampi[idCampo] || 0;
        curIndex += direzione;

        if (curIndex < 0) curIndex = lista.length - 1;
        if (curIndex >= lista.length) curIndex = 0;

        window.indiciPopupCampi[idCampo] = curIndex;
        aggiornaDatiContenutoPopup(idCampo, curIndex);
    };

    function aggiornaDatiContenutoPopup(idCampo, indice) {
        const lista = window.richiesteRaggruppateCampi[idCampo];
        if (!lista || !lista[indice]) return;

        const richiesta = lista[indice];
        const isPianificabile = verificaDisponibilitaRisorse(richiesta.tipoLavoro, richiesta.dataPianificata);

        const tTitolo = document.getElementById(`titolo-pop-${idCampo}`);
        const tInfo = document.getElementById(`info-pop-${idCampo}`);
        const tData = document.getElementById(`data-pop-${idCampo}`);
        const tCounter = document.getElementById(`counter-pop-${idCampo}`);
        const cBottone = document.getElementById(`btn-container-pop-${idCampo}`);

        if (tTitolo) {
            tTitolo.textContent = `🚜 ${richiesta.tipoLavoro}`;
            tTitolo.className = `font-bold text-sm ${isPianificabile ? 'text-blue-800' : 'text-gray-600'}`;
        }
        if (tInfo) tInfo.textContent = `${richiesta.nomeCampo} (${richiesta.superficie} Ha)`;
        if (tData) tData.textContent = formattaDataInversa(richiesta.dataPianificata);
        if (tCounter) tCounter.textContent = `${indice + 1} di ${lista.length}`;

        if (cBottone) {
            cBottone.innerHTML = isPianificabile
                ? `<button type="button" onclick="accettaRichiestaInPagina('${richiesta.id}')" class="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-2 rounded text-xs cursor-pointer shadow-sm">Accetta Lavoro</button>`
                : `<div class="w-full mt-2 bg-gray-100 text-gray-500 text-center font-bold py-1 px-2 rounded text-xs border border-gray-200">Non Pianificabile</div>`;
        }
    }

    function verificaDisponibilitaRisorse(tipoLavoro, dataRichiesta) {
        const mezzi = window.leggiDatabase ? window.leggiDatabase('mezzi') : [];
        const operatori = window.leggiDatabase ? window.leggiDatabase('operatori') : [];
        const cantieri = window.leggiDatabase ? window.leggiDatabase('cantieri') : [];

        if (mezzi.length === 0 || operatori.length === 0) return false;

        const lavoro = tipoLavoro.toLowerCase().trim();

        let mezziIdonei = mezzi.filter(m => {
            const nome = (m.nome || "").toLowerCase();
            const tipo = (m.tipo || "").toLowerCase();
            if (lavoro.includes("aratura")) return nome.includes("trattore") || tipo.includes("trattore") || nome.includes("aratro");
            if (lavoro.includes("semina")) return nome.includes("seminatrice") || nome.includes("trattore") || tipo.includes("trattore");
            if (lavoro.includes("trinciatura")) return nome.includes("trincia") || nome.includes("jaguar") || tipo.includes("trinciatrice");
            if (lavoro.includes("fienagione")) return nome.includes("rotopressa") || nome.includes("fienagione") || nome.includes("falciatrice");
            return true;
        });

        if (mezziIdonei.length === 0) mezziIdonei = mezzi;

        let operatoriIdonei = operatori.filter(op => {
            if (window.calcolaStatoScadenza) {
                if (window.calcolaStatoScadenza(op.scadVisita).eInAllarme) return false;
                if (window.calcolaStatoScadenza(op.scadAttestato).eInAllarme) return false;
            }
            return true;
        });

        if (operatoriIdonei.length === 0) return false;

        const cantieriDiQuelGiorno = cantieri.filter(c => c.data === dataRichiesta);
        const idMezziOccupati = cantieriDiQuelGiorno.map(c => c.idMezzo);
        const idOperatoriOccupati = cantieriDiQuelGiorno.map(c => c.idOperatore);

        const mezziLiberi = mezziIdonei.filter(m => !idMezziOccupati.includes(m.id));
        const operatoriLiberi = operatoriIdonei.filter(op => !idOperatoriOccupati.includes(op.id));

        return (mezziLiberi.length > 0 && operatoriLiberi.length > 0);
    }

    // ACCETTAZIONE COMMESSA - MATCH RIGOROSO E PULITO SULLA PARTITA IVA
    window.accettaRichiestaInPagina = function(idRichiesta) {
        if (confirm("Vuoi prendere in carico questa commessa dal portale?")) {
            let tutteLeRichieste = JSON.parse(localStorage.getItem('databaseRichiesteLavoro')) || [];
            let indice = tutteLeRichieste.findIndex(r => String(r.id) === String(idRichiesta));

            if (indice !== -1) {
                const richiesta = tutteLeRichieste[indice];

                // 1. CACCIA AI DATI DEL PROFILO AGRICOLTORE
                let daticompilati = {};
                let anagraficheAziende = JSON.parse(localStorage.getItem('databaseAnagraficheAziende')) || {};

                if (anagraficheAziende[richiesta.utenteEmail]) {
                    daticompilati = anagraficheAziende[richiesta.utenteEmail];
                } else {
                    const utenti = JSON.parse(localStorage.getItem('databaseUtenti')) || [];
                    const profili = JSON.parse(localStorage.getItem('databaseProfili')) || [];
                    let trovato = profili.find(p => p.email === richiesta.utenteEmail) || utenti.find(u => u.email === richiesta.utenteEmail);
                    if (trovato) daticompilati = trovato;
                }

                // Estraiamo i dati puliti
                const pIvaAgricoltore = (daticompilati.partitaIva || daticompilati.piva || "").trim();
                const nomeRagioneSociale = daticompilati.ragioneSociale || daticompilati.nome || richiesta.utenteEmail.split('@')[0].toUpperCase();

                let clientiDb = window.leggiDatabase ? window.leggiDatabase('clienti') : (JSON.parse(localStorage.getItem('clienti')) || []);
                let clienteTrovato = null;

                // 2. MATCH ASSOLUTO: CONTROLLO SU ENTRAMBI I FORMATI DI CHIAVE (piva / partitaIva)
                if (pIvaAgricoltore !== "") {
                    clienteTrovato = clientiDb.find(c => {
                        const pivaCliente = (c.piva || c.partitaIva || "").trim();
                        return pivaCliente !== "" && pivaCliente === pIvaAgricoltore;
                    });
                }

                let idClienteValido;
                if (clienteTrovato) {
                    // CLIENTE ESISTENTE: Usiamo lo stesso ID senza duplicarlo!
                    idClienteValido = clienteTrovato.id;
                } else {
                    // CLIENTE NUOVO: Usiamo lo standard del gestionale (generaID)
                    idClienteValido = window.leggiDatabase ? window.generaID('CLI', clientiDb) : 'CLI-' + Date.now();

                    clientiDb.push({
                        id: idClienteValido,
                        nome: nomeRagioneSociale,
                        piva: pIvaAgricoltore, // Standardizzato con le anagrafiche
                        referente: nomeRagioneSociale,
                        telefono: daticompilati.telefono || daticompilati.cellulare || '',
                        indirizzo: daticompilati.indirizzo || '',
                        gps: '',
                        coltura: 'Seminativi'
                    });

                    if (typeof window.salvaDatabase === 'function') {
                        window.salvaDatabase('clienti', clientiDb);
                    } else {
                        localStorage.setItem('clienti', JSON.stringify(clientiDb));
                    }
                }

                // 3. Aggiornamento stato richiesta nel portale
                tutteLeRichieste[indice].stato = "IN CORSO";
                localStorage.setItem('databaseRichiesteLavoro', JSON.stringify(tutteLeRichieste));

                // 4. Recupero GPS del campo
                const tuttiICampi = JSON.parse(localStorage.getItem('databaseCampi')) || [];
                const campoAssociato = tuttiICampi.find(c => String(c.id) === String(richiesta.idCampo));
                const gpsCoordinate = (campoAssociato && campoAssociato.lat && campoAssociato.lng)
                                      ? `${campoAssociato.lat}, ${campoAssociato.lng}`
                                      : '';

                // 5. Creazione Commessa con generazione ID conforme al resto dell'app
                let commesseDb = window.leggiDatabase ? window.leggiDatabase('commesse') : (JSON.parse(localStorage.getItem('commesse')) || []);
                let idCommessaValido = window.leggiDatabase ? window.generaID('COM', commesseDb) : 'COM-' + Date.now();

                let ettariPuliti = parseFloat(String(richiesta.superficie).replace(',', '.')) || 0;

                commesseDb.push({
                    id: idCommessaValido,
                    idRichiesta: richiesta.id,
                    idCliente: idClienteValido,
                    lavorazione: richiesta.tipoLavoro,
                    ettari: ettariPuliti,
                    dataInizio: richiesta.dataPianificata,
                    dataFine: richiesta.dataPianificata,
                    gps: gpsCoordinate,
                    stato: "Da Pianificare",
                    note: richiesta.note ? `Nota: ${richiesta.note}` : ''
                });

                if (typeof window.salvaDatabase === 'function') {
                    window.salvaDatabase('commesse', commesseDb);
                } else {
                    localStorage.setItem('commesse', JSON.stringify(commesseDb));
                }

                alert(`Lavoro preso in carico con successo! Trasferito in Commesse.`);
                window.location.reload();
            }
        }
    };

    function formattaDataInversa(stringaData) {
        if(!stringaData) return "";
        const p = stringaData.split('-');
        if(p.length !== 3) return stringaData;
        return `${p[2]}/${p[1]}/${p[0]}`;
    }

    caricaRichiesteMappa();
});