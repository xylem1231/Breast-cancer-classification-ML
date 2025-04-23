// =============================================
// DOM Elements Initialization
// =============================================
const elements = {
    chatHistory: document.getElementById('chatHistory'),
    messageInput: document.getElementById('messageInput'),
    sendButton: document.getElementById('sendMessageBtn'),
    voiceButton: document.getElementById('voiceInputBtn'),
    quickButtons: document.querySelectorAll('.quick-btn'),
    exportButton: document.getElementById('exportChatBtn'),
    clearButton: document.getElementById('clearChatBtn'),
    reportButton: document.getElementById('reportBtn'), // Added this line
    medicalModeButton: document.getElementById('medicalModeBtn'),
    loadPatientButton: document.getElementById('loadPatientBtn'),
    patientDisplay: {
        name: document.getElementById('displayName'),
        age: document.getElementById('displayAge'),
        gender: document.getElementById('displayGender'),
        familyHistory: document.getElementById('displayFamilyHistory'),
        previousCancer: document.getElementById('displayPreviousCancer'),
        diagnosis: document.getElementById('displayDiagnosis')
    },
    healthChart: document.getElementById('healthChart'),
    showMetricsButton: document.getElementById('showMetricsButton'),
    healthMetricsExplanation: document.getElementById('healthMetricsExplanation'),
    modalMetricsContent: document.getElementById('modalMetricsContent')
};

// =============================================
// Application State Management
// =============================================
const state = {
    patientData: null,
    medicalMode: true,
    messages: [],
    recognition: null,
    chart: null,
    isRefreshingData: false,
    userHasScrolled: false
};

// =============================================
// OpenRouter API Key Initialization
// =============================================
let OPENROUTER_API_KEY = 'sk-or-v1-b79e9fa025e45861840f5fe738dfc9a8958181174ef8d1d18241f9b72bf5c81f4';

const customFAQs = {
    "what is breast cancer": "Breast cancer is a disease where cells in the breast grow out of control. It can begin in different parts of the breast and may spread to other parts of the body if not treated.",
    "what is malignant cancer": "Malignant cancer refers to cancerous tumors that can invade nearby tissue and spread to other parts of the body.",
    "what is benign cancer": "Benign tumors are non-cancerous and do not spread to other parts of the body. They are usually not life-threatening.",
    "does my age impact the diagnosis": "Yes, age can influence your breast cancer risk. The risk increases with age, especially after 45.",
    "did i get cancer because i am over 45": "Being over 45 can increase the risk, but it’s not the only cause. Lifestyle, genetics, and other factors also play a role.",
    "does my work pressure cause me the diagnosis": "Chronic stress may affect overall health, but there is no strong evidence directly linking work stress to breast cancer.",
    "what is a healthy diet for my breast cancer": "A balanced diet rich in fruits, vegetables, whole grains, lean proteins, and low in processed foods can support your health during treatment.",
    "what mental health support is available": "Counseling, support groups, mindfulness, and talking with a therapist can help manage the emotional stress of breast cancer.",
    "how do i cope emotionally": "Coping strategies include talking to loved ones, joining a support group, practicing relaxation techniques, and seeking professional help.",
    "can men get breast cancer": "Yes, men can get breast cancer, although it's much less common than in women.",
    "is it my fault i got cancer": "No. Cancer is caused by complex factors, including genetics, and it's not your fault.",
    "what foods should i avoid with breast cancer": "Try to limit processed meats, high-sugar foods, alcohol, and highly processed snacks. Focus on whole foods instead.",
    "how does menopause affect risk": "Early or late menopause can affect hormone levels, which may slightly impact breast cancer risk."
};


// =============================================
// Core Initialization Functions
// =============================================

/**
 * Initialize the application
 */
async function init() {
    try {
        console.log("Using direct OpenRouter API key...");

// Check for Web Speech API support
if ('webkitSpeechRecognition' in window) {
    state.recognition = new webkitSpeechRecognition();
    // Remove these old settings:
    // state.recognition.continuous = false;
    // state.recognition.interimResults = false;
    setupVoiceRecognition(); // This will now set the enhanced settings
} else {
    elements.voiceButton.disabled = true;
    elements.voiceButton.title = "Voice input not supported in your browser";
}
} catch (error) {
    console.error("Init failed:", error);
    addBotMessage("⚠️ Failed to initialize AI features. Using medical mode only.");
    state.medicalMode = true; // Force medical mode
}
}

/**
 * Asynchronous function to load patient data from API
 */
async function loadInitialPatientData() {
    try {
        const response = await fetch('/api/refresh-patient-data');
        if (!response.ok) throw new Error('No patient data found');

        state.patientData = await response.json();
        updatePatientDisplay();
        updateHealthChart(state.patientData);
        
        // Only show welcome message on initial load
        generateWelcomeMessage();
    } catch (error) {
        console.error('Error loading patient data:', error);
        addBotMessage("Welcome! I'm your Breast Cancer Assistant. How can I help you today?");
    }
}

// =============================================
// Patient Data Display Functions
// =============================================

/**
 * Function to update patient details in the UI
 */
function updatePatientDisplay() {
    if (state.patientData) {
        elements.patientDisplay.name.textContent = state.patientData.name || 'N/A';
        elements.patientDisplay.age.textContent = state.patientData.age || 'N/A';
        elements.patientDisplay.gender.textContent = state.patientData.gender || 'N/A';
        elements.patientDisplay.familyHistory.textContent = state.patientData.family_history || 'N/A';
        elements.patientDisplay.previousCancer.textContent = state.patientData.previous_cancer || 'N/A';
        elements.patientDisplay.diagnosis.textContent = state.patientData.diagnosis || 'Pending';
    }
}

/**
 * Function to generate welcome message based on patient data
 */
function generateWelcomeMessage() {
    if (state.patientData && state.patientData.name) {
        addBotMessage(`Hello ${state.patientData.name}, welcome back! How can I assist you today?`);
    } else {
        addBotMessage("Welcome! I'm your Breast Cancer Assistant. How can I help you today?");
    }
}

// =============================================
// Patient Data Management Functions
// =============================================

/**
 * Refresh patient data from server
 */
async function refreshPatientData() {
    if (state.isRefreshingData) return;
    
    state.isRefreshingData = true;
    const btn = elements.loadPatientButton;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Refreshing...';
        btn.disabled = true;

        const response = await fetch('/api/refresh-patient-data');
        if (!response.ok) throw new Error('Failed to fetch patient data');
        
        state.patientData = await response.json();
        updatePatientDisplay();

        addBotMessage("Patient data refreshed successfully.");
    } catch (error) {
        console.error('Error refreshing patient data:', error);
        addBotMessage("Failed to refresh patient data. Please try again.");
    } finally {
        btn.innerHTML = '<i class="fas fa-sync me-2"></i> Refresh Patient Data';
        btn.disabled = false;
        state.isRefreshingData = false;
    }
}

