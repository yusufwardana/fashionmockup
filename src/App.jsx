import React, { useState, useEffect, useCallback } from 'react';

// --- Konstanta API dan Utility Functions ---

// Gunakan kunci API kosong. Runtime akan menyediakannya.
const apiKey ="AIzaSyBEoFZw9j3Xvti1ZoHqfwqSvG1LZRskjxk";
const GEMINI_FLASH_MODEL = "gemini-2.5-flash-preview-05-20";
const GEMINI_FLASH_IMAGE_MODEL = "gemini-2.5-flash-image-preview";
const GEMINI_FLASH_TTS_MODEL = "gemini-2.5-flash-preview-tts";

const CONCEPT_OPTIONS = [
    { id: 'tropis', name: 'Minimalis Tropis', prompt_detail: 'sun-drenched, airy space with clean lines, natural textures (wood, linen), and large tropical plants (monstera, palms). Bright, filtered light.' },
    { id: 'dramatik', name: 'Dramatik & Berani', prompt_detail: 'High-contrast lighting, deep shadows, rich jewel-tone colors. Poses are powerful and dynamic. Set in a moody, artistic gallery or backdrop.' },
    { id: 'elegan', name: 'Elegan & Profesional', prompt_detail: 'Set in a sophisticated, minimalist office or modern architectural space. Neutral color palette (beige, grey, white). Model has poised, confident posture.' },
    { id: 'urban', name: 'Urban Streetwear', prompt_detail: 'Gritty city backdrop (concrete, graffiti, neon lights). Dynamic, slightly low-angle shot. Focus on layering and accessories. Model pose is cool and casual.' },
    { id: 'studio', name: 'Studio Minimalis', prompt_detail: 'Plain, seamless background (light grey or off-white). Focus entirely on the product fit and fabric texture. Clean, soft studio lighting.' },
];

const ASPECT_RATIOS = [
    { id: '1:1', name: '1:1 (Kotak)' },
    { id: '4:5', name: '4:5 (IG Portrait)' },
    { id: '16:9', name: '16:9 (YouTube/Desktop)' },
    { id: '9:16', name: '9:16 (TikTok/Reels)' },
];

/**
 * Mengubah Base64 ke ArrayBuffer untuk pemrosesan audio.
 */
const base64ToArrayBuffer = (base64) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

/**
 * Mengkonversi PCM data menjadi WAV Blob yang dapat diputar.
 */
const pcmToWav = (pcmData, sampleRate) => {
    const numChannels = 1;
    const bytesPerSample = 2; // Signed 16-bit
    const dataLength = pcmData.length * bytesPerSample;

    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // RIFF identifier 'RIFF'
    writeString(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + dataLength, true);
    // 'WAVE'
    writeString(view, 8, 'WAVE');
    // fmt chunk identifier 'fmt '
    writeString(view, 12, 'fmt ');
    // fmt chunk length (16 for PCM)
    view.setUint32(16, 16, true);
    // Sample format (1 for PCM)
    view.setUint16(20, 1, true);
    // Number of channels
    view.setUint16(22, numChannels, true);
    // Sample rate
    view.setUint32(24, sampleRate, true);
    // Byte rate (SampleRate * NumChannels * BytesPerSample)
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    // Block align (NumChannels * BytesPerSample)
    view.setUint16(32, numChannels * bytesPerSample, true);
    // Bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier 'data'
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, dataLength, true);

    // Write the PCM data
    let offset = 44;
    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(offset, pcmData[i], true);
        offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
};

const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

/**
 * Handle API calls with exponential backoff.
 */
const handleApiCall = async (fetcher, maxRetries = 3) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fetcher();
        } catch (error) {
            if (attempt === maxRetries - 1) throw error;
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
            await new Promise(res => setTimeout(res, delay));
        }
    }
};

// --- Komponen UI Pembantu ---

const LoadingIndicator = ({ text }) => (
    <div className="flex items-center justify-center text-gray-700">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="font-medium">{text}</span>
    </div>
);

const ProgressBar = ({ progress, loadingText }) => (
    <div className="w-full space-y-2">
        <div className="flex justify-between text-xs font-medium text-indigo-700">
            <span>{loadingText}</span>
            <span>{progress}%</span>
        </div>
        <div className="w-full bg-indigo-200 rounded-full h-2.5 shadow-inner">
            <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    </div>
);

