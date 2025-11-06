// /src/pages/SimuladoCompletoRunnerPage.js
// (VERSÃO 2.0 - OTIMIZADA COM RPC ÚNICA)
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../context/AuthContext';

// Cores
const cores = {
  primary: '#00C853',
  secondary: '#1A202C',
  softGray: '#F7FAFC',
  gray500: '#64748B',
  light: '#FFFFFF', 
};

// =======================================================
// ☆ MUDANÇA ☆: Função 'shuffle' REMOVIDA. 
// A nova RPC 'fn_get_full_simulado_payload' já faz o
// 'ORDER BY random()' no servidor, o que é mais eficiente.
// =======================================================


export default function SimuladoCompletoRunnerPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const [error, setError] = useState(null);

  const {
    certificationType,
    // 'topics' não é mais usado ativamente aqui,
    // mas a RPC no Supabase poderia ser estendida para usá-lo.
    topics, 
    mcCount,
    caseCount,
    interactiveCount,
  } = route.params;

  // =======================================================
  // ☆ MUDANÇA ☆: O useEffect foi 100% substituído.
  // =======================================================
  useEffect(() => {
    // Esta função agora faz UMA chamada de rede, não 4+
    const fetchFullSimulado = async () => {
      try {
        console.log("Chamando fn_get_full_simulado_payload...");
        
        // 1. Chamar a NOVA RPC com os parâmetros da config
        const { data: payload, error: rpcError } = await supabase.rpc(
          'fn_get_full_simulado_payload', 
          {
            p_prova: certificationType,
            p_mc_count: mcCount,
            p_case_count: caseCount,
            p_interactive_count: interactiveCount,
          }
        );

        if (rpcError) throw rpcError;
        if (!payload) throw new Error("A RPC não retornou dados.");

        // A RPC retorna: { mc_questions: [], cases: [], interactives: [] }
        console.log("Payload recebido:", {
            mc: (payload.mc_questions || []).length,
            cases: (payload.cases || []).length,
            interactives: (payload.interactives || []).length,
        });

        // 2. Formatar a fila de Múltipla Escolha
        // (Esta lógica de formatação é copiada da versão antiga,
        // pois a SimuladoPage.js precisa dela)
        const mcQueue = (payload.mc_questions || []).map(q => {
          const originalQuestion = q.pergunta || '';
          let context = '';
          let mainQuestion = originalQuestion;
          
          // Lógica de divisão de contexto/pergunta
          const lastDotIndex = originalQuestion.lastIndexOf('. ');
          if (lastDotIndex !== -1 && originalQuestion.length > 150) { 
            context = originalQuestion.substring(0, lastDotIndex + 1).trim();
            mainQuestion = originalQuestion.substring(lastDotIndex + 1).trim();
          }

          return {
            type: 'mc', 
            data: {
              topic: q.modulo,
              difficulty: q.dificuldade,
              question: { 
                context: context,
                main: mainQuestion
              },
              explanation: q.explicacao,
              options: { A: q.a, B: q.b, C: q.c, D: q.d },
              answer: q.resposta.toUpperCase().trim(),
            }
          }
        });

        // 3. Formatar a fila de Cases
        // (A RPC já retorna os dados do case prontos)
        const caseQueue = (payload.cases || []).map(caseData => ({
          type: 'case',
          data: caseData
        }));

        // 4. Formatar a fila de Interativas
        // (A RPC já retorna os dados interativos prontos)
        const interactiveQueue = (payload.interactives || []).map(iData => ({
          type: 'interactive',
          data: iData
        }));

        // 5. Verificar se NENHUMA questão foi encontrada
        if (mcQueue.length === 0 && caseQueue.length === 0 && interactiveQueue.length === 0) {
          throw new Error('Nenhuma questão foi encontrada para esta configuração.');
        }
        
        // 6. Juntar as filas (NÃO PRECISA MAIS DE SHUFFLE)
        const finalQuestQueue = [
            ...mcQueue,
            ...caseQueue,
            ...interactiveQueue
        ];
        
        // 7. Preparar os resultados (lógica idêntica à antiga)
        const results = {
            mcScore: 0,
            mcTotal: mcQueue.length,
            caseResults: [], 
            interactiveResults: { score: 0, maxScore: 0 },
            certificationType: certificationType,
        };

        // 8. Navegar para o Handler (lógica idêntica à antiga)
        navigation.replace('simulado-completo-handler', {
            questQueue: finalQuestQueue, 
            currentStep: 0, 
            results: results, 
        });

      } catch (err) {
        console.error('Erro ao buscar payload do simulado completo:', err);
        setError(err.message || 'Ocorreu um erro ao carregar o simulado.');
      }
    };

    fetchFullSimulado();
    
  // Adicionamos as dependências corretas
  }, [route.params, navigation, certificationType, mcCount, caseCount, interactiveCount]); 
  // =======================================================
  // ☆ FIM DAS MUDANÇAS ☆
  // =======================================================


  // Se der erro (Tela de Erro idêntica à anterior)
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Oops! Algo deu errado.</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Tela de loading padrão (idêntica à anterior)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={cores.primary} />
        <Text style={styles.loadingText}>Montando seu simulado...</Text>
      </View>
    </SafeAreaView>
  );
}

// Estilos (idênticos aos anteriores)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.softGray,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: cores.gray500,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D32F2F',
    textAlign: 'center',
  },
  errorSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: cores.gray500,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: cores.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButtonText: {
    color: cores.light,
    fontSize: 16,
    fontWeight: 'bold'
  },
});