// /src/pages/SimuladoPage.jsx (VERSÃO 2.5 - CORREÇÃO DO BUG 'item is not defined')
import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, Check, Sparkles, Send } from 'lucide-react-native';
import { supabase, useAuth } from '../context/AuthContext';

import { 
  POINT_RULES, 
  updateUserProgressAndStreak 
} from '../utils/PointSystem'; 

// Cores (Idênticas)
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

// Componente para renderizar o texto da IA (Idêntico)
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

// LÓGICA DA PÁGINA (Idêntica ao Passo 23)
export default function SimuladoPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const { runnerContext, mcQuestionData } = route.params;
  const isRunnerMode = !!runnerContext; 

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [userScore, setUserScore] = useState(0); 
  const [eliminatedOptions, setEliminatedOptions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const typingIntervalRef = useRef(null);

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

  useEffect(() => {
    if (isRunnerMode) {
      if (mcQuestionData) {
        setQuestions([mcQuestionData]); 
        setLoading(false);
      } else {
        setError('Erro ao carregar a questão do simulado.');
        setLoading(false);
      }
    } else {
      const fetchQuestions = async () => {
        setLoading(true);
        const { count, topics, prova, difficulty } = route.params;
        try {
          if (!topics || topics.length === 0) throw new Error('Nenhum tópico foi selecionado.');
          const { data, error: rpcError } = await supabase.rpc('get_filtered_questions', {
            limit_count: count, topic_list: topics, prova_filter: prova, difficulty_filter: difficulty === 'Prova' ? null : difficulty
          });
          if (rpcError) throw rpcError;
          if (data && data.length > 0) {
            const formattedQuestions = data.map((q) => {
              const originalQuestion = q.pergunta || '';
              let context = '';
              let mainQuestion = originalQuestion;
              const lastDotIndex = originalQuestion.lastIndexOf('. ');
              if (lastDotIndex !== -1 && originalQuestion.length > 150) {
                context = originalQuestion.substring(0, lastDotIndex + 1).trim();
                mainQuestion = originalQuestion.substring(lastDotIndex + 1).trim();
              }
              return {
                topic: q.modulo,
                difficulty: q.dificuldade,
                question: { context: context, main: mainQuestion },
                explanation: q.explicacao,
                options: { A: q.a, B: q.b, C: q.c, D: q.d },
                answer: q.resposta.toUpperCase().trim(),
              };
            });
            setQuestions(formattedQuestions);
          } else {
            setError('Não foram encontradas questões para os tópicos selecionados.');
          }
        } catch (err) {
          console.error('Erro ao buscar questões:', err);
          setError(err.message || 'Ocorreu um erro ao carregar o simulado.');
        } finally {
          setLoading(false);
        }
      };
      fetchQuestions();
    }
  }, [route.params, isRunnerMode, mcQuestionData]);

  const isCorrectAnswer = () => {
    if (!questions[currentQuestionIndex] || !selectedOption) return false;
    return selectedOption === questions[currentQuestionIndex].answer;
  };

  const handleNextQuestion = () => {
    if (isRunnerMode) {
      const isCorrect = isCorrectAnswer();
      const updatedResults = { ...runnerContext.results };
      if (isCorrect) {
        updatedResults.mcScore += 1;
      }
      navigation.replace('simulado-completo-handler', {
        questQueue: runnerContext.questQueue,
        currentStep: runnerContext.currentStep + 1,
        results: updatedResults,
      });

    } else {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedOption(null);
        setIsVerified(false);
        setEliminatedOptions([]);
    } else {
      navigation.replace('resultado', { 
        score: userScore, 
        total: questions.length,
        certification: route.params.prova,
        certificationName: route.params.certificationName,
        topics: route.params.topics, 
        allQuestions: questions,
        userAnswers: userAnswers,
        });
      }
    }
  };
  
  const handleVerifyAnswer = async () => {
    if (!selectedOption) return;
    const isCorrect = isCorrectAnswer();
    setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: selectedOption }));
    if (!isRunnerMode && isCorrect) {
      setUserScore((prev) => prev + 1);
    }
    setIsVerified(true);
    const pointsToAdd = isCorrect 
      ? POINT_RULES.MC_CORRECT 
      : POINT_RULES.MC_INCORRECT;
    await updateUserProgressAndStreak(user, pointsToAdd);
  };

  const handleLongPressOption = (optionKey) => {
    if (isVerified) return;
    setEliminatedOptions((prev) =>
      prev.includes(optionKey) ? prev.filter((item) => item !== optionKey) : [...prev, optionKey]
    );
  };
  
  const openAiChat = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const userAnswer = currentQuestion.options[selectedOption];
    const isCorrect = selectedOption === currentQuestion.answer;
    const hiddenPrompt = `Eu respondi "${userAnswer}". ${isCorrect ? "Eu acertei, mas" : "Eu errei, e"} gostaria de uma explicação detalhada.`;
    const hiddenHistory = [{ role: "user", text: hiddenPrompt }];
    setChatHistory([]);
    setIsModalOpen(true);
    getAiCorrection(hiddenHistory);
  };
  
  const getAiCorrection = async (currentHistory) => {
    setIsAiReplying(true);
    
    setChatHistory((prev) => [...prev, { role: "ai", text: '' }]);

    const requestBody = {
      history: currentHistory.map(msg => ({ role: msg.role, text: msg.text })),
      questionContext: questions[currentQuestionIndex],
    };
    try {
      const { data, error } = await supabase.functions.invoke(
        'get-ai-correction', 
        { body: JSON.stringify(requestBody) }
      );
      if (error) throw error;
      
      const aiResponseText = data.text || "Não recebi uma resposta.";

      simulateTyping(aiResponseText);

    } catch (error) {
      console.error("Erro ao chamar a Edge Function:", error);
      setChatHistory((prev) => {
         const historyWithoutLast = prev.slice(0, -1);
         return [...historyWithoutLast, { role: "ai", text: "Desculpe, não consegui processar a correção neste momento." }];
      });
      setIsAiReplying(false);
    }
  };
  
  const handleSendMessage = () => {
    if (!chatInput.trim() || isAiReplying) return;
    
    const newUserMessage = { role: 'user', text: chatInput };
    const newHistory = [...chatHistory, newUserMessage];
    
    setChatHistory(newHistory);
    setChatInput('');
    
    getAiCorrection(newHistory);
  };


  // --- Telas de Loading/Erro (Idênticas) ---
  if (loading) {
    return (
      <View style={styles.centeredScreen}>
        <ActivityIndicator size="large" color={cores.primary} />
        <Text style={styles.loadingText}>Carregando questões...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.errorText}>Oops! Algo deu errado.</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Voltar e tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (questions.length === 0) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.errorText}>Nenhuma questão encontrada.</Text>
        <Text style={styles.errorSubtitle}>
          {isRunnerMode ? "Ocorreu um erro no Runner." : "Tente selecionar outros tópicos."}
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Lógica de Renderização (Idêntica) ---
  const currentQuestion = questions[currentQuestionIndex];
  let progressPercentage = 0;
  let progressText = '';
  if (isRunnerMode) {
      const totalQuests = runnerContext.questQueue.length;
      progressPercentage = ((runnerContext.currentStep + 1) / totalQuests) * 100;
      progressText = `${runnerContext.currentStep + 1} / ${totalQuests}`;
  } else {
      progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;
      progressText = `${currentQuestionIndex + 1} / ${questions.length}`;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header (Idêntico) */}
        <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle}>
                {isRunnerMode ? 'Simulado Completo' : 'Simulado CertifAI'}
              </Text>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                <X size={24} color={cores.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.progressContainer}>
              <Text style={styles.progressTextInfo}>{progressText}</Text>
              <View style={styles.progressBarBg}><View style={[styles.progressBarFg, { width: `${progressPercentage}%` }]} /></View>
            </View>
        </View>

        {/* Conteúdo Principal (Idêntico) */}
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
           <View style={styles.topicContainer}>
            <Text style={styles.topicText}>{currentQuestion.topic}</Text>
            {currentQuestion.difficulty && (
              <View style={[
                  styles.difficultyBadge,
                  currentQuestion.difficulty === 'Fácil' && styles.difficultyEasy,
                  currentQuestion.difficulty === 'Médio' && styles.difficultyMedium,
                  currentQuestion.difficulty === 'Difícil' && styles.difficultyHard,
              ]}>
                <Text style={styles.difficultyText}>{currentQuestion.difficulty}</Text>
              </View>
            )}
          </View>
          <View style={styles.questionContainer}>
            {currentQuestion.question.context && (
              <Text style={styles.contextText}>
                {currentQuestion.question.context}
              </Text>
            )}
            <Text style={styles.mainQuestionText}>
              {currentQuestion.question.main}
            </Text>
          </View>

          {isVerified && currentQuestion.explanation && (
            <View style={[
              styles.explanationBox, 
              isCorrectAnswer() ? styles.explanationBoxCorrect : styles.explanationBoxIncorrect
            ]}>
              <View style={[
                styles.explanationHeader,
                isCorrectAnswer() ? styles.explanationHeaderCorrect : styles.explanationHeaderIncorrect
              ]}>
                <Text style={[
                  styles.explanationHeaderText,
                  isCorrectAnswer() ? styles.explanationHeaderTextCorrect : styles.explanationHeaderTextIncorrect
                ]}>
                  Explicação da Resposta
                </Text>
              </View>
              <Text style={styles.explanationText}>
                {currentQuestion.explanation}
              </Text>
            </View>
          )}

          <View style={styles.optionsContainer}>
            {Object.entries(currentQuestion.options).map(([key, value]) => {
              const isSelected = selectedOption === key;
              const isOptionCorrect = key === currentQuestion.answer;
              const isEliminated = eliminatedOptions.includes(key);
              let optionStyle = [styles.optionBtn];
              if (isVerified) {
                if (isOptionCorrect) optionStyle.push(styles.optionCorrect);
                else if (isSelected && !isOptionCorrect) optionStyle.push(styles.optionIncorrect);
              } else if (isSelected) {
                optionStyle.push(styles.optionSelected);
              }
              if (isEliminated) optionStyle.push(styles.optionEliminated);
              
              return (
                <TouchableOpacity
                  key={key}
                  style={optionStyle}
                  disabled={isVerified}
                  onPress={() => { if (!isEliminated) setSelectedOption(key); }}
                  onLongPress={() => handleLongPressOption(key)}>
                  <View style={styles.iconContainer}>
                    {isVerified && isOptionCorrect && <Check color={cores.green500} />}
                    {isVerified && isSelected && !isOptionCorrect && <X color={cores.red500} />}
                    {!isVerified && <Text style={styles.optionKey}>{key}</Text>}
                    {isVerified && !isSelected && !isOptionCorrect && <Text style={styles.optionKey}>{key}</Text>}
                  </View>
                  <Text style={[styles.optionValue, isEliminated && styles.optionValueEliminated]}>{value}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer (Idêntico) */}
        <View style={styles.footer}>
          {!isVerified ? (
            <TouchableOpacity style={[styles.primaryButton, !selectedOption && styles.buttonDisabled]} disabled={!selectedOption} onPress={handleVerifyAnswer}>
              <Text style={styles.primaryButtonText}>Verificar Resposta</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.footerGrid}>
              <TouchableOpacity style={[styles.secondaryButton, {flex: 1}]} onPress={openAiChat}>
                <Sparkles size={20} color={cores.light} />
                <Text style={styles.primaryButtonText}>Corrigir com IA</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, {flex: 1}]} onPress={handleNextQuestion}>
                <Text style={styles.primaryButtonText}>
                  {isRunnerMode 
                    ? "Próxima Questão"
                    : (currentQuestionIndex < questions.length - 1 
                        ? "Próxima Questão" 
                        : "Finalizar Simulado")
                  }
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      
      {/* Modal de IA (JSX Idêntico, mas agora com lógica de "digitar") */}
      <Modal animationType="slide" transparent={true} visible={isModalOpen} onRequestClose={() => setIsModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            {/* Header (Idêntico) */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                 <Sparkles size={20} color={cores.primary} />
                 <Text style={styles.headerTitle}>Correção com CertifAI</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.closeButton}>
                <X size={20} color={cores.secondary} />
              </TouchableOpacity>
            </View>
             {/* Contexto da Questão (Idêntico) */}
             <View style={styles.modalQuestionContext}>
                <Text style={styles.modalContextTitle}>Analisando a questão:</Text>
                <Text style={styles.modalContextQuestion} numberOfLines={3}>
                  {currentQuestion.question.context} {currentQuestion.question.main}
                </Text>
             </View>
             {/* Scroll do Chat (AGORA CORRIGIDO) */}
             <ScrollView style={styles.chatScrollView} contentContainerStyle={{ paddingBottom: 20 }}>
                {chatHistory.map((msg, index) => (
                   <View key={index} style={msg.role === 'user' ? styles.userMessage : styles.aiMessage}>
                      {msg.role === 'user' ? (
                        <Text style={styles.userMessageText}>{msg.text}</Text>
                      ) : (
                        // =======================================================
                        // ☆ INÍCIO DA MUDANÇA (CORREÇÃO DO BUG) ☆
                        // =======================================================
                        // O erro estava aqui. Eu escrevi 'item.text.length' em vez de 'msg.text.length'
                        msg.text.length === 0 && isAiReplying ? (
                          <ActivityIndicator size="small" color={cores.primary} />
                        ) : (
                          <AiMessageRenderer text={msg.text} />
                        )
                        // =======================================================
                        // ☆ FIM DA MUDANÇA (CORREÇÃO DO BUG) ☆
                        // =======================================================
                      )}
                   </View>
                ))}
             </ScrollView>
             
             {/* Input Flutuante (Idêntico) */}
             <View style={styles.chatInputContainer}>
                <TextInput 
                  style={styles.chatInput} 
                  placeholder="Tire suas dúvidas..." 
                  value={chatInput} 
                  onChangeText={setChatInput} 
                  onSubmitEditing={handleSendMessage} 
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
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// Estilos (Idênticos ao Passo 22, com o balão centralizado)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.softGray, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  container: { flex: 1 },
  centeredScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: cores.softGray },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '600', color: cores.gray500 },
  errorText: { fontSize: 18, fontWeight: 'bold', color: '#D32F2F', textAlign: 'center' },
  errorSubtitle: { marginTop: 8, fontSize: 14, color: cores.gray500, textAlign: 'center', marginBottom: 24 },
  header: { backgroundColor: cores.light, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderColor: cores.gray200 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: cores.secondary },
  closeButton: { padding: 4 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressTextInfo: { fontSize: 14, fontWeight: '600', color: cores.gray500 },
  progressBarBg: { flex: 1, height: 10, backgroundColor: cores.gray200, borderRadius: 5 },
  progressBarFg: { height: 10, backgroundColor: cores.primary, borderRadius: 5 },
  mainContent: { flex: 1, paddingHorizontal: 16 },
  topicText: {
  fontSize: 14,
  fontWeight: '500',
  color: cores.gray500,
  flex: 1,
  },
  questionContainer: { marginBottom: 24, padding: 16, backgroundColor: cores.light, borderRadius: 12, borderWidth: 1, borderColor: cores.gray200 },
  contextText: { fontSize: 15, color: cores.gray700, lineHeight: 22, marginBottom: 16 },
  mainQuestionText: { fontSize: 16, fontWeight: '600', color: cores.secondary, lineHeight: 20 },
  optionsContainer: { gap: 12, paddingBottom: 24 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderWidth: 2, borderColor: cores.gray200, borderRadius: 12, backgroundColor: cores.light },
  optionSelected: { borderColor: cores.primary, backgroundColor: '#E6F8EB' },
  optionCorrect: { borderColor: cores.green500, backgroundColor: cores.green50 },
  optionIncorrect: { borderColor: cores.red500, backgroundColor: cores.red50 },
  optionEliminated: { opacity: 0.4 },
  iconContainer: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: cores.softGray },
  optionKey: { fontSize: 16, fontWeight: 'bold', color: cores.secondary },
  optionValue: { flex: 1, fontSize: 14, fontWeight: '600', color: cores.secondary },
  optionValueEliminated: { textDecorationLine: 'line-through' },
  footer: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderTopWidth: 1, borderColor: cores.gray200, padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  
  // Estilos para Explicação
  explanationBox: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 24,
    overflow: 'hidden',
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
  
  footerGrid: { flexDirection: 'row', gap: 12 },
  primaryButton: { backgroundColor: cores.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryButton: { backgroundColor: cores.secondary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buttonDisabled: { backgroundColor: '#BDBDBD' },
  primaryButtonText: { color: cores.light, fontSize: 16, fontWeight: 'bold' },

  // Estilos do Modal (Idênticos ao Passo 22)
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContainer: { 
    height: '85%', 
    backgroundColor: cores.softGray,
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: { 
    padding: 16, 
    borderBottomWidth: 1, 
    borderColor: cores.gray200, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: cores.light,
  },
  modalQuestionContext: { 
    padding: 16, 
    backgroundColor: cores.light,
    borderBottomWidth: 1, 
    borderColor: cores.gray200 
  },
  modalContextTitle: { fontSize: 12, color: cores.gray500, fontWeight: '600', marginBottom: 4 },
  modalContextQuestion: { fontSize: 14, color: cores.secondary },
  
  chatScrollView: { 
    flex: 1, 
    padding: 16,
    backgroundColor: cores.softGray,
  },
  userMessage: { 
    alignSelf: 'flex-end', 
    backgroundColor: cores.primary,
    padding: 12, 
    borderRadius: 16, 
    borderBottomRightRadius: 2, 
    marginBottom: 8, 
    maxWidth: '80%' 
  },
  userMessageText: { color: cores.light, fontSize: 14 },
  aiMessage: { 
    alignSelf: 'center',
    backgroundColor: cores.light,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    maxWidth: '99%',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  aiMessageText: { 
    color: cores.secondary, 
    fontSize: 14, 
    lineHeight: 20,
    textAlign: 'left',
  },
  
  // Input Flutuante
  chatInputContainer: { 
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: cores.light,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: cores.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  chatInput: { 
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 120,
    color: cores.secondary,
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
  sendButtonDisabled: {
    backgroundColor: cores.gray200,
  },
  
  // Estilos de Dificuldade
  topicContainer: {
    flexDirection: 'row',
    alignItems: 'center', 
    marginBottom: 16,
    marginTop: 8,
    gap: 8, 
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10, 
  },
  difficultyEasy: {
    backgroundColor: '#DCFCE7',
  },
  difficultyMedium: {
    backgroundColor: '#FEF9C3',
  },
  difficultyHard: {
    backgroundColor: '#FEE2E2',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: cores.secondary, 
  },
});