const DownloadButton = ({ url, filename, label, className }) => (
    <a
        href={url}
        download={filename}
        target="_blank" 
        rel="noopener noreferrer"
        className={`flex items-center justify-center space-x-1 px-3 py-2 text-sm font-medium rounded-xl transition ${className}`}
    >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        <span>{label}</span>
    </a>
);

// Component untuk menyalin teks
const CopyButton = ({ textToCopy, label }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        // Menggunakan execCommand karena navigator.clipboard mungkin diblokir di iframe
        const el = document.createElement('textarea');
        el.value = textToCopy;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);

        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className={`flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-lg transition duration-200 ${
                copied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            }`}
        >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={copied ? "M5 13l4 4L19 7" : "M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-4m-2-5l-4-4m0 0l-4 4m4-4v11"}></path></svg>
            <span>{copied ? 'Tersalin!' : label}</span>
        </button>
    );
};

// --- Fungsi Panggilan API ---

// 1. Image-to-Image Generation (Step 2)
const fetchSingleImage = async (imageBase64, conceptPromptDetail, gender, aspectRatio) => {
    const prompt = `Generate a high-quality fashion promotional image for the uploaded product (focus on the main garment, like a shirt, dress, or pants). The model should be a person who looks like a ${gender} and styled according to the following concept description: ${conceptPromptDetail}. The model should be posing naturally in the setting. Ensure the final image looks like professional, high-end fashion photography.`;

    const fetcher = async () => {
        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: "image/png", 
                            data: imageBase64,
                        }
                    }
                ]
            }],
            // FIX: Mengubah 'config' menjadi 'generationConfig' untuk API yang benar
            generationConfig: { 
                imageGenerationConfig: {
                    aspectRatio: aspectRatio,
                }
            }
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH_IMAGE_MODEL}:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

        if (base64Data) {
            return `data:image/png;base64,${base64Data}`;
        }
        throw new Error(result?.error?.message || "Gagal menghasilkan foto produk. Coba ganti konsep atau rasio.");
    };
    return handleApiCall(fetcher);
};

// 2. Text/Content Generation (Step 3)
const llmCall = async (conceptName, modelGender, productType) => {
    const systemPrompt = "Anda adalah ahli pemasaran mode dan penulis konten kreatif. Hasilkan output dalam format JSON yang ketat. Semua teks harus dalam Bahasa Indonesia, bergaya kasual, menarik, dan persuasif, cocok untuk promosi fashion di TikTok/Instagram Reels.";
    const userQuery = `Berdasarkan foto produk (${productType}) yang dikenakan oleh model ${modelGender} dan distyling dengan konsep '${conceptName}', buatkan:\n\n1. Deskripsi Produk singkat (maksimal 3 kalimat, sertakan minimal 2 emoji yang relevan).\n2. Narasi Video promosi berdurasi sekitar 20 detik (gunakan bahasa yang mengalir, cocok untuk voice-over).`;

    const fetcher = async () => {
        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        "caption": { "type": "STRING", description: "Deskripsi produk singkat (2-3 kalimat) dengan emoji." },
                        "narasiScript": { "type": "STRING", description: "Naskah narasi video untuk voice-over (sekitar 20 detik)." }
                    },
                    required: ["caption", "narasiScript"]
                }
            }
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH_MODEL}:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (jsonText) {
            try {
                return JSON.parse(jsonText);
            } catch (e) {
                console.error("Failed to parse JSON:", jsonText);
                throw new Error("Gagal memproses respons AI untuk konten.");
            }
        }
        throw new Error(result?.error?.message || "Gagal menghasilkan konten teks. Coba lagi.");
    };
    return handleApiCall(fetcher);
};

// 3. TTS Generation (Step 5)
const ttsCall = async (narasiScript, voiceName) => {
    const fetcher = async () => {
        const payload = {
            contents: [{
                parts: [{ text: narasiScript }]
            }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName }
                    }
                }
            },
            model: GEMINI_FLASH_TTS_MODEL
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH_TTS_MODEL}:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        const part = result?.candidates?.[0]?.content?.parts?.[0];
        const audioData = part?.inlineData?.data;
        const mimeType = part?.inlineData?.mimeType;

        if (audioData && mimeType && mimeType.startsWith("audio/L16")) {
            const match = mimeType.match(/rate=(\d+)/);
            const sampleRate = match ? parseInt(match[1], 10) : 16000;
            const pcmData = base64ToArrayBuffer(audioData);
            const pcm16 = new Int16Array(pcmData);
            const wavBlob = pcmToWav(pcm16, sampleRate);
            return URL.createObjectURL(wavBlob);
        }
        throw new Error(result?.error?.message || "Gagal menghasilkan suara narasi. Coba lagi.");
    };
    return handleApiCall(fetcher);
};

