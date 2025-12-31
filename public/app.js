// State management
let conversations = [];
let currentConversationId = null;
let selectedFiles = []; // Track selected files
let selectedModel = 'auto'; // Default: Auto rotation

// DOM elements
const sidebar = document.getElementById('sidebar');
const hamburger = document.getElementById('hamburger');
const newChatBtn = document.getElementById('newChatBtn');
const conversationsList = document.getElementById('conversationsList');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatTitle = document.getElementById('chatTitle');
const mainContent = document.getElementById('mainContent');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const filePreviewContainer = document.getElementById('filePreviewContainer');
const modelSelectorBtn = document.getElementById('modelSelectorBtn');
const modelDropdown = document.getElementById('modelDropdown');
const selectedModelName = document.getElementById('selectedModelName');

// Initialize app
function init() {
    loadConversations();
    attachEventListeners();

    // If no conversations, create one
    if (conversations.length === 0) {
        createNewConversation();
    } else {
        // Load the most recent conversation
        loadConversation(conversations[0].id);
    }
}

// Event listeners
function attachEventListeners() {
    hamburger.addEventListener('click', toggleSidebar);
    newChatBtn.addEventListener('click', createNewConversation);
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea and keep it visible
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';

        // Scroll textarea into view smoothly
        messageInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // File upload listeners
    attachBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    // Model selector listeners
    modelSelectorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleModelDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        modelDropdown.classList.remove('show');
        modelSelectorBtn.classList.remove('active');
    });

    // Model option selection
    const modelOptions = document.querySelectorAll('.model-option');
    modelOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            selectModel(option.dataset.model);
        });
    });
}

function toggleModelDropdown() {
    modelDropdown.classList.toggle('show');
    modelSelectorBtn.classList.toggle('active');
}

function selectModel(model) {
    selectedModel = model;

    // Update UI
    const modelNames = {
        'auto': 'Auto',
        'kimi': 'Kimi K2',
        'reasoning': 'GPT-OSS-120B',
        'cerebras': 'Cerebras Llama'
    };

    selectedModelName.textContent = modelNames[model];

    // Update selected state
    document.querySelectorAll('.model-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    document.querySelector(`[data - model= "${model}"]`).classList.add('selected');

    // Close dropdown
    modelDropdown.classList.remove('show');
    modelSelectorBtn.classList.remove('active');
}

// Sidebar toggle
function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
}

// Load conversations from localStorage
function loadConversations() {
    const stored = localStorage.getItem('ai_conversations');
    if (stored) {
        try {
            conversations = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading conversations:', e);
            conversations = [];
        }
    }
    renderConversationsList();
}

// Save conversations to localStorage
function saveConversations() {
    localStorage.setItem('ai_conversations', JSON.stringify(conversations));
}

// Render conversations list
function renderConversationsList() {
    conversationsList.innerHTML = '';

    conversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'conversation-item';
        if (conv.id === currentConversationId) {
            item.classList.add('active');
        }

        const title = document.createElement('span');
        title.className = 'title';
        title.textContent = conv.title || 'Nueva conversación';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteConversation(conv.id);
        };

        item.appendChild(title);
        item.appendChild(deleteBtn);
        item.onclick = () => loadConversation(conv.id);

        conversationsList.appendChild(item);
    });
}

// Create new conversation
function createNewConversation() {
    const newConv = {
        id: Date.now().toString(),
        title: 'Nueva conversación',
        messages: [],
        createdAt: new Date().toISOString()
    };

    conversations.unshift(newConv);
    saveConversations();
    renderConversationsList();
    loadConversation(newConv.id);
}

