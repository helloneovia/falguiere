
        // --- Security / Login (Digicode) ---
        let currentCode = '';

        function pressDigit(digit) {
            if (currentCode.length < 5) {
                currentCode += digit;
                updateDigicodeScreen();
            }
        }

        function clearDigicode() {
            currentCode = '';
            updateDigicodeScreen();
            document.getElementById('digicodeScreen').className = 'digicode-screen';
        }

        function updateDigicodeScreen() {
            const screen = document.getElementById('digicodeScreen');
            screen.textContent = '*'.repeat(currentCode.length);
            screen.className = 'digicode-screen';
        }

        function validateDigicode() {
            const screen = document.getElementById('digicodeScreen');
            if (currentCode === '75015') {
                screen.classList.add('success');
                setTimeout(() => {
                    sessionStorage.setItem('admin_auth', 'true');
                    unlockAdmin();
                }, 500);
            } else {
                screen.classList.add('error');
                setTimeout(() => {
                    clearDigicode();
                }, 600);
            }
        }

        // Support keyboard input
        document.addEventListener('keydown', function(e) {
            if (document.getElementById('loginOverlay').style.display !== 'none') {
                if (e.key >= '0' && e.key <= '9') {
                    pressDigit(e.key);
                } else if (e.key === 'Backspace' || e.key.toLowerCase() === 'c') {
                    clearDigicode();
                } else if (e.key === 'Enter' || e.key.toLowerCase() === 'v') {
                    validateDigicode();
                }
            }
        });

        function toggleAdminMenu() {
            const menu = document.getElementById('adminMenuCollapse');
            menu.classList.toggle('open');
        }

        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.admin-nav a').forEach(el => el.classList.remove('active'));
            document.getElementById('tab-' + tabId).classList.add('active');
            document.getElementById('nav-' + tabId).classList.add('active');
            
            const menu = document.getElementById('adminMenuCollapse');
            if (menu) menu.classList.remove('open');
        }

        function logout() {
            sessionStorage.removeItem('admin_auth');
            location.reload();
        }

        function unlockAdmin() {
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('adminContent').style.display = 'flex';
            initCMS();
            initSettings();
            renderAdhesions();
            renderMessages();
            renderDocuments();
            renderSubscribers();
            renderVolunteers();
            renderAgendaShifts();
            renderNewsletters();
            renderAccounting();
            renderProjects();
        }

        // Check on load
        if (sessionStorage.getItem('admin_auth') === 'true') {
            unlockAdmin();
        }

        // --- Dashboard Data ---
        function formatDate(isoString) {
            const date = new Date(isoString);
            return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' });
        }

        async function renderAdhesions() {
            const tbody = document.getElementById('adhesionsTableBody');
            try {
                const response = await fetch('/api/adhesions');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Aucune adhésion pour le moment.</td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(item => `
                    <tr>
                        <td data-label="Date"><span class="badge-date">${formatDate(item.date)}</span></td>
                        <td data-label="Nom"><strong>${item.name}</strong></td>
                        <td data-label="Contact">
                            <a href="mailto:${item.email}" class="text-accent">${item.email}</a><br>
                            <span style="font-size:0.9em; color:#666;">${item.phone || 'Non renseigné'}</span>
                        </td>
                    </tr>
                `).join(''); // Data from DB is already ordered by date DESC
            } catch (err) {
                console.error(err);
                tbody.innerHTML = '<tr><td colspan="3" class="empty-state" style="color: #ef4444;">Erreur lors du chargement des données.</td></tr>';
            }
        }

        async function renderVolunteers() {
            const tbody = document.getElementById('volunteersTableBody');
            try {
                const response = await fetch('/api/volunteers');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Aucun bénévole inscrit pour le moment.</td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(item => `
                    <tr>
                        <td data-label="Date"><span class="badge-date">${formatDate(item.date)}</span></td>
                        <td data-label="Nom"><strong>${item.name}</strong></td>
                        <td data-label="Contact">
                            <a href="mailto:${item.email}" class="text-accent">${item.email}</a><br>
                            <span style="font-size:0.9em; color:#666;">${item.phone || 'Non renseigné'}</span>
                        </td>
                        <td data-label="Disponibilités">${item.availabilities || '-'}</td>
                        <td data-label="Message" style="max-width: 300px; white-space: pre-wrap;">${item.message || '-'}</td>
                        <td data-label="Actions">
                            <button class="btn-sm btn-danger" onclick="deleteVolunteer(${item.id})">Supprimer</button>
                        </td>
                    </tr>
                `).join('');
            } catch (err) {
                console.error(err);
                tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="color: #ef4444;">Erreur lors du chargement.</td></tr>';
            }
        }

        async function deleteVolunteer(id) {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette candidature ?')) {
                try {
                    await fetch('/api/volunteers/' + id, { method: 'DELETE' });
                    renderVolunteers();
                } catch (err) {
                    console.error(err);
                    alert('Erreur lors de la suppression');
                }
            }
        }

        async function renderAgendaShifts() {
            const tbody = document.getElementById('agendaTableBody');
            try {
                const response = await fetch('/api/shifts');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucun créneau réservé pour le moment.</td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(item => `
                    <tr>
                        <td data-label="Début"><span class="badge-date">${formatDate(item.start_time)}</span></td>
                        <td data-label="Fin"><span class="badge-date">${formatDate(item.end_time)}</span></td>
                        <td data-label="Bénévole"><strong>${item.volunteer_name}</strong></td>
                        <td data-label="Tâche" style="text-transform: capitalize;">${item.task}</td>
                        <td data-label="Actions">
                            <button class="btn-sm btn-danger" onclick="deleteAgendaShift(${item.id})">Supprimer</button>
                        </td>
                    </tr>
                `).join('');
            } catch (err) {
                console.error(err);
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="color: #ef4444;">Erreur lors du chargement.</td></tr>';
            }
        }

        async function deleteAgendaShift(id) {
            if (confirm('Êtes-vous sûr de vouloir supprimer ce créneau de l'agenda ?')) {
                try {
                    await fetch('/api/shifts/' + id, { method: 'DELETE' });
                    renderAgendaShifts();
                } catch (err) {
                    console.error(err);
                    alert('Erreur lors de la suppression');
                }
            }
        }

        async function renderMessages() {
            const tbody = document.getElementById('messagesTableBody');
            try {
                const response = await fetch('/api/messages');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Aucun message pour le moment.</td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(item => `
                    <tr>
                        <td data-label="Date"><span class="badge-date">${formatDate(item.date)}</span></td>
                        <td data-label="Expéditeur"><strong>${item.name}</strong></td>
                        <td data-label="Email"><a href="mailto:${item.email}" class="text-accent">${item.email}</a></td>
                        <td data-label="Message" style="max-width: 400px; white-space: pre-wrap;">${item.message}</td>
                    </tr>
                `).join('');
            } catch (err) {
                console.error(err);
                tbody.innerHTML = '<tr><td colspan="4" class="empty-state" style="color: #ef4444;">Erreur lors du chargement des données.</td></tr>';
            }
        }

        async function clearData(type) {
            if (confirm('Êtes-vous sûr de vouloir effacer toutes ces données ? Cette action est irréversible.')) {
                try {
                    await fetch(`/api/${type}`, { method: 'DELETE' });
                    if (type === 'adhesions') renderAdhesions();
                    if (type === 'messages') renderMessages();
                } catch (err) {
                    console.error(err);
                    alert('Erreur lors de la suppression');
                }
            }
        }

        // --- Documents Logic ---
        function formatBytes(bytes, decimals = 2) {
            if (!+bytes) return '0 Octets';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
        }

        async function renderDocuments() {
            const tbody = document.getElementById('documentsTableBody');
            try {
                const response = await fetch('/api/documents');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Aucun document pour le moment.</td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(item => `
                    <tr>
                        <td data-label="Sélection"><input type="checkbox" class="doc-checkbox" value="${item.id}" onchange="updateBulkDeleteBtn()"></td>
                        <td data-label="Date"><span class="badge-date">${formatDate(item.date)}</span></td>
                        <td data-label="Nom"><strong>${item.name}</strong></td>
                        <td data-label="Taille">${formatBytes(item.size)}</td>
                        <td data-label="Actions">
                            <a href="/api/documents/${item.id}/view" target="_blank" class="btn-sm" style="background: var(--dark-muted); color: white; text-decoration: none; display: inline-block; margin-right: 0.5rem;">Visualiser</a>
                            <a href="/api/documents/${item.id}/download" target="_blank" class="btn-sm" style="background: var(--primary); color: white; text-decoration: none; display: inline-block; margin-right: 0.5rem;">Télécharger</a>
                            <button class="btn-sm btn-danger" onclick="deleteDocument(${item.id})">Supprimer</button>
                        </td>
                    </tr>
                `).join('');
                updateBulkDeleteBtn();
            } catch (err) {
                console.error(err);
                tbody.innerHTML = '<tr><td colspan="4" class="empty-state" style="color: #ef4444;">Erreur lors du chargement des documents.</td></tr>';
            }
        }

        async function uploadDocument() {
            const fileInput = document.getElementById('docFile');
            const nameInput = document.getElementById('docName');
            
            if (!fileInput.files.length) {
                alert('Veuillez sélectionner un fichier.');
                return;
            }

            const formData = new FormData();
            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('files', fileInput.files[i]);
            }
            if (nameInput.value.trim() && fileInput.files.length === 1) {
                formData.append('name', nameInput.value.trim());
            }

            const btn = document.getElementById('uploadDocBtn');
            const originalText = btn.textContent;
            btn.textContent = 'Upload...';
            btn.disabled = true;

            try {
                const response = await fetch('/api/documents', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    let errorMessage = "Erreur lors de l'upload";
                    try {
                        const err = await response.json();
                        errorMessage = err.error || errorMessage;
                    } catch(e) {
                        errorMessage = `Erreur serveur (${response.status})`;
                    }
                    throw new Error(errorMessage);
                }
                
                fileInput.value = '';
                nameInput.value = '';
                renderDocuments();
                alert('Document uploadé avec succès !');
            } catch (err) {
                console.error(err);
                alert(err.message);
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }

        async function deleteDocument(id) {
            if (confirm('Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.')) {
                try {
                    const response = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Erreur lors de la suppression');
                    renderDocuments();
                } catch (err) {
                    console.error(err);
                    alert('Erreur lors de la suppression');
                }
            }
        }

        function toggleAllDocs(source) {
            const checkboxes = document.querySelectorAll('.doc-checkbox');
            checkboxes.forEach(cb => cb.checked = source.checked);
            updateBulkDeleteBtn();
        }

        function updateBulkDeleteBtn() {
            const checkboxes = document.querySelectorAll('.doc-checkbox:checked');
            const btn = document.getElementById('bulkDeleteBtn');
            if (btn) {
                btn.style.display = checkboxes.length > 0 ? 'inline-block' : 'none';
                btn.textContent = `Supprimer la sélection (${checkboxes.length})`;
            }
            const selectAll = document.getElementById('selectAllDocs');
            if (selectAll) {
                const allCheckboxes = document.querySelectorAll('.doc-checkbox');
                selectAll.checked = allCheckboxes.length > 0 && checkboxes.length === allCheckboxes.length;
            }
        }

        async function deleteSelectedDocuments() {
            const checkboxes = document.querySelectorAll('.doc-checkbox:checked');
            if (checkboxes.length === 0) return;
            
            if (confirm(`Êtes-vous sûr de vouloir supprimer ces ${checkboxes.length} documents ? Cette action est irréversible.`)) {
                const ids = Array.from(checkboxes).map(cb => parseInt(cb.value));
                try {
                    const response = await fetch('/api/documents/bulk-delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids })
                    });
                    if (!response.ok) throw new Error('Erreur lors de la suppression groupée');
                    renderDocuments();
                } catch (err) {
                    console.error(err);
                    alert('Erreur lors de la suppression');
                }
            }
        }

        // --- Subscribers Logic ---
        async function renderSubscribers() {
            const tbody = document.getElementById('subscribersTableBody');
            try {
                const response = await fetch('/api/subscribers');
                const data = await response.json();
                
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucun abonné.</td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(item => `
                    <tr>
                        <td data-label="Date"><span class="badge-date">${formatDate(item.date)}</span></td>
                        <td data-label="Email"><strong>${item.email}</strong></td>
                        <td data-label="Nom">${item.name || '-'}</td>
                        <td data-label="Statut">
                            <span style="padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; background: ${item.status === 'actif' ? '#dcfce7; color: #166534' : '#fee2e2; color: #991b1b'};">
                                ${item.status === 'actif' ? 'Actif' : 'Désabonné'}
                            </span>
                        </td>
                        <td data-label="Actions">
                            <button class="btn-sm btn-danger" onclick="deleteSubscriber(${item.id})">Supprimer</button>
                        </td>
                    </tr>
                `).join('');
            } catch (err) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="color: #ef4444;">Erreur.</td></tr>';
            }
        }

        async function addSubscriber() {
            const email = document.getElementById('newSubEmail').value.trim();
            const name = document.getElementById('newSubName').value.trim();
            if (!email) return alert('Email requis');

            try {
                const response = await fetch('/api/subscribers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, name })
                });
                if (!response.ok) throw new Error('Erreur');
                document.getElementById('newSubEmail').value = '';
                document.getElementById('newSubName').value = '';
                renderSubscribers();
            } catch (err) {
                alert("Erreur lors de l'ajout");
            }
        }

        async function deleteSubscriber(id) {
            if (confirm('Supprimer cet abonné ?')) {
                await fetch(`/api/subscribers/${id}`, { method: 'DELETE' });
                renderSubscribers();
            }
        }

        // --- Projects Logic ---
        async function renderProjects() {
            const tbody = document.getElementById('projectsTableBody');
            try {
                const response = await fetch('/api/projects');
                const data = await response.json();
                
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Aucun projet soumis pour le moment.</td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(item => {
                    const imgHtml = item.image ? `<br><a href="${item.image}" target="_blank" style="font-size: 0.8em; color: var(--primary);">🖼️ Voir l'image jointe</a>` : '';
                    const ratingSum = item.rating_sum || 0;
                    const ratingCount = item.rating_count || 0;
                    const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : 0;
                    const ratingHtml = ratingCount > 0 ? `<br><span style="font-size:0.9em; color:#fbbf24;">★ ${avgRating}/5</span> <span style="font-size:0.8em; color:var(--dark-muted)">(${ratingCount} avis)</span>` : '<br><span style="font-size:0.8em; color:var(--dark-muted)">Aucun avis</span>';
                    
                    return `
                    <tr>
                        <td data-label="Date"><span class="badge-date">${formatDate(item.date)}</span></td>
                        <td data-label="Auteur">
                            <strong>${item.name}</strong><br>
                            <a href="mailto:${item.email}" class="text-accent" style="font-size:0.9em;">${item.email}</a>
                        </td>
                        <td data-label="Projet" style="max-width: 400px;">
                            <strong style="display:block;margin-bottom:0.3rem;">${item.title}</strong>
                            <span style="white-space: pre-wrap; font-size: 0.9em;">${item.description}</span>
                            ${imgHtml}
                            ${ratingHtml}
                        </td>
                        <td data-label="Dons récoltés" style="font-weight: bold; color: #166534;">
                            ${item.collected_donations ? Number(item.collected_donations).toLocaleString('fr-FR') + ' €' : '0 €'}
                        </td>
                        <td data-label="Actions">
                            <button class="btn-sm btn-danger" onclick="deleteProject(${item.id})">Supprimer</button>
                        </td>
                    </tr>
                `}).join('');
            } catch (err) {
                tbody.innerHTML = '<tr><td colspan="4" class="empty-state" style="color: #ef4444;">Erreur de chargement.</td></tr>';
            }
        }

        async function deleteProject(id) {
            if (confirm('Voulez-vous supprimer cette idée de projet du site ?')) {
                try {
                    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
                    renderProjects();
                } catch (err) {
                    alert('Erreur lors de la suppression');
                }
            }
        }

        // --- Newsletters Logic ---
        let globalNewsletters = [];

        function openNewsletterForm(id = null) {
            document.getElementById('newsletterFormContainer').style.display = 'block';
            document.getElementById('nlFormTitle').textContent = id ? 'Modifier la Newsletter' : 'Créer une Newsletter';
            document.getElementById('nlId').value = id || '';
            
            if (id) {
                const item = globalNewsletters.find(n => n.id === id);
                document.getElementById('nlSubject').value = item ? item.subject : '';
                document.getElementById('nlContent').value = item ? item.content : '';
            } else {
                document.getElementById('nlSubject').value = '';
                document.getElementById('nlContent').value = '';
            }
        }

        function closeNewsletterForm() {
            document.getElementById('newsletterFormContainer').style.display = 'none';
        }

        async function renderNewsletters() {
            const tbody = document.getElementById('newslettersTableBody');
            try {
                const response = await fetch('/api/newsletters');
                const data = await response.json();
                globalNewsletters = data;
                
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Aucune newsletter.</td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(item => `
                    <tr>
                        <td data-label="Sujet"><strong>${item.subject}</strong></td>
                        <td data-label="Statut">
                            <span style="padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; background: ${item.status === 'envoyé' ? '#dcfce7; color: #166534' : '#f1f5f9; color: #475569'};">
                                ${item.status === 'envoyé' ? 'Envoyé' : 'Brouillon'}
                            </span>
                        </td>
                        <td data-label="Date / Envoi"><span class="badge-date">${item.sent_at ? formatDate(item.sent_at) : formatDate(item.date)}</span></td>
                        <td data-label="Actions">
                            ${item.status !== 'envoyé' ? `
                                <button class="btn-sm" style="background:var(--dark-muted);color:white;border:none;cursor:pointer;" onclick="openNewsletterForm(${item.id})">Modifier</button>
                                <button class="btn-sm" style="background:var(--primary);color:white;border:none;cursor:pointer;" onclick="sendNewsletter(${item.id})">Envoyer</button>
                            ` : `
                                <button class="btn-sm" style="background:#3b82f6;color:white;border:none;cursor:pointer;" onclick="showNewsletterStats(${item.id})">Statistiques</button>
                            `}
                            <button class="btn-sm btn-danger" onclick="deleteNewsletter(${item.id})">Supprimer</button>
                        </td>
                    </tr>
                `).join('');
            } catch (err) {
                tbody.innerHTML = '<tr><td colspan="4" class="empty-state" style="color: #ef4444;">Erreur.</td></tr>';
            }
        }

        // --- Accounting Logic ---
        let globalAccounting = [];

        async function renderAccounting() {
            const tbody = document.getElementById('accountingTableBody');
            const today = new Date(); const dd = String(today.getDate()).padStart(2, '0'); const mm = String(today.getMonth() + 1).padStart(2, '0'); document.getElementById('accDate').value = `${dd}/${mm}/${today.getFullYear()}`;
            
            try {
                const response = await fetch('/api/accounting');
                if (!response.ok) throw new Error('Erreur API');
                const data = await response.json();
                globalAccounting = data;
                
                calculateAccountingStats(data);
                renderAccountingChart(data);
                
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucune entrée comptable.</td></tr>';
                    return;
                }

                tbody.innerHTML = data.map(item => {
                    const cash = parseFloat(item.cash_amount) || 0;
                    const card = parseFloat(item.card_amount) || 0;
                    const total = cash + card;
                    const displayDate = new Date(item.date).toLocaleDateString('fr-FR');
                    
                    return `
                    <tr>
                        <td data-label="Date"><strong>${displayDate}</strong></td>
                        <td data-label="Espèces">${cash.toFixed(2)} €</td>
                        <td data-label="Carte">${card.toFixed(2)} €</td>
                        <td data-label="Total"><strong style="color: var(--primary);">${total.toFixed(2)} €</strong></td>
                        <td data-label="Actions">
                            <button class="btn-sm" style="background:var(--dark-muted);color:white;border:none;cursor:pointer;" onclick="editAccounting(${item.id})">Éditer</button>
                            <button class="btn-sm btn-danger" onclick="deleteAccounting(${item.id})">Supprimer</button>
                        </td>
                    </tr>
                `}).join('');
            } catch (err) {
                console.error(err);
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="color: #ef4444;">Erreur lors du chargement.</td></tr>';
            }
        }

        let accountingChartInstance = null;

        function renderAccountingChart(data) {
            const ctx = document.getElementById('accountingChart').getContext('2d');
            
            const dailyTotals = {};
            data.forEach(item => {
                const d = item.date.split('T')[0];
                if (!dailyTotals[d]) dailyTotals[d] = 0;
                dailyTotals[d] += (parseFloat(item.cash_amount) || 0) + (parseFloat(item.card_amount) || 0);
            });
            
            const sortedDates = Object.keys(dailyTotals).sort((a,b) => new Date(a) - new Date(b));
            const recentDates = sortedDates.slice(-30);
            
            const labels = recentDates.map(d => {
                const dateObj = new Date(d);
                const dd = String(dateObj.getDate()).padStart(2, '0');
                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                return `${dd}/${mm}`;
            });
            
            const chartData = recentDates.map(d => dailyTotals[d]);

            if (accountingChartInstance) {
                accountingChartInstance.destroy();
            }

            accountingChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Gains Totaux (€)',
                        data: chartData,
                        borderColor: '#d97743',
                        backgroundColor: 'rgba(217, 119, 67, 0.1)',
                        borderWidth: 2,
                        pointBackgroundColor: '#d97743',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        function calculateAccountingStats(data) {
            const now = new Date();
            const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfYear = new Date(now.getFullYear(), 0, 1);

            let stats = {
                week: { cash: 0, card: 0 },
                month: { cash: 0, card: 0 },
                year: { cash: 0, card: 0 }
            };

            data.forEach(item => {
                const itemDate = new Date(item.date);
                const cash = parseFloat(item.cash_amount) || 0;
                const card = parseFloat(item.card_amount) || 0;

                if (itemDate >= startOfWeek) {
                    stats.week.cash += cash;
                    stats.week.card += card;
                }
                if (itemDate >= startOfMonth) {
                    stats.month.cash += cash;
                    stats.month.card += card;
                }
                if (itemDate >= startOfYear) {
                    stats.year.cash += cash;
                    stats.year.card += card;
                }
            });

            // Update UI
            document.getElementById('statWeeklyCash').textContent = stats.week.cash.toFixed(2) + ' €';
            document.getElementById('statWeeklyCard').textContent = stats.week.card.toFixed(2) + ' €';
            document.getElementById('statWeeklyTotal').textContent = (stats.week.cash + stats.week.card).toFixed(2) + ' €';

            document.getElementById('statMonthlyCash').textContent = stats.month.cash.toFixed(2) + ' €';
            document.getElementById('statMonthlyCard').textContent = stats.month.card.toFixed(2) + ' €';
            document.getElementById('statMonthlyTotal').textContent = (stats.month.cash + stats.month.card).toFixed(2) + ' €';

            document.getElementById('statYearlyCash').textContent = stats.year.cash.toFixed(2) + ' €';
            document.getElementById('statYearlyCard').textContent = stats.year.card.toFixed(2) + ' €';
            document.getElementById('statYearlyTotal').textContent = (stats.year.cash + stats.year.card).toFixed(2) + ' €';
        }

        async function saveAccounting() {
            const id = document.getElementById('accountingId').value;
            let dateStr = document.getElementById('accDate').value.trim();
            const cash = parseFloat(document.getElementById('accCash').value) || 0;
            const card = parseFloat(document.getElementById('accCard').value) || 0;

            if (!dateStr) return alert('La date est requise');

            // Conversion JJ/MM/AAAA vers YYYY-MM-DD
            const dateParts = dateStr.split('/');
            if (dateParts.length !== 3) return alert('La date doit être au format JJ/MM/AAAA');
            const isoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

            const method = id ? 'PUT' : 'POST';
            const url = id ? `/api/accounting/${id}` : '/api/accounting';

            try {
                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date: isoDate, cash_amount: cash, card_amount: card })
                });
                if (!response.ok) throw new Error('Erreur de sauvegarde');
                
                // Reset form
                document.getElementById('accountingId').value = '';
                const today = new Date();
                const dd = String(today.getDate()).padStart(2, '0');
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                document.getElementById('accDate').value = `${dd}/${mm}/${today.getFullYear()}`;
                document.getElementById('accCash').value = '';
                document.getElementById('accCard').value = '';
                
                renderAccounting();
            } catch (err) {
                console.error(err);
                alert("Erreur lors de l'enregistrement");
            }
        }

        function editAccounting(id) {
            const item = globalAccounting.find(a => a.id === id);
            if (item) {
                document.getElementById('accountingId').value = item.id;
                
                const d = new Date(item.date);
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                document.getElementById('accDate').value = `${dd}/${mm}/${d.getFullYear()}`;
                
                document.getElementById('accCash').value = item.cash_amount;
                document.getElementById('accCard').value = item.card_amount;
                window.scrollTo(0, document.getElementById('accDate').offsetTop - 100);
            }
        }

        async function deleteAccounting(id) {
            if (confirm("Êtes-vous sûr de vouloir supprimer cette entrée comptable ?")) {
                try {
                    await fetch(`/api/accounting/${id}`, { method: 'DELETE' });
                    renderAccounting();
                } catch (err) {
                    alert("Erreur lors de la suppression");
                }
            }
        }

        async function saveNewsletter() {
            const id = document.getElementById('nlId').value;
            const subject = document.getElementById('nlSubject').value.trim();
            const content = document.getElementById('nlContent').value.trim();

            if (!subject || !content) return alert('Sujet et contenu requis.');

            const method = id ? 'PUT' : 'POST';
            const url = id ? `/api/newsletters/${id}` : '/api/newsletters';

            try {
                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subject, content })
                });
                if (!response.ok) throw new Error('Erreur');
                closeNewsletterForm();
                renderNewsletters();
            } catch (err) {
                alert("Erreur lors de la sauvegarde.");
            }
        }

        async function deleteNewsletter(id) {
            if (confirm('Supprimer cette newsletter ?')) {
                await fetch(`/api/newsletters/${id}`, { method: 'DELETE' });
                renderNewsletters();
            }
        }

        async function sendNewsletter(id) {
            // Fetch subscribers
            const subRes = await fetch('/api/subscribers');
            const subscribers = await subRes.json();
            const actifs = subscribers.filter(s => s.status === 'actif');

            let promptHtml = `
                <div style="text-align: left; max-height: 300px; overflow-y: auto; margin-bottom: 1rem; padding: 1rem; background: var(--gray-bg); border-radius: var(--radius-md);">
                    <h4>Sélectionner les destinataires (${actifs.length} actifs)</h4>
                    <label style="display: block; margin: 0.5rem 0;"><input type="checkbox" id="selectAllSubs" checked onchange="document.querySelectorAll('.sub-cb').forEach(cb => cb.checked = this.checked)"> Tout sélectionner</label>
                    <hr style="margin: 0.5rem 0; border: none; border-top: 1px solid #ddd;">
                    ${actifs.map(s => `<label style="display: block; margin: 0.2rem 0;"><input type="checkbox" class="sub-cb" value="${s.email}" checked> ${s.email} (${s.name || '?'})</label>`).join('')}
                </div>
                <hr>
                <div style="margin-top: 1rem;">
                    <h4>OU Envoyer un Test</h4>
                    <input type="email" id="testEmailInput" placeholder="Adresse email de test" style="width: 100%; padding: 0.5rem;">
                </div>
            `;

            // Custom modal
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%';
            modal.style.background = 'rgba(0,0,0,0.5)';
            modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
            modal.style.zIndex = '9999';

            modal.innerHTML = `
                <div style="background: white; padding: 2rem; border-radius: var(--radius-lg); width: 500px; max-width: 90%;">
                    <h2 style="margin-top: 0;">Envoyer la Newsletter</h2>
                    ${promptHtml}
                    <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 1rem;">
                        <button class="btn btn-outline" id="cancelSendBtn">Annuler</button>
                        <button class="btn btn-primary" id="confirmSendBtn">Envoyer la campagne</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('cancelSendBtn').onclick = () => modal.remove();
            document.getElementById('confirmSendBtn').onclick = async () => {
                const testEmail = document.getElementById('testEmailInput').value.trim();
                const selectedEmails = Array.from(document.querySelectorAll('.sub-cb:checked')).map(cb => cb.value);

                if (!testEmail && selectedEmails.length === 0) {
                    alert("Sélectionnez au moins un destinataire.");
                    return;
                }

                if (!testEmail && !confirm(`ATTENTION : Vous allez envoyer cet email à ${selectedEmails.length} destinataire(s). Confirmer ?`)) {
                    return;
                }

                const btn = document.getElementById('confirmSendBtn');
                btn.textContent = 'Envoi en cours...';
                btn.disabled = true;

                try {
                    const response = await fetch(`/api/newsletters/${id}/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            testEmail: testEmail ? testEmail : null,
                            selectedEmails: testEmail ? null : selectedEmails
                        })
                    });
                    
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Erreur inconnue');
                    
                    alert(`Envoyé avec succès à ${data.count} destinataire(s) !`);
                    renderNewsletters();
                    modal.remove();
                } catch (err) {
                    alert("Erreur lors de l'envoi : " + err.message);
                    btn.textContent = 'Envoyer la campagne';
                    btn.disabled = false;
                }
            };
        }

        async function showNewsletterStats(id) {
            try {
                /* removed alert */
                const response = await fetch(`/api/newsletters/${id}/stats`);
                const data = await response.json();
                
                if (!response.ok) throw new Error(data.error || 'Erreur');
                
                const delivered = data.deliveredCount;
                const opens = data.openedCount;
                const clicks = data.clickedCount;
                
                const openRate = delivered > 0 ? ((opens / delivered) * 100).toFixed(1) : 0;
                const clickRate = delivered > 0 ? ((clicks / delivered) * 100).toFixed(1) : 0;
                
                
                // Show rich stats modal
                const modal = document.createElement('div');
                modal.style.position = 'fixed';
                modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%';
                modal.style.background = 'rgba(0,0,0,0.5)';
                modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
                modal.style.zIndex = '9999';

                modal.innerHTML = `
                    <div style="background: white; padding: 2rem; border-radius: var(--radius-lg); width: 600px; max-width: 90%;">
                        <h2 style="margin-top: 0; margin-bottom: 1.5rem;">📊 Statistiques de la Campagne</h2>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                            <div class="stat-card">
                                <div class="value" style="color: #3b82f6;">${data.totalSent}</div>
                                <div class="label">Envoyés (${delivered} délivrés)</div>
                            </div>
                            <div class="stat-card">
                                <div class="value" style="color: #10b981;">${openRate}%</div>
                                <div class="label">${opens} Ouvertures</div>
                                <div class="progress-bar"><div class="progress-fill" style="width: ${openRate}%; background: #10b981;"></div></div>
                            </div>
                            <div class="stat-card">
                                <div class="value" style="color: #8b5cf6;">${clickRate}%</div>
                                <div class="label">${clicks} Clics</div>
                                <div class="progress-bar"><div class="progress-fill" style="width: ${clickRate}%; background: #8b5cf6;"></div></div>
                            </div>
                            <div class="stat-card" style="border-color: #fecaca; background: #fef2f2;">
                                <div class="value" style="color: #ef4444; font-size: 1.5rem;">${data.bouncedCount + data.spamCount}</div>
                                <div class="label" style="color: #991b1b;">Erreurs & Spam</div>
                            </div>
                        </div>

                        <div style="text-align: center; color: var(--dark-muted);">
                            Désabonnements : <strong>${data.unsubscribedCount}</strong>
                        </div>

                        <div style="margin-top: 2rem; text-align: center;">
                            <button class="btn btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()">Fermer</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

            } catch(err) {
                alert("Erreur: " + err.message);
            }
        }

        // --- CMS Logic ---
        const cmsFieldsConfig = [
            { id: 'hero-img', label: 'Image de fond Accueil (URL)', type: 'text', default: 'assets/background-photo.jpg' },
            { id: 'hero-badge', label: `Badge de l'en-tête`, type: 'text', default: 'Paris 15e' },
            { id: 'hero-title', label: 'Titre principal', type: 'text', default: 'Ensemble pour notre<br><span class="text-gradient">Quartier</span>' },
            { id: 'hero-desc', label: 'Description sous le titre', type: 'textarea', default: `L'Association Falguière s'engage au quotidien pour aider le quartier à se développer, recréer du lien social et lutter contre la précarité.` },
            
            { id: 'mission-title', label: 'Titre Mission', type: 'text', default: `Plus qu'un quartier,<br>une <span class="text-accent">communauté</span>.` },
            { id: 'mission-lead', label: 'Intro Mission', type: 'textarea', default: `Le quartier Falguière a du potentiel. Notre mission est de l'aider à sortir de la promiscuité et d'offrir de nouvelles perspectives à ses habitants.` },
            { id: 'mission-desc', label: 'Desc Mission', type: 'textarea', default: `À travers l'entraide, l'écoute et l'action de terrain, nous luttons contre l'isolement et la pauvreté. Nous croyons en un avenir meilleur, construit par et pour les résidents du 15ème arrondissement.` },
            
            { id: 'stat-1-num', label: 'Stat 1 Chiffre', type: 'text', default: '6400+' },
            { id: 'stat-1-label', label: 'Stat 1 Texte', type: 'text', default: 'Habitants dans le quartier' },
            { id: 'stat-2-num', label: 'Stat 2 Chiffre', type: 'text', default: '100%' },
            { id: 'stat-2-label', label: 'Stat 2 Texte', type: 'text', default: `D'engagement solidaire` },

            { id: 'action-1-icon', label: 'Action 1 Icon', type: 'text', default: '🤝' },
            { id: 'action-1-title', label: 'Action 1 Titre', type: 'text', default: 'Journées Solidaires' },
            { id: 'action-1-desc', label: 'Action 1 Desc', type: 'textarea', default: 'Organisation régulière de distributions de nourriture et de vêtements pour aider les familles en difficulté.' },
            { id: 'action-2-icon', label: 'Action 2 Icon', type: 'text', default: '📚' },
            { id: 'action-2-title', label: 'Action 2 Titre', type: 'text', default: 'Soutien Scolaire' },
            { id: 'action-2-desc', label: 'Action 2 Desc', type: 'textarea', default: 'Accompagnement des jeunes du quartier pour favoriser leur réussite éducative et leur épanouissement.' },
            { id: 'action-3-icon', label: 'Action 3 Icon', type: 'text', default: '🌱' },
            { id: 'action-3-title', label: 'Action 3 Titre', type: 'text', default: 'Développement Local' },
            { id: 'action-3-desc', label: 'Action 3 Desc', type: 'textarea', default: 'Initiatives pour améliorer le cadre de vie, végétaliser nos espaces et renforcer la sécurité communautaire.' },

            { id: 'asso-title', label: 'Titre Vie Asso', type: 'text', default: `Une association <span class="text-accent">par et pour</span> les habitants` },
            { id: 'asso-lead', label: 'Intro Vie Asso', type: 'textarea', default: `Chaque jour, de nouveaux membres nous rejoignent pour donner vie au quartier Falguière.` },

            { id: 'galerie-1-img', label: 'Galerie 1 Image (URL)', type: 'text', default: 'assets/galerie-1.jpg' },
            { id: 'galerie-1-title', label: 'Galerie 1 Titre', type: 'text', default: 'La Cité Maillol' },
            { id: 'galerie-1-desc', label: 'Galerie 1 Desc', type: 'textarea', default: `Falguière est un grand quartier du 15ème arrondissement. Son nom officiel est la « cité Maillol » car le centre névralgique de la cité se trouve dans l'ensemble Falguière / Maillol.` },
            
            { id: 'galerie-2-img', label: 'Galerie 2 Image (URL)', type: 'text', default: 'assets/galerie-2.jpg' },
            { id: 'galerie-2-title', label: 'Galerie 2 Titre', type: 'text', default: 'Un quartier prioritaire' },
            { id: 'galerie-2-desc', label: 'Galerie 2 Desc', type: 'textarea', default: 'Falguière fait partie des deux quartiers du 15ème arrondissement à être classés en Quartier Prioritaire de la Politique de la Ville (QPV) en 2024.' },
            
            { id: 'galerie-3-img', label: 'Galerie 3 Image (URL)', type: 'text', default: 'assets/galerie-3.jpg' },
            { id: 'galerie-3-title', label: 'Galerie 3 Titre', type: 'text', default: 'Lutte contre la précarité' },
            { id: 'galerie-3-desc', label: 'Galerie 3 Desc', type: 'textarea', default: 'En 2024, Falguière est le quartier le plus pauvre de Paris avec un taux de pauvreté de 55%. Notre association agit au quotidien pour y faire face et créer de la solidarité.' },

            { id: 'galerie-4-img', label: 'Galerie 4 Image (URL)', type: 'text', default: 'assets/galerie-4.jpg' },
            { id: 'galerie-4-title', label: 'Galerie 4 Titre', type: 'text', default: 'Une histoire riche' },
            { id: 'galerie-4-desc', label: 'Galerie 4 Desc', type: 'textarea', default: 'La rue et le quartier doivent leur nom actuel au peintre et sculpteur Alexandre Falguière (1831-1900). Nous perpétuons cette histoire à travers nos actions sur le terrain.' },

            { id: 'galerie-5-img', label: 'Galerie 5 Image (URL)', type: 'text', default: 'assets/galerie-5.jpg' },
            { id: 'galerie-5-title', label: 'Galerie 5 Titre', type: 'text', default: 'Notre engagement' },
            { id: 'galerie-5-desc', label: 'Galerie 5 Desc', type: 'textarea', default: `Notre force réside dans la diversité et l'engagement de nos bénévoles. Que vous ayez quelques heures ou plusieurs jours à consacrer, chaque aide compte pour animer notre quartier.` },

            // Settings
            { id: 'mailjet_api_key', label: 'Clé API Publique Mailjet', type: 'text', default: '' },
            { id: 'mailjet_api_secret', label: 'Clé Secrète Mailjet', type: 'text', default: '' },
            { id: 'mailjet_sender_email', label: 'Email Expéditeur Mailjet (vérifié)', type: 'text', default: 'contact@falguiere.org' },
            { id: 'mailjet_sender_name', label: 'Nom Expéditeur Mailjet', type: 'text', default: 'Association Falguière' },
            { id: 'stripe_public_key', label: 'Clé Publique Stripe (pk_...)', type: 'text', default: '' },
            { id: 'stripe_secret_key', label: 'Clé Secrète Stripe (sk_...)', type: 'text', default: '' },
            { id: 'footer-desc', label: 'Footer Description', type: 'textarea', default: `L'association pour le développement et la solidarité du quartier Falguière à Paris 15e.` }
        ];

        
        async function initSettings() {
            try {
                const response = await fetch('/api/cms');
                let cmsData = {};
                if (response.ok) {
                    cmsData = await response.json();
                }
                
                const form = document.getElementById('settingsForm');
                form.innerHTML = ''; 
                
                const settingsKeys = ['mailjet_api_key', 'mailjet_api_secret', 'mailjet_sender_email', 'mailjet_sender_name', 'stripe_public_key', 'stripe_secret_key'];
                
                cmsFieldsConfig.filter(f => settingsKeys.includes(f.id)).forEach(field => {
                    const value = cmsData[field.id] || field.default;
                    const wrapper = document.createElement('div');
                    wrapper.className = 'cms-field';
                    
                    wrapper.innerHTML = `
                        <label>${field.label}</label>
                        <input type="${field.type}" id="cms-${field.id}" value="${value.replace(/"/g, '&quot;')}">
                    `;
                    form.appendChild(wrapper);
                });
            } catch (err) {
                console.error('Error loading settings:', err);
            }
        }

        async function saveSettings() {
            const cmsData = {};
            const settingsKeys = ['mailjet_api_key', 'mailjet_api_secret', 'mailjet_sender_email', 'mailjet_sender_name', 'stripe_public_key', 'stripe_secret_key'];
            
            cmsFieldsConfig.filter(f => settingsKeys.includes(f.id)).forEach(field => {
                const el = document.getElementById(`cms-${field.id}`);
                if (el) cmsData[field.id] = el.value;
            });
            
            try {
                const response = await fetch('/api/cms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cmsData)
                });
                
                if (response.ok) {
                    alert('Paramètres enregistrés !');
                } else {
                    throw new Error('Server returned an error');
                }
            } catch (err) {
                alert('Erreur lors de la sauvegarde.');
            }
        }
        const splitCmsSettings = ``;
        async function initSettings() {
            try {
                const response = await fetch('/api/cms');
                let cmsData = {};
                if (response.ok) {
                    cmsData = await response.json();
                }
                
                const form = document.getElementById('settingsForm');
                form.innerHTML = ''; 
                
                const settingsKeys = ['mailjet_api_key', 'mailjet_api_secret', 'mailjet_sender_email', 'mailjet_sender_name', 'stripe_public_key', 'stripe_secret_key'];
                
                cmsFieldsConfig.filter(f => settingsKeys.includes(f.id)).forEach(field => {
                    const value = cmsData[field.id] || field.default;
                    const wrapper = document.createElement('div');
                    wrapper.className = 'cms-field';
                    
                    wrapper.innerHTML = `
                        <label>${field.label}</label>
                        <input type="${field.type}" id="cms-${field.id}" value="${value.replace(/"/g, '&quot;')}">
                    `;
                    form.appendChild(wrapper);
                });
            } catch (err) {
                console.error('Error loading settings:', err);
            }
        }

        async function saveSettings() {
            const cmsData = {};
            const settingsKeys = ['mailjet_api_key', 'mailjet_api_secret', 'mailjet_sender_email', 'mailjet_sender_name', 'stripe_public_key', 'stripe_secret_key'];
            
            cmsFieldsConfig.filter(f => settingsKeys.includes(f.id)).forEach(field => {
                const el = document.getElementById(`cms-${field.id}`);
                if (el) cmsData[field.id] = el.value;
            });
            
            try {
                const response = await fetch('/api/cms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cmsData)
                });
                
                if (response.ok) {
                    alert('Paramètres enregistrés !');
                } else {
                    throw new Error('Server returned an error');
                }
            } catch (err) {
                alert('Erreur lors de la sauvegarde.');
            }
        }

        async function initCMS() {
            try {
                const response = await fetch('/api/cms');
                let cmsData = {};
                if (response.ok) {
                    cmsData = await response.json();
                }
                
                const form = document.getElementById('cmsForm');
                form.innerHTML = ''; // Clear existing
                
                const settingsKeys = ['mailjet_api_key', 'mailjet_api_secret', 'mailjet_sender_email', 'mailjet_sender_name', 'stripe_public_key', 'stripe_secret_key', 'stripe_public_key', 'stripe_secret_key'];
                cmsFieldsConfig.filter(f => !settingsKeys.includes(f.id)).forEach(field => {
                    const value = cmsData[field.id] || field.default;
                    const wrapper = document.createElement('div');
                    wrapper.className = 'cms-field';
                    
                    if (field.type === 'textarea') {
                        wrapper.innerHTML = `
                            <label>${field.label}</label>
                            <textarea id="cms-${field.id}" rows="3">${value}</textarea>
                        `;
                    } else {
                        wrapper.innerHTML = `
                            <label>${field.label}</label>
                            <input type="${field.type}" id="cms-${field.id}" value="${value.replace(/"/g, '&quot;')}">
                        `;
                    }
                    form.appendChild(wrapper);
                });
            } catch (err) {
                console.error('Error loading CMS data:', err);
            }
        }

        async function saveCMS() {
            const cmsData = {};
            cmsFieldsConfig.forEach(field => {
                const el = document.getElementById(`cms-${field.id}`);
                if (el) cmsData[field.id] = el.value;
            });
            
            const btn = document.querySelector('button[onclick="saveCMS()"]');
            const originalText = btn.textContent;
            btn.textContent = 'Enregistrement...';
            
            try {
                const response = await fetch('/api/cms', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(cmsData)
                });
                
                if (response.ok) {
                    alert('Modifications enregistrées ! Elles sont maintenant visibles sur le site.');
                } else {
                    throw new Error('Server returned an error');
                }
            } catch (err) {
                console.error('Error saving CMS:', err);
                alert('Erreur lors de la sauvegarde.');
            } finally {
                btn.textContent = originalText;
            }
        }
    