// --- Komponen Utama Aplikasi ---

const App = () => {
    const [step, setStep] = useState(1);
    const [imageInput, setImageInput] = useState('');
    const [selectedConcept, setSelectedConcept] = useState(null);
    const [selectedRatio, setSelectedRatio] = useState('1:1');
    const [modelGender, setModelGender] = useState('Pria');
    const [productType, setProductType] = useState(''); 
    const [generatedImages, setGeneratedImages] = useState([]);
    const [generatedContent, setGeneratedContent] = useState(null);
    const [audioUrl, setAudioUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0); 

    const currentConcept = CONCEPT_OPTIONS.find(c => c.id === selectedConcept);

    // --- Handlers ---

    const handleImageDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageFile(files[0]);
        }
    };

    const handleImagePaste = (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
            if (item.type.indexOf("image") === 0) {
                handleImageFile(item.getAsFile());
                return;
            }
        }
    };

    const handleImageFile = (file) => {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataURL = e.target.result;
                const base64 = dataURL.split(',')[1];
                setImageInput(base64);
                resetGeneratedData();
                setStep(2); 
                setError('');
            };
            reader.readAsDataURL(file);
        }
    };
    
    const resetGeneratedData = () => {
        setGeneratedImages([]);
        setGeneratedContent(null);
        setAudioUrl('');
        setLoading(false);
        setProgress(0);
    }

    // ACTION: Generate Images (Step 2)
    const handleGenerateImages = async () => {
        if (!imageInput || !currentConcept || !productType.trim()) {
            setError("Pastikan Anda sudah mengunggah produk, memasukkan jenis produk, dan memilih konsep.");
            return;
        }

        resetGeneratedData();
        setLoading(true);
        setError('');
        setProgress(10); // Start: Initialization

        try {
            const imagePromises = Array(4).fill(null).map((_, index) => 
                fetchSingleImage(imageInput, currentConcept.prompt_detail, modelGender, selectedRatio).then(result => {
                    // Update progress after each successful image generation (10% increase per image)
                    setProgress(p => {
                        const nextProgress = p + 10;
                        return nextProgress > 50 ? 50 : nextProgress;
                    });
                    return result;
                })
            );
            
            const results = await Promise.all(imagePromises);
            setGeneratedImages(results);
            setProgress(50); // Image Phase Complete
            setStep(3); 

        } catch (e) {
            console.error(e);
            setError(e.message || "Gagal dalam proses Image-to-Image Generation. Coba ganti konsep atau rasio.");
            setProgress(0);
        } finally {
            setLoading(false);
        }
    };

    // ACTION: Generate Content (Step 3)
    const handleGenerateContent = async () => {
        if (!generatedImages.length || !currentConcept || !productType.trim()) {
            setError("Foto produk belum siap atau jenis produk belum diisi. Harap periksa Langkah 2.");
            return;
        }

        setLoading(true);
        setError('');
        setProgress(55); // Start: Content Generation (50% from images + 5% buffer)

        try {
            const content = await llmCall(currentConcept.name, modelGender, productType);
            setGeneratedContent(content);
            
            setProgress(75); // Content phase complete
            setStep(4); 

        } catch (e) {
            console.error(e);
            setError(e.message || "Gagal menghasilkan konten teks (Caption dan Narasi).");
            setProgress(50); 
        } finally {
            setLoading(false);
        }
    };

    // ACTION: Generate Voice (Step 5)
    const handleGenerateVoice = async (gender) => {
        if (!generatedContent || !generatedContent.narasiScript) {
            setError("Harap tunggu narasi video selesai dibuat terlebih dahulu (Langkah 3 & 4).");
            return;
        }

        const voiceName = gender === 'Pria' ? 'Kore' : 'Puck'; 
        
        setLoading(true);
        setError('');
        setAudioUrl(''); 
        setProgress(80); // Start: Voice Generation (75% from content + 5% buffer)
        
        try {
            const url = await ttsCall(generatedContent.narasiScript, voiceName);
            setAudioUrl(url);
            setProgress(100); // Final phase complete
            setStep(5);
        } catch (e) {
            console.error(e);
            setError(e.message || "Gagal menghasilkan audio TTS.");
            setProgress(75); 
        } finally {
            setLoading(false);
        }
    };

    const resetApp = () => {
        setStep(1);
        setImageInput('');
        setSelectedConcept(null);
        setSelectedRatio('1:1');
        setModelGender('Pria');
        setProductType('');
        resetGeneratedData();
        setError('');
    };
    
    // --- Render Components for Each Step ---

    const renderStep1 = () => (
        <div 
            className="border-4 border-dashed border-indigo-300 rounded-2xl p-6 text-center cursor-pointer transition duration-300 bg-white hover:border-indigo-500 hover:shadow-lg"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleImageDrop}
            onPaste={handleImagePaste}
        >
            <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleImageFile(e.target.files[0])} 
                className="hidden" 
                id="file-upload"
            />
            <label htmlFor="file-upload" className="block text-indigo-600 mb-2">
                <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            </label>
            <p className="text-gray-700 font-medium">Langkah 1: Upload Produk Fashion</p>
            <p className="text-sm text-gray-500 mt-1">Seret & lepas, klik untuk unggah, atau **paste (Ctrl+V/Cmd+V)** gambar.</p>
            {imageInput && (
                <div className="mt-4">
                    <p className="text-sm font-semibold text-green-600">Produk Terunggah. Lanjut ke Langkah 2!</p>
                    <img 
                        src={`data:image/png;base64,${imageInput}`} 
                        alt="Preview Produk" 
                        className="mt-2 w-20 h-20 object-cover rounded-lg mx-auto border border-gray-200 shadow-md"
                    />
                </div>
            )}
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800">Langkah 2: Konfigurasi & Generate Foto Produk</h3>

            {/* Nama Produk */}
            <div className="p-5 bg-white rounded-xl shadow-lg border border-gray-100">
                <p className="font-semibold text-indigo-700 mb-2">Jenis Produk (Wajib diisi):</p>
                <input
                    type="text"
                    placeholder="Contoh: Kemeja Oversize, Gaun Malam, Sneakers..."
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
            </div>
            
            {/* Pilihan Rasio & Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-white rounded-xl shadow-lg border border-gray-100 space-y-3">
                    <p className="font-semibold text-indigo-700">Pilih Rasio Gambar:</p>
                    <div className="grid grid-cols-4 gap-2">
                        {ASPECT_RATIOS.map((ratio) => (
                            <button
                                key={ratio.id}
                                onClick={() => setSelectedRatio(ratio.id)}
                                className={`p-2 rounded-lg text-sm transition border-2 font-medium ${
                                    selectedRatio === ratio.id
                                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md'
                                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                                }`}
                                disabled={loading}
                            >
                                {ratio.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-5 bg-white rounded-xl shadow-lg border border-gray-100 space-y-3">
                    <p className="font-semibold text-indigo-700">Pilih Model:</p>
                    <div className="flex space-x-4">
                        {['Pria', 'Wanita'].map((gender) => (
                            <label key={gender} className="flex items-center space-x-2 text-gray-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name="modelGender"
                                    value={gender}
                                    checked={modelGender === gender}
                                    onChange={() => setModelGender(gender)}
                                    className="form-radio h-4 w-4 text-indigo-600"
                                    disabled={loading}
                                />
                                <span>{gender}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pilihan Konsep */}
            <div className="p-5 bg-white rounded-xl shadow-lg border border-gray-100 space-y-3">
                <p className="font-semibold text-indigo-700">Pilih Konsep Styling:</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                    {CONCEPT_OPTIONS.map((concept) => (
                        <button
                            key={concept.id}
                            onClick={() => setSelectedConcept(concept.id)}
                            className={`p-3 rounded-xl transition duration-200 text-sm font-medium border-2 ${
                                selectedConcept === concept.id
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md'
                                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-indigo-50 hover:border-indigo-400'
                            }`}
                            disabled={loading}
                        >
                            {concept.name}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Tombol Generate */}
            {loading && progress < 50 ? (
                <div className="p-5 bg-indigo-50 rounded-xl shadow-inner">
                    <ProgressBar progress={progress} loadingText="Fase 1/3: Membuat Foto Produk AI (4 Gambar)..." />
                </div>
            ) : (
                <button
                    onClick={handleGenerateImages}
                    disabled={!imageInput || !selectedConcept || loading || !productType.trim()}
                    className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"></path></svg>
                    Generate 4 Foto Produk AI
                </button>
            )}
            
            {(currentConcept || productType) && (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-center">
                    <p className="text-sm font-semibold text-indigo-700">
                        Detail: **{productType || 'Belum Diisi'}** | Model: **{modelGender}** | Konsep: **{currentConcept?.name || 'Belum Dipilih'}**
                    </p>
                </div>
            )}
        </div>
    );

    const renderSteps3And4 = () => {
        const getAspectRatio = (ratio) => {
            const [w, h] = ratio.split(':').map(Number);
            return w / h;
        };
        const safeProductType = productType.trim().replace(/\s/g, '_').toLowerCase() || 'produk';

        return (
            <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Hasil Generate</h3>
                
                {/* Hasil Foto Produk (Langkah 2 Status) */}
                <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-100">
                    <p className="font-semibold text-indigo-600 mb-4 flex justify-between items-center">
                        <span>Foto Produk AI ({generatedImages.length} Hasil)</span>
                        {generatedImages.length > 0 && <span className="text-sm text-gray-500">Rasio: {selectedRatio}</span>}
                    </p>
                    {generatedImages.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {generatedImages.map((imgUrl, index) => (
                                <div key={index} className="space-y-2">
                                    <img 
                                        src={imgUrl} 
                                        alt={`Generated Product Photo ${index + 1}`} 
                                        className="w-full rounded-xl shadow-md object-cover"
                                        style={{ aspectRatio: getAspectRatio(selectedRatio) }}
                                    />
                                    <DownloadButton 
                                        url={imgUrl}
                                        filename={`fashion_photo_${safeProductType}_${index + 1}.png`}
                                        label="Unduh Foto"
                                        className="w-full bg-indigo-500 text-white hover:bg-indigo-600"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                            {loading ? <LoadingIndicator text="Menunggu Foto Produk..." /> : "Foto belum digenerate. Lanjut ke Langkah 2."}
                        </div>
                    )}
                </div>

                {/* Tombol Generate Content (Langkah 3 Action) */}
                {generatedImages.length > 0 && !generatedContent && (
                    <div className="p-5 bg-white rounded-xl shadow-lg border border-gray-100">
                        <p className="font-semibold text-indigo-700 mb-3">Langkah 3: Generate Deskripsi dan Narasi (Text)</p>
                        {loading && progress > 50 && progress < 75 ? (
                            <div className="p-2 bg-indigo-50 rounded-xl shadow-inner">
                                <ProgressBar progress={progress} loadingText="Fase 2/3: Membuat Konten Teks (Caption & Narasi)..." />
                            </div>
                        ) : (
                            <button
                                onClick={handleGenerateContent}
                                disabled={loading}
                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zm6 8a6 6 0 11-12 0 6 6 0 0112 0zm-1.5 0a4.5 4.5 0 10-9 0 4.5 4.5 0 009 0zM10 15a1 1 0 00-1 1v1a1 1 0 002 0v-1a1 1 0 00-1-1z" /></svg>
                                Lanjutkan ke Generate Konten Teks
                            </button>
                        )}
                    </div>
                )}


                {/* Deskripsi Produk (Langkah 3 Display) & Narasi Video (Langkah 4 Display) */}
                {generatedContent && (
                    <div className="space-y-4">
                        <p className="text-lg font-semibold text-gray-800 border-b pb-1">Konten Teks Siap (Langkah 3 & 4)</p>
                        
                        {/* Caption Block */}
                        <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-100">
                            <div className="flex justify-between items-center mb-2">
                                <p className="font-semibold text-indigo-600">Deskripsi Produk (Caption)</p>
                                <CopyButton textToCopy={generatedContent.caption} label="Salin Caption" />
                            </div>
                            <p className="text-gray-700 p-3 bg-gray-50 border border-gray-200 rounded-lg whitespace-pre-wrap">{generatedContent.caption}</p>
                        </div>

                        {/* Narasi Block */}
                        <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-100">
                            <div className="flex justify-between items-center mb-2">
                                <p className="font-semibold text-indigo-600">Narasi Video ($\pm$20 Detik)</p>
                                <CopyButton textToCopy={generatedContent.narasiScript} label="Salin Narasi" />
                            </div>
                            <p className="text-gray-700 p-3 bg-gray-50 border border-gray-200 rounded-lg whitespace-pre-wrap">{generatedContent.narasiScript}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    };
    
    const renderStep5 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Langkah 5: Generate Suara (Voice-Over)</h3>
            
            {loading && progress > 75 && progress < 100 ? (
                <div className="p-5 bg-indigo-50 rounded-xl shadow-inner">
                    <ProgressBar progress={progress} loadingText="Fase 3/3: Membuat Voice-Over Audio..." />
                </div>
            ) : (
                <div className="flex space-x-3">
                    <button
                        onClick={() => handleGenerateVoice('Pria')}
                        disabled={!generatedContent || loading}
                        className="flex-1 py-3 px-4 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        Suara Pria
                    </button>
                    <button
                        onClick={() => handleGenerateVoice('Wanita')}
                        disabled={!generatedContent || loading}
                        className="flex-1 py-3 px-4 bg-pink-600 text-white font-bold rounded-xl shadow-lg hover:bg-pink-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                    
                        Suara Wanita
                    </button>
                </div>
            )}
            
            {audioUrl && (
                <div className="mt-4 p-5 bg-green-50 rounded-xl border border-green-200 shadow-md">
                    <p className="font-semibold text-green-700 mb-2">Voice-Over Siap! 🎉</p>
                    <div className="flex flex-col space-y-3">
                        <audio controls src={audioUrl} className="w-full"></audio>
                        <DownloadButton 
                            url={audioUrl}
                            filename={`narasi_video_${productType.trim().replace(/\s/g, '_').toLowerCase() || 'produk'}.wav`}
                            label="Unduh Audio Narasi (.wav)"
                            className="bg-green-600 text-white hover:bg-green-700"
                        />
                    </div>
                </div>
            )}
        </div>
    );
    
    // --- Main Render Logic ---

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 font-sans">
            <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-2xl space-y-8">
                <header className="text-center border-b pb-4">
                    <h1 className="text-3xl font-extrabold text-indigo-700">Fashion Content AI Studio</h1>
                    <p className="text-gray-500 mt-1">Buat foto, deskripsi, narasi, dan voice-over promosi lengkap.</p>
                </header>

                {/* Display Error Message */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative shadow-md" role="alert">
                        <strong className="font-bold">Perhatian:</strong>
                        <span className="block sm:inline ml-2">{error}</span>
                    </div>
                )}
                
                {/* Step Navigation/Status */}
                <div className="flex justify-between items-center text-center px-2">
                    {[
                        { num: 1, title: "Upload" },
                        { num: 2, title: "Foto AI" },
                        { num: 3, title: "Deskripsi" },
                        { num: 4, title: "Narasi" },
                        { num: 5, title: "Suara" },
                    ].map((s) => (
                        <div key={s.num} className="flex-1">
                            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-white transition duration-300 shadow-md ${
                                s.num === step 
                                    ? 'bg-indigo-600' : s.num < step 
                                    ? 'bg-green-500' : 'bg-gray-300'
                            }`}>
                                {s.num}
                            </div>
                            <p className={`text-xs mt-1 transition duration-300 ${s.num <= step ? 'text-indigo-600 font-semibold' : 'text-gray-500'}`}>{s.title}</p>
                        </div>
                    ))}
                </div>

                {/* Content based on Step */}
                <div className="space-y-6">
                    {/* Step 1: Upload */}
                    {step < 3 && renderStep1()}
                    
                    {/* Step 2: Configuration & Image Generation */}
                    {step < 3 && imageInput && renderStep2()}
                    
                    {/* Steps 3, 4, & 5: Content Display and Generation Actions */}
                    {(step >= 3 || generatedImages.length > 0) && renderSteps3And4()}

                    {/* Step 5: Voice Generation - only available when content is ready */}
                    {generatedContent && renderStep5()}
                </div>
                
                <div className="pt-4 border-t flex justify-end">
                    <button
                        onClick={resetApp}
                        className="py-2 px-4 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition shadow-sm"
                    >
                        Mulai Baru
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;