// /src/pages/ChatPage.js (VERSÃO FINAL 5.5 - KAV CORRIGIDO)
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase, useAuth } from '../context/AuthContext';
import { Send, Zap, RotateCcw } from 'lucide-react-native';

// Paleta de Cores
const cores = {
  primary: '#00C853',
  secondary: '#1A202C',
  textLight: '#FFFFFF',
  softGray: '#F7FAFC',
  gray200: '#E2E8F0',
  gray500: '#64748B',
  light: '#FFFFFF',
};

// Componente Markdown (Idêntico)
const AiMessageRenderer = ({ text }) => {
  if (!text) return null;
  const parts = text.split('**');
  return (
    <Text style={styles.aiMessageText}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <Text key={index} style={{ fontWeight: 'bold' }}>{part}</Text>
        ) : (
          part
        )
      )}
    </Text>
  );
};

// Componente Quick Reply (Idêntico)
const QuickReplyFooter = ({ replies, onTap }) => {
  return (
    <View style={styles.quickReplyContainer}>
      {replies.map((reply) => (
        <TouchableOpacity
          key={reply}
          style={styles.quickReplyButton}
          onPress={() => onTap(reply)}
        >
          <Text style={styles.quickReplyText}>{reply}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Constantes Iniciais (Idênticas)
const INITIAL_MESSAGE = {
  role: 'ai',
  text: 'Olá! Eu sou o CertifAI. Como posso ajudar com suas dúvidas sobre finanças e certificações?',
};
const INITIAL_QUICK_REPLIES = [
  'O que é CPA-10?',
  'Fale sobre Renda Fixa',
  'O que é o FGC?',
];


export default function ChatPage() {
  const { user } = useAuth();
  const [chatHistory, setChatHistory] = useState([INITIAL_MESSAGE]);
  const [chatInput, setChatInput] = useState('');
  const [isAiReplying, setIsAiReplying] = useState(false);
  const flatListRef = useRef(null);
  const typingIntervalRef = useRef(null);
  const [isShortAnswer, setIsShortAnswer] = useState(false);
  const [quickReplies, setQuickReplies] = useState(INITIAL_QUICK_REPLIES);

  const toggleShortAnswer = () => setIsShortAnswer(prev => !prev);

  // Lógica (Toda idêntica ao Passo 22)
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  const simulateTyping = (fullText) => {
    const words = fullText.split(' ');
    let wordIndex = 0;

    typingIntervalRef.current = setInterval(() => {
      if (wordIndex < words.length) {
        const textToShow = words.slice(0, wordIndex + 1).join(' ');
        
        setChatHistory((prev) => {
          const historyWithoutLast = prev.slice(0, -1);
          const lastMessage = prev[prev.length - 1];
          const updatedMessageObject = {
            ...lastMessage,
            text: textToShow,
          };
          return [...historyWithoutLast, updatedMessageObject];
        });
        
        wordIndex++;
      } else {
        clearInterval(typingIntervalRef.current);
        setIsAiReplying(false);
      }
    }, 50);
  };
  
  const sendChatMessage = async (messageText) => {
    setIsAiReplying(true);
    setQuickReplies([]); 
    
    setChatHistory((prev) => [...prev, { role: 'ai', text: '' }]);
    
    const fullHistory = [...chatHistory, { role: 'user', text: messageText }];
    const historyForAPI = fullHistory.slice(1);
    
    try {
      const requestBody = {
        history: historyForAPI.map(msg => ({ role: msg.role, text: msg.text })),
        isShortAnswer: isShortAnswer,
      };

      const { data, error } = await supabase.functions.invoke(
        'get-ai-general-chat',
        { 
          body: JSON.stringify(requestBody)
        } 
      );
      
      if (error) throw error;
      const aiResponseText = data.text || "Não recebi uma resposta.";
      simulateTyping(aiResponseText);

    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      let errorMessage = error.message;
      if (error.message.includes('GEMINI_API_KEY')) {
          errorMessage = "A chave de API do chat não foi configurada no servidor.";
      }

      setChatHistory((prev) => {
         const historyWithoutLast = prev.slice(0, -1);
         return [...historyWithoutLast, { role: 'ai', text: `Desculpe, ocorreu um erro: ${errorMessage}` }];
      });
      setIsAiReplying(false);
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || isAiReplying) return;
    const userMessageText = chatInput.trim();
    const userMessage = { role: 'user', text: userMessageText };
    setChatHistory([...chatHistory, userMessage]);
    setChatInput('');
    sendChatMessage(userMessageText);
  };
  
  const handleQuickReplyTap = (replyText) => {
    if (isAiReplying) return;
    const userMessage = { role: 'user', text: replyText };
    setChatHistory([...chatHistory, userMessage]);
    sendChatMessage(replyText);
  };

  const handleResetChat = () => {
    if (isAiReplying) return; 
    Alert.alert(
      "Reiniciar Chat",
      "Tem certeza de que deseja apagar o histórico e recomeçar a conversa?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Reiniciar", 
          style: "destructive", 
          onPress: () => {
            setChatHistory([INITIAL_MESSAGE]);
            setQuickReplies(INITIAL_QUICK_REPLIES);
            setChatInput('');
            setIsAiReplying(false);
            if (typingIntervalRef.current) {
              clearInterval(typingIntervalRef.current);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header (Idêntico) */}
      <View style={styles.header}>
        <View style={styles.headerButtonContainer}>
          <TouchableOpacity 
            onPress={toggleShortAnswer} 
            style={[styles.toggleButton, isShortAnswer && styles.toggleButtonActive]}
          >
            <Zap size={16} color={isShortAnswer ? cores.primary : cores.gray500} />
            <Text style={[styles.toggleText, isShortAnswer && styles.toggleTextActive]}>Resposta Curta</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleResetChat} 
            style={styles.resetButton}
            disabled={isAiReplying}
          >
            <RotateCcw size={18} color={isAiReplying ? cores.gray200 : cores.gray500} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ======================================================= */}
      {/* ☆ INÍCIO DA MUDANÇA (ESTRUTURA DO KAV) ☆ */}
      {/* ======================================================= */}
      {/* 1. O KAV agora envolve TUDO, exceto o Header */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer} // <-- (style = flex: 1)
        // 2. O offset é a altura da TabBar (80px)
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0} 
      >
        {/* 3. A FlatList (chat) ocupa todo o espaço... */}
        <FlatList
          ref={flatListRef}
          style={styles.chatScrollView} // <-- (style = flex: 1)
          contentContainerStyle={styles.chatScrollContent}
          data={chatHistory}
          keyExtractor={(item, index) => index.toString()}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          renderItem={({ item }) => {
            if (item.role === 'user') {
              return (
                <View style={styles.userMessage}>
                  <Text style={styles.userMessageText}>{item.text}</Text>
                </View>
              );
            }
            return (
              <View style={styles.aiMessage}>
                {item.text.length === 0 && isAiReplying ? (
                    <ActivityIndicator size="small" color={cores.primary} />
                ) : (
                    <AiMessageRenderer text={item.text} />
                )}
              </View>
            );
          }}
          
          ListFooterComponent={
            !isAiReplying && chatHistory.length === 1 ? (
              <QuickReplyFooter
                replies={quickReplies}
                onTap={handleQuickReplyTap}
              />
            ) : null
          }
        />

        {/* 4. ...empurrando o Input para o fundo do KAV. */}
        {/* Este NÃO é mais flutuante, é "sticky" */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder="Pergunte sobre finanças..."
            value={chatInput}
            onChangeText={setChatInput}
            editable={!isAiReplying}
            multiline={true} 
            placeholderTextColor={cores.gray500}
            selectionColor={cores.primary}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!chatInput.trim() || isAiReplying}
            style={[
              styles.sendButton,
              (!chatInput.trim() || isAiReplying) && styles.sendButtonDisabled,
            ]}
          >
            <Send size={20} color={cores.light} />
          </TouchableOpacity>
        </View>
        
      </KeyboardAvoidingView>
      {/* ======================================================= */}
      {/* ☆ FIM DA MUDANÇA (ESTRUTURA DO KAV) ☆ */}
      {/* ======================================================= */}
    </SafeAreaView>
  );
}

// Estilos
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: cores.softGray,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.softGray,
    justifyContent: 'flex-end',
  },
  headerButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resetButton: {
    padding: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: cores.light,
    borderWidth: 1,
    borderColor: cores.gray200,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  toggleButtonActive: {
    backgroundColor: '#E6F8EB',
    borderColor: cores.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: cores.gray500,
  },
  toggleTextActive: {
    color: cores.primary,
  },
  // =======================================================
  // ☆ INÍCIO DA MUDANÇA (ESTILOS KAV) ☆
  // =======================================================
  keyboardContainer: {
    flex: 1, // KAV ocupa todo o espaço
  },
  chatScrollView: {
    flex: 1, // FlatList ocupa todo o espaço
    paddingHorizontal: 12,
  },
  // =======================================================
  // ☆ FIM DA MUDANÇA (ESTILOS KAV) ☆
  // =======================================================
  chatScrollContent: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  aiMessage: {
    alignSelf: 'stretch',
    backgroundColor: cores.light,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  aiMessageText: {
    color: cores.secondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'left',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: cores.primary,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    padding: 14,
    marginBottom: 10,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userMessageText: {
    color: cores.textLight,
    fontSize: 15,
    lineHeight: 22,
  },
  // =======================================================
  // ☆ INÍCIO DA MUDANÇA (INPUT "STICKY") ☆
  // =======================================================
  // Container do Input (AGORA É STICKY, NÃO FLUTUANTE)
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16, // Mais padding lateral
    paddingVertical: 8,
    backgroundColor: cores.light, // Fundo branco
    borderTopWidth: 1,
    borderTopColor: cores.gray200,
    // (Removemos marginHorizontal, marginBottom, borderRadius, borderWidth, shadow...)
  },
  chatInput: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 120,
    color: cores.secondary,
    // (Removemos o fundo cinza, agora ele é transparente)
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: cores.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: Platform.OS === 'ios' ? 0 : 2,
  },
  // =======================================================
  // ☆ FIM DA MUDANÇA (INPUT "STICKY") ☆
  // =======================================================
  sendButtonDisabled: {
    backgroundColor: cores.gray200,
  },
  
  // Estilos Quick Reply
  quickReplyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 10, 
    marginTop: 4,
    marginBottom: 10,
  },
  quickReplyButton: {
    backgroundColor: cores.light,
    borderColor: cores.primary,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  quickReplyText: {
    color: cores.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});