// =============================================
// Event Handling Functions
// =============================================

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Send message on button click or Enter key
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // Send message if there's content, regardless of whether it came from voice or typing
            if (elements.messageInput.value.trim()) {
                sendMessage();
            }
        }
    });
    
    elements.reportButton.addEventListener('click', generatePDFReport);
    
    elements.quickButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            if (!action) {
                console.error('Button missing data-action attribute:', e.currentTarget);
                return;
            }
            handleQuickAction(action);
        });
    });

    function handleQuickAction(action) {
        let question = "";
        switch(action) {
            case 'symptoms':
                question = "What symptoms should I be aware of based on my diagnosis?";
                break;
            case 'treatments':
                question = "What treatment options are available for my condition?";
                break;
            case 'diagnosis':
                question = "Can you explain my diagnosis in detail?";
                break;
        }
        
        addUserMessage(question);
        
        setTimeout(() => {
            switch(action) {
                case 'symptoms':
                    addBotMessage(getEnhancedSymptomsResponse());
                    break;
                case 'treatments':
                    addBotMessage(getEnhancedTreatmentsResponse());
                    break;
                case 'diagnosis':
                    addBotMessage(getEnhancedDiagnosisResponse());
                    break;
            }
        }, 500);
    }

    // Add this for the metrics modal
    document.querySelector('.metrics-more-info').addEventListener('click', async function() {
        if (state.patientData) {
            const modalContent = document.getElementById('modalMetricsContent');
            modalContent.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p>Loading detailed metrics...</p>
                </div>
            `;
            
            try {
                const explanation = await explainMetrics(state.patientData);
                modalContent.innerHTML = explanation;
            } catch (error) {
                modalContent.innerHTML = `
                    <div class="alert alert-danger">
                        Failed to load metrics: ${error.message}
                    </div>
                `;
            }
        }
    });

    // Voice input
    elements.voiceButton.addEventListener('click', toggleVoiceRecognition);

    // Chat controls
    elements.exportButton.addEventListener('click', exportChat);
    elements.clearButton.addEventListener('click', clearChat);
    elements.medicalModeButton.addEventListener('click', toggleMedicalMode);
    elements.loadPatientButton.addEventListener('click', refreshPatientData);
}

// =============================================
// Voice Recognition Functions
// =============================================

/**
 * Voice recognition setup
 */
function setupVoiceRecognition() {
    state.recognition.continuous = false;
    state.recognition.interimResults = true;
    state.recognition.maxAlternatives = 3; // Get more alternatives for better accuracy
    
    // Set language and grammar for better medical term recognition
    state.recognition.lang = 'en-US';
    // state.recognition.grammars = ... (you could add a medical grammar list if needed)
    
    state.recognition.onstart = () => {
        elements.voiceButton.classList.add('listening');
        elements.messageInput.placeholder = "Listening... Speak now";
    };
    
    state.recognition.onend = () => {
        elements.voiceButton.classList.remove('listening');
        elements.messageInput.placeholder = "Type your message...";
        if (state.recognitionTimeout) {
            clearTimeout(state.recognitionTimeout);
        }
    };
    
    state.recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        // Clear any existing timeout since we got results
        if (state.recognitionTimeout) {
            clearTimeout(state.recognitionTimeout);
        }
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Always show interim results immediately
        if (interimTranscript) {
            elements.messageInput.value = interimTranscript;
        }
        
        // When final result is ready, use the most confident alternative
        if (finalTranscript) {
            // Get the most confident alternative
            const bestAlternative = Array.from(event.results)
                .filter(r => r.isFinal)
                .flatMap(r => Array.from(r))
                .reduce((best, current) => 
                    current.confidence > (best?.confidence || 0) ? current : best
                );
            
            elements.messageInput.value = bestAlternative.transcript;
        }
    };
    
    state.recognition.onerror = (event) => {
        let errorMessage = "Voice input error: ";
        switch(event.error) {
            case 'no-speech':
                errorMessage += "No speech detected. Please try again.";
                break;
            case 'audio-capture':
                errorMessage += "Microphone access denied. Please check permissions.";
                break;
            case 'not-allowed':
                errorMessage += "Microphone access blocked. Please enable in browser settings.";
                break;
            default:
                errorMessage += "Please try again or type your question.";
        }
        
        addBotMessage(errorMessage);
        elements.voiceButton.classList.remove('listening');
        elements.messageInput.placeholder = "Type your message...";
    };
}

/**
 * Toggle voice recognition
 */
function toggleVoiceRecognition() {
    if (state.recognition && elements.voiceButton.classList.contains('listening')) {
        state.recognition.stop();
        return;
    }
    
    try {
        elements.messageInput.placeholder = "Listening... Speak now";
        
        // Clear any previous messages from the assistant about listening
        const lastBotMessage = [...elements.chatHistory.querySelectorAll('.bot-message')].pop();
        if (lastBotMessage && lastBotMessage.textContent.includes("I'm listening")) {
            elements.chatHistory.removeChild(lastBotMessage);
        }
        
        // Add immediate visual feedback
        const listeningIndicator = document.createElement('div');
        listeningIndicator.classList.add('listening-indicator');
        listeningIndicator.innerHTML = `
            <div class="listening-pulse"></div>
            <span>Speak now</span>
        `;
        elements.chatHistory.appendChild(listeningIndicator);
        
        // Start recognition
        state.recognition.start();
        elements.voiceButton.classList.add('listening');
        
        // Scroll to show the indicator
        elements.chatHistory.scrollTo({
            top: elements.chatHistory.scrollHeight,
            behavior: 'smooth'
        });
        
        // Remove the indicator after a short delay
        setTimeout(() => {
            if (listeningIndicator.parentNode) {
                elements.chatHistory.removeChild(listeningIndicator);
            }
        }, 2000);

        // Add this when starting recording
        const feedback = document.createElement('div');
        feedback.className = 'listening-feedback';
        feedback.innerHTML = '<span>Recording...</span>';
        document.body.appendChild(feedback);

        // Add this when stopping recording
        const existingFeedback = document.querySelector('.listening-feedback');
        if (existingFeedback) {
            existingFeedback.classList.add('fade-out');
            setTimeout(() => existingFeedback.remove(), 300);
        }
        
        // Timeout if no speech detected (increased to 10 seconds)
        state.recognitionTimeout = setTimeout(() => {
            if (elements.voiceButton.classList.contains('listening') && 
                !elements.messageInput.value) {
                state.recognition.stop();
                addBotMessage("Listening timed out. Please click the microphone button again when ready.");
            }
        }, 10000); // 10 second timeout
        
    } catch (error) {
        console.error('Voice recognition error:', error);
        addBotMessage("Voice input failed. Please check your microphone and try again.");
        elements.voiceButton.classList.remove('listening');
    }
}

// =============================================
// Chat Message Handling Functions
// =============================================

/**
 * Send message handler
 */
function sendMessage() {
    const messageText = elements.messageInput.value.trim();
    if (!messageText) return;

    addUserMessage(messageText);
    elements.messageInput.value = '';

    // Check which mode is active
    if (state.medicalMode) {
        // Use existing medical response system
        setTimeout(() => {
            const response = generateResponse(messageText);
            addBotMessage(response);
        }, 500);
    } else {
        // Use OpenRouter API
        sendToOpenRouter(messageText);
    }
}

/**
 * Add user message to chat
 */
function addUserMessage(text) {
    const message = {
        sender: 'user',
        text: text,
        timestamp: new Date()
    };
    state.messages.push(message);
    renderMessage(message);
    
    // Smooth scroll to bottom
    setTimeout(() => {
        elements.chatHistory.scrollTo({
            top: elements.chatHistory.scrollHeight,
            behavior: 'smooth'
        });
    }, 50);
}

/**
 * Add bot message to chat with word-by-word typing animation
 */
function addBotMessage(text) {
    const message = {
        sender: 'bot',
        text: text,
        timestamp: new Date()
    };
    state.messages.push(message);

    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'bot-message');

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.innerHTML = '';

    const messageTime = document.createElement('div');
    messageTime.classList.add('message-time');
    messageTime.textContent = message.timestamp.toLocaleTimeString();

    const cursor = document.createElement('span');
    cursor.classList.add('typing-cursor');
    cursor.textContent = '|';
    messageContent.appendChild(cursor);

    messageElement.appendChild(messageContent);
    messageElement.appendChild(messageTime);
    elements.chatHistory.appendChild(messageElement);
    
    // Initial scroll
elements.chatHistory.scrollTo({
    top: elements.chatHistory.scrollHeight,
    behavior: 'auto'
});

// Detect manual scrolling
elements.chatHistory.addEventListener('scroll', () => {
    const threshold = 100; // pixels from bottom
    userHasScrolled = elements.chatHistory.scrollTop + elements.chatHistory.clientHeight < 
                     elements.chatHistory.scrollHeight - threshold;
});

    // Convert plain text to clean HTML (remove markdown, format spacing and bullets)
    const formattedText = text
    .replace(/^#+\s*/gm, '')                       // Remove markdown headers like #, ##, ###
    .replace(/^\*\s*/gm, '• ')                     // Convert * bullets to •
    .replace(/^\d+\.\s*/gm, '• ')                  // Convert numbered bullets to •
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')           // Remove bold-italic markdown
    .replace(/\*\*(.*?)\*\*/g, '$1')               // Remove bold markdown
    .replace(/\*(.*?)\*/g, '$1')                   // Remove italic markdown
    .replace(/•\s*\*/g, '• ')                      // Fix bullets like "• *text"
    .replace(/\n/g, '<br>');                       // Preserve line breaks exactly  

    // Typing animation
typeTextSmooth(messageContent, cursor, formattedText, 10, () => {
    if (!userHasScrolled) {
        elements.chatHistory.scrollTo({
            top: elements.chatHistory.scrollHeight,
            behavior: 'smooth'
        });
    }
});

    // Modified scroll interval that respects user scrolling
const scrollInterval = setInterval(() => {
    if (!messageContent.querySelector('.typing-cursor')) {
        clearInterval(scrollInterval);
    } else if (!userHasScrolled) {
        elements.chatHistory.scrollTo({
            top: elements.chatHistory.scrollHeight,
            behavior: 'smooth'
        });
    }
}, 300);
}

// ✅ Make sure function name matches this
function typeTextSmooth(container, cursor, htmlContent, speed = 10, onComplete) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const nodes = Array.from(tempDiv.childNodes);

    container.innerHTML = '';
    container.appendChild(cursor);

    let nodeIndex = 0;
    let isComplete = false;

    function typeNode() {
        if (nodeIndex >= nodes.length) {
            cursor.remove();
            container.innerHTML = htmlContent; // Final render
            isComplete = true;
            if (onComplete) onComplete();
            return;
        }

        const node = nodes[nodeIndex];

        if (node.nodeType === Node.TEXT_NODE) {
            let chars = node.textContent.split('');
            let charIndex = 0;

            function typeChar() {
                if (charIndex < chars.length) {
                    const char = chars[charIndex];
                    const span = document.createTextNode(char);
                    container.insertBefore(span, cursor);

                    charIndex++;

                    let delay = speed;
                    if (/[.,;!?]/.test(char)) delay *= 3;
                    else if (char === ' ') delay *= 1.1;

                    setTimeout(typeChar, delay);
                } else {
                    nodeIndex++;
                    typeNode();
                }
            }

            typeChar();
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const clone = node.cloneNode(false);
            container.insertBefore(clone, cursor);
            const childNodes = Array.from(node.childNodes);
            let i = 0;

            function typeChildNodes() {
                if (i >= childNodes.length) {
                    nodeIndex++;
                    typeNode();
                    return;
                }

                const child = childNodes[i];
                const childClone = child.nodeType === Node.TEXT_NODE
    ? document.createTextNode(child.textContent)
    : document.createElement(child.nodeName);
                clone.appendChild(childClone);

                const innerText = child.textContent.split('');
                let j = 0;

                function typeChildChar() {
                    if (j < innerText.length) {
                        const char = document.createTextNode(innerText[j]);
                        childClone.appendChild(char);
                        j++;

                        setTimeout(typeChildChar, speed);
                    } else {
                        i++;
                        typeChildNodes();
                    }
                }

                typeChildChar();
            }

            typeChildNodes();
        } else {
            nodeIndex++;
            typeNode();
        }
    }

    typeNode();

    // Return a function to check if typing is complete
    return {
        isComplete: () => isComplete
    };
}

/**
 * Render message in chat UI
 */
function renderMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${message.sender}-message`);
    
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    
    // Replace newlines with <br> tags to preserve formatting
    const formattedText = message.text.replace(/\n/g, '<br>');
    messageContent.innerHTML = formattedText;
    
    const messageTime = document.createElement('div');
    messageTime.classList.add('message-time');
    messageTime.textContent = message.timestamp.toLocaleTimeString();
    
    messageElement.appendChild(messageContent);
    messageElement.appendChild(messageTime);
    elements.chatHistory.appendChild(messageElement);
    
    // Scroll to bottom after adding message
    elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
}

function handleQuickAction(action) {
    switch(action) {
        case 'symptoms':
            addBotMessage(getEnhancedSymptomsResponse());
            break;
        case 'treatments':
            addBotMessage(getEnhancedTreatmentsResponse());
            break;
        case 'diagnosis':
            addBotMessage(getEnhancedDiagnosisResponse());
            break;
        default:
            // Fallback for unrecognized actions
            elements.messageInput.value = action;
            sendMessage();
    }
}

// =============================================
// Scroll Management
// =============================================

/**
 * Ensure chat scrolls to bottom on initialization
 */
function initChatScroll() {
    elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
}

// Call this in your init function
function init() {
    loadInitialPatientData();
    initHealthChart();
    setupEventListeners();
    initChatScroll(); // Add this line

    // Ensure the button shows the correct state
    elements.medicalModeButton.innerHTML = 
        `<i class="fas fa-user-md me-2"></i>Medical Mode: ${state.medicalMode ? 'On' : 'Off'}`;

    // Check for Web Speech API support
    if ('webkitSpeechRecognition' in window) {
        state.recognition = new webkitSpeechRecognition();
        setupVoiceRecognition();
    } else {
        elements.voiceButton.disabled = true;
        elements.voiceButton.title = "Voice input not supported in your browser";
    }
}

// =============================================
// Response Generation Functions
// =============================================

/**
 * Generate appropriate bot response
 */
// Define topic-based keyword matches for breast cancer FAQs
const questionTriggers = [
    // 🩺 Breast Cancer Basics
    {
        keywords: ["what", "is", "breast", "cancer"],
        variations: ["explain breast cancer", "define breast cancer", "what exactly is breast cancer"],
        response: "Breast cancer is a disease where cells in the breast grow uncontrollably. It can be invasive (spreading to nearby tissue) or non-invasive (contained). The most common types are ductal carcinoma (starting in milk ducts) and lobular carcinoma (starting in lobules)."
    },
    {
        keywords: ["difference", "malignant", "benign"],
        variations: ["malignant vs benign", "benign versus malignant", "how to tell if tumor is malignant"],
        response: "Benign tumors are non-cancerous and don't spread. Malignant tumors are cancerous and can invade surrounding tissues or spread to other parts of the body. Malignant tumors require more urgent treatment."
    },
    {
        keywords: ["how", "know", "serious"],
        variations: ["how bad is my cancer", "is my cancer serious", "how severe is breast cancer"],
        response: "The seriousness of breast cancer depends on its stage, type, and whether it has spread. Your doctor will use imaging, biopsies, and pathology reports to assess the severity and recommend a treatment plan."
    },
    {
        keywords: ["can", "men", "get", "breast", "cancer"],
        variations: ["do males get breast cancer", "breast cancer in men", "male breast cancer risk"],
        response: "Yes, men can get breast cancer, though it's much rarer than in women (about 1% of all breast cancer cases). Men should report any lumps, nipple changes, or pain to their doctor."
    },
    {
        keywords: ["symptoms", "breast", "cancer"],
        variations: ["signs of breast cancer", "how to know if I have breast cancer", "breast cancer warning signs"],
        response: "Common symptoms include: a new lump in breast/armpit, breast swelling/thickening, skin dimpling, nipple discharge (especially bloody), nipple inversion, breast/nipple pain, or skin changes (redness, flakiness). Not all lumps are cancerous, but all should be checked."
    },
    {
        keywords: ["how", "diagnosed"],
        variations: ["diagnosis process", "tests for breast cancer", "how doctors find breast cancer"],
        response: "Diagnosis typically involves: 1) Clinical breast exam, 2) Imaging (mammogram, ultrasound, MRI), 3) Biopsy (removing tissue for testing), and sometimes 4) Additional tests to determine cancer type and characteristics."
    },
    {
        keywords: ["stages", "breast", "cancer"],
        variations: ["breast cancer staging", "what does stage mean", "how staging works"],
        response: "Breast cancer is staged from 0 to IV:\n- Stage 0: Non-invasive (in situ)\n- Stage I: Small tumor (≤2cm), no spread\n- Stage II: Larger tumor (2-5cm) or lymph node involvement\n- Stage III: Extensive lymph node involvement\n- Stage IV: Metastatic (spread to distant organs)"
    },
    {
        keywords: ["what", "tumor", "how", "form"],
        variations: ["how tumors develop", "what causes breast tumors", "tumor formation process"],
        response: "A tumor forms when cells develop genetic mutations that cause uncontrolled growth. In breast cancer, this typically starts in milk ducts or lobules. Not all tumors are cancerous - benign tumors don't invade other tissues."
    },
    {
        keywords: ["all", "lumps", "cancerous"],
        variations: ["are breast lumps always cancer", "percentage of cancerous lumps", "non-cancerous breast lumps"],
        response: "No, most breast lumps (about 80%) are benign. Common non-cancerous lumps include cysts, fibroadenomas, and areas of fibrocystic changes. However, any new lump should be evaluated by a doctor."
    },
    {
        keywords: ["can", "spread"],
        variations: ["does breast cancer metastasize", "how breast cancer spreads", "metastatic breast cancer"],
        response: "Yes, breast cancer can metastasize (spread) to other body parts, commonly bones, lungs, liver, or brain. The risk depends on cancer type and stage. Early detection reduces this risk."
    },
    {
        keywords: ["affect", "daily", "life"],
        variations: ["living with breast cancer", "how cancer changes life", "cancer impact on routine"],
        response: "Breast cancer can impact daily life through physical symptoms, treatment side effects, emotional stress, and practical challenges. Many patients need to adjust work, family responsibilities, and self-care routines during treatment."
    },
    {
        keywords: ["why", "early", "detection"],
        variations: ["importance of early detection", "benefits of finding cancer early", "early diagnosis advantages"],
        response: "Early detection improves survival rates dramatically. When found early (localized), 5-year survival is 99%. Early-stage cancers often need less aggressive treatment and have lower recurrence risk."
    },

    // 🧬 Personal Risk & Causes
    {
        keywords: ["age", "chances"],
        variations: ["does age affect risk", "breast cancer by age", "risk at different ages"],
        response: "Breast cancer risk increases with age. About 2/3 of invasive breast cancers occur in women 55+. However, it can occur at any age - that's why knowing your body and risk factors is important."
    },
    {
        keywords: ["over", "45"],
        variations: ["risk after 45", "breast cancer in 40s and 50s", "middle age breast cancer"],
        response: "Being over 45 does increase breast cancer risk. The median age at diagnosis is 62. Women 45-54 should get annual mammograms, while those 55+ can switch to biennial or continue annual screening."
    },
    {
        keywords: ["young", "under 30", "23"],
        variations: ["breast cancer in 20s", "young women breast cancer", "early age diagnosis"],
        response: "While rare (about 5% of cases under 40), breast cancer can occur in young women. It's often more aggressive in younger patients. Know your family history and report any changes to your doctor."
    },
    {
        keywords: ["run", "family"],
        variations: ["family history risk", "genetic predisposition", "inherited breast cancer"],
        response: "About 5-10% of breast cancers are hereditary. Having a first-degree relative (mother, sister, daughter) with breast cancer doubles your risk. Multiple affected relatives or young diagnoses increase risk further."
    },
    {
        keywords: ["no", "family", "history"],
        variations: ["can I get cancer without family history", "sporadic breast cancer", "non-genetic cases"],
        response: "Yes, 85-90% of breast cancers occur in women with no family history. Non-genetic factors like age, reproductive history, radiation exposure, and lifestyle play significant roles."
    },
    {
        keywords: ["job", "stress"],
        variations: ["work stress and cancer", "occupational breast cancer risk", "job-related stress impact"],
        response: "While chronic stress may weaken immunity, no direct link to breast cancer has been proven. However, managing stress through healthy coping mechanisms benefits overall health."
    },
    {
        keywords: ["hormonal", "changes"],
        variations: ["hormones and breast cancer", "estrogen impact", "menstrual cycle and risk"],
        response: "Hormones play a complex role. Early menstruation (<12), late menopause (>55), never giving birth, or first pregnancy after 30 slightly increase risk due to longer estrogen exposure."
    },
    {
        keywords: ["never", "children"],
        variations: ["nulliparous and cancer", "no kids breast cancer", "childless women risk"],
        response: "Never having children or having first child after 30 slightly increases risk. Pregnancy causes breast cells to mature fully, making them less susceptible to cancer-causing changes."
    },
    {
        keywords: ["early", "menopause"],
        variations: ["premature menopause risk", "early ovarian failure", "young menopause impact"],
        response: "Actually, early menopause (before 45) decreases breast cancer risk because it reduces lifetime estrogen exposure. Late menopause (after 55) increases risk."
    },
    {
        keywords: ["lifestyle", "factors"],
        variations: ["habits that increase risk", "preventable risk factors", "behavioral risks"],
        response: "Key modifiable risk factors include: alcohol consumption, physical inactivity, postmenopausal obesity, hormone therapy, and not breastfeeding. Maintaining healthy weight and limiting alcohol lowers risk."
    },
    {
        keywords: ["smoking", "alcohol"],
        variations: ["cigarettes and breast cancer", "drinking alcohol risk", "tobacco impact"],
        response: "Smoking (especially long-term) increases risk by about 10%. Alcohol is clearly linked - each daily drink increases risk by 7-10%. The less you drink, the lower your risk."
    },
    {
        keywords: ["obesity", "risk"],
        variations: ["weight and breast cancer", "BMI impact", "fat tissue and cancer"],
        response: "Postmenopausal obesity increases risk by 20-40%. Fat tissue produces estrogen, and higher levels can promote certain breast cancers. Maintaining healthy weight is protective."
    },
    {
        keywords: ["birth", "control", "pills"],
        variations: ["oral contraceptives risk", "the pill and cancer", "BCP safety"],
        response: "Current or recent oral contraceptive use slightly increases risk (about 20%), but risk returns to normal 10 years after stopping. The overall increase is small compared to pregnancy-related risk reduction."
    },
    {
        keywords: ["environmental", "pollution"],
        variations: ["chemicals and breast cancer", "toxins risk", "pollutants impact"],
        response: "Evidence linking pollution to breast cancer is inconclusive. Some studies suggest possible links to certain chemicals, but more research is needed. Overall impact appears small compared to established risk factors."
    },
    {
        keywords: ["genes", "increase"],
        variations: ["genetic mutations risk", "inherited cancer genes", "DNA and breast cancer"],
        response: "BRCA1 and BRCA2 are the most known high-risk genes (45-85% lifetime risk). Others include PALB2, TP53, PTEN, CDH1. Genetic counseling is recommended if you have strong family history."
    },
    {
        keywords: ["skip", "generations"],
        variations: ["genetic inheritance pattern", "family cancer patterns", "generational risk"],
        response: "Breast cancer genes don't truly skip generations, but carriers might not develop cancer (incomplete penetrance). A grandparent's cancer could reflect an inherited mutation passed silently through a parent."
    },
    {
        keywords: ["BRCA1", "BRCA2"],
        variations: ["BRCA genes explained", "what are BRCA mutations", "genetic testing meaning"],
        response: "These tumor suppressor genes normally help repair DNA. Mutations impair this function, allowing cancer-causing errors to accumulate. BRCA1 carriers have higher risk of triple-negative breast cancer; BRCA2 often causes ER+ cancer."
    },

        // 🧠 Mental Health & Emotional Support
        {
            keywords: ["scared", "what", "do"],
            variations: [
                "how to handle fear of cancer",
                "coping with cancer fear",
                "feeling afraid about diagnosis",
                "what to do when terrified",
                "managing cancer anxiety"
            ],
            response: "Feeling scared is completely normal. Consider: 1) Learning about your diagnosis (knowledge reduces fear), 2) Practicing mindfulness/meditation, 3) Joining a support group, 4) Talking to a therapist specializing in cancer care."
        },
        {
            keywords: ["mentally", "strong"],
            variations: [
                "how to be emotionally strong",
                "building resilience during cancer",
                "staying strong mentally",
                "emotional toughness during treatment",
                "psychological strength with cancer"
            ],
            response: "Building mental resilience involves: setting small daily goals, practicing gratitude, maintaining social connections, allowing yourself to feel emotions without judgment, and focusing on what you can control."
        },
        {
            keywords: ["depressed", "anxious"],
            variations: [
                "feeling down about cancer",
                "cancer causing anxiety",
                "depression after diagnosis",
                "mental health with breast cancer",
                "emotional distress from cancer"
            ],
            response: "Yes, 20-30% of patients experience significant depression or anxiety. These are normal reactions to a cancer diagnosis. Tell your care team - counseling and/or medication can help tremendously."
        },
        {
            keywords: ["stress", "cause"],
            variations: [
                "can stress lead to cancer",
                "does anxiety cause breast cancer",
                "work stress and cancer risk",
                "emotional stress impact",
                "chronic stress and tumors"
            ],
            response: "No clear evidence shows stress causes breast cancer. However, chronic stress may weaken immune function. Managing stress through healthy coping strategies benefits overall treatment and recovery."
        },
        {
            keywords: ["tell", "family", "children"],
            variations: [
                "how to explain cancer to kids",
                "talking to children about diagnosis",
                "what to tell family",
                "breaking cancer news to loved ones",
                "discussing diagnosis with children"
            ],
            response: "When telling children: 1) Be honest but age-appropriate, 2) Reassure them it's not contagious, 3) Explain changes they might see, 4) Maintain routines, 5) Let them ask questions. Consider involving a child life specialist."
        },
        {
            keywords: ["emotional", "support", "counseling"],
            variations: [
                "where to get cancer counseling",
                "therapy for breast cancer",
                "mental health resources",
                "emotional help during treatment",
                "support services for patients"
            ],
            response: "Excellent support options include: hospital social workers, oncology psychologists, support groups (like American Cancer Society), online communities (BreastCancer.org), and helplines (800-227-2345). Many hospitals offer counseling services."
        },
        {
            keywords: ["prepare", "mentally", "treatments"],
            variations: [
                "getting ready for chemo mentally",
                "psychological preparation for treatment",
                "how to prepare emotionally",
                "mental readiness for cancer therapy",
                "getting in right headspace"
            ],
            response: "Mental preparation strategies: 1) Tour treatment facilities beforehand, 2) Learn about potential side effects, 3) Arrange practical support, 4) Create a comfort kit (books, music, etc.), 5) Practice relaxation techniques."
        },
        {
            keywords: ["relaxation", "techniques"],
            variations: [
                "how to relax during treatment",
                "stress relief methods",
                "calming techniques for cancer",
                "ways to reduce anxiety",
                "mind-body practices"
            ],
            response: "Effective techniques include: guided imagery, progressive muscle relaxation, deep breathing exercises, gentle yoga, mindfulness meditation, and art therapy. Many cancer centers offer free classes."
        },
        {
            keywords: ["journaling", "art", "therapy"],
            variations: [
                "writing about cancer experience",
                "creative expression during treatment",
                "does journaling help",
                "art for emotional healing",
                "expressive therapies benefits"
            ],
            response: "Yes! Expressive therapies help process emotions. Journaling can reduce stress and clarify thoughts. Art therapy provides nonverbal expression. Many patients find these profoundly helpful alongside medical treatment."
        },
        {
            keywords: ["support", "group"],
            variations: [
                "finding cancer support groups",
                "peer support options",
                "where to meet other patients",
                "benefits of cancer groups",
                "online communities for breast cancer"
            ],
            response: "Support groups provide connection, practical advice, and reduced isolation. Options include: hospital-based groups, online communities, disease-specific groups (metastatic, young patients), and caregiver groups."
        },
        {
            keywords: ["feelings", "isolation"],
            variations: [
                "feeling alone with cancer",
                "how to combat loneliness",
                "social isolation during treatment",
                "staying connected",
                "dealing with separation"
            ],
            response: "Combat isolation by: scheduling regular social contact (even virtual), joining peer support programs, attending survivorship events, volunteering when able, and being open about your need for connection."
        },
        {
            keywords: ["cry", "overwhelmed"],
            variations: [
                "is it okay to cry a lot",
                "feeling swamped by cancer",
                "dealing with emotional overload",
                "coping with intense feelings",
                "emotional breakdowns normal"
            ],
            response: "Absolutely. This is a profoundly challenging experience. Crying releases stress hormones. Being overwhelmed is normal - break challenges into smaller steps, and remember it's okay to ask for help whenever needed."
        },
    
        // 🍎 Healthy Lifestyle & Diet
        {
            keywords: ["foods", "avoid"],
            variations: [
                "what not to eat during treatment",
                "dietary restrictions with cancer",
                "bad foods for breast cancer",
                "nutrition to avoid",
                "harmful foods during chemo"
            ],
            response: "Limit: processed meats, high-fat dairy, refined sugars, excessive alcohol, and charred meats. During chemo, avoid raw foods (sushi, soft cheeses) when immunity is low to prevent infection."
        },
        {
            keywords: ["healthy", "diet", "treatment"],
            variations: [
                "best foods during chemo",
                "nutrition during cancer therapy",
                "eating well with breast cancer",
                "optimal diet for treatment",
                "meal planning during cancer"
            ],
            response: "Focus on: plant-based foods (fruits/veggies), lean proteins (fish, poultry), whole grains, healthy fats (olive oil, nuts). Small, frequent meals help with treatment side effects. Stay hydrated and work with a dietitian."
        },
        {
            keywords: ["coffee", "wine"],
            variations: [
                "can I drink coffee during treatment",
                "alcohol and breast cancer",
                "is wine allowed",
                "caffeine during chemo",
                "drinking with cancer"
            ],
            response: "Coffee is generally fine (may even be protective). Limit wine to ≤3 drinks/week (preferably less). Avoid alcohol during certain treatments. Always check with your oncologist about interactions."
        },
        {
            keywords: ["superfoods"],
            variations: [
                "best cancer-fighting foods",
                "top nutritious foods",
                "power foods for recovery",
                "most beneficial foods",
                "nutritional powerhouses"
            ],
            response: "No single food fights cancer, but these are nutrient-dense: cruciferous veggies (broccoli), berries, fatty fish (salmon), walnuts, flaxseeds, turmeric, green tea, and legumes. Variety is key."
        },
        {
            keywords: ["vegetarian", "vegan"],
            variations: [
                "plant-based diet benefits",
                "meatless diet during treatment",
                "veganism and cancer",
                "vegetarian nutrition",
                "animal products and recovery"
            ],
            response: "Plant-based diets may lower recurrence risk, but strict veganism isn't necessary. Focus on balanced nutrition - if going vegan, ensure adequate protein, B12, iron, and calcium. Consult a dietitian."
        },
        {
            keywords: ["exercising", "safe"],
            variations: [
                "working out during treatment",
                "physical activity guidelines",
                "is exercise good during chemo",
                "safe workouts for patients",
                "movement during recovery"
            ],
            response: "Yes! Regular exercise (as tolerated) reduces fatigue, improves mood, and may enhance outcomes. Aim for 150 min/week moderate activity (walking, yoga). Avoid extreme fatigue or post-surgery strain."
        },
        {
            keywords: ["how", "much", "rest"],
            variations: [
                "sleep needs during treatment",
                "resting enough",
                "fatigue management",
                "balancing activity and rest",
                "napping during chemo"
            ],
            response: "Listen to your body. Most need 7-9 hours nightly plus daytime naps during intensive treatment. Balance rest with gentle activity to prevent deconditioning. Fatigue often improves after treatment ends."
        },
        {
            keywords: ["soy", "products"],
            variations: [
                "is soy safe for breast cancer",
                "tofu and estrogen",
                "soy milk during treatment",
                "phytoestrogens risk",
                "edamame and recovery"
            ],
            response: "Current research shows moderate soy (1-2 servings/day) is safe and may be protective. Choose whole soy (tofu, edamame) over processed supplements. Avoid if allergic or doctor advises."
        },
        {
            keywords: ["antioxidants"],
            variations: [
                "best antioxidant foods",
                "do antioxidants help",
                "supplements during treatment",
                "free radicals and cancer",
                "oxidative stress reduction"
            ],
            response: "Antioxidants from foods (not high-dose supplements) help protect cells. Colorful fruits/veggies provide diverse antioxidants. Avoid megadoses during chemo/radiation unless approved by your oncologist."
        },
        {
            keywords: ["hydrated"],
            variations: [
                "water intake during treatment",
                "dehydration prevention",
                "fluids during chemo",
                "staying hydrated tips",
                "best drinks for patients"
            ],
            response: "Critical during treatment! Aim for 8-10 cups daily (more if vomiting/diarrhea). Try herbal teas, broths, or flavored water if plain water is unappealing. Monitor urine color (pale yellow = well-hydrated)."
        },
        {
            keywords: ["quick", "meals"],
            variations: [
                "easy recipes during treatment",
                "fast healthy meals",
                "low-energy cooking",
                "simple nutrition ideas",
                "meal prep for fatigue"
            ],
            response: "Try: oatmeal with nuts/fruit, smoothies (Greek yogurt + frozen berries), canned salmon on whole grain toast, microwaved sweet potato with cottage cheese, or pre-chopped stir-fry veggies with tofu."
        },
        {
            keywords: ["eat", "out"],
            variations: [
                "restaurant dining during treatment",
                "safe takeout options",
                "eating at restaurants",
                "food safety when eating out",
                "social meals during recovery"
            ],
            response: "Occasional eating out is fine. Choose restaurants with healthy options. During low immunity periods, avoid salad bars, buffets, or undercooked foods. When cooking at home, meal prepping helps conserve energy."
        },
        {
            keywords: ["foods", "nausea"],
            variations: [
                "what to eat when nauseous",
                "anti-nausea foods",
                "chemo nausea diet",
                "easing stomach upset",
                "best foods for queasiness"
            ],
            response: "Try: ginger tea/candies, peppermint, crackers, cold foods (smoothies, yogurt), small frequent meals, bland starches (rice, toast). Avoid greasy/spicy foods. Ask about anti-nausea medications if needed."
        },
    
        // 💊 Treatment & Recovery
        {
            keywords: ["treatment", "options"],
            variations: [
                "what are my therapy choices",
                "available breast cancer treatments",
                "medical options for cancer",
                "different ways to treat",
                "possible interventions"
            ],
            response: "Options depend on cancer type/stage but may include: surgery (lumpectomy/mastectomy), radiation, chemotherapy, hormone therapy (for ER+), targeted therapy (like Herceptin), or immunotherapy. Your team will recommend a personalized plan."
        },
        {
            keywords: ["side", "effects", "chemotherapy"],
            variations: [
                "chemo adverse reactions",
                "what to expect from chemo",
                "managing chemo symptoms",
                "chemotherapy complications",
                "handling treatment effects"
            ],
            response: "Common chemo side effects: fatigue, nausea, hair loss, mouth sores, appetite changes, neuropathy, infection risk. Most are temporary. Newer anti-nausea drugs and scalp cooling can mitigate some effects."
        },
        {
            keywords: ["work", "during"],
            variations: [
                "keeping job during treatment",
                "employment and cancer",
                "working through chemo",
                "job accommodations",
                "career during recovery"
            ],
            response: "Many continue working with adjustments. Consider: flexible hours, remote work, reducing physical demands, or temporary disability leave. Discuss with HR about FMLA protections and workplace accommodations."
        },
        {
            keywords: ["lose", "hair"],
            variations: [
                "baldness from chemo",
                "hair loss prevention",
                "when will hair fall out",
                "coping with hair loss",
                "regrowth after treatment"
            ],
            response: "Not all chemo causes hair loss (taxanes/anthracyclines often do). Options include: scalp cooling (may reduce loss), wigs (check insurance coverage), scarves, or embracing baldness. Hair typically regrows 3-6 months post-treatment."
        },
        {
            keywords: ["how", "long", "treatment"],
            variations: [
                "duration of cancer therapy",
                "length of chemo",
                "treatment timeline",
                "when will treatment end",
                "schedule for recovery"
            ],
            response: "Duration varies: surgery (1 day + recovery weeks), chemo (3-6 months, in cycles), radiation (daily for 3-6 weeks), hormone therapy (5-10 years). Your oncologist will provide a detailed timeline."
        },
        {
            keywords: ["after", "treatment", "ends"],
            variations: [
                "life post-treatment",
                "what happens after chemo",
                "recovery after cancer",
                "transitioning to survivorship",
                "post-therapy next steps"
            ],
            response: "Post-treatment involves: follow-up care (scans, bloodwork), managing lingering side effects, emotional adjustment ('scanxiety'), lifestyle changes, and possibly ongoing hormone therapy. Many join survivorship programs."
        },
        {
            keywords: ["chances", "coming", "back"],
            variations: [
                "recurrence risk",
                "will cancer return",
                "probability of relapse",
                "metastasis likelihood",
                "secondary cancer risk"
            ],
            response: "Recurrence risk depends on original cancer characteristics. On average: 5-9% local recurrence after lumpectomy+radiation, 2-4% after mastectomy. Distant recurrence risk varies by stage (higher with node involvement)."
        },
        {
            keywords: ["mastectomy", "lumpectomy"],
            variations: [
                "breast conservation vs removal",
                "partial vs full mastectomy",
                "surgery options compared",
                "which operation is better",
                "differences in procedures"
            ],
            response: "Lumpectomy removes tumor + margin (breast-conserving), usually followed by radiation. Mastectomy removes entire breast (may include reconstruction). Both have similar survival rates when appropriate for cancer type."
        },
        {
            keywords: ["choose", "treatment", "plan"],
            variations: [
                "deciding on therapy",
                "how to pick options",
                "treatment decision making",
                "selecting best approach",
                "weighing cancer treatments"
            ],
            response: "Treatment is collaborative. Your team recommends options based on guidelines, but you make final decisions. Get second opinions if desired. Consider clinical trials. Quality of life preferences matter."
        },
        {
            keywords: ["impact", "fertility"],
            variations: [
                "cancer and having babies",
                "treatment effect on reproduction",
                "chemo and future pregnancy",
                "preserving fertility",
                "family planning after cancer"
            ],
            response: "Some treatments can affect fertility. Options include: egg/embryo freezing before treatment, ovarian suppression during chemo, or later surrogacy/adoption. Consult a reproductive endocrinologist early."
        },
        {
            keywords: ["alternative", "chemotherapy"],
            variations: [
                "chemo substitutes",
                "other options besides chemo",
                "non-chemo treatments",
                "avoiding chemotherapy",
                "different approaches"
            ],
            response: "For certain cancers, alternatives might include: hormone therapy (ER+), targeted drugs (HER2+), or immunotherapy. Some early-stage cancers may omit chemo based on genomic testing (like Oncotype DX)."
        },
        {
            keywords: ["side", "effects", "radiation"],
            variations: [
                "radiation therapy reactions",
                "what to expect from radiotherapy",
                "handling radiation symptoms",
                "skin care during treatment",
                "radiotherapy complications"
            ],
            response: "Common effects: fatigue, skin changes (redness, peeling), breast swelling/tenderness. Rarely: heart/lung effects (modern techniques minimize this). Skin care is crucial - use recommended creams/protection."
        },
        {
            keywords: ["physical", "therapy"],
            variations: [
                "rehab after surgery",
                "restoring mobility",
                "lymphedema prevention",
                "post-op exercises",
                "recovery movement therapy"
            ],
            response: "PT is often helpful after surgery to restore range of motion, reduce lymphedema risk, and rebuild strength. Specialized cancer rehab programs address surgery, chemo, and radiation-related impairments."
        },
        {
            keywords: ["manage", "fatigue"],
            variations: [
                "coping with exhaustion",
                "cancer tiredness solutions",
                "energy conservation tips",
                "fighting treatment fatigue",
                "overcoming weakness"
            ],
            response: "Combat fatigue with: light exercise (paradoxically helps), pacing activities, prioritizing tasks, short naps (<30 min), proper nutrition/hydration, and accepting help. Fatigue often improves months after treatment."
        },
    
        // 💬 Follow-up & Monitoring
        {
            keywords: ["how", "often", "checkups"],
            variations: [
                "follow-up schedule",
                "post-treatment monitoring",
                "surveillance frequency",
                "doctor visits after cancer",
                "ongoing screening"
            ],
            response: "Typically: every 3-6 months for first 3 years, then 6-12 months for years 4-5, then annually. More frequent if high-risk or on ongoing treatment. Includes physical exams and symptom review."
        },
        {
            keywords: ["tests", "after"],
            variations: [
                "monitoring tests post-treatment",
                "what scans will I need",
                "ongoing blood work",
                "survivorship screening",
                "long-term follow-up tests"
            ],
            response: "Follow-up may include: mammograms (annual for treated breast), MRIs (for high-risk), blood tests (tumor markers if initially elevated), bone density (for hormone therapy), and occasional CTs if symptoms arise."
        },
        {
            keywords: ["know", "coming", "back"],
            variations: [
                "signs of recurrence",
                "how to detect return",
                "warning symptoms",
                "monitoring for relapse",
                "cancer comeback indicators"
            ],
            response: "Warning signs: new lump, bone pain, persistent cough, headaches, unexplained weight loss. However, many recurrences are found at routine checkups before symptoms appear. Report any concerning changes promptly."
        },
        {
            keywords: ["self", "exams"],
            variations: [
                "how to check breasts",
                "monthly self-checks",
                "breast awareness techniques",
                "at-home monitoring",
                "personal examination"
            ],
            response: "Yes! While not replacing mammograms, self-exams help you know your 'normal'. Check monthly (post-menopausal: pick consistent date). Look for changes in breasts, underarms, and above collarbones."
        },
        {
            keywords: ["how", "long", "follow", "ups"],
            variations: [
                "duration of monitoring",
                "when can I stop checkups",
                "lifelong surveillance",
                "years of follow-up needed",
                "ongoing care timeline"
            ],
            response: "Active surveillance typically continues for at least 5 years, with annual mammograms indefinitely. Those on hormone therapy (tamoxifen/aromatase inhibitors) need monitoring for 5-10 years during treatment."
        },
        {
            keywords: ["lifestyle", "changes", "after"],
            variations: [
                "habits post-treatment",
                "healthy living after cancer",
                "preventing recurrence",
                "wellness changes",
                "post-cancer health"
            ],
            response: "Key changes: maintain healthy weight, regular exercise, limit alcohol, don't smoke, manage stress, eat balanced diet. These reduce recurrence risk and improve overall health."
        },
        {
            keywords: ["anxious", "checkups"],
            variations: [
                "scan anxiety",
                "fear of follow-ups",
                "nervous before tests",
                "stress about monitoring",
                "appointment worries"
            ],
            response: "Very common ('scanxiety'). Strategies: schedule appointments early in day, bring support person, practice relaxation techniques, plan pleasant activity afterward, and remember anxiety doesn't affect outcomes."
        },
        {
            keywords: ["prepare", "scans"],
            variations: [
                "getting ready for imaging",
                "test preparation",
                "what to do before scans",
                "MRI/CT prep",
                "how to get ready"
            ],
            response: "Preparation varies by test. Generally: follow prep instructions (NPO for some), wear comfortable metal-free clothing, arrive early, bring prior scans if at new facility, and consider anti-anxiety meds if extremely anxious."
        },
        {
            keywords: ["chances", "finding", "follow", "ups"],
            variations: [
                "probability of detection",
                "how often cancer returns",
                "recurrence statistics",
                "follow-up effectiveness",
                "monitoring success rates"
            ],
            response: "Most follow-ups don't find cancer. Local recurrence occurs in ~5-10% within 10 years. Metastatic recurrence varies by initial stage (higher for stage III). Early detection of recurrence improves treatment options."
        },
    
        // 🧘‍♀️ Holistic & Alternative Questions
        {
            keywords: ["meditation", "yoga"],
            variations: [
                "mindfulness benefits",
                "breathing exercises help",
                "relaxation practices",
                "stress reduction techniques",
                "mind-body connection"
            ],
            response: "Yes! Studies show meditation reduces stress/anxiety in cancer patients. Gentle yoga improves flexibility, reduces fatigue, and enhances wellbeing. Look for oncology-specific classes that accommodate treatment effects."
        },
        {
            keywords: ["acupuncture", "aromatherapy"],
            variations: [
                "alternative pain relief",
                "needle therapy benefits",
                "essential oils use",
                "complementary therapies",
                "non-medical approaches"
            ],
            response: "Acupuncture may help with pain, nausea, and hot flashes (ensure practitioner is licensed). Aromatherapy (like ginger for nausea) can provide comfort, but avoid strong scents if sensitive during chemo."
        },
        {
            keywords: ["spirituality", "prayer"],
            variations: [
                "faith during cancer",
                "religious coping",
                "finding meaning",
                "prayer and healing",
                "spiritual support"
            ],
            response: "Many find spiritual practices provide comfort, meaning, and community during treatment. Hospital chaplains can support all faiths. The role in physical healing is unproven but psychological benefits are clear."
        },
        {
            keywords: ["laughter", "therapy"],
            variations: [
                "humor as medicine",
                "comedy for healing",
                "joy in recovery",
                "positive emotions help",
                "fun during treatment"
            ],
            response: "Laughter releases endorphins, reduces stress, and may temporarily relieve pain. While not a treatment, humor therapy (comedy, laughter yoga) can improve quality of life during challenging times."
        },
        {
            keywords: ["essential", "oils"],
            variations: [
                "aromatherapy benefits",
                "using plant extracts",
                "natural fragrances",
                "therapeutic scents",
                "diffuser oils"
            ],
            response: "Some oils (lavender, peppermint) may help with relaxation or nausea. However: dilute properly, avoid applying near radiation sites, check for interactions, and never ingest without professional guidance."
        },
        {
            keywords: ["detox", "diets"],
            variations: [
                "cleansing regimens",
                "body purification",
                "toxin elimination",
                "juice cleanses",
                "fasting during treatment"
            ],
            response: "Avoid extreme detox regimens - your liver/kidneys naturally detox. Some 'detox' practices can be harmful during treatment. Focus instead on balanced nutrition to support your body's natural processes."
        },
        {
            keywords: ["positive", "thinking"],
            variations: [
                "optimism and recovery",
                "mindset importance",
                "attitude effect",
                "outlook impact",
                "psychological approach"
            ],
            response: "While attitude affects coping, there's no evidence it directly impacts cancer outcomes. Allow yourself all emotions - false positivity can create pressure. Realistic hope combined with medical care is healthiest."
        },
        {
            keywords: ["herbal", "remedies"],
            variations: [
                "natural supplements",
                "plant-based medicines",
                "alternative treatments",
                "botanical therapies",
                "traditional herbs"
            ],
            response: "Caution! Many herbs interact with treatments (e.g., St. John's Wort reduces chemo effectiveness). Always consult your oncologist before using herbal supplements, especially during active treatment."
        },
        {
            keywords: ["vitamins", "supplements"],
            variations: [
                "nutritional supplements",
                "should I take vitamins",
                "micronutrients needed",
                "dietary additions",
                "extra nutrients"
            ],
            response: "Most needs can be met through diet. Exceptions may include: Vitamin D (often deficient), calcium (for bone health), or specific deficiencies. High-dose antioxidants during treatment may interfere - always check with your team."
        },
        {
            keywords: ["natural", "immunity"],
            variations: [
                "boosting immune system",
                "strengthening defenses",
                "infection prevention",
                "immune support",
                "natural resistance"
            ],
            response: "Best natural immunity boosters: adequate sleep, stress management, balanced nutrition (protein, zinc, vitamins A/C/D/E), moderate exercise, and good hygiene. Avoid unproven 'immune boosters' during treatment."
        }
    ];
    
    // Enhanced matching function with similarity scoring
    function getResponse(userQuestion) {
        const lowerQuestion = userQuestion.toLowerCase();
        let bestMatch = null;
        let highestScore = 0;
    
        // Score all possible matches
        for (const trigger of questionTriggers) {
            let score = 0;
            
            // Check keywords
            score += trigger.keywords.reduce((sum, keyword) => 
                sum + (lowerQuestion.includes(keyword.toLowerCase()) ? 1 : 0), 0);
            
            // Check variations if they exist
            if (trigger.variations) {
                const variationMatch = trigger.variations.some(variation => 
                    lowerQuestion.includes(variation.toLowerCase()));
                if (variationMatch) score += 3; // Higher weight for exact variation matches
            }
            
            // Track best match
            if (score > highestScore) {
                highestScore = score;
                bestMatch = trigger;
            }
        }
    
        // Only return if we have a reasonably good match
        return highestScore >= 2 ? bestMatch.response : null;
    }
    
    // Context-aware response generation
    function generateResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // First try detailed matching
        const keywordResponse = getResponse(userMessage);
        if (keywordResponse) return keywordResponse;
    
        // Contextual fallbacks
        if (/mental|emotional|feel|anxiety|depress|stress/.test(lowerMessage)) {
            return "Many patients experience emotional challenges. Consider: talking to a counselor, joining a support group, practicing relaxation techniques, or discussing feelings with your care team. Would you like more specific suggestions?";
        }
    
        if (/diet|food|eat|nutrition|meal/.test(lowerMessage)) {
            return "Nutrition is important during treatment. General guidelines: focus on whole foods, stay hydrated, eat small frequent meals if needed, and consult a dietitian. Would you like details on specific foods or eating challenges?";
        }
    
        if (/treatment|therapy|chemo|radiation|surgery/.test(lowerMessage)) {
            return "Treatment approaches vary based on cancer type and stage. Common options include surgery, chemotherapy, radiation, hormone therapy, or targeted drugs. Your oncologist can explain what's recommended for your specific case.";
        }
    
        if (/follow.?up|monitor|check.?up|scan|test/.test(lowerMessage)) {
            return "After treatment, regular follow-ups help monitor recovery. Typically this involves periodic exams, imaging, and sometimes blood tests. The schedule depends on your specific cancer and treatment.";
        }
    
        if (/alternative|holistic|natural|complementary/.test(lowerMessage)) {
            return "Some patients explore complementary approaches alongside medical treatment. While some may help with symptoms, it's important to discuss any alternative therapies with your oncologist to avoid interactions.";
        }
    
        // General fallback
        return "I'm here to help with breast cancer information. Could you please rephrase or be more specific about your question? You might ask about symptoms, treatments, emotional support, or lifestyle during treatment.";
    }

