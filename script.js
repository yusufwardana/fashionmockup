// --- DOM Elements ---
const form = document.getElementById('content-form');
const generateFotoBtn = document.getElementById('generate-foto-btn');
const btnSpinner = document.getElementById('btn-spinner');
const errorMessage = document.getElementById('error-message');

// Input Elements
const imageInput = document.getElementById('product-image');
const imageDropZone = document.getElementById('image-drop-zone');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const productNameInput = document.getElementById('product-name');
const productTypeSelect = document.getElementById('product-type');
const customBgText = document.getElementById('custom-background-text');
const backgroundSelect = document.getElementById('background-select');
const faceReferenceContainer = document.getElementById('face-reference-container');
const faceImageInput = document.getElementById('face-image');
const facePreviewContainer = document.getElementById('face-preview-container');
const facePreview = document.getElementById('face-preview');

// Output Sections and Containers
const placeholder = document.getElementById('placeholder');
const imageResultSection = document.getElementById('image-result-section');
const generatedImage = document.getElementById('generated-image');
const imageLoader = document.getElementById('image-loader');
const manualControls = document.getElementById('manual-controls');

// Manual Control Buttons
const generateDeskripsiBtn = document.getElementById('generate-deskripsi-btn');
const generateNarasiBtn = document.getElementById('generate-narasi-btn');
const generatePromptBtn = document.getElementById('generate-prompt-btn');
const generateAudioBtn = document.getElementById('generate-audio-btn');
const copyPromptBtn = document.getElementById('copy-prompt-btn');

// Manual Control Result Sections
const deskripsiResultSection = document.getElementById('deskripsi-result-section');
const narasiResultSection = document.getElementById('narasi-result-section');
const promptResultSection = document.getElementById('prompt-result-section');
const audioResultSection = document.getElementById('audio-result-section');

// Manual Control Loaders and Content
const captionLoader = document.getElementById('caption-loader');
const tiktokCaption = document.getElementById('tiktok-caption');
const narrativeLoader = document.getElementById('narrative-loader');
const narrativeText = document.getElementById('narrative-text');
const promptLoader = document.getElementById('prompt-loader');
const promptContent = document.getElementById('prompt-content');
const videoPrompt = document.getElementById('video-prompt');
const audioMaleLoader = document.getElementById('audio-male-loader');
const audioPlayerMale = document.getElementById('audio-player-male');
const audioFemaleLoader = document.getElementById('audio-female-loader');
const audioPlayerFemale = document.getElementById('audio-player-female');

// Admin Modal Elements
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

// State Variables
let uploadedImageBase64 = null;
let faceReferenceBase64 = null;
let currentFormData = null;

// --- Helper Functions ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const toggleSectionLoading = (button, loader, contentSection, isLoading) => {
    if (button) button.disabled = isLoading;
    if (isLoading) {
        loader.style.display = 'block';
        if (contentSection) contentSection.style.display = 'none';
    } else {
        loader.style.display = 'none';
        if (contentSection) contentSection.style.display = 'block';
    }
};

// --- Event Listeners ---
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
imageDropZone.addEventListener('drop', (e) => handleProductFiles(e.dataTransfer.files));

faceImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            faceReferenceBase64 = ev.target.result.split(',')[1];
            facePreview.src = ev.target.result;
            facePreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

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

backgroundSelect.addEventListener('change', (e) => {
    customBgText.classList.toggle('hidden', e.target.value !== 'custom');
});

// Main form submission for generating the image
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
    
    currentFormData = {
        productName: productNameInput.value,
        productType: productTypeSelect.value,
        concept: selectedConcepts.map(cb => cb.value).join(', '),
        model: selectedModel,
        backgroundType: backgroundSelect.value,
        customBackground: customBgText.value,
        imageBase64: uploadedImageBase64,
        faceBase64: faceReferenceBase64
    };

    try {
        const currentApiKey = getApiKey();
        generateFotoBtn.disabled = true;
        btnSpinner.classList.remove('hidden');
        placeholder.classList.add('hidden');
        manualControls.classList.add('hidden');
        imageResultSection.classList.remove('hidden');
        imageLoader.style.display = 'flex';
        generatedImage.classList.add('hidden');

        const imageResult = await generateImage(currentFormData, currentApiKey);

        if (imageResult) {
            generatedImage.src = imageResult;
            generatedImage.onload = () => {
                imageLoader.style.display = 'none';
                generatedImage.classList.remove('hidden');
                manualControls.classList.remove('hidden'); // Show next steps
            };
        } else {
            throw new Error('Gagal membuat gambar.');
        }

    } catch (error) {
        errorMessage.textContent = `Error: ${error.message}`;
        imageResultSection.classList.add('hidden');
        placeholder.classList.remove('hidden');
    } finally {
        generateFotoBtn.disabled = false;
        btnSpinner.classList.add('hidden');
    }
});


