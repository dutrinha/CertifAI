// /src/pages/SimuladoCompletoConfigPage.js (v3 - Corrigindo busca de tópicos)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft,
  Minus,
  Plus,
  Play,
  ListChecks, // Ícone para Múltipla Escolha
  Briefcase, // Ícone para Cases
  Zap, // Ícone para Interativas
} from 'lucide-react-native';

// Paleta de cores
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

// Componente Stepper reutilizável
const StepperComponent = ({ label, value, onDecrement, onIncrement, min, max, icon: Icon }) => (
  <>
    <View style={styles.settingsRow}>
      <View style={styles.settingsLabelContainer}>
        <Icon size={20} color={cores.textSecondary} style={styles.settingsIcon} />
        <Text style={styles.settingsLabel}>{label}</Text>
      </View>
      <View style={styles.stepperControl}>
        <TouchableOpacity style={[styles.stepperButton, value <= min && styles.stepperButtonDisabled]} onPress={onDecrement} disabled={value <= min}>
          <Minus size={20} color={cores.primary} />
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity style={[styles.stepperButton, value >= max && styles.stepperButtonDisabled]} onPress={onIncrement} disabled={value >= max}>
          <Plus size={20} color={cores.primary} />
        </TouchableOpacity>
      </View>
    </View>
    {/* Remove o divider do último item */}
    {label !== 'Questões Interativas' && <View style={styles.divider} />}
  </>
);

export default function SimuladoCompletoConfigPage() {
  const navigation = useNavigation();
  const route = useRoute();
  
  const { certificationType = 'unknown', certificationName = 'Simulado' } = route.params;

  // Estados dos contadores
  const [mcCount, setMcCount] = useState(45);
  const [caseCount, setCaseCount] = useState(2);
  const [interactiveCount, setInteractiveCount] = useState(1);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  // Validação do botão
  useEffect(() => {
    const totalQuestions = mcCount + caseCount + interactiveCount;
    setIsButtonDisabled(totalQuestions === 0);
  }, [mcCount, caseCount, interactiveCount]);

  // Handlers dos Steppers
  const handleMcDecrement = () => { setMcCount(prev => Math.max(5, prev - 5)); };
  const handleMcIncrement = () => { setMcCount(prev => Math.min(70, prev + 5)); };
  
  const handleCaseDecrement = () => { setCaseCount(prev => Math.max(0, prev - 1)); };
  const handleCaseIncrement = () => { setCaseCount(prev => Math.min(5, prev + 1)); };

  const handleInteractiveDecrement = () => { setInteractiveCount(prev => Math.max(0, prev - 1)); };
  const handleInteractiveIncrement = () => { setInteractiveCount(prev => Math.min(5, prev + 1)); };

  // Navegação para o Runner
const handleStartFullQuiz = async () => {
    if (isButtonDisabled) return;
    navigation.navigate('simulado-completo-runner', {
      certificationType,
      // Passamos um array vazio. O Runner v2.0 ignora este parâmetro.
      topics: [], 
      mcCount,
      caseCount,
      interactiveCount,
      // isTimerEnabled foi removido
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={cores.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{certificationName}</Text>
            <Text style={styles.headerSubtitle}>Simulado Completo</Text>
          </View>
        </View>

        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          
          {/* Seção de Configurações */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONFIGURAÇÕES</Text>
            <View style={styles.card}>
              
              {/* Stepper Múltipla Escolha */}
              <StepperComponent
                label="Múltipla Escolha"
                value={mcCount}
                onDecrement={handleMcDecrement}
                onIncrement={handleMcIncrement}
                min={5}
                max={70}
                icon={ListChecks}
              />
              
              {/* Stepper Cases Práticos */}
              <StepperComponent
                label="Cases Práticos"
                value={caseCount}
                onDecrement={handleCaseDecrement}
                onIncrement={handleCaseIncrement}
                min={0}
                max={5}
                icon={Briefcase}
              />

              {/* Stepper Questões Interativas */}
              <StepperComponent
                label="Questões Interativas"
                value={interactiveCount}
                onDecrement={handleInteractiveDecrement}
                onIncrement={handleInteractiveIncrement}
                min={0}
                max={5}
                icon={Zap}
              />
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.footerButton, isButtonDisabled && styles.footerButtonDisabled]} onPress={handleStartFullQuiz} disabled={isButtonDisabled} activeOpacity={0.8}>
            <Play size={22} color={cores.textLight} />
            <Text style={styles.footerButtonText}>Iniciar Simulado</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Estilos (sem alteração)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.background },
  container: { flex: 1, backgroundColor: cores.background },
  header: { 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16, 
    backgroundColor: cores.background,
    paddingTop: Platform.OS === 'android' ? 30 : 16,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: cores.textPrimary },
  headerSubtitle: { fontSize: 14, color: cores.textSecondary },
  mainContent: { 
    flex: 1, 
    paddingHorizontal: 20, 
    paddingTop: 8,
  },
  section: { marginBottom: 24 },
  sectionTitle: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: cores.textSecondary, 
    paddingHorizontal: 4, 
    marginBottom: 8, 
    textTransform: 'uppercase' 
  },
  card: { 
    backgroundColor: cores.cardBackground, 
    borderRadius: 20, 
    overflow: 'hidden',
    shadowColor: cores.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },
  divider: { 
    height: 1, 
    backgroundColor: cores.border, 
    marginHorizontal: 20 
  },
  settingsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    backgroundColor: cores.cardBackground 
  },
  settingsLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIcon: {
    marginRight: 4,
  },
  settingsLabel: { 
    fontSize: 16, 
    color: cores.textPrimary, 
    fontWeight: '500' 
  },
  stepperControl: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: cores.background, 
    borderRadius: 20 
  },
  stepperButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  stepperButtonDisabled: { opacity: 0.3 },
  stepperValue: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: cores.textPrimary, 
    paddingHorizontal: 12 
  },
  footer: { 
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24, 
    backgroundColor: 'transparent', 
  },
  footerButton: { 
    backgroundColor: cores.primary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 16, 
    borderRadius: 16, 
    gap: 10,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  footerButtonDisabled: { 
    backgroundColor: cores.textSecondary, 
    opacity: 0.5 
  },
  footerButtonText: { 
    color: cores.textLight, 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});