// Enhanced matching function
function getResponse(userQuestion) {
    const lowerQuestion = userQuestion.toLowerCase();
    
    // First check for exact variations
    for (const trigger of questionTriggers) {
        if (trigger.variations) {
            for (const variation of trigger.variations) {
                if (lowerQuestion.includes(variation.toLowerCase())) {
                    return trigger.response;
                }
            }
        }
    }
    
    // Then check for keyword matches
    const matches = questionTriggers.filter(trigger => 
        trigger.keywords.every(keyword => 
            lowerQuestion.includes(keyword.toLowerCase())
        )
    );
    
    if (matches.length > 0) {
        matches.sort((a, b) => b.keywords.length - a.keywords.length);
        return matches[0].response;
    }
    
    return null;
}

// Enhanced response generation with more contextual matching
function generateResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();

    // First try exact matches and variations
    const keywordResponse = getResponse(userMessage);
    if (keywordResponse) {
        return keywordResponse;
    }

    // Then try more general matching
    if (/age|old|year/.test(lowerMessage) && /risk|chance|diagnos/.test(lowerMessage)) {
        return "Breast cancer risk increases with age. About 2/3 of invasive breast cancers occur in women 55+. However, it can occur at any age - that's why knowing your body and risk factors is important.";
    }

    if (/family|parent|relative/.test(lowerMessage) && /history|risk/.test(lowerMessage)) {
        if (/no|none|don't/.test(lowerMessage)) {
            return "Yes, 85-90% of breast cancers occur in women with no family history. Non-genetic factors like age, reproductive history, radiation exposure, and lifestyle play significant roles.";
        }
        return "About 5-10% of breast cancers are hereditary. Having a first-degree relative (mother, sister, daughter) with breast cancer doubles your risk.";
    }

    if (/diagnos|test|find/.test(lowerMessage)) {
        return "Diagnosis typically involves: 1) Clinical breast exam, 2) Imaging (mammogram, ultrasound, MRI), 3) Biopsy (removing tissue for testing), and sometimes 4) Additional tests to determine cancer type and characteristics.";
    }

    // Fallback to general responses
    if (/hello|hi|hey|greetings/.test(lowerMessage)) {
        return "Hello! I'm your Breast Cancer Care Assistant. How can I help you today?";
    }

    if (/symptom|sign|feel/.test(lowerMessage)) {
        return "Common symptoms include: a new lump in breast/armpit, breast swelling/thickening, skin dimpling, nipple discharge (especially bloody), nipple inversion, breast/nipple pain, or skin changes (redness, flakiness). Not all lumps are cancerous, but all should be checked.";
    }

    if (/treatment|option|therapy/.test(lowerMessage)) {
        return "Options depend on cancer type/stage but may include: surgery (lumpectomy/mastectomy), radiation, chemotherapy, hormone therapy (for ER+), targeted therapy (like Herceptin), or immunotherapy. Your team will recommend a personalized plan.";
    }

    if (/prevent|avoid|reduce/.test(lowerMessage) && /risk/.test(lowerMessage)) {
        return "Key modifiable risk factors include: alcohol consumption, physical inactivity, postmenopausal obesity, hormone therapy, and not breastfeeding. Maintaining healthy weight and limiting alcohol lowers risk.";
    }

    return "I'm designed to help with breast cancer information. Could you please clarify your question? You can ask about symptoms, treatments, diagnosis, or prevention.";
}

