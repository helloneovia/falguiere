const fs = require('fs');
const files = ['index.html', 'don.html', 'mentions-legales.html', 'politique-confidentialite.html', 'projets.html', 'benevole.html'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  const destDesktop = '<a href="benevole.html">Bénévolat</a>';
  const destDesktop2 = '<a href="benevole.html" class="active">Bénévolat</a>';
  const destMobile = '<a href="benevole.html" class="mobile-link">Bénévolat</a>';

  if (!content.includes('<a href="agenda.html"')) {
    content = content.replace(destDesktop, '<a href="agenda.html">Agenda</a>\n                ' + destDesktop);
    content = content.replace(destDesktop2, '<a href="agenda.html">Agenda</a>\n                ' + destDesktop2);
    
    content = content.replace(destMobile, '<a href="agenda.html" class="mobile-link">Agenda</a>\n        ' + destMobile);
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});