// --- Event Listeners for Manual Controls ---
generateDeskripsiBtn.addEventListener('click', async () => {
    deskripsiResultSection.classList.remove('hidden');
    toggleSectionLoading(generateDeskripsiBtn, captionLoader, tiktokCaption, true);
    try {
        const result = await generateCaption(currentFormData, getApiKey());
        tiktokCaption.textContent = result;
    } catch (error) {
        tiktokCaption.textContent = `Gagal membuat deskripsi: ${error.message}`;
    } finally {
        toggleSectionLoading(generateDeskripsiBtn, captionLoader, tiktokCaption, false);
    }
});

generateNarasiBtn.addEventListener('click', async () => {
    narasiResultSection.classList.remove('hidden');
    toggleSectionLoading(generateNarasiBtn, narrativeLoader, narrativeText, true);
    try {
        const result = await generateNarrative(currentFormData, getApiKey());
        narrativeText.textContent = result;
        generateAudioBtn.disabled = false; // Enable audio generation
    } catch (error) {
        narrativeText.textContent = `Gagal membuat narasi: ${error.message}`;
    } finally {
        toggleSectionLoading(generateNarasiBtn, narrativeLoader, narrativeText, false);
    }
});

generatePromptBtn.addEventListener('click', async () => {
    promptResultSection.classList.remove('hidden');
    toggleSectionLoading(generatePromptBtn, promptLoader, promptContent, true);
    try {
        const result = await generateVideoPrompt(currentFormData, getApiKey());
        videoPrompt.value = result;
    } catch (error) {
        videoPrompt.value = `Gagal membuat prompt: ${error.message}`;
    } finally {
        toggleSectionLoading(generatePromptBtn, promptLoader, promptContent, false);
    }
});

copyPromptBtn.addEventListener('click', () => {
    videoPrompt.select();
    document.execCommand('copy');
    copyPromptBtn.textContent = 'Tersalin!';
    setTimeout(() => { copyPromptBtn.textContent = 'Salin Teks'; }, 2000);
});

generateAudioBtn.addEventListener('click', async () => {
    audioResultSection.classList.remove('hidden');
    generateAudioBtn.disabled = true;
    audioMaleLoader.style.display = 'block';
    audioFemaleLoader.style.display = 'block';
    audioPlayerMale.classList.add('hidden');
    audioPlayerFemale.classList.add('hidden');

    const script = narrativeText.textContent;
    if (!script || script.startsWith('Gagal')) {
        errorMessage.textContent = "Tidak ada narasi valid untuk dibuat audio.";
        return;
    }

    try {
        const [maleAudioUrl, femaleAudioUrl] = await Promise.all([
            generateTTS(script, 'male', getApiKey()),
            generateTTS(script, 'female', getApiKey())
        ]);
        
        audioPlayerMale.src = maleAudioUrl;
        audioMaleLoader.style.display = 'none';
        audioPlayerMale.classList.remove('hidden');

        audioPlayerFemale.src = femaleAudioUrl;
        audioFemaleLoader.style.display = 'none';
        audioPlayerFemale.classList.remove('hidden');
    } catch (error) {
        errorMessage.textContent = `Gagal membuat audio: ${error.message}`;
        audioMaleLoader.style.display = 'none';
        audioFemaleLoader.style.display = 'none';
    }
});


// --- Admin Modal Logic ---
adminBtn.addEventListener('click', () => {
    passwordInput.value = '';
    loginError.classList.add('hidden');
    loginView.classList.remove('hidden');
    settingsView.classList.add('hidden');
    adminModal.style.display = 'flex';
});

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
document.addEventListener('DOMContentLoaded', () => {
    apiKeyInput.value = localStorage.getItem('geminiApiKey') || '';
});


// --- Core AI Functions ---
async function makeApiCall(url, payload) {
     const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
     });
     if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error?.message || `API request failed: ${response.status}`);
     }
     return response.json();
}

