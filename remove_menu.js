const fs = require('fs');
const files = ['index.html', 'projets.html', 'benevole.html', 'don.html', 'agenda.html'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove lines containing 'Notre Mission'
    content = content.replace(/.*<a href="[^"]*#mission".*>Notre Mission<\/a>.*\n?/g, '');
    
    // Remove lines containing 'Nos Actions'
    content = content.replace(/.*<a href="[^"]*#actions".*>Nos Actions<\/a>.*\n?/g, '');
    
    fs.writeFileSync(file, content);
});
