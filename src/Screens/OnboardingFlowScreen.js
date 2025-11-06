// src/Screens/OnboardingFlowScreen.js (VERSÃO 4.3 - Corrigindo Markdown em MAIS locais)
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { supabase } from '../context/AuthContext';
import { Sparkles, Target, Award, ShieldCheck, Star, Minus, Plus, X, Check } from 'lucide-react-native';

// Cores
const cores = {
  primary: '#00C853',
  light: '#FFFFFF',
  secondary: '#1A202C',
  gray100: '#F1F5F9',
  gray500: '#64748B',
  gray200: '#E2E8F0',
  red50: '#FEE2E2',
  red500: '#EF4444',
  green50: '#F0FDF4',
  green500: '#22C55E',
  green700: '#007032',
  red600: '#DC2626',
};

// =======================================================
// ☆ COMPONENTE: RENDERIZADOR DE MARKDOWN (NEGRITO) ☆
// (Necessário para formatar os textos com **)
// =======================================================
const MarkdownRenderer = ({ text, style }) => {
  if (!text) return null;
  const parts = text.split('**'); // Divide o texto por **
  return (
    <Text style={style}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          // Se o índice for ímpar, está entre **
          <Text key={index} style={{ fontWeight: 'bold' }}>{part}</Text>
        ) : (
          // Se for par, é texto normal
          part
        )
      )}
    </Text>
  );
};


// --- NOVOS FATOS REAIS (O "MOLHO") ---
// (Foco na Aversão à Perda e no Ganho)
const certificationFacts = {
  cpa: {
    salary: "Abre portas para salários de R$ 4.000 a R$ 7.000+",
    fact: "É a 'porta de entrada' obrigatória. Mas atenção: a taxa de reprovação é de ~50%. Cada prova perdida custa R$ 400+ e meses de espera.",
  },
  cpror: {
    salary: "Potencial salarial acima de R$ 12.000/mês",
    fact: "Especialização para Alta Renda. É o que separa gerentes comuns dos gerentes de elite. A maioria fica estagnada por não passar nesta prova.",
  },
  cproi: {
    salary: "Remuneração acima de R$ 20.000 + Bônus",
    fact: "O topo da pirâmide (Private e Gestão). Acesso aos cargos de diretoria, mas a prova exige um domínio que 90% dos candidatos não tem.",
  },
};

// --- Objeto de Pergunta Interativa (A "PROVA" FALSA) ---
// (Com a lógica de correção que você pediu)
const dummyQuestion = {
  question: "Qual título público federal protege o investidor contra a inflação (IPCA)?",
  options: {
    A: "Tesouro Selic (LFT)",
    B: "Tesouro Prefixado (LTN)",
    C: "Tesouro IPCA+ (NTN-B)",
    D: "CDB de liquidez diária",
  },
  answer: "C",
  explanation: {
    // A Resposta Correta
    C: {
      title: "Exato! Você acertou em cheio.",
      text: "O **Tesouro IPCA+ (NTN-B)** é o único título público que paga uma taxa fixa + a variação da inflação (IPCA), protegendo seu poder de compra."
    },
    // Resposta Errada 1
    A: {
      title: "Incorreto. Quase lá.",
      text: "**Por que você errou:** O **Tesouro Selic (LFT)** protege seu dinheiro contra a variação da *taxa de juros* (Selic), não da inflação (IPCA).\n\n**Por que a C está certa:** O **Tesouro IPCA+ (NTN-B)** é o título específico que garante o rendimento acima da inflação."
    },
    // Resposta Errada 2
    B: {
      title: "Incorreto. Cuidado com essa.",
      text: "**Por que você errou:** O **Tesouro Prefixado (LTN)** tem uma taxa *fixa*. Se a inflação disparar (como já vimos no Brasil), seu dinheiro perde valor.\n\n**Por que a C está certa:** O **Tesouro IPCA+ (NTN-B)** é o único que se *ajusta* à inflação, garantindo seu poder de compra."
    },
    // Resposta Errada 3
    D: {
      title: "Incorreto. Atenção aos detalhes.",
      text: "**Por que você errou:** O **CDB** é um título *privado* (de banco). A pergunta foi sobre títulos *públicos federais*.\n\n**Por que a C está certa:** O **Tesouro IPCA+ (NTN-B)** é o título público correto para proteção contra a inflação."
    }
  }
};

