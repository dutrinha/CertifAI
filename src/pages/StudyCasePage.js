// /src/pages/StudyCasePage.jsx (VERSÃO 2.2 - Adaptada para Runner)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView, // Importado
  Alert // Importar Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, X, Check, Sparkles } from 'lucide-react-native'; 
import { supabase, useAuth } from '../context/AuthContext'; 
import { useRef } from 'react';
import { 
  POINT_RULES, 
  updateUserProgressAndStreak 
} from '../utils/PointSystem';


// Paleta de cores da SimuladoPage (ajustada)
const cores = {
  primary: "#00C853",
  primaryLight: "#E6F8EB",
  textPrimary: "#1A202C",
  textSecondary: "#64748B",
  textLight: "#FFFFFF",
  background: "#F7FAFC",
  cardBackground: "#FFFFFF",
  border: "#E2E8F0",
  shadow: 'rgba(0, 0, 0, 0.05)',
  red500: '#EF4444',
  red50: '#FEF2F2',
  redBorder: '#FECACA',
  redText: '#DC2626',
  green500: '#22C55E',
  green50: '#F0FDF4',
  greenBorder: '#BBF7D0',
  greenText: '#16A34A',
  // Cores opcionais para Parcial
  orangeBorder: '#FDBA74', // Ex: orange-300
  orangeBg: '#FFFBEB', // Ex: yellow-50
  orangeText: '#D97706', // Ex: yellow-600
};

export default function StudyCasePage() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // --- 1. VERIFICAR MODO RUNNER ---
  // Verifica se estamos no contexto de um Simulado Completo
  const { runnerContext, caseData } = route.params;
  const isRunnerMode = !!runnerContext; // true ou false
  
  // Se estiver no modo runner, caseData vem do param raiz,
  // senão, vem de dentro de route.params.caseData (modo antigo)
  const currentCaseData = isRunnerMode ? caseData : route.params.caseData;
  const { user } = useAuth(); 
  const hasSavedRef = useRef(false);

  // Estados
  const [answers, setAnswers] = useState(
    currentCaseData?.questions ? Array(currentCaseData.questions.length).fill('') : []
  );
  const [isVerified, setIsVerified] = useState(false); // Indica se a ANÁLISE DA IA foi feita
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Loading GERAL da análise
  const [aiAnalysisResults, setAiAnalysisResults] = useState(
    currentCaseData?.questions ? Array(currentCaseData.questions.length).fill(null) : []
    // Estrutura por item: { evaluation: 'correct'|'incorrect'|'partial'|'error', justification: '...' } ou null
  );

  const handleAnswerChange = (text, index) => {
    if (isVerified || isAnalyzing) return;
    if (index >= 0 && index < answers.length) {
      const newAnswers = [...answers];
      newAnswers[index] = text;
      setAnswers(newAnswers);
    }
  };

  // Função para chamar a IA para TODAS as respostas