// Load conversation
function loadConversation(id) {
    currentConversationId = id;
    const conversation = conversations.find(c => c.id === id);

    if (!conversation) return;

    // Update UI
    chatTitle.textContent = conversation.title;
    messagesContainer.innerHTML = '';

    // Render messages
    conversation.messages.forEach(msg => {
        appendMessage(msg.role, msg.content, false);
    });

    renderConversationsList();
    // Scroll to bottom after messages are rendered - using requestAnimationFrame ensures DOM is updated
    requestAnimationFrame(() => {
        setTimeout(() => scrollToBottom(), 300);
    });
}

// Delete conversation
function deleteConversation(id) {
    if (conversations.length === 1) {
        alert('No puedes eliminar la última conversación');
        return;
    }

    conversations = conversations.filter(c => c.id !== id);
    saveConversations();
    renderConversationsList();

    if (currentConversationId === id) {
        loadConversation(conversations[0].id);
    }
}

// Send message
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    // Disable input
    messageInput.disabled = true;
    sendBtn.disabled = true;

    // Add user message
    appendMessage('user', message);
    addMessageToConversation('user', message);

    // Clear input
    messageInput.value = '';

    // Update conversation title if it's the first message
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (conversation && conversation.messages.length === 1) {
        conversation.title = message.substring(0, 50);
        chatTitle.textContent = conversation.title;
        renderConversationsList();
        saveConversations();
    }

    // Show typing indicator
    const typingDiv = appendTypingIndicator();

    try {
        // Prepare request
        let fetchOptions;

        if (selectedFiles.length > 0) {
            // Use FormData for file upload
            const formData = new FormData();
            formData.append('messages', JSON.stringify(
                conversation.messages.map(m => ({
                    role: m.role,
                    content: m.content
                }))
            ));
            formData.append('model', selectedModel);

            // Append files
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            fetchOptions = {
                method: 'POST',
                body: formData
            };

            // Clear files after sending
            selectedFiles = [];
            updateFilePreview();
        } else {
            // Regular JSON request
            fetchOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: conversation.messages.map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    model: selectedModel
                })
            };
        }


        // Determine API endpoint based on environment
        const apiEndpoint = window.location.hostname.includes('vercel.app') ? '/api/chat' : '/chat';

        // Call API
        const response = await fetch(apiEndpoint, fetchOptions);

        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }

        // Remove typing indicator
        typingDiv.remove();

        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';
        let messageDiv = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            assistantMessage += chunk;

            if (!messageDiv) {
                messageDiv = appendMessage('assistant', assistantMessage);
            } else {
                updateMessage(messageDiv, assistantMessage);
            }

            scrollToBottom();
        }

        // Save assistant message
        addMessageToConversation('assistant', assistantMessage);

    } catch (error) {
        console.error('Error:', error);
        typingDiv.remove();
        appendMessage('assistant', 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.');
    }

    // Re-enable input
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
}

// Append message to UI
function appendMessage(role, content, scroll = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role} `;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';

    // Render markdown for assistant messages, plain text for user
    if (role === 'assistant' && typeof marked !== 'undefined') {
        contentDiv.innerHTML = marked.parse(content);
        enhanceCodeBlocks(contentDiv);
    } else {
        contentDiv.textContent = content;
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    if (scroll) {
        scrollToBottom();
    }

    return messageDiv;
}

// Update message content
function updateMessage(messageDiv, content) {
    const contentDiv = messageDiv.querySelector('.content');
    const role = messageDiv.classList.contains('user') ? 'user' : 'assistant';

    // Render markdown for assistant messages
    if (role === 'assistant' && typeof marked !== 'undefined') {
        contentDiv.innerHTML = marked.parse(content);
        enhanceCodeBlocks(contentDiv);
    } else {
        contentDiv.textContent = content;
    }
}

// Enhance code blocks with copy button and language label
function enhanceCodeBlocks(container) {
    const codeBlocks = container.querySelectorAll('pre code');

    codeBlocks.forEach(codeBlock => {
        // Apply syntax highlighting if hljs is available
        if (typeof hljs !== 'undefined') {
            hljs.highlightElement(codeBlock);
        }

        const pre = codeBlock.parentElement;

        // Skip if already enhanced
        if (pre.querySelector('.code-header')) return;

        // Get language from class (e.g., language-python)
        const langClass = Array.from(codeBlock.classList).find(cls => cls.startsWith('language-'));
        const language = langClass ? langClass.replace('language-', '') : 'code';

        // Create header with language label and copy button
        const header = document.createElement('div');
        header.className = 'code-header';

        const langLabel = document.createElement('span');
        langLabel.className = 'code-language';
        langLabel.textContent = language;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-btn';
        copyBtn.innerHTML = `
    < svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" stroke - width="2" >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg >
    <span>Copiar código</span>
