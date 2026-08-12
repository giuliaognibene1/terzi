document.addEventListener("DOMContentLoaded", function() {
    if (!document.getElementById('count-cantieri-oggi')) return;

    // --- 1. GESTIONE SCADENZE E ALLERMI (ORIGINALE) ---
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

    // --- 2. CONTATORI COMMESSE E CANTIERI (ORIGINALE) ---
    const commesseDb = window.leggiDatabase('commesse');
    const cantieriDb = window.leggiDatabase('cantieri');

    const cntPian = document.getElementById('count-da-pianificare');
    if (cntPian) cntPian.textContent = commesseDb.filter(c => c.stato === 'Da Pianificare').length;

    const oggi = new Date();
    oggi.setHours(0,0,0,0);
    const oggiIsoLocale = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`;
    const cntOggi = document.getElementById('count-cantieri-oggi');
    if (cntOggi) cntOggi.textContent = cantieriDb.filter(c => c.data === oggiIsoLocale).length;

    // --- 3. AGENDA OPERATIVA (ORIGINALE) ---
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


    // --- 4. NUOVA INTEGRAZIONE: ALGORITMO DI MATCHING INTELLIGENTE ---

    // Variabili globali per la mappa
    let mappaRichieste = null;
    let markerGroup = null;

    // --- 4. CONTEGGIO RICHIESTE INTELLIGENTI PER CARD ---
    function aggiornaRichiesteDaAgricoltori() {
        const tutteLeRichieste = JSON.parse(localStorage.getItem('databaseRichiesteLavoro')) || [];
        const oggiStr = new Date().toLocaleDateString('sv-SE');

        // FILTRO TEMPORALE CORRETTO: Solo in attesa e da oggi in poi
        const richiesteInAttesa = tutteLeRichieste.filter(r => {
            return r.stato === "IN ATTESA" && r.dataPianificata && r.dataPianificata >= oggiStr;
        });

        // FILTRO INTELLIGENTE DI MATCHING
        const richiesteAdAltoMargine = richiesteInAttesa.filter(richiesta => {
            return verificaDisponibilitaRisorse(richiesta.tipoLavoro, richiesta.dataPianificata);
        });

        const contatoreCard = document.getElementById('count-richieste-portale');
        if (contatoreCard) contatoreCard.textContent = richiesteAdAltoMargine.length;
    }

    // MOTORE INTERNO DELL'ALGORITMO: Incrocia Categorie e Agende
    function verificaDisponibilitaRisorse(tipoLavoro, dataRichiesta) {
        const mezzi = window.leggiDatabase('mezzi') || [];
        const operatori = window.leggiDatabase('operatori') || [];
        const cantieri = window.leggiDatabase('cantieri') || [];

        if (mezzi.length === 0 || operatori.length === 0) return false;

        let mezziIdonei = mezzi.filter(m => {
            const tagLavoro = tipoLavoro.toLowerCase();
            const nomeMezzo = m.nome.toLowerCase();
            const tipoMezzo = (m.tipo || "").toLowerCase();

            if (tagLavoro.includes("aratura") || tagLavoro.includes("semina")) return nomeMezzo.includes("trattore") || tipoMezzo.includes("trattore") || nomeMezzo.includes("aratro") || nomeMezzo.includes("seminatrice");
            if (tagLavoro.includes("trinciatura")) return nomeMezzo.includes("trincia") || tipoMezzo.includes("trincia") || nomeMezzo.includes("trattore");
            if (tagLavoro.includes("fienagione")) return nomeMezzo.includes("fresa") || nomeMezzo.includes("trattore") || nomeMezzo.includes("imballatrice") || nomeMezzo.includes("rotopressa");
            return true;
        });

        if (mezziIdonei.length === 0) mezziIdonei = mezzi;

        const operatoriIdonei = operatori.filter(op => {
            if (window.calcolaStatoScadenza) {
                if (window.calcolaStatoScadenza(op.scadVisita).eInAllarme) return false;
                if (window.calcolaStatoScadenza(op.scadAttestato).eInAllarme) return false;
            }
            return true;
        });

        if (operatoriIdonei.length === 0) return false;

        const occupatiInData = cantieri.filter(c => c.data === dataRichiesta);
        const idMezziOccupati = occupatiInData.map(c => c.idMezzo);
        const idOperatoriOccupati = occupatiInData.map(c => c.idOperatore);

        const mezziLiberi = mezziIdonei.filter(m => !idMezziOccupati.includes(m.id));
        const operatoriLiberi = operatoriIdonei.filter(op => !idOperatoriOccupati.includes(op.id));

        return (mezziLiberi.length > 0 && operatoriLiberi.length > 0);
    }

    aggiornaRichiesteDaAgricoltori();

    function formattaDataInversa(stringaData) {
        if(!stringaData) return "";
        const p = stringaData.split('-');
        if(p.length !== 3) return stringaData;
        return `${p[2]}/${p[1]}/${p[0]}`;
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
});

// --- AZIONE GLOBALE: ACCETTAZIONE DALLA DASHBOARD (MATCH P.IVA) ---
window.accettaRichiestaPortale = function(idRichiesta) {
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

            const pIvaAgricoltore = (daticompilati.partitaIva || "").trim();
            const nomeRagioneSociale = daticompilati.ragioneSociale || daticompilati.nome || richiesta.utenteEmail.split('@')[0].toUpperCase();

            let clientiDb = window.leggiDatabase ? window.leggiDatabase('clienti') : (JSON.parse(localStorage.getItem('clienti')) || []);
            let clienteTrovato = null;

            // 2. MATCH ASSOLUTO SU PARTITA IVA
            if (pIvaAgricoltore !== "") {
                clienteTrovato = clientiDb.find(c => c.partitaIva && c.partitaIva.trim() === pIvaAgricoltore);
            }

            let idClienteValido;
            if (clienteTrovato) {
                idClienteValido = clienteTrovato.id;
            } else {
                idClienteValido = Date.now().toString();
                clientiDb.push({
                    id: idClienteValido,
                    nome: nomeRagioneSociale,
                    email: richiesta.utenteEmail,
                    telefono: daticompilati.telefono || '',
                    indirizzo: daticompilati.indirizzo || '',
                    partitaIva: pIvaAgricoltore,
                    note: 'Cliente registrato automaticamente dal Portale (Verificare dati)'
                });
                if (typeof window.salvaDatabase === 'function') window.salvaDatabase('clienti', clientiDb);
                else localStorage.setItem('clienti', JSON.stringify(clientiDb));
            }

            // 3. Aggiornamento stato
            tutteLeRichieste[indice].stato = "IN CORSO";
            localStorage.setItem('databaseRichiesteLavoro', JSON.stringify(tutteLeRichieste));

            // 4. Recupero GPS
            const tuttiICampi = JSON.parse(localStorage.getItem('databaseCampi')) || [];
            const campoAssociato = tuttiICampi.find(c => String(c.id) === String(richiesta.idCampo));
            const gpsCoordinate = (campoAssociato && campoAssociato.lat && campoAssociato.lng)
                                  ? `${campoAssociato.lat}, ${campoAssociato.lng}`
                                  : '';

            // 5. Creazione Commessa con FORZATURA NUMERICA
            let commesseDb = window.leggiDatabase ? window.leggiDatabase('commesse') : (JSON.parse(localStorage.getItem('commesse')) || []);

            // Questa riga magica converte il testo in un numero matematico valido,
            // gestendo anche l'errore se qualcuno ha scritto "5,5" con la virgola
            let ettariPuliti = parseFloat(String(richiesta.superficie).replace(',', '.')) || 0;

            commesseDb.push({
                id: Date.now().toString(),
                idRichiesta: richiesta.id,
                idCliente: idClienteValido,
                lavorazione: richiesta.tipoLavoro + " su " + (richiesta.nomeCampo || ''),
                ettari: ettariPuliti, // <--- ORA E' UN NUMERO PURO MATEMATICO!
                dataInizio: richiesta.dataPianificata,
                dataFine: richiesta.dataPianificata,
                gps: gpsCoordinate,
                stato: "Da Pianificare",
                note: `Superficie: ${richiesta.superficie} Ha.`
            });

            if (typeof window.salvaDatabase === 'function') {
                window.salvaDatabase('commesse', commesseDb);
            } else {
                localStorage.setItem('commesse', JSON.stringify(commesseDb));
            }

            alert("Lavoro accettato e inserito in Commesse!");
            window.location.reload();
        }
    }
};
