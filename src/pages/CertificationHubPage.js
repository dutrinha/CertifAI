// src/pages/CertificationHubPage.jsx (VERSÃO 3.0 - Provas Clássicas vs Novas)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native'; // Assegura que está aqui
// Ícones Atualizados
import {
  ArrowLeft,
  ClipboardList, // Simulado Completo (provas novas)
  ListChecks, // Múltipla Escolha (todas)
  FileText as Briefcase, // Cases
  Zap, // Interativas
  Layers, // Flash Cards
} from 'lucide-react-native';
import { supabase } from '../context/AuthContext';

// Paleta de cores padrão (da HomePage)
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
};

// Componente de Card Reutilizável
const OptionCard = ({
  icon: Icon,
  title,
  subtitle,
  onPress,
  isLoading = false,
}) => (
  <TouchableOpacity
    style={styles.optionCard}
    onPress={onPress}
    activeOpacity={0.8}
    disabled={isLoading}
  >
    {isLoading ? (
      <ActivityIndicator
        color={cores.primary}
        style={styles.loadingIndicator}
      />
    ) : (
      <View style={styles.iconContainer}>
        <Icon size={24} color={cores.primary} />
      </View>
    )}
    <View style={styles.textContainer}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </View>
  </TouchableOpacity>
);

export default function CertificationHubPage() {
  const navigation = useNavigation(); // Assegura que está aqui
  const route = useRoute(); // Assegura que está aqui
  const [isLoadingCase, setIsLoadingCase] = useState(false);
  const [isLoadingInterativa, setIsLoadingInterativa] = useState(false);

  // Parâmetros da rota
  const certificationType = route.params?.certificationType || 'unknown';
  const certificationName = route.params?.certificationName || 'Certificação';

  // Define quais são as provas "Clássicas" (só M.E.)
  const provasClassicas = ['cpa10', 'cpa20', 'cea'];
  // Cria a flag de controle
  const isProvaClassica = provasClassicas.includes(certificationType);

  // --- Handlers de Navegação ---

  const handleNavigateToTopics = () => {
    if (certificationType === 'unknown') {
      Alert.alert('Erro', 'Tipo de certificação não identificado.');
      return;
    }
    navigation.navigate('topicos', {
      certificationType: certificationType,
      certificationName: certificationName,
    });
  };

  const handleNavigateToSimuladoCompleto = () => {
    navigation.navigate('simulado-completo-config', {
      certificationType: certificationType,
      certificationName: certificationName,
    });
  };

  // Handler para Flash Cards (WIP)
  const handleNavigateToFlashCards = () => {
    // Esta é a navegação que implementamos no Passo 6
    navigation.navigate('FlashCardPage', {
      certificationType: certificationType,
    });
  };

  // Handler de Cases
  const handleNavigateToCases = async () => {
    if (certificationType === 'unknown') {
      Alert.alert('Erro', 'Tipo de certificação não identificado.');
      return;
    }
    setIsLoadingCase(true);
    try {
      const { data: caseDataArray, error: rpcError } = await supabase.rpc(
        'get_random_case',
        { prova_filter: certificationType }
      );

      if (rpcError) throw rpcError;

      if (caseDataArray && caseDataArray.length > 0) {
        const caseData = caseDataArray[0];
        navigation.navigate('StudyCasePage', { caseData: caseData });
      } else {
        Alert.alert(
          'Indisponível',
          `Nenhum estudo de caso encontrado para ${certificationName} ainda.`
        );
      }
    } catch (error) {
      console.error('Erro GERAL ao buscar estudo de caso:', error);
      Alert.alert(
        'Erro',
        'Não foi possível carregar o estudo de caso. Tente novamente.'
      );
    } finally {
      setIsLoadingCase(false);
    }
  };

  // Handler de Interativa
  const handleNavigateToInterativa = async () => {
    if (certificationType === 'unknown') {
      Alert.alert('Erro', 'Tipo de certificação não identificado.');
      return;
    }
    setIsLoadingInterativa(true);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        'get_random_interactive_question',
        { prova_filter: certificationType }
      );

      if (rpcError) throw rpcError;

      if (data && data.length > 0) {
        const questionData = data[0];
        navigation.navigate('InteractiveQuestionPage', {
          questionData: questionData,
        });
      } else {
        Alert.alert(
          'Indisponível',
          `Nenhuma questão interativa encontrada para ${certificationName} ainda.`
        );
      }
    } catch (error) {
      console.error('Erro no bloco catch ao buscar questão:', error);
      Alert.alert(
        'Erro',
        'Não foi possível carregar a questão. Tente novamente.'
      );
    } finally {
      setIsLoadingInterativa(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={cores.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{certificationName}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Seção Prática */}
        <Text style={styles.sectionTitle}>PRÁTICA</Text>

        {/* 1. "Simulado Completo" (SÓ para provas NOVAS) */}
        {!isProvaClassica && (
          <OptionCard
            icon={ClipboardList}
            title="Simulado Completo"
            subtitle="Teste em condições reais de prova."
            onPress={handleNavigateToSimuladoCompleto}
          />
        )}

        {/* 2. "Múltipla Escolha" (Para TODAS) */}
        <OptionCard
          icon={ListChecks}
          title={
            isProvaClassica
              ? 'Simulado (Múltipla Escolha)'
              : 'Múltipla Escolha (Tópicos)'
          }
          subtitle={
            isProvaClassica
              ? 'Pratique por tópicos ou prova completa'
              : 'Pratique áreas específicas'
          }
          onPress={handleNavigateToTopics}
        />

        {/* 3. "Flash Cards" (Para TODAS) */}
        <OptionCard
          icon={Layers}
          title="Flash Cards"
          subtitle="Memorize conceitos-chave."
          onPress={handleNavigateToFlashCards}
        />

        {/* 4. "Cases" e "Interativas" (SÓ para provas NOVAS) */}
        {!isProvaClassica && (
          <>
            <OptionCard
              icon={Briefcase}
              title="Cases Práticos"
              subtitle="Analise cenários e tome decisões."
              onPress={handleNavigateToCases}
              isLoading={isLoadingCase}
            />
            <OptionCard
              icon={Zap}
              title="Questões Interativas"
              subtitle="Desafios rápidos e dinâmicos."
              onPress={handleNavigateToInterativa}
              isLoading={isLoadingInterativa}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Estilos
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: cores.background,
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 30 : 16,
    gap: 16,
    backgroundColor: cores.background,
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: cores.textPrimary,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: cores.textSecondary,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  optionCard: {
    backgroundColor: cores.cardBackground,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: cores.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: cores.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: cores.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: cores.textSecondary,
    lineHeight: 20,
  },
});