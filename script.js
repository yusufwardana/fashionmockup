// script.js
// File ini berisi semua logika JavaScript untuk aplikasi AI Fashion Content Simulator.

// --- DOM Elements ---
const form = document.getElementById('content-form');
const generateBtn = document.getElementById('generate-btn');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const errorMessage = document.getElementById('error-message');

// Inputs
const imageInput = document.getElementById('product-image');
const imageDropZone = document.getElementById('image-drop-zone');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const productNameInput = document.getElementById('product-name');
const productTypeSelect = document.getElementById('product-type');
const customBgText = document.getElementById('custom-background-text');
const backgroundSelect = document.getElementById('background-select');
const ratioSelect = document.getElementById('ratio-select');

// Face Reference Inputs
const faceReferenceContainer = document.getElementById('face-reference-container');
const faceImageInput = document.getElementById('face-image');
const facePreviewContainer = document.getElementById('face-preview-container');
const facePreview = document.getElementById('face-preview');

// Outputs
const placeholder = document.getElementById('placeholder');
const resultsContainer = document.getElementById('results');
const generatedImage = document.getElementById('generated-image');
const tiktokCaption = document.getElementById('tiktok-caption');
const narrativeText = document.getElementById('narrative-text');
const audioPlayerMale = document.getElementById('audio-player-male');
const audioPlayerFemale = document.getElementById('audio-player-female');

// Loaders
const imageLoader = document.getElementById('image-loader');
const captionLoader = document.getElementById('caption-loader');
const narrativeLoader = document.getElementById('narrative-loader');
const audioMaleLoader = document.getElementById('audio-male-loader');
const audioFemaleLoader = document.getElementById('audio-female-loader');

// Admin Modal
const adminModal = document.getElementById('admin-modal');
const adminBtn = document.getElementById('admin-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const loginView = document.getElementById('login-view');
const settingsView = document.getElementById('settings-view');
const apiKeyInput = document.getElementById('api-key');
const saveSettingsBtn = document.getElementById('save-settings-btn');

let uploadedImageBase64 = null;
let faceReferenceBase64 = null;

// --- Event Listeners ---

// Product Image Upload
const handleProductFiles = (files) => {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImageBase64 = e.target.result.split(',')[1];
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
            errorMessage.textContent = '';
        };
        reader.readAsDataURL(file);
    }
};

imageInput.addEventListener('change', (e) => handleProductFiles(e.target.files));
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    imageDropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); });
});
['dragenter', 'dragover'].forEach(eventName => {
    imageDropZone.addEventListener(eventName, () => imageDropZone.classList.add('border-indigo-500', 'bg-indigo-50'));
});
['dragleave', 'drop'].forEach(eventName => {
    imageDropZone.addEventListener(eventName, () => imageDropZone.classList.remove('border-indigo-500', 'bg-indigo-50'));
});
imageDropZone.addEventListener('drop', (e) => handleProductFiles(e.dataTransfer.files));

// Face Image Upload
faceImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            faceReferenceBase64 = ev.target.result.split(',')[1];
            facePreview.src = ev.target.result;
            facePreviewContainer.classList.remove('hidden');
            errorMessage.textContent = '';
        };
        reader.readAsDataURL(file);
    }
});

// Toggle Face Reference Input
document.querySelectorAll('input[name="model"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'Referensi') {
            faceReferenceContainer.classList.remove('hidden');
        } else {
            faceReferenceContainer.classList.add('hidden');
            faceReferenceBase64 = null;
            facePreviewContainer.classList.add('hidden');
            faceImageInput.value = '';
        }
    });
});

// Toggle Custom Background Textarea
backgroundSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        customBgText.classList.remove('hidden');
    } else {
        customBgText.classList.add('hidden');
    }
});

// Form Submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectedConcepts = Array.from(document.querySelectorAll('input[name="concept"]:checked'));
    const selectedModel = document.querySelector('input[name="model"]:checked').value;

    if (!uploadedImageBase64 || !productNameInput.value) {
        errorMessage.textContent = 'Mohon unggah gambar produk dan isi nama produk.';
        return;
    }
    if (selectedConcepts.length === 0) {
        errorMessage.textContent = 'Mohon pilih minimal satu konsep foto.';
        return;
    }
    if (selectedModel === 'Referensi' && !faceReferenceBase64) {
         errorMessage.textContent = 'Mohon unggah foto wajah untuk referensi.';
         return;
    }

    errorMessage.textContent = '';
    await generateContent();
});

