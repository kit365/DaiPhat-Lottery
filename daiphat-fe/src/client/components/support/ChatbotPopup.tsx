import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Minus, Send } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AppToast } from '../../utils/toast.util';
import { useChatConversation } from '../../hooks/useChatConversation';
import { ChatMessageResponse, ConversationDetailResponse } from '../../../types/chat.type';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
}

const formatTime = (value?: string | null) => {
  if (!value) {
    return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const toUiMessage = (message: ChatMessageResponse): Message => ({
  id: String(message.id),
  sender: message.senderType === 'CUSTOMER' ? 'user' : 'bot',
  text: message.content?.trim() || '[Tin nhắn trống]',
  timestamp: formatTime(message.createdAt),
});

const appendInitializedMessages = (
  currentMessages: Message[],
  detail: ConversationDetailResponse
): Message[] => {
  const nextMessages = [...currentMessages];
  const existingIds = new Set(currentMessages.map((message) => message.id));

  detail.messages
    .filter((message) => message.type === 'TEXT' || message.type === 'SYSTEM')
    .map(toUiMessage)
    .forEach((message) => {
      if (!existingIds.has(message.id)) {
        nextMessages.push(message);
        existingIds.add(message.id);
      }
    });

  const hasOperator = detail.participations.some((participation) => participation.role === 'OPERATOR');
  nextMessages.push({
    id: `system-${detail.conversation.id}`,
    sender: 'bot',
    text: hasOperator
      ? 'Phiên hỗ trợ đã được tạo. Nhân viên sẽ tiếp nhận và phản hồi sớm nhất.'
      : 'Phiên hỗ trợ đã được tạo. Hệ thống đang chờ nhân viên tham gia cuộc trò chuyện.',
    timestamp: formatTime(detail.conversation.updatedAt || detail.conversation.createdAt),
  });

  return nextMessages;
};

export const ChatbotPopup = () => {
  const token = useAuthStore((state) => state.token);
  const { initConversation, sendRealtimeMessage, isInitializing } = useChatConversation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Xin chào! 👋\nBạn cần Đại Phát hỗ trợ điều gì? Hãy để lại lời nhắn, đội ngũ sẽ phản hồi sớm nhất.',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickReplies = [
    'Tôi cần hỗ trợ đơn hàng',
    'Tôi muốn hỏi kết quả xổ số',
    'Tôi cần hỗ trợ thanh toán',
    'Tôi muốn liên hệ nhân viên'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (text: string) => {
    const normalizedText = text.trim();
    if (!normalizedText) return;

    if (!token) {
      AppToast.info('Vui lòng đăng nhập để bắt đầu cuộc trò chuyện hỗ trợ.');
      return;
    }

    setInputValue('');

    if (!conversationId) {
      const detail = await initConversation({
        title: 'Yêu cầu hỗ trợ từ khách hàng',
        content: normalizedText,
      });

      if (!detail) {
        return;
      }

      setConversationId(detail.conversation.id);
      setMessages((prev) => appendInitializedMessages(prev, detail));
      return;
    }

    const userMessage: Message = {
      id: `local-${Date.now()}`,
      sender: 'user',
      text: normalizedText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      await sendRealtimeMessage(conversationId, normalizedText);
    } catch (error) {
      AppToast.error('Không thể gửi tin nhắn realtime lúc này.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleSend(inputValue);
    }
  };

  if (!token) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-[#df1b1c] to-[#ff4b4b] rounded-full flex items-center justify-center shadow-2xl hover:shadow-[#df1b1c]/50 hover:scale-110 transition-all duration-300 z-50 group"
        aria-label="Open chat"
      >
        <MessageCircle className="w-7 h-7 text-white group-hover:animate-pulse" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
        </span>
      </button>
    );
  }

  return (
    <div 
      className={`fixed right-6 bottom-6 z-50 flex flex-col bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-300 ease-in-out border border-gray-100 ${
        isMinimized ? 'h-16 w-[360px]' : 'h-[600px] w-[380px]'
      }`}
    >
      <div className="h-16 bg-gradient-to-r from-[#df1b1c] to-[#ff4b4b] flex items-center justify-between px-4 text-white shrink-0 shadow-sm relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-white/20">
              <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Đại Phát" className="w-full h-full object-contain" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#df1b1c] rounded-full"></div>
          </div>
          <div>
            <h3 className="font-semibold text-base leading-tight">Chat với Đại Phát</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-white/90 font-medium">Đang hoạt động</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(!isMinimized)} 
            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <Minus className="w-5 h-5 text-white" />
          </button>
          <button 
            onClick={() => setIsOpen(false)} 
            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 bg-[#f8f9fa] scrollbar-thin scrollbar-thumb-gray-200">
            <div className="flex flex-col gap-4">
              <div className="text-center text-xs text-gray-400 my-2">Hôm nay</div>
              
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'}`}>
                  {msg.sender === 'bot' && (
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 shrink-0 border border-gray-200 mt-auto mb-1 bg-white">
                      <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Avatar" className="w-full h-full object-contain p-1" />
                    </div>
                  )}
                  <div className={`max-w-[75%] ${msg.sender === 'bot' ? 'items-start' : 'items-end'} flex flex-col`}>
                    <div 
                      className={`px-4 py-2.5 text-[15px] whitespace-pre-wrap ${
                        msg.sender === 'bot' 
                          ? 'bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100' 
                          : 'bg-gradient-to-r from-[#df1b1c] to-[#ff4b4b] text-white rounded-2xl rounded-br-sm shadow-md'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[11px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="px-4 py-3 bg-white border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => void handleSend(reply)}
                  className="px-3 py-1.5 text-[13px] font-medium text-[#df1b1c] bg-red-50 border border-red-200 rounded-full hover:bg-[#df1b1c] hover:text-white transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2 bg-[#f8f9fa] rounded-full border border-gray-200 p-1.5 focus-within:border-red-300 focus-within:ring-1 focus-within:ring-red-100 transition-all pl-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Nhập nội dung cần hỗ trợ..."
                className="flex-1 bg-transparent border-none focus:outline-none text-[15px] text-gray-700 placeholder-gray-400 py-2"
              />
              <button 
                onClick={() => void handleSend(inputValue)}
                disabled={!inputValue.trim() || isInitializing}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  inputValue.trim() && !isInitializing
                    ? 'bg-[#df1b1c] text-white shadow-md hover:bg-red-700' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
