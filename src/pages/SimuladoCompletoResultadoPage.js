// /src/pages/SimuladoCompletoResultadoPage.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { X, RefreshCw, Home, Sparkles, Send } from 'lucide-react-native';
import { Svg, Circle } from 'react-native-svg';

// Cores (mix de ResultadoPage e SimuladoPage)
const cores = {
  primary: '#00C853',
  primary700: '#00B048',
  primary50: '#E6F8EB',
  secondary: '#1A202C',
  light: '#FFFFFF',
  softGray: '#F7FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray500: '#64748B',
  green700: '#15803D',
  green600: '#16A34A',
  red600: '#DC2626',
  yellow700: '#B45309',
  orange: '#F59E0B',
};

// Componente para renderizar o texto da IA com negrito
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

export default function SimuladoCompletoResultadoPage() {
  const route = useRoute();
  const navigation = useNavigation();

  // --- 1. Recebendo os dados do simulado ---
  // (Valores padrão para segurança)
  const {
    mcScore = 0,
    mcTotal = 1,
    caseResults = [], // Ex: [{ status: 'correct' }, { status: 'partial' }]
    interactiveResults = { score: 0, maxScore: 1 },
    certificationType = 'cpa', // Para o botão "Refazer"
  } = route.params;

  // --- 2. Cálculos dos Resultados ---
  // Múltipla Escolha
  const mcPercentage = Math.round((mcScore / (mcTotal || 1)) * 100);
  const isMcApproved = mcPercentage >= 70; // Usado no círculo principal

  // Cases
  const casesCorrect = caseResults.filter(r => r.status === 'correct').length;
  const casesPartial = caseResults.filter(r => r.status === 'partial').length;
  const casesTotal = caseResults.length || 0;

  // Interativa
  const iScore = interactiveResults.score;
  const iMaxScore = interactiveResults.maxScore || 1;

  // Animação do Círculo (baseado na Múltipla Escolha)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const [progressOffset, setProgressOffset] = useState(circumference);

  useEffect(() => {
    const offset = circumference - (mcPercentage / 100) * circumference;
    const timer = setTimeout(() => setProgressOffset(offset), 300);
    return () => clearTimeout(timer);
  }, [mcPercentage, circumference]);

  // --- 3. Estados do Modal de IA ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiReplying, setIsAiReplying] = useState(false);

  const openAiChat = () => {
    // Cria um prompt consolidado
    const summaryPrompt = `Meu resultado no simulado completo foi:
- Múltipla Escolha: ${mcScore} de ${mcTotal} acertos.
- Cases Práticos: ${casesCorrect} corretos, ${casesPartial} parciais (de ${casesTotal} total).
- Questão Interativa: ${iScore} de ${iMaxScore} pontos.

Com base nisso, onde devo focar meus estudos?`;
    
    const hiddenHistory = [{ role: "user", text: summaryPrompt }];
    setChatHistory([]); // Limpa o histórico anterior
    setIsModalOpen(true);
    getAiCorrection(hiddenHistory); // Busca a primeira análise
  };

  const getAiCorrection = async (currentHistory) => {
    setIsAiReplying(true);
    // TODO: Idealmente, usar uma Edge Function específica para "análise de resultado completo"
    // Por enquanto, vamos simular uma resposta
    setTimeout(() => {
      const aiResponse = `Ótimo trabalho! Vendo seu resultado:
**Múltipla Escolha:** Você foi muito bem (${mcPercentage}%)!
**Cases Práticos:** Parece que aqui temos um ponto de atenção (${casesCorrect}/${casesTotal}).
**Interativas:** Também foi bem (${iScore}/${iMaxScore}).

Eu sugiro focar em **revisar os Cases Práticos**. Tente entender por que obteve respostas parciais. Você tem alguma dúvida específica sobre eles?`;
      
      setChatHistory((prev) => [...prev, { role: "ai", text: aiResponse }]);
      setIsAiReplying(false);
    }, 1500);
  };
  
  const handleSendMessage = () => {
    if (!chatInput.trim() || isAiReplying) return;
    const newUserMessage = { role: 'user', text: chatInput };
    const newHistory = [...chatHistory, newUserMessage];
    setChatHistory(newHistory);
    setChatInput('');
    getAiCorrection(newHistory); // Envia a pergunta do usuário
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Resultado Consolidado</Text>
          <Text style={styles.headerSubtitle}>Confira seu desempenho completo.</Text>
        </View>
        <TouchableOpacity 
          onPress={() => navigation.popToTop()} 
          style={styles.closeButton}>
          <X size={24} color={cores.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainContent}>
        {/* Gráfico SVG (focado em Múltipla Escolha) */}
        <View style={styles.circleContainer}>
          <Svg height="100%" width="100%" viewBox="0 0 120 120">
            <Circle cx="60" cy="60" r={radius} stroke={cores.gray200} strokeWidth="12" fill="none" />
            <Circle
              cx="60" cy="60" r={radius}
              stroke={isMcApproved ? cores.primary : cores.orange}
              strokeWidth="12" fill="none" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              originX="60" originY="60" rotation="-90"
            />
          </Svg>
          <View style={styles.circleTextContainer}>
            <Text style={styles.percentageText}>{mcPercentage}%</Text>
            <Text style={styles.circleLabel}>Múltipla Escolha</Text>
          </View>
        </View>

        <Text style={styles.mainTitle}>
          {isMcApproved ? 'Bom desempenho!' : 'Continue focado'}
        </Text>
        <Text style={styles.mainSubtitle}>
          Veja abaixo o detalhamento do seu resultado.
        </Text>

        {/* Card de Resumo (Consolidado) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>M. Escolha</Text>
            <Text style={[styles.summaryValue, { color: isMcApproved ? cores.green600 : cores.red600 }]}>
              {mcScore}/{mcTotal}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Cases</Text>
            <Text style={[styles.summaryValue, { color: cores.secondary }]}>
              {casesCorrect}/{casesTotal}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Interativa</Text>
            <Text style={[styles.summaryValue, { color: cores.secondary }]}>
              {iScore}/{iMaxScore}
            </Text>
          </View>
        </View>

        {/* Botão de IA */}
        <TouchableOpacity style={styles.aiButton} onPress={openAiChat}>
            <Sparkles size={20} color={cores.primary700} />
            <Text style={styles.aiButtonText}>Analisar resultado com IA</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer com botões de navegação */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.replace('simulado-completo-config', { certificationType })}
        >
          <RefreshCw size={20} color={cores.primary700} />
          <Text style={styles.secondaryButtonText}>Refazer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.popToTop()}
        >
          <Home size={20} color={cores.light} />
          <Text style={styles.primaryButtonText}>Início</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de IA (Copiado de SimuladoPage) */}
      <Modal animationType="slide" transparent={true} visible={isModalOpen} onRequestClose={() => setIsModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                 <Sparkles size={20} color={cores.primary} />
                 <Text style={styles.modalTitle}>Análise CertifAI</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.closeButton}>
                <X size={20} color={cores.secondary} />
              </TouchableOpacity>
            </View>
             
             <FlatList
                style={styles.chatScrollView}
                contentContainerStyle={{ paddingBottom: 20 }}
                data={chatHistory}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                   <View style={item.role === 'user' ? styles.userMessage : styles.aiMessage}>
                      {item.role === 'user' ? <Text style={styles.userMessageText}>{item.text}</Text> : <AiMessageRenderer text={item.text} />}
                   </View>
                )}
             />
             
             {isAiReplying && <ActivityIndicator style={{marginTop: 10, paddingBottom: 10}} color={cores.primary}/>}

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