// --- Admin Modal Logic ---
adminBtn.addEventListener('click', () => adminModal.style.display = 'flex');
closeModalBtn.addEventListener('click', () => adminModal.style.display = 'none');
saveSettingsBtn.addEventListener('click', () => { 
    localStorage.setItem('geminiApiKey', apiKeyInput.value);
    adminModal.style.display = 'none'; 
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (passwordInput.value === 'admin123') {
        loginView.classList.add('hidden');
        settingsView.classList.remove('hidden');
        loginError.classList.add('hidden');
        apiKeyInput.value = localStorage.getItem('geminiApiKey') || '';
    } else {
        loginError.classList.remove('hidden');
    }
});

// On page load, check for saved API key
document.addEventListener('DOMContentLoaded', () => {
    apiKeyInput.value = localStorage.getItem('geminiApiKey') || '';
});


// --- Core AI Functions ---

function getApiKey() { 
    const key = localStorage.getItem('geminiApiKey');
    if (!key) {
        errorMessage.textContent = 'API Key belum diatur. Silakan atur di menu Admin.';
        throw new Error('API Key is not set.');
    }
    return key;
}

function setUiLoading(isLoading) {
    generateBtn.disabled = isLoading;
    if (isLoading) {
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');
        placeholder.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        [imageLoader, captionLoader, narrativeLoader, audioMaleLoader, audioFemaleLoader].forEach(el => el.style.display = 'flex');
        [generatedImage, tiktokCaption, narrativeText, audioPlayerMale, audioPlayerFemale].forEach(el => el.classList.add('hidden'));
    } else {
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
    }
}

async function generateContent() {
    try {
        getApiKey(); // Check if key exists before starting
        setUiLoading(true);

        const selectedConcepts = Array.from(document.querySelectorAll('input[name="concept"]:checked')).map(cb => cb.value);
        const modelValue = document.querySelector('input[name="model"]:checked').value;
        
        const formData = {
            productName: productNameInput.value,
            productType: productTypeSelect.value,
            concept: selectedConcepts.join(', '),
            model: modelValue,
            ratio: ratioSelect.value,
            backgroundType: backgroundSelect.value,
            customBackground: customBgText.value,
            imageBase64: uploadedImageBase64,
            faceBase64: faceReferenceBase64
        };

        const textPromise = generateText(formData);
        const imagePromise = generateImage(formData);
        const [textResult, imageResult] = await Promise.all([textPromise, imagePromise]);

        tiktokCaption.textContent = textResult.caption;
        narrativeText.textContent = textResult.script;
        captionLoader.style.display = 'none'; narrativeLoader.style.display = 'none';
        tiktokCaption.classList.remove('hidden'); narrativeText.classList.remove('hidden');

        const maleTtsPromise = generateTTS(textResult.script, 'male');
        const femaleTtsPromise = generateTTS(textResult.script, 'female');

        if (imageResult) {
            generatedImage.src = imageResult;
            generatedImage.onload = () => {
                 imageLoader.style.display = 'none';
                 generatedImage.classList.remove('hidden');
            };
        } else { throw new Error('Image generation failed.'); }
       
        const [maleAudioUrl, femaleAudioUrl] = await Promise.all([maleTtsPromise, femaleTtsPromise]);

        audioPlayerMale.src = maleAudioUrl;
        audioMaleLoader.style.display = 'none'; audioPlayerMale.classList.remove('hidden');
        
        audioPlayerFemale.src = femaleAudioUrl;
        audioFemaleLoader.style.display = 'none'; audioPlayerFemale.classList.remove('hidden');

    } catch (error) {
        console.error('Error generating content:', error);
        errorMessage.textContent = `Terjadi kesalahan: ${error.message}`;
        placeholder.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
    } finally {
        setUiLoading(false);
    }
}

async function makeApiCall(url, payload) {
     const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
     });
     if (!response.ok) {
        const errorBody = await response.json();
        console.error("API Error:", errorBody);
        throw new Error(errorBody.error?.message || `API request failed with status ${response.status}`);
     }
     return response.json();
}