export default function OnboardingFlowScreen() {
  const [step, setStep] = useState(1);
  const [selectedCert, setSelectedCert] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- Estados para Etapa 2 (Quiz) ---
  const [selectedAnswer, setSelectedAnswer] = useState(null); // 'A', 'B', 'C', 'D'
  const [isVerified, setIsVerified] = useState(false);

  // --- Meta de PONTOS ---
  const [dailyGoal, setDailyGoal] = useState(100);

  // Avança para a próxima etapa
  const nextStep = () => {
    setIsVerified(false); // Reseta a verificação
    setSelectedAnswer(null); // Reseta a resposta
    setStep((s) => s + 1);
  };

  // Funções da Etapa 3 (Meta de PONTOS)
  const handleDecrement = () => { setDailyGoal(prev => Math.max(25, prev - 25)); };
  const handleIncrement = () => { setDailyGoal(prev => Math.min(500, prev + 25)); };

  // Finaliza o onboarding e salva no Supabase
  const handleFinishOnboarding = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
          daily_goal: dailyGoal // Salva a meta de pontos definida
        }
      });
      if (error) throw error;

    } catch (e) {
      console.error("Erro ao finalizar onboarding:", e);
      Alert.alert('Erro', 'Não foi possível finalizar. Tente fechar e abrir o app.');
      setLoading(false);
    }
  };

  // Renderiza a etapa atual
  const renderStep = () => {
    switch (step) {
      // --- ETAPA 1: A VENDA ---
      case 1:
        const cert = selectedCert ? certificationFacts[selectedCert] : null;
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Qual certificação vai mudar a sua vida?</Text>
            <Text style={styles.subtitle}>Esta é a sua chance de entrar em um dos setores que mais crescem no país.</Text>

            {/* Seleção de Certificação */}
            <TouchableOpacity style={[styles.certButton, selectedCert === 'cpa' && styles.certButtonSelected]} onPress={() => setSelectedCert('cpa')}>
                <Award color={selectedCert === 'cpa' ? cores.primary : cores.gray500} />
                <Text style={[styles.certButtonText, selectedCert === 'cpa' && styles.certButtonTextSelected]}>Certificação CPA</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.certButton, selectedCert === 'cpror' && styles.certButtonSelected]} onPress={() => setSelectedCert('cpror')}>
                <ShieldCheck color={selectedCert === 'cpror' ? cores.primary : cores.gray500} />
                <Text style={[styles.certButtonText, selectedCert === 'cpror' && styles.certButtonTextSelected]}>Certificação C-PRO R</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.certButton, selectedCert === 'cproi' && styles.certButtonSelected]} onPress={() => setSelectedCert('cproi')}>
                <Star color={selectedCert === 'cproi' ? cores.primary : cores.gray500} />
                <Text style={[styles.certButtonText, selectedCert === 'cproi' && styles.certButtonTextSelected]}>Certificação C-PRO I</Text>
            </TouchableOpacity>

            {/* Card de Fatos Reais */}
            {cert && (
              <View style={styles.factCard}>
                <Text style={styles.factSalary}>{cert.salary}</Text>
                <Text style={styles.factText}>{cert.fact}</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.button, !selectedCert && styles.buttonDisabled]} onPress={nextStep} disabled={!selectedCert}>
              <Text style={styles.buttonText}>Me mostre como ser aprovado</Text>
            </TouchableOpacity>
          </View>
        );

      // --- ETAPA 2: A PROVA ---
      case 2:
        const isCorrect = selectedAnswer === dummyQuestion.answer;
        const explanationData = isVerified ? dummyQuestion.explanation[selectedAnswer] : null;

        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>O Problema: O "Estudo Cego"</Text>
            <Text style={styles.subtitle}>Apps comuns apenas dizem "Errado". O CertifAI te ensina a *pensar*.</Text>

            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{dummyQuestion.question}</Text>
            </View>

            {/* Opções */}
            {Object.entries(dummyQuestion.options).map(([key, value]) => {
              const isSelected = selectedAnswer === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.optionBtn,
                    isSelected && !isVerified && styles.optionSelected,
                    isVerified && key === dummyQuestion.answer && styles.optionCorrect,
                    isVerified && isSelected && key !== dummyQuestion.answer && styles.optionIncorrect,
                  ]}
                  disabled={isVerified}
                  onPress={() => setSelectedAnswer(key)}
                >
                  <View style={styles.iconContainer}>
                    {isVerified && key === dummyQuestion.answer && <Check color={cores.green500} />}
                    {isVerified && isSelected && key !== dummyQuestion.answer && <X color={cores.red500} />}
                    {!isVerified && <Text style={styles.optionKey}>{key}</Text>}
                    {isVerified && !isSelected && key !== dummyQuestion.answer && <Text style={styles.optionKey}>{key}</Text>}
                  </View>
                  <Text style={styles.optionValue}>{value}</Text>
                </TouchableOpacity>
              )
            })}

            {/* Explicação */}
            {isVerified && explanationData && (
              <View style={[styles.explanationBox, isCorrect ? styles.explanationBoxCorrect : styles.explanationBoxIncorrect]}>
                <View style={[styles.explanationHeader, isCorrect ? styles.explanationHeaderCorrect : styles.explanationHeaderIncorrect]}>
                  <Sparkles size={16} color={isCorrect ? cores.green700 : cores.red600} />
                  <Text style={[styles.explanationHeaderText, isCorrect ? styles.explanationHeaderTextCorrect : styles.explanationHeaderTextIncorrect]}>
                    {explanationData.title}
                  </Text>
                </View>
                <MarkdownRenderer
                  text={explanationData.text}
                  style={styles.explanationText}
                />
              </View>
            )}

            {/* Botão de Ação */}
            {!isVerified ? (
              <TouchableOpacity style={[styles.button, !selectedAnswer && styles.buttonDisabled]} onPress={() => setIsVerified(true)} disabled={!selectedAnswer}>
                <Text style={styles.buttonText}>Corrigir com IA</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.button} onPress={nextStep}>
                <Text style={styles.buttonText}>Entendi. Próximo!</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      // --- ETAPA 3: O HÁBITO ---
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>A Solução: Hábito + Inteligência</Text>
            <Text style={styles.subtitle}>A aprovação não é sobre "virar a noite". É sobre constância. Defina sua meta diária.</Text>

             <View style={styles.habitCard}>
                <Target size={28} color={cores.primary} />
                <Text style={styles.habitTitle}>Meta Diária de Pontos</Text>
                <View style={styles.stepperControl}>
                  <TouchableOpacity style={[styles.stepperButton, dailyGoal <= 25 && styles.stepperButtonDisabled]} onPress={handleDecrement} disabled={dailyGoal <= 25}>
                    <Minus size={20} color={cores.primary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{dailyGoal}</Text>
                  <TouchableOpacity style={[styles.stepperButton, dailyGoal >= 500 && styles.stepperButtonDisabled]} onPress={handleIncrement} disabled={dailyGoal >= 500}>
                    <Plus size={20} color={cores.primary} />
                  </TouchableOpacity>
                </View>
             </View>
             <Text style={styles.painText}>(Você poderá alterar essa meta depois nas Configurações)</Text>

            <TouchableOpacity style={styles.button} onPress={nextStep}>
              <Text style={styles.buttonText}>Salvar e Continuar</Text>
            </TouchableOpacity>
          </View>
        );

      // --- ETAPA 4: A VISÃO ---
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Imagine-se no dia da prova</Text>
            <Text style={styles.subtitle}>A certificação não testa só seu 'decoreba'. Ela testa seu *raciocínio* em casos reais. Nós também.</Text>

             <View style={styles.caseCard}>
                <Text style={styles.caseTitle}>Cenário: Cliente com perfil conservador...</Text>
                <Text style={styles.caseInput}>Sua Resposta: "Eu alocaria 100% em Renda Fixa..."</Text>
                <View style={styles.aiHeader}>
                    <Sparkles size={16} color={cores.primary} />
                    <Text style={styles.aiHeaderText}>Análise do CertifAI</Text>
                </View>
                {/* ======================================================= */}
                {/* ☆ MUDANÇA ☆: Usando o MarkdownRenderer aqui também */}
                {/* ======================================================= */}
                <MarkdownRenderer
                  text="**Parcialmente Correto.** Você acertou na alocação principal, mas esqueceu de considerar a liquidez para a reserva de emergência..."
                  style={styles.aiBodyText}
                />
             </View>
             <Text style={styles.painText}>O CertifAI é o único app que corrige seu *raciocínio* dissertativo, não apenas a alternativa.</Text>

            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleFinishOnboarding} disabled={loading}>
              {loading ? <ActivityIndicator color={cores.light} /> : <Text style={styles.buttonText}>Estou pronto. Começar!</Text>}
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {renderStep()}
      </ScrollView>
    </SafeAreaView>
  );
}

