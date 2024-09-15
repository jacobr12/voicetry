const VOICEFLOW_API_KEY = 'VF.DM.66e5cd017e55f06b654edcfd.FacoFUvzYb9P3tXV';
const VOICEFLOW_VERSION_ID = '66e5f214ee127a08497d5383';
const recordButton = document.getElementById('recordButton');
const status = document.getElementById('status');
const transcription = document.getElementById('transcription');
const voiceflowResponseElement = document.getElementById('voiceflowResponse');

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

recordButton.addEventListener('click', toggleRecording);

async function toggleRecording() {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = sendAudioToGroq;

        mediaRecorder.start();
        isRecording = true;
        recordButton.textContent = '⏹️';
        status.textContent = 'Recording... Click to stop';
    } catch (error) {
        console.error('Error accessing microphone:', error);
        status.textContent = 'Error accessing microphone';
    }
}

function stopRecording() {
    mediaRecorder.stop();
    isRecording = false;
    recordButton.textContent = '🎤';
    status.textContent = 'Processing...';
}

async function sendAudioToGroq() {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-large-v3');

    try {
        const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
            headers: {
                'Authorization': 'Bearer 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',
                'Content-Type': 'multipart/form-data'
            }
        });

        transcription.textContent = response.data.text;
        status.textContent = 'Transcription complete';
        sendToVoiceflow(response.data.text);
    } catch (error) {
        console.error('Error transcribing audio:', error);
        status.textContent = 'Error transcribing audio';
    }
}

async function sendToVoiceflow(text) {
    try {
        const response = await axios.post(`https://general-runtime.voiceflow.com/state/user/test/interact`, {
            action: {
                type: 'text',
                payload: text
            }
        }, {
            headers: {
                'Authorization': VOICEFLOW_API_KEY,
                'versionID': VOICEFLOW_VERSION_ID
            }
        });

        // Display the Voiceflow response
        const voiceflowResponse = response.data.find(item => item.type === 'text');
        if (voiceflowResponse) {
            const message = voiceflowResponse.payload.message;
            voiceflowResponseElement.textContent = message;
            readOutLoud(message);  // Trigger text-to-speech for the Voiceflow response
        }
    } catch (error) {
        console.error('Error sending to Voiceflow:', error);
        status.textContent = 'Error getting response from Voiceflow';
    }
}

async function readOutLoud(text) {
    try {
        const response = await axios.post('https://api.v7.unrealspeech.com/stream', {
            Text: text,
            VoiceId: 'Will', // You can change this to Scarlett, Liv, Will, or Amy
            Bitrate: '192k',
            Speed: '0',
            Pitch: '1.27',
            Codec: 'libmp3lame'
        }, {
            headers: {
                'Authorization': 'Bearer eTqIM2sw8B50N5k9RhXHLQ5wckReM04tstSbT5UwWfKKPeBabcoLVp',
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'
        });

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(response.data);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
    } catch (error) {
        console.error('Error using Unreal Speech API:', error);
        status.textContent = 'Error generating speech';
    }
}