const handleAiBulkAnalysis = async () => {
    if (!currentCaseData?.questions || isAnalyzing) return;

    setIsAnalyzing(true);
    setAiAnalysisResults(Array(currentCaseData.questions.length).fill(null));
    setIsVerified(false);

    console.log("Iniciando análise em bloco com IA...");

    const analysisPayload = currentCaseData.questions.map((q, index) => ({
      question: q.pergunta,
      userAnswer: answers[index],
      idealAnswer: q.resposta_ideal,
      explanationContext: q.explicacao
    }));

    try {
      console.log("Enviando payload para IA:", analysisPayload);
      const { data: analysisResultsArray, error } = await supabase.functions.invoke(
        'get-ai-bulk-evaluation', // <<< Nome da sua Edge Function para lote
        {
          body: JSON.stringify({ cases: analysisPayload })
        }
      );
      if (error) throw error;

      console.log("Resultados recebidos da IA:", analysisResultsArray);

      if (Array.isArray(analysisResultsArray) && analysisResultsArray.length === currentCaseData.questions.length) {
         setAiAnalysisResults(analysisResultsArray);
         setIsVerified(true);

         // =======================================================
         // ☆ INÍCIO: Salvar no Histórico (PASSO 9) ☆
         // =======================================================

         // Só salva no histórico se NÃO for parte de um "Simulado Completo"
         // e se ainda não tiver sido salvo.
         if (!isRunnerMode && !hasSavedRef.current) { 
           try {
             hasSavedRef.current = true; // Marca que tentou salvar

             // 1. Calcular scores
             let caseScore = 0;
             let correctCount = 0;
             const caseTotal = currentCaseData.questions.length;
             const caseType = 'Case';
             const certification = currentCaseData?.prova?.toUpperCase() || 'CASE';

             analysisResultsArray.forEach(result => {
                if (result.evaluation === 'correct') {
                   caseScore += 1;
                   correctCount += 1;
                } else if (result.evaluation === 'partial') {
                   caseScore += 0.5; // Meio ponto por parcial
                }
             });

             // 2. Preparar a Sessão (o card)
             const sessionData = {
                type: caseType,
                certification: certification,
                topic_title: `Case Prático (${caseTotal}q)`, // ex: "Case Prático (3q)"
                result_display: `${correctCount}/${caseTotal} Corretas`,
                is_success: (caseScore / caseTotal) >= 0.7, // Aprovado se 70% ou mais
                score_achieved: caseScore,
                score_total: caseTotal,
             };

             // 3. Salvar a Sessão e pegar o ID
             const { data: sessionResult, error: sessionError } = await supabase
                .from('simulado_sessions')
                .insert(sessionData)
                .select('id')
                .single();

             if (sessionError) throw sessionError;
             const newSessionId = sessionResult.id;

             // 4. Preparar as Respostas (a revisão)
             const answersData = currentCaseData.questions.map((q, index) => {
                const aiResult = analysisResultsArray[index];
                return {
                  session_id: newSessionId,
                  question_type: 'case', // Tipo 'case'
                  topic: q.modulo,
                  question_main: q.pergunta,
                  explanation: aiResult.justification, // A justificativa da IA
                  user_answer: answers[index], // A resposta dissertativa do user
                  correct_answer: q.resposta_ideal, // A resposta ideal
                };
             });

             // 5. Salvar as Respostas
             const { error: answersError } = await supabase
                .from('simulado_answers')
                .insert(answersData);

             if (answersError) throw answersError;

             console.log('Histórico de Case Prático salvo com sucesso!', newSessionId);

           } catch (saveError) {
             // Se o salvamento falhar, apenas loga. Não impede o usuário.
             console.error("Falha ao salvar o histórico do Case:", saveError);
             hasSavedRef.current = false; // Permite tentar de novo? (Opcional)
           }
         }

         // =======================================================
         // ☆ INÍCIO: Lógica de Pontos e Runner (MODIFICADA) ☆
         // =======================================================
         let totalPointsFromCase = 0;
         let caseRunnerResults = []; // Array para o runner

         analysisResultsArray.forEach(result => {
           // Adiciona o status ao array do runner
           caseRunnerResults.push({ status: result.evaluation });
           
           // Calcula pontos para o Supabase usando o PointSystem
           if (result.evaluation === 'correct') {
             totalPointsFromCase += POINT_RULES.CASE_CORRECT;
           } else if (result.evaluation === 'partial') {
             totalPointsFromCase += POINT_RULES.CASE_PARTIAL;
           } else if (result.evaluation === 'incorrect') {
             totalPointsFromCase += POINT_RULES.CASE_INCORRECT;
           }
           // 'error' ou outros dão 0 pontos
         });

         // Se estiver no modo runner, atualiza o 'results'
         if (isRunnerMode) {
            runnerContext.results.caseResults.push(...caseRunnerResults);
            console.log("Resultados do Case atualizados para o Runner:", runnerContext.results);
         }

         // Só atualiza os pontos de streak/diário se o usuário ganhou algum ponto
         // (Esta lógica roda em AMBOS os modos)
         if (totalPointsFromCase > 0) {
           // Chama a função centralizada
           await updateUserProgressAndStreak(user, totalPointsFromCase);
         }
         // =======================================================
         // ☆ FIM: Lógica de Pontos e Runner ☆
         // =======================================================

      } else {
         console.error("Formato inesperado recebido da Edge Function:", analysisResultsArray);
         throw new Error("Resposta da IA em formato inválido.");
      }

    } catch (err) {
       console.error("Erro ao chamar IA em bloco:", err);
       Alert.alert("Erro", "Não foi possível analisar as respostas com a IA.");
       setAiAnalysisResults(Array(currentCaseData.questions.length).fill({ evaluation: 'error', justification: 'Falha na análise.' }));
       setIsVerified(true);
    } finally {
       setIsAnalyzing(false);
    }
  };
  
  // --- 3. LÓGICA DE NAVEGAÇÃO CONDICIONAL ---
  const handleFinishCase = () => {
    if (isRunnerMode) {
      // MODO RUNNER: Volta para o Handler
      navigation.replace('simulado-completo-handler', {
        questQueue: runnerContext.questQueue,
        currentStep: runnerContext.currentStep + 1, // Avança o passo
        results: runnerContext.results, // 'results' já foi atualizado no handleAiBulkAnalysis
      });
    } else {
      // MODO PADRÃO: Volta para o Hub (ou de onde veio)
      navigation.goBack();
    }
  };


   // Fallback caso caseData não seja passado corretamente
  if (!currentCaseData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
             <ArrowLeft size={24} color={cores.textPrimary} />
           </TouchableOpacity>
           <Text style={styles.headerTitle}>Erro</Text>
        </View>
        <View style={styles.centered}>
            <Text style={styles.errorText}>Erro ao carregar dados do caso.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Verifica se todas as perguntas foram respondidas
  const allAnswered = answers.every(ans => ans && ans.trim().length > 0);

  // =======================================================
  // ☆ INÍCIO DO RETURN COM KEYBOARD AVOIDING VIEW        ☆
  // =======================================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={cores.textPrimary} />
          </TouchableOpacity>
          {/* Título Condicional */}
          <Text style={styles.headerTitle} numberOfLines={1}>
             {isRunnerMode ? 'Simulado Completo - Case' : `Simulado ${currentCaseData?.prova?.toUpperCase() || ''} - Case`}
          </Text>
        </View>

        {/* ScrollView com o conteúdo */}
        <ScrollView
          style={styles.mainContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 150 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card do Contexto */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONTEXTO</Text>
            <View style={styles.questionContainer}>
              <Text style={styles.contextText}>
                {currentCaseData.context || 'Contexto não carregado.'}
              </Text>
            </View>
          </View>

          {/* Seção das Perguntas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PERGUNTAS</Text>
            {/* O map usa 'currentCaseData' */}
            {currentCaseData.questions?.map((q, index) => {
              const aiResult = aiAnalysisResults[index];

              let cardStyle = [styles.questionContainer, styles.questionCardMargin];
              let inputStyle = [styles.answerInput];
              if (isVerified && aiResult?.evaluation === 'correct') {
                  cardStyle.push(styles.cardCorrect);
                  inputStyle.push(styles.inputCorrect);
              } else if (isVerified && aiResult?.evaluation === 'incorrect') {
                  cardStyle.push(styles.cardIncorrect);
                  inputStyle.push(styles.inputIncorrect);
              } else if (isVerified && aiResult?.evaluation === 'partial') {
                  cardStyle.push(styles.cardPartial);
                  inputStyle.push(styles.inputPartial);
              }

              return (
                <View key={index} style={cardStyle}>
                  {/* Info da Pergunta (Módulo e Dificuldade) */}
                  <View style={styles.topicContainer}>
                      <Text style={styles.topicText}>{q.modulo || 'Módulo Indefinido'}</Text>
                      {q.dificuldade && (
                      <View style={[
                          styles.difficultyBadge,
                          q.dificuldade === 'Fácil' && styles.difficultyEasy,
                          q.dificuldade === 'Médio' && styles.difficultyMedium,
                          q.dificuldade === 'Difícil' && styles.difficultyHard,
                      ]}>
                          <Text style={styles.difficultyText}>{q.dificuldade}</Text>
                      </View>
                      )}
                  </View>

                  {/* Enunciado da Pergunta */}
                  <Text style={styles.mainQuestionText}>
                    {`${index + 1}. ${q.pergunta || 'Pergunta não carregada.'}`}
                  </Text>

                  {/* Campo de Resposta */}
                  <TextInput
                    style={inputStyle}
                    placeholder="Digite sua resposta..."
                    placeholderTextColor={cores.textSecondary}
                    value={answers[index] || ''}
                    onChangeText={(text) => handleAnswerChange(text, index)}
                    multiline={true}
                    editable={!isVerified && !isAnalyzing}
                  />

                  {/* FEEDBACK E EXPLICAÇÃO (Após ANÁLISE DA IA) */}
                  {isVerified && aiAnalysisResults[index] && (
                    <View style={[
                      styles.explanationBox,
                      aiResult.evaluation === 'correct' && styles.explanationBoxCorrect,
                      aiResult.evaluation === 'incorrect' && styles.explanationBoxIncorrect,
                      aiResult.evaluation === 'partial' && styles.explanationBoxPartial,
                      (!['correct', 'incorrect', 'partial'].includes(aiResult.evaluation)) && styles.explanationBoxNeutral
                    ]}>
                      {/* Header com o Status da IA */}
                      <View style={[
                         styles.explanationHeader,
                         aiResult.evaluation === 'correct' && styles.explanationHeaderCorrect,
                         aiResult.evaluation === 'incorrect' && styles.explanationHeaderIncorrect,
                         aiResult.evaluation === 'partial' && styles.explanationHeaderPartial,
                         (!['correct', 'incorrect', 'partial'].includes(aiResult.evaluation)) && styles.explanationHeaderNeutral
                      ]}>
                        <Text style={[
                           styles.explanationHeaderText,
                           aiResult.evaluation === 'correct' && styles.explanationHeaderTextCorrect,
                           aiResult.evaluation === 'incorrect' && styles.explanationHeaderTextIncorrect,
                           aiResult.evaluation === 'partial' && styles.explanationHeaderTextPartial,
                           (!['correct', 'incorrect', 'partial'].includes(aiResult.evaluation)) && styles.explanationHeaderTextNeutral
                        ]}>
                          {aiResult.evaluation === 'correct' ? 'Correto' :
                           aiResult.evaluation === 'incorrect' ? 'Incorreto' :
                           aiResult.evaluation === 'partial' ? 'Parcialmente Correto' :
                           aiResult.evaluation === 'error' ? 'Erro na Análise' :
                           'IA: Análise'}
                        </Text>
                      </View>

                      {/* Mostra Resposta Ideal se != 'correct' */}
                      {aiResult.evaluation !== 'correct' && (
                        <>
                          <Text style={[styles.explanationText, styles.idealAnswerText]}>
                             <Text style={{fontWeight: 'bold'}}>Resposta Ideal: </Text>{q.resposta_ideal || '-'}
                          </Text>
                          <View style={styles.explanationDivider}/>
                        </>
                      )}

                      {/* Mostra a JUSTIFICATIVA da IA */}
                      <Text style={styles.explanationText}>
                         <Text style={{fontWeight: 'bold'}}> CertifAI: </Text>
                         {aiResult.justification || 'Sem justificativa da IA.'}
                      </Text>

                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer Flutuante */}
        {!isVerified && !isAnalyzing && (
            <View style={styles.floatingFooter}>
              <TouchableOpacity
                 style={[styles.footerButton, (!allAnswered) && styles.footerButtonDisabled]}
                 onPress={handleAiBulkAnalysis}
                 disabled={!allAnswered || isAnalyzing}
              >
                <Text style={styles.footerButtonText}>Corrigir com IA</Text>
              </TouchableOpacity>
            </View>
        )}
        {isAnalyzing && (
             <View style={styles.floatingFooter}>
                <View style={[styles.footerButton, styles.footerButtonLoading]}>
                    <ActivityIndicator color={cores.textLight} />
                    <Text style={styles.footerButtonText}>Analisando...</Text>
                </View>
             </View>
        )}
         {isVerified && !isAnalyzing && (
             <View style={styles.floatingFooter}>
                 {/* BOTÃO CONDICIONAL */}
                 <TouchableOpacity
                     style={[styles.footerButton, {backgroundColor: cores.textSecondary}]}
                     onPress={handleFinishCase} // <-- CHAMA A NOVA FUNÇÃO
                 >
                     <Text style={styles.footerButtonText}>
                       {/* Texto Condicional */}
                       {isRunnerMode ? 'Próxima Questão' : 'Voltar para o Hub'}
                     </Text>
                 </TouchableOpacity>
             </View>
         )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
  // =======================================================
  // ☆ FIM DO RETURN COM KEYBOARD AVOIDING VIEW           ☆
  // =======================================================
}


// Estilos (Completos e atualizados, incluindo estilos 'Partial')
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: cores.textSecondary, textAlign: 'center' },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: cores.background,
    gap: 16,
    paddingTop: Platform.OS === 'android' ? 30 : 16,
    borderBottomWidth: 1,
    borderBottomColor: cores.border,
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: cores.textPrimary,
    flexShrink: 1, // Impede que o título empurre o botão de fechar
  },
   closeButton: { padding: 4, marginLeft: 'auto' },

  mainContent: { flex: 1, paddingHorizontal: 20 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: cores.textSecondary,
    paddingHorizontal: 4,
    marginBottom: 8,
    textTransform: 'uppercase'
  },
   // Card Padrão
  questionContainer: {
    padding: 16,
    backgroundColor: cores.cardBackground,
    borderRadius: 16,
    shadowColor: cores.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  questionCardMargin: {
     marginBottom: 16,
  },
  contextText: {
     fontSize: 15,
     color: cores.textPrimary,
     lineHeight: 22,
     opacity: 0.9
  },
  // Info da Pergunta
  topicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: cores.border,
    paddingBottom: 12,
    gap: 8,
  },
  topicText: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.textSecondary,
    flexShrink: 1,
  },
  // Badge de Dificuldade
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  difficultyEasy: { backgroundColor: cores.green50 },
  difficultyMedium: { backgroundColor: '#FEF9C3' }, // yellow-100
  difficultyHard: { backgroundColor: cores.red50 },
  difficultyText: { fontSize: 11, fontWeight: 'bold', color: cores.textPrimary },
   // Texto da Pergunta
  mainQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: cores.textPrimary,
    lineHeight: 23,
    marginBottom: 16,
  },
  // Input de Resposta
  answerInput: {
    backgroundColor: cores.background,
    borderColor: cores.border,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: cores.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Estilos de Validação
   cardCorrect: { borderColor: cores.greenBorder },
   cardIncorrect: { borderColor: cores.redBorder },
   cardPartial: { borderColor: cores.orangeBorder }, // Estilo Parcial
   inputCorrect: { backgroundColor: cores.green50, borderColor: cores.greenBorder },
   inputIncorrect: { backgroundColor: cores.red50, borderColor: cores.redBorder },
   inputPartial: { backgroundColor: cores.orangeBg, borderColor: cores.orangeBorder }, // Estilo Parcial

  // Box de Explicação/Feedback IA
  explanationBox: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    overflow: 'hidden',
  },
  explanationBoxNeutral: { borderColor: cores.border, backgroundColor: cores.cardBackground },
  explanationBoxCorrect: { borderColor: cores.greenBorder, backgroundColor: cores.green50 },
  explanationBoxIncorrect: { borderColor: cores.redBorder, backgroundColor: cores.red50 },
  explanationBoxPartial: { borderColor: cores.orangeBorder, backgroundColor: cores.orangeBg }, // Estilo Parcial

  explanationHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  explanationHeaderNeutral: { borderColor: cores.border },
  explanationHeaderCorrect: { borderColor: cores.greenBorder },
  explanationHeaderIncorrect: { borderColor: cores.redBorder },
  explanationHeaderPartial: { borderColor: cores.orangeBorder }, // Estilo Parcial

  explanationHeaderText: { fontWeight: 'bold', fontSize: 13 },
  explanationHeaderTextNeutral: { color: cores.textSecondary },
  explanationHeaderTextCorrect: { color: cores.greenText },
  explanationHeaderTextIncorrect: { color: cores.redText },
  explanationHeaderTextPartial: { color: cores.orangeText }, // Estilo Parcial

  explanationText: {
    paddingHorizontal: 12,
    paddingVertical: 8, // Ajustado padding
    fontSize: 14,
    color: cores.textPrimary,
    lineHeight: 20,
  },
  idealAnswerText: {
     fontStyle: 'italic',
     color: cores.textSecondary,
     paddingBottom: 0, // Removido padding extra aqui
     paddingTop: 12, // Adicionado padding no topo
  },
   explanationDivider: {
    height: 1,
    backgroundColor: cores.border,
    marginHorizontal: 12,
    marginVertical: 4, // Ajustado espaçamento
  },

  // Footer Flutuante
  floatingFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: cores.background,
    borderTopWidth: 1,
    borderTopColor: cores.border,
  },
  footerButton: {
    backgroundColor: cores.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  footerButtonText: { color: cores.textLight, fontSize: 16, fontWeight: 'bold' },
  footerButtonDisabled: { backgroundColor: cores.textSecondary, opacity: 0.6, elevation: 0 },
  footerButtonLoading: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: cores.textSecondary,
    opacity: 0.8,
  },

});