async function generateImage({ imageBase64, faceBase64, productName, productType, concept, model, backgroundType, customBackground }, currentApiKey) {
    const conceptPrompts = {
        "Minimalis Tropis": "a minimalist tropical setting, lush green leaves, natural light",
        "Dramatik & Berani": "dramatic, high-contrast lighting, bold shadows, intense mood",
        "Elegan & Profesional": "a sophisticated indoor setting, soft and elegant lighting",
        "Urban Streetwear": "a city street, graffiti wall, neon lights, dynamic pose",
        "Studio Minimalis": "a clean photo studio with a simple solid color background",
    };
    const backgroundDetails = concept.split(', ').map(c => conceptPrompts[c]).filter(Boolean).join(', blending elements of ');
    let backgroundPrompt = backgroundType === 'custom' && customBackground ? `a custom background: ${customBackground}` : backgroundDetails;

    const modelGender = (model === 'Wanita') ? 'female' : 'male';
    const ratioInstruction = "The final image must have a 9:16 aspect ratio.";
    let prompt;
    const parts = [];

    if (model === 'Referensi' && faceBase64) {
         prompt = `Professional fashion photo. A model wearing the product from the FIRST image. The model's face MUST realistically match the person in the SECOND reference image. Concept: "${concept}". Setting: ${backgroundPrompt}. Style: photorealistic, high-detail, Indonesian model. ${ratioInstruction}`;
         parts.push({ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }, { inlineData: { mimeType: "image/jpeg", data: faceBase64 } });
    } else {
         prompt = `Professional fashion photo of a realistic ${modelGender} Indonesian model wearing the uploaded ${productType} product. Concept: "${concept}". Setting: ${backgroundPrompt}. Style: photorealistic, high-detail. ${ratioInstruction}`;
         parts.push({ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: imageBase64 } });
    }
    
    const payload = { contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'] } };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${currentApiKey}`;
    const result = await makeApiCall(apiUrl, payload);
    const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    if (!base64Data) throw new Error("Could not extract image data from API response.");
    return `data:image/png;base64,${base64Data}`;
}

async function generateCaption({ productName, concept }, currentApiKey) {
    const prompt = `Buatkan caption TikTok (2-3 kalimat, casual, persuasif, dengan emoji) untuk produk "${productName}" dengan konsep foto "${concept}" untuk audiens muda Indonesia.`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${currentApiKey}`;
    const result = await makeApiCall(apiUrl, payload);
    return result.candidates[0].content.parts[0].text;
}

async function generateNarrative({ productName, concept }, currentApiKey) {
    const prompt = `Buatkan narasi promosi (sekitar 20 detik, gaya bicara natural seperti teman) untuk voice-over video TikTok/Reels. Produknya adalah "${productName}" dengan konsep visual "${concept}".`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${currentApiKey}`;
    const result = await makeApiCall(apiUrl, payload);
    return result.candidates[0].content.parts[0].text;
}

async function generateVideoPrompt({ productName, concept }, currentApiKey) {
    const prompt = `Berikan 3 ide prompt video pendek yang kreatif dalam format daftar bernomor untuk promosi TikTok/Reels. Produknya adalah "${productName}" dengan konsep "${concept}". Setiap prompt harus menjelaskan adegan dan angle kamera secara singkat.`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${currentApiKey}`;
    const result = await makeApiCall(apiUrl, payload);
    return result.candidates[0].content.parts[0].text;
}

async function generateTTS(text, gender, currentApiKey) {
    const voiceName = gender === 'male' ? 'Kore' : 'Puck';
    const promptInstruction = gender === 'male' ? 'Katakan dengan nada santai dan percaya diri' : 'Katakan dengan nada lembut dan bersemangat';
    const payload = {
        contents: [{ parts: [{ text: `${promptInstruction}: ${text}` }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
        model: "gemini-2.5-flash-preview-tts"
    };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${currentApiKey}`;
    const result = await makeApiCall(apiUrl, payload);
    const part = result?.candidates?.[0]?.content?.parts?.[0];
    if (!part?.inlineData?.data) throw new Error(`TTS generation failed for ${gender}.`);
    
    const sampleRate = parseInt(part.inlineData.mimeType.match(/rate=(\d+)/)[1], 10);
    const pcmData = base64ToArrayBuffer(part.inlineData.data);
    const pcm16 = new Int16Array(pcmData);
    const wavBlob = pcmToWav(pcm16, 1, sampleRate);
    return URL.createObjectURL(wavBlob);
}

// --- Utility Functions for Audio ---
function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
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
    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
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