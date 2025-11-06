// certifai-mvp/src/pages/ReviewSimuladoPage.js
// (VERSÃO COMPLETA E CORRIGIDA - PASSO 10.4)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  FlatList, // Usaremos FlatList para as questões
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../context/AuthContext';
import { X, Check, Sparkles, Send, ArrowLeft } from 'lucide-react-native';

// Cores (da SimuladoPage)
const cores = {
  primary: '#00C853',
  secondary: '#1A202C',
  softGray: '#F7FAFC',
  gray200: '#E2E8F0',
  gray500: '#64748B',
  gray700: '#334155',
  light: '#FFFFFF',
  red50: '#FEE2E2',
  red500: '#EF4444',
  red600: '#DC2626',
  green50: '#F0FDF4',
  green500: '#22C55E',
  green700: '#007032',
  redBorder: '#FECACA', 
  greenBorder: '#B3EBC6',
};

// Componente para renderizar o texto da IA (copiado da SimuladoPage)
const AiMessageRenderer = ({ text }) => {
  if (!text) return null;
  const parts = text.split('**');
  return (
    <Text style={styles.aiMessageText}>
      {parts.map((part, index) =>
        index % 2 === 1 ? <Text key={index} style={{ fontWeight: 'bold' }}>{part}</Text> : part
      )}
    </Text>
  );
};

// --- COMPONENTE CARD DE QUESTÃO (VERSÃO 2.0 - Suporta 'mc' e 'case') ---
const QuestionReviewCard = ({ question, onAskAI }) => {
  const { 
    question_context, 
    question_main, 
    options, // Será null para 'case'
    explanation, 
    user_answer, 
    correct_answer,
    question_type // 'mc' ou 'case'
  } = question;

  // Para 'mc', a checagem é simples. Para 'case', usamos a 'explanation' da IA.
  const isCorrect = question_type === 'mc' 
    ? (user_answer === correct_answer) 
    : (explanation && !explanation.toLowerCase().includes('incorreto')); // Se não for 'incorreto', consideramos 'ok'

  // --- Renderização para Múltipla Escolha ---
  const renderMCOptions = () => (
    <View style={styles.optionsContainer}>
      {/* Checa se 'options' existe e é um objeto antes de mapear */}
      {options && typeof options === 'object' ? (
        Object.entries(options).map(([key, value]) => {
          const isUserAnswer = user_answer === key;
          const isCorrectAnswer = correct_answer === key;
  
          let optionStyle = [styles.optionBtn];
          if (isCorrectAnswer) optionStyle.push(styles.optionCorrect);
          else if (isUserAnswer && !isCorrectAnswer) optionStyle.push(styles.optionIncorrect);
  
          return (
            <View key={key} style={optionStyle}>
              <View style={styles.iconContainer}>
                {isCorrectAnswer && <Check color={cores.green500} />}
                {isUserAnswer && !isCorrectAnswer && <X color={cores.red500} />}
                {!isUserAnswer && !isCorrectAnswer && <Text style={styles.optionKey}>{key}</Text>}
              </View>
              <Text style={styles.optionValue}>{value}</Text>
            </View>
          );
        })
      ) : (
        <Text style={styles.errorText}>Erro: Opções não encontradas para esta questão.</Text>
      )}
    </View>
  );

  // --- Renderização para Case (Dissertativo) ---
  const renderCaseAnswers = () => (
    <View style={styles.caseContainer}>
      {/* Resposta do Usuário */}
      <Text style={styles.caseLabel}>Sua Resposta:</Text>
      <View style={[styles.caseBox, styles.caseUser]}>
        <Text style={styles.caseText}>{user_answer || "(Não respondeu)"}</Text>
      </View>
      
      {/* Resposta Ideal */}
      <Text style={styles.caseLabel}>Resposta Ideal (sugerida):</Text>
      <View style={[styles.caseBox, styles.caseIdeal]}>
        <Text style={styles.caseText}>{correct_answer}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.questionCard}>
      {/* Contexto e Pergunta (Comum a ambos) */}
      <View style={styles.questionContainer}>
        {question_context && (
          <Text style={styles.contextText}>{question_context}</Text>
        )}
        <Text style={styles.mainQuestionText}>{question_main}</Text>
      </View>

      {/* Explicação da IA (Comum a ambos) */}
      <View style={[
        styles.explanationBox, 
        isCorrect ? styles.explanationBoxCorrect : styles.explanationBoxIncorrect
      ]}>
        <View style={[
          styles.explanationHeader,
          isCorrect ? styles.explanationHeaderCorrect : styles.explanationHeaderIncorrect
        ]}>
          <Text style={[
            styles.explanationHeaderText,
            isCorrect ? styles.explanationHeaderTextCorrect : styles.explanationHeaderTextIncorrect
          ]}>
            Análise da IA (Explicação)
          </Text>
        </View>
        <Text style={styles.explanationText}>
          {explanation || "Sem explicação disponível."}
        </Text>
      </View>

      {/* Renderização Condicional: Opções (mc) ou Respostas (case) */}
      {question_type === 'mc' ? renderMCOptions() : renderCaseAnswers()}

      {/* Botão de IA (Comum a ambos) */}
      <TouchableOpacity style={styles.aiButton} onPress={() => onAskAI(question)}>
        <Sparkles size={20} color={cores.primary} />
        <Text style={styles.aiButtonText}>Perguntar à IA sobre esta questão</Text>
      </TouchableOpacity>
    </View>
  );
};
// --- FIM DO COMPONENTE CARD ---


