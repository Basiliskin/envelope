# backup

timestamp=$(date +%Y-%m-%d) && git archive --format=zip --output="../envelope-1.0.0-$timestamp.zip" HEAD

# Test

1. Build both apps
   npm run build
   This produces dist-composer/composer.html (the authoring tool) and dist-reader/reader.html (embedded into every sealed file it produces).

2. Open the composer

Just open the file directly in a browser — no server needed:
open dist-composer/composer.html
(or double-click it / drag it into a browser tab). This is exactly the file:// scenario the roadmap cares about.

3. Seal something

- Drop/select a file in the "Files" section
- Enter a password (try the "Generate" button for a diceware passphrase, or type your own — weak ones will be blocked)
- Set all three safe-dial numbers (1–99, no zeros) and click Lock dial
- Watch "Combined entropy" clear the ≥80-bit threshold — Seal envelope only enables once it does
- Click Seal envelope, then Download sealed envelope — this gives you an envelope.html

4. Open and unseal

Open that downloaded envelope.html in a browser (again, file:// works fine — try dragging it in fresh, as a recipient would). Enter the same password
and dial, lock the dial, click Open attachments, then download the file(s) and diff them against the original to confirm they're byte-identical.

# Surge

1. npm install --global surge
2.
