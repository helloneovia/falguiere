const fs = require('fs');
let c = fs.readFileSync('styles.css', 'utf8');

const newRule = `
    .form-group input:not([type="checkbox"]):not([type="radio"]),
    .form-group textarea,
    .form-group select {
        width: calc(100% + 2rem) !important;
        margin-left: -1rem !important;
        margin-right: -1rem !important;
        border-left: none !important;
        border-right: none !important;
        border-radius: 0 !important;
    }
    .form-group input:not([type="checkbox"]):not([type="radio"]):focus,
    .form-group textarea:focus,
    .form-group select:focus {
        box-shadow: none !important;
        border-left: none !important;
        border-right: none !important;
    }
`;

const lastBraceIndex = c.lastIndexOf('}');
if (lastBraceIndex !== -1) {
    c = c.substring(0, lastBraceIndex) + newRule + c.substring(lastBraceIndex);
}

fs.writeFileSync('styles.css', c);
