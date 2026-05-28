const fs = require('fs');
let c = fs.readFileSync('styles.css', 'utf8');

const target = `.submit-form {
        padding: 1.5rem !important;
        margin: 0 1rem;
    }`;

const replacement = `.submit-form, .contact-form {
        padding: 2rem 1rem !important;
        margin: 0 -1rem !important;
        border-radius: 0 !important;
        width: calc(100% + 2rem) !important;
        max-width: none !important;
        border-left: none !important;
        border-right: none !important;
        box-shadow: none !important;
        border-top: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
    }
    .modal-content {
        padding: 1.5rem 1rem !important;
        border-radius: 0 !important;
        width: 100% !important;
        max-width: none !important;
        margin: auto 0 0 0 !important;
    }`;

// Replace ignoring exact whitespace
const regex = /\.submit-form\s*\{\s*padding:\s*1\.5rem\s*!important;\s*margin:\s*0\s*1rem;\s*\}/g;
c = c.replace(regex, replacement);

fs.writeFileSync('styles.css', c);