/**
 * Send message to OpenRouter API for non-medical mode
 */
async function sendToOpenRouter(message) {
    if (!OPENROUTER_API_KEY) {
        addBotMessage("Error: API not configured. Switching to medical mode.");
        state.medicalMode = true; // Fallback to medical mode
        return;
    }

    // Show loading message
    const loadingElement = document.createElement('div');
    loadingElement.classList.add('message', 'bot-message');
    loadingElement.innerHTML = '<div class="message-content"><i class="fas fa-spinner fa-spin me-2"></i> Processing...</div>';
    elements.chatHistory.appendChild(loadingElement);

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': "Bearer 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",
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.href, 
                'X-Title': 'Breast Cancer Assistant'  
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-maverick:free', 
                messages: [{ role: 'user', content: message }],
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content || "No response received.";
        addBotMessage(aiResponse);

    } catch (error) {
        console.error('OpenRouter error:', error);
        addBotMessage(`⚠️ API Error: ${error.message}. Switching to medical mode.`);
        state.medicalMode = true; // Fallback to medical responses
    } finally {
        // Remove loading message
        if (loadingElement.parentNode) {
            elements.chatHistory.removeChild(loadingElement);
        }
    }
}

// =============================================
// Medical Response Generators
// =============================================

/**
 * Basic responses
 */
