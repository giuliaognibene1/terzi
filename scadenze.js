document.addEventListener("DOMContentLoaded", function() {
    if (!document.getElementById('lista-scad-mezzi')) return;

    const tabScadMezzi = document.getElementById('tab-scad-mezzi');
    const tabScadOperatori = document.getElementById('tab-scad-operatori');
    const subScadMezzi = document.getElementById('sub-scad-mezzi');
    const subScadOperatori = document.getElementById('sub-scad-operatori');

    function cambiaSchedaScadenze(scelta) {
        if (scelta === 'mezzi') {
            if(subScadMezzi) subScadMezzi.style.display = 'block';
            if(subScadOperatori) subScadOperatori.style.display = 'none';
            if(tabScadMezzi) tabScadMezzi.className = "px-5 py-2 rounded-lg font-bold text-sm bg-emerald-800 text-white shadow transition cursor-pointer";
            if(tabScadOperatori) tabScadOperatori.className = "px-5 py-2 rounded-lg font-bold text-sm bg-white text-gray-600 border border-gray-200 cursor-pointer";
        } else {
            if(subScadMezzi) subScadMezzi.style.display = 'none';
            if(subScadOperatori) subScadOperatori.style.display = 'block';
            if(tabScadOperatori) tabScadOperatori.className = "px-5 py-2 rounded-lg font-bold text-sm bg-emerald-800 text-white shadow transition cursor-pointer";
            if(tabScadMezzi) tabScadMezzi.className = "px-5 py-2 rounded-lg font-bold text-sm bg-white text-gray-600 border border-gray-200 cursor-pointer";
        }
    }

    let filtroSpecialeAttivo = sessionStorage.getItem('filtroSpecialeScadenze');
    if (filtroSpecialeAttivo) {
        cambiaSchedaScadenze(filtroSpecialeAttivo);
        sessionStorage.removeItem('filtroSpecialeScadenze');
    }

    tabScadMezzi?.addEventListener('click', () => cambiaSchedaScadenze('mezzi'));
    tabScadOperatori?.addEventListener('click', () => cambiaSchedaScadenze('operatori'));

    window.aggiornaTabellaScadenze = function() {
        const corpoScadMezzi = document.getElementById('lista-scad-mezzi');
        const corpoScadOperatori = document.getElementById('lista-scad-operatori');
        const termMezzi = document.getElementById('cerca-scad-mezzi')?.value.toLowerCase() || '';
        const termOperatori = document.getElementById('cerca-scad-operatori')?.value.toLowerCase() || '';

        if (corpoScadMezzi) {
            corpoScadMezzi.innerHTML = '';
            window.leggiDatabase('mezzi').forEach(mezzo => {
                if (!mezzo.nome.toLowerCase().includes(termMezzi) && !mezzo.targa.toLowerCase().includes(termMezzi)) return;
                const stAss = window.calcolaStatoScadenza(mezzo.scadenzaAss);
                const stRev = window.calcolaStatoScadenza(mezzo.scadenzaRev);

                if (stAss.eInAllarme) corpoScadMezzi.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 font-mono text-xs text-gray-500">${mezzo.id}</td><td class="p-4 font-semibold text-gray-900">${mezzo.nome}</td><td class="p-4 text-gray-600">${mezzo.targa}</td><td class="p-4 font-bold text-gray-800">Assicurazione</td><td class="p-4 text-gray-600">${mezzo.scadenzaAss}</td><td class="p-4"><span class="px-2.5 py-1 text-xs rounded-full ${stAss.badge}">${stAss.testo}</span></td></tr>`;
                if (stRev.eInAllarme) corpoScadMezzi.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 font-mono text-xs text-gray-500">${mezzo.id}</td><td class="p-4 font-semibold text-gray-900">${mezzo.nome}</td><td class="p-4 text-gray-600">${mezzo.targa}</td><td class="p-4 font-bold text-gray-800">Revisione/Tagliando</td><td class="p-4 text-gray-600">${mezzo.scadenzaRev}</td><td class="p-4"><span class="px-2.5 py-1 text-xs rounded-full ${stRev.badge}">${stRev.testo}</span></td></tr>`;
            });
        }

        if (corpoScadOperatori) {
            corpoScadOperatori.innerHTML = '';
            window.leggiDatabase('operatori').forEach(op => {
                if (!op.nome.toLowerCase().includes(termOperatori)) return;
                const stVisita = window.calcolaStatoScadenza(op.scadVisita);
                const stAtt = window.calcolaStatoScadenza(op.scadAttestato);

                if (stVisita.eInAllarme) corpoScadOperatori.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 font-mono text-xs text-gray-500">${op.id}</td><td class="p-4 font-semibold text-gray-900">${op.nome}</td><td class="p-4 text-gray-600">${op.telefono}</td><td class="p-4 font-bold text-blue-950">Visita Medica</td><td class="p-4 text-gray-600">${op.scadVisita}</td><td class="p-4"><span class="px-2.5 py-1 text-xs rounded-full ${stVisita.badge}">${stVisita.testo}</span></td></tr>`;
                if (stAtt.eInAllarme) corpoScadOperatori.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 font-mono text-xs text-gray-500">${op.id}</td><td class="p-4 font-semibold text-gray-900">${op.nome}</td><td class="p-4 text-gray-600">${op.telefono}</td><td class="p-4 font-bold text-blue-950">Sicurezza For.</td><td class="p-4 text-gray-600">${op.scadAttestato}</td><td class="p-4"><span class="px-2.5 py-1 text-xs rounded-full ${stAtt.badge}">${stAtt.testo}</span></td></tr>`;

                if (op.patentini && Array.isArray(op.patentini)) {
                    op.patentini.forEach(p => {
                        const stPat = window.calcolaStatoScadenza(p.scadenza);
                        if (stPat.eInAllarme) corpoScadOperatori.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-4 font-mono text-xs text-gray-500">${op.id}</td><td class="p-4 font-semibold text-gray-900">${op.nome}</td><td class="p-4 text-gray-600">${op.telefono}</td><td class="p-4 font-bold text-purple-950">${p.nome}</td><td class="p-4 text-gray-600">${p.scadenza}</td><td class="p-4"><span class="px-2.5 py-1 text-xs rounded-full ${stPat.badge}">${stPat.testo}</span></td></tr>`;
                    });
                }
            });
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    document.getElementById('cerca-scad-mezzi')?.addEventListener('input', window.aggiornaTabellaScadenze);
    document.getElementById('cerca-scad-operatori')?.addEventListener('input', window.aggiornaTabellaScadenze);

    window.aggiornaTabellaScadenze();
});