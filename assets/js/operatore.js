// assets/js/operatore.js
document.addEventListener("DOMContentLoaded", function() {

    // 1. VERIFICA AUTENTICAZIONE OPERATORE
    const opId = localStorage.getItem('aeromech_operatore_id');
    const opNome = localStorage.getItem('aeromech_operatore_nome');

    if (!opId) {
        window.location.href = 'login.html';
        return;
    }

    const elemNome = document.getElementById('nome-operatore');
    if (elemNome) elemNome.textContent = opNome || 'Operatore';

    // 2. GESTIONE SCAMBIO SCHEDE (TABS A 3 VIE)
    const tabOggi = document.getElementById('tab-oggi');
    const tabFuturi = document.getElementById('tab-futuri');
    const tabPassati = document.getElementById('tab-passati');
    const sezOggi = document.getElementById('sezione-oggi');
    const sezFuturi = document.getElementById('sezione-futuri');
    const sezPassati = document.getElementById('sezione-passati');

    function resetTabs() {
        [tabOggi, tabFuturi, tabPassati].forEach(t => t.className = "flex-1 text-center py-3.5 font-bold text-xs border-b-2 border-transparent text-gray-500 hover:text-gray-700 outline-none cursor-pointer flex items-center justify-center space-x-1");
        [sezOggi, sezFuturi, sezPassati].forEach(s => { if(s) s.style.display = 'none'; });
    }

    tabOggi?.addEventListener('click', () => {
        resetTabs();
        tabOggi.className = "flex-1 text-center py-3.5 font-bold text-xs border-b-2 border-emerald-800 text-emerald-800 outline-none cursor-pointer flex items-center justify-center space-x-1";
        if (sezOggi) sezOggi.style.display = 'block';
    });

    tabFuturi?.addEventListener('click', () => {
        resetTabs();
        tabFuturi.className = "flex-1 text-center py-3.5 font-bold text-xs border-b-2 border-emerald-800 text-emerald-800 outline-none cursor-pointer flex items-center justify-center space-x-1";
        if (sezFuturi) sezFuturi.style.display = 'block';
    });

    tabPassati?.addEventListener('click', () => {
        resetTabs();
        tabPassati.className = "flex-1 text-center py-3.5 font-bold text-xs border-b-2 border-emerald-800 text-emerald-800 outline-none cursor-pointer flex items-center justify-center space-x-1";
        if (sezPassati) sezPassati.style.display = 'block';
    });

    // 3. LETTURA DATABASE UNIVERSALE
    window.dbInfoMap = {};
    function leggiDb(tabella) {
        if (typeof window.leggiDatabase === 'function') {
            const res = window.leggiDatabase(tabella);
            if (res && Array.isArray(res) && res.length > 0) return res;
        }
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            let raw = localStorage.getItem(key);
            try {
                if (raw && raw.startsWith('[')) {
                    if (key === tabella || key.toLowerCase().includes(tabella.toLowerCase())) {
                        window.dbInfoMap[tabella] = { key: key, type: 'array' };
                        return JSON.parse(raw);
                    }
                }
            } catch(e) {}
        }
        window.dbInfoMap[tabella] = { key: tabella, type: 'array' };
        return [];
    }

    function salvaDb(tabella, dati) {
        if (typeof window.salvaDatabase === 'function') {
            window.salvaDatabase(tabella, dati);
            return;
        }
        if (!window.dbInfoMap[tabella]) leggiDb(tabella);
        localStorage.setItem(window.dbInfoMap[tabella].key, JSON.stringify(dati));
    }

    // 4. CARICAMENTO DATI
    window.caricaLavoriOggi = function() {
        if (!sezOggi || !sezFuturi || !sezPassati) return;

        const cantieri = leggiDb('cantieri');
        const commesse = leggiDb('commesse');
        const clienti = leggiDb('clienti');
        const mezzi = leggiDb('mezzi');

        const richiesteDb = leggiDb('RichiesteLavoro').length > 0 ? leggiDb('RichiesteLavoro') : (JSON.parse(localStorage.getItem('databaseRichiesteLavoro')) || []);
        const campiTerreni = leggiDb('Campi').length > 0 ? leggiDb('Campi') : (JSON.parse(localStorage.getItem('databaseCampi')) || []);

        const oggi = new Date();
        const oggiIso = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`;
        const opIdClean = String(opId).trim().toLowerCase();

        let tuttiMieiCantieri = cantieri.filter(c => String(c.idOperatore || '').trim().toLowerCase() === opIdClean);

        let cantieriOggi = tuttiMieiCantieri.filter(c => c.data === oggiIso && c.statoOperativo !== 'Completato');
        let cantieriFuturi = tuttiMieiCantieri.filter(c => c.data > oggiIso);
        let cantieriPassati = tuttiMieiCantieri.filter(c => c.statoOperativo === 'Completato' || c.data < oggiIso);

        cantieriOggi.sort((a, b) => (a.oraInizio || '').localeCompare(b.oraInizio || ''));
        cantieriFuturi.sort((a, b) => (a.data || '').localeCompare(b.data || '') || (a.oraInizio || '').localeCompare(b.oraInizio || ''));
        cantieriPassati.sort((a, b) => (b.data || '').localeCompare(a.data || ''));

        // RENDERING CANTIERI DI OGGI
        sezOggi.innerHTML = '';
        if (cantieriOggi.length === 0) {
            sezOggi.innerHTML = `
                <div class="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200 mt-4">
                    <div class="bg-emerald-50 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><i data-lucide="coffee" class="w-8 h-8"></i></div>
                    <h2 class="font-black text-gray-800 text-xl">Nessun Lavoro Attivo</h2>
                    <p class="text-sm text-gray-500 mt-1">Tutti i cantieri odierni sono stati completati o non pianificati.</p>
                </div>`;
        } else {
            cantieriOggi.forEach(cant => {
                const com = commesse.find(c => String(c.id) === String(cant.idCommessa)) || {};
                const cli = clienti.find(c => String(c.id) === String(com.idCliente)) || {};
                const mez = mezzi.find(m => String(m.id) === String(cant.idMezzo)) || {};

                // Ricerca del terreno originale e della richiesta
                let idCampoTarget = com.idCampo;
                let richiestaOriginale = null;
                if (com.idRichiesta) {
                    richiestaOriginale = richiesteDb.find(r => String(r.id) === String(com.idRichiesta));
                    if (richiestaOriginale && !idCampoTarget) idCampoTarget = richiestaOriginale.idCampo;
                }
                const terreno = campiTerreni.find(t => String(t.id) === String(idCampoTarget));

                // ESTREZIONE DEI DATI AGGIUNTIVI (Telefono, Nome Campo, Coltura, Note)
                const telReferente = cli.cellulare || cli.telefono || '';
                const nomeCampo = terreno ? terreno.nome : (richiestaOriginale ? richiestaOriginale.nomeCampo : 'Campo Sconosciuto');
                const colturaTarget = terreno && terreno.coltura ? terreno.coltura : 'Da Verificare';

                // Uniamo eventuali note scritte dal cliente nella richiesta con quelle scritte dall'ufficio nella commessa
                let noteUfficio = com.note || '';
                let noteCliente = richiestaOriginale && richiestaOriginale.note ? `Nota Cliente: ${richiestaOriginale.note}` : '';
                let noteComplete = [noteUfficio, noteCliente].filter(n => n.trim() !== '').join(' | ');

                const statoAvanzamento = cant.statoOperativo || 'Da Iniziare';
                let badgeStato = '', bottoniAzione = '';

                switch (statoAvanzamento) {
                    case 'Da Iniziare':
                        badgeStato = '<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">In Attesa</span>';
                        bottoniAzione = `<button onclick="cambiaStato('${cant.id}', 'In Trasferimento (Andata)')" class="w-full bg-blue-600 active:bg-blue-700 text-white font-black py-4 rounded-xl shadow text-base flex justify-center items-center space-x-2 transition cursor-pointer"><i data-lucide="truck" class="w-5 h-5"></i><span>Inizia Trasferimento</span></button>`;
                        break;
                    case 'In Trasferimento (Andata)':
                        badgeStato = '<span class="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide animate-pulse">In Viaggio (Andata)</span>';
                        bottoniAzione = `<button onclick="cambiaStato('${cant.id}', 'Arrivato sul Campo')" class="w-full bg-amber-500 active:bg-amber-600 text-white font-black py-4 rounded-xl shadow text-base flex justify-center items-center space-x-2 transition cursor-pointer"><i data-lucide="map-pin" class="w-5 h-5"></i><span>Arrivato sul Campo</span></button>`;
                        break;
                    case 'Arrivato sul Campo':
                        badgeStato = '<span class="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">In Posizione</span>';
                        bottoniAzione = `<button onclick="cambiaStato('${cant.id}', 'In Corso')" class="w-full bg-emerald-600 active:bg-emerald-700 text-white font-black py-4 rounded-xl shadow text-base flex justify-center items-center space-x-2 transition cursor-pointer"><i data-lucide="play" class="w-5 h-5"></i><span>Inizia Lavoro</span></button>`;
                        break;
                    case 'In Corso':
                        badgeStato = '<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide animate-pulse">Lavoro in Corso</span>';
                        bottoniAzione = `
                            <div class="flex space-x-2">
                                <button onclick="cambiaStato('${cant.id}', 'In Pausa')" class="w-1/3 bg-gray-200 active:bg-gray-300 text-gray-700 font-black py-4 rounded-xl shadow text-sm flex flex-col justify-center items-center transition cursor-pointer"><i data-lucide="pause" class="w-5 h-5 mb-1"></i><span>Pausa</span></button>
                                <button onclick="cambiaStato('${cant.id}', 'Lavoro Terminato')" class="w-2/3 bg-red-600 active:bg-red-700 text-white font-black py-4 rounded-xl shadow text-sm flex flex-col justify-center items-center transition cursor-pointer"><i data-lucide="square" class="w-5 h-5 mb-1"></i><span>Termina Lavoro</span></button>
                            </div>`;
                        break;
                    case 'In Pausa':
                        badgeStato = '<span class="bg-gray-200 text-gray-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">In Pausa</span>';
                        bottoniAzione = `<button onclick="cambiaStato('${cant.id}', 'In Corso')" class="w-full bg-emerald-500 active:bg-emerald-600 text-white font-black py-4 rounded-xl shadow text-base flex justify-center items-center space-x-2 transition cursor-pointer"><i data-lucide="play" class="w-5 h-5"></i><span>Riprendi Lavoro</span></button>`;
                        break;
                    case 'Lavoro Terminato':
                        badgeStato = '<span class="bg-purple-100 text-purple-700 border border-purple-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">Campo Terminato</span>';
                        bottoniAzione = `<button onclick="cambiaStato('${cant.id}', 'In Trasferimento (Rientro)')" class="w-full bg-purple-600 active:bg-purple-700 text-white font-black py-4 rounded-xl shadow text-base flex justify-center items-center space-x-2 transition cursor-pointer"><i data-lucide="arrow-right-left" class="w-5 h-5"></i><span>Inizia Rientro / Spostamento</span></button>`;
                        break;
                    case 'In Trasferimento (Rientro)':
                        badgeStato = '<span class="bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide animate-pulse">In Viaggio (Rientro)</span>';
                        bottoniAzione = `<button onclick="apriChiusura('${cant.id}')" class="w-full bg-emerald-700 active:bg-emerald-800 text-white font-black py-4 rounded-xl shadow text-base flex justify-center items-center space-x-2 transition cursor-pointer"><i data-lucide="flag" class="w-5 h-5"></i><span>Arrivato (Chiudi Turno)</span></button>`;
                        break;
                }

                let urlMaps = com.gps ? `http://googleusercontent.com/maps.google.com/maps?q=${encodeURIComponent(com.gps.trim())}` : '#';

                sezOggi.innerHTML += `
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-4">
                        <div class="p-5 border-b border-gray-100 bg-gray-50/50">
                            <div class="flex justify-between items-start mb-3">
                                <div>
                                    ${badgeStato}
                                    <h3 class="font-black text-gray-900 text-xl mt-2 leading-tight">${cli.nome || 'Cliente N/D'}</h3>
                                    ${telReferente ? `<a href="tel:${telReferente}" class="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold mt-1.5 active:bg-emerald-100 transition"><i data-lucide="phone" class="w-3 h-3"></i><span>${telReferente}</span></a>` : '<span class="block text-xs text-gray-400 mt-1 italic">Nessun recapito</span>'}
                                </div>
                                <div class="text-right bg-white p-2 rounded-lg border border-gray-100 shadow-sm min-w-[70px]">
                                    <span class="block text-[10px] font-bold text-gray-400 uppercase">Orario</span>
                                    <span class="block font-black text-emerald-800 text-lg">${cant.oraInizio || '--:--'}</span>
                                    <span class="block text-[11px] font-bold text-gray-500 border-t border-gray-100 mt-1 pt-0.5">${cant.oraFine || '--:--'}</span>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-2 mt-2">
                                <div class="bg-white p-2 rounded-lg border border-gray-100">
                                    <span class="block text-[10px] uppercase font-bold text-gray-400">Lavorazione</span>
                                    <span class="block font-bold text-gray-800 text-sm mt-0.5 truncate">${com.lavorazione || 'N/D'}</span>
                                </div>
                                <div class="bg-white p-2 rounded-lg border border-gray-100">
                                    <span class="block text-[10px] uppercase font-bold text-gray-400">Superficie</span>
                                    <span class="block font-bold text-gray-800 text-sm mt-0.5">${com.ettari || 0} Ha</span>
                                </div>
                            </div>
                        </div>

                        <div class="px-5 pt-4">
                            <div class="flex justify-between items-end mb-2">
                                <div>
                                    <span class="block text-[10px] text-gray-400 font-bold uppercase mb-0.5">Destinazione Campo</span>
                                    <span class="font-bold text-gray-900 text-sm">📍 ${nomeCampo}</span>
                                </div>
                                <div class="text-right">
                                    <span class="block text-[10px] text-gray-400 font-bold uppercase mb-0.5">Coltura</span>
                                    <span class="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-xs">${colturaTarget}</span>
                                </div>
                            </div>
                            <div id="cantiere-mappa-${cant.id}" class="w-full h-40 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 relative z-10 shadow-inner"></div>
                        </div>

                        <div class="p-5 space-y-3">
                            ${noteComplete ? `
                            <div class="bg-yellow-50 border border-yellow-200 p-3 rounded-xl">
                                <div class="flex items-center space-x-1.5 mb-1 text-yellow-800">
                                    <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                                    <span class="text-xs font-black uppercase tracking-wider">Note e Indicazioni</span>
                                </div>
                                <p class="text-sm font-medium text-yellow-900 leading-tight">${noteComplete}</p>
                            </div>` : ''}

                            <div class="flex items-center space-x-3 text-sm font-bold text-gray-800 bg-gray-50 border border-gray-200 p-3 rounded-xl">
                                <div class="bg-gray-800 p-2 rounded-lg text-white"><i data-lucide="tractor" class="w-5 h-5"></i></div>
                                <div><span class="block text-[10px] text-gray-500 uppercase font-black">Flotta Assegnata</span><span>${mez.nome || 'N/D'}</span></div>
                            </div>
                            ${com.gps ? `<a href="${urlMaps}" target="_blank" class="flex items-center justify-center space-x-3 text-sm font-black text-blue-700 bg-blue-50 border border-blue-200 p-3.5 rounded-xl w-full active:bg-blue-100 transition shadow-sm cursor-pointer"><i data-lucide="navigation" class="w-5 h-5"></i><span>Avvia Navigatore GPS</span></a>` : ''}
                        </div>
                        <div class="p-4 border-t border-gray-100 bg-white">${bottoniAzione}</div>
                    </div>`;

                // --- RENDERING LEAFLET CON RESET SICURO DELLA MAPPA ---
                setTimeout(() => {
                    const mapId = `cantiere-mappa-${cant.id}`;
                    const mapEl = document.getElementById(mapId);

                    if (mapEl) {
                        if (window['leafletMap_' + cant.id]) {
                            window['leafletMap_' + cant.id].remove();
                            window['leafletMap_' + cant.id] = null;
                        }

                        if (terreno && terreno.poligono) {
                            try {
                                const nodiConfine = JSON.parse(terreno.poligono);
                                if (Array.isArray(nodiConfine) && nodiConfine.length >= 3) {
                                    const mObj = L.map(mapId, { zoomControl: false, attributionControl: false });
                                    window['leafletMap_' + cant.id] = mObj;

                                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mObj);

                                    const layerForma = L.polygon(nodiConfine, {
                                        color: '#047857',
                                        fillColor: '#10b981',
                                        fillOpacity: 0.5,
                                        weight: 2
                                    }).addTo(mObj);

                                    mObj.fitBounds(layerForma.getBounds(), { padding: [15, 15] });
                                }
                            } catch(e) { console.error("Errore nel disegno del poligono", e); }
                        } else if (com.gps) {
                            const coordinate = com.gps.split(',').map(Number);
                            if(coordinate.length === 2 && !isNaN(coordinate[0]) && !isNaN(coordinate[1])) {
                                const mObj = L.map(mapId, { zoomControl: false, attributionControl: false }).setView(coordinate, 15);
                                window['leafletMap_' + cant.id] = mObj;

                                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mObj);
                                L.marker(coordinate).addTo(mObj);
                            }
                        }
                    }
                }, 100);
            });
        }

        // RENDERING CANTIERI FUTURI
        sezFuturi.innerHTML = '';
        if (cantieriFuturi.length === 0) {
            sezFuturi.innerHTML = `
                <div class="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200 mt-4">
                    <div class="bg-gray-50 text-gray-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><i data-lucide="calendar-x" class="w-8 h-8"></i></div>
                    <h2 class="font-bold text-gray-700 text-base">Nessuna pianificazione futura</h2>
                    <p class="text-xs text-gray-400 mt-1">Non ci sono ancora lavori registrati per i prossimi giorni.</p>
                </div>`;
        } else {
            cantieriFuturi.forEach(cant => {
                const com = commesse.find(c => String(c.id) === String(cant.idCommessa)) || {};
                const cli = clienti.find(c => String(c.id) === String(com.idCliente)) || {};
                const mez = mezzi.find(m => String(m.id) === String(cant.idMezzo)) || {};
                const dataFmt = new Date(cant.data).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });

                sezFuturi.innerHTML += `
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
                        <div class="flex items-center space-x-3 truncate">
                            <div class="bg-emerald-50 text-emerald-800 font-mono font-bold text-xs p-2.5 rounded-lg text-center min-w-[65px] flex-shrink-0 border border-emerald-100">
                                <span class="block uppercase text-[9px] text-emerald-600 font-bold leading-none mb-0.5">${dataFmt.split(' ')[0]}</span>
                                <span class="block text-sm font-black leading-none">${dataFmt.split(' ')[1]}</span>
                            </div>
                            <div class="truncate">
                                <h4 class="font-black text-gray-900 text-sm truncate">${cli.nome || 'Cliente N/D'}</h4>
                                <p class="text-xs text-gray-500 font-medium truncate">${com.lavorazione || 'N/D'}</p>
                                <p class="text-[10px] text-gray-400 font-mono mt-0.5"><span class="font-bold text-orange-600">${mez.nome || 'N/D'}</span> • ${cant.oraInizio}-${cant.oraFine}</p>
                            </div>
                        </div>
                        <div class="bg-gray-100 text-gray-700 font-bold text-xs px-2 py-1 rounded-md flex-shrink-0">${com.ettari || 0} Ha</div>
                    </div>`;
            });
        }

        // RENDERING SCHEDA LAVORI PASSATI / FINITI
        sezPassati.innerHTML = '';
        if (cantieriPassati.length === 0) {
            sezPassati.innerHTML = `
                <div class="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200 mt-4">
                    <div class="bg-gray-50 text-gray-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><i data-lucide="folder-archive" class="w-8 h-8"></i></div>
                    <h2 class="font-bold text-gray-700 text-base">Nessun lavoro completato</h2>
                    <p class="text-xs text-gray-400 mt-1">Non compaiono ancora interventi svolti nel tuo storico.</p>
                </div>`;
        } else {
            cantieriPassati.forEach(cant => {
                const com = commesse.find(c => String(c.id) === String(cant.idCommessa)) || {};
                const cli = clienti.find(c => String(c.id) === String(com.idCliente)) || {};
                const dataFmt = new Date(cant.data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

                sezPassati.innerHTML += `
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-blue-500 space-y-1.5 shadow-sm">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] font-mono font-bold text-gray-400">${dataFmt}</span>
                            <span class="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase">Consuntivato</span>
                        </div>
                        <h4 class="font-bold text-gray-900 text-sm">${cli.nome || 'Cliente N/D'}</h4>
                        <p class="text-xs text-gray-600 font-medium">${com.lavorazione || 'Lavorazione N/D'}</p>
                        <div class="pt-1.5 flex justify-between text-[11px] font-mono border-t border-gray-50 mt-1">
                            <span class="text-gray-500">Superficie: <strong>${com.ettari || 0} Ha</strong></span>
                            <span class="text-blue-800 font-bold">Ore Lavorate: ${cant.oreReali || cant.oreEffettive || 'N/D'} h</span>
                        </div>
                    </div>`;
            });
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    window.cambiaStato = function(idCantiere, nuovoStato) {
        let cantieri = leggiDb('cantieri');
        let idx = cantieri.findIndex(c => String(c.id) === String(idCantiere));
        if (idx !== -1) {
            cantieri[idx].statoOperativo = nuovoStato;
            salvaDb('cantieri', cantieri);
            setTimeout(() => { caricaLavoriOggi(); }, 100);
        }
    };

    window.apriChiusura = function(idCantiere) {
        const modale = document.getElementById('modale-chiusura');
        if (!modale) return;
        document.getElementById('chiudi-id-cantiere').value = idCantiere;

        // Resetta tutti i campi
        document.getElementById('chiudi-ore').value = '';
        document.getElementById('chiudi-note').value = '';
        document.getElementById('chiudi-litri').value = '';
        document.getElementById('chiudi-contaore').value = '';
        document.getElementById('chiudi-km').value = '';

        modale.style.display = 'flex';
    };

    document.getElementById('btn-annulla-chiusura')?.addEventListener('click', () => {
        const modale = document.getElementById('modale-chiusura');
        if (modale) modale.style.display = 'none';
    });

    document.getElementById('btn-salva-chiusura')?.addEventListener('click', () => {
        const idCantiere = document.getElementById('chiudi-id-cantiere').value;
        const oreReali = document.getElementById('chiudi-ore').value;
        const noteReali = document.getElementById('chiudi-note').value;

        // Nuovi dati telemetria
        const litri = document.getElementById('chiudi-litri').value;
        const contaore = document.getElementById('chiudi-contaore').value;
        const km = document.getElementById('chiudi-km').value;

        if (!oreReali) {
            alert("Devi inserire almeno le ore reali lavorate.");
            return;
        }

        let cantieri = leggiDb('cantieri');
        let commesse = leggiDb('commesse');
        let dbRichieste = JSON.parse(localStorage.getItem('databaseRichiesteLavoro')) || [];

        let idxCant = cantieri.findIndex(c => String(c.id) === String(idCantiere));
        if (idxCant !== -1) {
            cantieri[idxCant].statoOperativo = 'Completato';
            cantieri[idxCant].oreReali = oreReali;
            cantieri[idxCant].oreEffettive = oreReali;
            cantieri[idxCant].noteOperatore = noteReali;
            cantieri[idxCant].compilatoDa = 'operatore';

            // Salviamo le nuove metriche nel database del cantiere
            if (litri) cantieri[idxCant].litriGasolio = litri;
            if (contaore) cantieri[idxCant].contaore = contaore;
            if (km) cantieri[idxCant].kmPercorsi = km;

            let idxCom = commesse.findIndex(c => String(c.id) === String(cantieri[idxCant].idCommessa));
            if (idxCom !== -1) {
                commesse[idxCom].stato = 'Completato';
                commesse[idxCom].oreEffettive = oreReali;
                commesse[idxCom].compilatoDa = 'operatore';

                let idRichiesta = commesse[idxCom].idRichiesta;
                if (idRichiesta) {
                    let idxRichiesta = dbRichieste.findIndex(r => String(r.id).trim() === String(idRichiesta).trim());
                    if (idxRichiesta !== -1) {
                        dbRichieste[idxRichiesta].stato = 'COMPLETATO';
                        localStorage.setItem('databaseRichiesteLavoro', JSON.stringify(dbRichieste));
                    }
                }
                salvaDb('commesse', commesse);
            }

            salvaDb('cantieri', cantieri);

            const modale = document.getElementById('modale-chiusura');
            if (modale) modale.style.display = 'none';
            caricaLavoriOggi();
        }
    });

    document.getElementById('btn-logout')?.addEventListener('click', () => {
        if(confirm('Vuoi davvero scollegarti dall\'app?')) {
            localStorage.removeItem('aeromech_operatore_id');
            localStorage.removeItem('aeromech_operatore_nome');
            window.location.href = 'login.html';
        }
    });

    caricaLavoriOggi();
});