function getSymptomsResponse() {
    if (state.medicalMode) {
        return "Clinical symptoms include:\n- Palpable mass\n- Nipple retraction\n- Skin dimpling";
    } else {
        return "Possible signs to watch for:\n- New lump\n- Breast swelling\n- Skin changes";
    }
}

function getTreatmentsResponse() {
    const base = "Treatment options depend on the cancer type and stage:";
    if (state.medicalMode) {
        return base + "\n- Surgery\n- Radiation\n- Chemotherapy\n- Hormone therapy";
    } else {
        return base + "\n- Surgery to remove cancer\n- Radiation treatment\n- Cancer-fighting drugs\n- Hormone-blocking medicines";
    }
}

function getDiagnosisResponse() {
    return "Diagnosis typically involves:\n" + 
           (state.medicalMode ? 
            "- Imaging studies\n- Biopsy\n- Pathology analysis" :
            "- Scans and tests\n- Tissue samples\n- Lab analysis");
}

/**
 * Generate prevention response
 */
function getPreventionResponse() {
    return "While not all breast cancer can be prevented, you can reduce risk by:\n" +
           "- Maintaining a healthy weight\n" +
           "- Regular physical activity\n" +
           "- Limiting alcohol\n" +
           "- Avoiding smoking\n" +
           "- Breastfeeding, if possible\n" +
           "- For high-risk individuals: preventive medications or surgery may be options\n\n" +
           "Regular screening is also crucial for early detection.";
}

