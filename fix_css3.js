const fs = require('fs');
let c = fs.readFileSync('styles.css', 'utf8');

const newRule = `
    .glass-card, .action-card, .contact-card, .sub-card, .project-card, .admin-card {
        margin-left: -1rem !important;
        margin-right: -1rem !important;
        width: calc(100% + 2rem) !important;
        max-width: none !important;
        border-radius: 0 !important;
        border-left: none !important;
        border-right: none !important;
    }
`;

const lastBraceIndex = c.lastIndexOf('}');
if (lastBraceIndex !== -1) {
    c = c.substring(0, lastBraceIndex) + newRule + c.substring(lastBraceIndex);
}

fs.writeFileSync('styles.css', c);
