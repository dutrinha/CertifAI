// src/pages/InteractiveResultPage.js
// (VERSÃO FINAL - Suporta Modo Padrão e Modo Revisão)
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Platform, 
  ActivityIndicator,
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase, useAuth } from '../context/AuthContext';
import { Sparkles, Home, ChevronRight, Send, X, ArrowLeft } from 'lucide-react-native'; // <-- Adicionado ArrowLeft

// Paleta de cores
const cores = {
  primary: "#00C853", primaryChat: "#DCF8C6", primaryLight: "#E6F8EB", 
  textPrimary: "#1A202C", textSecondary: "#64748B", textLight: "#FFFFFF", 
  background: "#F7FAFC", cardBackground: "#FFFFFF", border: "#E2E8F0", 
  redText: '#DC2626', greenText: '#16A34A',
};

// Função de data (para salvar o streak)
const getLocalDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Componente de Markdown
const MarkdownRenderer = ({ text, style }) => {
  if (!text) return null;
  const parts = text.split('**');
  return (
    <Text style={style}>
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

// Componente de Chat
const AiChatMessage = ({ item }) => {
  if (item.role === 'user') {
    return (
      <View style={styles.userMessage}>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  }
  return (
    <View style={styles.clientMessage}>
      <MarkdownRenderer text={item.text} style={styles.messageText} />
    </View>
  );
};

export default function InteractiveResultPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const chatRef = useRef(null);
  const { user } = useAuth();
  
  // --- Estados da Página ---
  const [isLoading, setIsLoading] = useState(true);
  const [aiFeedback, setAiFeedback] = useState("");
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  
  // Flag para Modo Revisão
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  // Estados do Modal de Chat
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [followUpHistory, setFollowUpHistory] = useState([]);
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [chatInput, setChatInput] = useState("");
  
  // Ref para evitar processamento duplicado no modo padrão
  const hasProcessedRef = useRef(false);

  // --- O CÉREBRO DA PÁGINA: EFEITO PRINCIPAL ---
  useEffect(() => {
    // --- MODO 2: REVISÃO (Vindo do Histórico) ---
    if (route.params?.sessionId) {
      setIsReviewMode(true);
      const { sessionId } = route.params;
      
      const fetchReviewData = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('simulado_sessions')
            .select('score_achieved, score_total, review_feedback')
            .eq('id', sessionId)
            .single();
            
          if (error) throw error;
          
          setTotalScore(data.score_achieved);
          setMaxScore(data.score_total);
          setAiFeedback(data.review_feedback || "Feedback não foi salvo para esta sessão.");
          
        } catch (err) {
          console.error("Erro ao buscar revisão da interativa:", err);
          setAiFeedback(`Erro ao carregar dados: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchReviewData();

    } 
    // --- MODO 1: PADRÃO (Vindo da Questão) ---
    else if (route.params?.userPath) {
      if (hasProcessedRef.current) return; // Evita rodar de novo
      hasProcessedRef.current = true;
      
      const { userPath = [], totalScore: finalScore = 0, questionData = {} } = route.params;
      const calculatedMaxScore = userPath.length * 5;
      
      setTotalScore(finalScore);
      setMaxScore(calculatedMaxScore);

      const getAiFeedbackAndSaveData = async () => {
        let feedbackFromAI = "";
        try {
          // 1. Buscar Feedback da IA
          const payload = { 
            history: userPath, 
            context: questionData.contexto, 
            topic: questionData.topico 
          };
          const { data, error } = await supabase.functions.invoke(
            'get-ai-interactive-feedback', 
            { body: JSON.stringify(payload) }
          );
          if (error) throw error;
          feedbackFromAI = data.feedback || "Não foi possível obter o feedback.";
          setAiFeedback(feedbackFromAI);

        } catch (error) {
          console.error("Erro ao buscar feedback da IA:", error);
          setAiFeedback("Houve um erro ao analisar seu resultado.");
        } finally {
          setIsLoading(false); // Libera a UI
          
          // 2. Salvar Pontos de Streak
          if (finalScore > 0) {
             try {
                // (Lógica de salvar streak/pontos)
                const today = getLocalDateString();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayString = yesterday.toISOString().split('T')[0];
                const pointsToAdd = finalScore; 
                const currentMeta = user?.user_metadata || {};
                const progress = currentMeta.daily_progress || { date: null, count: 0 };
                const streak = currentMeta.study_streak || { count: 0, lastStudiedDate: null };
                let dataToUpdate = {}; 
                const newProgressCount = (progress.date === today) ? progress.count + pointsToAdd : pointsToAdd;
                dataToUpdate.daily_progress = { date: today, count: newProgressCount };
                if (streak.lastStudiedDate !== today) {
                  const newStreakCount = (streak.lastStudiedDate === yesterdayString) ? streak.count + 1 : 1;
                  dataToUpdate.study_streak = { count: newStreakCount, lastStudiedDate: today };
                }
                await supabase.auth.updateUser({ data: dataToUpdate });
                console.log('Pontos da Interativa atualizados!', pointsToAdd);
             } catch (e) {
                console.error('Erro ao atualizar pontos da Interativa no Supabase:', e); 
             }
          }
          
          // 3. Salvar Histórico da Sessão (com o feedback)
          try {
            const sessionData = {
              type: 'Interativa',
              certification: questionData?.prova?.toUpperCase() || 'INTERATIVA',
              topic_title: questionData?.topico || 'Diálogo Interativo',
              result_display: `${finalScore} pts`, 
              is_success: (finalScore / calculatedMaxScore) >= 0.7, 
              score_achieved: finalScore,
              score_total: calculatedMaxScore,
              review_feedback: feedbackFromAI // <-- Salva o comentário
            };
            const { data: s, error: sError } = await supabase.from('simulado_sessions').insert(sessionData).select('id').single();
            if (sError) throw sError;
            console.log('Histórico de Interativa (com feedback) salvo!', s.id);
          } catch (saveError) {
            console.error("Falha ao salvar o histórico da Interativa:", saveError);
          }
        } // Fim do finally
      };
      
      getAiFeedbackAndSaveData();
    }
  }, [route.params, user]); // Dependências


  // --- Funções do Chat de Follow-up (NÃO PODEMOS USAR NO MODO REVISÃO) ---
  const handleFollowUp = async (question) => {
    // Trava a função se estiver em modo revisão (pois não temos o context)
    if (isReviewMode) {
      alert("O chat de coaching só está disponível logo após finalizar a questão.");
      return;
    }
    
    // Pega os dados originais (só existem no Modo Padrão)
    const { userPath = [], questionData = {} } = route.params;

    if (!isChatModalOpen) setIsChatModalOpen(true);

    const newUserMessage = { role: 'user', text: question };
    const newHistory = [...followUpHistory, newUserMessage];
    setFollowUpHistory(newHistory);
    setChatInput("");
    setIsAiReplying(true);

    try {
      const payload = {
        originalContext: questionData.contexto,
        originalHistory: userPath,
        chatHistory: newHistory
      };
      const { data, error } = await supabase.functions.invoke(
        'get-ai-sales-coaching',
        { body: JSON.stringify(payload) }
      );
      if (error) throw error;
      const aiResponse = { role: 'model', text: data.response || "..." };
      setFollowUpHistory(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("Erro no chat de coaching:", error);
      setFollowUpHistory(prev => [...prev, { role: 'model', text: "Desculpe, não consegui processar agora." }]);
    } finally {
      setIsAiReplying(false);
    }
  };


  const irParaHub = () => {
    const { questionData = {} } = route.params;
    // Se não tivermos o questionData (modo revisão), apenas voltamos
    if (!questionData.prova) {
      navigation.goBack();
      return;
    }
    navigation.navigate(`${questionData.prova.toLowerCase()}-hub`);
  };

  // --- RENDERIZAÇÃO ---
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header (Agora é condicional) */}
      <View style={styles.header}>
        {isReviewMode && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
              <ArrowLeft size={24} color={cores.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {isReviewMode ? "Revisão da Interativa" : "Análise de Desempenho"}
        </Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.container}>
        {/* Card de Pontuação */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sua Pontuação</Text>
          {isLoading ? (
            <ActivityIndicator color={cores.primary} style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreText}>{totalScore}</Text>
              <Text style={styles.scoreMaxText}>/ {maxScore}</Text>
            </View>
          )}
          <Text style={styles.scoreSubtitle}>Pontos obtidos neste diálogo</Text>
        </View>

        {/* Card de Feedback da IA */}
        <View style={styles.card}>
          <View style={styles.aiHeader}>
            <Sparkles size={22} color={cores.primary} />
            <Text style={styles.sectionTitle}>Feedback do Professor</Text>
          </View>
          
          {isLoading ? (
            <ActivityIndicator size="large" color={cores.primary} style={{ marginVertical: 20 }} />
          ) : (
            <MarkdownRenderer text={aiFeedback} style={styles.feedbackText} />
          )}

          {/* Botões de Chat (Só aparecem no modo padrão) */}
          {!isLoading && !isReviewMode && (
            <View style={styles.quickReplyContainer}>
              <TouchableOpacity style={styles.quickReplyButton} onPress={() => handleFollowUp("Como posso melhorar minha quebra de objeções?")}>
                <Text style={styles.quickReplyText}>Como melhorar na quebra de objeções?</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickReplyButton} onPress={() => handleFollowUp("Qual é uma boa maneira de abordar um cliente?")}>
                <Text style={styles.quickReplyText}>Qual uma boa forma de abordar o cliente?</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Card de Próximos Passos (Oculto no modo revisão por simplicidade) */}
        {!isReviewMode && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Recomendação</Text>
            <Text style={styles.recommendationText}>
              Continue praticando o tópico: <Text style={{fontWeight: 'bold'}}>{route.params?.questionData?.topico || "..."}</Text>
            </Text>
            <TouchableOpacity style={styles.buttonSecondary} onPress={irParaHub}>
              <Text style={styles.buttonSecondaryText}>Ver Hub da Certificação</Text>
              <ChevronRight size={18} color={cores.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Botão de Voltar ao Início */}
        <TouchableOpacity style={styles.buttonPrimary} onPress={() => navigation.popToTop()}>
          <Home size={20} color={cores.textLight} />
          <Text style={styles.buttonPrimaryText}>Voltar ao Início</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Chat (Não vai abrir no modo revisão) */}
      <Modal 
        animationType="slide" 
        transparent={true} 
        visible={isChatModalOpen} 
        onRequestClose={() => setIsChatModalOpen(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                 <Sparkles size={20} color={cores.primary} />
                 <Text style={styles.modalTitle}>Professor de Vendas</Text>
              </View>
              <TouchableOpacity onPress={() => setIsChatModalOpen(false)} style={styles.closeButton}>
                <X size={20} color={cores.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              ref={chatRef}
              style={styles.chatContainer}
              data={followUpHistory}
              renderItem={AiChatMessage}
              keyExtractor={(item, index) => index.toString()}
              onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: true })}
            />
            {isAiReplying && <ActivityIndicator style={{marginVertical: 4}} color={cores.primary}/>}
             <View style={styles.chatInputContainer}>
                <TextInput 
                  style={styles.chatInput} 
                  placeholder="Tire suas dúvidas..." 
                  value={chatInput} 
                  onChangeText={setChatInput} 
                  editable={!isAiReplying}
                  onSubmitEditing={() => handleFollowUp(chatInput)}
                />
                <TouchableOpacity 
                  onPress={() => handleFollowUp(chatInput)} 
                  disabled={!chatInput.trim() || isAiReplying} 
                  style={[styles.sendButton, (!chatInput.trim() || isAiReplying) && styles.sendButtonDisabled]}>
                   <Send size={20} color={cores.textLight} />
                </TouchableOpacity>
             </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

// ESTILOS
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  header: { 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'android' ? 25 : 16, 
    paddingBottom: 16, 
    backgroundColor: cores.background,
    flexDirection: 'row', // <-- Adicionado
    alignItems: 'center', // <-- Adicionado
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: cores.textPrimary },
  container: { padding: 20, gap: 16, paddingBottom: 60 },
  card: {
    backgroundColor: cores.cardBackground,
    borderRadius: 20,
    padding: 20,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: cores.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderColor: cores.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: cores.primary,
    lineHeight: 52,
  },
  scoreMaxText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: cores.textSecondary,
    paddingBottom: 4,
    marginLeft: 4,
  },
  scoreSubtitle: {
    fontSize: 14,
    color: cores.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  feedbackText: {
    fontSize: 16,
    color: cores.textPrimary,
    lineHeight: 24,
  },
  quickReplyContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: cores.border,
    paddingTop: 16,
    gap: 8,
  },
  quickReplyButton: {
    backgroundColor: cores.background,
    borderColor: cores.border,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  quickReplyText: {
    color: cores.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  recommendationText: {
    fontSize: 15,
    color: cores.textPrimary,
    lineHeight: 22,
    marginBottom: 16,
  },
  buttonPrimary: {
    backgroundColor: cores.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    elevation: 3,
  },
  buttonPrimaryText: {
    color: cores.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: cores.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonSecondaryText: {
    color: cores.primary,
    fontSize: 15,
    fontWeight: 'bold',
  },

  // === ESTILOS DO MODAL DE CHAT ===
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContainer: { 
    height: '85%', 
    backgroundColor: cores.background,
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: { 
    padding: 16, borderBottomWidth: 1, borderColor: cores.border, 
    flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'center', backgroundColor: cores.cardBackground,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: cores.textPrimary },
  closeButton: { padding: 4 },
  chatContainer: {
    flex: 1,
    backgroundColor: cores.background,
  },
  chatContentContainer: {
    padding: 10,
  },
  messageText: {
    fontSize: 15,
    color: cores.textPrimary,
    lineHeight: 20,
  },
  clientMessage: { 
    backgroundColor: cores.cardBackground,
    padding: 12,
    borderRadius: 12,
    borderBottomLeftRadius: 2,
    alignSelf: 'flex-start',
    maxWidth: '85%',
    marginBottom: 8,
    elevation: 1,
  },
  userMessage: { 
    backgroundColor: cores.primaryChat,
    padding: 12,
    borderRadius: 12,
    borderBottomRightRadius: 2,
    alignSelf: 'flex-end',
    maxWidth: '85%',
    marginBottom: 8,
    elevation: 1,
  },
  chatInputContainer: { 
    paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, 
    borderColor: cores.border, backgroundColor: cores.cardBackground, 
    flexDirection: 'row', gap: 8, paddingBottom: Platform.OS === 'ios' ? 32 : 8
  },
  chatInput: { 
    flex: 1, backgroundColor: cores.background, borderRadius: 20, 
    paddingHorizontal: 16, fontSize: 15, height: 44 
  },
  sendButton: { 
    width: 44, height: 44, borderRadius: 22, 
    backgroundColor: cores.primary, 
    justifyContent: 'center', alignItems: 'center' 
  },
  sendButtonDisabled: {
    backgroundColor: cores.textSecondary,
    opacity: 0.5,
  }
});