// ▼ Enhanced Response Generators ▼

function getEnhancedSymptomsResponse() {
    if (!state.patientData) return getSymptomsResponse();

    const { age, gender, diagnosis } = state.patientData;
    const isBenign = diagnosis === 'B' || diagnosis.toLowerCase().includes('benign');

    let response = `🩺 Symptom Guidance for Your ${isBenign ? 'Benign' : 'Malignant'} Condition\n\n`;

    response += `📌 For ${age}-year-old ${gender.toLowerCase()} patients:\n\n`;

    if (isBenign) {
        response += `✅ Common Benign Findings:\n`;
        response += `- Fibroadenomas (smooth, rubbery lumps that move easily)\n`;
        response += `- Cysts (fluid-filled sacs that may come and go with menstrual cycle)\n`;
        response += `- Papillomas (small wart-like growths in milk ducts)\n\n`;

        response += `📖 What to Expect:\n`;
        response += `- Lumps may change size with hormonal fluctuations\n`;
        response += `- Discomfort may be cyclical with your period\n`;
        response += `- Symptoms typically remain stable or improve over time\n\n`;
    } else {
        response += `⚠️ Typical Malignant Findings:\n`;
        response += `- Hard, irregular masses with poorly defined borders\n`;
        response += `- Changes that persist and progress over time\n`;
        response += `- Symptoms that don't fluctuate with menstrual cycle\n\n`;

        response += `📖 What to Expect:\n`;
        response += `- Changes tend to be persistent and progressive\n`;
        response += `- May notice skin changes like dimpling or puckering\n`;
        response += `- Possible nipple retraction or inversion\n\n`;
    }

    response += `🔍 Key Symptoms to Monitor:\n`;
    response += `- Palpable mass: Especially if hard, irregular, or fixed\n`;
    response += `- Nipple changes: Retraction, inversion, or unusual discharge\n`;
    response += `- Skin changes: Dimpling, puckering, or thickening\n`;

    if (isBenign) {
        response += `\n📞 When to Contact Your Doctor:\n`;
        response += `- If a lump grows significantly or becomes painful\n`;
        response += `- If you notice new symptoms that persist >2 menstrual cycles\n`;
        response += `- If nipple discharge becomes persistent or bloody\n`;
    } else {
        response += `\n🚨 Urgent Signs Requiring Immediate Attention:\n`;
        response += `- Any new, persistent lump or thickening\n`;
        response += `- Skin changes that don't resolve within 2 weeks\n`;
        response += `- Nipple changes or spontaneous bloody discharge\n`;
        response += `- Sudden swelling, redness, or warmth in the breast\n`;
    }

    return response;
}