// --- COMPONENTE PRINCIPAL DA PÁGINA ---
export default function ReviewSimuladoPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const { sessionId, sessionTitle } = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState([]); // Lista de respostas
  
  // Estados do Modal de IA
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [currentAIQuestion, setCurrentAIQuestion] = useState(null); // Armazena a questão para a IA

  // Efeito para buscar os dados
  useEffect(() => {
    if (!sessionId) {
      setError('ID da sessão não fornecido.');
      setLoading(false);
      return;
    }

    const fetchReviewData = async () => {
      setLoading(true);
      try {
        const { data: answersData, error: answersError } = await supabase
          .from('simulado_answers')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true }); 

        if (answersError) throw answersError;

        setAnswers(answersData || []);
        
      } catch (err) {
        console.error("Erro ao buscar dados da revisão:", err);
        setError(err.message || "Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };

    fetchReviewData();
  }, [sessionId]);

  // --- Funções do Modal de IA (CONECTADAS À NOVA EDGE FUNCTION) ---
  const openAiChat = (question) => {
    setCurrentAIQuestion(question); // Salva a questão que a IA vai analisar
    
    let hiddenPrompt = "";
    
    // Cria um prompt diferente para cada tipo de questão
    if (question.question_type === 'mc' && question.options) {
      // Prompt para Múltipla Escolha
      hiddenPrompt = `Estou revisando esta questão de Múltipla Escolha:
- Pergunta: "${question.question_main}"
- Minha resposta: "${question.options[question.user_answer] || 'Não respondi'}" (${question.user_answer})
- Correta: "${question.options[question.correct_answer]}" (${question.correct_answer})

Pode me dar uma análise detalhada sobre meu erro (ou acerto)?`;

    } else if (question.question_type === 'case') {
      // Prompt para Case Prático
      hiddenPrompt = `Estou revisando esta questão de Case Prático:
- Pergunta: "${question.question_main}"
- Minha resposta: "${question.user_answer || 'Não respondi'}"
- Resposta Ideal: "${question.correct_answer}"
- Análise da IA (que já recebi): "${question.explanation}"

Pode me dar um coaching mais detalhado sobre o que eu poderia ter feito melhor na *minha* resposta?`;
    
    } else {
      // Fallback
      hiddenPrompt = "Analise esta questão.";
    }

    const hiddenHistory = [{ role: "user", text: hiddenPrompt }];
    setChatHistory([]); 
    setIsModalOpen(true);
    
    // Chama a nova função
    getAiReviewChat(hiddenHistory, question);
  };
  
  // (Esta é a função que chama a sua nova Edge Function)
  const getAiReviewChat = async (currentHistory, questionContext) => {
    setIsAiReplying(true);
    
    const requestBody = {
      chatHistory: currentHistory, 
      questionContext: questionContext,
    };

    try {
      // Chama a NOVA Edge Function
      const { data, error } = await supabase.functions.invoke('get-ai-review-chat', { 
        body: JSON.stringify(requestBody) 
      });

      if (error) throw error;
      
      const aiResponse = data.text; // O seu script Gemini retorna { "text": "..." }
      setChatHistory((prev) => [...prev, { role: "ai", text: aiResponse }]);
    } catch (error) {
      console.error("Erro ao chamar a Edge Function 'get-ai-review-chat':", error);
      setChatHistory((prev) => [...prev, { role: "ai", text: "Desculpe, não consegui processar a correção neste momento." }]);
    } finally {
      setIsAiReplying(false);
    }
  };
  
  const handleSendMessage = () => {
    if (!chatInput.trim() || isAiReplying || !currentAIQuestion) return;
    const newUserMessage = { role: 'user', text: chatInput };
    const newHistory = [...chatHistory, newUserMessage];
    setChatHistory(newHistory);
    setChatInput('');
    
    // Chama a nova função
    getAiReviewChat(newHistory, currentAIQuestion); 
  };

  // --- Telas de Loading/Erro ---
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <ArrowLeft size={24} color={cores.secondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Carregando Revisão...</Text>
        </View>
        <View style={styles.centeredScreen}>
          <ActivityIndicator size="large" color={cores.primary} />
        </View>
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
         <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <ArrowLeft size={24} color={cores.secondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Erro</Text>
        </View>
        <View style={styles.centeredScreen}>
          <Text style={styles.errorText}>Oops! Algo deu errado.</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Renderização Principal ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <ArrowLeft size={24} color={cores.secondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
                Revisão: {sessionTitle || 'Simulado'}
            </Text>
        </View>

        {/* Lista de Questões */}
        <FlatList
          data={answers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <QuestionReviewCard 
              question={item} 
              onAskAI={openAiChat}
            />
          )}
          style={styles.mainContent}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 16 }}
        />
      </View>
      
      {/* Modal de IA (idêntico ao da SimuladoPage) */}
      <Modal animationType="slide" transparent={true} visible={isModalOpen} onRequestClose={() => setIsModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                 <Sparkles size={20} color={cores.primary} />
                 <Text style={styles.headerTitle}>Correção com CertifAI</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.closeButton}>
                <X size={20} color={cores.secondary} />
              </TouchableOpacity>
            </View>
             <View style={styles.modalQuestionContext}>
                <Text style={styles.modalContextTitle}>Analisando a questão:</Text>
                <Text style={styles.modalContextQuestion} numberOfLines={3}>
                  {currentAIQuestion?.question_main || "..."}
                </Text>
             </View>
             <ScrollView style={styles.chatScrollView} contentContainerStyle={{ paddingBottom: 20 }}>
                {chatHistory.map((msg, index) => (
                   <View key={index} style={msg.role === 'user' ? styles.userMessage : styles.aiMessage}>
                      {msg.role === 'user' ? <Text style={styles.userMessageText}>{msg.text}</Text> : <AiMessageRenderer text={msg.text} />}
                   </View>
                ))}
                {isAiReplying && <ActivityIndicator style={{marginTop: 10}} color={cores.primary}/>}
             </ScrollView>
             <View style={styles.chatInputContainer}>
                <TextInput style={styles.chatInput} placeholder="Tire suas dúvidas..." value={chatInput} onChangeText={setChatInput} onSubmitEditing={handleSendMessage} editable={!isAiReplying}/>
                <TouchableOpacity onPress={handleSendMessage} disabled={!chatInput.trim() || isAiReplying} style={styles.sendButton}>
                   <Send size={20} color={cores.light} />
                </TouchableOpacity>
             </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// Estilos (Completos, incluindo os de 'case')
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.softGray, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  container: { flex: 1 },
  centeredScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: cores.softGray },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '600', color: cores.gray500 },
  errorText: { fontSize: 18, fontWeight: 'bold', color: '#D32F2F', textAlign: 'center' },
  errorSubtitle: { marginTop: 8, fontSize: 14, color: cores.gray500, textAlign: 'center', marginBottom: 24 },
  
  // Header
  header: { 
    backgroundColor: cores.light, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderColor: cores.gray200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: Platform.OS === 'android' ? 20 : 12,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: cores.secondary, flex: 1 },
  closeButton: { padding: 4 },
  
  // Main Content
  mainContent: { flex: 1, paddingHorizontal: 16 },

  // Card da Questão
  questionCard: {
    backgroundColor: cores.light,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.gray200,
    marginBottom: 16,
    overflow: 'hidden',
  },
  questionContainer: { 
    padding: 16,
  },
  contextText: { fontSize: 15, color: cores.gray700, lineHeight: 22, marginBottom: 16 },
  mainQuestionText: { fontSize: 16, fontWeight: '600', color: cores.secondary, lineHeight: 20 },
  
  // Estilos para Explicação (Sempre visível)
  explanationBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: cores.gray200,
    marginTop: 8,
  },
  explanationBoxCorrect: {
    backgroundColor: cores.green50,
    borderColor: cores.greenBorder,
  },
  explanationBoxIncorrect: {
    backgroundColor: cores.red50,
    borderColor: cores.redBorder,
  },
  explanationHeader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  explanationHeaderCorrect: {
    borderColor: cores.greenBorder,
  },
  explanationHeaderIncorrect: {
    borderColor: cores.redBorder,
  },
  explanationHeaderText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  explanationHeaderTextCorrect: {
    color: cores.green700,
  },
  explanationHeaderTextIncorrect: {
    color: cores.red600,
  },
  explanationText: {
    padding: 16,
    fontSize: 15,
    color: cores.secondary,
    lineHeight: 22,
  },
  
  // Alternativas
  optionsContainer: { gap: 12, padding: 16 },
  optionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    padding: 8, 
    borderWidth: 2, 
    borderColor: cores.gray200, 
    borderRadius: 12, 
    backgroundColor: cores.light 
  },
  optionCorrect: { 
    borderColor: cores.green500, 
    backgroundColor: cores.green50 
  },
  optionIncorrect: { 
    borderColor: cores.red500, 
    backgroundColor: cores.red50 
  },
  iconContainer: { 
    width: 40, 
    height: 40, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: cores.softGray 
  },
  optionKey: { fontSize: 16, fontWeight: 'bold', color: cores.secondary },
  optionValue: { flex: 1, fontSize: 14, fontWeight: '600', color: cores.secondary },
  
  // --- ESTILOS PARA O CASE ---
  caseContainer: {
    padding: 16,
    gap: 8,
  },
  caseLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.gray500,
    paddingLeft: 4,
  },
  caseBox: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  caseUser: {
    backgroundColor: cores.softGray,
    borderColor: cores.gray200,
  },
  caseIdeal: {
    backgroundColor: cores.green50,
    borderColor: cores.greenBorder,
  },
  caseText: {
    fontSize: 14,
    color: cores.secondary,
    lineHeight: 20,
  },
  // --- FIM DOS ESTILOS DE CASE ---

  // Botão AI
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: cores.softGray,
    borderTopWidth: 1,
    borderTopColor: cores.gray200,
  },
  aiButtonText: {
    color: cores.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  
  // Botão Primário (Tela de Erro)
  primaryButton: { backgroundColor: cores.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: cores.light, fontSize: 16, fontWeight: 'bold' },

  // Modal de IA (copiado da SimuladoPage)
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContainer: { height: '85%', backgroundColor: cores.softGray, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { padding: 16, borderBottomWidth: 1, borderColor: cores.gray200, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalQuestionContext: { padding: 16, backgroundColor: cores.light, borderBottomWidth: 1, borderColor: cores.gray200 },
  modalContextTitle: { fontSize: 12, color: cores.gray500, fontWeight: '600', marginBottom: 4 },
  modalContextQuestion: { fontSize: 14, color: cores.secondary },
  chatScrollView: { flex: 1, padding: 16 },
  userMessage: { alignSelf: 'flex-end', backgroundColor: cores.primary, padding: 12, borderRadius: 12, borderBottomRightRadius: 2, marginBottom: 8, maxWidth: '80%' },
  userMessageText: { color: cores.light, fontSize: 14 },
  aiMessage: { alignSelf: 'flex-start', marginBottom: 8 },
  aiMessageText: { color: cores.secondary, fontSize: 14, lineHeight: 20 },
  chatInputContainer: { paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderColor: cores.gray200, backgroundColor: cores.light, flexDirection: 'row', gap: 8, paddingBottom: Platform.OS === 'ios' ? 24 : 8},
  chatInput: { flex: 1, backgroundColor: cores.softGray, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, height: 44 },
  sendButton: { width: 44, height: 44, borderRadius: 8, backgroundColor: cores.primary, justifyContent: 'center', alignItems: 'center' },
});