// Estilos
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.light },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 26, fontWeight: 'bold', color: cores.secondary, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, color: cores.gray500, textAlign: 'center', marginBottom: 24 },

  // Etapa 1
  certButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.light,
    borderWidth: 2,
    borderColor: cores.gray200,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 12,
  },
  certButtonSelected: {
    borderColor: cores.primary,
    backgroundColor: cores.green50,
  },
  certButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: cores.gray500,
    marginLeft: 16,
  },
  certButtonTextSelected: {
    color: cores.primary,
  },
  factCard: {
    backgroundColor: cores.gray100,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginTop: 16,
    marginBottom: 24,
  },
  factSalary: {
    fontSize: 16,
    fontWeight: 'bold',
    color: cores.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  factText: {
    fontSize: 14,
    color: cores.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Etapa 2 (Quiz Interativo)
  questionCard: {
    backgroundColor: cores.gray100,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 16,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: cores.secondary,
    textAlign: 'center',
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderWidth: 2,
    borderColor: cores.gray200,
    borderRadius: 12,
    backgroundColor: cores.light,
    marginBottom: 12,
    width: '100%',
  },
  optionSelected: { borderColor: cores.primary, backgroundColor: cores.green50 },
  optionCorrect: { borderColor: cores.green500, backgroundColor: cores.green50 },
  optionIncorrect: { borderColor: cores.red500, backgroundColor: cores.red50 },
  iconContainer: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: cores.gray100 },
  optionKey: { fontSize: 16, fontWeight: 'bold', color: cores.secondary },
  optionValue: { flex: 1, fontSize: 14, fontWeight: '600', color: cores.secondary },
  explanationBox: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 24,
    overflow: 'hidden',
    width: '100%',
  },
  explanationBoxCorrect: {
    backgroundColor: cores.green50,
    borderColor: cores.green500,
  },
  explanationBoxIncorrect: {
    backgroundColor: cores.red50,
    borderColor: cores.red500,
  },
  explanationHeader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  explanationHeaderCorrect: {
    borderColor: cores.green500,
  },
  explanationHeaderIncorrect: {
    borderColor: cores.red500,
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

  // Etapa 3 (Hábito)
  habitCard: {
    alignItems: 'center',
    backgroundColor: cores.gray100,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    gap: 16,
  },
  habitTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: cores.secondary,
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.light,
    borderRadius: 20,
    padding: 4,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: cores.green50,
  },
  stepperButtonDisabled: { opacity: 0.3 },
  stepperValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: cores.secondary,
    paddingHorizontal: 20,
  },

  // Etapa 4 (Cases)
  caseCard: {
     backgroundColor: cores.gray100,
     borderRadius: 12,
     borderWidth: 1,
     borderColor: cores.gray200,
     width: '100%',
     overflow: 'hidden',
  },
  caseTitle: {
    fontSize: 14,
    color: cores.gray500,
    padding: 16,
    fontStyle: 'italic',
  },
  caseInput: {
    fontSize: 15,
    color: cores.secondary,
    padding: 16,
    backgroundColor: cores.light,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: cores.gray200,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(0, 200, 83, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: cores.gray200,
  },
  aiHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: cores.primary,
  },
  aiBodyText: {
    fontSize: 15,
    color: cores.secondary,
    padding: 16,
    lineHeight: 22,
  },

  // Genéricos
  painText: { // Texto de suporte
    fontSize: 14,
    color: cores.gray500,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.primary,
    width: '100%',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: { color: cores.light, fontSize: 16, fontWeight: 'bold' },
});