function getEnhancedTreatmentsResponse() {
    if (!state.patientData?.diagnosis) return getTreatmentsResponse();

    const { diagnosis, clinical_data } = state.patientData;
    const isBenign = diagnosis === 'B' || diagnosis.toLowerCase().includes('benign');

    let response = `💊 Personalized Treatment Options\n\n`;

    if (isBenign) {
        response += `✅ For BENIGN Conditions:\n\n`;

        response += `👁️ Observation & Monitoring:\n`;
        response += `Regular clinical breast exams every 6–12 months with imaging as needed.\n\n`;

        response += `🔪 Surgical Options:\n`;
        response += `Excision may be considered if the lesion is large (>2cm), growing rapidly, or causing significant symptoms. Techniques include lumpectomy or cryoablation.\n\n`;

        response += `💆‍♀️ Pain Management:\n`;
        response += `For cyclical pain: Evening primrose oil, reduced caffeine intake. For persistent pain: NSAIDs or topical diclofenac gel.\n\n`;

        if (clinical_data?.tumor_size > 1000) {
            response += `📌 Special Consideration for Your Case:\n`;
            response += `Given your tumor size measurement, we recommend:\n`;
            response += `- Ultrasound-guided core biopsy to confirm diagnosis\n`;
            response += `- Consultation with a breast surgeon to discuss excision options\n`;
            response += `- More frequent follow-up (every 3–6 months initially)\n\n`;
        }
    } else {
        response += `⚠️ For MALIGNANT Conditions:\n\n`;

        response += `🔪 Surgical Options:\n`;
        response += `- Lumpectomy (breast-conserving surgery) with sentinel node biopsy\n`;
        response += `- Mastectomy (simple, modified radical, or skin-sparing)\n`;
        response += `- Oncoplastic techniques for better cosmetic outcomes\n\n`;

        response += `🌈 Adjuvant Therapies:\n`;
        response += `- Radiation therapy (typically 3–6 weeks post-surgery)\n`;
        response += `- Chemotherapy regimens based on tumor characteristics\n`;
        response += `- Hormone therapy for ER/PR+ tumors (tamoxifen, aromatase inhibitors)\n`;
        response += `- Targeted therapies for HER2+ cases (trastuzumab, pertuzumab)\n\n`;

        if (clinical_data?.lymph_nodes > 30) {
            response += `📌 Special Consideration for Your Case:\n`;
            response += `Given your lymph node involvement, treatment may include:\n`;
            response += `- More extensive lymph node dissection\n`;
            response += `- More aggressive chemotherapy regimen\n`;
            response += `- Consideration of post-mastectomy radiation\n`;
            response += `- Genetic counseling referral\n\n`;
        }
    }

    response += `🧠 General Recommendations:\n`;
    response += `- Maintain regular follow-up appointments\n`;
    response += `- Consider joining a support group\n`;
    response += `- Discuss fertility preservation if relevant\n`;
    response += `- Address lifestyle factors (nutrition, exercise, smoking cessation)`;

    return response;
}

function getEnhancedDiagnosisResponse() {
    if (!state.patientData) return getDiagnosisResponse();

    const { diagnosis, clinical_data, age, gender } = state.patientData;
    const isBenign = diagnosis === 'B' || diagnosis.toLowerCase().includes('benign');

    // Calculate metrics
    const metrics = calculateMetrics(state.patientData);

    // Status thresholds
    const riskStatus = metrics.risk_score > 500 ? "⚠️ Critical" : "✅ Normal";
    const tumorStatus = metrics.tumor_size < 1000 ? "✅ Normal" : "⚠️ Elevated";
    const lymphStatus = metrics.lymph_nodes > 200 ? "⚠️ Critical" : "✅ Normal";

    let response = `🧬 Diagnostic Summary\n\n`;

    response += `👤 Patient Overview:\n`;
    response += `- Age: ${age} years\n`;
    response += `- Gender: ${gender}\n`;
    response += `- Primary Diagnosis: ${diagnosis}\n\n`;

    response += `📊 Key Health Metrics:\n`;
    response += `- Risk Score: ${metrics.risk_score.toFixed(1)}% ${riskStatus}\n`;
    response += `  → Estimated from clinical features like concavity, perimeter, etc.\n`;
    response += `  → A score > 500% indicates high risk. Normal range: <500%\n\n`;

    response += `- Tumor Size: ${metrics.tumor_size.toFixed(1)} mm² ${tumorStatus}\n`;
    response += `  → Calculated using perimeter and radius features (approx. area).\n`;
    response += `  → Tumors under 1000 mm² are typically less aggressive.\n\n`;

    response += `- Lymph Nodes: ${metrics.lymph_nodes.toFixed(1)} ${lymphStatus}\n`;
    response += `  → Indicates potential lymph node involvement.\n`;
    response += `  → Values > 200 may indicate higher cancer spread risk.\n\n`;

    response += `- Tumor Radius: ${clinical_data?.radius_worst?.toFixed(2) || '0'} mm\n`;
    response += `  → Represents the largest dimension of the tumor.\n`;
    response += `  → Normal tumors usually have a radius < 20 mm.\n\n`;

    response += `🩺 Interpretation:\n`;
    if (isBenign) {
        response += `Your results suggest benign (non-cancerous) characteristics, `;
        response += `though some metrics ${riskStatus.includes('⚠️') || lymphStatus.includes('⚠️') ? 'require attention' : 'are normal'}.\n`;
    } else {
        response += `Your results show concerning characteristics that `;
        response += `require immediate medical evaluation.\n`;
    }

    response += `\n📌 Recommendations:\n`;
    if (isBenign) {
        response += `- Routine follow-up recommended\n`;
        if (riskStatus.includes('⚠️') || lymphStatus.includes('⚠️')) {
            response += `- Some elevated metrics need monitoring\n`;
        }
    } else {
        response += `- Urgent specialist consultation needed\n`;
        response += `- Further diagnostic tests required\n`;
    }

    response += `\n⚠️ Note: This is an AI-generated summary and should be reviewed by your doctor.`;

    return response;
}

// =============================================
// Health Chart Visualization Functions
// =============================================

/**
 * Calculate health metrics from patient data
 */
function calculateMetrics(patient) {
    try {
        if (!patient?.clinical_data) throw new Error('Missing clinical data');
        
        const { 
            concave_points_worst = 0,
            concavity_mean = 0,
            radius_worst = 0,
            perimeter_worst = 0,
            area_mean = 0
        } = patient.clinical_data;

        return {
            risk_score: +(((
                concave_points_worst + 
                concavity_mean + 
                radius_worst
            ) / 3 * 100).toFixed(1)),
            
            tumor_size: +(Math.PI * Math.pow(radius_worst, 2)).toFixed(2),
            
            lymph_nodes: +Math.pow(
                (perimeter_worst + 
                 radius_worst * 7 + 
                 area_mean / 30 + 
                 concavity_mean * 200) / 2.5, 
                1.2
            ).toFixed(1)
        };
    } catch (error) {
        console.error('Metrics calculation error:', error);
        return { 
            risk_score: 0, 
            tumor_size: 0, 
            lymph_nodes: 0 
        };
    }
}

/**
 * Fetch previous metrics for trend comparison
 */
async function getPreviousMetrics(patient) {
    try {
        const response = await fetch(`/get_previous_metrics?patient_id=${patient.id}`);
        const data = await response.json();
        return data;  // { risk_score: 55, tumor_size: 1300, lymph_nodes: 25 }
    } catch (error) {
        console.error("Error fetching previous metrics:", error);
        return { risk_score: null, tumor_size: null, lymph_nodes: null };  // Return empty data if unavailable
    }
}

/**
 * Initialize health chart visualization
 */
function initHealthChart() {
    if (!elements.healthChart) {
        console.error('Chart canvas element not found!');
        return;
    }
    console.log('Initializing chart with element:', elements.healthChart);

    state.chart = new Chart(elements.healthChart, {
        type: 'bar',
        data: {
            labels: ['Risk Score', 'Tumor Size', 'Lymph Nodes'],
            datasets: [{
                label: 'Patient Metrics',
                backgroundColor: [
                    'rgb(252, 151, 166)', // Light pink
                    'rgb(251, 182, 98)', // Peach
                    'rgb(111, 202, 111)', // Mint green
                    'rgb(124, 215, 245)'  // Baby blue
                ],
                borderColor: [
                    'rgba(255, 182, 193, 1)', // Light pink border
                    'rgba(255, 228, 196, 1)', // Peach border
                    'rgba(193, 255, 193, 1)', // Mint green border
                    'rgba(173, 216, 230, 1)'  // Baby blue border
                ],
                borderWidth: 1,
                data: [0, 0, 0] // Initialize with zeros
            }]
        },
        options: {
            responsive: true,
            scales: { 
                y: { 
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Value'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            let unit = '';
                            if (ctx.parsed.y !== null) {
                                if (ctx.label === 'Risk Score') unit = '%';
                                if (ctx.label === 'Tumor Size') unit = ' mm²';
                                if (ctx.label === 'Lymph Nodes') unit = ' score';
                            }
                            return `${ctx.label}: ${ctx.parsed.y}${unit}`;
                        }
                    }
                }
            },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    // When user clicks a bar, show modal with detailed explanation
                    const modal = new bootstrap.Modal(document.getElementById('metricsModal'));
                    modal.show();
                }
            }
        }
    });
}

/**
 * Get appropriate chart colors based on diagnosis
 */
function getChartColors(diagnosis) {
    return diagnosis === 'M' 
        ? ['#ff6384', '#ff9f40', '#ffcd56'] // Red/Orange/Yellow for malignant
        : ['#4bc0c0', '#36a2eb', '#9966ff']; // Teal/Blue/Purple for benign
}

/**
 * Update health chart with current patient data
 */
function updateHealthChart(patient) {
    if (!state.chart) {
        console.error('Chart instance not initialized');
        return;
    }
    
    const metrics = calculateMetrics(patient);
    
    if (!metrics || Object.values(metrics).some(v => isNaN(v))) {
        console.error('Invalid metrics data');
        return;
    }
    
    // Update chart data
    state.chart.data.datasets[0].data = [
        metrics.risk_score,
        metrics.tumor_size,
        metrics.lymph_nodes
    ];
    state.chart.update();
}

/**
 * Generate an advanced explanation of health metrics (HTML-safe)
 */
