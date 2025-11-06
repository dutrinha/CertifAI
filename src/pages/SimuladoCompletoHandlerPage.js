// /src/pages/SimuladoCompletoHandlerPage.js
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

/**
 * Esta página é um roteador. Ela não renderiza nada.
 * 1. Recebe a fila de questões, o passo atual, e os resultados.
 * 2. Verifica qual é a questão do 'currentStep'.
 * 3. Redireciona para a página de questão CORRETA (Simulado, Case, Interativa)
 * 4. Passa os dados da questão E TAMBÉM o 'contexto' do simulado.
 * 5. Se 'currentStep' for igual ao tamanho da fila, navega para a página de Resultado.
 */
export default function SimuladoCompletoHandlerPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const { questQueue, currentStep, results } = route.params;

  useEffect(() => {
    // Verifica se o simulado acabou
    if (currentStep >= questQueue.length) {
      navigation.replace('simulado-completo-resultado', results);
      return;
    }

    // Pega a questão atual
    const currentQuest = questQueue[currentStep];

    // Define os parâmetros que serão passados para a próxima tela
    const nextScreenParams = {
      // O contexto do simulado (para que a questão saiba "voltar" para cá)
      runnerContext: {
        questQueue: questQueue,
        currentStep: currentStep,
        results: results,
      },
      // Os dados específicos desta questão
      // (Os nomes 'questionData', 'caseData' etc. são o que as
      // telas existentes esperam receber)
      mcQuestionData: currentQuest.type === 'mc' ? currentQuest.data : null,
      caseData: currentQuest.type === 'case' ? currentQuest.data : null,
      questionData: currentQuest.type === 'interactive' ? currentQuest.data : null,
    };

    // Decide para qual tela navegar
    let nextScreenName = '';
    switch (currentQuest.type) {
      case 'mc':
        nextScreenName = 'simulado'; // (Vamos ter que alterar a SimuladoPage)
        break;
      case 'case':
        nextScreenName = 'StudyCasePage'; // (Vamos ter que alterar a StudyCasePage)
        break;
      case 'interactive':
        nextScreenName = 'InteractiveQuestionPage'; // (Vamos ter que alterar a InteractiveQuestionPage)
        break;
      default:
        // Se algo der errado, vai para o resultado
        navigation.replace('simulado-completo-resultado', results);
        return;
    }
    
    // Redireciona (replace) para a tela da questão
    navigation.replace(nextScreenName, nextScreenParams);

  }, [route.params]); // Roda toda vez que navegarmos para esta tela

  // Mostra um loading enquanto o redirecionamento ocorre
  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color="#00C853" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
});