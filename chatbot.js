document.addEventListener('DOMContentLoaded', () => {
  const floatingBtn = document.getElementById('chatbot-floating-btn');
  const chatWindow = document.getElementById('chatbot-window');
  const closeBtn = document.getElementById('chatbot-close-btn');
  const messagesContainer = document.getElementById('chatbot-messages');
  const chatInput = document.getElementById('chatbot-input');
  const sendBtn = document.getElementById('chatbot-send-btn');

  if (!floatingBtn || !chatWindow || !closeBtn || !messagesContainer || !chatInput || !sendBtn) {
    return;
  }

  let isInitialized = false;

  function toggleChat() {
    const isHidden = chatWindow.classList.contains('chatbot-hidden');
    if (isHidden) {
      chatWindow.classList.remove('chatbot-hidden');
      if (!isInitialized) {
        appendMessage('bot', '안녕하세요. 자격증 접수 도우미입니다.\n자격증 시험 접수에 대해 궁금한 내용을 질문해주세요.');
        isInitialized = true;
      }
      chatInput.focus();
    } else {
      chatWindow.classList.add('chatbot-hidden');
    }
  }

  floatingBtn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  function appendMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message chatbot-${sender}`;
    messageDiv.textContent = text;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return messageDiv;
  }

  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    appendMessage('user', text);

    const loadingDiv = appendMessage('loading', '답변을 작성중입니다...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: text })
      });

      const data = await response.json();

      messagesContainer.removeChild(loadingDiv);

      if (!response.ok) {
        throw new Error(data.error || '답변을 불러오지 못했습니다.');
      }

      appendMessage('bot', data.answer);

    } catch (error) {
      console.error('Chat error:', error);
      if (messagesContainer.contains(loadingDiv)) {
        messagesContainer.removeChild(loadingDiv);
      }
      appendMessage('bot', '답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
  }

  sendBtn.addEventListener('click', sendMessage);

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });
});