async function generateImage({ productName, productType, concept, model, ratio, backgroundType, customBackground, imageBase64, faceBase64 }) {
    const conceptPrompts = {
        "Minimalis Tropis": "a minimalist tropical setting, lush green leaves, natural light, clean background",
        "Dramatik & Berani": "dramatic, high-contrast lighting, bold shadows, intense mood, with textures like smoke or fabric",
        "Elegan & Profesional": "a sophisticated indoor setting like a modern office or luxury apartment, soft and elegant lighting",
        "Urban Streetwear": "a city street, graffiti wall, neon lights, urban environment, dynamic pose",
        "Studio Minimalis": "a clean photo studio with a simple solid color background, professional studio lighting",
    };
    
    const concepts = concept.split(', ').filter(c => c);
    const backgroundDetails = concepts.map(c => conceptPrompts[c]).filter(p => p).join(', blending elements of ');
    let backgroundPrompt = backgroundDetails;
    if (backgroundType === 'custom' && customBackground) {
        backgroundPrompt = `a custom background: ${customBackground}`;
    }

    let prompt;
    const modelGender = (model === 'Wanita') ? 'female' : 'male';
    const parts = [];
    
    if (model === 'Referensi' && faceBase64) {
         prompt = `A professional fashion photograph. The model should be wearing the product from the FIRST image. The model's face MUST realistically and accurately match the face of the person in the SECOND reference image. The photo has a combined concept of "${concept}". The setting is ${backgroundPrompt}. Final image: photorealistic, high-detail, fashion editorial style. The model is an Indonesian person.`;
         parts.push({ text: prompt });
         parts.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64 } });
         parts.push({ inlineData: { mimeType: "image/jpeg", data: faceBase64 } });
    } else {
         prompt = `A professional fashion photograph of a realistic ${modelGender} Indonesian model. The model is wearing the uploaded product: a ${productName} (${productType}). The photo has a combined concept of "${concept}". The setting is ${backgroundPrompt}. The final image should be photorealistic, high-detail, fashion editorial style.`;
         parts.push({ text: prompt });
         parts.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64 } });
    }
    
    const payload = {
        contents: [{ parts: parts }],
        generationConfig: { responseModalities: ['IMAGE'], aspectRatio: ratio.replace(':', '_') },
    };
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${getApiKey()}`;
    const result = await makeApiCall(apiUrl, payload);
    const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    if (!base64Data) { throw new Error("Could not extract image data from API response."); }
    return `data:image/png;base64,${base64Data}`;
}

async function generateText({ productName, productType, concept, model }) {
    const prompt = `You are a social media manager for a fashion brand in Indonesia. Create content for the product "${productName}" (${productType}). The photo concept is "${concept}" with a ${model} model. Your tasks: 1. Create a TikTok caption (2-3 sentences, casual, persuasive, with engaging emojis, for a young Indonesian audience). 2. Create a promotional script (approx. 20 seconds, natural speaking style like a friend, suitable for a Reels/TikTok voice-over). Provide the output in JSON format with keys "caption" and "script".`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    caption: { type: "STRING", description: "A short and catchy TikTok caption." },
                    script: { type: "STRING", description: "A 20-second promotional script." }
                },
                required: ["caption", "script"]
            }
        }
    };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${getApiKey()}`;
    const result = await makeApiCall(apiUrl, payload);
    const jsonText = result.candidates[0].content.parts[0].text;
    return JSON.parse(jsonText);
}

async function generateTTS(text, gender) {
    const voiceName = gender === 'male' ? 'Kore' : 'Puck';
    const promptInstruction = gender === 'male' ? 'Say with a relaxed and confident tone' : 'Say with a gentle and energetic tone';
    
    const payload = {
        contents: [{ parts: [{ text: `${promptInstruction}: ${text}` }] }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } }
        },
        model: "gemini-2.5-flash-preview-tts"
    };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${getApiKey()}`;
    const result = await makeApiCall(apiUrl, payload);
    const part = result?.candidates?.[0]?.content?.parts?.[0];
    if (!part || !part.inlineData || !part.inlineData.data) { throw new Error(`TTS generation failed for ${gender}.`); }
    
    const audioData = part.inlineData.data;
    const mimeType = part.inlineData.mimeType;
    const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)[1], 10);
    
    const pcmData = base64ToArrayBuffer(audioData);
    const pcm16 = new Int16Array(pcmData);
    const wavBlob = pcmToWav(pcm16, 1, sampleRate);
    return URL.createObjectURL(wavBlob);
}

function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function pcmToWav(pcmData, numChannels, sampleRate) {
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length * 2, true);
    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(44 + i * 2, pcmData[i], true);
    }
    return new Blob([view], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}