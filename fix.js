const fs = require('fs');
let c = fs.readFileSync('admin.html', 'utf8');
c = c.replace(/if \(confirm\('Êtes-vous sûr de vouloir supprimer ce créneau de l'agenda \?'\)\) \{/, 'if (confirm("Êtes-vous sûr de vouloir supprimer ce créneau de l\\'agenda ?")) {');
fs.writeFileSync('admin.html', c);