`;

        copyBtn.onclick = () => {
            const code = codeBlock.textContent;
            navigator.clipboard.writeText(code).then(() => {
                copyBtn.innerHTML = `
    < svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" stroke - width="2" >
        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg >
    <span>¡Copiado!</span>
`;
                setTimeout(() => {
                    copyBtn.innerHTML = `
    < svg width = "16" height = "16" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" stroke - width="2" >
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg >
    <span>Copiar código</span>
`;
                }, 2000);
            });
        };

        header.appendChild(langLabel);
        header.appendChild(copyBtn);
        pre.insertBefore(header, codeBlock);
    });
}


// Append typing indicator
function appendTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = '🤖';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(typingDiv);
    messagesContainer.appendChild(messageDiv);

    scrollToBottom();
    return messageDiv;
}

// Add message to conversation
function addMessageToConversation(role, content) {
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (conversation) {
        conversation.messages.push({ role, content });
        saveConversations();
    }
}

// Scroll to bottom
function scrollToBottom() {
    if (!mainContent) {
        console.error('mainContent is null');
        return;
    }

    // Scroll the main content container (not messagesContainer)
    const scrollHeight = mainContent.scrollHeight;
    const clientHeight = mainContent.clientHeight;

    console.log(`Scrolling mainContent to bottom: scrollHeight=${scrollHeight}, clientHeight=${clientHeight}`);

    // Direct scrollTop assignment
    mainContent.scrollTop = scrollHeight;

    // Also use scrollTo for good measure
    mainContent.scrollTo({
        top: scrollHeight,
        behavior: 'smooth'
    });
}

// File handling functions
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    const maxSize = 20 * 1024 * 1024; // 20MB

    for (const file of files) {
        if (file.size > maxSize) {
            alert(`File "${file.name}" is too large.Maximum size is 20MB.`);
            continue;
        }
        selectedFiles.push(file);
    }

    fileInput.value = '';
    updateFilePreview();
}

function updateFilePreview() {
    filePreviewContainer.innerHTML = '';

    if (selectedFiles.length === 0) {
        filePreviewContainer.style.display = 'none';
        return;
    }

    filePreviewContainer.style.display = 'flex';

    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-preview-item';

        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'file-preview-image';
            img.onload = () => URL.revokeObjectURL(img.src);
            fileItem.appendChild(img);
        } else {
            const iconEl = document.createElement('div');
            iconEl.className = 'file-icon';
            iconEl.textContent = getFileIcon(file);
            fileItem.appendChild(iconEl);
        }

        const info = document.createElement('div');
        info.className = 'file-info';
        info.innerHTML = `
    < div class="file-name" > ${file.name}</div >
        <div class="file-size">${formatFileSize(file.size)}</div>
`;
        fileItem.appendChild(info);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'file-remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => removeFile(index);
        fileItem.appendChild(removeBtn);

        filePreviewContainer.appendChild(fileItem);
    });
}

function getFileIcon(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const iconMap = {
        pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
        ppt: '📊', pptx: '📊', txt: '📃', json: '📋', csv: '📋',
        zip: '📦', rar: '📦', md: '📝'
    };
    return iconMap[ext] || '📎';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFilePreview();
}

// Start app
init();
