const fs = require('fs');
const files = ['index.html', 'don.html', 'mentions-legales.html', 'politique-confidentialite.html', 'projets.html'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  const destDesktop1 = '<a href="#adhesion" class="btn btn-primary">Nous Rejoindre</a>';
  const destDesktop2 = '<a href="index.html#adhesion" class="btn btn-primary">Nous Rejoindre</a>';
  
  const destMobile1 = '<a href="#adhesion" class="btn btn-primary w-full text-center mt-4 mobile-link">Nous Rejoindre</a>';
  const destMobile2 = '<a href="index.html#adhesion" class="btn btn-primary w-full text-center mt-4 mobile-link">Nous Rejoindre</a>';

  if (!content.includes('<a href="benevole.html"')) {
    content = content.replace(destDesktop1, '<a href="benevole.html">Bénévolat</a>\n                ' + destDesktop1);
    content = content.replace(destDesktop2, '<a href="benevole.html">Bénévolat</a>\n                ' + destDesktop2);
    
    content = content.replace(destMobile1, '<a href="benevole.html" class="mobile-link">Bénévolat</a>\n        ' + destMobile1);
    content = content.replace(destMobile2, '<a href="benevole.html" class="mobile-link">Bénévolat</a>\n        ' + destMobile2);
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});