// StyleSheet
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.light, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  header: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: cores.secondary },
  headerSubtitle: { fontSize: 14, color: cores.gray500 },
  closeButton: { padding: 4 },
  mainScroll: { flex: 1 },
  mainContent: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16 },
  circleContainer: { width: 192, height: 192, marginBottom: 16 },
  circleTextContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  percentageText: { fontSize: 40, fontWeight: 'bold', color: cores.secondary },
  circleLabel: { fontSize: 14, color: cores.gray500, fontWeight: '500', marginTop: 4 },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: cores.secondary, textAlign: 'center' },
  mainSubtitle: { color: cores.gray500, marginTop: 8, textAlign: 'center', maxWidth: 300 },
  summaryCard: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: cores.softGray, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: cores.gray100, marginTop: 24, width: '100%', maxWidth: 400 },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryLabel: { fontSize: 14, color: cores.gray500, fontWeight: '500' },
  summaryValue: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  divider: { width: 1, backgroundColor: cores.gray200 },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: cores.primary50,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 24,
    width: '100%',
    maxWidth: 400,
  },
  aiButtonText: {
    color: cores.primary700,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: { padding: 24, borderTopWidth: 1, borderColor: cores.gray200, flexDirection: 'row', gap: 16, backgroundColor: cores.light },
  primaryButton: { flex: 1, backgroundColor: cores.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  primaryButtonText: { color: cores.light, fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { flex: 1, backgroundColor: cores.primary50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  secondaryButtonText: { color: cores.primary700, fontSize: 16, fontWeight: 'bold' },
  
  // Estilos do Modal (copiados de SimuladoPage)
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContainer: { height: '85%', backgroundColor: cores.softGray, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { padding: 16, borderBottomWidth: 1, borderColor: cores.gray200, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: cores.secondary },
  chatScrollView: { flex: 1, padding: 16 },
  userMessage: { alignSelf: 'flex-end', backgroundColor: cores.primary, padding: 12, borderRadius: 12, borderBottomRightRadius: 2, marginBottom: 8, maxWidth: '80%' },
  userMessageText: { color: cores.light, fontSize: 14 },
  aiMessage: { alignSelf: 'flex-start', marginBottom: 8 },
  aiMessageText: { color: cores.secondary, fontSize: 14, lineHeight: 20 },
  chatInputContainer: { paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderColor: cores.gray200, backgroundColor: cores.light, flexDirection: 'row', gap: 8, paddingBottom: Platform.OS === 'ios' ? 24 : 8},
  chatInput: { flex: 1, backgroundColor: cores.softGray, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, height: 44 },
  sendButton: { width: 44, height: 44, borderRadius: 8, backgroundColor: cores.primary, justifyContent: 'center', alignItems: 'center' },
});