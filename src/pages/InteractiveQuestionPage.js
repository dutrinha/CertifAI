// src/pages/InteractiveQuestionPage.js (VERSÃO 3.8 - Adaptada para Runner)
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, CheckCircle, XCircle, BookOpen } from 'lucide-react-native';
import { supabase } from '../context/AuthContext';
const { height: screenHeight } = Dimensions.get('window');

// Cores
const cores = {
  primary: "#00C853", primaryChat: "#DCF8C6", primaryLight: "#E6F8EB",
  textPrimary: "#1A202C", textSecondary: "#64748B", textLight: "#FFFFFF",
  background: "#F7FAFC", cardBackground: "#FFFFFF", border: "#E2E8F0",
  redText: '#DC2626', redBg: '#FEF2F2', redBorder: '#FECACA',
  greenText: '#16A34A', greenBg: '#F0FDF4', greenBorder: '#BBF7D0',
};


// Aleatoriza um array sem modificar o original (cria uma cópia).
const shuffleArray = (array) => {
  let currentIndex = array.length,  randomIndex;
  const newArray = [...array]; // Cria uma cópia

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [newArray[currentIndex], newArray[randomIndex]] = [
      newArray[randomIndex], newArray[currentIndex]];
  }
  return newArray;
}

export default function InteractiveQuestionPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const flatListRef = useRef(null);

  // --- 1. VERIFICAR MODO RUNNER ---
  // O Handler e o Hub passam `questionData`
  // O Handler também passa `runnerContext`
  const { runnerContext, questionData: currentQuestionData = {} } = route.params || {};
  const isRunnerMode = !!runnerContext;
  const dialogueTree = currentQuestionData.dialogue_tree || {};
  
  // Estados
  const [contextModalVisible, setContextModalVisible] = useState(true);
  const [currentStepKey, setCurrentStepKey] = useState('1');
  const [currentStepData, setCurrentStepData] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  const [isReplying, setIsReplying] = useState(false);
  const [userPath, setUserPath] = useState([]); // Armazena o caminho para o resultado
  const [shuffledOptions, setShuffledOptions] = useState([]);

  // Efeito 1: Validar dados, preparar estado inicial
  useEffect(() => {
    // Validação robusta
    if (!currentQuestionData?.contexto || !dialogueTree || typeof dialogueTree !== 'object' || Object.keys(dialogueTree).length === 0 || !dialogueTree['1']) {
      console.error("InteractiveQuestionPage: Dados inválidos!", { currentQuestionData, dialogueTree });
      
      if (route.params) { 
        Alert.alert("Erro", "Dados da questão inválidos.", [{ text: 'Voltar', onPress: () => navigation.goBack() }]); 
      }
      return;
    }
    
    if (!currentStepData) { 
      setCurrentStepData(dialogueTree['1']); 
    }
    
    if (chatHistory.length === 0 && currentQuestionData.contexto) { 
      setChatHistory([{ id: 'context', role: 'system', text: currentQuestionData.contexto }]); 
    }
    
  }, [currentQuestionData, dialogueTree, route.params, navigation, currentStepData, chatHistory.length]);

  // Efeito 2: Lógica de atualização do chat (A MÁQUINA DE ESTADOS)
  useEffect(() => {
    if (!currentStepData || contextModalVisible) return;

    // =======================================================
    // ☆ INÍCIO DA CORREÇÃO ☆
    // =======================================================
    if (currentStepKey === 'end') {
      // --- 2. LÓGICA DE NAVEGAÇÃO CONDICIONAL ---
      
      // Calcula a pontuação máxima (baseado na lógica da InteractiveResultPage)
      // Assumindo que a pontuação máxima por passo é 5
      const maxScore = userPath.length * 5; 

      if (isRunnerMode) {
        // MODO RUNNER: Volta para o Handler
        const updatedResults = { ...runnerContext.results };
        
        // Atualiza os scores de interativa (acumulando, caso haja várias)
        updatedResults.interactiveResults.score += totalScore;
        updatedResults.interactiveResults.maxScore += maxScore;

        console.log("Runner Interativa: Concluído. Voltando para o Handler.", updatedResults);

        navigation.replace('simulado-completo-handler', {
          questQueue: runnerContext.questQueue,
          currentStep: runnerContext.currentStep + 1, // Avança o passo
          results: updatedResults, // Passa os resultados atualizados
        });
      } else {
        // MODO PADRÃO: Vai para a página de resultado interativo
        console.log("Modo Padrão Interativa: Concluído. Indo para a pág de resultado.");
        navigation.replace('InteractiveResultPage', { 
          userPath, 
          totalScore, 
          questionData: currentQuestionData // Passa o questionData correto
        });
      }
      // --- FIM DA LÓGICA ---
    // =======================================================
    // ☆ FIM DA CORREÇÃO ☆
    // =======================================================
      
    } else if (dialogueTree[currentStepKey]) {
      // Se a chave for válida (ex: '1', '2a', '3b')
      const nextStepData = dialogueTree[currentStepKey];
      
      if (currentStepData?.prompt !== nextStepData.prompt || !chatHistory.find(msg => msg.id === currentStepKey)) {
        setCurrentStepData(nextStepData);
        const newClientMessage = { id: currentStepKey, role: 'client', text: nextStepData.prompt };
        const delay = currentStepKey === '1' ? 500 : 1500; 
        
        setTimeout(() => {
          setChatHistory(prev => {
            if (!prev.find(msg => msg.id === currentStepKey)) { return [...prev, newClientMessage]; }
            return prev;
          });
          setIsReplying(false);
        }, delay);
      } else {
        if (!isReplying) { setIsReplying(false); }
      }
    } else {
      if (currentStepKey !== '1' && currentStepKey !== 'end') {
        Alert.alert( "Erro", `Chave de diálogo inválida: ${currentStepKey}`, [{ text: 'Voltar', onPress: () => navigation.goBack() }] );
      }
    }
  }, [currentStepKey, dialogueTree, navigation, currentQuestionData, contextModalVisible, userPath, totalScore, currentStepData, chatHistory, isReplying, isRunnerMode, runnerContext]); // Adicionadas dependências do Runner

  const handleStartChat = () => { setContextModalVisible(false); };

  // Efeito para aleatorizar as opções quando a etapa muda
  useEffect(() => {
    if (currentStepData && currentStepData.options) {
      const optionsArray = Object.entries(currentStepData.options);
      const randomized = shuffleArray(optionsArray);
      setShuffledOptions(randomized);
    }
  }, [currentStepData]);

  // handleSelectOption
  const handleSelectOption = (optionKey, optionData) => {
    if (isReplying || !currentStepData) return;
    setIsReplying(true); 

    setTotalScore(prev => prev + optionData.score);
    setUserPath(prev => [...prev, {
        stepKey: currentStepKey,
        selectedOption: optionKey,
        text: optionData.text,
        justification: optionData.justification,
        score: optionData.score,
        nextStep: optionData.next,
    }]);

    const isCorrect = optionData.score >= 5;
    
    const userMessage = { id: `${currentStepKey}-${optionKey}`, role: 'user', text: optionData.text };
    const feedbackMessage = { id: `${currentStepKey}-feedback`, role: 'feedback', text: optionData.justification, isCorrect: isCorrect };
    setChatHistory(prev => [...prev, userMessage, feedbackMessage]);

    setTimeout(() => { setCurrentStepKey(optionData.next); }, 2500);
  };

  // Função para renderizar o item do chat
  const renderChatItem = ({ item }) => {
    if (item.role === 'system') {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemTextTitle}>CONTEXTO</Text>
          <Text style={styles.systemText}>{item.text}</Text>
        </View>
      );
    }
    if (item.role === 'client') {
      return (
        <View style={styles.clientMessage}>
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      );
    }
    if (item.role === 'user') {
      return (
        <View style={styles.userMessage}>
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      );
    }
    if (item.role === 'feedback') {
      return (
        <View style={[
          styles.feedbackMessage,
          item.isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect
        ]}>
          {item.isCorrect ?
            <CheckCircle size={18} color={cores.greenText} /> :
            <XCircle size={18} color={cores.redText} />}
          <Text style={styles.feedbackText}>{item.text}</Text>
        </View>
      );
    }
    return null;
  };

   // Renderização principal
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={cores.textPrimary} />
        </TouchableOpacity>
        {/* Título Condicional */}
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isRunnerMode ? 'Simulado Completo' : 'Questão Interativa'}
        </Text>
      </View>

      {/* O Chat */}
      <FlatList
        ref={flatListRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContentContainer}
        data={chatHistory}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

    {/* As Opções (Footer) */}
    {!contextModalVisible && (
      <ScrollView 
        style={[styles.optionsScrollView, { maxHeight: screenHeight * 0.5 }]}
        contentContainerStyle={styles.optionsContentContainer}
      >
        {!isReplying && currentStepData && currentStepKey !== 'end' &&
          shuffledOptions.map(([key, option]) => (
            <TouchableOpacity
              key={key}
              style={styles.optionButton}
              onPress={() => handleSelectOption(key, option)}
              disabled={isReplying}
            >
              <Text style={styles.optionText}>{option.text}</Text>
            </TouchableOpacity>
        ))}

        {isReplying && currentStepKey !== 'end' && (
            <View style={styles.waitingIndicator}>
              <ActivityIndicator color={cores.primary} />
              <Text style={styles.waitingText}>Processando...</Text>
            </View>
        )}
      </ScrollView>
    )}

      {/* O Modal de Contexto (COM ScrollView) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={contextModalVisible}
        onRequestClose={() => navigation.goBack()}
      >
        <View style={styles.contextModalBackdrop}>
          <View style={styles.contextModalContainer}>
            <View style={styles.contextModalHeader}>
              <BookOpen size={24} color={cores.primary} />
              <Text style={styles.contextModalTitle}>Contexto do Diálogo</Text>
            </View>
            <ScrollView style={styles.contextModalScroll}>
              <Text style={styles.contextModalText}>
                {/* Usa a variável correta */}
                {currentQuestionData.contexto || "Carregando contexto..."}
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.contextModalButton} onPress={handleStartChat}>
              <Text style={styles.contextModalButtonText}>Iniciar Diálogo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// Estilos (Completos)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 16, gap: 16, backgroundColor: cores.cardBackground,
    borderBottomWidth: 1, borderBottomColor: cores.border
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: cores.textPrimary, flexShrink: 1 },
  chatContainer: { flex: 1, backgroundColor: cores.background, },
  chatContentContainer: { padding: 10, paddingBottom: 20, },
  messageText: { fontSize: 15, color: cores.textPrimary, lineHeight: 20, },
  clientMessage: {
    backgroundColor: cores.cardBackground, padding: 12, borderRadius: 12, borderBottomLeftRadius: 2,
    alignSelf: 'flex-start', maxWidth: '85%', marginBottom: 8, elevation: 1,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1,
  },
  userMessage: {
    backgroundColor: cores.primaryChat, padding: 12, borderRadius: 12, borderBottomRightRadius: 2,
    alignSelf: 'flex-end', maxWidth: '85%', marginBottom: 8, elevation: 1,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1,
  },
  systemMessage: {
    backgroundColor: cores.primaryLight, padding: 12, borderRadius: 8, marginVertical: 10, marginHorizontal: 16,
    alignItems: 'center', borderWidth: 1, borderColor: cores.greenBorder,
  },
  systemTextTitle: { fontSize: 12, fontWeight: 'bold', color: cores.greenText, textTransform: 'uppercase', marginBottom: 4, },
  systemText: { fontSize: 14, color: cores.textSecondary, lineHeight: 20, textAlign: 'center', },
  feedbackMessage: {
    padding: 12, borderRadius: 12, marginHorizontal: 10, marginBottom: 10, flexDirection: 'row',
    alignItems: 'center', gap: 8,
  },
  feedbackCorrect: { backgroundColor: cores.greenBg, borderWidth: 1, borderColor: cores.greenBorder, },
  feedbackIncorrect: { backgroundColor: cores.redBg, borderWidth: 1, borderColor: cores.redBorder, },
  feedbackText: { fontSize: 14, color: cores.textSecondary, flex: 1, lineHeight: 19, },
  optionsScrollView: {
    flexGrow: 0, 
    backgroundColor: cores.background, 
    borderTopWidth: 1, 
    borderTopColor: cores.border,
  },
  optionsContentContainer: {
    padding: 10, 
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
  },
  
  optionButton: {
    backgroundColor: cores.cardBackground, padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: cores.border,
    marginBottom: 8, alignItems: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 1, elevation: 1,
  },
  optionText: { fontSize: 15, color: cores.textPrimary, fontWeight: '500', textAlign: 'center', },
  waitingIndicator: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, gap: 8,
  },
  waitingText: { fontSize: 14, color: cores.textSecondary, fontStyle: 'italic', },
  contextModalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 24, },
  contextModalContainer: {
    backgroundColor: cores.cardBackground, borderRadius: 20, padding: 24, width: '100%', maxHeight: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10,
  },
  contextModalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: cores.border,
    paddingBottom: 16, marginBottom: 16,
  },
  contextModalTitle: { fontSize: 20, fontWeight: 'bold', color: cores.textPrimary, flex: 1, },
  contextModalScroll: { maxHeight: '70%', }, 
  contextModalText: { fontSize: 16, color: cores.textSecondary, lineHeight: 24, paddingBottom: 16, },
  contextModalButton: { backgroundColor: cores.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 16, },
  contextModalButtonText: { color: cores.textLight, fontSize: 16, fontWeight: 'bold', },
});