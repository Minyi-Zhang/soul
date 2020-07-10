// import mic access
const recorder = require('node-record-lpcm16');

// Imports the Google Cloud client library
const speech = require('@google-cloud/speech');

// Creates a voice client
const client = new speech.SpeechClient();

//set up web server and socket
const express = require('express');
const app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

//audio settings
const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'en-US';

//configures link to google
const request = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
  },
  interimResults: false, // If you want interim results, set this to true
};

//serve svg files
app.use(express.static('assets'));

//serves main page to browser
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/test', (req, res) => {
  res.sendFile(__dirname + '/test.html');
});

app.use('/assets', express.static(__dirname + '/assets'));

//open web socket - how data is shared between google speech and web browser
http.listen(3000, () => {
  console.log('listening on *:3000');
});

// Create a recognize stream
//speech to text main function. collect audio and send to google
const recognizeStream = client
  .streamingRecognize(request)
  .on('error', console.error)
  .on('data', (data) => {
    process.stdout.write(
      data.results[0] && data.results[0].alternatives[0]
        ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
        : '\n\nReached transcription time limit, press Ctrl+C\n'
    );
    //send data to web browser
    io.emit('update', data.results[0].alternatives[0].transcript);
  });

// Start recording and send the microphone input
// Ensure SoX is installed, see https://www.npmjs.com/package/node-record-lpcm16#dependencies
recorder
  .record({
    sampleRateHertz: sampleRateHertz,
    threshold: 0,
    verbose: false,
    recordProgram: 'rec', // Try also "arecord" or "sox"
    //important -- only number to change//
    silence: '10.0',
  })
  .stream()
  .on('error', console.error)
  .pipe(recognizeStream);

console.log('Listening, press Ctrl+C to stop.');
