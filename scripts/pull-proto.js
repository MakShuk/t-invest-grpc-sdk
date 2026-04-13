import https from 'https';
import fs from 'fs';
import AdmZip from 'adm-zip';

const url = 'https://codeload.github.com/RussianInvestments/investAPI/zip/refs/heads/main';
const dest = 'proto.zip';

console.log(`Downloading ${url}...`);

https.get(url, (response) => {
  if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
    https.get(response.headers.location, processResponse).on('error', handleError);
  } else {
    processResponse(response);
  }
}).on('error', handleError);

function processResponse(response) {
  if (response.statusCode !== 200) {
    console.error(`Error: HTTP ${response.statusCode} ${response.statusMessage}`);
    process.exit(1);
  }
  const file = fs.createWriteStream(dest);
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Unzipping...');
    try {
      const zip = new AdmZip(dest);
      zip.extractAllTo('.', true);
      fs.unlinkSync(dest);
      console.log('Done pulling proto files.');
    } catch (err) {
      console.error('Error unzipping:', err);
      process.exit(1);
    }
  });
}

function handleError(err) {
  console.error('Error downloading:', err);
  process.exit(1);
}