async function explainMetrics(patient) {
    try {
        const metrics = await calculateMetrics(patient);
        const previousMetrics = await getPreviousMetrics(patient.id);
        const diagnosis = patient.diagnosis || 'Unknown';
        const isBenign = diagnosis === 'B' || diagnosis.toLowerCase().includes('benign');

        function getSeverity(value, thresholds) {
            // Less alarming colors and messaging for benign diagnosis
            const benignColors = {
                critical: "#e67e22", // Orange instead of red
                high: "#f39c12",     // Amber instead of orange
                moderate: "#3498db", // Blue instead of yellow
                normal: "#2ecc71"    // Green stays green
            };
            
            // Standard colors for malignant
            const malignantColors = {
                critical: "#dc3545", // Red
                high: "#fd7e14",     // Orange
                moderate: "#ffc107", // Yellow
                normal: "#28a745"    // Green
            };
            
            const colors = isBenign ? benignColors : malignantColors;
            
            if (value >= thresholds.critical) return {
                level: isBenign ? "Elevated" : "Critical",
                color: colors.critical,
                icon: isBenign ? "🔍" : "⚠️",
                note: isBenign 
                    ? "Higher than typical, but consistent with many benign conditions. Follow-up recommended."
                    : "Requires immediate medical attention."
            };
            
            if (value >= thresholds.high) return {
                level: isBenign ? "Moderate" : "High",
                color: colors.high,
                icon: isBenign ? "🔍" : "⚠️",
                note: isBenign 
                    ? "Slightly elevated but often seen in benign cases. Regular monitoring advised."
                    : "Should be discussed with your healthcare provider promptly."
            };
            
            if (value >= thresholds.moderate) return {
                level: isBenign ? "Mild" : "Moderate",
                color: colors.moderate,
                icon: "🔍",
                note: isBenign 
                    ? "Within expected range for benign conditions."
                    : "Continued monitoring recommended."
            };
            
            return {
                level: "Normal",
                color: colors.normal,
                icon: "✅",
                note: isBenign 
                    ? "Normal range, supporting benign diagnosis."
                    : "Within normal parameters."
            };
        }

        function formatValue(value, type) {
            if (type === 'risk') return `${value.toFixed(1)}%`;
            if (type === 'size') return `${value.toFixed(1)} mm²`;
            return value.toFixed(1);
        }

        function getTrend(current, previous) {
            if (!previous) return { text: "No previous data", icon: "—", color: "#6c757d" };
            
            const percentChange = ((current - previous) / previous) * 100;
            
            if (Math.abs(percentChange) < 5) return { 
                text: "Stable", 
                icon: "→", 
                color: "#6c757d" 
            };
            
            if (percentChange > 0) return { 
                text: `${percentChange.toFixed(1)}% increase`, 
                icon: "↑", 
                color: isBenign ? "#f39c12" : "#dc3545" 
            };
            
            return { 
                text: `${Math.abs(percentChange).toFixed(1)}% decrease`, 
                icon: "↓", 
                color: "#28a745" 
            };
        }

        const risk = getSeverity(metrics.risk_score, { critical: 80, high: 60, moderate: 40 });
        const tumor = getSeverity(metrics.tumor_size, { critical: 2500, high: 1800, moderate: 1000 });
        const lymph = getSeverity(metrics.lymph_nodes, { critical: 60, high: 40, moderate: 20 });
        
        const riskTrend = getTrend(metrics.risk_score, previousMetrics?.risk_score);
        const tumorTrend = getTrend(metrics.tumor_size, previousMetrics?.tumor_size);
        const lymphTrend = getTrend(metrics.lymph_nodes, previousMetrics?.lymph_nodes);

        // Diagnosis-specific context message
        const contextMessage = isBenign 
            ? `<div class="alert alert-info mb-4">
                <div class="d-flex align-items-center">
                    <i class="fas fa-info-circle me-3" style="font-size: 1.5rem;"></i>
                    <div>
                        <h5 class="alert-heading mb-1">Benign Diagnosis Context</h5>
                        <p class="mb-0">Your diagnosis is benign (non-cancerous). Some metrics may appear elevated but should be interpreted in context of this benign diagnosis.</p>
                    </div>
                </div>
              </div>`
            : `<div class="alert alert-warning mb-4">
                <div class="d-flex align-items-center">
                    <i class="fas fa-exclamation-circle me-3" style="font-size: 1.5rem;"></i>
                    <div>
                        <h5 class="alert-heading mb-1">Malignant Diagnosis Context</h5>
                        <p class="mb-0">Your diagnosis indicates a malignant condition. These metrics should be carefully reviewed with your healthcare team.</p>
                    </div>
                </div>
              </div>`;

        return `
            ${contextMessage}
            
            <div class="metric-grid">
                <!-- Risk Score Card -->
                <div class="metric-card" style="border-color: ${risk.color}">
                    <div class="metric-header">
                        <span class="metric-icon">${risk.icon}</span>
                        <h3 class="metric-title">Risk Score</h3>
                    </div>
                    <div class="metric-value" style="color: ${risk.color}">
                        ${formatValue(metrics.risk_score, 'risk')}
                        <span class="trend-indicator" style="color: ${riskTrend.color}; font-size: 0.8em;">
                            ${riskTrend.icon}
                        </span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${Math.min(100, metrics.risk_score)}%; background: linear-gradient(to right, #28a745, ${risk.color})"></div>
                    </div>
                    <div class="metric-details">
                        <div class="metric-detail-row">
                            <span>Status:</span>
                            <span class="fw-bold" style="color: ${risk.color}">${risk.level}</span>
                        </div>
                        <div class="metric-detail-row">
                            <span>Previous:</span>
                            <span>${previousMetrics?.risk_score ? formatValue(previousMetrics.risk_score, 'risk') : 'N/A'}</span>
                        </div>
                        <div class="metric-note mt-2">
                            ${risk.note}
                        </div>
                    </div>
                </div>

                <!-- Tumor Size Card -->
                <div class="metric-card" style="border-color: ${tumor.color}">
                    <div class="metric-header">
                        <span class="metric-icon">${tumor.icon}</span>
                        <h3 class="metric-title">Tumor Size</h3>
                    </div>
                    <div class="metric-value" style="color: ${tumor.color}">
                        ${formatValue(metrics.tumor_size, 'size')}
                        <span class="trend-indicator" style="color: ${tumorTrend.color}; font-size: 0.8em;">
                            ${tumorTrend.icon}
                        </span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${Math.min(100, metrics.tumor_size/30)}%; background: linear-gradient(to right, #28a745, ${tumor.color})"></div>
                    </div>
                    <div class="metric-details">
                        <div class="metric-detail-row">
                            <span>Status:</span>
                            <span class="fw-bold" style="color: ${tumor.color}">${tumor.level}</span>
                        </div>
                        <div class="metric-detail-row">
                            <span>Previous:</span>
                            <span>${previousMetrics?.tumor_size ? formatValue(previousMetrics.tumor_size, 'size') : 'N/A'}</span>
                        </div>
                        <div class="metric-note mt-2">
                            ${tumor.note}
                        </div>
                    </div>
                </div>

                <!-- Lymph Nodes Card -->
                <div class="metric-card" style="border-color: ${lymph.color}">
                    <div class="metric-header">
                        <span class="metric-icon">${lymph.icon}</span>
                        <h3 class="metric-title">Lymph Nodes</h3>
                    </div>
                    <div class="metric-value" style="color: ${lymph.color}">
                        ${formatValue(metrics.lymph_nodes, 'nodes')}
                        <span class="trend-indicator" style="color: ${lymphTrend.color}; font-size: 0.8em;">
                            ${lymphTrend.icon}
                        </span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${Math.min(100, metrics.lymph_nodes)}%; background: linear-gradient(to right, #28a745, ${lymph.color})"></div>
                    </div>
                    <div class="metric-details">
                        <div class="metric-detail-row">
                            <span>Status:</span>
                            <span class="fw-bold" style="color: ${lymph.color}">${lymph.level}</span>
                        </div>
                        <div class="metric-detail-row">
                            <span>Previous:</span>
                            <span>${previousMetrics?.lymph_nodes ? formatValue(previousMetrics.lymph_nodes, 'nodes') : 'N/A'}</span>
                        </div>
                        <div class="metric-note mt-2">
                            ${lymph.note}
                        </div>
                    </div>
                </div>
            </div>

            ${(metrics.risk_score > 70 || metrics.lymph_nodes > 50) && !isBenign ? `
            <div class="alert alert-urgent alert-dismissible fade show mt-4">
                <div class="d-flex align-items-center">
                    <i class="fas fa-exclamation-triangle me-3" style="font-size: 1.5rem;"></i>
                    <div>
                        <h5 class="alert-heading mb-1">Urgent Attention Required</h5>
                        <p class="mb-0">Based on these metrics, immediate medical consultation is strongly recommended.</p>
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${(metrics.risk_score > 70 || metrics.lymph_nodes > 50) && isBenign ? `
            <div class="alert alert-info alert-dismissible fade show mt-4">
                <div class="d-flex align-items-center">
                    <i class="fas fa-stethoscope me-3" style="font-size: 1.5rem;"></i>
                    <div>
                        <h5 class="alert-heading mb-1">Follow-up Recommended</h5>
                        <p class="mb-0">Although your diagnosis is benign, some elevated metrics suggest scheduling a follow-up appointment.</p>
                    </div>
                </div>
            </div>
            ` : ''}
            `;
    } catch (error) {
        return `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Could not load health metrics: ${error.message}
                <br>Please try refreshing the patient data.
            </div>
        `;
    }
}

// Helper to escape HTML (simplistic version)
function escapeHtml(str) {
    return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// =============================================
// Chat Utility Functions
// =============================================

/**
 * Export chat history to text file
 */
function exportChat() {
    const chatText = state.messages.map(msg => 
        `${msg.sender === 'user' ? 'You' : 'Assistant'}: ${msg.text} (${msg.timestamp.toLocaleString()})`
    ).join('\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `breast-cancer-chat-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    addBotMessage("Chat exported successfully!");
}

/**
 * Clear chat history
 */
function clearChat() {
    if (confirm("Are you sure you want to clear the chat history?")) {
        state.messages = [];
        elements.chatHistory.innerHTML = '';
        addBotMessage("Chat history cleared. How can I help you now?");
    }
}

/**
 * Toggle between medical and simple terminology modes
 */
function toggleMedicalMode() {
    state.medicalMode = !state.medicalMode;
    elements.medicalModeButton.innerHTML = 
        `<i class="fas fa-user-md me-2"></i>Medical Mode: ${state.medicalMode ? 'On' : 'Off'}`;
    
    if (state.medicalMode) {
        addBotMessage("Switched to Medical Mode. I'll use specialized breast cancer terminology and information.");
    } else {
        addBotMessage("Switched to AI Assistant Mode. I'll use OpenRouter API to answer general questions.");
    }
}

/**
 * Generate and download PDF report
 */
async function generatePDFReport() {
    try {
        // Show loading indicator
        const loadingElement = document.createElement('div');
        loadingElement.classList.add('message', 'bot-message');
        loadingElement.innerHTML = '<div class="message-content"><i class="fas fa-spinner fa-spin me-2"></i> Generating your personalized report...</div>';
        elements.chatHistory.appendChild(loadingElement);

        // Prepare data for report
        const response = await fetch("/generate-report", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: state.patientData.name,
                gender: state.patientData.gender,
                age: state.patientData.age,
                prediction: state.patientData.diagnosis,
                clinical_data: state.patientData.clinical_data
            })
        });

        // Remove loading indicator
        elements.chatHistory.removeChild(loadingElement);

        if (!response.ok) {
            throw new Error('Failed to generate report');
        }

        // Download the generated PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BreastCancerReport_${state.patientData.name}_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        // Success message
        addBotMessage("✅ Your personalized report has been generated and downloaded.");
        
    } catch (error) {
        console.error('Report generation error:', error);
        addBotMessage(`❌ Sorry, we couldn't generate your report: ${error.message}`);
    }
}

// =============================================
// Initialization
// =============================================

/**
 * Initialize when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', init);